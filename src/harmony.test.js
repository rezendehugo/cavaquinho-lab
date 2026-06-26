import { analyzeSequence, buildExercises, getColorForChord } from './harmony';

describe('harmonia', () => {
  test('analisa Ebmaj7 D7 Gm em contexto de G menor', () => {
    const sequence = [
      { id: 'a', key: 'Eb', suffix: 'maj7', bass: '' },
      { id: 'b', key: 'D', suffix: '7', bass: '' },
      { id: 'c', key: 'G', suffix: 'minor', bass: '' }
    ];
    const analysis = analyzeSequence(sequence, []);
    expect(analysis.keyCenter.label).toBe('G menor');
    expect(analysis.chords.map(chord => chord.numeral)).toEqual(['bVImaj7', 'V7', 'i']);
    expect(buildExercises(sequence, analysis, [])).toHaveLength(8);
    expect(getColorForChord(sequence[1], analysis.chords[1], 'funcao', analysis.keyCenter)).toBe('#d95d39');
  });
});