# Nexus Security Baseline

## Identity

- Passwords are PBKDF2-SHA256 hashes and never returned to the browser.
- Registration normalizes email addresses and full names.
- Full names accept Unicode letters and spaces only; numbers and punctuation are rejected.
- New passwords require 10-128 characters with at least one letter and one number.
- Access tokens have expiry, issued-at, unique ID, issuer, audience, and token-type claims.

## Authorization

- Database routes validate the bearer token and current workspace membership.
- Project, feature, and task reads and writes include the authenticated `workspace_id`.
- Workspace viewers are read-only; only owners, admins, and members can mutate project,
  planning, feature, or task data.
- Cross-workspace object IDs return `404` instead of disclosing that another tenant owns them.
- Project deletion archives data to reduce accidental or malicious destructive loss.
- Firebase and local browser workspaces use identity-specific storage keys to avoid device-level
  cross-account data exposure.

## HTTP And Configuration

- Production startup rejects default or short JWT secrets.
- Authentication responses use `Cache-Control: no-store`.
- Firebase ID tokens require RS256 signatures, known Google key IDs, the Nexus Firebase audience,
  the expected issuer, expiry validity, and a verified email.
- API responses deny framing, MIME sniffing, sensitive permissions, and cross-origin opener access.
- Production responses enable HSTS.
- Request bodies above 1 MB are rejected.
- Authentication is limited to 12 requests/minute per client and general API traffic to
  180 requests/minute per client on the single free service instance.
- Project mutations create tenant-scoped audit events.
- CORS is limited to the configured frontend and local development origins.

## Launch Work Remaining

- Replace process-local throttling with distributed rate limiting before horizontal scaling.
- Add verified email, password reset, refresh-token rotation, and session revocation.
- Run the existing tenant-isolation suite against live PostgreSQL in CI.
- Add audit events, encrypted backups, restore drills, and dependency scanning.
- Complete an external security review before public SaaS launch.
- Exchange Firebase ID tokens for Nexus API sessions before treating Google users as
  PostgreSQL-synchronized SaaS accounts.
