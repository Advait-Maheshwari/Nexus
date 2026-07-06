# Nexus Deployment

## GitHub Pages

The repository includes `.github/workflows/deploy-pages.yml`.

One repository-owner action is required before the first deployment:

1. Open repository `Settings`.
2. Open `Pages`.
3. Under `Build and deployment`, choose `GitHub Actions`.
4. Re-run the `Deploy Nexus` workflow.

The public URL will be:

`https://advait-maheshwari.github.io/Nexus/`

## Netlify

The repository includes `netlify.toml`.

- Build command: `npm run build`
- Publish directory: `apps/web/dist`
- Node version: `20`

Netlify deployment requires connecting the GitHub repository to a user-owned free Netlify account.

## Current Hosting Boundary

The static deployment runs the local-first workspace and local demo authentication without a paid
backend. Real multi-user accounts require the FastAPI API with:

- `NEXUS_AUTH_BACKEND=database`
- A PostgreSQL `DATABASE_URL`
- A strong, private `JWT_SECRET_KEY`
- `VITE_API_URL` pointing to the deployed API
