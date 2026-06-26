import { createSequence, normalizeSequences, normalizeSequence, reorderSequence } from './sequences';

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
    expect(result).toEqual([{ id: 'step-0', key: 'C', suffix: 'major', positionIndex: null }]);
  });

  test('migra lista antiga de acordes para lista de sequências', () => {
    const result = normalizeSequences([{ key: 'C', suffix: 'major' }]);
    expect(result).toHaveLength(1);
    expect(result[0].steps[0]).toMatchObject({ key: 'C', suffix: 'major' });
  });

  test('cria nova sequência com um acorde inicial', () => {
    expect(createSequence('abc')).toMatchObject({ title: 'Nova sequência', steps: [{ key: 'C', suffix: 'major' }] });
  });
});
