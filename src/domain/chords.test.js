import { analyzeChordVoicing } from './chordTheory';
import { cavaquinhoChords } from './chords';
import { historicalVoicingCount } from './chordCorrections';

describe('expansão segura da biblioteca de acordes', () => {
  test('restaura o corpus de Bm e mantém a opção com omissão', () => {
    const chord = cavaquinhoChords.chords.B.find(item => item.suffix === 'minor');
    const analyses = chord.positions.map(position => analyzeChordVoicing({ key: 'B', suffix: 'minor' }, position));
    expect(chord.positions).toHaveLength(8);
    expect(analyses.filter(analysis => analysis.exact)).toHaveLength(7);
    expect(analyses.filter(analysis => analysis.missingNotes.includes('D'))).toHaveLength(1);
    expect(chord.positions.filter(position => position.provenance?.type === 'historical')).toHaveLength(6);
  });

  test('reutiliza somente voicings com o mesmo conjunto exato de notas', () => {
    const reused = Object.entries(cavaquinhoChords.chords).flatMap(([key, chords]) => chords.flatMap(chord =>
      chord.positions.filter(position => position.provenance?.type === 'exact-equivalent')
        .map(position => ({ key, suffix: chord.suffix, position }))));
    expect(reused.length).toBeGreaterThan(300);
    expect(reused.every(item => analyzeChordVoicing(item, item.position).exact)).toBe(true);
  });

  test('restaura todo o corpus histórico que ainda corresponde exatamente ao acorde', () => {
    const restored = Object.entries(cavaquinhoChords.chords).flatMap(([key, chords]) => chords.flatMap(chord =>
      chord.positions.filter(position => position.provenance?.type === 'historical')
        .map(position => ({ key, suffix: chord.suffix, position }))));
    expect(restored).toHaveLength(historicalVoicingCount);
    expect(restored.every(item => analyzeChordVoicing(item, item.position).exact)).toBe(true);
  });
});
