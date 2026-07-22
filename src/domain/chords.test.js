import { analyzeChordVoicing } from './chordTheory';
import { cavaquinhoChords } from './chords';

describe('biblioteca expandida de acordes', () => {
  test('consome o corpus publicado de Bm', () => {
    const chord = cavaquinhoChords.chords.B.find(item => item.suffix === 'minor');
    const analyses = chord.positions.map(position => analyzeChordVoicing({ key: 'B', suffix: 'minor' }, position));
    expect(chord.positions).toHaveLength(8);
    expect(analyses.filter(analysis => analysis.exact)).toHaveLength(7);
    expect(analyses.filter(analysis => analysis.missingNotes.includes('D'))).toHaveLength(1);
  });

  test.each(['m6', 'add9', '7sus4'])('publica %s em todas as tonalidades', (suffix) => {
    Object.values(cavaquinhoChords.chords).forEach(chords => {
      expect(chords.find(chord => chord.suffix === suffix)?.positions.length).toBeGreaterThan(0);
    });
  });

  test('recebe os rótulos em português da dependência', () => {
    expect(cavaquinhoChords.suffixMetadata['7sus4']).toMatchObject({
      label: 'Sétima suspensa com quarta',
      symbol: '7sus4'
    });
  });
});
