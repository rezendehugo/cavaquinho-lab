import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { metronomeStorageKey } from './metronomeConstants';
import { clampBpm, normalizeMetronomeState, useMetronome } from './useMetronome';

describe('useMetronome', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  test('limita o andamento à faixa praticável', () => {
    expect(clampBpm(20)).toBe(40);
    expect(clampBpm(96.4)).toBe(96);
    expect(clampBpm(400)).toBe(220);
  });

  test('normaliza configurações persistidas', () => {
    expect(normalizeMetronomeState({ bpm: 120, beatsPerMeasure: 3 })).toMatchObject({ bpm: 120, beatsPerMeasure: 3 });
    expect(normalizeMetronomeState({ bpm: 'inválido', beatsPerMeasure: 7 })).toMatchObject({ bpm: 80, beatsPerMeasure: 4 });
  });

  test('calcula tap tempo pela média dos intervalos recentes', () => {
    const { result } = renderHook(() => useMetronome());

    act(() => result.current.tap(1000));
    act(() => result.current.tap(1500));
    act(() => result.current.tap(2000));

    expect(result.current.bpm).toBe(120);
  });

  test('salva bpm e compasso no navegador', () => {
    const { result } = renderHook(() => useMetronome());

    act(() => result.current.setBpm(92));
    act(() => result.current.setBeatsPerMeasure(3));

    expect(JSON.parse(window.localStorage.getItem(metronomeStorageKey))).toMatchObject({ bpm: 92, beatsPerMeasure: 3 });
  });

  test('altera o bpm sem reiniciar um metrônomo em execução', async () => {
    class FakeAudioContext {
      constructor() { this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    window.AudioContext = FakeAudioContext;
    const { result } = renderHook(() => useMetronome());

    await act(async () => result.current.start());
    const pulseBefore = result.current.pulseIndex;
    act(() => result.current.setBpm(104));

    expect(result.current.isRunning).toBe(true);
    expect(result.current.bpm).toBe(104);
    expect(result.current.pulseIndex).toBe(pulseBefore);
  });
});
