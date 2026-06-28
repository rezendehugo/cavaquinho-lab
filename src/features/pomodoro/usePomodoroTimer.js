import { useEffect, useMemo, useState } from 'react';
import { defaultPomodoroState, pomodoroStorageKey, pomodoroStorageVersion } from './pomodoroConstants';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const minuteMs = 60 * 1000;

export const getPhaseDuration = (state, phase = state.phase) => (
  (phase === 'focus' ? state.focusMinutes : state.breakMinutes) * minuteMs
);

export const formatRemainingTime = (remainingMs) => {
  const safeMs = Math.max(0, remainingMs);
  const minutes = Math.floor(safeMs / minuteMs);
  const seconds = Math.floor((safeMs % minuteMs) / 1000);
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
};

export const reconcilePomodoroState = (state, now) => {
  if (state.status !== 'running' || !state.endAt || state.endAt > now) return state;

  let next = { ...state };
  let transitions = 0;

  while (next.endAt && next.endAt <= now && transitions < 1000) {
    const completedFocus = next.phase === 'focus';
    const phase = completedFocus ? 'break' : 'focus';
    next = {
      ...next,
      phase,
      completedFocusSessions: next.completedFocusSessions + (completedFocus ? 1 : 0),
      endAt: next.endAt + getPhaseDuration(next, phase)
    };
    transitions += 1;
  }

  if (transitions === 1000) {
    next.endAt = now + getPhaseDuration(next, next.phase);
  }

  return next;
};

export const normalizePomodoroState = (value) => {
  if (!value || value.version !== pomodoroStorageVersion) return defaultPomodoroState;
  const focusMinutes = clamp(Math.floor(Number(value.focusMinutes) || defaultPomodoroState.focusMinutes), 5, 90);
  const breakMinutes = clamp(Math.floor(Number(value.breakMinutes) || defaultPomodoroState.breakMinutes), 1, 30);
  const phase = value.phase === 'break' ? 'break' : 'focus';
  const status = ['idle', 'running', 'paused'].includes(value.status) ? value.status : 'idle';
  const remainingMs = Math.max(0, Number(value.remainingMs) || (phase === 'focus' ? focusMinutes : breakMinutes) * minuteMs);

  return {
    version: pomodoroStorageVersion,
    focusMinutes,
    breakMinutes,
    phase,
    status,
    endAt: typeof value.endAt === 'number' ? value.endAt : null,
    remainingMs,
    completedFocusSessions: Math.max(0, Math.floor(Number(value.completedFocusSessions) || 0))
  };
};

export const loadPomodoroState = () => {
  try {
    const saved = window.localStorage.getItem(pomodoroStorageKey);
    return saved ? normalizePomodoroState(JSON.parse(saved)) : defaultPomodoroState;
  } catch {
    return defaultPomodoroState;
  }
};

export function usePomodoroTimer() {
  const [state, setState] = useState(() => reconcilePomodoroState(loadPomodoroState(), Date.now()));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    try {
      window.localStorage.setItem(pomodoroStorageKey, JSON.stringify(state));
    } catch {
      // The timer remains usable when browser storage is unavailable.
    }
  }, [state]);

  useEffect(() => {
    if (state.status !== 'running') return undefined;
    const intervalId = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      setState(current => reconcilePomodoroState(current, timestamp));
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [state.status]);

  const remainingMs = state.status === 'running' && state.endAt
    ? Math.max(0, state.endAt - now)
    : state.remainingMs;

  const timerText = useMemo(() => formatRemainingTime(remainingMs), [remainingMs]);

  const start = () => {
    setState(current => {
      const remaining = current.status === 'paused' ? current.remainingMs : getPhaseDuration(current);
      return {
        ...current,
        status: 'running',
        remainingMs: remaining,
        endAt: Date.now() + remaining
      };
    });
    setNow(Date.now());
  };

  const pause = () => {
    setState(current => ({
      ...current,
      status: 'paused',
      remainingMs: Math.max(0, (current.endAt || Date.now()) - Date.now()),
      endAt: null
    }));
    setNow(Date.now());
  };

  const reset = () => {
    setState(current => ({
      ...current,
      phase: 'focus',
      status: 'idle',
      endAt: null,
      remainingMs: current.focusMinutes * minuteMs,
      completedFocusSessions: 0
    }));
    setNow(Date.now());
  };

  const switchPhase = () => {
    setState(current => {
      const phase = current.phase === 'focus' ? 'break' : 'focus';
      return {
        ...current,
        phase,
        status: 'idle',
        endAt: null,
        remainingMs: getPhaseDuration(current, phase)
      };
    });
    setNow(Date.now());
  };

  const setFocusMinutes = (focusMinutes) => {
    setState(current => current.status === 'idle'
      ? { ...current, focusMinutes, remainingMs: current.phase === 'focus' ? focusMinutes * minuteMs : current.remainingMs }
      : current);
  };

  const setBreakMinutes = (breakMinutes) => {
    setState(current => current.status === 'idle'
      ? { ...current, breakMinutes, remainingMs: current.phase === 'break' ? breakMinutes * minuteMs : current.remainingMs }
      : current);
  };

  return {
    ...state,
    remainingMs,
    timerText,
    start,
    pause,
    reset,
    switchPhase,
    setFocusMinutes,
    setBreakMinutes
  };
}
