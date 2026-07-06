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
- Publish directory: `apps/web/dist`
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

The static deployment runs the local-first workspace and local demo authentication without a paid
backend. Real multi-user accounts require the FastAPI API with:

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

Render's free web service sleeps after inactivity. Its own free PostgreSQL expires after 30 days,
so Nexus intentionally uses a separate persistent free database provider.

GitHub Pages hosts only the frontend. The repository workflow is preferred over branch deployment
because it runs the Vite build with the required `/Nexus/` base path before publishing the output.
