import { getChordRootPitchClass, chordQualities } from './chordTheory';

const suffixAliases = new Map(Object.entries(chordQualities).flatMap(([suffix, quality]) =>
  (quality.aliases || []).map(alias => [alias, suffix])
));

/** A chord's sounding identity, independent of enharmonic spelling and import text. */
export const getSequenceChordIdentity = step => {
  if (!step) return '';
  const root = getChordRootPitchClass(step.displayKey || step.key);
  const suffix = suffixAliases.get(step.suffix) || step.suffix || '';
  const bass = step.displayBassNote || step.bassNote;
  const bassPitchClass = bass ? getChordRootPitchClass(bass) : null;
  return `${root}:${suffix}:${bassPitchClass ?? ''}:${step.regionBlockId || ''}`;
};

/** Chord families in first-appearance order, retaining their source occurrences. */
export const getSequenceChordCatalog = (steps = []) => {
  const catalog = new Map();
  steps.forEach((step, index) => {
    const identity = getSequenceChordIdentity(step);
    if (!catalog.has(identity)) catalog.set(identity, { identity, step, firstIndex: index, indexes: [] });
    catalog.get(identity).indexes.push(index);
  });
  return [...catalog.values()];
};

/**
 * Save a shape to all occurrences of the same sounding chord. Keep library
 * indexes for identical stored roots/qualities; use physical frets whenever
 * spellings or equivalent quality syntax differ.
 */
export const applyChordShapeToOccurrences = (steps, reference, selection) => {
  const identity = getSequenceChordIdentity(reference);
  return steps.map(step => {
    if (getSequenceChordIdentity(step) !== identity) return step;
    const canReuseLibraryIndex = !selection.customPosition && Number.isInteger(selection.positionIndex)
      && step.key === reference.key && step.suffix === reference.suffix;
    const { position, frets, fingers } = selection;
    return {
      ...step,
      shapeSuffix: selection.shapeSuffix || step.shapeSuffix || step.suffix,
      positionIndex: canReuseLibraryIndex ? selection.positionIndex : null,
      ...(canReuseLibraryIndex ? { customPosition: undefined } : {
        customPosition: {
          frets: [...(selection.customPosition?.frets || frets || position?.frets || [])],
          fingers: [...(selection.customPosition?.fingers || fingers || position?.fingers || [0, 0, 0, 0])]
        }
      })
    };
  });
};
