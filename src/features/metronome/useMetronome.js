import { useEffect, useRef, useState } from 'react';
import { defaultMetronomeState, maximumBpm, metronomeStorageKey, metronomeStorageVersion, minimumBpm } from './metronomeConstants';

const schedulerIntervalMs = 25;
const scheduleAheadSeconds = 0.1;

export const clampBpm = (value) => Math.min(maximumBpm, Math.max(minimumBpm, Math.round(Number(value) || defaultMetronomeState.bpm)));

export const normalizeMetronomeState = (value) => ({
  version: metronomeStorageVersion,
  bpm: clampBpm(value?.bpm),
  beatsPerMeasure: [2, 3, 4].includes(Number(value?.beatsPerMeasure)) ? Number(value.beatsPerMeasure) : defaultMetronomeState.beatsPerMeasure
});

const loadMetronomeState = () => {
  try {
    const saved = window.localStorage.getItem(metronomeStorageKey);
    return saved ? normalizeMetronomeState(JSON.parse(saved)) : defaultMetronomeState;
  } catch {
    return defaultMetronomeState;
  }
};

const playClick = (audioContext, time, accented) => {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.setValueAtTime(accented ? 1200 : 850, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(accented ? 0.22 : 0.13, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + 0.05);
};

export function useMetronome() {
  const [settings, setSettings] = useState(loadMetronomeState);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [pulseIndex, setPulseIndex] = useState(0);
  const audioContextRef = useRef(null);
  const nextBeatTimeRef = useRef(0);
  const nextBeatRef = useRef(0);
  const tapTimesRef = useRef([]);
  const visualTimeoutsRef = useRef(new Set());

  useEffect(() => {
    try {
      window.localStorage.setItem(metronomeStorageKey, JSON.stringify(settings));
    } catch {
      // The metronome remains usable when browser storage is unavailable.
    }
  }, [settings]);

  useEffect(() => {
    if (!isRunning || !audioContextRef.current) return undefined;
    const audioContext = audioContextRef.current;
    const scheduleVisualBeat = (time, beat) => {
      const delay = Math.max(0, (time - audioContext.currentTime) * 1000);
      const timeoutId = window.setTimeout(() => {
        visualTimeoutsRef.current.delete(timeoutId);
        setCurrentBeat(beat);
        setPulseIndex(current => current + 1);
      }, delay);
      visualTimeoutsRef.current.add(timeoutId);
    };
    const schedule = () => {
      while (nextBeatTimeRef.current < audioContext.currentTime + scheduleAheadSeconds) {
        const beat = nextBeatRef.current;
        playClick(audioContext, nextBeatTimeRef.current, beat === 0);
        scheduleVisualBeat(nextBeatTimeRef.current, beat);
        nextBeatRef.current = (beat + 1) % settings.beatsPerMeasure;
        nextBeatTimeRef.current += 60 / settings.bpm;
      }
    };
    schedule();
    const intervalId = window.setInterval(schedule, schedulerIntervalMs);
    return () => {
      window.clearInterval(intervalId);
      visualTimeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
      visualTimeoutsRef.current.clear();
    };
  }, [isRunning, settings.bpm, settings.beatsPerMeasure]);

  useEffect(() => () => audioContextRef.current?.close(), []);

  const start = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    await audioContextRef.current.resume();
    nextBeatRef.current = 0;
    nextBeatTimeRef.current = audioContextRef.current.currentTime + 0.05;
    setCurrentBeat(0);
    setPulseIndex(0);
    setIsRunning(true);
    return true;
  };

  const stop = () => {
    setIsRunning(false);
    setCurrentBeat(0);
    setPulseIndex(0);
  };

  const setBpm = (bpm) => setSettings(current => ({ ...current, bpm: clampBpm(bpm) }));
  const setBeatsPerMeasure = (value) => {
    const beatsPerMeasure = [2, 3, 4].includes(Number(value)) ? Number(value) : defaultMetronomeState.beatsPerMeasure;
    nextBeatRef.current %= beatsPerMeasure;
    setCurrentBeat(current => current % beatsPerMeasure);
    setSettings(current => ({ ...current, beatsPerMeasure }));
  };

  const tap = (timestamp = Date.now()) => {
    const recent = tapTimesRef.current.filter(time => timestamp - time <= 2000).concat(timestamp).slice(-5);
    tapTimesRef.current = recent;
    if (recent.length < 2) return;
    const intervals = recent.slice(1).map((time, index) => time - recent[index]);
    const average = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    setBpm(60000 / average);
  };

  return { ...settings, isRunning, currentBeat, pulseIndex, start, stop, setBpm, setBeatsPerMeasure, tap };
}
