import { analyzeChordVoicing, chordQualities, compareChordShapes, getChordFormulaLegend, getChordPitchClasses, getChordRootPitchClass, getChordToneDetail, getEquivalentChords, getVoicingCompleteness, positionMatchesChordExactly } from './chordTheory';

describe('teoria aplicada às formas', () => {
  test('toda qualidade declara intervalos definidores contidos em sua fórmula', () => {
    Object.entries(chordQualities).forEach(([suffix, quality]) => {
      expect(quality.characteristicIntervals, suffix).toBeInstanceOf(Array);
      expect(quality.characteristicIntervals.length, suffix).toBeGreaterThan(0);
      expect(quality.characteristicIntervals.every(interval => quality.intervals.includes(interval)), suffix).toBe(true);
    });
  });

  test.each(['B', 'C', 'F#', 'Eb'])('transporta a relação definidora de %s7♭9 pela tonalidade', key => {
    const root = getChordRootPitchClass(key);
    const definingIntervals = chordQualities['7b9'].characteristicIntervals;
    const definingTones = getChordFormulaLegend(key, '7b9').filter(tone => definingIntervals.includes(tone.interval));
    expect(definingIntervals).toEqual([1, 10]);
    expect(definingTones.map(tone => tone.interval)).toEqual([1, 10]);
    expect(definingTones.map(tone => tone.pitchClass)).toEqual([(root + 1) % 12, (root + 10) % 12]);
    expect(definingTones.map(tone => tone.degreeLabel)).toEqual(['♭9', '♭7']);
  });

  test.each(['C', 'D', 'F#', 'Bb'])('ensina a quinta diminuta como trítone da tônica em %sm7♭5', key => {
    const definingIntervals = chordQualities.m7b5.characteristicIntervals;
    const definingTones = getChordFormulaLegend(key, 'm7b5').filter(tone => definingIntervals.includes(tone.interval));
    expect(definingIntervals).toEqual([0, 6]);
    expect(definingTones.map(tone => tone.degreeLabel)).toEqual(['1', '♭5']);
    expect((definingTones[1].pitchClass - definingTones[0].pitchClass + 12) % 12).toBe(6);
  });

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
      label: 'Voicing sem raiz: toca E, Bb, D e omite C, G. Use com baixo ou acompanhamento que sustente a raiz.'
    });
  });

  test('trata tons definidores omitidos e qualquer omissão em dim7 como voicing incompleto', () => {
    const partial = analyzeChordVoicing({ key: 'G', suffix: 'mmaj7' }, { midi: [55, 62, 66] });
    expect(getVoicingCompleteness(partial)).toMatchObject({ id: 'incomplete' });

    const incompleteDim7 = analyzeChordVoicing({ key: 'C', suffix: 'dim7' }, { midi: [63, 66, 69] });
    expect(getVoicingCompleteness(incompleteDim7)).toMatchObject({ id: 'incomplete' });
    expect(incompleteDim7.notes).toEqual(['C', 'Eb', 'Gb', 'Bbb']);
    expect(incompleteDim7.missingNotes).toEqual(['C']);
  });

  test('mantém ♭9 e ♭7 como tons definidores de 7♭9, mas classifica sua omissão como voicing parcial', () => {
    const analysis = analyzeChordVoicing({ key: 'B', suffix: '7b9' }, { midi: [59, 63, 69] });

    expect(analysis).toMatchObject({
      playedIntervals: [0, 4, 10],
      requiredIntervals: [1, 4, 10],
      requiredNotes: ['C', 'D#', 'A'],
      playedRequiredIntervals: [4, 10],
      playedRequiredNotes: ['D#', 'A'],
      missingRequiredIntervals: [1],
      missingRequiredNotes: ['C'],
      characteristicIntervals: [1, 10],
      characteristicNotes: ['C', 'A'],
      playedCharacteristicIntervals: [10],
      playedCharacteristicNotes: ['A'],
      missingCharacteristicIntervals: [1],
      missingCharacteristicNotes: ['C'],
      playedNotes: ['B', 'D#', 'A'],
      missingEssentialNotes: ['C'],
      blocked: false
    });
    expect(getVoicingCompleteness(analysis)).toMatchObject({ id: 'incomplete' });
  });

  test('classifica a tônica e a ♭5 como definidoras do meio-diminuto sem bloquear voicings parciais', () => {
    const tritoneVoicing = analyzeChordVoicing({ key: 'C', suffix: 'm7b5' }, { midi: [60, 66] });
    expect(tritoneVoicing).toMatchObject({
      playedIntervals: [0, 6],
      requiredIntervals: [0, 3, 6, 10],
      requiredNotes: ['C', 'Eb', 'Gb', 'Bb'],
      playedRequiredIntervals: [0, 6],
      playedRequiredNotes: ['C', 'Gb'],
      missingRequiredIntervals: [3, 10],
      missingRequiredNotes: ['Eb', 'Bb'],
      characteristicIntervals: [0, 6],
      characteristicNotes: ['C', 'Gb'],
      playedCharacteristicIntervals: [0, 6],
      playedCharacteristicNotes: ['C', 'Gb'],
      missingCharacteristicIntervals: [],
      playedNotes: ['C', 'Gb'],
      missingCharacteristicNotes: [],
      blocked: false
    });
    expect(getVoicingCompleteness(tritoneVoicing)).toMatchObject({ id: 'incomplete' });

    const missingFlatFive = analyzeChordVoicing({ key: 'C', suffix: 'm7b5' }, { midi: [60, 63, 70] });
    expect(missingFlatFive).toMatchObject({
      characteristicIntervals: [0, 6],
      playedCharacteristicIntervals: [0],
      playedCharacteristicNotes: ['C'],
      missingCharacteristicIntervals: [6],
      missingCharacteristicNotes: ['Gb'],
      blocked: false
    });
    expect(getVoicingCompleteness(missingFlatFive)).toMatchObject({ id: 'incomplete' });
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

  test('interpreta F#13 sem confundir o símbolo da partitura com a posição natural F#7', () => {
    expect(getChordRootPitchClass('F#')).toBe(6);
    expect(getChordRootPitchClass('Gb')).toBe(6);
    expect(getChordRootPitchClass('Db')).toBe(1);
    expect(getChordFormulaLegend('F#', '13').map(item => [item.note, item.degreeLabel])).toEqual([
      ['F#', '1'], ['G#', '9'], ['A#', '3'], ['C#', '5'], ['D#', '13'], ['E', '♭7']
    ]);
    expect(analyzeChordVoicing({ key: 'Gb', displayKey: 'F#', suffix: '13' }, { midi: [66, 70, 73, 76] })).toMatchObject({
      notes: ['F#', 'G#', 'A#', 'C#', 'D#', 'E'],
      missingEssentialNotes: ['D#']
    });
  });

  test('soletra os graus pelo contexto do acorde, inclusive sus2 e dim7', () => {
    expect(getChordToneDetail('E', '7', 68)).toMatchObject({ note: 'G#', degreeLabel: '3' });
    expect(getChordToneDetail('D', '7', 66)).toMatchObject({ note: 'F#', degreeLabel: '3' });
    expect(getChordToneDetail('C', 'sus2', 62)).toMatchObject({ note: 'D', degreeLabel: '2', description: 'segunda maior' });
    expect(getChordToneDetail('C', 'dim7', 69)).toMatchObject({ note: 'Bbb', degreeLabel: '♭♭7', description: 'sétima diminuta' });
  });

  test('preserva a grafia com sustenido para uma sequência, embora a biblioteca use Db', () => {
    expect(getChordFormulaLegend('C#', 'major').map(item => item.note)).toEqual(['C#', 'E#', 'G#']);
    expect(analyzeChordVoicing({ key: 'Db', displayKey: 'C#', suffix: 'major' }, { midi: [61, 65, 68] })).toMatchObject({
      notes: ['C#', 'E#', 'G#'],
      missingNotes: []
    });
  });

  test('compara a distância real de cada corda usando a pestana de referência', () => {
    const comparison = compareChordShapes(
      { key: 'C', suffix: 'major' },
      { frets: [0, 1, 2, -1], baseFret: 1, midi: [60, 64, 67] },
      { frets: [0, 2, 1, 3], baseFret: 5, midi: [60, 67, 64, 72] }
    );
    expect(comparison.added).toEqual([]);
    expect(comparison.removed).toEqual([]);
    expect(comparison.strings.map(item => item.description)).toEqual([
      'Corda 1: permanece no traste 0.',
      'Corda 2: sobe 5 trastes (1 → 6).',
      'Corda 3: sobe 3 trastes (2 → 5).',
      'Corda 4: entra no traste 7.'
    ]);
  });
});

 test('preserva os acidentes da fundamental ao soletrar notas do acorde', () => {
  expect(getChordToneDetail('Eb', 'major', 67).note).toBe('G');
  expect(getChordToneDetail('Bb', '7', 68).note).toBe('Ab');
  expect(getChordToneDetail('E', '7', 68).note).toBe('G#');
  expect(getChordToneDetail('Db', 'major', 65).note).toBe('F');
});
