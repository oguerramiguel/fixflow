# Operations runbook

All examples use placeholders. Confirm the target environment and database
before any write. Operational contacts must be replaced by the organization
running FixFlow:

- primary: `<PRIMARY_ON_CALL_CONTACT>`;
- database: `<DATABASE_OPERATOR_CONTACT>`;
- security: `<SECURITY_CONTACT>`;

## Deploy and migrations

1. Confirm the release SHA and reviewed image digest.
2. Confirm a recent backup and successful restore-test record.
3. Run one migration job with `prisma migrate deploy`.
4. Run `npm run deploy:check`.
5. Start the web workload.
6. Wait for readiness and run the production smoke command.
7. Observe readiness, HTTP failures and security audit health through the
   agreed release window.

Never start multiple migration jobs, and never attach migration execution to
every web replica.

## Smoke failure

Stop rollout expansion. Preserve command output without request bodies,
credentials or tokens. Compare `/live`, `/ready`, the release identity and edge
routing. If the current version is healthy, keep it serving. Roll the
application image back only when the schema remains compatible.

## Database outage

- Liveness should remain HTTP 200.
- Readiness should return HTTP 503 and remove affected instances from traffic.
- Do not restart continuously healthy processes solely because the database is
  unavailable.
- Confirm provider status, connectivity, credentials and capacity through
  secret-safe tools.
- Do not print `DATABASE_URL` or copy it into tickets.
- After recovery, wait for readiness and rerun the smoke check.

## Failed migration

Do not use reset, db push or an automatic database restore. Keep the last
compatible app running when possible. Capture the migration name and sanitized
error class, review the partially applied state in `_prisma_migrations`, and
follow Prisma's documented resolution process with a reviewed forward fix.
Back up again before corrective writes.

## Session revocation

An OWNER can revoke a user's sessions in the user-management screen. For a
broader security incident, coordinate a reviewed database operation or
application change; do not delete users or business data. Record the actor,
scope, reason and result without session tokens.

## Secret rotation

1. Create a new database credential with least privilege.
2. Update the runtime secret manager.
3. roll instances gradually and verify readiness.
4. run the smoke check.
5. revoke the old credential only after all instances use the new one.
6. record rotation metadata without either secret.

Rotate any affected external edge or registry credentials by the same
create-switch-verify-revoke sequence.

## Security cleanup

Run `npm run security:cleanup -- --dry-run` first and record only aggregate
counts. Verify retention variables and target database. Execute the real
cleanup only in a separately approved maintenance action. The cleanup is not a
substitute for backup retention and never deletes business entities.

## Incident handling

1. Identify severity and contact the placeholders above.
2. Preserve logs and audit evidence with access controls.
3. Contain access: rotate secrets or revoke sessions as appropriate.
4. Keep tokens, passwords, customer data and public codes out of chat/tickets.
5. Restore service using readiness and smoke checks.
6. Document timeline, impact, decisions and corrective actions.

## Forward-only rollback

If the new image is faulty and the migration is backward compatible, deploy the
previous image digest. If not compatible, do not downgrade the application
blindly. Create a forward-compatible application or corrective migration, test
it against a restored copy, and follow the normal release flow.
