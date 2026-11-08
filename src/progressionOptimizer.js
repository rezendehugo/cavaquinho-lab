import { noteNames } from './chordDisplay';
import { analyzeChordVoicing, chordQualities, getChordPitchClasses, getChordRootPitchClass, getVoicingPreferenceRank } from './domain/chordTheory';
import { normalizeCustomPosition } from './domain/customChordShape';
import { MAX_FRET } from './domain/scalePaths';
import { getChordShapeRegion, getShapeHandCost } from './domain/chordShapeKnowledge';

const DEFAULT_SHAPE_WEIGHT = 0.08;
const VOICING_PREFERENCE_WEIGHT = 20;
const DEFINING_TONE_COVERAGE_WEIGHT = 10000;
const REQUIRED_TONE_COVERAGE_WEIGHT = 1000;
const VOICING_COMPLETENESS_WEIGHT = 80;
const FAVORITE_SIMILARITY_WEIGHT = 1;
export const MAX_VISIBLE_FRET = MAX_FRET;
export const MAX_PLAYABLE_FRET_SPAN = 4;
const tuningMidi = [62, 67, 71, 74];
const MAX_CACHED_PALETTES_PER_LIBRARY = 32;
const chordShapePaletteCache = new WeakMap();

const getVoicingPreferencePenalty = (step, position) =>
  getVoicingPreferenceRank(analyzeChordVoicing(step, position)) * VOICING_PREFERENCE_WEIGHT;

export const getAbsoluteFrets = (position) => {
  const baseFret = position.baseFret || 1;
  return position.frets.map(fret => fret <= 0 ? fret : baseFret + fret - 1);
};

// Transposition-invariant physical grip signatures. Open and muted strings
// remain distinct because neither can be shifted like a fretted note.
export const getShapeFamilySignature = position => {
  if (!position?.frets || position.frets.length !== 4) return '';
  const frets = getAbsoluteFrets(position);
  const positive = frets.filter(fret => fret > 0);
  const lowest = positive.length ? Math.min(...positive) : 1;
  return frets.map(fret => fret < 0 ? 'x' : fret === 0 ? 'o' : String(fret - lowest + 1)).join('.');
};

export const userValidatedFretKeys = Object.freeze([
  '5,4,5,5', '2,1,3,3', '5,7,5,8', '5,9,5,5', '7,11,7,7', '2,6,2,5'
]);
export const defaultImpossibleShapeSignatures = Object.freeze(['1.5.1.4', '1.5.1.1']);

const preferenceFeatures = frets => {
  const positive = frets.filter(fret => fret > 0);
  return [
    frets.filter(fret => fret === 0).length,
    frets.filter(fret => fret < 0).length,
    new Set(positive).size,
    positive.length > 1 ? Math.max(...positive) - Math.min(...positive) : 0,
    frets.filter(fret => fret >= 0).length
  ];
};

export const getFavoriteShapeSimilarity = (position, favoriteFretKeys = []) => {
  if (!favoriteFretKeys.length) return 0;
  const frets = getAbsoluteFrets(position);
  const signature = getShapeFamilySignature(position);
  const features = preferenceFeatures(frets);
  return Math.max(...favoriteFretKeys.map(key => {
    const favoriteFrets = String(key).split(',').map(Number);
    if (favoriteFrets.length !== 4 || favoriteFrets.some(fret => !Number.isFinite(fret))) return 0;
    if (getShapeFamilySignature({ frets: favoriteFrets, baseFret: 1 }) === signature) return 30;
    const favoriteFeatures = preferenceFeatures(favoriteFrets);
    const distance = features.reduce((sum, value, index) => sum + Math.abs(value - favoriteFeatures[index]) * [3, 4, 3, 2, 1][index], 0);
    return Math.max(0, 12 - distance);
  }));
};

export const hasPlayableFretSpan = (position, maximumSpan = MAX_PLAYABLE_FRET_SPAN) => {
  const fretted = getAbsoluteFrets(position).filter(fret => fret > 0);
  return fretted.length < 2 || Math.max(...fretted) - Math.min(...fretted) <= maximumSpan;
};

export const getPhysicalPitchClasses = position => {
  if (!position?.frets || position.frets.length !== tuningMidi.length) return [];
  return [...new Set(getAbsoluteFrets(position).flatMap((fret, index) =>
    fret < 0 ? [] : [(tuningMidi[index] + fret) % 12]
  ))];
};

const deriveFingering = absoluteFrets => {
  const groups = [];
  for (let index = 0; index < absoluteFrets.length; index += 1) {
    const fret = absoluteFrets[index];
    if (fret <= 0) continue;
    const previous = [...groups].reverse().find(group => group.fret === fret && group.end < index
      && absoluteFrets.slice(group.end + 1, index).every(intermediate => intermediate >= fret));
    if (previous) previous.end = index;
    else groups.push({ fret, start: index, end: index });
  }
  const byFret = [...groups].sort((left, right) => left.fret - right.fret || left.start - right.start);
  const fingers = [0, 0, 0, 0];
  byFret.forEach((group, groupIndex) => {
    for (let index = group.start; index <= group.end; index += 1) fingers[index] = groupIndex + 1;
  });
  const positiveFrets = absoluteFrets.filter(fret => fret > 0);
  const baseFret = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const barres = groups.filter(group => group.end > group.start).map(group => group.fret - baseFret + 1);
  return groups.length <= 4 ? { fingers, barres } : null;
};

export const hasPlausibleFingerAssignment = position => {
  if (!position?.frets || position.frets.length !== 4) return false;
  const frets = getAbsoluteFrets(position);
  const fretted = frets.map((fret, index) => ({ fret, index })).filter(note => note.fret > 0);
  if (!fretted.length) return true;
  const fingers = Array.isArray(position.fingers) && position.fingers.length === 4 ? position.fingers : [];
  if (!fingers.some(Boolean)) return Boolean(deriveFingering(frets));
  const locations = new Map();
  for (const { fret, index } of fretted) {
    const finger = fingers[index];
    if (!Number.isInteger(finger) || finger < 1 || finger > 4) return false;
    const existing = locations.get(finger) || { fret, indexes: [] };
    if (existing.fret !== fret) return false;
    existing.indexes.push(index);
    locations.set(finger, existing);
  }
  for (const { fret, indexes } of locations.values()) {
    for (let index = Math.min(...indexes); index <= Math.max(...indexes); index += 1) {
      if (frets[index] === 0 || (frets[index] > 0 && frets[index] < fret)) return false;
    }
  }
  return true;
};

export const isValidChordShape = (step, position) => {
  if (!step || !position?.frets || position.frets.length !== 4) return false;
  const frets = getAbsoluteFrets(position);
  if (frets.some(fret => !Number.isInteger(fret) || fret < -1 || fret > MAX_VISIBLE_FRET)) return false;
  if (!frets.some(fret => fret >= 0) || !hasPlayableFretSpan({ ...position, baseFret: 1, frets }) || !hasPlausibleFingerAssignment({ ...position, baseFret: 1, frets })) return false;
  const played = getPhysicalPitchClasses({ ...position, baseFret: 1, frets });
  const chordTones = new Set(getChordPitchClasses(step.displayKey || step.key, step.suffix));
  return played.length > 0 && played.every(pitch => chordTones.has(pitch));
};

const positionFromFrets = (frets, fingers = null) => {
  const derived = deriveFingering(frets);
  if (!derived) return null;
  const supplied = { frets, fingers, baseFret: 1 };
  const selectedFingers = fingers?.some(Boolean) && hasPlausibleFingerAssignment(supplied) ? fingers : derived.fingers;
  const position = normalizeCustomPosition({ frets, fingers: selectedFingers });
  return position ? { ...position, barres: derived.barres } : null;
};

const preferOpenDoubledStrings = (step, position) => {
  let preferred = position;
  for (let index = 0; index < 4; index += 1) {
    const frets = getAbsoluteFrets(preferred);
    if (frets[index] !== -1) continue;
    const openFrets = [...frets];
    openFrets[index] = 0;
    const openPosition = positionFromFrets(openFrets);
    if (!openPosition || !isValidChordShape(step, openPosition)) continue;
    const existingTones = getPhysicalPitchClasses(preferred).sort((left, right) => left - right);
    const openTones = getPhysicalPitchClasses(openPosition).sort((left, right) => left - right);
    if (existingTones.length === openTones.length && existingTones.every((tone, toneIndex) => tone === openTones[toneIndex])) preferred = openPosition;
  }
  return preferred;
};

export const normalizePlayablePosition = position => position?.frets
  ? positionFromFrets(getAbsoluteFrets(position), position.fingers)
  : null;

const getFingerAnchors = (position) => {
  const absoluteFrets = getAbsoluteFrets(position);
  const anchors = {};
  position.fingers.forEach((finger, stringIndex) => {
    const fret = absoluteFrets[stringIndex];
    if (finger <= 0 || fret <= 0) return;
    if (!anchors[finger]) anchors[finger] = [];
    anchors[finger].push({ fret, stringIndex });
  });
  return Object.fromEntries(Object.entries(anchors).map(([finger, points]) => [finger, {
    fret: points.reduce((sum, point) => sum + point.fret, 0) / points.length,
    stringIndex: points.reduce((sum, point) => sum + point.stringIndex, 0) / points.length
  }]));
};

const getPositionRegion = position => {
  const fretted = getAbsoluteFrets(position).filter(fret => fret > 0);
  return fretted.length ? fretted.reduce((sum, fret) => sum + fret, 0) / fretted.length : 0;
};

export const getShapeCandidateRankingScore = candidate =>
  Math.max(0, candidate.definingCount - (candidate.definingToneCount ?? 0)) * DEFINING_TONE_COVERAGE_WEIGHT
  + Math.max(0, candidate.requiredCount - candidate.essentialCount) * REQUIRED_TONE_COVERAGE_WEIGHT
  + candidate.movementScore
  + candidate.regionDistance * 1.5
  + getShapeHandCost(candidate.position) * 2
  + (candidate.feedbackPenalty || 0)
  + (candidate.voicingRank ?? (candidate.analysis ? getVoicingPreferenceRank(candidate.analysis) : 0)) * VOICING_COMPLETENESS_WEIGHT
  - (candidate.isPreferred ? 18 : 0)
  - (candidate.favoriteSimilarity || 0) * FAVORITE_SIMILARITY_WEIGHT
  + getAbsoluteFrets(candidate.position).reduce((sum, fret) => sum + Math.max(0, fret - 12) * 2, 0)
  + (candidate.sourceDistance || 0) * 0.2;

export const getShapeComplexity = (position) => {
  const frets = getAbsoluteFrets(position).filter(fret => fret > 0);
  if (frets.length === 0) return 0;
  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);
  const fingerCount = new Set(position.fingers.filter(finger => finger > 0)).size;
  const barreCount = Array.isArray(position.barres) ? position.barres.length : (position.barres ? 1 : 0);
  return (maxFret - minFret) * 1.5 + minFret * 0.25 + fingerCount * 0.4 + barreCount * 1.25 + (position.capo ? 0.75 : 0);
};

export const getTransitionScore = (fromPosition, toPosition) => {
  if (!fromPosition || !toPosition) return 0;
  const fromFrets = getAbsoluteFrets(fromPosition);
  const toFrets = getAbsoluteFrets(toPosition);
  const sameStringsSound = fromFrets.every((fret, index) => (fret < 0) === (toFrets[index] < 0));
  const fretDeltas = fromFrets.map((fret, index) => toFrets[index] - fret);
  const parallelFretShift = sameStringsSound && fretDeltas.every(delta => delta === fretDeltas[0]);
  if (parallelFretShift) {
    // A movable grip shifted along the neck is usually a predictable, low-effort
    // change. Finger-number labels in source data vary, so compare its physical
    // fret pattern before applying the more expensive finger-anchor estimate.
    return Math.abs(fretDeltas[0]) * 3;
  }
  const fromAnchors = getFingerAnchors(fromPosition);
  const toAnchors = getFingerAnchors(toPosition);
  const fingers = new Set([...Object.keys(fromAnchors), ...Object.keys(toAnchors)]);
  const fromBarres = Array.isArray(fromPosition.barres) ? fromPosition.barres : (fromPosition.barres ? [fromPosition.barres] : []);
  const toBarres = Array.isArray(toPosition.barres) ? toPosition.barres : (toPosition.barres ? [toPosition.barres] : []);
  let score = 0;
  fingers.forEach(finger => {
    const from = fromAnchors[finger];
    const to = toAnchors[finger];
    if (!from || !to) {
      score += 7;
      return;
    }
    score += Math.abs(from.fret - to.fret) * 4;
    score += Math.abs(from.stringIndex - to.stringIndex) * 1.5;
  });
  score += fromFrets.reduce((sum, fret, index) => {
    const toFret = toFrets[index];
    if (fret <= 0 || toFret <= 0) return sum + (fret === toFret ? 0 : 1.5);
    return sum + Math.abs(fret - toFret) * 0.35;
  }, 0);
  if (fromBarres.length !== toBarres.length || Boolean(fromPosition.capo) !== Boolean(toPosition.capo)) score += 2;
  return score;
};

export const findChord = (chordDb, key, suffix) => (chordDb.chords[key] || []).find(chord => chord.suffix === suffix);

const shapeFallbacks = { '13': '7', '7b13': '7', '7b9': '7', add9: '7' };
const playablePaletteSuffixes = new Set(['9', '13', '7b13', '7b9', 'add9']);
export const findShapeChord = (chordDb, step) => {
  const requestedSuffix = step.shapeSuffix || step.suffix;
  const direct = findChord(chordDb, step.key, requestedSuffix);
  if (direct) return direct;
  const fallback = shapeFallbacks[step.suffix];
  return fallback ? findChord(chordDb, step.key, fallback) : null;
};

// A musician's saved choice is deliberately resolved independently from the
// progression optimizer. Selecting one shape must not require re-optimizing
// every other occurrence in a long sequence.
export const resolveSelectedShape = (step, chordDb) => {
  if (!step || !chordDb?.chords) return null;
  const chord = findShapeChord(chordDb, step);
  if (!chord) return null;

  const customPosition = step.customPosition ? normalizePlayablePosition(step.customPosition) : null;
  if (customPosition && isValidChordShape(step, customPosition)) {
    const preferredPosition = preferOpenDoubledStrings(step, customPosition);
    return {
      chord,
      position: preferredPosition,
      positionIndex: null,
      shapeSuffix: step.shapeSuffix || chord.suffix,
      custom: true
    };
  }

  if (!Number.isInteger(step.positionIndex) || !chord.positions[step.positionIndex]) return null;
  const sourcePosition = chord.positions[step.positionIndex];
  const position = positionFromFrets(getAbsoluteFrets(sourcePosition), sourcePosition.fingers);
  if (!isValidChordShape(step, position)) return null;
  const preferredPosition = preferOpenDoubledStrings(step, position);
  return {
    chord,
    position: preferredPosition,
    positionIndex: step.positionIndex,
    shapeSuffix: step.shapeSuffix || chord.suffix,
    custom: false
  };
};

const getSemanticPaletteKey = step => JSON.stringify([
  step.key,
  step.displayKey || step.key,
  step.suffix,
  MAX_VISIBLE_FRET
]);

const getCachedBasePalette = (step, chordDb) => {
  let libraryCache = chordShapePaletteCache.get(chordDb);
  if (!libraryCache) {
    libraryCache = new Map();
    chordShapePaletteCache.set(chordDb, libraryCache);
  }

  const key = getSemanticPaletteKey(step);
  const cached = libraryCache.get(key);
  if (cached) {
    // Keep frequently revisited chord identities resident without retaining
    // unbounded palettes for long-lived, mutable app sessions.
    libraryCache.delete(key);
    libraryCache.set(key, cached);
    return cached;
  }

  const palette = buildBaseChordShapeCandidates(step, chordDb);
  libraryCache.set(key, palette);
  if (libraryCache.size > MAX_CACHED_PALETTES_PER_LIBRARY) {
    libraryCache.delete(libraryCache.keys().next().value);
  }
  return palette;
};

// Build a practice palette from native voicings and movable chord shapes.
// Transposed shapes keep the written chord identity while teaching the
// chromatic relationship between familiar movable forms.
const buildBaseChordShapeCandidates = (step, chordDb) => {
  if (!step || !chordDb?.chords) return [];
  const target = new Set(getChordPitchClasses(step.displayKey || step.key, step.suffix));
  if (!target.size) return [];
  const rootPc = getChordRootPitchClass(step.displayKey || step.key);
  const essential = new Set((chordQualities[step.suffix]?.required || []).map(interval => (rootPc + interval) % 12));
  const definingIntervals = chordQualities[step.suffix]?.characteristicIntervals || [];
  const defining = new Set(definingIntervals.map(interval => (rootPc + interval) % 12));
  const candidates = [];
  const candidateByFretKey = new Map();
  const seen = new Set();

  Object.entries(chordDb.chords).forEach(([sourceKey, chords]) => {
    const sourceRootPc = getChordRootPitchClass(sourceKey);
    const sameRoot = sourceRootPc === rootPc;
    const signedDelta = ((rootPc - sourceRootPc + 6) % 12) - 6;
    chords.forEach(sourceChord => {
      if (!sameRoot && sourceChord.suffix !== step.suffix) return;
      sourceChord.positions.forEach((position, positionIndex) => {
        const transpositions = sameRoot ? [0] : [signedDelta - 12, signedDelta, signedDelta + 12];
        transpositions.forEach(transpositionSemitones => {
          const transformed = transpositionSemitones === 0
            ? positionFromFrets(getAbsoluteFrets(position), position.fingers)
            : positionFromFrets(getAbsoluteFrets(position).map(fret => {
                if (fret < 0) return fret;
                const shifted = fret + transpositionSemitones;
                return shifted >= 0 && shifted <= MAX_VISIBLE_FRET ? shifted : null;
              }), position.fingers);
          if (!transformed || !isValidChordShape(step, transformed)) return;
          const absoluteFrets = getAbsoluteFrets(transformed);
          const analysis = analyzeChordVoicing(step, transformed);
          const played = getPhysicalPitchClasses(transformed);
          const key = absoluteFrets.join(',');
          if (seen.has(key)) {
            const existing = candidateByFretKey.get(key);
            if (existing && sourceKey === step.key) Object.assign(existing, {
              positionIndex, shapeSuffix: sourceChord.suffix, shapeKey: step.key,
              sourceShapeKey: sourceKey, custom: false, generated: false,
              transpositionSemitones: 0
            });
            return;
          }
          seen.add(key);
          const essentialCount = [...essential].filter(pitchClass => played.includes(pitchClass)).length;
          const definingToneCount = [...defining].filter(pitchClass => played.includes(pitchClass)).length;
          candidates.push({
            position: transformed,
            positionIndex: sourceKey === step.key ? positionIndex : null,
            shapeSuffix: sourceChord.suffix,
            shapeKey: sameRoot ? sourceKey : step.displayKey || step.key,
            sourceShapeKey: sourceKey,
            custom: !sameRoot || sourceKey !== step.key,
            transpositionSemitones,
            analysis,
            playedCount: played.length,
            essentialCount,
            definingToneCount,
            definingCount: defining.size,
            requiredCount: essential.size,
            fretKey: key,
            isPreferred: false,
            movementScore: 0,
            regionDistance: 0
          });
          candidateByFretKey.set(key, candidates[candidates.length - 1]);
        });
      });
    });
  });

  // Build unfamiliar extensions from nearby known shapes first. One-string
  // edits preserve a recognizable grip while adding a missing chord tone.
  const addGenerated = (frets, source = null) => {
    const position = positionFromFrets(frets);
    if (!position || !isValidChordShape(step, position)) return;
    const key = getAbsoluteFrets(position).join(',');
    const played = getPhysicalPitchClasses(position);
    if (played.length < 2) return;
    if (seen.has(key)) {
      if (source) {
        const existing = candidateByFretKey.get(key);
        const sourceDistance = getAbsoluteFrets(source.position).reduce((sum, fret, index) => sum + (fret === frets[index] ? 0 : fret < 0 || frets[index] < 0 ? 2 : Math.abs(fret - frets[index])), 0);
        if (existing && sourceDistance < existing.sourceDistance) {
          existing.sourceShapeKey = source.key;
          existing.sourceDistance = sourceDistance;
        }
      }
      return;
    }
    seen.add(key);
    const essentialCount = [...essential].filter(pitchClass => played.includes(pitchClass)).length;
    const definingToneCount = [...defining].filter(pitchClass => played.includes(pitchClass)).length;
    const candidate = {
      position, positionIndex: null, shapeSuffix: step.suffix,
      shapeKey: step.key, sourceShapeKey: source?.key || null,
      custom: true, generated: true, transpositionSemitones: 0,
      analysis: analyzeChordVoicing(step, position), playedCount: played.length,
      essentialCount, definingToneCount, definingCount: defining.size, requiredCount: essential.size, fretKey: key,
      isPreferred: false,
      movementScore: 0,
      regionDistance: 0,
      sourceDistance: source ? getAbsoluteFrets(source.position).reduce((sum, fret, index) => sum + (fret === frets[index] ? 0 : fret < 0 || frets[index] < 0 ? 2 : Math.abs(fret - frets[index])), 0) : 8
    };
    candidates.push(candidate);
    candidateByFretKey.set(key, candidate);
  };
  Object.entries(chordDb.chords).forEach(([sourceKey, chords]) => {
    if (getChordRootPitchClass(sourceKey) !== rootPc) return;
    chords.forEach(sourceChord => sourceChord.positions.forEach(sourcePosition => {
      const baseFrets = getAbsoluteFrets(sourcePosition);
      baseFrets.forEach((oldFret, stringIndex) => {
        if (oldFret < 0) return;
        for (let fret = 0; fret <= MAX_VISIBLE_FRET; fret += 1) {
          if (fret === oldFret) continue;
          const edited = [...baseFrets]; edited[stringIndex] = fret;
          addGenerated(edited, { key: sourceKey, position: sourcePosition });
        }
      });
    }));
  });

  // If no familiar shape or nearby edit covers every required tone, search
  // compact fretboard voicings for complete coverage as a fallback.
  const perStringFrets = tuningMidi.map(openMidi => Array.from({ length: MAX_VISIBLE_FRET + 1 }, (_, fret) => fret)
    .filter(fret => target.has((openMidi + fret) % 12)));
  const enumerate = (index, frets) => {
    if (index === 4) {
      const position = positionFromFrets(frets);
      if (!position || !isValidChordShape(step, position)) return;
      const pitchClasses = getPhysicalPitchClasses(position);
      if (pitchClasses.length < 2 || [...essential].some(pitch => !pitchClasses.includes(pitch))) return;
      addGenerated(frets);
      return;
    }
    perStringFrets[index].forEach(fret => enumerate(index + 1, frets.concat(fret)));
  };
  enumerate(0, []);

  return candidates;
};

export const getChordShapeCandidates = (step, chordDb, { previousPosition = null, nextPosition = null, preferredFretKeys = [], favoriteFretKeys = userValidatedFretKeys, rejectedShapeSignatures = [], regionId = null } = {}) => {
  if (!step || !chordDb?.chords) return [];
  const previousRegion = previousPosition ? getPositionRegion(previousPosition) : null;
  const preferred = new Set(preferredFretKeys);
  const rejected = new Set(rejectedShapeSignatures);
  const candidates = getCachedBasePalette(step, chordDb)
    .filter(candidate => !rejected.has(getShapeFamilySignature(candidate.position)))
    .filter(candidate => !regionId || getChordShapeRegion(candidate.position) === regionId)
    .map(candidate => ({
    ...candidate,
    position: {
      ...candidate.position,
      frets: [...candidate.position.frets],
      fingers: [...candidate.position.fingers],
      barres: [...(candidate.position.barres || [])],
      midi: [...(candidate.position.midi || [])]
    },
    isPreferred: preferred.has(candidate.fretKey),
    favoriteSimilarity: getFavoriteShapeSimilarity(candidate.position, favoriteFretKeys),
    movementScore: (previousPosition ? getTransitionScore(previousPosition, candidate.position) : 0)
      + (nextPosition ? getTransitionScore(candidate.position, nextPosition) : 0),
    regionDistance: previousRegion === null ? 0 : Math.abs(previousRegion - getPositionRegion(candidate.position))
  }));
  return candidates.sort((left, right) =>
    getShapeCandidateRankingScore(left) - getShapeCandidateRankingScore(right) ||
    right.playedCount - left.playedCount ||
    getShapeComplexity(left.position) - getShapeComplexity(right.position) ||
    left.fretKey.localeCompare(right.fretKey)
  );
};

const shapeRegion = position => {
  const fretted = getAbsoluteFrets(position).filter(fret => fret > 0);
  const lowest = fretted.length ? Math.min(...fretted) : 0;
  return lowest <= 4 ? 'low' : lowest <= 8 ? 'middle' : lowest <= 12 ? 'high' : 'upper';
};

const soundingToneSignature = position => getPhysicalPitchClasses(position).sort((left, right) => left - right).join(',');

const coreGripSignature = position => {
  const frets = getAbsoluteFrets(position);
  const positive = frets.filter(fret => fret > 0);
  const lowest = positive.length ? Math.min(...positive) : 0;
  return frets.map(fret => fret > 0 ? fret - lowest : '_').join(',');
};

const differsOnlyByOpenOrMutedStrings = (left, right) => {
  const leftFrets = getAbsoluteFrets(left);
  const rightFrets = getAbsoluteFrets(right);
  let changed = false;
  for (let index = 0; index < leftFrets.length; index += 1) {
    if (leftFrets[index] === rightFrets[index]) continue;
    if (!((leftFrets[index] === 0 && rightFrets[index] < 0) || (rightFrets[index] === 0 && leftFrets[index] < 0))) return false;
    changed = true;
  }
  return changed;
};

export const groupChordShapeCandidates = candidates => {
  const byGrip = new Map();
  for (const candidate of candidates) {
    const baseKey = [soundingToneSignature(candidate.position), coreGripSignature(candidate.position), shapeRegion(candidate.position)].join('|');
    const group = byGrip.get(baseKey) || [];
    group.push(candidate);
    byGrip.set(baseKey, group);
  }
  return [...byGrip.values()].flatMap(group => {
    const preferred = group.filter(candidate => !group.some(other => {
      if (candidate === other || !differsOnlyByOpenOrMutedStrings(candidate.position, other.position)) return false;
      const candidateFrets = getAbsoluteFrets(candidate.position);
      const otherFrets = getAbsoluteFrets(other.position);
      return candidateFrets.some((fret, index) => fret < 0 && otherFrets[index] === 0);
    }));
    return preferred.length ? [{ ...preferred[0], variants: preferred }] : [];
  });
};

const getAllowedPositions = (step, regionId = step.regionId || null) => {
  if (step.customPosition?.frets?.length === 4 && isValidChordShape(step, step.customPosition)) {
    return !regionId || getChordShapeRegion(step.customPosition) === regionId ? [{ position: step.customPosition, positionIndex: step.positionIndex ?? null, custom: true }] : [];
  }
  const positions = step.chord.positions.map((sourcePosition, positionIndex) => ({
    sourcePosition, positionIndex,
    position: positionFromFrets(getAbsoluteFrets(sourcePosition), sourcePosition.fingers)
  })).filter(candidate => isValidChordShape(step, candidate.position));
  const selectedPosition = positions.find(candidate => candidate.positionIndex === step.positionIndex);
  if (Number.isInteger(step.positionIndex) && selectedPosition && !regionId) return [selectedPosition];
  if (step.generatedPositions?.length && !regionId) return step.generatedPositions;
  const candidates = regionId ? positions.filter(candidate => getChordShapeRegion(candidate.position) === regionId) : positions;
  if (!step.bassNote) return candidates;
  const bassPitchClass = noteNames.indexOf(step.bassNote);
  const matchingBass = candidates.filter(({ position }) => {
    const played = getAbsoluteFrets(position).flatMap((fret, index) => fret < 0 ? [] : [tuningMidi[index] + fret]);
    return played.length > 0 && Math.min(...played) % 12 === bassPitchClass;
  });
  return matchingBass.length ? matchingBass : candidates;
};

export const optimizeSequence = (sequence, chordDb, options = {}) => {
  if (!sequence.length) return { totalScore: 0, steps: [], transitions: [], missing: [] };
  const shapeWeight = options.shapeWeight === undefined ? DEFAULT_SHAPE_WEIGHT : options.shapeWeight;
  const chordSteps = sequence.map(item => {
    const chord = findShapeChord(chordDb, item);
    const normalizedCustomPosition = item.customPosition ? normalizePlayablePosition(item.customPosition) : null;
    const customPositionIsValid = normalizedCustomPosition && isValidChordShape(item, normalizedCustomPosition);
    const selectedPositionIsValid = Number.isInteger(item.positionIndex) && chord?.positions[item.positionIndex] && isValidChordShape(item, chord.positions[item.positionIndex]);
    const hasValidLibraryShape = chord?.positions.some(position => isValidChordShape(item, position));
    const needsGeneratedPalette = item.suffix !== chord?.suffix || playablePaletteSuffixes.has(item.suffix) || !hasValidLibraryShape;
    const generatedPositions = (!customPositionIsValid && !selectedPositionIsValid && needsGeneratedPalette)
      ? getChordShapeCandidates(item, chordDb).map(candidate => ({
        position: candidate.position,
        positionIndex: candidate.positionIndex,
        shapeSuffix: candidate.shapeSuffix,
        shapeKey: candidate.shapeKey,
        essentialCount: candidate.essentialCount,
        definingToneCount: candidate.definingToneCount,
        custom: candidate.custom
      }))
      : null;
    return { ...item, ...(normalizedCustomPosition ? { customPosition: normalizedCustomPosition } : { customPosition: null }), shapeSuffix: item.shapeSuffix || chord?.suffix || item.suffix, chord, generatedPositions };
  });
  if (chordSteps.some(step => !step.chord || !step.chord.positions.length)) {
    return { totalScore: 0, steps: [], transitions: [], missing: chordSteps.filter(step => !step.chord || !step.chord.positions.length) };
  }
  const generatedShapePenalty = (step, candidate) => step.generatedPositions && Number.isFinite(candidate.essentialCount)
    ? Math.max(0, (chordQualities[step.suffix]?.characteristicIntervals.length || 0) - (candidate.definingToneCount || 0)) * DEFINING_TONE_COVERAGE_WEIGHT
      + Math.max(0, (chordQualities[step.suffix]?.required.length || 0) - candidate.essentialCount) * REQUIRED_TONE_COVERAGE_WEIGHT
    : 0;
  let states = getAllowedPositions(chordSteps[0], options.regionId || chordSteps[0].regionId).map(candidate => {
    const { position, positionIndex } = candidate;
    return {
      score: getShapeComplexity(position) * shapeWeight + getVoicingPreferencePenalty(chordSteps[0], position) + generatedShapePenalty(chordSteps[0], candidate),
      path: [{ ...chordSteps[0], ...candidate, position, positionIndex, shapeSuffix: candidate.shapeSuffix || chordSteps[0].shapeSuffix, movementScore: 0 }],
      transitions: []
    };
  });
  if (!states.length) return { totalScore: 0, steps: [], transitions: [], missing: [chordSteps[0]] };
  for (const step of chordSteps.slice(1)) {
    const availablePositions = getAllowedPositions(step, options.regionId || step.regionId);
    if (!availablePositions.length) return { totalScore: 0, steps: [], transitions: [], missing: [step] };
    states = availablePositions.map(candidate => {
      const { position, positionIndex } = candidate;
      const candidates = states.map(state => {
        const previous = state.path[state.path.length - 1].position;
        const movementScore = getTransitionScore(previous, position);
        return {
          score: state.score + movementScore + getShapeComplexity(position) * shapeWeight + getVoicingPreferencePenalty(step, position) + generatedShapePenalty(step, candidate),
          path: state.path.concat({ ...step, ...candidate, position, positionIndex, shapeSuffix: candidate.shapeSuffix || step.shapeSuffix, movementScore }),
          transitions: state.transitions.concat(movementScore)
        };
      });
      return candidates.reduce((best, candidate) => candidate.score < best.score ? candidate : best);
    });
  }
  const best = states.reduce((currentBest, state) => state.score < currentBest.score ? state : currentBest);
  return { totalScore: best.score, steps: best.path, transitions: best.transitions, missing: [] };
};
