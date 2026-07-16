from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path

from database_common import postgres_target, require_command, require_secret, run_checked


def main() -> None:
    parser = argparse.ArgumentParser(description="Restore an encrypted Nexus PostgreSQL backup.")
    parser.add_argument("backup", type=Path)
    parser.add_argument("--confirm-database", required=True)
    args = parser.parse_args()

    if os.environ.get("NEXUS_ALLOW_RESTORE") != "true":
        raise RuntimeError("Set NEXUS_ALLOW_RESTORE=true for this restore invocation")
    target = postgres_target(os.environ.get("DATABASE_URL", ""))
    if args.confirm_database != target.database:
        raise RuntimeError("--confirm-database must exactly match the DATABASE_URL database")
    passphrase = require_secret("NEXUS_BACKUP_PASSPHRASE")
    openssl = require_command("openssl")
    pg_restore = require_command("pg_restore")
    backup = args.backup.resolve(strict=True)
    _verify_metadata(backup)

    with tempfile.TemporaryDirectory(prefix="nexus-restore-") as temporary:
        plaintext = Path(temporary) / "nexus.dump"
        restore_environment = {**target.environment, "NEXUS_BACKUP_PASSPHRASE": passphrase}
        run_checked(
            [
                openssl,
                "enc",
                "-d",
                "-aes-256-cbc",
                "-pbkdf2",
                "-iter",
                "200000",
                "-in",
                str(backup),
                "-out",
                str(plaintext),
                "-pass",
                "env:NEXUS_BACKUP_PASSPHRASE",
            ],
            restore_environment,
        )
        run_checked([pg_restore, "--list", str(plaintext)], restore_environment)
        run_checked(
            [
                pg_restore,
                "--clean",
                "--if-exists",
                "--no-owner",
                "--no-privileges",
                "--exit-on-error",
                "--dbname",
                target.database,
                str(plaintext),
            ],
            restore_environment,
        )
    print(f"Restore completed for database {target.database}")


def _verify_metadata(backup: Path) -> None:
    metadata_path = backup.with_suffix(backup.suffix + ".json")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    actual = hashlib.sha256(backup.read_bytes()).hexdigest()
    if actual != metadata.get("sha256"):
        raise RuntimeError("Backup checksum does not match its metadata")


if __name__ == "__main__":
    main()
