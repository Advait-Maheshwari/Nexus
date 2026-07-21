from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
WEB_SOURCE = ROOT / "apps" / "web" / "src"


def test_durable_client_state_is_not_written_to_browser_storage() -> None:
    allowed = {
        WEB_SOURCE / "lib" / "legacyStateMigration.ts",
        WEB_SOURCE / "App.tsx",
    }
    violations: list[str] = []
    for source in WEB_SOURCE.rglob("*.ts*"):
        if source in allowed:
            continue
        text = source.read_text(encoding="utf-8")
        if "localStorage." in text:
            violations.append(str(source.relative_to(ROOT)))
    assert violations == []


def test_server_boundary_has_authenticated_configuration_routes() -> None:
    route = (
        ROOT / "apps" / "api" / "app" / "api" / "v1" / "endpoints" / "configuration.py"
    ).read_text(encoding="utf-8")
    assert '"/projects/{project_id}/blueprint"' in route
    assert '"/preferences"' in route
    assert route.count("Depends(require_auth_context)") == 4
