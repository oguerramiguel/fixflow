# Architecture

## Visao arquitetural

FixFlow usa uma arquitetura simples em camadas, adequada para evolucao gradual.
O projeto nao afirma seguir Clean Architecture, DDD completo ou arquitetura
hexagonal completa. A implementacao inicial separa interface, dominio e acesso a
dados sem criar abstracoes prematuras.

## Responsabilidades das camadas

- `src/app`: rotas, paginas, layouts e handlers HTTP do Next.js.
- `src/components`: componentes React de apresentacao.
- `src/lib`: configuracoes e utilitarios compartilhados.
- `src/domain/entities`: tipos e conceitos centrais do dominio.
- `src/domain/services`: regras de negocio puras e testaveis.
- `src/domain/errors`: erros de dominio.
- `src/server/auth`: hashing de senha, login, sessao, cookie, contexto
  autenticado e autorizacao por role.
- `src/server/db`: Prisma Client centralizado.
- `src/server/repositories`: contexto, repositories de autenticacao e
  repositories de acesso a dados futuros.
- `prisma`: schema, enums, relacionamentos e migrations.
- `docs`: decisoes tecnicas e regras que precisam sobreviver entre tarefas.

## Fluxo conceitual de uma requisicao

1. Uma rota do App Router recebe a requisicao.
2. A rota valida entradas e, quando necessario, chama
   `requireAuthenticatedContext()` ou `requireCurrentUser()`.
3. A camada de aplicacao ou service executa regras de negocio.
4. Repositories futuros consultam o banco usando Prisma e o contexto do tenant.
5. A rota retorna uma resposta HTTP adequada.

`GET /api/health` nao consulta o banco. `GET /api/me` e uma rota autenticada e
resolve o usuario atual no servidor.

## Autenticacao e sessao

A Fase 2 implementa autenticacao propria e limitada ao escopo atual:

- `src/app/login`: pagina e Server Action de login.
- `src/app/app`: pagina interna protegida e Server Action de logout.
- `src/app/api/me`: endpoint autenticado de usuario atual.
- `src/server/auth/login-service.ts`: valida entrada, normaliza email, verifica
  senha e cria sessao.
- `src/server/auth/password.ts`: hash e verificacao com `bcryptjs` cost 12.
- `src/server/auth/session-service.ts`: cria, localiza, expira e invalida
  sessoes.
- `src/server/auth/session-token.ts`: gera token opaco com Node crypto e
  calcula SHA-256 para persistencia.
- `src/server/auth/session-cookie.ts`: centraliza nome, duracao e opcoes do
  cookie.
- `src/server/auth/authenticated-context.ts`: resolve User, Organization e role
  a partir do cookie de sessao.
- `src/server/auth/authorization.ts`: base pequena de autorizacao por role.

Fluxo de login:

```mermaid
sequenceDiagram
  actor User
  participant LoginUI as Login UI
  participant Action as Login action
  participant Auth as Authentication service
  participant Repo as User repository
  participant Password as Password verification
  participant Session as Session service
  participant DB as PostgreSQL
  participant Cookie as Cookie

  User->>LoginUI: email and password
  LoginUI->>Action: submit form
  Action->>Auth: loginWithEmailAndPassword
  Auth->>Repo: find by normalized email
  Repo->>DB: User lookup
  Auth->>Password: bcrypt compare
  Auth->>Session: create opaque session
  Session->>DB: store tokenHash and expiresAt
  Action->>Cookie: set HTTP-only session cookie
```

Fluxo de uma operacao autenticada futura:

```mermaid
sequenceDiagram
  participant UI
  participant Action as Server Action
  participant Context as requireAuthenticatedContext
  participant Service as Application Service
  participant Repo as Tenant-aware Repository
  participant Prisma
  participant DB as PostgreSQL

  UI->>Action: authenticated request
  Action->>Context: resolve context
  Context->>Service: userId, organizationId, role
  Service->>Repo: context and input
  Repo->>Prisma: filter by id and organizationId
  Prisma->>DB: tenant-scoped query
```

Fluxo concreto implementado na Fase 3:

```mermaid
sequenceDiagram
  participant Request
  participant Context as Authenticated context
  participant Service as Application service
  participant Repo as Tenant-aware repository
  participant Prisma
  participant DB as PostgreSQL

  Request->>Context: resolve session cookie
  Context->>Service: userId, organizationId, role
  Service->>Repo: context and validated input
  Repo->>Prisma: query with organizationId
  Prisma->>DB: tenant-scoped operation
```

Na criacao de Equipment, o service valida primeiro o `customerId` usando
`customerId + context.organizationId`. Somente depois cria o Equipment com
`organizationId` vindo do contexto autenticado.

Fluxo concreto de criacao de ServiceOrder implementado na Fase 4:

```mermaid
sequenceDiagram
  participant UI
  participant Action as Server Action
  participant Context as AuthenticatedContext
  participant Service as ServiceOrder Service
  participant EquipmentRepo as Equipment repository
  participant Code as publicCode generator
  participant Repo as ServiceOrder repository
  participant Tx as Prisma transaction
  participant DB as PostgreSQL

  UI->>Action: equipmentId da rota + reportedIssue
  Action->>Context: requireAuthenticatedContext
  Context->>Service: userId, organizationId, role
  Service->>EquipmentRepo: equipmentId + organizationId
  EquipmentRepo->>Service: Equipment com customerId persistido
  Service->>Code: gerar publicCode server-side
  Service->>Repo: customerId derivado + dados validados
  Repo->>Tx: abrir transacao
  Tx->>DB: create ServiceOrder
  Tx->>DB: create initial Timeline
```

Fluxo concreto de transicao de ServiceOrder:

```mermaid
sequenceDiagram
  participant UI
  participant Action as Server Action
  participant Context as AuthenticatedContext
  participant Service as ServiceOrder Service
  participant Repo as ServiceOrder repository
  participant Workflow as Domain workflow
  participant Tx as Prisma transaction
  participant DB as PostgreSQL

  UI->>Action: serviceOrderId + targetStatus
  Action->>Context: requireAuthenticatedContext
  Context->>Service: userId, organizationId, role
  Service->>Repo: carregar por id + organizationId
  Repo->>Service: current persisted status
  Service->>Workflow: validar current -> target
  Service->>Service: validar role se CANCELLED
  Service->>Repo: optimistic transition
  Repo->>Tx: abrir transacao
  Tx->>DB: update status with expected current status
  Tx->>DB: create status timeline
```

## Acesso a dados

O Prisma Client fica centralizado em `src/server/db/prisma.ts`. O arquivo evita
criar multiplas instancias durante hot reload em desenvolvimento.

Chamadas diretas ao Prisma nao devem ser espalhadas pela aplicacao. Conforme os
casos de uso forem criados, o acesso deve passar por repositories ou modulos de
server code com responsabilidade clara.

Os repositories de autenticacao atuais sao pequenos e concretos:

- `auth-user-repository`: busca User por email normalizado, por id e com
  Organization para DTOs seguros.
- `auth-session-repository`: cria, localiza e remove AuthSession.

Os repositories de negocio implementados na Fase 3 tambem sao pequenos e
concretos e foram ampliados na Fase 4:

- `customer-repository`: listagem, contagem, busca por id, criacao e atualizacao
  tenant-aware de Customer.
- `equipment-repository`: listagem, contagem, busca por Customer, busca por id,
  criacao e atualizacao tenant-aware de Equipment.
- `service-order-repository`: listagem, contagem, detalhes com timeline,
  criacao de OS com timeline inicial e transicao de status com concorrencia
  otimista.

Eles exigem `TenantContext` e nao oferecem APIs de busca por Customer ou
Equipment usando apenas o ID da entidade. O repository de ServiceOrder tambem
nao oferece busca interna por OS usando apenas o ID da entidade.

## Fronteiras server-side

Codigo que acessa Prisma, cookies, sessoes, password hashing e repositories
fica em `src/server` ou em Server Actions/Route Handlers do App Router. Client
Components nao importam Prisma nem repositories diretamente. A excecao visual e
o formulario de login, que importa uma Server Action; o Next.js trata essa
importacao como chamada server-side, nao como acesso direto ao banco no client.

## Regras de dominio

Regras de negocio devem ficar fora de componentes React. Nesta fase existem
regras iniciais para:

- formato de `publicCode` de ordem de servico;
- transicoes permitidas no workflow de ordem de servico.
- labels e descricoes server-side de timeline para ServiceOrder;
- validacao de `reportedIssue` e de status de ServiceOrder.

Essas regras sao testadas sem depender da interface.

O workflow de ServiceOrder permanece pequeno e explicito. Ele nao usa engine de
workflow, event sourcing ou CQRS. Nesta fase ele valida apenas transicoes
estruturais; pre-condicoes de Diagnostic e Quote ficam para fases futuras.

## Tratamento de erros

Erros de dominio usam `DomainError`. Rotas futuras devem traduzir esses erros
para respostas HTTP coerentes, sem expor detalhes internos.

`AuthenticationError` representa ausencia de autenticacao ou credenciais
invalidas. `AuthorizationError` representa usuario autenticado sem permissao
para determinada role.

## Tenant isolation

No FixFlow, um tenant representa uma assistencia tecnica. A entidade
`Organization` e o tenant porque agrupa usuarios internos, clientes,
equipamentos, ordens de servico, diagnosticos, orcamentos e timeline.

Autenticacao identifica o User. O User persistido determina a Organization. A
Organization persistida gera o `organizationId` do `AuthenticatedContext`.
Repositories e services multi-tenant devem receber esse contexto confiavel do
servidor.

O risco principal em um sistema multiempresa e vazar dados de uma Organization
para outra ao consultar registros somente pelo ID da entidade. Mesmo com IDs nao
sequenciais, confiar apenas em `customerId`, `equipmentId` ou `serviceOrderId`
nao e suficiente para isolamento logico.

Repositories e services futuros devem receber um contexto explicito:

```ts
type TenantContext = {
  organizationId: string;
};
```

Consulta incorreta:

```ts
await prisma.serviceOrder.findUnique({
  where: { id: serviceOrderId }
});
```

Consulta correta:

```ts
await prisma.serviceOrder.findFirst({
  where: {
    id: serviceOrderId,
    organizationId: context.organizationId
  }
});
```

IDs enviados pelo browser nunca substituem `context.organizationId`.
`organizationId` nao deve vir de query parameter, body, header customizado,
campo hidden, localStorage, cookie separado ou rota dinamica. Esconder registros
na UI nao e isolamento de tenant. Middleware ou protecao de rota isoladamente
tambem nao substituem filtros de tenant no acesso aos dados.

O schema inicial tambem usa chaves compostas como `[id, organizationId]` em
entidades de negocio para reduzir o risco de relacionamentos cruzados entre
tenants. Ainda assim, isso nao substitui validacao e filtros no codigo.

A defesa atual para operacoes multi-tenant tem camadas complementares:

1. a sessao identifica o User;
2. o User persistido determina a Organization;
3. `AuthenticatedContext` carrega o `organizationId` confiavel;
4. o service recebe esse contexto explicitamente;
5. o repository exige contexto;
6. a consulta inclui `organizationId`;
7. relacionamentos e constraints compostas do banco reforcam integridade quando
   existentes.

Nenhuma dessas camadas substitui as demais. A protecao de rota nao substitui o
filtro de tenant no repository, e a constraint do banco nao substitui a validacao
do `customerId` no service.

Na abertura de ServiceOrder, `customerId` nao vem do browser. O service carrega
Equipment dentro do tenant e deriva `customerId` do registro persistido. Na
transicao de status, o service carrega o status atual do banco e o repository
atualiza por `id + organizationId + status esperado`; se a contagem for zero,
o service retorna `ConflictError` e a timeline nao e criada.

Criacao de OS + timeline inicial e mudanca de status + timeline de status usam
transacoes Prisma especificas no repository. Nao ha UnitOfWork, Transaction
Manager ou repository generico.

Row Level Security do PostgreSQL pode ser avaliado em uma fase futura, mas nao
foi implementado nesta fase para manter o escopo controlado.

## Decisoes atuais

- Next.js App Router sera a camada web.
- PostgreSQL e o banco principal.
- Prisma e o ORM.
- `Organization` representa o tenant.
- IDs internos usam `cuid()`.
- Sessao usa token opaco bruto no cookie e somente `tokenHash` no banco.
- `AuthSession` nao possui `organizationId`; o tenant vem do User autenticado.
- A expiracao da sessao e fixa em 7 dias, sem sliding expiration nesta fase.
- `User.email` permanece unico globalmente nesta fase.
- `ServiceOrder.publicCode` e unico e nao deve ser sequencial.
- `ServiceOrder.customerId` e derivado do Equipment validado no tenant durante a
  criacao.
- `ServiceOrder` muda de status somente por workflow server-side.
- Valores monetarios usam `Decimal @db.Decimal(12, 2)`.
- Docker Compose fornece PostgreSQL local; a app roda via npm nesta fase.

## Evolucoes futuras

- autenticacao;
- contexto de Organization por request;
- repositories para novos casos de uso reais;
- auditoria de eventos;
- controle de permissoes por papel;
- Row Level Security;
- portal publico da ordem de servico;
- testes de integracao com banco.
