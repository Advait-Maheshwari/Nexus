from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status

from app.core.security import create_access_token, hash_password, verify_password
from app.domain.progress import TaskSignal, calculate_completion, calculate_health_score
from app.models.enums import Priority, WorkStatus
from app.schemas.auth import AccountResponse, LoginRequest, RegisterRequest, TokenResponse
from app.schemas.feature import FeatureCreate, FeatureRead, FeatureUpdate
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate


WORKSPACE_ID = "workspace-personal"


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10]}"


@dataclass
class LocalUser:
    id: str
    email: str
    full_name: str
    password_hash: str


@dataclass
class LocalProject:
    id: str
    workspace_id: str
    name: str
    codename: str
    description: str | None
    status: WorkStatus
    priority: Priority
    health_score: float
    deadline: datetime | None


@dataclass
class LocalFeature:
    id: str
    workspace_id: str
    project_id: str
    title: str
    description: str | None
    status: WorkStatus
    priority: Priority
    progress: float
    deadline: datetime | None


@dataclass
class LocalTask:
    id: str
    workspace_id: str
    project_id: str
    feature_id: str | None
    parent_task_id: str | None
    title: str
    description: str | None
    status: WorkStatus
    priority: Priority
    estimate_minutes: int
    time_spent_minutes: int
    due_date: datetime | None
    blocked_reason: str | None = None


@dataclass
class LocalStore:
    users: dict[str, LocalUser] = field(default_factory=dict)
    projects: dict[str, LocalProject] = field(default_factory=dict)
    features: dict[str, LocalFeature] = field(default_factory=dict)
    tasks: dict[str, LocalTask] = field(default_factory=dict)

    def register(self, request: RegisterRequest) -> TokenResponse:
        existing = next((user for user in self.users.values() if user.email == request.email), None)
        if existing:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email is already registered")

        user = LocalUser(
            id=new_id("user"),
            email=request.email,
            full_name=request.full_name,
            password_hash=hash_password(request.password),
        )
        self.users[user.id] = user
        return self._token_for_user(user)

    def login(self, request: LoginRequest) -> TokenResponse:
        user = next((item for item in self.users.values() if item.email == request.email), None)
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
        return self._token_for_user(user)

    def get_account(self, user_id: str) -> AccountResponse:
        user = self.users.get(user_id)
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account is unavailable")
        return AccountResponse(
            user_id=user.id,
            workspace_id=WORKSPACE_ID,
            full_name=user.full_name,
            email=user.email,
            role="owner",
            workspace_name="Personal Workspace",
            password_enabled=True,
            email_verified=True,
        )

    def create_project(self, request: ProjectCreate) -> ProjectRead:
        project = LocalProject(
            id=new_id("project"),
            workspace_id=WORKSPACE_ID,
            name=request.name,
            codename=request.codename,
            description=request.description,
            status=WorkStatus.backlog,
            priority=request.priority,
            health_score=100,
            deadline=request.deadline,
        )
        self.projects[project.id] = project
        return self._project_read(project)

    def list_projects(self) -> list[ProjectRead]:
        return [self._project_read(project) for project in self.projects.values()]

    def get_project(self, project_id: str) -> ProjectRead:
        return self._project_read(self._require_project(project_id))

    def update_project(self, project_id: str, request: ProjectUpdate) -> ProjectRead:
        project = self._require_project(project_id)
        updates = request.model_dump(exclude_unset=True)
        for key, value in updates.items():
            setattr(project, key, value)
        project.health_score = self._project_health(project.id)
        return self._project_read(project)

    def delete_project(self, project_id: str) -> None:
        self._require_project(project_id)
        self.projects.pop(project_id)
        for feature_id in [
            feature.id for feature in self.features.values() if feature.project_id == project_id
        ]:
            self.features.pop(feature_id)
        for task_id in [task.id for task in self.tasks.values() if task.project_id == project_id]:
            self.tasks.pop(task_id)

    def create_feature(self, project_id: str, request: FeatureCreate) -> FeatureRead:
        self._require_project(project_id)
        feature = LocalFeature(
            id=new_id("feature"),
            workspace_id=WORKSPACE_ID,
            project_id=project_id,
            title=request.title,
            description=request.description,
            status=WorkStatus.backlog,
            priority=request.priority,
            progress=0,
            deadline=request.deadline,
        )
        self.features[feature.id] = feature
        return self._feature_read(feature)

    def list_features(self, project_id: str) -> list[FeatureRead]:
        self._require_project(project_id)
        return [
            self._feature_read(feature)
            for feature in self.features.values()
            if feature.project_id == project_id
        ]

    def update_feature(self, feature_id: str, request: FeatureUpdate) -> FeatureRead:
        feature = self._require_feature(feature_id)
        updates = request.model_dump(exclude_unset=True)
        for key, value in updates.items():
            setattr(feature, key, value)
        feature.progress = self._feature_progress(feature.id)
        return self._feature_read(feature)

    def delete_feature(self, feature_id: str) -> None:
        self._require_feature(feature_id)
        self.features.pop(feature_id)
        for task_id in [task.id for task in self.tasks.values() if task.feature_id == feature_id]:
            self.tasks.pop(task_id)

    def create_task(self, project_id: str, request: TaskCreate) -> TaskRead:
        self._require_project(project_id)
        if request.feature_id:
            self._require_feature(request.feature_id)
        if request.parent_task_id:
            self._require_task(request.parent_task_id)

        task = LocalTask(
            id=new_id("task"),
            workspace_id=WORKSPACE_ID,
            project_id=project_id,
            feature_id=request.feature_id,
            parent_task_id=request.parent_task_id,
            title=request.title,
            description=request.description,
            status=WorkStatus.backlog,
            priority=request.priority,
            estimate_minutes=request.estimate_minutes,
            time_spent_minutes=0,
            due_date=request.due_date,
        )
        self.tasks[task.id] = task
        self._refresh_rollups(project_id)
        return self._task_read(task)

    def list_tasks(self, project_id: str) -> list[TaskRead]:
        self._require_project(project_id)
        return [
            self._task_read(task) for task in self.tasks.values() if task.project_id == project_id
        ]

    def update_task(self, task_id: str, request: TaskUpdate) -> TaskRead:
        task = self._require_task(task_id)
        updates = request.model_dump(exclude_unset=True)
        for key, value in updates.items():
            setattr(task, key, value)
        self._refresh_rollups(task.project_id)
        return self._task_read(task)

    def delete_task(self, task_id: str) -> None:
        task = self._require_task(task_id)
        self.tasks.pop(task_id)
        self._refresh_rollups(task.project_id)

    def _token_for_user(self, user: LocalUser) -> TokenResponse:
        access_token = create_access_token(
            user.id, {"workspace_id": WORKSPACE_ID, "email": user.email}
        )
        return TokenResponse(access_token=access_token, user_id=user.id, workspace_id=WORKSPACE_ID)

    def _project_read(self, project: LocalProject) -> ProjectRead:
        return ProjectRead(
            id=project.id,
            workspace_id=project.workspace_id,
            name=project.name,
            codename=project.codename,
            description=project.description,
            status=project.status,
            priority=project.priority,
            health_score=project.health_score,
            progress=self._project_progress(project.id),
            deadline=project.deadline,
        )

    def _feature_read(self, feature: LocalFeature) -> FeatureRead:
        feature_tasks = [task for task in self.tasks.values() if task.feature_id == feature.id]
        return FeatureRead(
            id=feature.id,
            workspace_id=feature.workspace_id,
            project_id=feature.project_id,
            title=feature.title,
            description=feature.description,
            status=feature.status,
            priority=feature.priority,
            progress=self._feature_progress(feature.id),
            deadline=feature.deadline,
            task_count=len(feature_tasks),
            blocked_task_count=sum(1 for task in feature_tasks if task.status == WorkStatus.blocked),
        )

    def _task_read(self, task: LocalTask) -> TaskRead:
        return TaskRead(
            id=task.id,
            workspace_id=task.workspace_id,
            project_id=task.project_id,
            feature_id=task.feature_id,
            parent_task_id=task.parent_task_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            estimate_minutes=task.estimate_minutes,
            time_spent_minutes=task.time_spent_minutes,
            due_date=task.due_date,
            blocked_reason=task.blocked_reason,
        )

    def _refresh_rollups(self, project_id: str) -> None:
        for feature in self.features.values():
            if feature.project_id == project_id:
                feature.progress = self._feature_progress(feature.id)
        self.projects[project_id].health_score = self._project_health(project_id)

    def _feature_progress(self, feature_id: str) -> float:
        tasks = [task for task in self.tasks.values() if task.feature_id == feature_id]
        if not tasks:
            return self.features[feature_id].progress
        done = sum(1 for task in tasks if task.status == WorkStatus.done)
        return round((done / len(tasks)) * 100, 2)

    def _project_progress(self, project_id: str) -> float:
        signals = [
            TaskSignal(status=task.status, due_date=task.due_date)
            for task in self.tasks.values()
            if task.project_id == project_id
        ]
        return calculate_completion(signals)

    def _project_health(self, project_id: str) -> float:
        signals = [
            TaskSignal(
                status=task.status,
                due_date=task.due_date,
                time_spent_minutes=task.time_spent_minutes,
                estimate_minutes=task.estimate_minutes,
            )
            for task in self.tasks.values()
            if task.project_id == project_id
        ]
        return calculate_health_score(signals)

    def _require_project(self, project_id: str) -> LocalProject:
        project = self.projects.get(project_id)
        if not project:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
        return project

    def _require_feature(self, feature_id: str) -> LocalFeature:
        feature = self.features.get(feature_id)
        if not feature:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Feature not found")
        return feature

    def _require_task(self, task_id: str) -> LocalTask:
        task = self.tasks.get(task_id)
        if not task:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
        return task


local_store = LocalStore()
