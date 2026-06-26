import { normalizeSequence, reorderSequence } from './sequences';

describe('sequências', () => {
  test('reordena acordes preservando a escolha manual da forma', () => {
    const sequence = [
      { id: 'a', key: 'C', suffix: 'major', positionIndex: 2 },
      { id: 'b', key: 'D', suffix: '7', positionIndex: null },
      { id: 'c', key: 'G', suffix: 'minor', positionIndex: 1 }
    ];
    expect(reorderSequence(sequence, 2, 1)).toEqual([
      sequence[0],
      sequence[2],
      sequence[1]
    ]);
  });

  test('normaliza dados salvos inválidos', () => {
    const result = normalizeSequence([{ id: 1, key: 'H', suffix: 'x', legado: 'Z', positionIndex: '4' }]);
    expect(result).toEqual([{ id: 'seq-0', key: 'C', suffix: 'major', positionIndex: null }]);
  });
});
