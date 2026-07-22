import { describe, expect, test } from 'vitest';
import { parseQualityInput, parseRootInput } from './chordInput';

describe('entrada de acordes', () => {
  test('normaliza acidentes e símbolos completos', () => {
    expect(parseRootInput('C#m', 'major')).toEqual({ key: 'Db', displayKey: 'C#', suffix: 'minor' });
    expect(parseRootInput('E♭maj7', 'major')).toEqual({ key: 'Eb', displayKey: 'Eb', suffix: 'maj7' });
    expect(parseRootInput('Cb', 'minor')).toEqual({ key: 'B', displayKey: 'Cb', suffix: 'minor' });
    expect(parseRootInput('C4', 'major')).toEqual({ key: 'C', displayKey: 'C', suffix: 'sus4' });
  });

  test('aceita aliases portugueses sem depender de acentos', () => {
    expect(parseQualityInput('maior')).toBe('major');
    expect(parseQualityInput('sétima maior')).toBe('maj7');
    expect(parseQualityInput('meio diminuto')).toBe('m7b5');
    expect(parseQualityInput('suspenso')).toBe('sus4');
    expect(parseQualityInput('m6')).toBe('m6');
    expect(parseQualityInput('nona adicionada')).toBe('add9');
  });

  test('rejeita entradas desconhecidas', () => {
    expect(parseRootInput('H7', 'major')).toBe(null);
    expect(parseQualityInput('aumentado')).toBe(null);
  });
});
