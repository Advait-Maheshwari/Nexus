from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from database_common import (
    ensure_private_directory,
    postgres_target,
    require_command,
    require_secret,
    run_checked,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an encrypted Nexus PostgreSQL backup.")
    parser.add_argument("--output-dir", type=Path, default=Path("backups"))
    args = parser.parse_args()

    target = postgres_target(os.environ.get("DATABASE_URL", ""))
    passphrase = require_secret("NEXUS_BACKUP_PASSPHRASE")
    pg_dump = require_command("pg_dump")
    openssl = require_command("openssl")
    output_dir = ensure_private_directory(args.output_dir.resolve())
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    encrypted_path = output_dir / f"nexus-{target.database}-{timestamp}.dump.enc"

    with tempfile.TemporaryDirectory(prefix="nexus-backup-") as temporary:
        plaintext = Path(temporary) / "nexus.dump"
        run_checked(
            [pg_dump, "--format=custom", "--no-owner", "--no-privileges", "--file", str(plaintext)],
            target.environment,
        )
        encryption_environment = {**target.environment, "NEXUS_BACKUP_PASSPHRASE": passphrase}
        run_checked(
            [
                openssl,
                "enc",
                "-aes-256-cbc",
                "-salt",
                "-pbkdf2",
                "-iter",
                "200000",
                "-in",
                str(plaintext),
                "-out",
                str(encrypted_path),
                "-pass",
                "env:NEXUS_BACKUP_PASSPHRASE",
            ],
            encryption_environment,
        )

    digest = hashlib.sha256(encrypted_path.read_bytes()).hexdigest()
    metadata = {
        "created_at": datetime.now(UTC).isoformat(),
        "database": target.database,
        "backup": encrypted_path.name,
        "sha256": digest,
        "encryption": "AES-256-CBC PBKDF2 200000 iterations",
    }
    metadata_path = encrypted_path.with_suffix(encrypted_path.suffix + ".json")
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"Encrypted backup: {encrypted_path}")
    print(f"Metadata: {metadata_path}")


if __name__ == "__main__":
    main()
