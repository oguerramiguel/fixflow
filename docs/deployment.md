# Deployment

## Scope

Phase 9A provides provider-neutral production and staging artifacts. It does not
create infrastructure, publish an image or deploy the application. Runtime
secrets must be injected by the chosen platform and must never be baked into an
image.

## Environment matrix

| Environment | `NODE_ENV` | `FIXFLOW_APP_ENV` | Rate limit | Audit | Base URL |
| --- | --- | --- | --- | --- | --- |
| Development | `development` | `development` | `memory` allowed | database by default | HTTP localhost |
| Test | `test` | `test` | `memory` allowed | injectable/database | isolated |
| Staging | `production` | `staging` | `database` required | database required | explicit HTTP/HTTPS |
| Production | `production` | `production` | `database` required | database required | HTTPS required |

Staging and production require every security limit, retention, readiness
timeout, trusted-proxy decision, Server Action origin, base URL and release
identity explicitly. Missing or unsafe configuration aborts startup. Error
messages identify variable names but never print their values.

## Release flow

1. Build one immutable image from the reviewed commit.
2. Inject `FIXFLOW_RELEASE_SHA` with that commit or release identifier.
3. Create a database backup according to `docs/backup-restore.md`.
4. Run `prisma migrate deploy` as one controlled, one-shot job.
5. Run `npm run deploy:check` with the target runtime configuration.
6. Start or roll the web workload using the same image.
7. Wait for `/api/health/ready`.
8. Run `npm run smoke:production -- --base-url https://target.example`.
9. Monitor errors, readiness, login failures and security audit writes.

Never run `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, a seed
or cleanup as part of web startup. Migration concurrency must be controlled by
the platform so only one migration job runs for a release.

## Docker targets

- `runner`: minimal standalone Next.js runtime, non-root, without source tests,
  Git metadata, env files or backup artifacts.
- `migration`: operational image with Prisma CLI, schema, migrations and
  deployment scripts. Its default command is `prisma migrate deploy`.

Build the web image:

```bash
docker build --target runner --tag fixflow:<release-sha> .
```

Build the migration image:

```bash
docker build --target migration --tag fixflow-migration:<release-sha> .
```

Use registry digest pinning in the deployment platform after publishing. The
repository pins the Node and PostgreSQL image versions; a release process can
record their resolved digests.

## Health endpoints

- `GET /api/health/live`: process liveness only; no database query.
- `GET /api/health/ready`: runtime configuration plus bounded PostgreSQL
  connectivity; returns `503` with a generic payload when unavailable.

Both endpoints expose only `status`, application version and release identity.
They do not expose connection strings, host names, Prisma errors or stack
traces. Load balancers should remove an instance from traffic when readiness is
not HTTP 200. Liveness should restart only a wedged process, not an instance
whose database is temporarily unavailable.

## Proxy, origin and HTTPS

TLS should terminate at a controlled edge or at the application platform.
Production requires an HTTPS application base URL. HSTS and secure cookies are
enabled for production runtime responses.

Set `FIXFLOW_TRUST_PROXY=true` only when the application receives traffic
exclusively from a trusted proxy that overwrites `X-Forwarded-For` and
`X-Real-IP`. Otherwise use `false`; arbitrary forwarded headers are ignored.
Do not configure a broad or user-controlled proxy chain.

`FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS` is a comma-separated allowlist of exact
hosts, including the application host, without schemes, paths or wildcards.
Keep this list as small as possible.

## Secrets

Provide `DATABASE_URL` and any seed credentials only at runtime using the
platform secret manager. Do not pass secrets as Docker build arguments, image
labels, source files or CI artifacts. `NEXT_PUBLIC_*` must never be used for
server secrets.

The web runtime rejects bootstrap variables and an enabled demo seed in staging
or production. The demo seed is a separate, explicit operator action and is
always forbidden in production.

## Rollback

Application rollback means redeploying a previously known-good application
image only when it remains compatible with the migrated schema. Database
migrations are forward-only. Do not run down migrations or restore a database
over production as an automatic rollback.

If a migration is incompatible, stop the release, keep the current compatible
application version serving when possible, create and review a corrective
forward migration, back up the database and run the normal release flow again.
See `docs/operations-runbook.md`.
