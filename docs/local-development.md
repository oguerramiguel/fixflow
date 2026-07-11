# Local development

Este guia detalha como rodar o FixFlow localmente em ambiente de
desenvolvimento. Os comandos foram escritos pensando em Windows/PowerShell, mas
tambem incluem alternativas para Bash/WSL.

## Requisitos

- Git.
- Node.js compativel com Next.js 16. Node 22 e uma opcao coerente com o
  `Dockerfile` do projeto.
- npm 10.9.2 ou compativel com o lockfile.
- Docker Desktop ou Docker Engine com Docker Compose.
- Acesso local a porta `5432` para PostgreSQL.

## Setup rapido

```powershell
git clone <repository-url>
cd FixFlow
Copy-Item .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Variaveis de ambiente

O `docker-compose.yml` sobe PostgreSQL com:

- database: `fixflow_dev`
- user: `fixflow_dev`
- password: `fixflow_dev_password`
- host: `localhost`
- port: `5432`

Use esta `DATABASE_URL` no `.env` local:

```env
DATABASE_URL="postgresql://fixflow_dev:fixflow_dev_password@localhost:5432/fixflow_dev?schema=public"
```

O seed tambem exige:

```env
FIXFLOW_BOOTSTRAP_ORGANIZATION_NAME="FixFlow Demo"
FIXFLOW_BOOTSTRAP_ORGANIZATION_SLUG="fixflow-demo"
FIXFLOW_BOOTSTRAP_USER_NAME="Admin Local"
FIXFLOW_BOOTSTRAP_USER_EMAIL="admin@fixflow.local"
FIXFLOW_BOOTSTRAP_USER_PASSWORD="ChangeMeLocal123!"
```

Esse exemplo e ficticio e deve ser usado apenas localmente. Nao versione `.env`
nem reutilize senha de desenvolvimento em outro contexto.

## PowerShell e npm.cmd

Se o PowerShell bloquear scripts `.ps1`, chame os executaveis `.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
npx.cmd prisma migrate dev
npx.cmd prisma generate
```

## Docker

Subir PostgreSQL:

```bash
docker compose up -d
```

Verificar containers:

```bash
docker compose ps
```

Parar containers:

```bash
docker compose stop
```

Remover containers e rede criados pelo Compose:

```bash
docker compose down
```

O volume `postgres_data` preserva os dados locais. Remover volumes apaga o banco
local e deve ser uma decisao consciente.

## Prisma

Aplicar migrations em desenvolvimento:

```bash
npx prisma migrate dev
```

Gerar Prisma Client:

```bash
npx prisma generate
```

Validar schema:

```bash
npm run prisma:validate
```

Formatar schema:

```bash
npm run prisma:format
```

Nao use `db push` como substituto das migrations neste projeto.

## Seed

O seed fica em `prisma/seed.ts` e roda com:

```bash
npm run db:seed
```

Ele cria ou atualiza:

- uma `Organization`;
- um usuario OWNER de desenvolvimento.

O seed nao roda durante build, start ou login. Ele deve ser executado
explicitamente no ambiente local.

## Scripts uteis

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

## Validacao local antes de publicar

Execute:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run prisma:validate
npm run prisma:format
```

Depois confira:

```bash
git status --short --branch
```

O resultado esperado e nao haver alteracoes inesperadas, migrations novas ou
schema Prisma alterado sem decisao explicita.

## Observacoes sobre producao

Existe um `Dockerfile`, mas esta fase nao documenta deploy de producao. O
`docker-compose.yml` atual fornece apenas PostgreSQL local para desenvolvimento.
Antes de producao, ainda seriam necessarios hardening, secrets reais em ambiente
seguro, observabilidade, rate limiting, estrategia de deploy, CI e revisao de
seguranca.
