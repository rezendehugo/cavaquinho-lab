import { generateScalePath } from './domain/scalePaths';
import { freeSolosStorageKey, loadFreeSolos, loadScalePaths, readStorage, saveFreeSolos, saveScalePaths, scalePathsStorageKey, storageErrorMessage, writeStorage } from './storage';

describe('armazenamento seguro', () => {
  test('retorna resultado explícito quando a leitura ou escrita falha', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota'); });

    expect(readStorage('teste')).toEqual({ ok: false, value: null });
    expect(writeStorage('teste', 'valor')).toEqual({ ok: false });
    expect(storageErrorMessage).toMatch(/Não foi possível salvar/);

    getItem.mockRestore();
    setItem.mockRestore();
  });

  test('salva caminhos válidos e ignora registros de escala corrompidos', () => {
    const path = { ...generateScalePath('D', 'major', 'low'), id: 'custom-1', name: 'Meu D', custom: true };
    expect(saveScalePaths([path])).toEqual({ ok: true });
    expect(JSON.parse(window.localStorage.getItem(scalePathsStorageKey))).toMatchObject({ version: 2 });
    window.localStorage.setItem(scalePathsStorageKey, JSON.stringify({ version: 2, paths: [path, { id: 'broken' }] }));
    expect(loadScalePaths()).toHaveLength(1);
    expect(loadScalePaths()[0].name).toBe('Meu D');
  });

  test('salva solos livres e ignora posições corrompidas', () => {
    const solo = { id: 'solo-1', name: 'Livre', positions: [{ stringIndex: 0, fret: 0, midi: 62, pitchClass: 2, note: 'D', octave: 4 }] };
    expect(saveFreeSolos([solo])).toEqual({ ok: true });
    expect(JSON.parse(window.localStorage.getItem(freeSolosStorageKey))).toMatchObject({ version: 1 });
    window.localStorage.setItem(freeSolosStorageKey, JSON.stringify({ version: 1, solos: [solo, { id: 'bad', name: 'Ruim', positions: [{ fret: 99 }] }] }));
    expect(loadFreeSolos()).toEqual([solo]);
  });
});
