import rawCavaquinhoChords from '@tombatossals/chords-db/lib/cavaquinho.json';
import { findChord } from '../progressionOptimizer';
import { suffixCycle } from '../sequences';
import { positionMatchesChordExactly } from './chordTheory';
import { applyKnownChordCorrections } from './chordCorrections';

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

const positionIdentity = (position) => [position.baseFret || 1, ...(position.frets || []), ...(position.midi || [])].join(':');

const expandExactEquivalentVoicings = (library) => {
  const sources = Object.entries(library.chords).flatMap(([sourceKey, chords]) => chords.flatMap(chord =>
    (chord.positions || []).map(position => ({ sourceKey, sourceSuffix: chord.suffix, position }))));
  return {
    ...library,
    chords: Object.fromEntries(Object.entries(library.chords).map(([key, chords]) => {
      const expanded = suffixCycle.map(suffix => {
        const stored = chords.find(chord => chord.suffix === suffix);
        const positions = stored?.positions || [];
        const existing = new Set(positions.map(positionIdentity));
        const candidates = sources.filter(source => positionMatchesChordExactly(source.position, key, suffix));
        const additions = [...new Map(candidates
          .filter(source => !existing.has(positionIdentity(source.position)))
          .map(source => [positionIdentity(source.position), {
            ...clonePosition(source.position),
            provenance: { type: 'exact-equivalent', sourceKey: source.sourceKey, sourceSuffix: source.sourceSuffix }
          }])).values()];
        if (!stored && !additions.length) return null;
        return { ...(stored || { suffix, derived: true }), positions: sortPositionsByFirstFret(positions.concat(additions)) };
      }).filter(Boolean);
      return [key, expanded];
    }))
  };
};

export const cavaquinhoChords = expandExactEquivalentVoicings(applyKnownChordCorrections(sortChordLibrary(rawCavaquinhoChords)));

export const cavaquinhoTuning = ['D', 'G', 'B', 'D'];

export const getAvailableSuffixes = (key) => suffixCycle.filter(suffix => findChord(cavaquinhoChords, key, suffix)?.positions.length > 0);
