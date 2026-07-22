import { chromaticKeys } from '../sequences';

const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const sharpTonics = new Set(['G', 'D', 'A', 'E', 'B']);
const normalizePresetBeats = (value) => {
  const parsed = Number(value);
  return Math.min(16, Math.max(1, Math.round(Number.isFinite(parsed) ? parsed : 4)));
};

export const sequencePresetDefinitions = [
  { id: 'majorSquare', label: 'Quadradinho maior', formula: 'I · VI7 · ii · V7 · I · I7 · IV · iv · iii', loopStartIndex: 1 },
  { id: 'minorSquare', label: 'Quadradinho menor funcional', formula: 'i · V7 · i · I7 · iv · VII7 · III · VI · iiø · V7 · i', loopStartIndex: 0 },
  { id: 'fourthsMajor', label: 'Ciclo das quartas maior', formula: '12 acordes maiores em quartas ascendentes', loopStartIndex: 0 },
  { id: 'fourthsMinor', label: 'Ciclo das quartas menor', formula: '12 acordes menores em quartas ascendentes', loopStartIndex: 0 }
];

const formulas = {
  majorSquare: [[0, 'major'], [9, '7'], [2, 'minor'], [7, '7'], [0, 'major'], [0, '7'], [5, 'major'], [5, 'minor'], [4, 'minor']],
  minorSquare: [[0, 'minor'], [7, '7'], [0, 'minor'], [0, '7'], [5, 'minor'], [10, '7'], [3, 'major'], [8, 'major'], [2, 'm7b5'], [7, '7'], [0, 'minor']]
};

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

export function transposePreset(presetId, tonic) {
  if (presetId === 'fourthsMajor') return buildFourthCycle(tonic, 'major');
  if (presetId === 'fourthsMinor') return buildFourthCycle(tonic, 'minor');
  const formula = formulas[presetId];
  const tonicPitchClass = pitchClassOf(tonic);
  if (!formula || tonicPitchClass < 0) return [];
  const preferSharps = sharpTonics.has(tonic);
  return formula.map(([offset, suffix]) => createChord(tonicPitchClass + offset, suffix, preferSharps));
}

export function getNextPracticeIndex(current, length, loopStartIndex = 0) {
  if (length < 1) return 0;
  if (current < length - 1) return Math.max(0, current + 1);
  return Math.min(length - 1, Math.max(0, Math.round(Number(loopStartIndex) || 0)));
}

export function createPresetSequence({ presetId, tonic, bpm, beats, sequenceId }) {
  const definition = sequencePresetDefinitions.find(item => item.id === presetId);
  if (!definition) return null;
  const chords = transposePreset(presetId, tonic);
  const normalizedBeats = normalizePresetBeats(beats);
  const practiceBpm = Math.min(220, Math.max(40, Math.round(Number(bpm) || 60)));
  const id = sequenceId || `preset-${Date.now()}`;
  return {
    id,
    title: `${definition.label} · ${tonic}`,
    presetId,
    tonic,
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
