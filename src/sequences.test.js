import { createSequence, defaultSequences, MAX_SEQUENCE_STEPS, normalizeSequences, normalizeSequence, reorderSequence } from './sequences';

describe('sequências', () => {
  test('usa uma sequência inicial vazia', () => {
    expect(defaultSequences).toEqual([{ id: 'sequence-1', title: 'Sequência 1', steps: [], practiceBpm: 60, loopStartIndex: 0 }]);
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
    expect(result).toEqual([{
      id: 'step-0',
      key: 'C',
      suffix: 'major',
      positionIndex: null,
      practiceBeats: 4
    }]);
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

  test('migra configurações antigas e limita BPM e início do loop', () => {
    expect(normalizeSequences([{ id: 'old', title: 'Antiga', practiceBpm: 999, loopStartIndex: 8, steps: [{ key: 'C', suffix: 'major' }] }])[0])
      .toMatchObject({ practiceBpm: 220, loopStartIndex: 0 });
    expect(normalizeSequences([{ id: 'old', title: 'Antiga', steps: [] }])[0])
      .toMatchObject({ practiceBpm: 60, loopStartIndex: 0 });
  });

  test('cria nova sequência sem acorde inicial', () => {
    expect(createSequence('abc')).toMatchObject({ title: 'Sequência', steps: [] });
  });

  test('limita sequências persistidas a cinquenta acordes', () => {
    const steps = Array.from({ length: 55 }, (_, index) => ({ id: 'step-' + index, key: 'C', suffix: 'major' }));
    expect(normalizeSequence(steps)).toHaveLength(MAX_SEQUENCE_STEPS);
  });
});
