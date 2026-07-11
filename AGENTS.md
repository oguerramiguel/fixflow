# AGENTS.md

FixFlow e uma plataforma web para assistencias tecnicas gerenciarem clientes,
equipamentos, ordens de servico, diagnosticos, orcamentos e timeline de
atendimento.

## Arquitetura

- Use Next.js App Router para a camada web.
- Regras de negocio ficam em `src/domain`.
- Acesso a banco fica centralizado em `src/server/db` e, futuramente, em
  repositories dentro de `src/server/repositories`.
- Componentes React nao devem conter logica complexa de dominio.
- Consultas de dados devem sempre considerar `organizationId`.

## Convencoes

- Nomes de arquivos, funcoes, tipos e variaveis devem estar em ingles.
- TypeScript deve permanecer em modo `strict`.
- Nao use `any` sem justificativa tecnica explicita.
- Nao esconda erros com `ts-ignore` ou regras de lint desabilitadas.
- Atualize testes quando comportamento mudar.
- Atualize `docs/` quando decisoes arquiteturais mudarem.
- Nao armazene secrets reais no repositorio.

## Validacao obrigatoria

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build` quando aplicavel
- `npm run prisma:validate`
- `npm run prisma:format`

## Tenant isolation

`Organization` representa o tenant. Toda entidade de negocio pertencente a uma
assistencia deve possuir `organizationId`. IDs de entidades nunca devem ser
usados isoladamente em consultas futuras; sempre combine o ID da entidade com o
contexto da Organization.

Nunca confie em `organizationId` enviado pelo cliente para autorizacao ou
isolamento de dados. Operacoes multi-tenant devem usar contexto autenticado
resolvido no servidor a partir do User persistido.

Repositories de entidades multi-tenant devem exigir contexto confiavel.
Operacoes de criacao nao devem aceitar `organizationId` vindo de input do
cliente. IDs de recursos recebidos do browser, como `customerId` ou
`equipmentId`, devem ser revalidados dentro do tenant antes de qualquer
associacao ou atualizacao.

Alteracoes em queries tenant-aware exigem testes de isolamento por
Organization.

## ServiceOrder

- `ServiceOrder.customerId` deve ser derivado do Equipment validado dentro do
  tenant durante a criacao da OS.
- Status de ServiceOrder nunca deve ser alterado arbitrariamente.
- Transicoes de status usam regra de workflow server-side, sempre com o status
  atual carregado do banco.
- Mudanca de status e criacao de timeline devem ser atomicas.
- Operacoes tenant-aware de ServiceOrder e timeline sempre filtram
  `organizationId`.
- Mudancas no workflow exigem testes e atualizacao de
  `docs/service-order-workflow.md`.

## Autenticacao

- `passwordHash` nunca deve ser retornado em DTOs, props ou respostas HTTP.
- Codigo de autenticacao, sessao, cookies e acesso a dados deve permanecer
  server-side.
- Mudancas em autenticacao exigem testes relevantes de comportamento e
  seguranca.

## Definicao de conclusao

Uma tarefa so deve ser considerada concluida quando:

- a implementacao cobre todo o escopo solicitado;
- testes relevantes foram criados ou atualizados;
- testes, lint, typecheck e build aplicavel foram executados;
- o diff foi revisado;
- documentacao foi atualizada quando necessario;
- nenhuma falha conhecida foi escondida.
