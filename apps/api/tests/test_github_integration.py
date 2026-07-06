from app.services.github import parse_commit


def test_github_commit_payload_maps_to_nexus_activity() -> None:
    activity = parse_commit(
        {
            "sha": "abc123def456",
            "html_url": "https://github.com/example/nexus/commit/abc123def456",
            "commit": {
                "message": "feat: connect repository activity\n\nLong details",
                "author": {
                    "name": "Nexus Captain",
                    "date": "2026-07-06T10:00:00Z",
                },
                "verification": {"verified": True},
            },
        }
    )

    assert activity.sha == "abc123def456"
    assert activity.message == "feat: connect repository activity"
    assert activity.author == "Nexus Captain"
    assert activity.verified is True
