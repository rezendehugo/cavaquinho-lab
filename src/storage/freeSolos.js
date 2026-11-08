import { freeSoloStorageVersion, normalizeStoredSolos } from '../domain/freeSolos';
import { freeSolosStorageKey, readStorage, writeStorage } from '../storage';

export const loadFreeSolos = () => {
  try {
    const saved = readStorage(freeSolosStorageKey).value;
    return saved ? normalizeStoredSolos(JSON.parse(saved)).solos : [];
  } catch {
    return [];
  }
};

export const saveFreeSolos = (solos) => writeStorage(freeSolosStorageKey, JSON.stringify({
  version: freeSoloStorageVersion,
  solos: normalizeStoredSolos({ version: freeSoloStorageVersion, solos }).solos
}));
