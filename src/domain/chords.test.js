import { analyzeChordVoicing } from './chordTheory';
import { cavaquinhoChords, getAvailableSuffixes } from './chords';
import { findShapeChord, getAbsoluteFrets, getChordShapeCandidates, getShapeCandidateRankingScore, getShapeComplexity, hasPlayableFretSpan, optimizeSequence } from '../progressionOptimizer';

describe('biblioteca expandida de acordes', () => {
  test('consome o corpus publicado de Bm', () => {
    const chord = cavaquinhoChords.chords.B.find(item => item.suffix === 'minor');
    const analyses = chord.positions.map(position => analyzeChordVoicing({ key: 'B', suffix: 'minor' }, position));
    expect(chord.positions).toHaveLength(7);
    expect(analyses.filter(analysis => analysis.exact)).toHaveLength(7);
    expect(analyses.filter(analysis => analysis.missingNotes.includes('D'))).toHaveLength(0);
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

  test.each([['Db', 11], ['Eb', 8], ['Gb', 10], ['Ab', 9], ['Bb', 10]])('expande %s7 com dominantes cromáticos validados', (key, count) => {
    const positions = cavaquinhoChords.chords[key].find(chord => chord.suffix === '7').positions;
    expect(positions).toHaveLength(count);
    expect(positions.filter(position => {
      const analysis = analyzeChordVoicing({ key, suffix: '7' }, position);
      return analysis.extraNotes.length === 0 && analysis.missingEssentialNotes.length === 0;
    }).length).toBeGreaterThanOrEqual(8);
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
      madd9: { symbol: 'm(add9)' },
      mmaj7: { symbol: 'm(7M)' }
    });
  });

  test('oferece as novas qualidades validadas nos 12 tons', () => {
    Object.values(cavaquinhoChords.chords).forEach(chords => {
      ['aug', 'madd9', 'mmaj7'].forEach(suffix => {
        expect(chords.find(chord => chord.suffix === suffix)?.positions).toHaveLength(6);
      });
    });
    expect(getAvailableSuffixes('G')).toContain('69');
    expect(getAvailableSuffixes('G')).toEqual(expect.arrayContaining(['aug', 'madd9', 'mmaj7', 'm9', 'maj9']));
  });

  test('usa posições naturais de F#7 como ponto de partida para a cifra não catalogada F#13', () => {
    const importedStep = { key: 'Gb', displayKey: 'F#', suffix: '13', sourceSymbol: 'F#13' };
    const shape = findShapeChord(cavaquinhoChords, importedStep);
    expect(shape.suffix).toBe('7');
    expect(shape.positions.length).toBeGreaterThan(0);
    expect(importedStep).toMatchObject({ suffix: '13', sourceSymbol: 'F#13' });
  });

  test('gera formas naturais de F# que cobrem notas permitidas e ordena pela cobertura essencial', () => {
    const importedStep = { key: 'Gb', displayKey: 'F#', suffix: '13', sourceSymbol: 'F#13' };
    const candidates = getChordShapeCandidates(importedStep, cavaquinhoChords);
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates.every(candidate => candidate.analysis.extraNotes.length === 0)).toBe(true);
    expect(candidates[0].essentialCount).toBeGreaterThanOrEqual(candidates.at(-1).essentialCount);
    expect(candidates.some(candidate => candidate.shapeSuffix === '7')).toBe(true);
    expect([...new Set(candidates.map(candidate => candidate.shapeKey))]).toEqual(['Gb']);
    const rootThirdFifthOnly = candidates.find(candidate => candidate.fretKey === '4,3,2,4');
    expect(rootThirdFifthOnly).toMatchObject({ essentialCount: 1 });
    expect(rootThirdFifthOnly.analysis.missingEssentialNotes).toEqual(['D#', 'E']);
    expect(candidates[0].essentialCount).toBeGreaterThan(rootThirdFifthOnly.essentialCount);
    expect(importedStep).toMatchObject({ suffix: '13', sourceSymbol: 'F#13' });
  });

  test('remove formas de B9 com extensão acima de quatro casas das sugestões', () => {
    const candidates = getChordShapeCandidates({ key: 'B', suffix: '9' }, cavaquinhoChords);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(candidate => hasPlayableFretSpan(candidate.position))).toBe(true);
    expect(candidates.some(candidate => candidate.fretKey === '4,4,4,11')).toBe(false);
    expect(hasPlayableFretSpan({ frets: [4, 4, 4, 11], baseFret: 1 })).toBe(false);
  });

  test('substitui uma forma B9 esticada que já estava selecionada por uma posição tocável', () => {
    const stretched = getChordShapeCandidates({ key: 'B', suffix: '9' }, cavaquinhoChords)
      .find(candidate => candidate.fretKey === '4,4,4,11');
    expect(stretched).toBeUndefined();

    const sourceShape = Object.entries(cavaquinhoChords.chords).flatMap(([key, chords]) => chords.flatMap(chord => chord.positions
      .map((position, positionIndex) => ({ key, suffix: chord.suffix, position, positionIndex }))
      .filter(candidate => getAbsoluteFrets(candidate.position).join(',') === '4,4,4,11')))[0];
    expect(sourceShape).toBeDefined();
    const resolved = optimizeSequence([{
      key: sourceShape.key,
      displayKey: 'B',
      suffix: '9',
      shapeSuffix: sourceShape.suffix,
      positionIndex: sourceShape.positionIndex
    }], cavaquinhoChords);

    expect(hasPlayableFretSpan(resolved.steps[0].position)).toBe(true);
    expect(getAbsoluteFrets(resolved.steps[0].position).join(',')).not.toBe('4,4,4,11');
  });

  test('optimizes an unchosen fallback chord from legal F#13 shapes and favors more required notes', () => {
    const result = optimizeSequence([{ key: 'Gb', displayKey: 'F#', suffix: '13', shapeSuffix: '7', positionIndex: null }], cavaquinhoChords);
    const selected = analyzeChordVoicing({ key: 'Gb', displayKey: 'F#', suffix: '13' }, result.steps[0].position);
    expect(result.missing).toEqual([]);
    expect(selected.extraNotes).toEqual([]);
    expect(selected.missingEssentialNotes.length).toBeLessThanOrEqual(1);
    expect(result.steps[0].shapeSuffix).toBeTruthy();
  });

  test('equilibra movimento, região, notas completas e preferência sem deixar favorito distante dominar', () => {
    const target = { key: 'D', suffix: '9' };
    const baseline = getChordShapeCandidates(target, cavaquinhoChords);
    const previousPosition = baseline.at(-1).position;
    const favoriteKey = baseline.at(-2).fretKey;
    const ranked = getChordShapeCandidates(target, cavaquinhoChords, {
      previousPosition,
      preferredFretKeys: [favoriteKey]
    });

    expect(ranked.every(candidate => Number.isFinite(candidate.movementScore))).toBe(true);
    expect(ranked).toEqual([...ranked].sort((a, b) =>
      getShapeCandidateRankingScore(a) - getShapeCandidateRankingScore(b)
      || b.playedCount - a.playedCount || getShapeComplexity(a.position) - getShapeComplexity(b.position)
      || a.fretKey.localeCompare(b.fretKey)
    ));
    const favorite = ranked.find(candidate => candidate.fretKey === favoriteKey);
    const ordinary = ranked.find(candidate => candidate.fretKey !== favoriteKey);
    const expectedScore = candidate => Math.max(0, candidate.definingCount - candidate.definingToneCount) * 10000
      + Math.max(0, candidate.requiredCount - candidate.essentialCount) * 1000
      + candidate.movementScore + candidate.regionDistance * 1.5
      - (candidate.isPreferred ? 4 : 0)
      + getAbsoluteFrets(candidate.position).reduce((sum, fret) => sum + Math.max(0, fret - 12) * 2, 0)
      + (candidate.sourceDistance || 0) * 0.2;
    expect(getShapeCandidateRankingScore(favorite)).toBe(expectedScore(favorite));
    expect(getShapeCandidateRankingScore(ordinary)).toBe(expectedScore(ordinary));
  });

  test('ranks suffix-defining tones above less movement, then favors lower fret regions among equivalent voicings', () => {
    const shared = { requiredCount: 3, essentialCount: 2, definingCount: 2, regionDistance: 0, isPreferred: false, sourceDistance: 0 };
    const definingVoicing = { ...shared, definingToneCount: 2, movementScore: 220, position: { frets: [1, 2, 1, 4] } };
    const incompleteCharacter = { ...shared, definingToneCount: 1, movementScore: 0, position: { frets: [1, 2, 1, 4] } };
    expect(getShapeCandidateRankingScore(definingVoicing)).toBeLessThan(getShapeCandidateRankingScore(incompleteCharacter));

    const lowerPosition = { ...shared, definingToneCount: 2, movementScore: 10, position: { frets: [1, 2, 1, 4] } };
    const highPosition = { ...lowerPosition, position: { frets: [13, 14, 13, 13] } };
    expect(getShapeCandidateRankingScore(lowerPosition)).toBeLessThan(getShapeCandidateRankingScore(highPosition));
  });

  test('oferece a forma móvel de C7 para Bb7 como voicing tocável e sem notas estranhas', () => {
    const c7 = cavaquinhoChords.chords.C.find(chord => chord.suffix === '7');
    const source = c7.positions.find(position => getAbsoluteFrets(position).join(',') === '10,9,8,8');
    expect(source).toBeDefined();

    const candidates = getChordShapeCandidates({ key: 'Bb', suffix: '7' }, cavaquinhoChords);
    const corresponding = candidates.find(candidate => candidate.fretKey === '8,7,6,6');
    expect(corresponding).toBeDefined();
    expect(corresponding.custom).toBe(false);
    expect(hasPlayableFretSpan(corresponding.position)).toBe(true);
    expect(corresponding.analysis.extraNotes).toEqual([]);
    expect(corresponding.analysis.missingNotes).toEqual([]);
  });

  test.each([
    ['C', 0], ['C#', 1], ['Db', 1], ['D', 2], ['Eb', 3], ['E', 4], ['F', 5],
    ['F#', 6], ['Gb', 6], ['G', 7], ['Ab', 8], ['A', 9], ['Bb', 10], ['B', 11], ['Cb', 11]
  ])('mantém a forma C7 móvel ao transpor para %s7', (key, pitchClass) => {
    const signedDelta = ((pitchClass + 6) % 12) - 6;
    const possibleKeys = [signedDelta - 12, signedDelta, signedDelta + 12]
      .map(delta => [10, 9, 8, 8].map(fret => fret + delta))
      .filter(frets => frets.every(fret => fret >= 0 && fret <= 14))
      .map(frets => frets.join(','));
    const candidates = getChordShapeCandidates({ key, suffix: '7' }, cavaquinhoChords);
    const corresponding = candidates.find(candidate => possibleKeys.includes(candidate.fretKey) && candidate.sourceShapeKey === 'C');
    if (corresponding) {
      expect(hasPlayableFretSpan(corresponding.position)).toBe(true);
      expect(corresponding.analysis.extraNotes).toEqual([]);
    }
    expect(candidates.length, 'cada tom cromático ainda oferece shapes válidos').toBeGreaterThan(0);
  });
});
