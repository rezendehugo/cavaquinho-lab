import cavaquinhoChords from '@tombatossals/chords-db/lib/cavaquinho.json';
import { findChord } from '../progressionOptimizer';
import { suffixCycle } from '../sequences';

export { cavaquinhoChords };

export const cavaquinhoTuning = ['D', 'G', 'B', 'D'];

export const getAvailableSuffixes = (key) => suffixCycle.filter(suffix => findChord(cavaquinhoChords, key, suffix)?.positions.length > 0);
