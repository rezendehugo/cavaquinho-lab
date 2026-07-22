import cavaquinho from '@tombatossals/chords-db/lib/cavaquinho.json';

export const suffixLabels = Object.fromEntries(
  Object.entries(cavaquinho.suffixMetadata || {}).map(([suffix, metadata]) => [suffix, metadata.symbol])
);

export const qualityLabels = Object.fromEntries(
  Object.entries(cavaquinho.suffixMetadata || {}).map(([suffix, metadata]) => [suffix, metadata.label])
);

export const formatSuffix = (suffix) => suffixLabels[suffix] ?? suffix;

export const formatChordName = (key, suffix, displayKey) => (displayKey || key) + formatSuffix(suffix);

export const formatSequenceChord = (step) => formatChordName(step.key, step.suffix, step.displayKey);

export const formatShapeIndex = (index, total) => (index + 1) + '/' + total;

export const formatShapeCode = (position) => (position?.frets || []).map(fret => fret < 0 ? 'x' : fret).join('');

export const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const getPlayedNotes = (position) => (position.midi || []).map(midi => noteNames[midi % 12]);
