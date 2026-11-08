import { generateScalePath } from './domain/scalePaths';
import { freeSolosStorageKey, readStorage, scalePathsStorageKey, sequencesStorageKey, storageErrorMessage, writeStorage } from './storage';
import { loadScalePaths, saveScalePaths } from './storage/scalePaths';
import { loadFreeSolos, saveFreeSolos } from './storage/freeSolos';
import { loadSequences } from './storage/sequences';
import { createPresetSequence, sequencePresetDefinitions } from './domain/sequencePresets';

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

  test('limpa somente índices de shapes que deixaram de existir', () => {
    window.localStorage.setItem(sequencesStorageKey, JSON.stringify([{
      id: 'sequence-1',
      title: 'Migração',
      steps: [
        { id: 'valid', key: 'G', suffix: 'aug', positionIndex: 2 },
        { id: 'invalid', key: 'G', suffix: 'aug', positionIndex: 99 }
      ]
    }]));

    expect(loadSequences()[0].steps.map(step => step.positionIndex)).toEqual([2, null]);
  });

  test('corrige nomes de acordes duplicados em Noites Cariocas salvo', () => {
    const savedSequence = createPresetSequence({ presetId: 'noitesCariocasB', tonic: 'G', bpm: 60, beats: 4, sequenceId: 'noites-cariocas-b' });
    for (const [index, displayKey] of [[7, 'F#dim'], [9, 'F#m7'], [12, 'C#m'], [31, 'C#dim']]) {
      savedSequence.steps[index].displayKey = displayKey;
    }
    window.localStorage.setItem(sequencesStorageKey, JSON.stringify([savedSequence]));

    const migrated = loadSequences()[0];

    expect([7, 9, 12, 31].map(index => migrated.steps[index].displayKey)).toEqual(['F#', 'F#', 'C#', 'C#']);
    const persisted = JSON.parse(window.localStorage.getItem(sequencesStorageKey))[0];
    expect([7, 9, 12, 31].map(index => persisted.steps[index].displayKey)).toEqual(['F#', 'F#', 'C#', 'C#']);
  });

  test('mantém os exercícios prontos no catálogo sem adicioná-los às sequências do músico', () => {
    window.localStorage.setItem(sequencesStorageKey, JSON.stringify([{ id: 'minha-sequencia', title: 'Minha sequência', steps: [] }]));

    const firstLoad = loadSequences();
    const secondLoad = loadSequences();

    expect(firstLoad).toHaveLength(1);
    expect(secondLoad).toHaveLength(1);
    expect(sequencePresetDefinitions.filter(definition => definition.id.startsWith('diatonicFourths'))).toHaveLength(14);
    expect(sequencePresetDefinitions.filter(definition => definition.id.startsWith('harmonicField'))).toHaveLength(24);
    expect(firstLoad.find(sequence => sequence.id === 'minha-sequencia')).toBeDefined();
  });
});
