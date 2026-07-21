from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext
from app.models.activity_log import ActivityLog
from app.models.enums import ActivityAction


def record_activity(
    session: AsyncSession,
    auth: AuthContext,
    *,
    project_id: str,
    action: ActivityAction,
    entity_type: str,
    entity_id: str,
    message: str,
    payload: dict | None = None,
) -> None:
    session.add(
        ActivityLog(
            workspace_id=auth.workspace_id,
            project_id=project_id,
            actor_id=auth.user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            message=message,
            payload=payload,
        )
    )
