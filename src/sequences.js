export const chromaticKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const suffixCycle = ['major', 'minor', '6', '7', '9', 'maj7', 'm7', 'm7b5', 'dim', 'dim7', 'sus2', 'sus4'];

export const defaultSequence = [
  { id: 'seq-1', key: 'Eb', suffix: 'maj7', positionIndex: null },
  { id: 'seq-2', key: 'D', suffix: '7', positionIndex: null },
  { id: 'seq-3', key: 'G', suffix: 'minor', positionIndex: null }
];

export const createSequenceStep = (index = Date.now()) => ({
  id: 'seq-' + index,
  key: 'C',
  suffix: 'major',
  positionIndex: null
});

export const reorderSequence = (sequence, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= sequence.length || fromIndex < 0 || fromIndex >= sequence.length) return sequence;
  const next = sequence.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

export const normalizeSequence = (value) => {
  if (!Array.isArray(value) || value.length === 0) return defaultSequence;
  const normalized = value.filter(Boolean).map((step, index) => ({
    id: typeof step.id === 'string' ? step.id : 'seq-' + index,
    key: chromaticKeys.includes(step.key) ? step.key : 'C',
    suffix: suffixCycle.includes(step.suffix) ? step.suffix : 'major',
    positionIndex: Number.isInteger(step.positionIndex) ? step.positionIndex : null
  }));
  return normalized.length > 0 ? normalized : defaultSequence;
};
