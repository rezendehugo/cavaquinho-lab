import { describe, expect, test } from 'vitest';
import { appendSoloPosition, normalizeStoredSolos, validateFreeSolo } from './freeSolos';

const position = { stringIndex: 0, fret: 0, midi: 62, pitchClass: 2, note: 'D', octave: 4 };

describe('solos livres', () => {
  test('aceita notas cromáticas, mudanças de direção e repetições', () => {
    const positions = [position, { ...position, stringIndex: 2, fret: 1, midi: 72, pitchClass: 0, note: 'C', octave: 5 }, position];
    expect(validateFreeSolo({ name: 'Frase', positions })).toEqual({ ok: true, message: '' });
  });

  test('limita a frase a 64 passos', () => {
    const full = Array.from({ length: 64 }, () => position);
    expect(appendSoloPosition(full, position)).toHaveLength(64);
  });

  test('ignora solos armazenados inválidos sem perder os válidos', () => {
    const valid = { id: 'valid', name: 'Meu solo', positions: [position] };
    expect(normalizeStoredSolos({ version: 1, solos: [valid, { id: 'bad', positions: [{ fret: 99 }] }] }).solos).toEqual([valid]);
  });
});
