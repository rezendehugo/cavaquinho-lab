import type { Pitch, ScoreDraft } from './types.js';

// Must match the physical D4-G4-B4-D5 tuning used by the frontend fretboard.
const openMidi = [62, 67, 71, 74];
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
  const result = new Map<string, PhysicalPosition | null>();
  let states: Array<{ score: number; path: Array<{ eventId: string; position: PhysicalPosition }> }> = [];
  const commitBestPath = () => {
    if (!states.length) return;
    const best = states.reduce((left, right) => right.score < left.score ? right : left);
    best.path.forEach(({ eventId, position }) => result.set(eventId, position));
    states = [];
  };
  for (const event of draft.measures.flatMap(measure => measure.events)) {
    if (event.rest || !event.pitch) {
      result.set(event.id, null);
      continue;
    }
    const candidates = getPitchPositions(event.pitch!);
    if (!candidates.length) {
      commitBestPath();
      result.set(event.id, null);
      continue;
    }
    if (!states.length) {
      states = candidates.map(position => ({
        score: position.fret * 0.03 - position.stringIndex * 0.001,
        path: [{ eventId: event.id, position }]
      }));
      continue;
    }
    states = candidates.map(position => states.map(state => ({
      score: state.score + transitionCost(state.path.at(-1)!.position, position),
      path: [...state.path, { eventId: event.id, position }]
    })).reduce((best, current) => current.score < best.score ? current : best));
  }
  commitBestPath();
  return result;
}
