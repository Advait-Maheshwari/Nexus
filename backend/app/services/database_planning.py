from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthContext
from app.models.idea import Idea
from app.models.enums import ActivityAction
from app.models.journal import JournalEntry
from app.models.milestone import Milestone
from app.models.project import Project
from app.schemas.planning import (
    IdeaCreate,
    IdeaRead,
    JournalCreate,
    JournalRead,
    MilestoneCreate,
    MilestoneRead,
    MilestoneUpdate,
)
from app.services.audit import record_activity


class DatabasePlanning:
    async def list_ideas(
        self, session: AsyncSession, auth: AuthContext, project_id: str | None
    ) -> list[IdeaRead]:
        query = select(Idea).where(Idea.workspace_id == auth.workspace_id)
        if project_id:
            await self._project(session, auth, project_id)
            query = query.where(Idea.project_id == project_id)
        ideas = (await session.scalars(query.order_by(Idea.score.desc(), Idea.created_at.desc()))).all()
        return [self._idea_read(idea) for idea in ideas]

    async def create_idea(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
        data: IdeaCreate,
    ) -> IdeaRead:
        await self._project(session, auth, project_id)
        idea = Idea(workspace_id=auth.workspace_id, project_id=project_id, **data.model_dump())
        session.add(idea)
        await session.flush()
        record_activity(
            session,
            auth,
            project_id=project_id,
            action=ActivityAction.created,
            entity_type="idea",
            entity_id=idea.id,
            message=f"Captured idea {idea.title}",
        )
        await session.commit()
        await session.refresh(idea)
        return self._idea_read(idea)

    async def delete_idea(
        self, session: AsyncSession, auth: AuthContext, idea_id: str
    ) -> None:
        idea = await session.scalar(
            select(Idea).where(Idea.id == idea_id, Idea.workspace_id == auth.workspace_id)
        )
        if idea is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Idea not found")
        record_activity(
            session,
            auth,
            project_id=idea.project_id,
            action=ActivityAction.archived,
            entity_type="idea",
            entity_id=idea.id,
            message=f"Deleted idea {idea.title}",
        )
        await session.delete(idea)
        await session.commit()

    async def list_journal(
        self, session: AsyncSession, auth: AuthContext, project_id: str | None
    ) -> list[JournalRead]:
        query = select(JournalEntry).where(JournalEntry.workspace_id == auth.workspace_id)
        if project_id:
            await self._project(session, auth, project_id)
            query = query.where(JournalEntry.project_id == project_id)
        entries = (await session.scalars(query.order_by(JournalEntry.created_at.desc()))).all()
        return [self._journal_read(entry) for entry in entries]

    async def create_journal(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
        data: JournalCreate,
    ) -> JournalRead:
        await self._project(session, auth, project_id)
        entry = JournalEntry(
            workspace_id=auth.workspace_id,
            project_id=project_id,
            summary=_summary(data.body),
            **data.model_dump(),
        )
        session.add(entry)
        await session.flush()
        record_activity(
            session,
            auth,
            project_id=project_id,
            action=ActivityAction.created,
            entity_type="journal",
            entity_id=entry.id,
            message=f"Added journal entry {entry.title}",
        )
        await session.commit()
        await session.refresh(entry)
        return self._journal_read(entry)

    async def delete_journal(
        self, session: AsyncSession, auth: AuthContext, entry_id: str
    ) -> None:
        entry = await session.scalar(
            select(JournalEntry).where(
                JournalEntry.id == entry_id,
                JournalEntry.workspace_id == auth.workspace_id,
            )
        )
        if entry is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Journal entry not found")
        record_activity(
            session,
            auth,
            project_id=entry.project_id,
            action=ActivityAction.archived,
            entity_type="journal",
            entity_id=entry.id,
            message=f"Deleted journal entry {entry.title}",
        )
        await session.delete(entry)
        await session.commit()

    async def list_milestones(
        self, session: AsyncSession, auth: AuthContext, project_id: str | None
    ) -> list[MilestoneRead]:
        query = select(Milestone).where(Milestone.workspace_id == auth.workspace_id)
        if project_id:
            await self._project(session, auth, project_id)
            query = query.where(Milestone.project_id == project_id)
        milestones = (
            await session.scalars(
                query.order_by(Milestone.due_date.asc().nulls_last(), Milestone.created_at.desc())
            )
        ).all()
        return [self._milestone_read(milestone) for milestone in milestones]

    async def create_milestone(
        self,
        session: AsyncSession,
        auth: AuthContext,
        project_id: str,
        data: MilestoneCreate,
    ) -> MilestoneRead:
        await self._project(session, auth, project_id)
        milestone = Milestone(
            workspace_id=auth.workspace_id,
            project_id=project_id,
            **data.model_dump(),
        )
        session.add(milestone)
        await session.flush()
        record_activity(
            session,
            auth,
            project_id=project_id,
            action=ActivityAction.created,
            entity_type="milestone",
            entity_id=milestone.id,
            message=f"Created milestone {milestone.title}",
        )
        await session.commit()
        await session.refresh(milestone)
        return self._milestone_read(milestone)

    async def update_milestone(
        self,
        session: AsyncSession,
        auth: AuthContext,
        milestone_id: str,
        data: MilestoneUpdate,
    ) -> MilestoneRead:
        milestone = await session.scalar(
            select(Milestone).where(
                Milestone.id == milestone_id,
                Milestone.workspace_id == auth.workspace_id,
            )
        )
        if milestone is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Milestone not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(milestone, field, value)
        if data.status is not None:
            milestone.completed_at = (
                datetime.now(UTC) if data.status.value == "done" else None
            )
        record_activity(
            session,
            auth,
            project_id=milestone.project_id,
            action=(
                ActivityAction.completed
                if data.status is not None and data.status.value == "done"
                else ActivityAction.updated
            ),
            entity_type="milestone",
            entity_id=milestone.id,
            message=f"Updated milestone {milestone.title}",
        )
        await session.commit()
        await session.refresh(milestone)
        return self._milestone_read(milestone)

    async def delete_milestone(
        self, session: AsyncSession, auth: AuthContext, milestone_id: str
    ) -> None:
        milestone = await session.scalar(
            select(Milestone).where(
                Milestone.id == milestone_id,
                Milestone.workspace_id == auth.workspace_id,
            )
        )
        if milestone is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Milestone not found")
        record_activity(
            session,
            auth,
            project_id=milestone.project_id,
            action=ActivityAction.archived,
            entity_type="milestone",
            entity_id=milestone.id,
            message=f"Deleted milestone {milestone.title}",
        )
        await session.delete(milestone)
        await session.commit()

    async def _project(
        self, session: AsyncSession, auth: AuthContext, project_id: str
    ) -> Project:
        project = await session.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.workspace_id == auth.workspace_id,
                Project.archived_at.is_(None),
            )
        )
        if project is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        return project

    @staticmethod
    def _idea_read(idea: Idea) -> IdeaRead:
        return IdeaRead(
            id=idea.id,
            workspace_id=idea.workspace_id,
            project_id=idea.project_id,
            title=idea.title,
            body=idea.body,
            score=idea.score,
            source=idea.source,
            created_at=idea.created_at,
        )

    @staticmethod
    def _journal_read(entry: JournalEntry) -> JournalRead:
        return JournalRead(
            id=entry.id,
            workspace_id=entry.workspace_id,
            project_id=entry.project_id,
            title=entry.title,
            body=entry.body,
            mood=entry.mood,
            summary=entry.summary,
            created_at=entry.created_at,
        )

    @staticmethod
    def _milestone_read(milestone: Milestone) -> MilestoneRead:
        return MilestoneRead(
            id=milestone.id,
            workspace_id=milestone.workspace_id,
            project_id=milestone.project_id,
            title=milestone.title,
            description=milestone.description,
            status=milestone.status,
            due_date=milestone.due_date,
            completed_at=milestone.completed_at,
            created_at=milestone.created_at,
        )


def _summary(body: str) -> str:
    normalized = " ".join(body.split())
    return normalized[:240] + ("..." if len(normalized) > 240 else "")


database_planning = DatabasePlanning()
