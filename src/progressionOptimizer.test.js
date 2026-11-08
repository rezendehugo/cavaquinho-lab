import { getCavaquinhoChords } from './domain/chords';
import { getAbsoluteFrets, getChordShapeCandidates, getFavoriteShapeSimilarity, getPhysicalPitchClasses, getShapeCandidateRankingScore, getShapeFamilySignature, getTransitionScore, groupChordShapeCandidates, hasPlausibleFingerAssignment, isValidChordShape, optimizeSequence, userValidatedFretKeys } from './progressionOptimizer';

const cavaquinhoChords = getCavaquinhoChords();

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

  test('rejects finger assignments that ask one finger to hold different frets', () => {
    expect(hasPlausibleFingerAssignment({ frets: [2, 1, 3, 2], baseFret: 1, fingers: [1, 1, 2, 3] })).toBe(false);
    expect(hasPlausibleFingerAssignment({ frets: [2, 1, 3, 2], baseFret: 1, fingers: [0, 0, 0, 0] })).toBe(true);
  });

  test('keeps the six user-validated shapes as positive examples and applies only explicit exclusions', () => {
    const cSharpDim = { key: 'Db', displayKey: 'C#', suffix: 'dim' };
    const cSharpDimSignature = getShapeFamilySignature({ frets: [2, 6, 2, 5], baseFret: 1 });
    const emSignature = getShapeFamilySignature({ frets: [5, 9, 5, 5], baseFret: 1 });

    expect(cSharpDimSignature).toBe('1.5.1.4');
    expect(emSignature).toBe('1.5.1.1');
    expect(getShapeFamilySignature({ frets: [4, 8, 4, 7], baseFret: 1 })).toBe(cSharpDimSignature);
    expect(userValidatedFretKeys).toEqual(expect.arrayContaining([
      '5,4,5,5', '5,7,5,8', '5,9,5,5', '7,11,7,7', '2,6,2,5'
    ]));
    const acceptedCSharpDim = getChordShapeCandidates(cSharpDim, cavaquinhoChords);
    const acceptedEm = getChordShapeCandidates({ key: 'E', suffix: 'minor' }, cavaquinhoChords);
    expect(acceptedCSharpDim.some(candidate => candidate.fretKey === '2,6,2,5')).toBe(true);
    expect(acceptedEm.some(candidate => candidate.fretKey === '5,9,5,5')).toBe(true);
    const remaining = getChordShapeCandidates(cSharpDim, cavaquinhoChords, { rejectedShapeSignatures: [cSharpDimSignature] });
    expect(remaining.every(candidate => getShapeFamilySignature(candidate.position) !== cSharpDimSignature)).toBe(true);
    const transposedDim = getChordShapeCandidates({ key: 'D', suffix: 'dim' }, cavaquinhoChords);
    expect(transposedDim.some(candidate => candidate.fretKey === '3,7,3,6')).toBe(true);
    expect(getChordShapeCandidates({ key: 'D', suffix: 'dim' }, cavaquinhoChords, { rejectedShapeSignatures: [cSharpDimSignature] })
      .some(candidate => candidate.fretKey === '3,7,3,6')).toBe(false);
    const transposedEm = getChordShapeCandidates({ key: 'F', suffix: 'minor' }, cavaquinhoChords, { rejectedShapeSignatures: [emSignature] });
    expect(transposedEm.every(candidate => getShapeFamilySignature(candidate.position) !== emSignature)).toBe(true);
  });

  test('uses transposed favorite grips as positive examples for ranking', () => {
    const favorite = getFavoriteShapeSimilarity({ frets: [2, 6, 2, 5], baseFret: 1 }, ['4,8,4,7']);
    const unrelated = getFavoriteShapeSimilarity({ frets: [0, 1, 0, 2], baseFret: 1 }, ['4,8,4,7']);
    expect(favorite).toBe(30);
    expect(favorite).toBeGreaterThan(unrelated);
  });

  test('keeps the open E7 string and removes its redundant muted-string duplicate', () => {
    const step = { key: 'E', suffix: '7' };
    const candidates = getChordShapeCandidates(step, cavaquinhoChords);
    const groups = groupChordShapeCandidates(candidates);
    const open = candidates.find(candidate => candidate.fretKey === '2,1,3,0');
    const muted = candidates.find(candidate => candidate.fretKey === '2,1,3,-1');
    expect(open).toBeDefined();
    expect(muted).toBeDefined();

    expect(groups.some(group => group.variants.some(variant => variant.fretKey === open.fretKey))).toBe(true);
    expect(groups.some(group => group.variants.some(variant => variant.fretKey === muted.fretKey))).toBe(false);
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

  test('ranks the matching Dm7 grip first after the selected Em7 grip moves down two frets', () => {
    const em7 = cavaquinhoChords.chords.E.find(chord => chord.suffix === 'm7');
    const em7Position = em7.positions.find(position => getAbsoluteFrets(position).join(',') === '5,4,3,2');
    const nextDmaj7Position = optimizeSequence([{ key: 'D', suffix: 'maj7' }], cavaquinhoChords).steps[0].position;
    expect(em7Position).toBeDefined();

    const dm7 = getChordShapeCandidates({ key: 'D', suffix: 'm7' }, cavaquinhoChords, {
      previousPosition: em7Position,
      nextPosition: nextDmaj7Position
    });
    expect(dm7[0]?.fretKey).toBe('3,2,1,0');
  });

  test('scores a candidate against both the selected previous and estimated next chord shapes', () => {
    const em7Position = cavaquinhoChords.chords.E.find(chord => chord.suffix === 'm7').positions
      .find(position => getAbsoluteFrets(position).join(',') === '5,4,3,2');
    const nextDmaj7Position = cavaquinhoChords.chords.D.find(chord => chord.suffix === 'maj7').positions[0];
    const candidates = getChordShapeCandidates({ key: 'D', suffix: 'm7' }, cavaquinhoChords, {
      previousPosition: em7Position,
      nextPosition: nextDmaj7Position
    });
    const candidate = candidates.find(item => item.fretKey === '3,2,1,0');

    expect(candidate.movementScore).toBe(
      getTransitionScore(em7Position, candidate.position) + getTransitionScore(candidate.position, nextDmaj7Position)
    );
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
