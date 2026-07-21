from uuid import uuid4

from app.schemas.configuration import (
    ProjectBlueprintWrite,
    ProjectGoal,
    ProjectStep,
    ProjectTeam,
)


def default_blueprint(project_name: str) -> ProjectBlueprintWrite:
    if project_name.strip().lower() == "nexus":
        return _nexus_blueprint()
    return ProjectBlueprintWrite(
        vision=(
            f"Deliver {project_name} as a reliable, polished product that solves its core "
            "user problem."
        ),
        definition_of_done=(
            "The primary workflow is complete, tested, documented, secure, and usable in "
            "production."
        ),
        strategy=(
            "Move in thin vertical slices: define the outcome, ship the smallest useful "
            "workflow, verify it, then polish the experience."
        ),
        constraints=[
            "Keep the project zero-cost from Phase 1 through launch",
            "Prefer secure defaults, server-owned data, and reusable product architecture",
            "Desktop quality comes first, with responsive phone support maintained",
        ],
        goals=[
            _goal(
                "Confirm the final product scope",
                "The final outcome, target user, and required modules are written clearly.",
            ),
            _goal(
                "Complete the core user workflow",
                "A user can create a project, plan features, track tasks, and review progress.",
            ),
            _goal(
                "Verify quality, security, and deployment",
                "Typecheck, build, tests, security checks, and hosted URLs all pass.",
            ),
        ],
        steps=[
            _step(
                "Foundation and architecture",
                "Lock the data model, authentication boundary, deployment path, and zero-cost policy.",
                "active",
                "critical",
            ),
            _step(
                "Core product implementation",
                "Build the project, feature, task, milestone, journal, and analytics loops.",
                "pending",
                "critical",
            ),
            _step(
                "Testing and hardening",
                "Run type checks, backend tests, security checks, and responsive layout checks.",
                "pending",
                "high",
            ),
            _step(
                "Launch and review",
                "Deploy, verify login and sync, review the product, then plan the next cycle.",
                "pending",
                "high",
            ),
        ],
    )


def _nexus_blueprint() -> ProjectBlueprintWrite:
    return ProjectBlueprintWrite(
        vision=(
            "Build Nexus into a zero-cost, production-grade, futuristic 3D AI-powered project "
            "management system for personal use first, with an architecture ready to become a "
            "SaaS product without a major rewrite."
        ),
        definition_of_done=(
            "A user can securely manage real projects through project-feature-task-milestone "
            "loops, understand progress through meaningful 3D and analytical views, receive "
            "useful zero-cost guidance, collaborate through isolated workspaces, and use the "
            "deployed app on desktop and phone."
        ),
        strategy=(
            "Keep a strict client/server boundary, finish the product in disciplined phases, "
            "make every visual explain delivery state, use free-tier infrastructure, and verify "
            "security, recovery, observability, and release quality before SaaS expansion."
        ),
        constraints=[
            "Total project cost must stay $0 from Phase 1 through the final phase",
            "Desktop and laptop quality is primary; phone support remains clean and usable",
            "Use free local heuristics by default; paid AI providers require explicit approval",
            "Keep durable data on the authenticated server and isolate every workspace",
            "Do not add visuals unless they explain progress, health, risk, ownership, or next action",
        ],
        goals=[
            _goal(
                "Ship the Nexus command center",
                "Mission Control, Projects, Galaxy, City, Analytics, Calendar, Ideas, and Journal use one server-owned project model.",
            ),
            _goal(
                "Make Nexus secure for cloud use",
                "Authentication, authorization, validation, security headers, audit logs, backup, and recovery controls are verified.",
            ),
            _goal(
                "Keep every default workflow zero-cost",
                "Hosting, database, authentication, integrations, reports, and recommendations stay on free tiers or local logic.",
            ),
            _goal(
                "Prepare SaaS expansion without rewrites",
                "Workspace roles, team ownership, account lifecycle, observability, and release controls are production ready.",
            ),
        ],
        steps=[
            _step(
                "Phase 1: Core Spine",
                "Maintain the monorepo, core data model, CRUD services, and zero-cost policy.",
                "done",
                "critical",
            ),
            _step(
                "Phase 2: Cinematic 3D OS",
                "Keep Galaxy and City meaningful, navigable, performant, and tied to delivery data.",
                "done",
                "critical",
            ),
            _step(
                "Phase 3: Free Integrations",
                "Use free GitHub activity, calendar files, exports, and copyable briefings.",
                "done",
                "high",
            ),
            _step(
                "Phase 4: Cloud, Auth, and Security",
                "Maintain cloud authentication, account lifecycle, role enforcement, and PostgreSQL coverage.",
                "done",
                "critical",
            ),
            _step(
                "Phase 5: SaaS Launch Readiness",
                "Maintain collaboration, responsive QA, monitoring, backup, and launch controls.",
                "done",
                "critical",
            ),
            _step(
                "Phase 6: Operational Intelligence",
                "Complete server-owned execution intelligence, client/server state, and production verification.",
                "active",
                "critical",
            ),
        ],
        teams=[
            _team(
                "Product & Delivery",
                "Project owner",
                "Own scope, goals, priorities, and release acceptance.",
            ),
            _team(
                "Client Experience",
                "Experience lead",
                "Own HCI, accessibility, responsive UI, analytics, Galaxy, and City.",
            ),
            _team(
                "Server Platform & Security",
                "Platform lead",
                "Own APIs, data, authentication, authorization, tests, and security.",
            ),
            _team(
                "Cloud & Reliability",
                "Operations lead",
                "Own deployment, database, monitoring, backups, recovery, and releases.",
            ),
        ],
    )


def _goal(title: str, measure: str) -> ProjectGoal:
    return ProjectGoal(id=str(uuid4()), title=title, measure=measure)


def _step(
    title: str,
    guidance: str,
    status: str,
    priority: str,
) -> ProjectStep:
    return ProjectStep(
        id=str(uuid4()),
        title=title,
        guidance=guidance,
        status=status,
        priority=priority,
    )


def _team(name: str, lead: str, responsibility: str) -> ProjectTeam:
    return ProjectTeam(
        id=str(uuid4()),
        name=name,
        lead=lead,
        responsibility=responsibility,
    )
