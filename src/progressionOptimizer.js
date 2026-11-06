import { noteNames } from './chordDisplay';
import { analyzeChordVoicing, chordQualities, getChordPitchClasses, getChordRootPitchClass, getVoicingPreferenceRank } from './domain/chordTheory';
import { normalizeCustomPosition } from './domain/customChordShape';
import { MAX_FRET } from './domain/scalePaths';

const DEFAULT_SHAPE_WEIGHT = 0.08;
const VOICING_PREFERENCE_WEIGHT = 20;
const DEFINING_TONE_COVERAGE_WEIGHT = 10000;
const REQUIRED_TONE_COVERAGE_WEIGHT = 1000;
export const MAX_VISIBLE_FRET = MAX_FRET;
const tuningMidi = [62, 67, 71, 74];
const MAX_CACHED_PALETTES_PER_LIBRARY = 32;
const chordShapePaletteCache = new WeakMap();

const getVoicingPreferencePenalty = (step, position) =>
  getVoicingPreferenceRank(analyzeChordVoicing(step, position)) * VOICING_PREFERENCE_WEIGHT;

export const getAbsoluteFrets = (position) => {
  const baseFret = position.baseFret || 1;
  return position.frets.map(fret => fret <= 0 ? fret : baseFret + fret - 1);
};

export const hasPlayableFretSpan = (position, maximumSpan = 4) => {
  const fretted = getAbsoluteFrets(position).filter(fret => fret > 0);
  return fretted.length < 2 || Math.max(...fretted) - Math.min(...fretted) <= maximumSpan;
};

export const getPhysicalPitchClasses = position => {
  if (!position?.frets || position.frets.length !== tuningMidi.length) return [];
  return [...new Set(getAbsoluteFrets(position).flatMap((fret, index) =>
    fret < 0 ? [] : [(tuningMidi[index] + fret) % 12]
  ))];
};

export const isValidChordShape = (step, position) => {
  if (!step || !position?.frets || position.frets.length !== 4) return false;
  const frets = getAbsoluteFrets(position);
  if (frets.some(fret => !Number.isInteger(fret) || fret < -1 || fret > MAX_VISIBLE_FRET)) return false;
  if (!frets.some(fret => fret >= 0) || !hasPlayableFretSpan({ ...position, baseFret: 1, frets })) return false;
  const played = getPhysicalPitchClasses({ ...position, baseFret: 1, frets });
  const chordTones = new Set(getChordPitchClasses(step.displayKey || step.key, step.suffix));
  return played.length > 0 && played.every(pitch => chordTones.has(pitch));
};

const positionFromFrets = (frets, fingers = [0, 0, 0, 0]) => normalizeCustomPosition({ frets, fingers });

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
  - (candidate.isPreferred ? 4 : 0)
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
  const fromAnchors = getFingerAnchors(fromPosition);
  const toAnchors = getFingerAnchors(toPosition);
  const fingers = new Set([...Object.keys(fromAnchors), ...Object.keys(toAnchors)]);
  const fromFrets = getAbsoluteFrets(fromPosition);
  const toFrets = getAbsoluteFrets(toPosition);
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

  const customPosition = step.customPosition ? normalizeCustomPosition(step.customPosition) : null;
  if (customPosition && isValidChordShape(step, customPosition)) {
    return {
      chord,
      position: customPosition,
      positionIndex: null,
      shapeSuffix: step.shapeSuffix || chord.suffix,
      custom: true
    };
  }

  if (!Number.isInteger(step.positionIndex) || !chord.positions[step.positionIndex]) return null;
  const sourcePosition = chord.positions[step.positionIndex];
  const position = positionFromFrets(getAbsoluteFrets(sourcePosition), sourcePosition.fingers);
  if (!isValidChordShape(step, position)) return null;
  return {
    chord,
    position,
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

export const getChordShapeCandidates = (step, chordDb, { previousPosition = null, preferredFretKeys = [] } = {}) => {
  if (!step || !chordDb?.chords) return [];
  const previousRegion = previousPosition ? getPositionRegion(previousPosition) : null;
  const preferred = new Set(preferredFretKeys);
  const candidates = getCachedBasePalette(step, chordDb).map(candidate => ({
    ...candidate,
    position: {
      ...candidate.position,
      frets: [...candidate.position.frets],
      fingers: [...candidate.position.fingers],
      barres: [...(candidate.position.barres || [])],
      midi: [...(candidate.position.midi || [])]
    },
    isPreferred: preferred.has(candidate.fretKey),
    movementScore: previousPosition ? getTransitionScore(previousPosition, candidate.position) : 0,
    regionDistance: previousRegion === null ? 0 : Math.abs(previousRegion - getPositionRegion(candidate.position))
  }));
  return candidates.sort((left, right) =>
    getShapeCandidateRankingScore(left) - getShapeCandidateRankingScore(right) ||
    right.playedCount - left.playedCount ||
    getShapeComplexity(left.position) - getShapeComplexity(right.position) ||
    left.fretKey.localeCompare(right.fretKey)
  );
};

const getAllowedPositions = (step) => {
  if (step.customPosition?.frets?.length === 4 && isValidChordShape(step, step.customPosition)) return [{ position: step.customPosition, positionIndex: step.positionIndex ?? null, custom: true }];
  const positions = step.chord.positions.map((sourcePosition, positionIndex) => ({
    sourcePosition, positionIndex,
    position: positionFromFrets(getAbsoluteFrets(sourcePosition), sourcePosition.fingers)
  })).filter(candidate => isValidChordShape(step, candidate.position));
  const selectedPosition = positions.find(candidate => candidate.positionIndex === step.positionIndex);
  if (Number.isInteger(step.positionIndex) && selectedPosition) return [selectedPosition];
  if (step.generatedPositions?.length) return step.generatedPositions;
  const candidates = positions;
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
    const normalizedCustomPosition = item.customPosition ? normalizeCustomPosition(item.customPosition) : null;
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
  let states = getAllowedPositions(chordSteps[0]).map(candidate => {
    const { position, positionIndex } = candidate;
    return {
      score: getShapeComplexity(position) * shapeWeight + getVoicingPreferencePenalty(chordSteps[0], position) + generatedShapePenalty(chordSteps[0], candidate),
      path: [{ ...chordSteps[0], ...candidate, position, positionIndex, shapeSuffix: candidate.shapeSuffix || chordSteps[0].shapeSuffix, movementScore: 0 }],
      transitions: []
    };
  });
  chordSteps.slice(1).forEach(step => {
    states = getAllowedPositions(step).map(candidate => {
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
  });
  const best = states.reduce((currentBest, state) => state.score < currentBest.score ? state : currentBest);
  return { totalScore: best.score, steps: best.path, transitions: best.transitions, missing: [] };
};
