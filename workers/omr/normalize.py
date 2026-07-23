# SPDX-License-Identifier: AGPL-3.0-only
"""AGPL worker boundary: normalize Audiveris MusicXML without calling the application database."""
from pathlib import Path
import json
import sys
from music21 import converter

def normalize(source: Path, destination: Path) -> None:
    score = converter.parse(source)
    if len(score.parts) != 1:
        raise ValueError("only_monophonic_lead_sheets_are_supported")
    payload = {
        "title": score.metadata.title if score.metadata else None,
        "parts": len(score.parts),
        "measures": len(score.parts[0].getElementsByClass("Measure")),
        "musicXmlPath": str(source),
    }
    destination.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

if __name__ == "__main__":
    normalize(Path(sys.argv[1]), Path(sys.argv[2]))
