export const chromaticKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const MAX_SEQUENCE_STEPS = 50;

export const suffixCycle = ['major', 'minor', '6', '7', 'm6', '9', 'add9', 'maj7', 'm7', 'm7b5', 'dim', 'dim7', 'sus2', 'sus4'];

export const defaultSequences = [
  { id: 'sequence-1', title: 'Sequência 1', steps: [], practiceBpm: 60, loopStartIndex: 0 }
];

const createId = (prefix) => prefix + '-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2));

export const createSequenceStep = (index) => ({
  id: index === undefined ? createId('step') : 'step-' + index,
  key: 'C',
  suffix: 'major',
  positionIndex: null,
  practiceBeats: 4
});

export const createSequence = (index = Date.now()) => ({
  id: 'sequence-' + index,
  title: 'Sequência',
  steps: [],
  practiceBpm: 60,
  loopStartIndex: 0
});

export const reorderSequence = (sequence, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= sequence.length || fromIndex < 0 || fromIndex >= sequence.length) return sequence;
  const next = sequence.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

export const normalizeSteps = (value) => {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set();
  return value.filter(Boolean).slice(0, MAX_SEQUENCE_STEPS).map((step, index) => {
    const candidateId = typeof step.id === 'string' ? step.id : '';
    const fallbackId = 'step-' + index;
    const id = candidateId && !usedIds.has(candidateId) ? candidateId : (!usedIds.has(fallbackId) ? fallbackId : createId('step'));
    usedIds.add(id);
    return ({
      id,
      key: chromaticKeys.includes(step.key) ? step.key : 'C',
      ...(typeof step.displayKey === 'string' && step.displayKey.trim() ? { displayKey: step.displayKey.trim() } : {}),
      suffix: suffixCycle.includes(step.suffix) ? step.suffix : 'major',
      positionIndex: Number.isInteger(step.positionIndex) ? step.positionIndex : null,
      practiceBeats: Math.min(16, Math.max(1, Math.round(Number(step.practiceBeats) || 4)))
    });
  });
};

export const normalizeSequences = (value) => {
  if (Array.isArray(value) && value.some(item => item?.key && item?.suffix)) {
    return [{ ...defaultSequences[0], steps: normalizeSteps(value) }];
  }
  if (!Array.isArray(value) || value.length === 0) return defaultSequences;
  const normalized = value.filter(Boolean).map((sequence, index) => {
    const steps = normalizeSteps(sequence.steps);
    return {
      id: typeof sequence.id === 'string' ? sequence.id : 'sequence-' + index,
      title: normalizeSequenceTitle(sequence.title, index),
      steps,
      practiceBpm: normalizePracticeBpm(sequence.practiceBpm),
      loopStartIndex: normalizeLoopStartIndex(sequence.loopStartIndex, steps.length),
      ...(typeof sequence.presetId === 'string' ? { presetId: sequence.presetId } : {}),
      ...(chromaticKeys.includes(sequence.tonic) ? { tonic: sequence.tonic } : {})
    };
  });
  return normalized.length > 0 ? normalized : defaultSequences;
};

export const normalizePracticeBpm = (value) => Math.min(220, Math.max(40, Math.round(Number(value) || 60)));

export const normalizeLoopStartIndex = (value, stepCount) => {
  if (stepCount < 1) return 0;
  return Math.min(stepCount - 1, Math.max(0, Math.round(Number(value) || 0)));
};

export const normalizeSequence = normalizeSteps;

const normalizeSequenceTitle = (title, index) => {
  const fallback = 'Sequência ' + (index + 1);
  if (typeof title !== 'string') return fallback;
  const trimmed = title.trim();
  if (!trimmed || trimmed === 'Nova sequência') return fallback;
  return trimmed;
};
