from app.services.database_auth import _slug


def test_workspace_slug_is_normalized_for_new_accounts() -> None:
    assert _slug("Advait's AI Lab") == "advait-s-ai-lab"
    assert _slug("  ") == "workspace"
