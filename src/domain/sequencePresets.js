import { chromaticKeys } from '../sequences';

const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const sharpTonics = new Set(['G', 'D', 'A', 'E', 'B']);
const naturalTonics = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const naturalPitchClasses = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pitchClassToCanonical = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const diatonicCycleOrder = [0, 3, 6, 2, 5, 1, 4];
const majorScaleSteps = [0, 2, 4, 5, 7, 9, 11];
const naturalMinorScaleSteps = [0, 2, 3, 5, 7, 8, 10];
const harmonicMinorScaleSteps = [0, 2, 3, 5, 7, 8, 11];
const majorFieldQualities = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'];
const minorFieldQualities = ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'];
const harmonicMinorFieldQualities = ['minor', 'dim', 'aug', 'minor', '7', 'major', 'dim'];
const harmonicFieldDefinitions = chromaticKeys.flatMap(tonic => [
  { id: `harmonicFieldMajor-${tonic}`, label: `Campo harmônico maior · ${tonic}`, formula: 'I · ii · iii · IV · V · vi · vii°', loopStartIndex: 0, fixedTonic: tonic },
  { id: `harmonicFieldMinor-${tonic}`, label: `Campo harmônico menor harmônico · ${tonic}`, formula: 'i · ii° · III+ · iv · V7 · VI · vii°', loopStartIndex: 0, fixedTonic: tonic }
]);
const fourthsCycleDefinitions = naturalTonics.flatMap(tonic => [
  { id: `diatonicFourthsMajor-${tonic}`, label: `Ciclo diatônico das quartas · ${tonic} maior`, formula: 'I · IV · vii° · iii · vi · ii · V', loopStartIndex: 0, fixedTonic: tonic },
  { id: `diatonicFourthsMinor-${tonic}`, label: `Ciclo diatônico das quartas · ${tonic} menor`, formula: 'i · iv · VII · III · VI · ii° · v', loopStartIndex: 0, fixedTonic: tonic }
]);
const normalizePresetBeats = (value) => {
  const parsed = Number(value);
  return Math.min(16, Math.max(1, Math.round(Number.isFinite(parsed) ? parsed : 4)));
};

export const sequencePresetDefinitions = [
  { id: 'noitesCariocasB', label: 'Noites Cariocas · parte B', formula: 'G7 · C · A7 · Dm · A7 · Dm · F · F#dim · C · F#m7 · B7 · E · C#m · F#m · B7 · E · G7 · C · A7 · Dm · A7 · Dm · F · B7 · E7 · A7 · Dm · G7 · C · C · C#dim · D7', loopStartIndex: 0, fixedTonic: 'G' },
  { id: 'florAmorosaB', label: 'Flor Amorosa · parte B', formula: 'Am · Dm · E7 · Am · E7 · Am · Dm · Am · E7 · Am · E7 (repete)', loopStartIndex: 0 },
  { id: 'majorSquare', label: 'Quadradinho maior', formula: 'I · VI7 · ii · V7 · I · I7 · IV · iv · iii', loopStartIndex: 1 },
  { id: 'minorSquare', label: 'Quadradinho menor funcional', formula: 'i · V7 · i · I7 · iv · VII7 · III · VI · iiø · V7 · i', loopStartIndex: 0 },
  { id: 'fourthsMajor', label: 'Ciclo das quartas maior', formula: '12 acordes maiores em quartas ascendentes', loopStartIndex: 0 },
  { id: 'fourthsMinor', label: 'Ciclo das quartas menor', formula: '12 acordes menores em quartas ascendentes', loopStartIndex: 0 },
  ...fourthsCycleDefinitions,
  ...harmonicFieldDefinitions
];

const formulas = {
  majorSquare: [[0, 'major'], [9, '7'], [2, 'minor'], [7, '7'], [0, 'major'], [0, '7'], [5, 'major'], [5, 'minor'], [4, 'minor']],
  minorSquare: [[0, 'minor'], [7, '7'], [0, 'minor'], [0, '7'], [5, 'minor'], [10, '7'], [3, 'major'], [8, 'major'], [2, 'm7b5'], [7, '7'], [0, 'minor']]
};

// The B section's two-bar harmonic phrases, transcribed from the supplied
// Flor Amorosa score (pages 86-87). The full 16-bar section repeats the
// four-chord phrase pair once: i · iv · V7 · i · V7 · i · iv · i · V7 · i · V7.
const florAmorosaBOffsets = [
  [0, 'minor'], [5, 'minor'], [7, '7'], [0, 'minor'], [7, '7'],
  [0, 'minor'], [5, 'minor'], [0, 'minor'], [7, '7'], [0, 'minor'], [7, '7']
];

// Chord-symbol sequence from the B section of Noites Cariocas, pages 123-124.
// Slash-chord bass notes are omitted so the shape picker can focus on a playable
// cavaquinho grip for each chord identity.
const noitesCariocasB = [
  ['G', '7'], ['C', 'major'], ['A', '7'], ['D', 'minor'], ['A', '7'], ['D', 'minor'],
  ['F', 'major'], ['Gb', 'dim', 'F#'], ['C', 'major'], ['Gb', 'm7', 'F#'], ['B', '7'],
  ['E', 'major'], ['Db', 'minor', 'C#'], ['Gb', 'minor', 'F#'], ['B', '7'], ['E', 'major'],
  ['G', '7'], ['G', '7'], ['C', 'major'], ['A', '7'], ['D', 'minor'], ['A', '7'],
  ['D', 'minor'], ['F', 'major'], ['B', '7'], ['E', '7'], ['A', '7'], ['D', 'minor'],
  ['G', '7'], ['C', 'major'], ['C', 'major'], ['Db', 'dim', 'C#'], ['D', '7']
];

const pitchClassOf = (note) => {
  const canonical = chromaticKeys.indexOf(note);
  if (canonical >= 0) return canonical;
  return sharpNames.indexOf(note);
};

const createChord = (pitchClass, suffix, preferSharps) => {
  const key = chromaticKeys[(pitchClass + 12) % 12];
  const displayKey = preferSharps ? sharpNames[(pitchClass + 12) % 12] : key;
  return { key, suffix, ...(displayKey !== key ? { displayKey } : {}) };
};

export function buildFourthCycle(start, quality) {
  const startPitchClass = pitchClassOf(start);
  if (startPitchClass < 0) return [];
  return Array.from({ length: 12 }, (_, index) => createChord(startPitchClass + (index * 5), quality, false));
}

const spellDiatonicCycle = (tonic, mode) => {
  const scaleSteps = mode === 'major' ? majorScaleSteps : naturalMinorScaleSteps;
  const qualities = mode === 'major' ? majorFieldQualities : minorFieldQualities;
  const tonicLetter = naturalTonics.indexOf(tonic);
  const scale = scaleSteps.map((step, degree) => {
    const letter = naturalTonics[(tonicLetter + degree) % naturalTonics.length];
    const pitchClass = (naturalPitchClasses[tonic] + step) % 12;
    const naturalPitchClass = naturalPitchClasses[letter];
    const alteration = (pitchClass - naturalPitchClass + 12) % 12;
    const accidental = alteration === 1 ? '#' : alteration === 11 ? 'b' : '';
    return {
      key: pitchClassToCanonical[pitchClass],
      ...(accidental ? { displayKey: `${letter}${accidental}` } : {}),
      suffix: qualities[degree]
    };
  });
  return diatonicCycleOrder.map(degree => scale[degree]);
};

const spellHarmonicField = (tonic, mode) => {
  const tonicPitchClass = pitchClassOf(tonic);
  const tonicLetter = naturalTonics.indexOf(tonic[0]);
  if (tonicPitchClass < 0 || tonicLetter < 0) return [];
  const scaleSteps = mode === 'major' ? majorScaleSteps : harmonicMinorScaleSteps;
  const qualities = mode === 'major' ? majorFieldQualities : harmonicMinorFieldQualities;
  return scaleSteps.map((step, degree) => {
    const letter = naturalTonics[(tonicLetter + degree) % naturalTonics.length];
    const pitchClass = (tonicPitchClass + step) % 12;
    const naturalPitchClass = naturalPitchClasses[letter];
    let alteration = (pitchClass - naturalPitchClass + 12) % 12;
    if (alteration > 6) alteration -= 12;
    const accidental = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' }[alteration];
    const displayKey = `${letter}${accidental ?? ''}`;
    const key = pitchClassToCanonical[pitchClass];
    return { key, ...(displayKey !== key ? { displayKey } : {}), suffix: qualities[degree] };
  });
};

export function transposePreset(presetId, tonic) {
  if (presetId === 'noitesCariocasB') return noitesCariocasB.map(([key, suffix, displayKey]) => ({ key, suffix, ...(displayKey ? { displayKey } : {}) }));
  const harmonicField = /^harmonicField(Major|Minor)-(.+)$/.exec(presetId);
  if (harmonicField) return spellHarmonicField(harmonicField[2], harmonicField[1] === 'Major' ? 'major' : 'minor');
  const diatonicFourths = /^diatonicFourths(Major|Minor)-([CDEFGAB])$/.exec(presetId);
  if (diatonicFourths) return spellDiatonicCycle(diatonicFourths[2], diatonicFourths[1] === 'Major' ? 'major' : 'minor');
  if (presetId === 'fourthsMajor') return buildFourthCycle(tonic, 'major');
  if (presetId === 'fourthsMinor') return buildFourthCycle(tonic, 'minor');
  const formula = presetId === 'florAmorosaB' ? florAmorosaBOffsets : formulas[presetId];
  const tonicPitchClass = pitchClassOf(tonic);
  if (!formula || tonicPitchClass < 0) return [];
  const preferSharps = sharpTonics.has(tonic);
  const chords = formula.map(([offset, suffix]) => createChord(tonicPitchClass + offset, suffix, preferSharps));
  return presetId === 'florAmorosaB' ? [...chords, ...chords] : chords;
}

export function getNextPracticeIndex(current, length, loopStartIndex = 0) {
  if (length < 1) return 0;
  if (current < length - 1) return Math.max(0, current + 1);
  return Math.min(length - 1, Math.max(0, Math.round(Number(loopStartIndex) || 0)));
}

export function createPresetSequence({ presetId, tonic, bpm, beats, sequenceId }) {
  const definition = sequencePresetDefinitions.find(item => item.id === presetId);
  if (!definition) return null;
  const resolvedTonic = definition.fixedTonic || tonic;
  const chords = transposePreset(presetId, resolvedTonic);
  const normalizedBeats = normalizePresetBeats(beats);
  const practiceBpm = Math.min(220, Math.max(40, Math.round(Number(bpm) || 60)));
  const id = sequenceId || `preset-${Date.now()}`;
  return {
    id,
    title: definition.fixedTonic
      ? definition.label
      : `${definition.label} · ${tonic}${presetId === 'florAmorosaB' ? 'm' : ''}`,
    presetId,
    tonic: resolvedTonic,
    practiceBpm,
    loopStartIndex: definition.loopStartIndex,
    steps: chords.map((chord, index) => ({
      id: `${id}-step-${index + 1}`,
      ...chord,
      positionIndex: null,
      practiceBeats: normalizedBeats
    }))
  };
}
