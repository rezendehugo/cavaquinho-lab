import { analyzeChordVoicing, getChordPitchClasses, getEquivalentChords, getVoicingCompleteness, positionMatchesChordExactly } from './chordTheory';

describe('teoria aplicada às formas', () => {
  test('reconhece equivalências exatas entre tétrades', () => {
    expect(getChordPitchClasses('G', 'm6')).toEqual(getChordPitchClasses('E', 'm7b5'));
    expect(getEquivalentChords('G', 'm6')).toContainEqual({ key: 'E', suffix: 'm7b5' });
    expect(getEquivalentChords('C', '6')).toContainEqual({ key: 'A', suffix: 'm7' });
  });

  test('reconhece a simetria do diminuto com sétima', () => {
    const equivalents = getEquivalentChords('C', 'dim7');
    expect(equivalents).toEqual(expect.arrayContaining([
      { key: 'Eb', suffix: 'dim7' },
      { key: 'Gb', suffix: 'dim7' },
      { key: 'A', suffix: 'dim7' }
    ]));
  });

  test('separa forma exata de forma com nota omitida', () => {
    const exactPosition = { midi: [60, 64, 67, 74] };
    const incompletePosition = { midi: [60, 64, 70, 74] };
    expect(positionMatchesChordExactly(exactPosition, 'C', 'add9')).toBe(true);
    expect(analyzeChordVoicing({ key: 'C', suffix: '9' }, incompletePosition)).toMatchObject({
      exact: false,
      missingNotes: ['G']
    });
  });

  test('classifica voicings completos, incompletos e com notas adicionais', () => {
    expect(getVoicingCompleteness({ missingNotes: [], missingEssentialNotes: [], extraNotes: [], rootMissing: false })).toMatchObject({ id: 'complete' });
    expect(getVoicingCompleteness({ missingNotes: ['D'], missingEssentialNotes: [], extraNotes: [], rootMissing: false })).toEqual({
      id: 'incomplete',
      label: 'Voicing incompleto: omite D. Válido no cavaquinho.'
    });
    expect(getVoicingCompleteness({ missingNotes: [], missingEssentialNotes: [], extraNotes: ['A'], rootMissing: false })).toMatchObject({ id: 'additional' });
  });

  test('identifica voicing de nona sem raiz com aviso de acompanhamento', () => {
    const analysis = analyzeChordVoicing({ key: 'G', suffix: 'maj9' }, { midi: [59, 66, 69, 71] });
    expect(analysis).toMatchObject({
      rootMissing: true,
      missingEssentialNotes: [],
      extraNotes: []
    });
    expect(getVoicingCompleteness(analysis)).toEqual({
      id: 'rootless',
      label: 'Voicing sem raiz: contém terça, sétima e nona. Recomendado com baixo ou acompanhamento.'
    });
  });
});
