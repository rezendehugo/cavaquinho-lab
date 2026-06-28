import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { pomodoroStorageKey } from './pomodoroConstants';
import { usePomodoroTimer } from './usePomodoroTimer';

describe('usePomodoroTimer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  test('inicia com estado padrão', () => {
    const { result } = renderHook(() => usePomodoroTimer());
    expect(result.current.phase).toBe('focus');
    expect(result.current.status).toBe('idle');
    expect(result.current.timerText).toBe('25:00');
  });

  test('inicia, pausa e retoma preservando o tempo restante', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => result.current.start());
    expect(result.current.status).toBe('running');

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.timerText).toBe('24:55');

    act(() => result.current.pause());
    const pausedMs = result.current.remainingMs;
    expect(result.current.status).toBe('paused');

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.remainingMs).toBe(pausedMs);

    act(() => result.current.start());
    expect(result.current.status).toBe('running');
    expect(result.current.remainingMs).toBe(pausedMs);
  });

  test('reinicia para foco com duração completa', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(8000));
    act(() => result.current.reset());

    expect(result.current.phase).toBe('focus');
    expect(result.current.status).toBe('idle');
    expect(result.current.timerText).toBe('25:00');
    expect(result.current.completedFocusSessions).toBe(0);
  });

  test('troca para a próxima etapa com a duração correta', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => result.current.switchPhase());
    expect(result.current.phase).toBe('break');
    expect(result.current.status).toBe('idle');
    expect(result.current.timerText).toBe('05:00');
  });

  test('avança de foco para pausa usando tempo absoluto', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(25 * 60 * 1000 + 250));

    expect(result.current.phase).toBe('break');
    expect(result.current.completedFocusSessions).toBe(1);
    expect(result.current.status).toBe('running');
    expect(result.current.timerText).toBe('04:59');
  });

  test('salva configurações no localStorage', () => {
    const { result } = renderHook(() => usePomodoroTimer());

    act(() => result.current.setFocusMinutes(30));
    act(() => result.current.setBreakMinutes(10));

    const saved = JSON.parse(window.localStorage.getItem(pomodoroStorageKey));
    expect(saved.focusMinutes).toBe(30);
    expect(saved.breakMinutes).toBe(10);
  });

  test('limpa o intervalo ao desmontar', () => {
    const clearSpy = vi.spyOn(window, 'clearInterval');
    const { result, unmount } = renderHook(() => usePomodoroTimer());

    act(() => result.current.start());
    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
