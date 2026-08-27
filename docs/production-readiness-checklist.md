# Production readiness checklist

## Before release

- [ ] Reviewed commit is identified by `FIXFLOW_RELEASE_SHA`.
- [ ] Image was built from the lockfile with no local `.env`, Git metadata,
      tests or backups in the context/runtime.
- [ ] Runtime runs as non-root.
- [ ] `DATABASE_URL` is supplied by the target secret manager.
- [ ] `FIXFLOW_APP_ENV` is `staging` or `production`, matching the target.
- [ ] Production base URL is HTTPS.
- [ ] Trusted proxy is explicitly true or false and the edge overwrites
      forwarded headers when true.
- [ ] Server Action allowed origins contain only exact required hosts.
- [ ] Rate limit uses `database`.
- [ ] Security audit is enabled with `database`.
- [ ] All limits, token TTLs, retentions and cleanup batch size are explicit.
- [ ] Backup completed and restore procedure is known.
- [ ] No `FIXFLOW_BOOTSTRAP_*` variable is present.
- [ ] `FIXFLOW_DEMO_SEED_ENABLED` is absent or false.
- [ ] No default, example or shared credential is used.
- [ ] Staging contains only fictional, manually created demonstration data.
- [ ] Staging has an exact HTTPS `FIXFLOW_APP_BASE_URL` and a non-wildcard
      `FIXFLOW_SERVER_ACTION_ALLOWED_ORIGINS`.

## Database and startup

- [ ] Only one controlled `prisma migrate deploy` job runs.
- [ ] No `migrate dev`, `migrate reset` or `db push` is used.
- [ ] `npm run deploy:check` succeeds after migrations.
- [ ] Web starts only after the migration job succeeds.
- [ ] `/api/health/live` returns HTTP 200.
- [ ] `/api/health/ready` returns HTTP 200 and the intended release.

## Smoke and observation

- [ ] `npm run smoke:production -- --base-url <target>` succeeds.
- [ ] Anonymous `/app` redirects to `/login`.
- [ ] Security headers are present; HSTS is present on production HTTPS.
- [ ] Health and error responses contain no internal details.
- [ ] Login, rate limit and audit behavior is monitored.
- [ ] Edge access logs redact setup/reset token path segments.
- [ ] Rollback decision window and responsible operator are identified.

## Release evidence

Record without secrets:

- release SHA and image digest;
- migration job result and migration count;
- deploy-check result;
- smoke result;
- health status;
- backup identifier and restore-test date;
- incident or rollback reference, when applicable.

For the first pilot, redact setup links, tokens, email addresses and internal
identifiers from logs, screenshots and tickets. Provision its OWNER only in an
interactive ephemeral SSH session after a successful dry-run.
