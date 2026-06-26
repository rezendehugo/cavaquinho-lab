import { defaultSequences, normalizeSequences } from './sequences';

export const sequencesStorageKey = 'cavaquinhoLabSequences';
export const activeSequenceStorageKey = 'cavaquinhoLabActiveSequenceId';
export const legacySequenceStorageKey = 'cavaquinhoLabSequence';
export const diagramModeStorageKey = 'cavaquinhoLabDiagramMode';

export const loadSequences = () => {
  try {
    const saved = window.localStorage.getItem(sequencesStorageKey);
    if (saved) return normalizeSequences(JSON.parse(saved));
    const legacy = window.localStorage.getItem(legacySequenceStorageKey);
    if (legacy) return normalizeSequences(JSON.parse(legacy));
    return defaultSequences;
  } catch (_error) {
    return defaultSequences;
  }
};

export const loadActiveSequenceId = (sequences) => {
  const saved = window.localStorage.getItem(activeSequenceStorageKey);
  return sequences.some(sequence => sequence.id === saved) ? saved : sequences[0].id;
};

export const loadDiagramMode = () => {
  const saved = window.localStorage.getItem(diagramModeStorageKey);
  return saved === 'fingers' ? 'fingers' : 'notes';
};
