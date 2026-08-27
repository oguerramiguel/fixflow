# Phase 9B: pilot readiness

## Status and scope

Phase 9B prepares a controlled public staging environment and the first pilot
tenant. The repository contains the provider declaration and administrative
provisioning path, but this work did not create cloud accounts, billing,
deployments, domains, backups, smoke evidence or pilot records.

Only fictional data created manually through the product may be used in the
pilot. Never copy real customers, devices, serial numbers, contacts or service
history into staging.

## Provider decision

Render was selected for the first pilot. The decision favors a stable,
repository-owned Blueprint over a lower estimated entry price.

| Criterion | Render | Railway |
| --- | --- | --- |
| Repository configuration | Stable `render.yaml` Blueprint supports Docker services, pre-deploy commands, health checks and database references. | Legacy Config as Code is deprecated and scheduled to stop working on 2026-12-01; its replacement Infrastructure as Code is beta. |
| Release safety | A paid web service can run migration and deploy check as one pre-deploy command before the new release starts. | Supports pre-deploy, Dockerfiles and health checks, but the current IaC replacement does not expose every required release setting. |
| PostgreSQL | Managed PostgreSQL, private connection and recovery features on paid plans. | Managed PostgreSQL and backups on eligible paid plans. |
| Operations | Managed TLS, health checks, logs and ephemeral SSH access on paid services. | Managed domains/TLS, logs and service shell access. |
| Initial cost | Expected baseline is approximately USD 13/month for Starter web plus Basic PostgreSQL before growth; confirm current prices. | Hobby starts at USD 5/month including usage credit; usage can increase the total. |

Official references:

- Render: [Blueprint specification](https://render.com/docs/blueprint-spec),
  [deploy lifecycle](https://render.com/docs/deploys),
  [Docker](https://render.com/docs/docker),
  [health checks](https://render.com/docs/health-checks),
  [PostgreSQL backups](https://render.com/docs/postgresql-backups),
  [TLS](https://render.com/docs/tls), [logs](https://render.com/docs/logging),
  [SSH](https://render.com/docs/ssh) and
  [small-business cost example](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses).
- Railway: [Config as Code deprecation](https://docs.railway.com/config-as-code/reference),
  [Infrastructure as Code](https://docs.railway.com/infrastructure-as-code),
  [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command),
  [Dockerfiles](https://docs.railway.com/builds/dockerfiles),
  [plans](https://docs.railway.com/pricing/plans) and
  [PostgreSQL backups](https://docs.railway.com/guides/postgres-backups-restores).

## Staging declaration and release

`render.yaml` declares one paid Docker web service and one paid PostgreSQL 16
database in the same region. Automatic deploy is disabled. The database uses a
private connection reference and has no public IP allow list. The service runs
one instance and checks `/api/health/ready`.

Render builds the final `render` Docker stage. It inherits the hardened
standalone runtime and adds only the dependencies and source needed by
pre-deploy and administrative commands. The explicit `runner` and `migration`
targets remain available for local production Compose.

The release sequence is:

1. Build the immutable image.
2. Run exactly one pre-deploy command:
   `npm run prisma:migrate:deploy && FIXFLOW_RELEASE_SHA=$RENDER_GIT_COMMIT npm run deploy:check`.
3. Start `scripts/render-start.mjs`, which maps Render's commit identifier to
   `FIXFLOW_RELEASE_SHA` before loading the standalone server.
4. Allow traffic only after readiness succeeds.

No seed command is part of deployment.

Before the first deploy, the operator must set:

- `FIXFLOW_APP_BASE_URL`: exact staging HTTPS URL without a trailing slash.
- `FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS`: exact hostname, plus a port only when
  non-standard. Never use `*`.

`DATABASE_URL` comes from the private database reference. Never add bootstrap,
demo or production credentials to environment variables.

## First pilot provisioning

The command creates an `Organization`, first `OWNER`, one-time account setup
invitation and `PILOT_ORGANIZATION_PROVISIONED` audit event in one transaction.
It never accepts `organizationId`, creates no temporary password and persists
only the invitation token hash.

Run validation first:

```sh
npm run pilot:provision -- --organization-name "Oficina Piloto" --organization-slug "oficina-piloto" --owner-name "Owner Piloto" --owner-email "owner@example.invalid" --dry-run
```

For the real operation, use an interactive ephemeral SSH session on the paid
web service and run the same command without `--dry-run`:

```sh
render ssh <SERVICE_ID> --ephemeral
npm run pilot:provision -- --organization-name "Oficina Piloto" --organization-slug "oficina-piloto" --owner-name "Owner Piloto" --owner-email "owner@example.invalid"
```

The process opens `/dev/tty` before any database write and prints the full setup
link there exactly once. Standard output receives only a non-sensitive result
and expiration. Do not pipe or redirect the real command, use a non-interactive
job, enable shell tracing, paste the link in a ticket or store it in history.
Transfer it immediately through an approved private channel. The OWNER then
uses the existing account setup flow to choose their own password.

Dry-run validates values and uniqueness but neither creates records nor
generates a token. Duplicate slug or email fails before creation. Unexpected
failure rolls back organization, owner, invitation and audit together.

## Demonstration, backup and rollback

After account setup, create a minimal fictional scenario manually through the
UI: customer, device, service order, diagnostic and quote, followed by public
quote approval and the normal workflow. Do not run `db:seed`, `db:seed:demo` or
direct SQL against public staging.

Enable paid database recovery before pilot use and rehearse a restore into a
separate disposable database. Record the recovery point, duration, integrity
checks and target deletion. Never restore over staging as a rehearsal.

Rollback is forward-only: redeploy a known-good image only if its schema is
compatible. Never roll back a successful migration blindly. Preserve failure
evidence and create a corrective forward migration when necessary.

## Pending first-deploy checklist

- Create the Render workspace and confirm billing, region and current prices.
- Review the Blueprint diff before applying; keep automatic deploy disabled.
- Set exact base URL and allowed origin without secrets in evidence.
- Confirm database privacy and recovery on the selected plan.
- Deploy a reviewed commit and record its SHA.
- Confirm the pre-deploy command ran once and succeeded.
- Verify live, ready, HTTPS and certificate behavior.
- Run production smoke with an approved fictional public code.
- Run provisioning dry-run, then once in ephemeral interactive SSH.
- Complete OWNER setup and create only fictional manual demo data.
- Rehearse restore separately and document RPO/RTO evidence.
- Review logs for token, password, email and internal identifier leakage.
- Define monitoring, incident owner, support channel and pilot exit criteria.

## Known risks and manual dependencies

- Account creation, paid-plan selection, first deployment, TLS verification,
  database recovery and restore rehearsal need an authorized operator.
- Link delivery depends on a human-controlled private channel outside FixFlow.
- Provider UI and pricing can change; revalidate official documentation and the
  Blueprint preview immediately before purchase or resource creation.
- Alert routing and on-call ownership remain manual; current observability is
  provider logs, health checks and the database audit trail.
