#!/usr/bin/env python3
"""Minimal private HTTP boundary for the isolated OMR process."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pipeline import process_source


class Handler(BaseHTTPRequestHandler):
    server_version = "CavaquinhoOMR/1"

    def do_GET(self) -> None:
        if self.path != "/health":
            self._send(404, {"error": "not_found"})
            return
        self._send(200, {"status": "ok"})

    def do_POST(self) -> None:
        if self.path != "/process":
            self._send(404, {"error": "not_found"})
            return
        try:
            length = int(self.headers.get("content-length", "0"))
            if length < 1 or length > 16_384:
                raise ValueError("invalid_request")
            payload = json.loads(self.rfile.read(length))
            source_url = payload.get("sourceUrl")
            original_name = payload.get("originalName")
            if not isinstance(source_url, str) or not isinstance(original_name, str):
                raise ValueError("invalid_source_url")
            self._send(200, process_source(source_url, original_name))
        except Exception as error:
            code = str(error)[:120] if str(error) else "omr_failure"
            self._send(422, {"error": code})

    def log_message(self, format_string: str, *args: object) -> None:
        return

    def _send(self, status: int, payload: dict[str, object]) -> None:
        content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def run_server() -> None:
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8090"))), Handler).serve_forever()


if __name__ == "__main__":
    run_server()
