# FixFlow

FixFlow e uma plataforma web para gerenciamento de assistencias tecnicas de
notebooks e computadores.

O projeto organiza o ciclo completo de atendimento tecnico: cadastro do cliente,
cadastro do equipamento, abertura da ordem de servico, diagnostico, orcamento,
manutencao, testes finais, conclusao e acompanhamento pelo cliente.

## Contexto de portfolio

Este repositorio e construido como um projeto profissional de Engenharia de
Software. A meta e demonstrar arquitetura organizada, regras de negocio
testaveis, modelagem de dados com isolamento por tenant, qualidade de codigo,
testes automatizados e documentacao tecnica suficiente para discussao em
entrevistas.

## Status atual

Fase 6: portal publico de acompanhamento da ordem de servico por `publicCode`.

Implementado ate aqui:

- base Next.js com App Router;
- TypeScript strict;
- Tailwind CSS;
- Prisma configurado para PostgreSQL;
- schema inicial do dominio;
- migration inicial;
- Docker Compose para PostgreSQL local;
- endpoint `GET /api/health`;
- testes unitarios do health check e de regras iniciais de dominio;
- autenticacao por email e senha para usuarios internos;
- hashing de senha com `bcryptjs`;
- sessao opaca persistida no PostgreSQL;
- cookie HTTP-only para sessao;
- login, logout e pagina interna protegida em `/app`;
- endpoint autenticado `GET /api/me`;
- contexto autenticado com `organizationId` derivado do User persistido;
- base simples de autorizacao por role;
- bootstrap de desenvolvimento por variaveis de ambiente;
- listagem, busca, detalhes, cadastro e edicao de clientes;
- listagem, busca, detalhes, cadastro e edicao de equipamentos;
- cadastro de equipamento vinculado a cliente validado dentro do tenant;
- visualizacao de equipamentos vinculados a um cliente;
- abertura de ordem de servico a partir de Equipment validado dentro do tenant;
- derivacao server-side de Customer a partir do Equipment da OS;
- geracao server-side de `publicCode` nao previsivel;
- listagem, busca, filtro por status, paginacao e detalhes de ordens de
  servico;
- workflow server-side de status de ServiceOrder;
- cancelamento protegido por role OWNER ou ADMIN;
- timeline inicial e eventos de mudanca de status;
- concorrencia otimista simples para transicoes de status;
- registro e edicao de Diagnostic enquanto a OS esta em diagnostico;
- timeline de Diagnostic registrado e atualizado;
- criacao explicita de Quote em rascunho;
- um Quote por ServiceOrder nesta fase;
- criacao, edicao e remocao de QuoteItems somente em DRAFT;
- parser monetario server-side com `Prisma.Decimal`;
- subtotal e total derivados server-side;
- DTOs monetarios como strings canonicas;
- exibicao BRL a partir de strings monetarias;
- envio logico de Quote por OWNER ou ADMIN;
- aprovacao interna de Quote por OWNER ou ADMIN;
- rejeicao interna de Quote por OWNER ou ADMIN;
- portal publico em `/track/[publicCode]`;
- consulta publica por `publicCode` com DTO minimo;
- exibicao publica de status, equipamento, problema relatado, quote publico e
  timeline publica;
- ocultacao publica de Quote em `DRAFT`;
- aprovacao publica de Quote `SENT`;
- rejeicao publica de Quote `SENT`;
- atualizacao atomica de Quote, ServiceOrder e timeline no fluxo publico;
- integracao atomica entre Quote e ServiceOrder;
- concorrencia otimista para transicoes comerciais de Quote e ServiceOrder;
- repositories e services tenant-aware para Customer e Equipment;
- repository e service tenant-aware para ServiceOrder;
- repositories e services tenant-aware para Diagnostic e Quote;
- validacao centralizada de Customer e Equipment;
- validacao centralizada de ServiceOrder;
- validacao centralizada de Diagnostic, QuoteItem, quantity e money input;
- checkpoint de senha contra truncation silenciosa do bcrypt;
- documentacao tecnica de autenticacao, Customer, Equipment, ServiceOrder,
  Diagnostic e Quote.

Ainda nao implementado:

- dashboard funcional;
- envio de e-mails;
- PDF, pagamentos ou integracoes externas.

## Stack

Versoes principais instaladas e registradas no `package-lock.json`:

- Next.js 16.2.10
- React 19.1.0
- TypeScript 5.8.3
- Tailwind CSS 3.4.17
- Prisma 6.10.1
- bcryptjs 3.0.2
- Vitest 3.2.7
- ESLint 9.29.0
- jiti 2.4.2 para o seed TypeScript
- npm 10.9.2 para o lockfile
- PostgreSQL 16 via Docker Compose

O projeto usa `overrides` do npm para manter o `postcss` transitive do Next.js
em versao corrigida quando necessario.

## Arquitetura resumida

O projeto usa uma arquitetura simples em camadas:

- `src/app`: rotas, layouts e paginas do Next.js;
- `src/components`: componentes de apresentacao;
- `src/lib`: configuracoes e utilitarios compartilhados;
- `src/domain`: entidades, regras de dominio e erros testaveis;
- `src/server/db`: Prisma Client centralizado;
- `src/server/repositories`: repositories concretos e tenant-aware;
- `src/server/services`: services de aplicacao server-side;
- `prisma`: schema e migrations do banco;
- `tests`: testes automatizados;
- `docs`: documentacao de produto, arquitetura, banco e workflow.

Regras de negocio nao devem ser implementadas diretamente em componentes React.
Consultas de entidades multi-tenant recebem o contexto da `Organization` para
preservar o isolamento logico entre tenants.

## Requisitos para desenvolvimento

- Node.js compativel com Next.js 16;
- npm;
- Docker e Docker Compose para PostgreSQL local;
- Git.

## Configuracao do ambiente

1. Instale as dependencias:

```bash
npm install
```

2. Copie o arquivo de exemplo de ambiente:

```bash
cp .env.example .env
```

3. Ajuste `DATABASE_URL` se necessario.

## Variaveis de ambiente

```env
DATABASE_URL="postgresql://fixflow_dev:fixflow_dev_password@localhost:5432/fixflow_dev?schema=public"

FIXFLOW_BOOTSTRAP_ORGANIZATION_NAME=""
FIXFLOW_BOOTSTRAP_ORGANIZATION_SLUG=""
FIXFLOW_BOOTSTRAP_USER_NAME=""
FIXFLOW_BOOTSTRAP_USER_EMAIL=""
FIXFLOW_BOOTSTRAP_USER_PASSWORD=""
```

Use apenas credenciais locais de desenvolvimento. Nao armazene secrets reais no
repositorio e nao preencha `.env.example` com credenciais reutilizaveis.

## Execucao com Docker

Nesta fase, o Docker Compose fornece somente o PostgreSQL de desenvolvimento.
A aplicacao Next.js roda localmente com npm para manter o ciclo de
desenvolvimento simples.

```bash
docker compose up -d
```

Depois que o banco estiver saudavel:

```bash
npm run prisma:migrate
npm run db:seed
```

O seed cria ou atualiza uma Organization e um usuario OWNER para
desenvolvimento usando somente variaveis de ambiente. Ele nao roda durante
build, start ou acesso ao login.

## Comandos npm

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run db:seed
npm run prisma:generate
npm run prisma:migrate
npm run prisma:validate
npm run prisma:format
```

## Fluxo local conceitual

1. Copie `.env.example` para `.env`.
2. Preencha `DATABASE_URL` e as variaveis `FIXFLOW_BOOTSTRAP_*`.
3. Inicie o PostgreSQL local com Docker Compose.
4. Aplique as migrations com `npm run prisma:migrate`.
5. Execute `npm run db:seed`.
6. Inicie a aplicacao com `npm run dev`.
7. Acesse `/login`.

## Testes

```bash
npm run test
```

Os testes atuais cobrem:

- resposta do endpoint `GET /api/health`;
- formato do codigo publico de ordens de servico;
- transicoes iniciais permitidas para ordens de servico.
- normalizacao de email;
- politica e hashing de senha;
- token de sessao;
- login;
- resolucao de contexto autenticado;
- autorizacao por role;
- DTO seguro de `GET /api/me`.
- validacao de Customer;
- validacao de Equipment;
- repositories tenant-aware de Customer e Equipment;
- services de Customer e Equipment;
- Server Actions de Customer e Equipment;
- validacao, workflow, labels e timeline de ServiceOrder;
- validacao de Diagnostic;
- parser monetario Decimal e validacao de quantity;
- validacao de QuoteItem;
- workflow de Quote;
- repository tenant-aware de ServiceOrder;
- repositories tenant-aware de Diagnostic e Quote;
- service de ServiceOrder com publicCode retry, transacao, autorizacao e
  concorrencia otimista;
- services de Diagnostic e Quote com transacoes, autorizacao, tenant isolation,
  concorrencia otimista e calculo monetario Decimal;
- service e repository publicos para acompanhamento por `publicCode`;
- DTO publico minimo sem Customer, IDs internos ou `organizationId`;
- aprovacao/rejeicao publica de Quote com transacao e concorrencia otimista;
- Server Actions de ServiceOrder;
- Server Actions de Diagnostic e Quote;
- Server Actions publicas de decisao do Quote;
- checkpoint de truncation do bcrypt.

## Estrutura de diretorios

```text
src/
  app/
  components/
  domain/
    entities/
    errors/
    services/
  lib/
  server/
    db/
    repositories/
    services/
prisma/
  migrations/
tests/
docs/
```

## Documentacao tecnica

- `docs/authentication.md`
- `docs/customer-equipment.md`
- `docs/service-orders.md`
- `docs/service-order-workflow.md`
- `docs/diagnostic-quotes.md`
- `docs/public-portal.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/requirements.md`

## Roadmap

- [x] Fundacao Next.js, TypeScript, Tailwind, Prisma e testes
- [x] Modelagem inicial do dominio
- [x] Health check
- [x] Base de autenticacao
- [x] Contexto de Organization em requests autenticadas
- [x] CRUD de clientes sem exclusao
- [x] CRUD de equipamentos sem exclusao
- [x] Ordens de servico
- [x] Timeline inicial e eventos de status da ordem de servico
- [x] Diagnostico tecnico
- [x] Orcamentos internos
- [x] Calculo monetario com Decimal
- [x] Ciclo de vida do orcamento integrado a ServiceOrder
- [x] Acompanhamento publico da OS
- [x] Aprovacao e rejeicao publica de orcamento
- [ ] Evolucao para controles SaaS multiempresa
