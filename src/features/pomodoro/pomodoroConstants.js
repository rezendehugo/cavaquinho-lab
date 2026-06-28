export const pomodoroStorageKey = 'cavaquinhoLabPomodoro';
export const pomodoroStorageVersion = 1;

export const defaultPomodoroState = {
  version: pomodoroStorageVersion,
  focusMinutes: 25,
  breakMinutes: 5,
  phase: 'focus',
  status: 'idle',
  endAt: null,
  remainingMs: 25 * 60 * 1000,
  completedFocusSessions: 0
};

export const focusMinuteOptions = [10, 15, 20, 25, 30, 40, 45, 50, 60];
export const breakMinuteOptions = [3, 5, 10, 15, 20];
