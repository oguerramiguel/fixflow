# Manual QA checklist

Use este checklist para validar manualmente o MVP local antes de publicar
screenshots, gravar uma demonstracao ou abrir uma release.

## Ambiente

- [ ] `.env` existe localmente e nao foi commitado.
- [ ] `DATABASE_URL` aponta para o PostgreSQL local do `docker-compose.yml`.
- [ ] `docker compose up -d` iniciou o PostgreSQL.
- [ ] `npx prisma migrate dev` foi executado sem criar migration inesperada.
- [ ] `npx prisma generate` foi executado quando necessario.
- [ ] `npm run db:seed` criou o usuario OWNER local.
- [ ] `npm run dev` iniciou a aplicacao.
- [ ] `http://localhost:3000` abre no navegador.

## Login e sessao

- [ ] Login com o usuario do seed funciona.
- [ ] Credenciais invalidas exibem mensagem generica.
- [ ] Area interna redireciona para login quando nao autenticada.
- [ ] Logout invalida a sessao e volta para o fluxo de login.
- [ ] `GET /api/me` retorna usuario seguro, sem `passwordHash` ou `tokenHash`.

## Customer

- [ ] Criar cliente com nome e telefone validos.
- [ ] Validar mensagens para campos obrigatorios ou invalidos.
- [ ] Listar clientes.
- [ ] Buscar cliente por termo.
- [ ] Abrir detalhes do cliente.
- [ ] Editar dados permitidos do cliente.
- [ ] Confirmar que nao existe delete no fluxo atual.

## Equipment

- [ ] Criar equipamento vinculado a um cliente existente.
- [ ] Validar tipo, marca e modelo obrigatorios.
- [ ] Listar equipamentos.
- [ ] Buscar por marca, modelo ou numero de serie.
- [ ] Abrir detalhes do equipamento.
- [ ] Editar dados permitidos do equipamento.
- [ ] Confirmar que nao existe delete no fluxo atual.

## ServiceOrder

- [ ] Abrir ordem de servico a partir de um equipamento.
- [ ] Confirmar que a OS inicia em `RECEIVED`.
- [ ] Confirmar que `publicCode` aparece e segue o formato `FF-XXXXXXXXXX`.
- [ ] Listar ordens de servico.
- [ ] Filtrar por status.
- [ ] Buscar por codigo, cliente ou equipamento.
- [ ] Abrir detalhes da OS.
- [ ] Avancar `RECEIVED -> IN_DIAGNOSIS`.
- [ ] Conferir timeline inicial e timeline de mudanca de status.
- [ ] Validar que transicoes comerciais especializadas nao ocorrem pelo fluxo generico.

## Diagnostic

- [ ] Registrar Diagnostic quando a OS estiver em `IN_DIAGNOSIS`.
- [ ] Editar Diagnostic enquanto a OS permanecer em `IN_DIAGNOSIS`.
- [ ] Conferir eventos `DIAGNOSTIC_RECORDED` e `DIAGNOSTIC_UPDATED` na timeline.
- [ ] Confirmar que Diagnostic nao e editavel depois do envio do Quote.

## Quote

- [ ] Criar Quote somente apos Diagnostic existir.
- [ ] Confirmar que Quote inicia em `DRAFT`.
- [ ] Adicionar QuoteItem com quantidade inteira e preco valido.
- [ ] Editar item em `DRAFT`.
- [ ] Remover item em `DRAFT`.
- [ ] Validar rejeicao de preco com separador de milhar, mais de duas casas ou notacao cientifica.
- [ ] Conferir subtotal e total formatados em BRL.
- [ ] Confirmar que total e derivado server-side.
- [ ] Marcar Quote como enviado com usuario OWNER ou ADMIN.
- [ ] Confirmar transicao da OS para `WAITING_FOR_APPROVAL`.
- [ ] Confirmar que itens nao sao editaveis apos envio.

## Aprovacao e rejeicao interna

- [ ] Aprovar Quote `SENT` pela area interna.
- [ ] Confirmar Quote `APPROVED` e ServiceOrder `APPROVED`.
- [ ] Repetir o fluxo em outra OS e rejeitar Quote `SENT`.
- [ ] Confirmar Quote `REJECTED` e ServiceOrder `CANCELLED`.
- [ ] Conferir eventos correspondentes na timeline.

## Portal publico

- [ ] Abrir `/track/[publicCode]` em janela anonima ou sem sessao.
- [ ] Confirmar exibicao de status, equipamento, problema relatado, quote publico e timeline publica.
- [ ] Confirmar que dados de Customer nao aparecem.
- [ ] Confirmar que IDs internos e `organizationId` nao aparecem.
- [ ] Confirmar que Quote `DRAFT` nao aparece publicamente.
- [ ] Aprovar Quote `SENT` pelo portal publico.
- [ ] Confirmar atualizacao interna de Quote, ServiceOrder e timeline.
- [ ] Repetir o fluxo em outra OS e rejeitar pelo portal publico.
- [ ] Testar um `publicCode` invalido e confirmar pagina de nao encontrado.

## Validacoes automatizadas

- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run prisma:validate`
- [ ] `npm run prisma:format`

## Revisao final

- [ ] README menciona apenas funcionalidades existentes.
- [ ] Screenshots usados sao reais.
- [ ] Nao ha credenciais reais nos arquivos versionados.
- [ ] Nao ha alteracao inesperada em `prisma/schema.prisma`.
- [ ] Nao ha migration criada sem intencao.
- [ ] `git status --short --branch` mostra apenas alteracoes planejadas ou esta limpo apos finalizar.
