from __future__ import annotations

import hashlib
import json
import os
import sys
import unittest
from pathlib import Path
from xml.etree import ElementTree

sys.path.insert(0, os.path.dirname(__file__))
from pipeline import _inspect_pdf, process_local_source


FIXTURES = Path(os.environ.get(
    "CORPUS_FIXTURES_DIR",
    Path(__file__).parent / "../../apps/api/src/score-imports/fixtures",
))


def _load_reference(name: str) -> dict[str, object]:
    with open(FIXTURES / name, encoding="utf-8") as handle:
        return json.load(handle)


def _local_name(element: ElementTree.Element) -> str:
    return element.tag.rsplit("}", 1)[-1]


def _children(element: ElementTree.Element, name: str) -> list[ElementTree.Element]:
    return [child for child in list(element) if _local_name(child) == name]


def _descendants(root: ElementTree.Element, name: str) -> list[ElementTree.Element]:
    return [element for element in root.iter() if _local_name(element) == name]


def _text(element: ElementTree.Element | None, child_name: str) -> str:
    if element is None:
        return ""
    child = next(iter(_children(element, child_name)), None)
    return child.text.strip() if child is not None and child.text else ""


def _chord_symbol(harmony: ElementTree.Element) -> str:
    root = next(iter(_children(harmony, "root")), None)
    step = _text(root, "root-step") or "C"
    alter = _text(root, "root-alter")
    accidental = "#" if alter == "1" else "b" if alter == "-1" else ""
    kind_element = next(iter(_children(harmony, "kind")), None)
    kind = kind_element.attrib.get("text", "") if kind_element is not None else ""
    if not kind and kind_element is not None and kind_element.text:
        kind = kind_element.text.strip()
    suffixes = {
        "major": "",
        "minor": "m",
        "dominant": "7",
        "major-seventh": "maj7",
        "minor-seventh": "m7",
        "major-sixth": "6",
        "minor-sixth": "m6",
        "half-diminished": "m7(b5)",
        "diminished": "dim",
        "diminished-seventh": "dim7",
    }
    suffix = suffixes.get(kind, kind)
    bass = next(iter(_children(harmony, "bass")), None)
    bass_step = _text(bass, "bass-step")
    bass_alter = _text(bass, "bass-alter")
    bass_accidental = "#" if bass_alter == "1" else "b" if bass_alter == "-1" else ""
    slash = f"/{bass_step}{bass_accidental}" if bass_step else ""
    return f"{step}{accidental}{suffix}{slash}"


def _write_diagnostics(result: dict[str, object]) -> None:
    artifact_directory = os.environ.get("NIVALDO_CORPUS_ARTIFACT_DIR")
    if not artifact_directory:
        return
    output = Path(artifact_directory)
    output.mkdir(parents=True, exist_ok=True)
    (output / "nivaldo.normalized.musicxml").write_text(str(result["musicXml"]), encoding="utf-8")
    (output / "nivaldo.report.json").write_text(
        json.dumps(result["textReport"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


class SabadoAtardeCorpusTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("SABADO_A_TARDE_PDF"), "Private corpus PDF not configured")
    def test_private_vector_pdf_metadata(self) -> None:
        pdf_path = os.environ["SABADO_A_TARDE_PDF"]
        page_count, report = _inspect_pdf(pdf_path)
        reference = _load_reference("sabadoAtarde.reference.json")
        self.assertEqual(page_count, reference["pageCount"])
        extracted = {candidate["text"] for candidate in report["chordCandidates"]}
        self.assertGreaterEqual(len(extracted.intersection(reference["requiredChordSymbols"])), 4)


class NivaldoNoChoroCorpusTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("NIVALDO_NO_CHORO_PDF"), "Private Nivaldo corpus PDF not configured")
    def test_real_pdf_produces_reviewable_musicxml(self) -> None:
        pdf_path = Path(os.environ["NIVALDO_NO_CHORO_PDF"])
        reference = _load_reference("nivaldoNoChoro.reference.json")
        self.assertTrue(pdf_path.is_file(), f"Private corpus file not found: {pdf_path}")
        if os.environ.get("NIVALDO_VERIFY_SHA256") == "1":
            checksum = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
            self.assertEqual(checksum, reference["sha256"], "Unexpected Nivaldo PDF edition")

        result = process_local_source(str(pdf_path), pdf_path.name)
        _write_diagnostics(result)
        root = ElementTree.fromstring(str(result["musicXml"]))
        measures = _descendants(root, "measure")
        notes = _descendants(root, "note")
        harmonies = _descendants(root, "harmony")
        symbols = {_chord_symbol(harmony) for harmony in harmonies}
        words = {
            (element.text or "").strip()
            for element in [*_descendants(root, "rehearsal"), *_descendants(root, "words")]
        }
        pitched = [note for note in notes if _children(note, "pitch")]
        rests = [note for note in notes if _children(note, "rest")]
        ties = _descendants(root, "tie")
        empty_measures = [
            measure for measure in measures
            if not _descendants(measure, "note") and not _descendants(measure, "harmony")
        ]

        self.assertEqual(result["pageCount"], reference["pageCount"])
        self.assertEqual(result["engine"], "Audiveris")
        self.assertIn(reference["title"].lower(), str(result["textReport"]["title"]).lower())
        self.assertIn("severino", str(result["textReport"]["composer"]).lower())
        self.assertGreaterEqual(len(measures), reference["measureCount"]["minimum"])
        self.assertLessEqual(len(measures), reference["measureCount"]["maximum"])
        self.assertGreaterEqual(len(pitched), reference["minimumCounts"]["pitchedEvents"])
        self.assertGreaterEqual(len(rests), reference["minimumCounts"]["rests"])
        self.assertGreaterEqual(len(ties), reference["minimumCounts"]["ties"])
        self.assertGreaterEqual(len(harmonies), reference["minimumCounts"]["chords"])
        self.assertFalse(empty_measures, "Audiveris produced structurally empty measures")
        self.assertTrue(set(reference["requiredSections"]).issubset(words))

        required = set(reference["requiredChordSymbols"])
        matched = required.intersection(symbols)
        self.assertGreaterEqual(
            len(matched),
            max(8, len(required) - 2),
            f"Missing chord checkpoints. Expected {sorted(required)}, found {sorted(symbols)}",
        )


class ChoroNegroCorpusTests(unittest.TestCase):
    @unittest.skipUnless(os.environ.get("CHORO_NEGRO_PDF"), "Private Choro Negro corpus PDF not configured")
    def test_oversized_pdf_is_normalized_and_recognized(self) -> None:
        pdf_path = Path(os.environ["CHORO_NEGRO_PDF"])
        reference = _load_reference("choroNegro.reference.json")
        self.assertTrue(pdf_path.is_file(), f"Private corpus file not found: {pdf_path}")
        if os.environ.get("CHORO_NEGRO_VERIFY_SHA256") == "1":
            checksum = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
            self.assertEqual(checksum, reference["sha256"], "Unexpected Choro Negro PDF edition")

        result = process_local_source(str(pdf_path), pdf_path.name)
        root = ElementTree.fromstring(str(result["musicXml"]))
        measures = _descendants(root, "measure")
        pitched = [note for note in _descendants(root, "note") if _children(note, "pitch")]
        system_breaks = [
            element for element in _descendants(root, "print")
            if element.attrib.get("new-system") == "yes" or element.attrib.get("new-page") == "yes"
        ]
        preprocessing = result["preprocessing"]

        self.assertEqual(result["pageCount"], reference["pageCount"])
        self.assertTrue(preprocessing["geometryNormalized"])
        self.assertEqual(
            preprocessing["pages"][0]["estimatedPixels"],
            reference["preprocessing"]["originalEstimatedPixels"],
        )
        self.assertGreaterEqual(len(measures), reference["measureCount"]["minimum"])
        self.assertLessEqual(len(measures), reference["measureCount"]["maximum"])
        self.assertGreaterEqual(len(pitched), reference["minimumCounts"]["pitchedEvents"])
        self.assertGreaterEqual(len(system_breaks) + 1, reference["minimumCounts"]["systems"])


if __name__ == "__main__":
    unittest.main()
