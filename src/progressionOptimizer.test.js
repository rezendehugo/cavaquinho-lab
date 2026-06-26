import { optimizeSequence } from './progressionOptimizer';

const position = (frets) => ({ frets, fingers: frets.map((fret, index) => fret > 0 ? index + 1 : 0), baseFret: 1, barres: [], midi: [60, 64, 67, 72] });

const db = {
  chords: {
    C: [{ suffix: 'major', positions: [position([1, 1, 1, 1]), position([6, 6, 6, 6])] }],
    D: [{ suffix: '7', positions: [position([2, 2, 2, 2]), position([9, 9, 9, 9])] }]
  }
};

describe('otimizador de sequência', () => {
  test('usa seleção manual quando o índice é válido', () => {
    const result = optimizeSequence([{ key: 'C', suffix: 'major', positionIndex: 1 }, { key: 'D', suffix: '7', positionIndex: null }], db);
    expect(result.steps[0].positionIndex).toBe(1);
  });

  test('ignora índice salvo inválido e volta ao automático', () => {
    const result = optimizeSequence([{ key: 'C', suffix: 'major', positionIndex: 99 }, { key: 'D', suffix: '7', positionIndex: null }], db);
    expect(result.steps[0].positionIndex).toBe(0);
  });
});