#!/usr/bin/env python3
"""Restart the local worker when production Python sources change."""

from __future__ import annotations

from pathlib import Path

WATCHED_SOURCES = {"server.py", "pipeline.py", "normalize.py"}


def production_source(change: object, changed_path: str) -> bool:
    del change
    return Path(changed_path).name in WATCHED_SOURCES


if __name__ == "__main__":
    from watchfiles import run_process
    from server import run_server

    run_process(
        "/app",
        target=run_server,
        watch_filter=production_source,
    )
