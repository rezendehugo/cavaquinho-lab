import { normalizeStoredScalePaths, scalePathStorageVersion } from '../domain/scalePaths';
import { readStorage, scalePathsStorageKey, writeStorage } from '../storage';

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
