# Nexus Production Operations

## Launch Gate

Public password signup stays disabled until all of these are true:

- `NEXUS_EMAIL_DELIVERY_MODE=smtp`
- `NEXUS_REQUIRE_EMAIL_VERIFICATION=true`
- SMTP credentials are stored only as Render secrets.
- Verification and password-reset links use the production frontend URL.
- A backup has been restored successfully into an isolated drill database.
- Desktop and mobile authentication journeys pass the release checklist below.

User-owned SMTP keeps delivery at zero cost. Console delivery is local-only and production startup
rejects it. Disabled delivery is allowed for the current Google-only/private deployment boundary.

## Encrypted Backups

Prerequisites: PostgreSQL client tools, OpenSSL, `DATABASE_URL`, and a private
`NEXUS_BACKUP_PASSPHRASE` containing at least 16 characters.

```powershell
python ops/backup_database.py --output-dir E:\NexusBackups
```

Store the encrypted `.dump.enc`, its `.json` checksum metadata, and the passphrase separately.
Keep at least seven daily backups and one monthly backup. Never commit backups or passphrases.

## Restore Drill

Create an isolated empty PostgreSQL database, point `DATABASE_URL` to it, and verify the database
name explicitly. The restore command refuses to run without both safeguards.

```powershell
$env:NEXUS_ALLOW_RESTORE="true"
python ops/restore_database.py E:\NexusBackups\nexus-drill.dump.enc --confirm-database nexus_restore_drill
```

After restoration, run Alembic status, API readiness, authentication, tenant-isolation, and project
count checks. Record the date, backup timestamp, restore duration, operator, and results. Never run a
first-time restore drill against production.

For the hosted zero-cost drill, add `NEXUS_NEON_DATABASE_URL` and
`NEXUS_BACKUP_PASSPHRASE` as GitHub Actions repository secrets, then manually run the
`Database Recovery Drill` workflow. It reads Neon, restores only into a disposable PostgreSQL 16
service, checks the Alembic schema, and retains the encrypted artifact for seven days. The workflow
has no scheduled trigger and never restores into the production database.

## Same-Site Domain Plan

The zero-cost deployment uses Firebase Hosting and Render, so refresh cookies are cross-site and
`SameSite=None`. Before broad public SaaS availability, map `app.<owned-domain>` to Firebase and
`api.<owned-domain>` to Render. Then change the refresh cookie to `SameSite=Lax`, restrict CORS to
the exact app origin, and rerun login, refresh, logout, and Google exchange tests. Purchasing a
domain remains outside the zero-cost baseline and is not required for private use.

## Browser Release Checklist

- Desktop: Chrome, Edge, and Firefox at 1440x900 and 1920x1080.
- Companion mobile: Chrome Android and Safari iOS at 390x844.
- Signup, verification, login, refresh, logout, forgotten password, and reset all succeed.
- Galaxy starts framed, remains navigable, and does not overlap the project inspector.
- City Builder supports orbit, pan, zoom, project switching, and reduced-motion mode.
- Mission Control, Projects, Calendar, Analytics, Settings, and Profile have no clipped controls.
- Keyboard focus is visible; forms expose labels and useful validation errors.

## Incident Response

1. Contain: disable public signup, revoke affected sessions, rotate JWT/SMTP/database credentials,
   and preserve request correlation IDs.
2. Assess: identify affected workspace IDs, accounts, time window, mutation audit events, and data
   classes without copying secrets into tickets.
3. Recover: deploy the fix, restore only when integrity requires it, run tenant-isolation tests,
   and verify `/api/v1/ready` before reopening traffic.
4. Notify: document user impact and required account actions. Do not claim resolution before
   session revocation and data-integrity checks complete.
5. Learn: record root cause, detection gap, corrective owner, deadline, and a regression test.
