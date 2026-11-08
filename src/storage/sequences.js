import { defaultSequences, normalizeSequences } from '../sequences';
import { sanitizeSequenceShapeIndexes } from '../domain/chords';
import { formatSuffix } from '../chordDisplay';
import { activeSequenceStorageKey, legacySequenceStorageKey, readStorage, sequencesStorageKey, writeStorage } from '../storage';

export const loadSequences = () => {
  const normalizeSavedSequences = sequences => {
    const existingIndex = sequences.findIndex(sequence => sequence.presetId === 'noitesCariocasB');
    const existing = existingIndex < 0 ? null : sequences[existingIndex];
    // Older copies stored the display spelling as a complete chord name (for
    // example "F#m7"). formatSequenceChord appends the suffix separately,
    // which produced labels such as "F#m7m7" and also broke shape lookup.
    let changed = false;
    const steps = existing?.steps.map(step => {
      const suffix = formatSuffix(step.suffix) || '';
      const displayKey = step.displayKey || '';
      if (!suffix || !displayKey.endsWith(suffix) || displayKey === step.key) return step;
      const root = displayKey.slice(0, -suffix.length);
      const canonicalRoot = ({ 'F#': 'Gb', 'C#': 'Db' })[root] || root;
      if (!root || !step.key || canonicalRoot !== step.key) return step;
      changed = true;
      return { ...step, displayKey: root };
    });
    let migrated = sequences;
    if (changed && existing) {
      migrated = [...sequences];
      migrated[existingIndex] = { ...existing, steps };
    }
    return sanitizeSequenceShapeIndexes(migrated);
  };
  try {
    const saved = readStorage(sequencesStorageKey).value;
    if (saved) {
      const sequences = normalizeSavedSequences(normalizeSequences(JSON.parse(saved)));
      const serialized = JSON.stringify(sequences);
      if (serialized !== saved) writeStorage(sequencesStorageKey, serialized);
      return sequences;
    }
    const legacy = readStorage(legacySequenceStorageKey).value;
    if (legacy) {
      const sequences = normalizeSavedSequences(normalizeSequences(JSON.parse(legacy)));
      writeStorage(sequencesStorageKey, JSON.stringify(sequences));
      return sequences;
    }
    return defaultSequences;
  } catch {
    return defaultSequences;
  }
};

export const loadActiveSequenceId = (sequences) => {
  const saved = readStorage(activeSequenceStorageKey).value;
  return sequences.some(sequence => sequence.id === saved) ? saved : sequences.find(sequence => sequence.presetId === 'noitesCariocasB')?.id || sequences[0].id;
};

export { activeSequenceStorageKey, sequencesStorageKey, writeStorage };
