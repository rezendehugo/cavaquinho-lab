import type { Pitch, ScoreDraft, ScoreEvent } from './types.js';

const openMidi = [50, 55, 59, 62];
const pitchClasses: Record<Pitch['step'], number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export interface PhysicalPosition { stringIndex: number; fret: number; midi: number }

export function pitchToMidi(pitch: Pitch): number {
  return (pitch.octave + 1) * 12 + pitchClasses[pitch.step] + pitch.alter;
}

export function getPitchPositions(pitch: Pitch): PhysicalPosition[] {
  const midi = pitchToMidi(pitch);
  return openMidi.flatMap((open, stringIndex) => {
    const fret = midi - open;
    return fret >= 0 && fret <= 12 ? [{ stringIndex, fret, midi }] : [];
  });
}

function transitionCost(left: PhysicalPosition, right: PhysicalPosition): number {
  return Math.abs(left.fret - right.fret) * 2 + Math.abs(left.stringIndex - right.stringIndex) * 4 + right.fret * 0.03;
}

export function suggestMelodyRoute(draft: ScoreDraft): Map<string, PhysicalPosition | null> {
  const pitchedEvents = draft.measures.flatMap(measure => measure.events).filter(event => !event.rest && event.pitch);
  if (!pitchedEvents.length) return new Map();
  let states = getPitchPositions(pitchedEvents[0].pitch!).map(position => ({
    score: position.fret * 0.03 - position.stringIndex * 0.001,
    path: [position]
  }));
  for (const event of pitchedEvents.slice(1)) {
    const candidates = getPitchPositions(event.pitch!);
    if (!candidates.length || !states.length) { states = []; break; }
    states = candidates.map(position => states.map(state => ({
      score: state.score + transitionCost(state.path.at(-1)!, position),
      path: [...state.path, position]
    })).reduce((best, current) => current.score < best.score ? current : best));
  }
  const route = states.length ? states.reduce((best, current) => current.score < best.score ? current : best).path : [];
  const result = new Map<string, PhysicalPosition | null>();
  let index = 0;
  draft.measures.flatMap(measure => measure.events).forEach((event: ScoreEvent) => {
    result.set(event.id, event.rest ? null : route[index++] ?? null);
  });
  return result;
}
