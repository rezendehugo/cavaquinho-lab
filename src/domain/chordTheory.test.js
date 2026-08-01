import { analyzeChordVoicing, getChordFormulaLegend, getChordPitchClasses, getChordToneDetail, getEquivalentChords, getVoicingCompleteness, positionMatchesChordExactly } from './chordTheory';

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
    const analysis = analyzeChordVoicing({ key: 'C', suffix: '9' }, { midi: [64, 70, 74] });
    expect(analysis).toMatchObject({
      rootMissing: true,
      missingEssentialNotes: [],
      extraNotes: []
    });
    expect(getVoicingCompleteness(analysis)).toEqual({
      id: 'rootless',
      label: 'Voicing sem raiz: contém terça, sétima menor e nona. Recomendado com baixo ou acompanhamento.'
    });
  });

  test('bloqueia tons característicos ausentes e aceita uma omissão em dim7', () => {
    const blocked = analyzeChordVoicing({ key: 'G', suffix: 'mmaj7' }, { midi: [55, 62, 66] });
    expect(getVoicingCompleteness(blocked)).toMatchObject({ id: 'blocked' });

    const incompleteDim7 = analyzeChordVoicing({ key: 'C', suffix: 'dim7' }, { midi: [63, 66, 69] });
    expect(getVoicingCompleteness(incompleteDim7)).toMatchObject({ id: 'incomplete' });
  });

  test('descreve os graus de C7(9) sem depender da cor', () => {
    expect(getChordToneDetail('C', '9', 64)).toMatchObject({
      note: 'E',
      interval: 4,
      degreeId: 'third',
      degreeLabel: '3',
      description: 'terça maior',
      colorGroup: 'third',
      accessibleName: 'Mi, terça maior de Dó'
    });
    expect(getChordToneDetail('C', '9', 70)).toMatchObject({
      degreeId: 'seventh',
      degreeLabel: '♭7',
      description: 'sétima menor',
      colorGroup: 'seventh'
    });
    expect(getChordToneDetail('C', '9', 74)).toMatchObject({
      degreeId: 'ninth',
      degreeLabel: '9',
      description: 'nona',
      colorGroup: 'ninth'
    });
  });

  test('gera a fórmula completa de C7(9) mesmo para shapes sem raiz', () => {
    expect(getChordFormulaLegend('C', '9')).toEqual([
      expect.objectContaining({ note: 'C', degreeLabel: '1', description: 'tônica' }),
      expect.objectContaining({ note: 'D', degreeLabel: '9', description: 'nona' }),
      expect.objectContaining({ note: 'E', degreeLabel: '3', description: 'terça maior' }),
      expect.objectContaining({ note: 'G', degreeLabel: '5', description: 'quinta justa' }),
      expect.objectContaining({ note: 'Bb', degreeLabel: '♭7', description: 'sétima menor' })
    ]);
  });
});
