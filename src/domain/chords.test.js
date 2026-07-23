import { analyzeChordVoicing } from './chordTheory';
import { cavaquinhoChords, getAvailableSuffixes } from './chords';

describe('biblioteca expandida de acordes', () => {
  test('consome o corpus publicado de Bm', () => {
    const chord = cavaquinhoChords.chords.B.find(item => item.suffix === 'minor');
    const analyses = chord.positions.map(position => analyzeChordVoicing({ key: 'B', suffix: 'minor' }, position));
    expect(chord.positions).toHaveLength(8);
    expect(analyses.filter(analysis => analysis.exact)).toHaveLength(7);
    expect(analyses.filter(analysis => analysis.missingNotes.includes('D'))).toHaveLength(1);
  });

  test.each(['m6', 'add9', '7sus4', '69'])('publica %s em todas as tonalidades', (suffix) => {
    Object.values(cavaquinhoChords.chords).forEach(chords => {
      expect(chords.find(chord => chord.suffix === suffix)?.positions.length).toBeGreaterThan(0);
    });
  });

  test.each([['m9', 8, 8], ['maj9', 10, 11]])('publica %s sem raiz nos 12 tons', (suffix, minimum, maximum) => {
    Object.entries(cavaquinhoChords.chords).forEach(([key, chords]) => {
      const positions = chords.find(chord => chord.suffix === suffix)?.positions || [];
      expect(positions.length).toBeGreaterThanOrEqual(minimum);
      expect(positions.length).toBeLessThanOrEqual(maximum);
      positions.forEach(position => {
        expect(analyzeChordVoicing({ key, suffix }, position)).toMatchObject({
          rootMissing: true,
          missingEssentialNotes: [],
          extraNotes: []
        });
      });
    });
  });

  test('amplia a cobertura rasa de sus2 e m7 com formas equivalentes', () => {
    Object.values(cavaquinhoChords.chords).forEach(chords => {
      expect(chords.find(chord => chord.suffix === 'sus2').positions.length).toBeGreaterThanOrEqual(6);
      expect(chords.find(chord => chord.suffix === 'm7').positions.length).toBeGreaterThanOrEqual(9);
    });
  });

  test('recebe os rótulos em português da dependência', () => {
    expect(cavaquinhoChords.suffixMetadata['7sus4']).toMatchObject({
      label: 'Sétima suspensa com quarta',
      symbol: '7(4)'
    });
    expect(cavaquinhoChords.suffixMetadata).toMatchObject({
      aug: { symbol: '+' },
      '69': { symbol: '6/9' },
      maj9: { symbol: '7M(9)' },
      madd9: { symbol: 'm(add9)' }
    });
  });

  test('não oferece qualidades sem shapes conhecidos', () => {
    expect(cavaquinhoChords.chords.G.find(chord => chord.suffix === 'aug')?.positions).toEqual([]);
    expect(getAvailableSuffixes('G')).toContain('69');
    expect(getAvailableSuffixes('G')).toEqual(expect.arrayContaining(['m9', 'maj9']));
    expect(getAvailableSuffixes('G')).not.toContain('aug');
  });
});
