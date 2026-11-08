import { describe, expect, test } from 'vitest';
import { buildFourthCycle, createPresetSequence, getNextPracticeIndex, sequencePresetDefinitions, transposePreset } from './sequencePresets';
import { getCavaquinhoChords } from './chords';
import { findChord, optimizeSequence } from '../progressionOptimizer';
import { getChordPitchClasses, getChordRootPitchClass } from './chordTheory';

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

  test('cria ciclos diatônicos de quartas maior e menor nos sete tons naturais', () => {
    const definitions = sequencePresetDefinitions.filter(item => item.id.startsWith('diatonicFourths'));
    expect(definitions).toHaveLength(14);
    const chordDb = getCavaquinhoChords();
    for (const definition of definitions) {
      const cycle = transposePreset(definition.id, definition.fixedTonic);
      expect(cycle).toHaveLength(7);
      expect(cycle.every(step => findChord(chordDb, step.key, step.suffix))).toBe(true);
      expect(definition.fixedTonic).toMatch(/^[A-G]$/);
    }
    expect(transposePreset('diatonicFourthsMajor-D', 'D').map(symbol)).toEqual(['D', 'G', 'C#dim', 'F#m', 'Bm', 'Em', 'A']);
    expect(transposePreset('diatonicFourthsMinor-F', 'F').map(symbol)).toEqual(['Fm', 'Bbm', 'Eb', 'Ab', 'Db', 'Gdim', 'Cm']);
  });

  test('oferece campos maiores e menores harmônicos nas doze tonalidades com acordes tocáveis', () => {
    const tonics = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const definitions = sequencePresetDefinitions.filter(item => item.id.startsWith('harmonicField'));
    const chordDb = getCavaquinhoChords();
    expect(definitions).toHaveLength(24);

    for (const tonic of tonics) {
      for (const mode of ['Major', 'Minor']) {
        const definition = definitions.find(item => item.id === `harmonicField${mode}-${tonic}`);
        const field = transposePreset(definition.id, tonic);
        expect(field).toHaveLength(7);
        expect(field.every(step => findChord(chordDb, step.key, step.suffix))).toBe(true);
        expect(optimizeSequence(field, chordDb).missing).toEqual([]);
        expect(definition).toMatchObject({ fixedTonic: tonic, loopStartIndex: 0 });
      }
    }

    expect(transposePreset('harmonicFieldMajor-Db', 'Db').map(step => [step.displayKey || step.key, step.suffix])).toEqual([
      ['Db', 'major'], ['Eb', 'minor'], ['F', 'minor'], ['Gb', 'major'], ['Ab', 'major'], ['Bb', 'minor'], ['C', 'dim']
    ]);
    expect(transposePreset('harmonicFieldMinor-Db', 'Db').map(step => [step.displayKey || step.key, step.suffix])).toEqual([
      ['Db', 'minor'], ['Eb', 'dim'], ['Fb', 'aug'], ['Gb', 'minor'], ['Ab', '7'], ['Bbb', 'major'], ['C', 'dim']
    ]);
    expect(getChordRootPitchClass('Bbb')).toBe(9);
    expect(getChordPitchClasses('Bbb', 'major')).toEqual(getChordPitchClasses('A', 'major'));
  });

  test('cria campos harmônicos com sete acordes e mantém o tom e o início do ciclo', () => {
    const major = createPresetSequence({ presetId: 'harmonicFieldMajor-Db', tonic: 'C', bpm: 80, beats: 4, sequenceId: 'field-major-db' });
    const minor = createPresetSequence({ presetId: 'harmonicFieldMinor-Db', tonic: 'C', bpm: 80, beats: 4, sequenceId: 'field-minor-db' });
    expect(major).toMatchObject({ title: 'Campo harmônico maior · Db', tonic: 'Db', presetId: 'harmonicFieldMajor-Db', loopStartIndex: 0 });
    expect(minor).toMatchObject({ title: 'Campo harmônico menor harmônico · Db', tonic: 'Db', presetId: 'harmonicFieldMinor-Db', loopStartIndex: 0 });
    expect(major.steps).toHaveLength(7);
    expect(minor.steps).toHaveLength(7);
  });

  test('cria sequência com BPM, duração e retorno do quadradinho normalizados', () => {
    const sequence = createPresetSequence({ presetId: 'majorSquare', tonic: 'C', bpm: 300, beats: 0, sequenceId: 'preset-1' });
    expect(sequence).toMatchObject({ practiceBpm: 220, loopStartIndex: 1, presetId: 'majorSquare', tonic: 'C' });
    expect(sequence.steps.every(step => step.practiceBeats === 1 && step.positionIndex === null)).toBe(true);
    expect(getNextPracticeIndex(8, 9, sequence.loopStartIndex)).toBe(1);
  });
});
