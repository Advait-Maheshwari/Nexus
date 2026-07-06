# Nexus Phase Status

## Phase 1: Core Spine

Status: complete for the current local-first release.

Completed foundation:

- Production-grade monorepo scaffold.
- React/Vite frontend shell.
- FastAPI backend shell.
- SQLAlchemy domain models.
- Project, feature, task, milestone, idea, journal, activity, time entry, and AI insight entities.
- Mission Control UI.
- Seed analytics and health scoring.
- Local zero-cost AI planner boundary.
- Docker Compose foundation.
- Zero-cost auth endpoints with JWT token issuing.
- Local and PostgreSQL project CRUD paths.
- Local and PostgreSQL feature CRUD paths.
- Local and PostgreSQL task/subtask-ready CRUD paths.
- Frontend API-first Mission Control loading with seed fallback.

The auth UI, JWT session flow, database CRUD services, frontend bearer-token wiring, and core
tests are complete. A live PostgreSQL integration test environment and granular follow-up
migrations remain launch hardening work rather than Phase 1 product work.

## Phase 2: Cinematic AI Operating System

Status: active.

Started:

- Interactive Galaxy project stars and feature planets.
- Selected feature task moons.
- Project relationship links.
- Relationship strength/type visualization.
- Interactive City Builder portfolio districts.
- Editable project blueprint overview.
- Functional Settings and Profile views.
- Firebase Hosting deployment and optional Google identity session.
- Textured planetary surfaces, star coronas, rings, task moons, and zoom visibility compensation.
- Functional project Calendar, Ideas, and Journal workspaces.
- Local AI recommendations tied to project graph signals.
- Phase 1 completion track running in parallel.

Next: real 3D DNA timeline, live-data cinematic views, and local daily briefing.

## Phase 4 and 5 Checkpoint

- Database signup creates an isolated workspace and owner membership.
- JWTs are bound to Nexus issuer/audience and checked against live membership.
- Firebase ID tokens are validated by signature, issuer, audience, expiry, and verified email,
  then exchanged for Nexus workspace JWTs.
- Every database project, feature, and task query is filtered by workspace.
- Full names accept letters and spaces only; passwords require letters and numbers.
- Production rejects short/default JWT secrets.
- Auth responses disable caching; API responses include strict browser security headers.
- Request bodies are capped at 1 MB.
- Authentication and API requests are rate limited, mutations emit project audit events, and
  Dependabot monitors application, Python, and workflow dependencies.
- Authorization integration tests against a live PostgreSQL service remain pending.
- SQLite-backed tenant isolation tests are complete; live PostgreSQL verification remains pending.
