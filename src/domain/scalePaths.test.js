import { describe, expect, test } from 'vitest';
import {
  buildFretboardPositions,
  buildPathTraversal,
  generateAnchoredScalePath,
  generateScalePath,
  getScalePositionsInRegion,
  normalizeStoredScalePaths,
  validateCustomScalePath
} from './scalePaths';

describe('caminhos físicos de escala', () => {
  test('mapeia a afinação D4 G4 B4 D5 entre as casas 0 e 12', () => {
    const positions = buildFretboardPositions();
    expect(positions).toHaveLength(52);
    expect(positions.find(position => position.stringIndex === 0 && position.fret === 0)).toMatchObject({ midi: 62, note: 'D', octave: 4 });
    expect(positions.find(position => position.stringIndex === 3 && position.fret === 12)).toMatchObject({ midi: 86, note: 'D', octave: 6 });
  });

  test('gera um caminho regional exato de D4 até D5', () => {
    const path = generateScalePath('D', 'major', 'low');
    expect(path.positions.map(position => position.midi)).toEqual([62, 64, 66, 67, 69, 71, 73, 74]);
    expect(path.positions.every(position => position.fret <= 4)).toBe(true);
    expect(path.positions.map(position => position.degree)).toEqual([0, 1, 2, 3, 4, 5, 6, 0]);
  });

  test('gera C maior na região aguda e preserva uma posição por grau', () => {
    const path = generateScalePath('C', 'major', 'high');
    expect(path.positions.map(position => position.note)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']);
    expect(path.positions.every(position => position.fret >= 8 && position.fret <= 12)).toBe(true);
  });

  test('escolhe o caminho mais compacto e aceita equivalência enarmônica', () => {
    const path = generateScalePath('Gb', 'minorPentatonic', 'compact');
    expect(path.positions).toHaveLength(6);
    expect(path.positions[0].pitchClass).toBe(6);
    expect(path.positions.at(-1).midi - path.positions[0].midi).toBe(12);
  });

  test('cria percursos ascendente, descendente e ida e volta sem repetir viradas', () => {
    const positions = generateScalePath('D', 'major', 'low').positions;
    expect(buildPathTraversal(positions, 'up')).toEqual(positions);
    expect(buildPathTraversal(positions, 'down')).toEqual([...positions].reverse());
    expect(buildPathTraversal(positions, 'upDown')).toEqual(positions.concat(positions.slice(1, -1).reverse()));
  });

  test('gera rota ascendente entre graus arbitrários preservando âncoras físicas', () => {
    const positions = buildFretboardPositions();
    const start = positions.find(position => position.stringIndex === 1 && position.fret === 2); // A4
    const end = positions.find(position => position.stringIndex === 2 && position.fret === 6); // F5
    const path = generateAnchoredScalePath('C', 'major', 'compact', start, end);
    expect(path.positions[0]).toMatchObject({ stringIndex: 1, fret: 2, note: 'A' });
    expect(path.positions.at(-1)).toMatchObject({ stringIndex: 2, fret: 6, note: 'F' });
    expect(path.positions.map(position => position.note)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(path.positions.every((position, index) => index === 0 || position.midi > path.positions[index - 1].midi)).toBe(true);
  });

  test('gera rota descendente e mantém os pontos inicial e final exatos', () => {
    const positions = buildFretboardPositions();
    const start = positions.find(position => position.stringIndex === 2 && position.fret === 6); // F5
    const end = positions.find(position => position.stringIndex === 1 && position.fret === 2); // A4
    const path = generateAnchoredScalePath('C', 'major', 'compact', start, end);
    expect(path.positions.map(position => position.note)).toEqual(['F', 'E', 'D', 'C', 'B', 'A']);
    expect(path.positions[0]).toMatchObject(start);
    expect(path.positions.at(-1)).toMatchObject(end);
  });

  test('expõe o conjunto regional e informa quando não existe rota confinada', () => {
    expect(getScalePositionsInRegion('C', 'major', 'low').every(position => position.fret <= 4)).toBe(true);
    const positions = buildFretboardPositions();
    const outsideStart = positions.find(position => position.stringIndex === 0 && position.fret === 10);
    const outsideEnd = positions.find(position => position.stringIndex === 3 && position.fret === 10);
    expect(generateAnchoredScalePath('C', 'major', 'low', outsideStart, outsideEnd).positions).toHaveLength(0);
  });

  test('valida caminhos personalizados e descarta registros persistidos inválidos', () => {
    const valid = generateScalePath('D', 'major', 'low');
    expect(validateCustomScalePath(valid)).toEqual({ ok: true, message: '' });
    expect(validateCustomScalePath({ ...valid, positions: valid.positions.slice(0, -1) }).ok).toBe(false);
    expect(normalizeStoredScalePaths({ version: 1, paths: [valid, { id: 'broken' }] }).paths).toHaveLength(1);
  });

  test('migra caminhos tônica-oitava da versão 1 para âncoras explícitas da versão 2', () => {
    const legacy = { ...generateScalePath('D', 'major', 'low'), id: 'legacy', name: 'Meu D', custom: true };
    const normalized = normalizeStoredScalePaths({ version: 1, paths: [legacy] });
    expect(normalized.version).toBe(2);
    expect(normalized.paths[0]).toMatchObject({ id: 'legacy', name: 'Meu D', start: legacy.positions[0], end: legacy.positions.at(-1) });
  });
});
