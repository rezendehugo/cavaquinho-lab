#!/usr/bin/env python3
"""Audiveris PDF pipeline. It has no database or application credentials."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import PurePosixPath
from xml.etree import ElementTree

import fitz

from normalize import normalize_musicxml

MAX_BYTES = 20 * 1024 * 1024
MAX_PAGES = 20
TARGET_DPI = 300
MAX_RENDERED_PIXELS = 16_000_000
BLANK_INK_RATIO = 0.00005
MAX_ARCHIVE_MEMBERS = 256
MAX_ARCHIVE_UNCOMPRESSED_BYTES = 64 * 1024 * 1024
CHORD_PATTERN = re.compile(
    r"(?<![A-Za-z])(?:[A-G](?:#|b|♯|♭)?)(?:maj7|m7(?:b5|♭5)?|m|dim7?|sus[24]?|add9|7M|7|\+|9)?(?:\([^)]{1,8}\))?"
)


def _download(source_url: str, destination: str) -> None:
    parsed = urllib.parse.urlparse(source_url)
    allowed_hosts = {host.strip() for host in os.environ.get("WORKER_ALLOWED_HOSTS", "api,127.0.0.1,localhost").split(",")}
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in allowed_hosts:
        raise ValueError("source_url_not_allowed")
    request = urllib.request.Request(source_url, headers={"User-Agent": "cavaquinho-lab-omr/1"})
    with urllib.request.urlopen(request, timeout=20) as response, open(destination, "wb") as output:
        total = 0
        while chunk := response.read(64 * 1024):
            total += len(chunk)
            if total > MAX_BYTES:
                raise ValueError("pdf_size_limit")
            output.write(chunk)


def _humanize_filename(original_name: str) -> str:
    stem = os.path.splitext(os.path.basename(original_name))[0]
    words = re.sub(r"([a-zà-ÿ])([A-Z])", r"\1 \2", stem)
    words = re.sub(r"[_-]+", " ", words).strip()
    return words[:1].upper() + words[1:] if words else "Partitura importada"


def _is_metadata_text(value: str) -> bool:
    letters = sum(character.isalpha() for character in value)
    notation = sum(character in "œ»≈‰================" for character in value)
    return 2 <= len(value) <= 160 and letters >= 4 and notation <= max(1, len(value) // 10)


def _inspect_pdf(path: str, original_name: str = "score.pdf") -> tuple[int, dict[str, object]]:
    with open(path, "rb") as handle:
        if handle.read(5) != b"%PDF-":
            raise ValueError("invalid_pdf_signature")
    document = fitz.open(path)
    try:
        if document.needs_pass:
            raise ValueError("encrypted_pdf")
        if document.page_count < 1 or document.page_count > MAX_PAGES:
            raise ValueError("pdf_page_limit")
        candidates: list[dict[str, object]] = []
        first_lines: list[str] = []
        for page_index, page in enumerate(document):
            blocks = page.get_text("blocks")
            for x0, y0, _x1, _y1, text, *_rest in blocks:
                clean = " ".join(text.split())
                if page_index == 0 and clean:
                    first_lines.append(clean)
                for match in CHORD_PATTERN.finditer(clean):
                    candidates.append({
                        "text": match.group(0).replace("♯", "#").replace("♭", "b"),
                        "page": page_index + 1,
                        "x": round(float(x0), 2),
                        "y": round(float(y0), 2),
                        "confidence": 0.72,
                    })
        metadata_lines = [line for line in first_lines if _is_metadata_text(line) and not CHORD_PATTERN.fullmatch(line)]
        title = metadata_lines[0][:160] if metadata_lines else _humanize_filename(original_name)
        composer = metadata_lines[1][:160] if len(metadata_lines) > 1 else None
        return document.page_count, {"title": title, "composer": composer, "chordCandidates": candidates}
    finally:
        document.close()


def _estimated_pixels(page: fitz.Page) -> int:
    return round((page.rect.width / 72 * TARGET_DPI) * (page.rect.height / 72 * TARGET_DPI))


def _is_blank_page(page: fitz.Page) -> bool:
    if page.get_text().strip() or page.get_images(full=True) or page.get_drawings():
        return False
    preview = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5), colorspace=fitz.csGRAY, alpha=False)
    dark_pixels = sum(value < 245 for value in preview.samples)
    return dark_pixels / max(1, preview.width * preview.height) < BLANK_INK_RATIO


def _standard_page_rect(source: fitz.Rect) -> fitz.Rect:
    landscape = source.width > source.height
    source_ratio = max(source.width, source.height) / max(1, min(source.width, source.height))
    a4 = (595.28, 841.89)
    letter = (612.0, 792.0)
    selected = min((a4, letter), key=lambda size: abs(max(size) / min(size) - source_ratio))
    width, height = selected
    if landscape:
        width, height = height, width
    return fitz.Rect(0, 0, width, height)


def _prepare_pdf(path: str, work: str) -> tuple[str, dict[str, object]]:
    """Create a private OMR-safe copy only when page geometry requires it."""
    document = fitz.open(path)
    try:
        blank_pages = [index for index, page in enumerate(document) if _is_blank_page(page)]
        usable_pages = [index for index in range(document.page_count) if index not in blank_pages]
        if not usable_pages:
            raise ValueError("no_musical_content")
        oversized_pages = [
            index for index in usable_pages
            if _estimated_pixels(document[index]) > MAX_RENDERED_PIXELS
            or document[index].rect.width > 1440
            or document[index].rect.height > 1440
        ]
        requires_copy = bool(blank_pages or oversized_pages or document.is_repaired)
        page_details = [{
            "page": index + 1,
            "widthPoints": round(document[index].rect.width, 2),
            "heightPoints": round(document[index].rect.height, 2),
            "estimatedPixels": _estimated_pixels(document[index]),
            "normalized": index in oversized_pages,
            "blank": index in blank_pages,
        } for index in range(document.page_count)]
        if not requires_copy:
            return path, {
                "geometryNormalized": False,
                "blankPagesRemoved": [],
                "repaired": False,
                "pages": page_details,
            }
        prepared_path = os.path.join(work, "prepared.pdf")
        prepared = fitz.open()
        try:
            for index in usable_pages:
                source_page = document[index]
                if index in oversized_pages:
                    target = _standard_page_rect(source_page.rect)
                    output_page = prepared.new_page(width=target.width, height=target.height)
                    output_page.show_pdf_page(output_page.rect, document, index, keep_proportion=True)
                else:
                    prepared.insert_pdf(document, from_page=index, to_page=index)
            prepared.save(prepared_path, garbage=4, deflate=True)
        finally:
            prepared.close()
        return prepared_path, {
            "geometryNormalized": bool(oversized_pages),
            "blankPagesRemoved": [index + 1 for index in blank_pages],
            "repaired": bool(document.is_repaired),
            "pages": page_details,
        }
    finally:
        document.close()


def _render_grayscale_pdf(path: str, destination: str) -> str:
    source = fitz.open(path)
    rendered = fitz.open()
    try:
        for source_page in source:
            target = _standard_page_rect(source_page.rect)
            pixmap = source_page.get_pixmap(dpi=TARGET_DPI, colorspace=fitz.csGRAY, alpha=False)
            output_page = rendered.new_page(width=target.width, height=target.height)
            output_page.insert_image(output_page.rect, pixmap=pixmap, keep_proportion=True)
        rendered.save(destination, garbage=4, deflate=True)
    finally:
        rendered.close()
        source.close()
    return destination


def _audiveris_error(output: str) -> str:
    normalized = output.lower()
    if "too large image" in normalized:
        return "image_too_large"
    if "created scores: []" in normalized:
        return "no_musical_systems"
    if "could not export" in normalized or "error in export" in normalized:
        return "audiveris_export_failed"
    if "ghostscript" in normalized or "pdf" in normalized and "error" in normalized:
        return "pdf_renderer_failed"
    return "audiveris_failed"


def _run_audiveris(source: str, output: str, page_count: int) -> None:
    command = os.environ.get("AUDIVERIS_COMMAND", "/opt/audiveris/bin/Audiveris")
    base_timeout = int(os.environ.get("AUDIVERIS_TIMEOUT_SECONDS", "120"))
    timeout = min(600, max(base_timeout, 45 * page_count))
    try:
        completed = subprocess.run(
            [command, "-batch", "-export", "-output", output, source],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise ValueError("audiveris_timeout") from error
    if completed.returncode != 0:
        raise ValueError(_audiveris_error(f"{completed.stdout}\n{completed.stderr}"))


def _find_musicxml(directory: str) -> str:
    candidates: list[str] = []
    for root, _directories, files in os.walk(directory):
        for filename in files:
            if filename.lower().endswith((".musicxml", ".xml", ".mxl")):
                candidates.append(os.path.join(root, filename))
    if not candidates:
        raise ValueError("audiveris_musicxml_missing")
    source = sorted(candidates)[0]
    if source.lower().endswith(".mxl"):
        extraction = os.path.join(directory, "mxl")
        with zipfile.ZipFile(source) as archive:
            safe_members = _safe_mxl_members(archive)
            archive.extractall(extraction, safe_members)
        xml_candidates = [
            os.path.join(root, filename)
            for root, _directories, files in os.walk(extraction)
            for filename in files
            if filename.lower().endswith((".musicxml", ".xml")) and "container.xml" not in filename
        ]
        if not xml_candidates:
            raise ValueError("invalid_mxl")
        return sorted(xml_candidates)[0]
    return source


def _safe_mxl_members(archive: zipfile.ZipFile) -> list[str]:
    members = archive.infolist()
    if len(members) > MAX_ARCHIVE_MEMBERS:
        raise ValueError("mxl_member_limit")
    if sum(member.file_size for member in members) > MAX_ARCHIVE_UNCOMPRESSED_BYTES:
        raise ValueError("mxl_size_limit")
    safe_members = []
    for member in members:
        path = PurePosixPath(member.filename)
        if member.flag_bits & 0x1:
            raise ValueError("encrypted_mxl")
        if path.is_absolute() or ".." in path.parts:
            raise ValueError("invalid_mxl_path")
        safe_members.append(member.filename)
    return safe_members


def _normalize_symbolic_input(source: str, work: str) -> str:
    if zipfile.is_zipfile(source):
        extraction = os.path.join(work, "symbolic")
        with zipfile.ZipFile(source) as archive:
            safe_members = _safe_mxl_members(archive)
            archive.extractall(extraction, safe_members)
        source = _find_musicxml(extraction)
    output = os.path.join(work, "normalized.musicxml")
    return normalize_musicxml(source, output)


def _enrich_text_report(report: dict[str, object], musicxml: str, original_name: str) -> dict[str, object]:
    root = ElementTree.fromstring(musicxml)
    title_candidates = [
        element.text.strip()
        for path in (".//work-title", ".//movement-title")
        for element in root.findall(path)
        if element.text and element.text.strip()
    ]
    creators = [
        element.text.strip()
        for element in root.findall(".//creator")
        if element.text and element.text.strip() and element.attrib.get("type") == "composer"
    ]
    credit_words = [
        element.text.strip()
        for element in root.findall(".//credit-words")
        if element.text and _is_metadata_text(element.text.strip())
    ]
    fallback_title = _humanize_filename(original_name)
    title = title_candidates[0] if title_candidates else report.get("title")
    if not title or title == fallback_title:
        title = max(credit_words, key=len, default=fallback_title)
    composer = creators[0] if creators else report.get("composer")
    if not composer:
        composer = next((value for value in credit_words if value != title), None)
    return {**report, "title": title, "composer": composer}


def _validate_musicxml(musicxml: str) -> None:
    try:
        root = ElementTree.fromstring(musicxml)
    except ElementTree.ParseError as error:
        raise ValueError("musicxml_invalid") from error
    if not root.findall(".//measure"):
        raise ValueError("musicxml_empty")
    if not root.findall(".//note") and not root.findall(".//harmony"):
        raise ValueError("musicxml_empty")


def process_local_source(source: str, original_name: str) -> dict[str, object]:
    """Process an already isolated source file without copying it into the repository."""
    with tempfile.TemporaryDirectory(prefix="cavaquinho-omr-") as work:
        extension = os.path.splitext(original_name)[1].lower()
        if extension in {".xml", ".musicxml", ".mxl"}:
            musicxml = _normalize_symbolic_input(source, work)
            return {
                "musicXml": musicxml,
                "pageCount": 0,
                "engine": "music21",
                "engineVersion": "9.9.1",
                "textReport": {"title": None, "composer": None, "chordCandidates": []},
            }
        output = os.path.join(work, "audiveris")
        os.mkdir(output)
        page_count, text_report = _inspect_pdf(source, original_name)
        prepared_source, preprocessing = _prepare_pdf(source, work)
        try:
            _run_audiveris(prepared_source, output, page_count)
        except ValueError as error:
            if str(error) != "pdf_renderer_failed":
                raise
            fallback = _render_grayscale_pdf(prepared_source, os.path.join(work, "rendered.pdf"))
            preprocessing["grayscaleFallback"] = True
            _run_audiveris(fallback, output, page_count)
        raw_musicxml = _find_musicxml(output)
        normalized_path = os.path.join(work, "normalized.musicxml")
        musicxml = normalize_musicxml(raw_musicxml, normalized_path)
        _validate_musicxml(musicxml)
        text_report = _enrich_text_report(text_report, musicxml, original_name)
        return {
            "musicXml": musicxml,
            "pageCount": page_count,
            "engine": "Audiveris",
            "engineVersion": os.environ.get("AUDIVERIS_VERSION", "5.10.2"),
            "textReport": text_report,
            "preprocessing": preprocessing,
        }


def process_source(source_url: str, original_name: str) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="cavaquinho-omr-download-") as download:
        extension = os.path.splitext(original_name)[1].lower()
        source = os.path.join(download, f"source{extension or '.bin'}")
        _download(source_url, source)
        return process_local_source(source, original_name)


if __name__ == "__main__":
    print(json.dumps(process_source(os.environ["SOURCE_URL"], os.environ.get("ORIGINAL_NAME", "score.pdf")), ensure_ascii=False))
