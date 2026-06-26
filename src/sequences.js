export const chromaticKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const suffixCycle = ['major', 'minor', '6', '7', '9', 'maj7', 'm7', 'm7b5', 'dim', 'dim7', 'sus2', 'sus4'];

export const defaultSteps = [
  { id: 'step-1', key: 'Eb', suffix: 'maj7', positionIndex: null },
  { id: 'step-2', key: 'D', suffix: '7', positionIndex: null },
  { id: 'step-3', key: 'G', suffix: 'minor', positionIndex: null }
];

export const defaultSequences = [
  { id: 'sequence-1', title: 'Cadência menor de G', steps: defaultSteps }
];

export const createSequenceStep = (index = Date.now()) => ({
  id: 'step-' + index,
  key: 'C',
  suffix: 'major',
  positionIndex: null
});

export const createSequence = (index = Date.now()) => ({
  id: 'sequence-' + index,
  title: 'Nova sequência',
  steps: [createSequenceStep(index + '-1')]
});

export const reorderSequence = (sequence, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= sequence.length || fromIndex < 0 || fromIndex >= sequence.length) return sequence;
  const next = sequence.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

export const normalizeSteps = (value) => {
  if (!Array.isArray(value) || value.length === 0) return defaultSteps;
  const normalized = value.filter(Boolean).map((step, index) => ({
    id: typeof step.id === 'string' ? step.id : 'step-' + index,
    key: chromaticKeys.includes(step.key) ? step.key : 'C',
    suffix: suffixCycle.includes(step.suffix) ? step.suffix : 'major',
    positionIndex: Number.isInteger(step.positionIndex) ? step.positionIndex : null
  }));
  return normalized.length > 0 ? normalized : defaultSteps;
};

export const normalizeSequences = (value) => {
  if (Array.isArray(value) && value.some(item => item?.key && item?.suffix)) {
    return [{ ...defaultSequences[0], steps: normalizeSteps(value) }];
  }
  if (!Array.isArray(value) || value.length === 0) return defaultSequences;
  const normalized = value.filter(Boolean).map((sequence, index) => ({
    id: typeof sequence.id === 'string' ? sequence.id : 'sequence-' + index,
    title: typeof sequence.title === 'string' && sequence.title.trim() ? sequence.title.trim() : 'Sequência ' + (index + 1),
    steps: normalizeSteps(sequence.steps)
  }));
  return normalized.length > 0 ? normalized : defaultSequences;
};

export const normalizeSequence = normalizeSteps;
