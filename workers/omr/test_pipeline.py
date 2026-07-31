from __future__ import annotations

import os
import sys
import tempfile
import unittest
import zipfile

import fitz

sys.path.insert(0, os.path.dirname(__file__))
from pipeline import _audiveris_error, _inspect_pdf, _prepare_pdf, _safe_mxl_members
from normalize import sanitize_musicxml


class PdfInspectionTests(unittest.TestCase):
    def test_extracts_vector_chord_candidates(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "score.pdf")
            document = fitz.open()
            page = document.new_page()
            page.insert_text((72, 72), "Sabado a tarde")
            page.insert_text((72, 110), "A7(13) | Dm7 | Gm7")
            document.save(path)
            document.close()

            page_count, report = _inspect_pdf(path, "sabadoAtarde.pdf")
            self.assertEqual(page_count, 1)
            self.assertIn("A7(13)", [item["text"] for item in report["chordCandidates"]])
            self.assertIn("Dm7", [item["text"] for item in report["chordCandidates"]])

    def test_uses_filename_when_pdf_text_is_only_music_notation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "score.pdf")
            document = fitz.open()
            page = document.new_page()
            page.insert_text((72, 72), "=======================")
            document.save(path)
            document.close()

            _page_count, report = _inspect_pdf(path, "sabadoAtarde.pdf")
            self.assertEqual(report["title"], "Sabado Atarde")
            self.assertIsNone(report["composer"])

    def test_rejects_non_pdf_input(self) -> None:
        with tempfile.NamedTemporaryFile() as source:
            source.write(b"not a PDF")
            source.flush()
            with self.assertRaisesRegex(ValueError, "invalid_pdf_signature"):
                _inspect_pdf(source.name)

    def test_normalizes_oversized_page_geometry(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source_path = os.path.join(directory, "oversized.pdf")
            document = fitz.open()
            page = document.new_page(width=3060, height=3960)
            page.insert_text((300, 300), "Choro Negro")
            document.save(source_path)
            document.close()

            prepared_path, report = _prepare_pdf(source_path, directory)
            prepared = fitz.open(prepared_path)
            try:
                self.assertTrue(report["geometryNormalized"])
                self.assertLess(prepared[0].rect.width, 1000)
                self.assertLess(prepared[0].rect.height, 1000)
            finally:
                prepared.close()

    def test_removes_blank_pages_but_preserves_content_pages(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source_path = os.path.join(directory, "blank.pdf")
            document = fitz.open()
            document.new_page()
            content = document.new_page()
            content.insert_text((72, 72), "C7")
            document.save(source_path)
            document.close()

            prepared_path, report = _prepare_pdf(source_path, directory)
            prepared = fitz.open(prepared_path)
            try:
                self.assertEqual(report["blankPagesRemoved"], [1])
                self.assertEqual(prepared.page_count, 1)
            finally:
                prepared.close()

    def test_classifies_common_audiveris_failures(self) -> None:
        self.assertEqual(_audiveris_error("Too large image"), "image_too_large")
        self.assertEqual(_audiveris_error("Created scores: []"), "no_musical_systems")
        self.assertEqual(_audiveris_error("Could not export"), "audiveris_export_failed")

    def test_rejects_unsafe_mxl_members(self) -> None:
        with tempfile.NamedTemporaryFile(suffix=".mxl") as source:
            with zipfile.ZipFile(source.name, "w") as archive:
                archive.writestr("../score.musicxml", "<score-partwise/>")
            with zipfile.ZipFile(source.name) as archive:
                with self.assertRaisesRegex(ValueError, "invalid_mxl_path"):
                    _safe_mxl_members(archive)

    def test_removes_local_source_path_from_musicxml(self) -> None:
        source = """<score-partwise><identification><miscellaneous>
        <miscellaneous-field name="source-file">/tmp/private/source.pdf</miscellaneous-field>
        </miscellaneous></identification></score-partwise>"""
        normalized = sanitize_musicxml(source)
        self.assertNotIn("/tmp/private", normalized)
        self.assertIn("private-source", normalized)


if __name__ == "__main__":
    unittest.main()
