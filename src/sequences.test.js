import { createSequence, defaultSequences, normalizeSequences, normalizeSequence, reorderSequence } from './sequences';

describe('sequências', () => {
  test('usa uma sequência inicial vazia', () => {
    expect(defaultSequences).toEqual([{ id: 'sequence-1', title: 'Sequência 1', steps: [] }]);
  });

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

  test('preserva lista vazia de acordes', () => {
    expect(normalizeSequence([])).toEqual([]);
  });

  test('migra lista antiga de acordes para lista de sequências', () => {
    const result = normalizeSequences([{ key: 'C', suffix: 'major' }]);
    expect(result).toHaveLength(1);
    expect(result[0].steps[0]).toMatchObject({ key: 'C', suffix: 'major' });
  });

  test('normaliza o nome padrão antigo de sequência', () => {
    const result = normalizeSequences([{ id: 'sequence-1', title: 'Nova sequência', steps: [] }]);
    expect(result[0].title).toBe('Sequência 1');
  });

  test('cria nova sequência sem acorde inicial', () => {
    expect(createSequence('abc')).toMatchObject({ title: 'Sequência', steps: [] });
  });
});
