import { noteNames } from '../chordDisplay';
import { getAbsoluteFrets, optimizeSequence } from '../progressionOptimizer';
import { cavaquinhoOpenMidi } from './scalePaths';
import { getNextPracticeIndex } from './sequencePresets';

export const normalizePracticeBeats = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  return Math.min(16, Math.max(1, Math.round(parsed)));
};

export const advanceSequenceFilm = (state, durations, loopStartIndex = 0) => {
  if (!durations.length) return { cardIndex: 0, beatInCard: 0 };
  const cardIndex = Math.min(state.cardIndex, durations.length - 1);
  const duration = normalizePracticeBeats(durations[cardIndex]);
  if (state.beatInCard < duration) return { ...state, cardIndex, beatInCard: state.beatInCard + 1 };
  const nextIndex = getNextPracticeIndex(cardIndex, durations.length, loopStartIndex);
  return { cardIndex: nextIndex, beatInCard: 1, hasCompletedFirstPass: state.hasCompletedFirstPass || cardIndex === durations.length - 1 };
};

export const moveSequenceFilm = (state, direction, stepCount, loopStartIndex = 0) => {
  if (stepCount < 1) return { cardIndex: 0, beatInCard: 0 };
  const completed = Boolean(state.hasCompletedFirstPass);
  const normalizedLoop = Math.min(stepCount - 1, Math.max(0, loopStartIndex));
  const nextIndex = direction > 0
    ? getNextPracticeIndex(state.cardIndex, stepCount, normalizedLoop)
    : completed && state.cardIndex === normalizedLoop ? stepCount - 1 : (state.cardIndex - 1 + stepCount) % stepCount;
  return {
    cardIndex: nextIndex,
    beatInCard: 0,
    hasCompletedFirstPass: completed || (direction > 0 && state.cardIndex === stepCount - 1)
  };
};

export const getSequenceCarouselItems = (currentIndex, stepCount, loopStartIndex = 0, hasCompletedFirstPass = false) => {
  if (stepCount < 1) return [];
  const normalizedCurrent = (currentIndex + stepCount) % stepCount;
  const next = getNextPracticeIndex(normalizedCurrent, stepCount, loopStartIndex);
  const later = getNextPracticeIndex(next, stepCount, loopStartIndex);
  const previous = hasCompletedFirstPass && normalizedCurrent === loopStartIndex
    ? stepCount - 1
    : (normalizedCurrent - 1 + stepCount) % stepCount;
  const candidates = [
    { index: previous, role: 'previous' },
    { index: normalizedCurrent, role: 'current' },
    { index: next, role: 'next' },
    { index: later, role: 'later' }
  ];
  const used = new Set();
  return candidates.filter(item => {
    if (item.role !== 'current' && item.index === normalizedCurrent) return false;
    if (used.has(item.index)) return false;
    used.add(item.index);
    return true;
  });
};

export const shapeToFretboardPositions = (shape) => {
  if (!shape || !Array.isArray(shape.frets)) return { positions: [], mutedStrings: [] };
  const absoluteFrets = getAbsoluteFrets(shape);
  const positions = [];
  const mutedStrings = [];
  absoluteFrets.forEach((fret, stringIndex) => {
    if (fret < 0) {
      mutedStrings.push(stringIndex);
      return;
    }
    const midi = cavaquinhoOpenMidi[stringIndex] + fret;
    positions.push({
      stringIndex,
      fret,
      midi,
      pitchClass: midi % 12,
      note: noteNames[midi % 12],
      octave: Math.floor(midi / 12) - 1
    });
  });
  return { positions, mutedStrings };
};

export const buildSequencePractice = (steps, chordDb) => {
  const optimized = optimizeSequence(steps, chordDb);
  if (optimized.missing.length) return { steps: [], missing: optimized.missing };
  return {
    missing: [],
    steps: optimized.steps.map(step => ({
      ...step,
      ...shapeToFretboardPositions(step.position)
    }))
  };
};

export const getSequenceBeatState = (pulse, stepCount, beatsPerChord) => {
  if (pulse < 1 || stepCount < 1 || ![1, 2, 4].includes(beatsPerChord)) {
    return { chordIndex: 0, beatInChord: 0, beatsRemaining: beatsPerChord };
  }
  const elapsed = pulse - 1;
  return {
    chordIndex: Math.floor(elapsed / beatsPerChord) % stepCount,
    beatInChord: (elapsed % beatsPerChord) + 1,
    beatsRemaining: beatsPerChord - (elapsed % beatsPerChord)
  };
};
