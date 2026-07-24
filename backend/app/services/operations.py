from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import AuthContext
from app.models.operations import AutomationRule, AutomationRun, BriefingSnapshot
from app.models.workspace import Workspace
from app.schemas.analytics import MissionControlSummary
from app.schemas.operations import (
    AIProviderStatus,
    AutomationPreviewRead,
    AutomationRuleCreate,
    AutomationRuleRead,
    AutomationRuleUpdate,
    AutomationRunRead,
    BriefingContent,
    BriefingGenerateRequest,
    BriefingSnapshotRead,
    OperationsOverview,
)
from app.services.analytics import build_database_mission_control

MAX_AUTOMATION_RULES = 6
MAX_SNAPSHOT_HISTORY = 16
MAX_RUN_HISTORY = 20


async def get_operations_overview(
    session: AsyncSession,
    auth: AuthContext,
) -> OperationsOverview:
    snapshots = (
        await session.scalars(
            select(BriefingSnapshot)
            .where(BriefingSnapshot.workspace_id == auth.workspace_id)
            .order_by(BriefingSnapshot.created_at.desc())
            .limit(MAX_SNAPSHOT_HISTORY)
        )
    ).all()
    rules = (
        await session.scalars(
            select(AutomationRule)
            .where(AutomationRule.workspace_id == auth.workspace_id)
            .order_by(AutomationRule.created_at.asc())
        )
    ).all()
    runs = (
        await session.scalars(
            select(AutomationRun)
            .where(AutomationRun.workspace_id == auth.workspace_id)
            .order_by(AutomationRun.created_at.desc())
            .limit(MAX_RUN_HISTORY)
        )
    ).all()
    return OperationsOverview(
        snapshots=[_snapshot_read(snapshot) for snapshot in snapshots],
        rules=[_rule_read(rule) for rule in rules],
        recent_runs=[_run_read(run) for run in runs],
        providers=provider_statuses(),
    )


async def generate_briefing_snapshot(
    session: AsyncSession,
    auth: AuthContext,
    request: BriefingGenerateRequest,
) -> BriefingSnapshotRead:
    summary = await build_database_mission_control(session, auth)
    snapshot, _ = await _upsert_snapshot(
        session,
        auth,
        request.briefing_type,
        summary,
        refresh_existing=request.refresh_existing,
    )
    await session.commit()
    await session.refresh(snapshot)
    return _snapshot_read(snapshot)


async def create_automation_rule(
    session: AsyncSession,
    auth: AuthContext,
    request: AutomationRuleCreate,
) -> AutomationRuleRead:
    await _lock_workspace(session, auth.workspace_id)
    current_count = await session.scalar(
        select(func.count(AutomationRule.id)).where(
            AutomationRule.workspace_id == auth.workspace_id
        )
    )
    if (current_count or 0) >= MAX_AUTOMATION_RULES:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"The zero-cost workspace limit is {MAX_AUTOMATION_RULES} automation rules",
        )
    normalized_name = request.name.strip()
    existing = await session.scalar(
        select(AutomationRule.id).where(
            AutomationRule.workspace_id == auth.workspace_id,
            func.lower(AutomationRule.name) == normalized_name.lower(),
        )
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An automation rule already uses this name")

    rule = AutomationRule(
        workspace_id=auth.workspace_id,
        created_by_id=auth.user_id,
        name=normalized_name,
        briefing_type=request.briefing_type,
        cadence=request.cadence,
        enabled=False,
        max_runs_per_period=1,
        configuration={"mutates_project_data": False, "requires_confirmation": True},
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return _rule_read(rule)


async def update_automation_rule(
    session: AsyncSession,
    auth: AuthContext,
    rule_id: str,
    request: AutomationRuleUpdate,
) -> AutomationRuleRead:
    rule = await _rule(session, auth, rule_id, lock=True)
    if request.name is not None:
        normalized_name = request.name.strip()
        duplicate = await session.scalar(
            select(AutomationRule.id).where(
                AutomationRule.workspace_id == auth.workspace_id,
                AutomationRule.id != rule.id,
                func.lower(AutomationRule.name) == normalized_name.lower(),
            )
        )
        if duplicate:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "An automation rule already uses this name",
            )
        rule.name = normalized_name
    if request.enabled is not None:
        rule.enabled = request.enabled
    await session.commit()
    await session.refresh(rule)
    return _rule_read(rule)


async def delete_automation_rule(
    session: AsyncSession,
    auth: AuthContext,
    rule_id: str,
) -> None:
    rule = await _rule(session, auth, rule_id, lock=True)
    await session.execute(
        delete(AutomationRun).where(
            AutomationRun.workspace_id == auth.workspace_id,
            AutomationRun.rule_id == rule.id,
        )
    )
    await session.delete(rule)
    await session.commit()


async def preview_automation_rule(
    session: AsyncSession,
    auth: AuthContext,
    rule_id: str,
    *,
    now: datetime | None = None,
) -> AutomationPreviewRead:
    rule = await _rule(session, auth, rule_id)
    return await _preview(session, auth, rule, now=now)


async def execute_automation_rule(
    session: AsyncSession,
    auth: AuthContext,
    rule_id: str,
    *,
    confirm: bool,
    now: datetime | None = None,
) -> AutomationRunRead:
    if not confirm:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Automation execution requires explicit confirmation",
        )
    rule = await _rule(session, auth, rule_id, lock=True)
    preview = await _preview(session, auth, rule, now=now)
    if not preview.due:
        raise HTTPException(status.HTTP_409_CONFLICT, preview.reason)

    summary = await build_database_mission_control(session, auth)
    snapshot, created = await _upsert_snapshot(
        session,
        auth,
        rule.briefing_type,
        summary,
        refresh_existing=False,
        now=now,
    )
    run = AutomationRun(
        workspace_id=auth.workspace_id,
        rule_id=rule.id,
        actor_id=auth.user_id,
        mode="execute",
        status="completed" if created else "skipped",
        period_key=preview.period_key,
        output_snapshot_id=snapshot.id,
        decision={
            "preview": preview.model_dump(mode="json"),
            "mutated_project_data": False,
            "confirmation_recorded": True,
            "snapshot_created": created,
        },
    )
    session.add(run)
    rule.last_run_at = _as_utc(now or datetime.now(UTC))
    await session.commit()
    await session.refresh(run)
    return _run_read(run)


def provider_statuses() -> list[AIProviderStatus]:
    providers = [
        ("openai", "OpenAI", bool(settings.openai_api_key)),
        ("anthropic", "Claude", bool(settings.anthropic_api_key)),
        ("google", "Gemini", bool(settings.google_ai_api_key)),
    ]
    return [
        AIProviderStatus(
            provider="local",
            label="Nexus Local",
            configured=True,
            enabled=True,
            execution_mode="active",
            detail="Deterministic heuristics run locally with no API cost.",
        ),
        *[
            AIProviderStatus(
                provider=provider,
                label=label,
                configured=configured,
                enabled=False,
                execution_mode="disabled",
                detail=(
                    "A server-side key is present, but external execution remains disabled."
                    if configured
                    else "No server-side key is configured; Nexus never asks the browser for it."
                ),
            )
            for provider, label, configured in providers
        ],
    ]


async def _preview(
    session: AsyncSession,
    auth: AuthContext,
    rule: AutomationRule,
    *,
    now: datetime | None = None,
) -> AutomationPreviewRead:
    current = _as_utc(now or datetime.now(UTC))
    period_key = _period_key(rule.cadence, current)
    runs_in_period = await session.scalar(
        select(func.count(AutomationRun.id)).where(
            AutomationRun.workspace_id == auth.workspace_id,
            AutomationRun.rule_id == rule.id,
            AutomationRun.period_key == period_key,
        )
    )
    existing_snapshot = await session.scalar(
        select(BriefingSnapshot.id).where(
            BriefingSnapshot.workspace_id == auth.workspace_id,
            BriefingSnapshot.briefing_type == rule.briefing_type,
            BriefingSnapshot.period_key == period_key,
        )
    )
    if not rule.enabled:
        due = False
        reason = "Enable this rule before approving an execution."
    elif (runs_in_period or 0) >= rule.max_runs_per_period:
        due = False
        reason = "This rule already reached its conservative limit for the current period."
    else:
        due = True
        reason = "The rule is enabled, within its run limit, and ready for approval."
    return AutomationPreviewRead(
        rule_id=rule.id,
        period_key=period_key,
        due=due,
        would_create_snapshot=existing_snapshot is None,
        reason=reason,
        action_summary=(
            f"Generate one {rule.briefing_type} portfolio snapshot without changing projects, "
            "features, tasks, priorities, assignments, or deadlines."
        ),
    )


async def _upsert_snapshot(
    session: AsyncSession,
    auth: AuthContext,
    briefing_type: str,
    summary: MissionControlSummary,
    *,
    refresh_existing: bool,
    now: datetime | None = None,
) -> tuple[BriefingSnapshot, bool]:
    await _lock_workspace(session, auth.workspace_id)
    current = _as_utc(now or datetime.now(UTC))
    period_key = _period_key(briefing_type, current)
    existing = await session.scalar(
        select(BriefingSnapshot).where(
            BriefingSnapshot.workspace_id == auth.workspace_id,
            BriefingSnapshot.briefing_type == briefing_type,
            BriefingSnapshot.period_key == period_key,
        )
    )
    if existing is not None and not refresh_existing:
        return existing, False

    content = _build_briefing_content(briefing_type, summary)
    fingerprint = hashlib.sha256(
        json.dumps(
            {
                "briefing_type": briefing_type,
                "content": content.model_dump(mode="json"),
                "execution": summary.execution_intelligence.model_dump(mode="json"),
                "teams": summary.team_intelligence.model_dump(mode="json"),
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    if existing is not None:
        existing.content = content.model_dump(mode="json")
        existing.source_fingerprint = fingerprint
        existing.created_by_id = auth.user_id
        existing.updated_at = current
        await session.flush()
        return existing, False

    snapshot = BriefingSnapshot(
        workspace_id=auth.workspace_id,
        created_by_id=auth.user_id,
        briefing_type=briefing_type,
        period_key=period_key,
        provider="nexus_local_operations_v1",
        source_fingerprint=fingerprint,
        content=content.model_dump(mode="json"),
    )
    session.add(snapshot)
    await session.flush()
    return snapshot, True


def _build_briefing_content(
    briefing_type: str,
    summary: MissionControlSummary,
) -> BriefingContent:
    intelligence = summary.execution_intelligence
    next_action = intelligence.next_actions[0] if intelligence.next_actions else None
    top_risk = intelligence.risk_signals[0] if intelligence.risk_signals else None
    lagging_team = next(
        (signal for signal in summary.team_intelligence.signals if signal.state == "lagging"),
        None,
    )
    action_plan = [action.title for action in intelligence.next_actions[:3]]
    if lagging_team and lagging_team.recovery_action not in action_plan:
        action_plan.append(lagging_team.recovery_action)
    if not action_plan:
        action_plan = list(summary.today_mission[:3])

    if briefing_type == "weekly":
        headline = (
            f"Weekly review: {intelligence.forecast.completion_percent}% complete with "
            f"{intelligence.forecast.schedule_confidence}% schedule confidence."
        )
        focus = (
            f"Protect the next delivery cycle by resolving {intelligence.forecast.blocked_tasks} "
            f"blocked and {intelligence.forecast.overdue_tasks} overdue tasks."
        )
    else:
        headline = intelligence.headline
        focus = next_action.reason if next_action else intelligence.forecast.summary

    return BriefingContent(
        headline=headline,
        focus=focus,
        next_task=next_action.title if next_action else summary.today_mission[0],
        bottleneck=top_risk.detail if top_risk else "No material portfolio bottleneck is detected.",
        health_narrative=intelligence.forecast.summary,
        action_plan=action_plan[:4],
        project_count=len(summary.projects),
        risk_count=len(intelligence.risk_signals),
        blocked_task_count=intelligence.forecast.blocked_tasks,
        team_headline=summary.team_intelligence.headline,
    )


async def _rule(
    session: AsyncSession,
    auth: AuthContext,
    rule_id: str,
    *,
    lock: bool = False,
) -> AutomationRule:
    statement = select(AutomationRule).where(
        AutomationRule.id == rule_id,
        AutomationRule.workspace_id == auth.workspace_id,
    )
    if lock:
        statement = statement.with_for_update()
    rule = await session.scalar(statement)
    if rule is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Automation rule not found")
    return rule


async def _lock_workspace(session: AsyncSession, workspace_id: str) -> None:
    workspace = await session.scalar(
        select(Workspace.id).where(Workspace.id == workspace_id).with_for_update()
    )
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")


def _period_key(cadence: str, now: datetime) -> str:
    if cadence == "weekly":
        year, week, _ = now.isocalendar()
        return f"{year}-W{week:02d}"
    return now.date().isoformat()


def _snapshot_read(snapshot: BriefingSnapshot) -> BriefingSnapshotRead:
    return BriefingSnapshotRead(
        id=snapshot.id,
        briefing_type=snapshot.briefing_type,
        period_key=snapshot.period_key,
        provider=snapshot.provider,
        content=BriefingContent.model_validate(snapshot.content),
        created_at=_as_utc(snapshot.created_at),
        updated_at=_as_utc(snapshot.updated_at),
    )


def _rule_read(rule: AutomationRule) -> AutomationRuleRead:
    return AutomationRuleRead(
        id=rule.id,
        name=rule.name,
        briefing_type=rule.briefing_type,
        cadence=rule.cadence,
        enabled=rule.enabled,
        max_runs_per_period=rule.max_runs_per_period,
        last_run_at=_as_utc(rule.last_run_at) if rule.last_run_at else None,
        created_at=_as_utc(rule.created_at),
        updated_at=_as_utc(rule.updated_at),
    )


def _run_read(run: AutomationRun) -> AutomationRunRead:
    return AutomationRunRead(
        id=run.id,
        rule_id=run.rule_id,
        mode=run.mode,
        status=run.status,
        period_key=run.period_key,
        output_snapshot_id=run.output_snapshot_id,
        decision=run.decision,
        created_at=_as_utc(run.created_at),
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
