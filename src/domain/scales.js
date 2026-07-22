import { chromaticKeys } from '../sequences';

export const scaleDefinitions = {
  major: { label: 'Maior', intervals: [0, 2, 4, 5, 7, 9, 11] },
  naturalMinor: { label: 'Menor natural', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPentatonic: { label: 'Pentatônica maior', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { label: 'Pentatônica menor', intervals: [0, 3, 5, 7, 10] }
};

export const scaleDegreeNames = ['primeiro grau', 'segundo grau', 'terceiro grau', 'quarto grau', 'quinto grau', 'sexto grau', 'sétimo grau', 'oitavo grau'];

const enharmonicPitchClasses = { 'C#': 1, 'D#': 3, 'F#': 6, 'G#': 8, 'A#': 10 };

export const getPitchClass = (note) => chromaticKeys.indexOf(note) >= 0 ? chromaticKeys.indexOf(note) : enharmonicPitchClasses[note] ?? -1;

export const noteMatchesPitchClass = (left, right) => getPitchClass(left) >= 0 && getPitchClass(left) === getPitchClass(right);

export const getScalePitchClasses = (root, scaleId) => {
  const rootIndex = getPitchClass(root);
  const scale = scaleDefinitions[scaleId];
  if (rootIndex < 0 || !scale) return [];
  return scale.intervals.map(interval => (rootIndex + interval) % 12);
};

export const getScaleNotes = (root, scaleId) => getScalePitchClasses(root, scaleId).map(pitchClass => chromaticKeys[pitchClass]);

export const buildScalePracticeSequence = (root, scaleId) => {
  const notes = getScaleNotes(root, scaleId);
  if (!notes.length) return [];
  return notes.concat(root, ...notes.slice(1).reverse());
};
