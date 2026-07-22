import { defaultSequences, normalizeSequences } from './sequences';
import { normalizeStoredScalePaths, scalePathStorageVersion } from './domain/scalePaths';

export const sequencesStorageKey = 'cavaquinhoLabSequences';
export const activeSequenceStorageKey = 'cavaquinhoLabActiveSequenceId';
export const legacySequenceStorageKey = 'cavaquinhoLabSequence';
export const scalePathsStorageKey = 'cavaquinhoLabScalePaths';

export const storageErrorMessage = 'Não foi possível salvar suas alterações neste navegador.';

export const readStorage = (key) => {
  try {
    return { ok: true, value: window.localStorage.getItem(key) };
  } catch {
    return { ok: false, value: null };
  }
};

export const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

export const loadSequences = () => {
  try {
    const saved = readStorage(sequencesStorageKey).value;
    if (saved) return normalizeSequences(JSON.parse(saved));
    const legacy = readStorage(legacySequenceStorageKey).value;
    if (legacy) return normalizeSequences(JSON.parse(legacy));
    return defaultSequences;
  } catch {
    return defaultSequences;
  }
};

export const loadActiveSequenceId = (sequences) => {
  const saved = readStorage(activeSequenceStorageKey).value;
  return sequences.some(sequence => sequence.id === saved) ? saved : sequences[0].id;
};

export const loadScalePaths = () => {
  try {
    const saved = readStorage(scalePathsStorageKey).value;
    return saved ? normalizeStoredScalePaths(JSON.parse(saved)).paths : [];
  } catch {
    return [];
  }
};

export const saveScalePaths = (paths) => writeStorage(scalePathsStorageKey, JSON.stringify({
  version: scalePathStorageVersion,
  paths: normalizeStoredScalePaths({ version: scalePathStorageVersion, paths }).paths
}));
