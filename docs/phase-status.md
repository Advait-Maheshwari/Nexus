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
- Database-backed analytics and health scoring.
- Local zero-cost AI planner boundary.
- Docker Compose foundation.
- Zero-cost auth endpoints with JWT token issuing.
- Local and PostgreSQL project CRUD paths.
- Local and PostgreSQL feature CRUD paths.
- Local and PostgreSQL task/subtask-ready CRUD paths.
- Frontend Mission Control loading from the authenticated workspace API.

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
- Portfolio Analytics dashboard with health, risk, time, velocity, and feature heatmap signals.
- Functional project Calendar, Ideas, and Journal workspaces.
- Local AI recommendations tied to project graph signals.
- Local daily command briefing generated from project data.
- Rule-based next task recommendation.
- Delay risk and bottleneck detection from deadlines, blocker counts, and priority.
- Template-generated local report export.
- Weekly review summary generated without paid AI calls.
- Rebuilt City Builder as a selected project city with project sidebar, feature districts, roads,
  towers, damage beacons, and mobile-safe stacking.
- Added City Builder overview, street, and risk-scan modes with energy routes, construction
  cranes, scanner pulses, and low-progress risk rings.
- Removed the experimental Time Tunnel surface because it did not meet the product bar.
- Upgraded City Builder with denser project-specific cities, feature districts, street grids,
  micro-buildings, skyline towers, parks, skybridges, transit loops, construction zones, risk
  damage, and unrestricted orbit controls.
- Added Galaxy semantic mapping so stars are projects, planets are features, moons are tasks,
  and red moons/blocker signals communicate project risk instead of pure decoration.
- Improved the free local AI briefing with portfolio health, next three moves, deadline pressure,
  blocker focus, and exportable zero-cost reports.
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
- Production Google sign-in no longer silently falls back to a local Firebase-only workspace if
  the Nexus API token exchange fails.
- Every database project, feature, and task query is filtered by workspace.
- Full names accept letters and spaces only; passwords require letters and numbers.
- Production rejects short/default JWT secrets.
- Auth responses disable caching; API responses include strict browser security headers.
- Request bodies are capped at 1 MB.
- Authentication and API requests are rate limited, mutations emit project audit events, and
  Dependabot monitors application, Python, and workflow dependencies.
- Workspace roles now enforce database mutations: owners, admins, and members can edit project
  data; viewers are read-only.
- Database sessions now support live validation, refresh rotation, replay rejection, logout,
  all-device revocation, profile editing, and password changes.
- Workspace invitations, member roles, workspace switching, and server-enforced `personal_free`
  limits are implemented without a paid email provider.
- Mission Control and Galaxy feature systems load tenant-scoped projects and features for cloud
  accounts.
- GitHub Actions now runs tenant isolation against PostgreSQL 16 in addition to the fast SQLite
  suite.
- Render readiness checks include the Neon database, and request correlation logs provide a
  zero-cost observability baseline.
- Database-password accounts now have single-use verified-email and password-reset workflows;
  action tokens are hashed at rest, expire, reject replay, and password reset revokes all sessions.
- User-owned SMTP provides a zero-cost production delivery path while console email is restricted
  to local development.
- Encrypted PostgreSQL backup and guarded restore scripts now support checksum verification and
  isolated restore drills.
- The project guidance engine now includes editable delivery teams, team leads, responsibilities,
  exclusive task assignments, unassigned-work detection, and computed on-track/watch/lagging
  signals that feed the recommended next move.
- The monorepo now has an explicit client/server contract: `apps/web` owns browser presentation,
  `apps/api` owns security and business rules, and `packages/shared` stays transport-only.
- City Builder now starts with a complete-city framing, supports a 20-unit zoom range and full
  orbit/pan control, and includes peripheral neighborhoods, parks, city gates, and moving transit.
- Galaxy now uses corrected camera targeting, stable selected-system spacing, semantic feature
  labels, task-moon meaning, and responsive canvas heights instead of a cropped or overlong scene.
- Control Center includes four local profile-picture presets with a server-side allowlist so no
  third-party image host or tracking URL is required.
- Final desktop and 375px phone QA passed for City, Galaxy, profile presets, and project guidance
  with nonblank WebGL scenes, no horizontal overflow, and no browser console errors.

Phase 5 is complete for the current zero-cost Google-first release. Render and Firebase are live,
production password registration is fail-closed, CodeQL passes for Python and TypeScript, and the
encrypted Neon backup was restored and schema-verified against disposable PostgreSQL 18 in GitHub
Actions run `29738241789`.

Optional future scale hardening includes user-owned verified SMTP before enabling password signup,
a same-site custom domain when a permanent zero-cost option exists, distributed throttling before
horizontal scaling, and an independent penetration test before commercial SaaS expansion.
