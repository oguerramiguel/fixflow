# FixFlow portfolio notes

## Contexto

FixFlow e uma plataforma web multi-tenant para assistencias tecnicas de notebooks
e computadores. O projeto simula um problema comum em oficinas pequenas:
organizar clientes, equipamentos, ordens de servico, diagnosticos, orcamentos e
historico sem depender de planilhas ou mensagens soltas.

O repositorio esta em desenvolvimento e possui um MVP funcional local. Ele nao
esta em producao e nao afirma atender todos os requisitos de um SaaS comercial.

## Objetivo do projeto

O objetivo e demonstrar uma aplicacao web full-stack com:

- regras de negocio fora dos componentes React;
- autenticacao server-side;
- sessao opaca persistida;
- isolamento logico por tenant;
- modelagem relacional com Prisma;
- calculos monetarios seguros para o escopo do MVP;
- workflows de status;
- transacoes em operacoes criticas;
- testes automatizados;
- documentacao tecnica para manutencao.

## Principais decisoes

- `Organization` representa o tenant.
- `organizationId` confiavel vem do User autenticado no servidor.
- Entidades de negocio possuem `organizationId`.
- Repositories internos exigem contexto de tenant.
- ServiceOrder possui `publicCode` nao sequencial para acompanhamento publico.
- O portal publico usa DTO minimo separado dos DTOs internos.
- Status de ServiceOrder e Quote mudam por workflows server-side.
- Mudanca de status e timeline sao persistidas de forma atomica.
- Quote e ServiceOrder sao atualizados juntos nas decisoes comerciais.
- Valores monetarios usam `Prisma.Decimal`, nao JavaScript number.
- Money DTO retorna string canonica com duas casas decimais.
- Quote `DRAFT` nao aparece no portal publico.

## Desafios tecnicos

### Multi-tenancy

O principal risco em sistemas multiempresa e consultar dados apenas por ID de
entidade. FixFlow evita esse padrao em operacoes internas exigindo
`organizationId` em services e repositories. IDs recebidos do browser, como
`customerId`, `equipmentId` ou `serviceOrderId`, sao revalidados dentro do
tenant antes de qualquer associacao ou atualizacao.

### Workflow de atendimento

ServiceOrder segue um fluxo operacional explicito:

```text
RECEIVED -> IN_DIAGNOSIS -> WAITING_FOR_APPROVAL -> APPROVED -> IN_REPAIR -> FINAL_TESTING -> READY_FOR_PICKUP -> COMPLETED
```

`CANCELLED` e terminal. Transicoes comerciais sensiveis foram separadas do fluxo
generico: envio e aprovacao de Quote coordenam Quote, ServiceOrder e timeline.

### Transacoes e concorrencia

Abertura de OS, registro de diagnostico, criacao/envio/aprovacao/rejeicao de
Quote e decisoes publicas usam transacoes Prisma quando precisam alterar mais de
um registro. A concorrencia otimista usa status esperado; se outra acao mudou o
estado antes, a operacao falha com conflito controlado.

### Dinheiro

Entradas monetarias chegam como string, sao validadas, normalizadas e convertidas
para `Prisma.Decimal`. Subtotal e total sao calculados server-side. A UI apenas
formata valores ja retornados como strings canonicas.

### Portal publico seguro

O portal publico e acessado por `publicCode`, sem login de cliente. Esse codigo e
uma capability URL limitada a uma ServiceOrder. Ele nao permite listar recursos,
nao usa `AuthenticatedContext` e nao expoe Customer, IDs internos ou
`organizationId`.

## O que o projeto demonstra

- Capacidade de decompor um produto em fases incrementais.
- Cuidado com regras de dominio e isolamento de dados.
- Uso pratico de Next.js App Router com Server Actions.
- Conhecimento de Prisma, PostgreSQL e modelagem relacional.
- Entendimento de autenticacao propria com sessao opaca.
- Tratamento de dinheiro sem `number` para regras autoritativas.
- Testes automatizados cobrindo dominio, services, repositories, actions e APIs.
- Documentacao tecnica consistente com o comportamento implementado.

## Pontos para explicar em entrevista

- Por que `Organization` e o tenant.
- Por que `organizationId` nao deve vir do browser.
- Como o seed cria o usuario local sem senha hardcoded.
- Como a sessao opaca evita persistir token bruto no banco.
- Como o bcryptjs e protegido contra truncation silenciosa.
- Por que `publicCode` e diferente de um ID interno.
- Como o portal publico evita expor Customer e IDs internos.
- Por que Quote `DRAFT` nao aparece publicamente.
- Por que dinheiro entra como string e vira Decimal no servidor.
- Como as transacoes evitam status sem timeline ou timeline sem status.
- Onde ainda faltam controles para producao, como rate limiting, CI e deploy.

## Screenshots reais sugeridos

Antes de publicar como portfolio, capture imagens reais da aplicacao rodando
localmente:

- tela de login;
- area interna de operacao com links principais;
- listagem de clientes;
- detalhes de um cliente com equipamentos;
- listagem de equipamentos;
- detalhes de uma ordem de servico;
- registro de diagnostico;
- tela de orcamento com itens;
- portal publico `/track/[publicCode]`;
- decisao publica de orcamento;
- timeline apos aprovacao ou rejeicao.

Nao use imagens falsas nem referencie arquivos que nao existem.

## Limites honestos do MVP

- Sem deploy publico.
- Sem CI/CD.
- Sem e-mail, WhatsApp ou SMS real.
- Sem PDF.
- Sem pagamento.
- Sem dashboard funcional.
- Sem testes E2E.
- Sem rate limiting.
- Sem hardening completo de producao.

Esses limites sao escolhas de escopo para um MVP local e podem orientar fases
futuras.
