from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit


@dataclass(frozen=True)
class PostgresTarget:
    database: str
    environment: dict[str, str]


def postgres_target(database_url: str) -> PostgresTarget:
    normalized = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    parsed = urlsplit(normalized)
    if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname:
        raise ValueError("DATABASE_URL must be a PostgreSQL connection string")
    database = unquote(parsed.path.lstrip("/"))
    if not database:
        raise ValueError("DATABASE_URL must include a database name")
    query = parse_qs(parsed.query)
    ssl_mode = query.get("sslmode", query.get("ssl", ["require"]))[0]
    environment = {
        **os.environ,
        "PGHOST": parsed.hostname,
        "PGPORT": str(parsed.port or 5432),
        "PGDATABASE": database,
        "PGUSER": unquote(parsed.username or ""),
        "PGPASSWORD": unquote(parsed.password or ""),
        "PGSSLMODE": ssl_mode,
    }
    return PostgresTarget(database=database, environment=environment)


def require_command(name: str) -> str:
    resolved = shutil.which(name)
    if not resolved:
        raise RuntimeError(f"{name} is required and was not found on PATH")
    return resolved


def run_checked(command: list[str], environment: dict[str, str]) -> None:
    subprocess.run(command, env=environment, check=True)


def require_secret(name: str) -> str:
    value = os.environ.get(name, "")
    if len(value) < 16:
        raise RuntimeError(f"{name} must contain at least 16 characters")
    return value


def ensure_private_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    try:
        path.chmod(0o700)
    except OSError:
        pass
    return path
