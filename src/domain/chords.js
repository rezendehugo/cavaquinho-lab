import rawCavaquinhoChords from '@tombatossals/chords-db/lib/cavaquinho.json';
import { findChord } from '../progressionOptimizer';
import { suffixCycle } from '../sequences';

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

const sortPositionsByFirstFret = (positions) => positions
  .map((position, index) => ({ position: clonePosition(position), index, firstFret: getFirstPlayedFret(position) }))
  .sort((a, b) => a.firstFret - b.firstFret || a.index - b.index)
  .map(entry => entry.position);

const sortChordLibrary = (library) => ({
  ...library,
  chords: Object.fromEntries(Object.entries(library.chords).map(([key, chords]) => [
    key,
    chords.map(chord => ({
      ...chord,
      positions: sortPositionsByFirstFret(chord.positions || [])
    }))
  ]))
});

export const cavaquinhoChords = sortChordLibrary(rawCavaquinhoChords);

export const cavaquinhoTuning = ['D', 'G', 'B', 'D'];

export const getAvailableSuffixes = (key) => suffixCycle.filter(suffix => findChord(cavaquinhoChords, key, suffix)?.positions.length > 0);
