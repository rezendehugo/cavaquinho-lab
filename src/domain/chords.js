import rawCavaquinhoChords from '@tombatossals/chords-db/lib/cavaquinho.json';
import { findChord, findShapeChord } from '../progressionOptimizer';
import { suffixCycle } from '../sequences';
import { analyzeChordVoicing, getVoicingPreferenceRank } from './chordTheory';

const getAbsoluteFrets = (position) => {
  const baseFret = position.baseFret || 1;
  return position.frets.map(fret => fret <= 0 ? fret : baseFret + fret - 1);
};

const getFirstPlayedFret = (position) => {
  const playedFrets = getAbsoluteFrets(position).filter(fret => fret >= 0);
  return playedFrets.length ? Math.min(...playedFrets) : Number.POSITIVE_INFINITY;
};

const clonePosition = (position) => ({
  ...position,
  frets: [...position.frets],
  fingers: [...position.fingers],
  barres: Array.isArray(position.barres) ? [...position.barres] : position.barres
});

const sortPositions = (key, suffix, positions) => positions
  .map((position, index) => ({
    position: clonePosition(position),
    index,
    firstFret: getFirstPlayedFret(position),
    voicingRank: getVoicingPreferenceRank(analyzeChordVoicing({ key, suffix }, position))
  }))
  .sort((a, b) => a.voicingRank - b.voicingRank || a.firstFret - b.firstFret || a.index - b.index)
  .map(entry => entry.position);

const sortChordLibrary = (library) => ({
  ...library,
  chords: Object.fromEntries(Object.entries(library.chords).map(([key, chords]) => [
    key,
    chords.map(chord => ({
      ...chord,
      positions: sortPositions(key, chord.suffix, chord.positions || [])
    }))
  ]))
});

let preparedCavaquinhoChords;

export const getCavaquinhoChords = () => {
  if (!preparedCavaquinhoChords) preparedCavaquinhoChords = sortChordLibrary(rawCavaquinhoChords);
  return preparedCavaquinhoChords;
};

export const cavaquinhoTuning = ['D', 'G', 'B', 'D'];

export const getAvailableSuffixes = (key, chordDb = getCavaquinhoChords()) => suffixCycle.filter(suffix => findChord(chordDb, key, suffix)?.positions.length > 0 || findShapeChord(chordDb, { key, suffix })?.positions.length > 0);
export const getShapeSourceOptions = (step, chordDb = getCavaquinhoChords()) => {
  const options = [step.suffix];
  if (['9', '13', '7b13', '7b9', 'add9'].includes(step.suffix)) options.push('7');
  return [...new Set(options)].filter(suffix => findChord(chordDb, step.key, suffix)?.positions.length > 0);
};

export const sanitizeSequenceShapeIndexes = (sequences) => sequences.map(sequence => ({
  ...sequence,
  steps: sequence.steps.map(step => {
    const chord = findShapeChord(getCavaquinhoChords(), step);
    const validIndex = Number.isInteger(step.positionIndex) && step.positionIndex >= 0 && step.positionIndex < (chord?.positions.length || 0);
    return validIndex ? step : { ...step, positionIndex: null };
  })
}));
