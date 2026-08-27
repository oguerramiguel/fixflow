# PostgreSQL backup and restore

This is a documented procedure only. No backup or restore is executed by the
application or CI.

## Safety rules

- Use a dedicated operator workstation or controlled job.
- Obtain connection parameters from the secret manager without placing them in
  shell history, source files or command-line URLs.
- Encrypt backups at rest and in transit.
- Grant backup access only to authorized operators.
- Keep production, staging, restore-test and development destinations distinct.
- Never restore over an existing production, development or test database
  without explicit change approval and a verified target.
- Treat security audit hashes and internal IDs in backups as sensitive data.

## Logical backup

Set connection variables in the controlled process environment:

```text
PGHOST=<SOURCE_HOST>
PGPORT=<SOURCE_PORT>
PGDATABASE=<SOURCE_DATABASE>
PGUSER=<BACKUP_USER>
PGPASSWORD=<FROM_SECRET_MANAGER>
```

Create a custom-format backup:

```bash
pg_dump --format=custom --no-owner --no-privileges --file=<ENCRYPTED_BACKUP_PATH> "$PGDATABASE"
```

Record the PostgreSQL version, timestamp, environment, release SHA, migration
count, file size and a SHA-256 checksum. Do not record the password or complete
connection URL.

## Restore test in a separate environment

Create an empty, isolated restore-test database with no application traffic.
Use distinct destination variables:

```text
PGHOST=<RESTORE_TEST_HOST>
PGPORT=<RESTORE_TEST_PORT>
PGDATABASE=<EMPTY_RESTORE_TEST_DATABASE>
PGUSER=<RESTORE_OPERATOR>
PGPASSWORD=<FROM_SECRET_MANAGER>
```

Inspect before restore:

```bash
pg_restore --list <ENCRYPTED_BACKUP_PATH>
```

Restore only after confirming the destination:

```bash
pg_restore --exit-on-error --clean --if-exists --no-owner --no-privileges --dbname="$PGDATABASE" <ENCRYPTED_BACKUP_PATH>
```

`--clean` is destructive to the selected destination. It is acceptable only
for the confirmed, disposable restore-test database. It must not be copied into
an unattended production command.

## Integrity verification

After restore:

1. Run read-only queries for database identity, expected tables and
   `_prisma_migrations`.
2. Compare aggregate row counts for critical tables with the backup record.
3. Run `npm run deploy:check` using restore-test runtime settings.
4. Start an isolated app instance and run the smoke check.
5. Test representative authenticated and tenant-isolated reads with approved
   test accounts; do not use production passwords.
6. Record success, duration and operator. Destroying the disposable test
   database requires its own confirmed target and approval.

## Environment differences

Never carry production runtime secrets, DNS names, cookies or edge credentials
into restore-test. Rotate database credentials after a real disaster recovery
event if exposure is possible. A restored security/session dataset may contain
valid-looking sessions; keep the environment isolated and revoke or purge them
through an approved procedure before any exposure.

## Schedule and retention

The infrastructure owner must define backup frequency, geographic redundancy,
retention, encryption key rotation, restore-test frequency, RPO and RTO. Use
placeholders until real values are approved:

- RPO: `<APPROVED_RPO>`;
- RTO: `<APPROVED_RTO>`;
- backup retention: `<APPROVED_BACKUP_RETENTION>`;
- restore-test cadence: `<APPROVED_RESTORE_TEST_CADENCE>`.

Phase 9B selects Render PostgreSQL for staging. Paid recovery and a restore into
a separate disposable database are required before pilot use, but neither is
enabled or rehearsed by repository changes. Keep the database private and
record recovery point, duration and integrity evidence without credentials or
customer data.
