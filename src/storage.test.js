import { generateScalePath } from './domain/scalePaths';
import { loadScalePaths, readStorage, saveScalePaths, scalePathsStorageKey, storageErrorMessage, writeStorage } from './storage';

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
});
