# Nexus Zero-Cost Policy

Nexus must cost `0` from Phase 1 through the final personal-use phase.

This policy is locked as an architecture requirement. A feature is not allowed into the default product path if it creates a mandatory bill, subscription, token cost, hosted-service fee, storage fee, or paid dependency.

## Allowed

- Open-source frontend and backend libraries.
- Local development on the user's machine.
- PostgreSQL, Redis, and other self-hosted services through Docker.
- Free-tier integrations when they are optional.
- User-owned API keys for optional experiments.
- Local heuristic AI, local templates, and future local model adapters.
- Static exports, local backups, and local file attachments.

## Not Allowed As Required Dependencies

- Paid AI API calls.
- Paid hosting.
- Paid managed databases.
- Paid vector databases.
- Paid analytics tools.
- Paid design assets.
- Paid auth providers.
- Paid automation services.
- Mandatory paid API keys.

## AI Cost Strategy

AI features should ship in this order:

1. Deterministic project analytics.
2. Local heuristics for suggestions, delays, blockers, and health.
3. Template-generated summaries, reports, daily briefings, and weekly reviews.
4. Optional local model support.
5. Optional cloud-provider adapters only when the user supplies keys.

The app should remain useful even when every external AI key is empty.

## Default Runtime Rule

The default Nexus runtime must work with:

- Local frontend.
- Local backend.
- Local or Docker PostgreSQL.
- Local or Docker Redis when needed.
- Local heuristics and templates for AI behavior.

Anything beyond that must be optional.
