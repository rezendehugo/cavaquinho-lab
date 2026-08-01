#!/usr/bin/env python3
"""Normalize trusted MusicXML output into a safe, canonical MusicXML document."""

from __future__ import annotations

import defusedxml
from defusedxml import ElementTree
from xml.etree import ElementTree as StandardElementTree

defusedxml.defuse_stdlib()

from music21 import converter  # noqa: E402


def sanitize_musicxml(xml_text: str) -> str:
    """Remove local worker paths while retaining useful pipeline provenance."""
    root = ElementTree.fromstring(xml_text)
    for field in root.findall(".//miscellaneous-field"):
        if field.attrib.get("name") == "source-file":
            field.text = "private-source"
    return StandardElementTree.tostring(root, encoding="unicode")


def normalize_musicxml(source_path: str, output_path: str) -> str:
    score = converter.parse(source_path, format="musicxml", forceSource=True)
    if len(score.parts) != 1:
        raise ValueError("unsupported_polyphonic_score")
    if len(list(score.parts[0].getElementsByClass("Measure"))) > 2000:
        raise ValueError("score_measure_limit")
    written_path = score.write("musicxml", fp=output_path)
    with open(written_path, "r", encoding="utf-8") as handle:
        return sanitize_musicxml(handle.read())
