import fs from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import { chordQualities, getChordPitchClasses } from '../src/domain/chordTheory.js';
import { suffixCycle } from '../src/sequences.js';

const databasePath = new URL('../node_modules/@tombatossals/chords-db/lib/cavaquinho.json', import.meta.url);
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const pitchNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const openStringMidi = [50, 55, 59, 62];

function unique(values) {
  return [...new Set(values)];
}

function positionIdentity(position) {
  return [position.baseFret || 1, ...position.frets].join(':');
}

function classifyPosition(key, suffix, position) {
  const expected = getChordPitchClasses(key, suffix);
  const played = unique(position.midi.map(note => note % 12));
  const quality = chordQualities[suffix];
  const root = pitchNames.indexOf(key);
  const essential = (quality?.required || []).map(interval => (root + interval) % 12);
  const missing = expected.filter(note => !played.includes(note));
  const additional = played.filter(note => !expected.includes(note));
  const missingEssential = essential.filter(note => !played.includes(note));
  const rootMissing = !played.includes(root);
  const kind = additional.length
    ? 'additional'
    : missingEssential.length
      ? 'invalid'
      : rootMissing && missing.length
        ? 'rootless'
        : missing.length
          ? 'incomplete'
          : 'complete';

  return {
    kind,
    missing: missing.map(note => pitchNames[note]),
    additional: additional.map(note => pitchNames[note]),
    missingEssential: missingEssential.map(note => pitchNames[note]),
    rootMissing
  };
}

function inspectStructure(key, suffix, position, shapeIndex) {
  const location = `${key}:${suffix} forma ${shapeIndex + 1}`;
  const issues = [];
  for (const field of ['frets', 'fingers', 'midi']) {
    if (!Array.isArray(position[field]) || position[field].length !== 4) {
      issues.push(`${location}: ${field} deve ter quatro valores`);
    }
  }
  if (issues.length) return issues;
  position.frets.forEach((fret, stringIndex) => {
    if (fret < 0) return;
    const absoluteFret = fret === 0 ? 0 : (position.baseFret || 1) + fret - 1;
    if (position.midi[stringIndex] !== openStringMidi[stringIndex] + absoluteFret) {
      issues.push(`${location}: MIDI incorreto na corda ${stringIndex + 1}`);
    }
  });
  return issues;
}

function auditLibrary() {
  const bySuffix = {};
  const structuralIssues = [];
  const duplicateReferences = [];
  let chordEntries = 0;
  let shapeReferences = 0;

  for (const key of pitchNames) {
    for (const chord of database.chords[key] || []) {
      chordEntries += 1;
      bySuffix[chord.suffix] ??= {
        chords: 0,
        shapes: 0,
        complete: 0,
        incomplete: 0,
        rootless: 0,
        additional: 0,
        invalid: 0
      };
      const summary = bySuffix[chord.suffix];
      summary.chords += 1;
      summary.shapes += chord.positions.length;
      shapeReferences += chord.positions.length;
      const seen = new Map();

      chord.positions.forEach((position, index) => {
        structuralIssues.push(...inspectStructure(key, chord.suffix, position, index));
        const identity = positionIdentity(position);
        if (seen.has(identity)) {
          duplicateReferences.push(`${key}:${chord.suffix} formas ${seen.get(identity) + 1} e ${index + 1}`);
        } else {
          seen.set(identity, index);
        }
        summary[classifyPosition(key, chord.suffix, position).kind] += 1;
      });
    }
  }

  return { bySuffix, chordEntries, shapeReferences, structuralIssues, duplicateReferences };
}

const audit = auditLibrary();
const availableCoverage = Object.fromEntries(suffixCycle.map(suffix => [
  suffix,
  pitchNames.filter(key => {
    const chord = database.chords[key]?.find(entry => entry.suffix === suffix);
    return chord?.positions.length > 0;
  }).length
]));
const shallowChords = pitchNames.flatMap(key => suffixCycle.map(suffix => {
  const count = database.chords[key]?.find(entry => entry.suffix === suffix)?.positions.length || 0;
  return count > 0 && count < 3 ? { chord: `${key}:${suffix}`, shapes: count } : null;
}).filter(Boolean));

const classification = Object.values(audit.bySuffix).reduce((total, suffix) => ({
  complete: total.complete + suffix.complete,
  incomplete: total.incomplete + suffix.incomplete,
  rootless: total.rootless + suffix.rootless,
  additional: total.additional + suffix.additional,
  invalid: total.invalid + suffix.invalid
}), { complete: 0, incomplete: 0, rootless: 0, additional: 0, invalid: 0 });

const report = {
  source: '@tombatossals/chords-db/lib/cavaquinho.json',
  revision: database.version || 'pinned in package-lock.json',
  tuning: database.tunings.standard,
  totals: {
    roots: pitchNames.length,
    suffixDefinitions: Object.keys(database.suffixMetadata || {}).length,
    chordEntries: audit.chordEntries,
    shapeReferences: audit.shapeReferences
  },
  classification,
  availableCoverage,
  shallowChords,
  bySuffix: audit.bySuffix,
  validation: {
    structuralIssues: audit.structuralIssues,
    duplicateReferences: audit.duplicateReferences
  }
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (audit.structuralIssues.length || audit.duplicateReferences.length) process.exitCode = 1;
