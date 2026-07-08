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

Status: complete for the current zero-cost local-first release.

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
- Scroll-driven 3D DNA timeline with selectable status nodes.
- Functional project Calendar, Ideas, and Journal workspaces.
- Local AI recommendations tied to project graph signals.
- Local daily command briefing generated from project data.
- Rule-based next task recommendation.
- Delay risk and bottleneck detection from deadlines, blocker counts, and priority.
- Template-generated local report export.
- Weekly review summary generated without paid AI calls.
- Rebuilt City Builder as a selected project city with project sidebar, feature districts, roads,
  towers, damage beacons, and mobile-safe stacking.
- Phase 1 completion track running in parallel.

Launch hardening left after this phase: deeper live-data parity for every 3D scene and visual
polish passes as real project volume grows.

## Phase 3: Free Integrations

Status: complete for the current zero-cost local-first release.

Completed:

- GitHub commit activity adapter and UI.
- GitHub public-repository fallback without credentials.
- GitHub private-repository path through user-owned local token.
- Google Calendar deadline export through local `.ics` file.
- Google Drive attachment planning through local manifest export.
- Notion import/export through Markdown export.
- Slack briefing template copy.
- Discord briefing template copy.
- All integration paths avoid paid services and default to local files, public APIs, or
  user-owned credentials.

Launch hardening left after this phase: full OAuth setup screens, live PR/issue sync, webhook
delivery, and file upload automation.

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
