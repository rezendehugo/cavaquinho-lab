import { describe, expect, test } from 'vitest';
import { getPitchPositions, pitchToMidi, suggestMelodyRoute } from './melodyRoute.js';
import type { ScoreDraft } from './types.js';

describe('melody position optimizer', () => {
  test('maps pitches to the D-G-B-D tuning and keeps a compact route', () => {
    expect(pitchToMidi({ step: 'D', alter: 0, octave: 4 })).toBe(62);
    expect(getPitchPositions({ step: 'D', alter: 0, octave: 4 })).toEqual([
      { stringIndex: 0, fret: 0, midi: 62 }
    ]);
    const event = (id: string, step: 'D' | 'E' | 'F') => ({ id, offsetTicks: 0, durationTicks: 1, pitch: { step, alter: 0 as const, octave: 4 }, rest: false, tie: null, confidence: 1, alternatives: [] });
    const draft = { measures: [{ events: [event('d', 'D'), event('e', 'E'), event('f', 'F')] }] } as unknown as ScoreDraft;
    const route = suggestMelodyRoute(draft);
    expect(route.get('d')).toMatchObject({ stringIndex: 0, fret: 0 });
    expect(route.get('e')).toMatchObject({ stringIndex: 0, fret: 2 });
    expect(route.get('f')).toMatchObject({ stringIndex: 0, fret: 3 });
  });

  test('keeps playable route segments around notes outside the cavaquinho range', () => {
    const event = (id: string, step: 'C' | 'D' | 'E', octave: number) => ({
      id, offsetTicks: 0, durationTicks: 1,
      pitch: { step, alter: 0 as const, octave }, rest: false, tie: null, confidence: 1, alternatives: []
    });
    const draft = {
      measures: [{ events: [event('d', 'D', 4), event('too-high', 'C', 7), event('e', 'E', 4)] }]
    } as unknown as ScoreDraft;
    const route = suggestMelodyRoute(draft);
    expect(route.get('d')).toMatchObject({ midi: 62 });
    expect(route.get('too-high')).toBeNull();
    expect(route.get('e')).toMatchObject({ midi: 64 });
  });
});
