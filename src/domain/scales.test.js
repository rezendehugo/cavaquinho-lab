import { describe, expect, test } from 'vitest';
import { buildScalePracticeSequence, getScaleNotes, noteMatchesPitchClass } from './scales';

describe('escalas', () => {
  test('constrói escalas maiores e menores naturais', () => {
    expect(getScaleNotes('C', 'major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(getScaleNotes('A', 'naturalMinor')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  test('constrói pentatônicas maior e menor', () => {
    expect(getScaleNotes('C', 'majorPentatonic')).toEqual(['C', 'D', 'E', 'G', 'A']);
    expect(getScaleNotes('A', 'minorPentatonic')).toEqual(['A', 'C', 'D', 'E', 'G']);
  });

  test('normaliza equivalências enarmônicas', () => {
    expect(noteMatchesPitchClass('Db', 'C#')).toBe(true);
    expect(noteMatchesPitchClass('Gb', 'F#')).toBe(true);
  });

  test('cria ida e volta sem duplicar os pontos de mudança', () => {
    expect(buildScalePracticeSequence('C', 'major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'B', 'A', 'G', 'F', 'E', 'D']);
  });
});
