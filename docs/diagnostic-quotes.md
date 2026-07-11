# Diagnostic and Quotes

## Objetivo

A Fase 5 implementa o diagnostico tecnico e o ciclo de vida interno do
orcamento de uma ServiceOrder. O escopo cobre Diagnostic, Quote, QuoteItem,
calculo monetario com Decimal, envio logico, aprovacao interna e rejeicao
interna.

Nao ha portal publico, PDF, email, WhatsApp, pagamento ou aprovacao publica
nesta fase.

## Diagnostic

`reportedIssue` continua sendo o problema relatado pelo cliente na abertura da
OS. `Diagnostic.description` e a conclusao tecnica registrada pela assistencia.
`Diagnostic.technicalNotes` guarda notas internas opcionais.

Existe no maximo um Diagnostic por ServiceOrder dentro da Organization. O banco
reforca esse invariante com unicidade em `[serviceOrderId, organizationId]`.

Diagnostic pode ser criado ou editado somente quando a ServiceOrder persistida
esta em `IN_DIAGNOSIS`. Depois que a OS entra em `WAITING_FOR_APPROVAL` ou em
qualquer estado posterior, o Diagnostic permanece visivel, mas nao pode mais ser
alterado. A regra e revalidada no service server-side.

Criacao e atualizacao de Diagnostic usam transacao Prisma junto com a timeline:

- `DIAGNOSTIC_RECORDED`;
- `DIAGNOSTIC_UPDATED`.

## Quote

Quote representa o orcamento atual da OS. Nesta fase existe no maximo um Quote
por ServiceOrder dentro da Organization. O banco reforca esse invariante com
unicidade em `[serviceOrderId, organizationId]`.

Quote so pode ser criado quando a OS pertence ao tenant autenticado, esta em
`IN_DIAGNOSIS`, possui Diagnostic e ainda nao possui Quote. O Quote sempre nasce
em `DRAFT`. A criacao do Quote e o evento `QUOTE_CREATED` sao atomicos.

Fluxo permitido:

- `DRAFT -> SENT`;
- `SENT -> APPROVED`;
- `SENT -> REJECTED`.

`APPROVED` e `REJECTED` sao terminais. Nao ha reabertura, revisao, clone ou
segundo orcamento nesta fase.

## QuoteItem

QuoteItem contem somente `description`, `quantity` e `unitPrice`. Itens podem
ser criados, editados e removidos somente enquanto o Quote esta em `DRAFT`.
`SENT`, `APPROVED` e `REJECTED` sao imutaveis quanto aos itens.

`quantity` chega do formulario como string e e validada como inteiro de 1 a 999,
sem decimal, notacao cientifica ou caracteres extras.

## Money and Decimal

`unitPrice` representa dinheiro e nunca usa `Float` nem calculo monetario
autoritativo com JavaScript number. A entrada monetaria chega como string,
aceita ponto ou virgula decimal simples e e normalizada para string canonica com
ponto antes da construcao de `Prisma.Decimal`.

Formatos aceitos: `100`, `100.5`, `100.50`, `100,5`, `100,50`.

Nao sao aceitos separadores de milhar, sinais explicitos, notacao cientifica,
`NaN`, `Infinity`, espacos internos ou mais de duas casas decimais.

`QuoteItem.unitPrice` usa `Decimal @db.Decimal(12, 2)`. O limite positivo da
aplicacao e `9999999999.99`. Subtotal e total tambem devem respeitar esse
limite.

Subtotal e derivado de `unitPrice Decimal * quantity`. Total e derivado da soma
Decimal dos subtotais persistidos. O browser nao envia subtotal nem total. DTOs
retornam dinheiro como strings canonicas com duas casas, por exemplo `350.00`.
A UI formata BRL a partir da string canonica.

## Envio logico

Enviar Quote registra que o orcamento foi enviado ao cliente por processo
externo. O sistema nao envia email, WhatsApp ou notificacao automatica nesta
fase.

Precondicoes:

- Quote esta em `DRAFT`;
- ServiceOrder esta em `IN_DIAGNOSIS`;
- existe Diagnostic;
- existe pelo menos um item;
- total recalculado e maior que zero;
- usuario e `OWNER` ou `ADMIN`.

A transacao altera atomicamente Quote `DRAFT -> SENT`, ServiceOrder
`IN_DIAGNOSIS -> WAITING_FOR_APPROVAL`, timeline `QUOTE_SENT` e timeline
`STATUS_CHANGED`.

## Aprovacao e rejeicao

Aprovacao e rejeicao sao registros internos feitos por `OWNER` ou `ADMIN`.
`TECHNICIAN` pode visualizar Quote e gerenciar itens em `DRAFT`, mas nao pode
enviar, aprovar ou rejeitar.

Aprovacao exige Quote `SENT` e ServiceOrder `WAITING_FOR_APPROVAL`. A transacao
altera Quote `SENT -> APPROVED`, ServiceOrder
`WAITING_FOR_APPROVAL -> APPROVED`, timeline `QUOTE_APPROVED` e timeline
`STATUS_CHANGED`.

Rejeicao exige Quote `SENT` e ServiceOrder `WAITING_FOR_APPROVAL`. Nesta decisao
de MVP, rejeitar o Quote encerra a OS: Quote `SENT -> REJECTED`, ServiceOrder
`WAITING_FOR_APPROVAL -> CANCELLED`, timeline `QUOTE_REJECTED` e timeline
`STATUS_CHANGED`.

Cancelamento generico de OS continua existindo para motivos operacionais e nao
altera automaticamente Quote `SENT`.

## Concorrencia e tenant isolation

Transicoes de Quote usam concorrencia otimista com status esperado. As
transacoes comerciais tambem validam o status esperado da ServiceOrder. Se
qualquer update condicional afetar zero linhas, o service retorna
`ConflictError` e nenhuma timeline e criada pelo contrato transacional.

Todas as operacoes recebem `AuthenticatedContext` ou `TenantContext` resolvido no
servidor. Repositories filtram Diagnostic, Quote, QuoteItem, ServiceOrder e
timeline por `organizationId`. `organizationId`, role, status atual, subtotal,
total e descricao de timeline nao vem do browser.
