export const sequencesStorageKey = 'cavaquinhoLabSequences';
export const activeSequenceStorageKey = 'cavaquinhoLabActiveSequenceId';
export const legacySequenceStorageKey = 'cavaquinhoLabSequence';
export const scalePathsStorageKey = 'cavaquinhoLabScalePaths';
export const freeSolosStorageKey = 'cavaquinhoLabFreeSolos';

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
