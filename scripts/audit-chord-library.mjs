import fs from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import { chordQualities, getChordPitchClasses } from '../src/domain/chordTheory.js';
import { applyKnownChordCorrections, historicalVoicingCount } from '../src/domain/chordCorrections.js';
import { suffixCycle } from '../src/sequences.js';

const databasePath = new URL('../node_modules/@tombatossals/chords-db/lib/cavaquinho.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const pitchNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const openStringMidi = [50, 55, 59, 62];

function uniquePitchClasses(midi) {
  return [...new Set(midi.map(note => ((note % 12) + 12) % 12))].sort((left, right) => left - right);
}

function positionIdentity(position) {
  return [position.baseFret || 1, ...position.frets, ...position.midi].join(':');
}

function classifyPosition(key, suffix, position) {
  const expected = getChordPitchClasses(key, suffix);
  const played = uniquePitchClasses(position.midi);
  const missing = expected.filter(note => !played.includes(note));
  const extra = played.filter(note => !expected.includes(note));
  return {
    kind: extra.length ? 'extra' : missing.length ? 'omission' : 'exact',
    missing: missing.map(note => pitchNames[note]),
    extra: extra.map(note => pitchNames[note]),
    rootMissing: missing.includes(pitchNames.indexOf(key))
  };
}

function inspectStructure(key, suffix, position, shapeIndex) {
  const location = `${key}:${suffix} forma ${shapeIndex + 1}`;
  const issues = [];
  for (const field of ['frets', 'fingers', 'midi']) {
    if (!Array.isArray(position[field]) || position[field].length !== 4) issues.push(`${location}: ${field} deve ter quatro valores`);
  }
  if (issues.length) return issues;
  position.frets.forEach((fret, stringIndex) => {
    if (fret < 0) return;
    const absoluteFret = fret === 0 ? 0 : (position.baseFret || 1) + fret - 1;
    const expectedMidi = openStringMidi[stringIndex] + absoluteFret;
    if (position.midi[stringIndex] !== expectedMidi) issues.push(`${location}: MIDI incorreto na corda ${stringIndex + 1}`);
  });
  return issues;
}

function auditRawLibrary() {
  const suffixes = {};
  const positions = [];
  const structuralIssues = [];
  const duplicates = [];
  for (const key of pitchNames) {
    for (const chord of database.chords[key] || []) {
      suffixes[chord.suffix] ??= { chords: 0, shapes: 0, exact: 0, omission: 0, extra: 0, rootMissing: 0 };
      const summary = suffixes[chord.suffix];
      summary.chords += 1;
      summary.shapes += chord.positions.length;
      const identities = new Map();
      chord.positions.forEach((position, index) => {
        structuralIssues.push(...inspectStructure(key, chord.suffix, position, index));
        const identity = positionIdentity(position);
        if (identities.has(identity)) duplicates.push(`${key}:${chord.suffix} formas ${identities.get(identity) + 1} e ${index + 1}`);
        else identities.set(identity, index);
        const classification = classifyPosition(key, chord.suffix, position);
        summary[classification.kind] += 1;
        if (classification.rootMissing) summary.rootMissing += 1;
        positions.push({ key, suffix: chord.suffix, position, classification });
      });
    }
  }
  return { suffixes, positions, structuralIssues, duplicates };
}

function countDerivedShapes(positions, suffix) {
  let chords = 0;
  let shapes = 0;
  for (const key of pitchNames) {
    const expected = getChordPitchClasses(key, suffix);
    const matches = positions.filter(item => {
      const played = uniquePitchClasses(item.position.midi);
      return played.length === expected.length && played.every((note, index) => note === expected[index]);
    });
    const unique = new Set(matches.map(item => positionIdentity(item.position)));
    if (unique.size) chords += 1;
    shapes += unique.size;
  }
  return { chords, shapes };
}

function countRuntimeExpansion(library) {
  const sources = Object.values(library.chords).flat().flatMap(chord => chord.positions || []);
  let chordEntries = 0;
  let shapeReferences = 0;
  let exactReusedShapes = 0;
  const coverageGaps = [];
  for (const key of pitchNames) {
    for (const suffix of suffixCycle) {
      const stored = library.chords[key].find(chord => chord.suffix === suffix);
      const existing = new Set((stored?.positions || []).map(positionIdentity));
      const expected = getChordPitchClasses(key, suffix);
      const candidates = new Map(sources.filter(position => {
        const played = uniquePitchClasses(position.midi);
        return played.length === expected.length && played.every((note, index) => note === expected[index]);
      }).map(position => [positionIdentity(position), position]));
      const additions = [...candidates].filter(([identity]) => !existing.has(identity));
      if (!stored && !additions.length) continue;
      chordEntries += 1;
      const runtimePositions = (stored?.positions || []).concat(additions.map(([, position]) => position));
      shapeReferences += runtimePositions.length;
      exactReusedShapes += additions.length;
      const exactShapes = runtimePositions.filter(position => {
        const played = uniquePitchClasses(position.midi);
        return played.length === expected.length && played.every((note, index) => note === expected[index]);
      }).length;
      const safeShapes = runtimePositions.filter(position => {
        const played = uniquePitchClasses(position.midi);
        return played.every(note => expected.includes(note));
      }).length;
      if (safeShapes < 3) coverageGaps.push({ chord: `${key}:${suffix}`, shapes: runtimePositions.length, safeShapes, exactShapes });
    }
  }
  return { chordEntries, shapeReferences, exactReusedShapes, coverageGaps };
}

const raw = auditRawLibrary();
const rawChordEntries = Object.values(raw.suffixes).reduce((sum, suffix) => sum + suffix.chords, 0);
const rawShapes = raw.positions.length;
const uniquePhysicalShapes = new Set(raw.positions.map(item => positionIdentity(item.position))).size;
const derived = Object.fromEntries(['add9', 'm6'].map(suffix => [suffix, countDerivedShapes(raw.positions, suffix)]));
const correctedLibrary = applyKnownChordCorrections(database);
const runtime = countRuntimeExpansion(correctedLibrary);
const totals = Object.values(raw.suffixes).reduce((result, suffix) => ({
  exact: result.exact + suffix.exact,
  omission: result.omission + suffix.omission,
  extra: result.extra + suffix.extra
}), { exact: 0, omission: 0, extra: 0 });

const report = {
  source: '@tombatossals/chords-db/lib/cavaquinho.json',
  tuning: database.tunings.standard,
  raw: { roots: pitchNames.length, suffixes: Object.keys(raw.suffixes).length, chordEntries: rawChordEntries, shapeReferences: rawShapes, uniquePhysicalShapes },
  runtime: { suffixes: Object.keys(chordQualities).length, ...runtime, restoredHistoricalShapes: historicalVoicingCount, derived },
  classification: totals,
  bySuffix: raw.suffixes,
  validation: { structuralIssues: raw.structuralIssues, duplicateReferences: raw.duplicates }
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (raw.structuralIssues.length) process.exitCode = 1;
