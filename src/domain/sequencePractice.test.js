import { describe, expect, test } from 'vitest';
import { advanceSequenceFilm, buildSequencePractice, getSequenceBeatState, getSequenceCarouselItems, getSequenceStructureKey, getSequenceStructureSteps, moveSequenceFilm, normalizePracticeBeats, projectSequencePractice, shapeToFretboardPositions } from './sequencePractice';

const shape = {
  baseFret: 1,
  frets: [2, 0, -1, 2],
  fingers: [2, 0, 0, 3],
  barres: []
};

describe('prática física de sequências', () => {
  test('converte casas pressionadas, corda solta e corda abafada', () => {
    const result = shapeToFretboardPositions(shape);
    expect(result.positions).toMatchObject([
      { stringIndex: 0, fret: 2, midi: 64, note: 'E' },
      { stringIndex: 1, fret: 0, midi: 67, note: 'G' },
      { stringIndex: 3, fret: 2, midi: 76, note: 'E' }
    ]);
    expect(result.mutedStrings).toEqual([2]);
  });

  test('respeita shapes fixados e otimiza os demais acordes', () => {
    const cFirst = { ...shape, frets: [2, 0, 1, 2], fingers: [2, 0, 1, 3], baseFret: 1 };
    const cSecond = { ...shape, frets: [5, 5, 5, 5], fingers: [1, 1, 1, 1], barres: [5], baseFret: 1 };
    const dMinor = { ...shape, frets: [0, 2, 3, 3], fingers: [0, 1, 2, 2], barres: [3], baseFret: 1 };
    const chordDb = { chords: {
      C: [{ suffix: 'major', positions: [cFirst, cSecond] }],
      D: [{ suffix: 'minor', positions: [dMinor] }]
    } };
    const result = buildSequencePractice([
      { id: 'one', key: 'C', suffix: 'major', positionIndex: 1 },
      { id: 'two', key: 'D', suffix: 'minor', positionIndex: null }
    ], chordDb);
    expect(result.missing).toEqual([]);
    expect(result.steps.map(step => step.positionIndex)).toEqual([1, 0]);
    expect(result.steps[0].positions.map(position => position.fret)).toEqual([5, 5, 5, 5]);
  });

  test('mantém a resolução musical ao projetar uma nova escolha de forma', () => {
    const cFirst = { ...shape, frets: [2, 0, 1, 2], fingers: [2, 0, 1, 3], baseFret: 1 };
    const cSecond = { ...shape, frets: [5, 5, 5, 5], fingers: [1, 1, 1, 1], barres: [5], baseFret: 1 };
    const dMinor = { ...shape, frets: [0, 2, 3, 3], fingers: [0, 1, 2, 2], barres: [3], baseFret: 1 };
    const chordDb = { chords: {
      C: [{ suffix: 'major', positions: [cFirst, cSecond] }],
      D: [{ suffix: 'minor', positions: [dMinor] }]
    } };
    const automatic = [
      { id: 'one', key: 'C', suffix: 'major', positionIndex: null },
      { id: 'two', key: 'D', suffix: 'minor', positionIndex: null }
    ];
    const selected = [{ ...automatic[0], positionIndex: 1 }, automatic[1]];

    expect(getSequenceStructureKey(automatic)).toBe(getSequenceStructureKey(selected));
    expect(getSequenceStructureSteps(selected)[0]).not.toHaveProperty('positionIndex');

    const basePractice = buildSequencePractice(getSequenceStructureSteps(automatic), chordDb);
    const baseFrets = basePractice.steps[0].positions.map(position => position.fret);
    const projected = projectSequencePractice(basePractice, selected, chordDb);
    expect(projected.steps[0].positionIndex).toBe(1);
    expect(projected.steps[0].positions.map(position => position.fret)).toEqual([5, 5, 5, 5]);
    expect(projected.steps[0]).not.toBe(basePractice.steps[0]);
    expect(basePractice.steps[0].positions.map(position => position.fret)).toEqual(baseFrets);
  });

  test.each([1, 2, 4])('avança a sequência a cada %i batidas', (beatsPerChord) => {
    expect(getSequenceBeatState(1, 3, beatsPerChord)).toMatchObject({ chordIndex: 0, beatInChord: 1 });
    expect(getSequenceBeatState(beatsPerChord + 1, 3, beatsPerChord)).toMatchObject({ chordIndex: 1, beatInChord: 1 });
    expect(getSequenceBeatState(beatsPerChord * 3 + 1, 3, beatsPerChord)).toMatchObject({ chordIndex: 0, beatInChord: 1 });
  });

  test('avança o filme com uma duração independente por card e repete', () => {
    const durations = [2, 4, 1];
    let state = { cardIndex: 0, beatInCard: 0 };
    const frames = [];
    for (let pulse = 0; pulse < 8; pulse += 1) {
      state = advanceSequenceFilm(state, durations);
      frames.push([state.cardIndex, state.beatInCard]);
    }
    expect(frames).toEqual([[0, 1], [0, 2], [1, 1], [1, 2], [1, 3], [1, 4], [2, 1], [0, 1]]);
  });

  test('normaliza a duração praticável entre uma e dezesseis batidas', () => {
    expect(normalizePracticeBeats(undefined)).toBe(4);
    expect(normalizePracticeBeats(0)).toBe(1);
    expect(normalizePracticeBeats(7)).toBe(7);
    expect(normalizePracticeBeats(99)).toBe(16);
  });

  test.each([
    [1, ['current']],
    [2, ['previous', 'current']],
    [3, ['previous', 'current', 'next']],
    [4, ['previous', 'current', 'next', 'later']],
    [50, ['previous', 'current', 'next', 'later']]
  ])('cria uma janela sem cards duplicados para %i acordes', (stepCount, roles) => {
    const items = getSequenceCarouselItems(0, stepCount);
    expect(items.map(item => item.role)).toEqual(roles);
    expect(new Set(items.map(item => item.index)).size).toBe(items.length);
  });

  test('navega manualmente e reinicia a duração do card', () => {
    expect(moveSequenceFilm({ cardIndex: 0, beatInCard: 3 }, -1, 4)).toMatchObject({ cardIndex: 3, beatInCard: 0 });
    expect(moveSequenceFilm({ cardIndex: 3, beatInCard: 2 }, 1, 4)).toMatchObject({ cardIndex: 0, beatInCard: 0 });
  });

  test('após a abertura, retorna ao segundo acorde do quadradinho', () => {
    const durations = Array(9).fill(1);
    let state = { cardIndex: 8, beatInCard: 1, hasCompletedFirstPass: false };
    state = advanceSequenceFilm(state, durations, 1);
    expect(state).toMatchObject({ cardIndex: 1, beatInCard: 1, hasCompletedFirstPass: true });
    expect(getSequenceCarouselItems(8, 9, 1, false).map(item => item.index)).toEqual([7, 8, 1, 2]);
    expect(moveSequenceFilm(state, -1, 9, 1)).toMatchObject({ cardIndex: 8, beatInCard: 0 });
  });
});
