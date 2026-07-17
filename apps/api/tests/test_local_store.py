from app.models.enums import Priority, WorkStatus
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.feature import FeatureCreate
from app.schemas.project import ProjectCreate
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.local_store import LocalStore
from app.services.analytics import build_local_mission_control


def test_local_store_starts_without_seeded_portfolio() -> None:
    store = LocalStore()

    assert store.list_projects() == []
    assert build_local_mission_control(store).projects == []


def test_auth_registers_and_logs_in_without_paid_services() -> None:
    store = LocalStore()
    registration = RegisterRequest(
        email="captain@nexus.local",
        full_name="Nexus Captain",
        password="zero-cost-secure-password-7",
    )

    registered = store.register(registration)
    logged_in = store.login(
        LoginRequest(email=registration.email, password=registration.password)
    )

    assert registered.user_id == logged_in.user_id
    assert registered.workspace_id == "workspace-personal"
    assert logged_in.access_token
    assert store.get_account(registered.user_id).email == registration.email


def test_project_feature_task_rollups_update_progress() -> None:
    store = LocalStore()
    project = store.create_project(
        ProjectCreate(
            name="Test Mission",
            codename="TEST",
            priority=Priority.high,
        )
    )
    feature = store.create_feature(
        project.id,
        FeatureCreate(title="Flight Control", priority=Priority.high),
    )
    task = store.create_task(
        project.id,
        TaskCreate(
            title="Connect telemetry",
            feature_id=feature.id,
            priority=Priority.critical,
            estimate_minutes=90,
        ),
    )

    assert store.get_project(project.id).progress == 0
    assert store.list_features(project.id)[0].progress == 0

    store.update_task(task.id, TaskUpdate(status=WorkStatus.done, time_spent_minutes=70))

    assert store.get_project(project.id).progress == 100
    assert store.list_features(project.id)[0].progress == 100
