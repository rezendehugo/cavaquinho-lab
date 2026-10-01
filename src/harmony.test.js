import { analyzeSequence, buildExercises, getColorForChord } from './harmony';

describe('harmonia', () => {
  test('analisa Ebmaj7 D7 Gm em contexto de G menor', () => {
    const sequence = [
      { id: 'a', key: 'Eb', suffix: 'maj7' },
      { id: 'b', key: 'D', suffix: '7' },
      { id: 'c', key: 'G', suffix: 'minor' }
    ];
    const analysis = analyzeSequence(sequence, []);
    expect(analysis.keyCenter.label).toBe('G menor');
    expect(analysis.chords.map(chord => chord.numeral)).toEqual(['bVImaj7', 'V7', 'i']);
    expect(buildExercises(sequence, analysis, [])).toHaveLength(7);
    expect(getColorForChord(sequence[1], analysis.chords[1], 'funcao', analysis.keyCenter)).toBe('#d95d39');
  });

  test('explica campo harmônico, substituições e movimento das formas', () => {
    const sequence = [
      { id: 'a', key: 'D', suffix: 'minor' },
      { id: 'b', key: 'G', suffix: '7' },
      { id: 'c', key: 'C', suffix: 'major' }
    ];
    const optimized = [
      { position: { midi: [62, 65, 69, 74] }, movementScore: 0 },
      { position: { midi: [62, 65, 67, 71] }, movementScore: 10 },
      { position: { midi: [60, 64, 67, 72] }, movementScore: 36 }
    ];
    const analysis = analyzeSequence(sequence, optimized, { tonic: 'C', mode: 'maior' });
    expect(analysis.harmonicField).toHaveLength(7);
    expect(analysis.chords.map(chord => chord.numeral)).toEqual(['ii', 'V7', 'I']);
    expect(analysis.chords[2].substitutions.map(chord => chord.key)).toEqual(expect.arrayContaining(['E', 'A']));
    expect(analysis.chords[0].commonTones).toEqual(expect.arrayContaining(['D', 'F']));
    expect(analysis.chords[1].movementAdvice).toContain('Troca próxima');
    expect(analysis.chords[2].movementAdvice).toContain('Troca ampla');
  });
});


test('as pistas convidam à escuta sem transformar o último acorde em resolução garantida', () => {
  const sequence = [{ id: 'a', key: 'E', suffix: '7' }, { id: 'b', key: 'D', suffix: '7' }];
  const shapes = [
    { ...sequence[0], position: { midi: [64, 68, 71, 74] } },
    { ...sequence[1], position: { midi: [62, 66, 69, 72] } }
  ];
  const exercises = buildExercises(sequence, analyzeSequence(sequence, shapes), shapes);
  expect(exercises[0].answer).toContain('E7, D7');
  expect(exercises[1].answer).toContain('não define, sozinho');
  expect(exercises[2].answer).toContain('E7 para D7: D');
  expect(exercises[3].answer).toBe('E, G#, B, D');
});
