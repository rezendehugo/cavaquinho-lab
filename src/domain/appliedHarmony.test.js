import { analyzeHarmonicFunction, buildHarmonicField, getFunctionalSubstitutions } from './appliedHarmony';

describe('harmonia aplicada', () => {
  test('constrói o campo harmônico maior com graus e funções', () => {
    expect(buildHarmonicField({ key: 'C', mode: 'maior' })).toEqual([
      expect.objectContaining({ key: 'C', suffix: 'major', numeral: 'I', functionId: 'tonic' }),
      expect.objectContaining({ key: 'D', suffix: 'minor', numeral: 'ii', functionId: 'predominant' }),
      expect.objectContaining({ key: 'E', suffix: 'minor', numeral: 'iii', functionId: 'tonic' }),
      expect.objectContaining({ key: 'F', suffix: 'major', numeral: 'IV', functionId: 'predominant' }),
      expect.objectContaining({ key: 'G', suffix: 'major', numeral: 'V', functionId: 'dominant' }),
      expect.objectContaining({ key: 'A', suffix: 'minor', numeral: 'vi', functionId: 'tonic' }),
      expect.objectContaining({ key: 'B', suffix: 'dim', numeral: 'vii°', functionId: 'dominant' })
    ]);
  });

  test('reconhece ii–V7–I e sugere substituições pela mesma função', () => {
    const center = { key: 'C', mode: 'maior', label: 'C maior' };
    expect(analyzeHarmonicFunction({ key: 'D', suffix: 'minor' }, center)).toMatchObject({ numeral: 'ii', functionId: 'predominant' });
    expect(analyzeHarmonicFunction({ key: 'G', suffix: '7' }, center)).toMatchObject({ numeral: 'V7', functionId: 'dominant' });
    expect(getFunctionalSubstitutions({ key: 'C', suffix: 'major' }, center)).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'E', suffix: 'minor' }),
      expect.objectContaining({ key: 'A', suffix: 'minor' })
    ]));
  });
});
