# Staging

## Local staging

Local staging is separate from the development Compose project. It uses
`docker-compose.staging.yml`, a distinct named volume, an internal PostgreSQL
network, a one-shot migration service and the production standalone web image.
PostgreSQL is not published to the host.

## Prepare

```powershell
Copy-Item .env.staging.example .env.staging
```

Replace every `CHANGE_ME` value. Use a random database password and a concrete
release identifier. The default local base URL is `http://localhost:3100`;
production still requires HTTPS.

Validate the rendered configuration without starting services:

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml config
```

## Start

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml up --build -d
docker compose --env-file .env.staging -f docker-compose.staging.yml ps
```

The migration container must finish successfully before web starts. No seed is
run. To run the non-destructive preflight inside the operational image:

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml run --rm migration npm run deploy:check
```

Smoke the local staging web:

```powershell
npm.cmd run smoke:production -- --base-url http://localhost:3100
```

## Optional demo data

Demo data is never automatic. Only after confirming this is the isolated
staging database, inject `FIXFLOW_DEMO_*` into one explicit operational
container using a separate ignored secret source. Do not add demo credentials
to `.env.staging`, because the web runtime rejects them. The command executed
inside that one-shot container is `npm run db:seed:demo`.

Remove the one-shot secret source immediately. Never run the demo seed in
production or against the principal development database.

## Stop

```powershell
docker compose --env-file .env.staging -f docker-compose.staging.yml down
```

This command removes containers and networks but does not request volume
deletion. Do not add `--volumes` unless deletion is separately authorized.

## Public pilot staging

`render.yaml` prepares a paid Render web service and private PostgreSQL database
for the first controlled pilot. Applying the Blueprint, selecting a paid plan,
configuring recovery and deploying remain manual operator actions. The complete
runbook is in `docs/phase-9b-pilot-readiness.md`.
