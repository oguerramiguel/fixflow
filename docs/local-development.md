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

Variaveis de seguranca recomendadas para desenvolvimento local:

```env
FIXFLOW_APP_ENV="development"
FIXFLOW_RATE_LIMIT_STORE="memory"
FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_LIMIT="5"
FIXFLOW_RATE_LIMIT_LOGIN_ATTEMPT_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_LIMIT="5"
FIXFLOW_RATE_LIMIT_ACCOUNT_SETUP_ATTEMPT_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_LIMIT="5"
FIXFLOW_RATE_LIMIT_PASSWORD_CHANGE_ATTEMPT_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_LIMIT="5"
FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CREATE_WINDOW_SECONDS="900"
FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_LIMIT="5"
FIXFLOW_RATE_LIMIT_PASSWORD_RESET_CONSUME_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_LIMIT="60"
FIXFLOW_RATE_LIMIT_PUBLIC_PORTAL_LOOKUP_WINDOW_SECONDS="60"
FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_LIMIT="5"
FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_APPROVE_WINDOW_SECONDS="300"
FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_LIMIT="5"
FIXFLOW_RATE_LIMIT_PUBLIC_QUOTE_REJECT_WINDOW_SECONDS="300"
FIXFLOW_SECURITY_AUDIT_ENABLED="true"
FIXFLOW_SECURITY_AUDIT_STORE="database"
FIXFLOW_PASSWORD_RESET_TOKEN_TTL_MINUTES="30"
FIXFLOW_SECURITY_RETENTION_EXPIRED_SESSION_DAYS="7"
FIXFLOW_SECURITY_RETENTION_CLOSED_INVITATION_DAYS="30"
FIXFLOW_SECURITY_RETENTION_CLOSED_PASSWORD_RESET_DAYS="30"
FIXFLOW_SECURITY_RETENTION_RATE_LIMIT_COUNTER_SECONDS="86400"
FIXFLOW_SECURITY_RETENTION_AUDIT_LOG_DAYS="90"
FIXFLOW_SECURITY_CLEANUP_BATCH_SIZE="500"
```

A store `memory` de rate limit e previsivel para desenvolvimento e testes, mas
nao serve para multiplas instancias. Em producao, use `database`.

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

As Fases 8.2A e 8.2B adicionam
`20260727000000_add_user_management_invitations` e
`20260728000000_add_password_recovery_security_maintenance`. Para aplicar
apenas migrations pendentes em ambiente controlado:

```powershell
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

Em desenvolvimento local, `npx.cmd prisma migrate dev` continua valido. Nao use
`prisma migrate reset`; a migration nova nao exige apagar dados existentes.

## Convites locais

Depois do login como OWNER:

1. abra `http://localhost:3000/app/settings/users`;
2. crie o convite;
3. copie o link exibido;
4. abra o link em janela anonima;
5. defina a senha e entre por `/login`.

O processo e manual nesta fase. Nao ha SMTP, envio de email nem senha
temporaria. O link expira em 72 horas e o token bruto desaparece ao recarregar
a tela administrativa.

## Senha e redefinicao local

Um usuario autenticado altera a propria senha em:

```text
http://localhost:3000/app/settings/account
```

A operacao revoga todas as sessoes, inclusive a atual. Para uma conta ativa que
nao sabe a senha, o OWNER gera um link em `/app/settings/users`, copia a resposta
uma unica vez e compartilha manualmente. O destinatario usa
`/reset-password/[token]`. O TTL local padrao e 30 minutos e nao existe envio de
email. Um OWNER sem acesso depende de outro OWNER ativo; a recuperacao do unico
OWNER nao e automatizada nesta fase.

## Cleanup de seguranca

Revise primeiro as contagens sem excluir:

```powershell
npm.cmd run security:cleanup -- --dry-run
```

Execute a remocao somente depois de conferir o banco e as retencoes do `.env`:

```powershell
npm.cmd run security:cleanup
```

O comando real remove somente sessoes expiradas, convites/tokens encerrados,
contadores antigos e auditoria antiga, em lotes. Ele nao apaga User,
Organization nem entidades operacionais. Nao ha scheduler embutido.

## Testes opcionais com PostgreSQL real

Os testes de integracao sao destrutivos e exigem um banco separado cujo nome
contenha `test`. A URL nao pode ser igual a `DATABASE_URL`.

Em um PowerShell dedicado:

```powershell
$testDatabaseUrl = "postgresql://fixflow_dev:fixflow_dev_password@localhost:5432/fixflow_test?schema=public"
$developmentDatabaseUrl = $env:DATABASE_URL
$env:FIXFLOW_TEST_DATABASE_URL = $testDatabaseUrl
$env:DATABASE_URL = $testDatabaseUrl
npx.cmd prisma migrate deploy
$env:DATABASE_URL = $developmentDatabaseUrl
npm.cmd run test:postgres
```

Se `DATABASE_URL` normalmente vem apenas do `.env`, remova a variavel temporaria
antes do teste em vez de atribuir valor vazio:

```powershell
Remove-Item Env:DATABASE_URL
npm.cmd run test:postgres
```

Sem `FIXFLOW_TEST_DATABASE_URL`, a suite e explicitamente ignorada. Os testes
limpam apenas os IDs/Organizations que criaram e sempre desconectam o Prisma.

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
npm run test:postgres
npm run test:watch
npm run security:cleanup -- --dry-run
npm run security:cleanup
npm run db:seed
npm run prisma:generate
npm run prisma:migrate
npm run prisma:validate
npm run prisma:format
npx prisma generate
git diff --check
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

O `docker-compose.yml` continua exclusivo de desenvolvimento. O staging local
usa `docker-compose.staging.yml` e o procedimento de `docs/staging.md`; nao
reutilize volume ou credenciais entre os dois ambientes.

O Dockerfile possui alvos `runner` e `migration`. Consulte
`docs/deployment.md`, `docs/backup-restore.md` e
`docs/operations-runbook.md`. Esses artefatos nao significam que exista deploy
publico.

Comandos operacionais novos:

```powershell
npm.cmd run deploy:check
npm.cmd run smoke:production -- --base-url http://localhost:3100
```

Access logs devem ocultar tokens em `/setup-account/[token]` e
`/reset-password/[token]`.
