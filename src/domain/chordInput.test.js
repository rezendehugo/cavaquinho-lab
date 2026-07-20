import { describe, expect, test } from 'vitest';
import { parseQualityInput, parseRootInput } from './chordInput';

describe('entrada de acordes', () => {
  test('normaliza acidentes e símbolos completos', () => {
    expect(parseRootInput('C#m', 'major')).toEqual({ key: 'Db', suffix: 'minor' });
    expect(parseRootInput('E♭maj7', 'major')).toEqual({ key: 'Eb', suffix: 'maj7' });
    expect(parseRootInput('Cb', 'minor')).toEqual({ key: 'B', suffix: 'minor' });
  });

  test('aceita aliases portugueses sem depender de acentos', () => {
    expect(parseQualityInput('maior')).toBe('major');
    expect(parseQualityInput('sétima maior')).toBe('maj7');
    expect(parseQualityInput('meio diminuto')).toBe('m7b5');
    expect(parseQualityInput('suspenso')).toBe('sus4');
  });

  test('rejeita entradas desconhecidas', () => {
    expect(parseRootInput('H7', 'major')).toBe(null);
    expect(parseQualityInput('aumentado')).toBe(null);
  });
});
