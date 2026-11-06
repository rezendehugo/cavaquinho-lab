import { cavaquinhoChords } from './domain/chords';
import { getAbsoluteFrets, getChordShapeCandidates, getPhysicalPitchClasses, getShapeCandidateRankingScore, isValidChordShape, optimizeSequence } from './progressionOptimizer';

const absFrets = position => getAbsoluteFrets(position);

const createCountingChordDb = frets => {
  let chordReads = 0;
  return {
    get chordReads() { return chordReads; },
    get chords() {
      chordReads += 1;
      return {
        B: [{ suffix: '7', positions: [{ frets, fingers: [1, 2, 0, 3], baseFret: 1 }] }]
      };
    }
  };
};

describe('physical shape validation and chord palette', () => {
  test('rejects a stale custom shape using physical D-G-B-D notes, even when cached MIDI is plausible', () => {
    const step = { key: 'G', suffix: 'm6' };
    const stale = { frets: [3, 2, 2, 1], baseFret: 1, midi: [67, 70, 74, 76] };
    expect(isValidChordShape(step, stale)).toBe(false);
    const result = optimizeSequence([{ ...step, customPosition: { frets: stale.frets } }], cavaquinhoChords);
    expect(result.steps).toHaveLength(1);
    expect(isValidChordShape(step, result.steps[0].position)).toBe(true);
  });

  test('rejects muted, out-of-chord, too-wide, and invisible fretboard shapes', () => {
    const step = { key: 'B', suffix: '7b9' };
    expect(isValidChordShape(step, { frets: [-1, -1, -1, -1], baseFret: 1 })).toBe(false);
    expect(isValidChordShape(step, { frets: [0, 0, 0, 0], baseFret: 1 })).toBe(false);
    expect(isValidChordShape(step, { frets: [1, 2, 1, 15], baseFret: 1 })).toBe(false);
    expect(isValidChordShape(step, { frets: [1, 7, 1, 4], baseFret: 1 })).toBe(false);
  });

  test('accepts playable voicings at frets 13–14 and rejects frets beyond the visible range', () => {
    const step = { key: 'B', suffix: '7b9' };
    const highVoicing = { frets: [13, 14, 13, 13], baseFret: 1 };
    expect(getPhysicalPitchClasses(highVoicing).sort((a, b) => a - b)).toEqual([0, 3, 9]);
    expect(isValidChordShape(step, highVoicing)).toBe(true);
    expect(isValidChordShape(step, { frets: [13, 14, 13, 15], baseFret: 1 })).toBe(false);
    const candidates = getChordShapeCandidates(step, cavaquinhoChords);
    const highCandidate = candidates.find(candidate => candidate.fretKey === '13,14,13,13');
    const lowCandidate = candidates.find(candidate => candidate.fretKey === '1,2,1,4');
    expect(highCandidate?.generated).toBe(true);
    expect(highCandidate.definingToneCount).toBe(2);
    expect(lowCandidate.definingToneCount).toBe(2);
    expect(getShapeCandidateRankingScore(lowCandidate)).toBeLessThan(getShapeCandidateRankingScore(highCandidate));
  });

  test('accepts partial voicings only when every sounding note is a chord tone', () => {
    const step = { key: 'B', suffix: '7b9' };
    expect(isValidChordShape(step, { frets: [1, -1, 1, -1], baseFret: 1 })).toBe(true);
    expect(isValidChordShape(step, { frets: [1, 2, 0, 4], baseFret: 1 })).toBe(true);
  });

  test('generates B7b9 1-2-1-4 as a one-string semitone change from B7 1-2-0-4', () => {
    const step = { key: 'B', suffix: '7b9' };
    const candidates = getChordShapeCandidates(step, cavaquinhoChords);
    const target = candidates.find(candidate => candidate.fretKey === '1,2,1,4');
    expect(target).toBeDefined();
    expect(target.generated).toBe(true);
    expect(target.sourceDistance).toBe(1);
    expect(getPhysicalPitchClasses(target.position).sort((a, b) => a - b)).toEqual([0, 3, 6, 9]);
    expect(target.essentialCount).toBe(3);
    expect(isValidChordShape(step, target.position)).toBe(true);
    expect(target.fretKey.split(',').filter((fret, index) => fret !== '1,2,0,4'.split(',')[index])).toHaveLength(1);
    expect(candidates.every(candidate => absFrets(candidate.position).every(fret => fret <= 14))).toBe(true);
  });

  test('reuses base palette work while recalculating movement and preference for each request', () => {
    const step = { key: 'B', suffix: '7b9' };
    const chordDb = createCountingChordDb([1, 2, 0, 4]);
    const first = getChordShapeCandidates(step, chordDb);
    const readsAfterBuild = chordDb.chordReads;
    const second = getChordShapeCandidates(step, chordDb);

    expect(readsAfterBuild).toBeGreaterThan(1);
    expect(chordDb.chordReads - readsAfterBuild).toBe(1);
    expect(second.map(candidate => candidate.fretKey)).toEqual(first.map(candidate => candidate.fretKey));

    const target = first.find(candidate => candidate.fretKey === '1,2,1,4');
    const contextual = getChordShapeCandidates(step, chordDb, {
      previousPosition: target.position,
      preferredFretKeys: [target.fretKey]
    });
    const contextualTarget = contextual.find(candidate => candidate.fretKey === target.fretKey);
    expect(chordDb.chordReads - readsAfterBuild).toBe(2);
    expect(contextualTarget.isPreferred).toBe(true);
    expect(contextualTarget.movementScore).toBe(0);
    expect(contextualTarget.position).not.toBe(target.position);
    expect(contextualTarget.position.frets).not.toBe(target.position.frets);
  });

  test('keeps palette results isolated by chord-library object identity', () => {
    const step = { key: 'B', suffix: '7b9' };
    const libraryWithMovableB7 = createCountingChordDb([1, 2, 0, 4]);
    const libraryWithNativeB7b9 = createCountingChordDb([1, 2, 1, 4]);
    const movableCandidate = getChordShapeCandidates(step, libraryWithMovableB7)
      .find(candidate => candidate.fretKey === '1,2,1,4');
    const nativeCandidate = getChordShapeCandidates(step, libraryWithNativeB7b9)
      .find(candidate => candidate.fretKey === '1,2,1,4');

    expect(movableCandidate.generated).toBe(true);
    expect(nativeCandidate.generated).toBeUndefined();
    expect(nativeCandidate.custom).toBe(false);
    expect(libraryWithMovableB7.chordReads).toBeGreaterThan(1);
    expect(libraryWithNativeB7b9.chordReads).toBeGreaterThan(1);
  });
});
