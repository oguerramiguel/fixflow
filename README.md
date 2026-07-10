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

Fase 3: gerenciamento autenticado e multi-tenant de clientes e equipamentos.

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
- repositories e services tenant-aware para Customer e Equipment;
- validacao centralizada de Customer e Equipment;
- checkpoint de senha contra truncation silenciosa do bcrypt;
- documentacao tecnica de autenticacao, Customer e Equipment.

Ainda nao implementado:

- ordens de servico;
- diagnostico, orcamento e timeline funcional;
- dashboard funcional;
- portal publico do cliente;
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
- `docs/service-order-workflow.md`
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
- [ ] Ordens de servico
- [ ] Diagnostico tecnico
- [ ] Orcamentos
- [ ] Timeline da ordem de servico
- [ ] Acompanhamento publico da OS
- [ ] Evolucao para controles SaaS multiempresa
