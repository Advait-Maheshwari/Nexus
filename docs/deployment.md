# Nexus Deployment

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`.

One repository-owner action is required before the first deployment:

1. Open repository `Settings`.
2. Open `Pages`.
3. Under `Build and deployment`, choose `GitHub Actions` (not `Deploy from a branch`).
4. Re-run the `Deploy Nexus` workflow.

The public URL will be:

`https://advait-maheshwari.github.io/Nexus/`

## Netlify

The repository includes `netlify.toml`.

- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Node version: `20`

Netlify deployment requires connecting the GitHub repository to a user-owned free Netlify account.

## Firebase Hosting

Nexus is configured for the Firebase project `nexus-advait-pm`.

- Build with `VITE_BASE_PATH=/` and run `npm run build`.
- Deploy with `firebase deploy --only hosting`.
- Firebase serves the app from `https://nexus-advait-pm.web.app/`.
- Google authentication must be enabled once in Firebase Console under Authentication,
  Sign-in method, Google.

Firebase Hosting and non-phone Firebase Authentication fit the no-billing Spark plan limits.
Phone/SMS authentication is intentionally not enabled by the zero-cost policy.

## Current Hosting Boundary

The static deployment is a client-only shell. Authentication and workspace data require the
FastAPI API with:

- `NEXUS_AUTH_BACKEND=database`
- A PostgreSQL `DATABASE_URL`
- A strong, private `JWT_SECRET_KEY`
- Matching `JWT_ISSUER` and `JWT_AUDIENCE` values
- `VITE_API_URL` pointing to the deployed API

## Free API And Database

The repository includes `render.yaml` for a free Render FastAPI service.

1. Create a persistent free PostgreSQL project on Neon.
2. Copy its pooled connection string into Render as `DATABASE_URL`.
3. Create a Render Blueprint from this repository and select the free web-service plan.
4. Set the deployed Render URL as `VITE_API_URL` for the Firebase build.
5. Rebuild and deploy Firebase Hosting.

The API Docker image runs `alembic upgrade head` before starting Uvicorn. Standard hosted
`postgresql://` URLs are normalized automatically to SQLAlchemy's asyncpg driver.

Render uses `/api/v1/ready` for health checks, so a deployment is considered ready only after the
Neon connection succeeds. The production Blueprint also fixes access tokens at 15 minutes and
refresh sessions at 14 days.

## Session Boundary

- Access tokens stay in browser `sessionStorage` and are validated against `/api/v1/auth/me`.
- Rotating refresh tokens are stored only as SHA-256 hashes in PostgreSQL.
- The raw refresh token uses an HTTP-only, secure, `SameSite=None` cookie in production.
- Firebase-to-Render requests must use `credentials: include`; CORS must contain the exact Firebase
  origin.
- Privacy-focused browsers may block cross-site cookies. A future same-site custom domain removes
  that limitation, but purchasing a domain is outside the locked zero-cost baseline.
- Password changes revoke every other active session. "Revoke all sessions" invalidates every
  access and refresh session for the account.

## Database Verification

GitHub Actions starts PostgreSQL 16 and runs the tenant-isolation suite against it using
`NEXUS_TEST_DATABASE_URL`. Local runs skip that one test unless the variable is provided. SQLite
tests still run for fast feedback.

## Live Deployment Verification

After each Firebase or Render release, run the zero-dependency production check:

```powershell
python ops/verify_deployment.py
```

It requires the Render readiness endpoint to confirm database-backed readiness, checks API and
Firebase security headers, and inspects the emitted JavaScript for the deployed API origin. It
fails when a production bundle still references the local `:8000` endpoint.

## Zero-Cost Workspace Limits

The `personal_free` plan is enforced server-side: 25 active projects, 2,500 tasks, and 5 members
per workspace. These limits protect the shared free Render and Neon resources; no billing call or
paid upgrade is triggered.

Render's free web service sleeps after inactivity. Its own free PostgreSQL expires after 30 days,
so Nexus intentionally uses a separate persistent free database provider.

GitHub Pages hosts only the frontend. The repository workflow is preferred over branch deployment
because it runs the Vite build with the required `/Nexus/` base path before publishing the output.

## Account Email Delivery

The Render baseline keeps database email delivery disabled so an unset SMTP credential cannot
break the existing private deployment. Before enabling public password signup, configure a
user-owned SMTP account as Render secrets:

- `NEXUS_EMAIL_DELIVERY_MODE=smtp`
- `NEXUS_REQUIRE_EMAIL_VERIFICATION=true`
- `NEXUS_EMAIL_FROM`
- `NEXUS_SMTP_HOST`, `NEXUS_SMTP_PORT`, `NEXUS_SMTP_USERNAME`, `NEXUS_SMTP_PASSWORD`
- `NEXUS_SMTP_STARTTLS=true`

Console delivery is accepted only during local development and is rejected at production startup.
Verification links expire after 24 hours and reset links after 30 minutes by default. Detailed
backup, restore, same-site domain, QA, and incident procedures are in `docs/operations.md`.
