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
    expect(parseQualityInput('7 suspenso')).toBe('7sus4');
    expect(parseRootInput('G7sus', 'major')).toEqual({ key: 'G', displayKey: 'G', suffix: '7sus4' });
    expect(parseRootInput('G+', 'major')).toEqual({ key: 'G', displayKey: 'G', suffix: 'aug' });
    expect(parseRootInput('Gaug', 'major')).toEqual({ key: 'G', displayKey: 'G', suffix: 'aug' });
    expect(parseRootInput('Gaum', 'major')).toEqual({ key: 'G', displayKey: 'G', suffix: 'aug' });
    expect(parseRootInput('G7(4)', 'major')).toEqual({ key: 'G', displayKey: 'G', suffix: '7sus4' });
    expect(parseRootInput('G6/9', 'major')).toEqual({ key: 'G', displayKey: 'G', suffix: '69' });
    expect(parseRootInput('G7M(9)', 'major')).toEqual({ key: 'G', displayKey: 'G', suffix: 'maj9' });
    expect(parseRootInput('Gm(add9)', 'major')).toEqual({ key: 'G', displayKey: 'G', suffix: 'madd9' });
  });

  test('rejeita entradas desconhecidas', () => {
    expect(parseRootInput('H7', 'major')).toBe(null);
    expect(parseQualityInput('desconhecido')).toBe(null);
  });
});
