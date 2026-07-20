# Nexus Security Baseline

## Identity

- Passwords are PBKDF2-SHA256 hashes and never returned to the browser.
- Registration normalizes email addresses and full names.
- Full names accept Unicode letters and spaces only; numbers and punctuation are rejected.
- New passwords require 10-128 characters with at least one letter and one number.
- Access tokens have expiry, issued-at, unique ID, issuer, audience, and token-type claims.
- Access tokens are bound to a live server session ID; revoked sessions fail on the next request.
- Refresh tokens are random, stored only as SHA-256 hashes, rotated once, and rejected on replay.
- Database-password accounts support verified-email enforcement with single-use, expiring tokens.
- Password-reset tokens are stored only as SHA-256 hashes, expire after 30 minutes by default,
  and revoke every active session after a successful reset.
- Account recovery responses do not reveal whether an email address is registered.

## Authorization

- Database routes validate the bearer token and current workspace membership.
- Project, feature, and task reads and writes include the authenticated `workspace_id`.
- Workspace viewers are read-only; only owners, admins, and members can mutate project,
  planning, feature, or task data.
- Cross-workspace object IDs return `404` instead of disclosing that another tenant owns them.
- Project deletion archives data to reduce accidental or malicious destructive loss.
- Invitation tokens are hashed, expire after seven days, and can only be accepted by the invited
  email address.
- Owners control member roles; viewers remain read-only and ownership cannot be reassigned through
  the ordinary role endpoint.
- Firebase and local browser workspaces use identity-specific storage keys to avoid device-level
  cross-account data exposure.

## HTTP And Configuration

- Production startup rejects default or short JWT secrets.
- Authentication responses use `Cache-Control: no-store`.
- Firebase ID tokens require RS256 signatures, known Google key IDs, the Nexus Firebase audience,
  the expected issuer, expiry validity, and a verified email.
- Production Google sign-in must exchange the Firebase ID token for a Nexus API JWT before opening
  the workspace; local Firebase-only fallback is limited to development builds.
- API responses deny framing, MIME sniffing, sensitive permissions, and cross-origin opener access.
- Production responses enable HSTS.
- Request bodies above 1 MB are rejected.
- Authentication is limited to 12 requests/minute per client and general API traffic to
  180 requests/minute per client on the single free service instance.
- Project mutations create tenant-scoped audit events.
- CORS is limited to the configured frontend and local development origins.
- Authenticated and workspace responses use `Cache-Control: no-store`.
- Every request receives a correlation ID and emits a bounded structured request log without
  credentials or request bodies.
- GitHub Actions dependencies are pinned to immutable commit SHAs to prevent mutable-tag supply-chain changes.
- CodeQL runs extended Python and TypeScript security queries on pushes, pull requests, and weekly.
- Pull requests reject newly introduced dependencies with known high-severity vulnerabilities.

## Launch Work Remaining

- Replace process-local throttling with distributed rate limiting before horizontal scaling.
- Configure user-owned SMTP and enable required email verification before public password signup.
- Run the encrypted backup tooling and document a successful isolated restore drill.
- Complete an external security review before public SaaS launch.
- Configure a same-site production domain before broad public SaaS availability.
