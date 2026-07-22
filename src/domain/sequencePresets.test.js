import { describe, expect, test } from 'vitest';
import { buildFourthCycle, createPresetSequence, getNextPracticeIndex, transposePreset } from './sequencePresets';

const symbol = (step) => (step.displayKey || step.key) + ({ major: '', minor: 'm', m7b5: 'm7(5b)' }[step.suffix] ?? step.suffix);

describe('biblioteca de exercícios transponíveis', () => {
  test.each([
    ['C', ['C', 'A7', 'Dm', 'G7', 'C', 'C7', 'F', 'Fm', 'Em']],
    ['D', ['D', 'B7', 'Em', 'A7', 'D', 'D7', 'G', 'Gm', 'F#m']],
    ['E', ['E', 'C#7', 'F#m', 'B7', 'E', 'E7', 'A', 'Am', 'G#m']],
    ['F', ['F', 'D7', 'Gm', 'C7', 'F', 'F7', 'Bb', 'Bbm', 'Am']],
    ['G', ['G', 'E7', 'Am', 'D7', 'G', 'G7', 'C', 'Cm', 'Bm']],
    ['A', ['A', 'F#7', 'Bm', 'E7', 'A', 'A7', 'D', 'Dm', 'C#m']],
    ['B', ['B', 'G#7', 'C#m', 'F#7', 'B', 'B7', 'E', 'Em', 'D#m']]
  ])('transpõe o quadradinho maior em %s', (tonic, expected) => {
    expect(transposePreset('majorSquare', tonic).map(symbol)).toEqual(expected);
  });

  test('gera quadradinhos maior e menor nas doze tonalidades', () => {
    const tonics = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    for (const tonic of tonics) {
      expect(transposePreset('majorSquare', tonic)).toHaveLength(9);
      expect(transposePreset('minorSquare', tonic)).toHaveLength(11);
    }
  });

  test('rotaciona o ciclo de quartas sem alterar sua direção', () => {
    expect(buildFourthCycle('B', 'major').map(symbol)).toEqual(['B', 'E', 'A', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);
    expect(buildFourthCycle('D', 'minor').map(symbol)).toEqual(['Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm', 'Dbm', 'Gbm', 'Bm', 'Em', 'Am']);
  });

  test('cria sequência com BPM, duração e retorno do quadradinho normalizados', () => {
    const sequence = createPresetSequence({ presetId: 'majorSquare', tonic: 'C', bpm: 300, beats: 0, sequenceId: 'preset-1' });
    expect(sequence).toMatchObject({ practiceBpm: 220, loopStartIndex: 1, presetId: 'majorSquare', tonic: 'C' });
    expect(sequence.steps.every(step => step.practiceBeats === 1 && step.positionIndex === null)).toBe(true);
    expect(getNextPracticeIndex(8, 9, sequence.loopStartIndex)).toBe(1);
  });
});
