import { describe, expect, it } from 'vitest';
import { fretboardPositionRatio, getChordShapeRegion, getShapeFingeringAlternatives, getShapeHandCost, getShapeNoteDetails } from './chordShapeKnowledge';

describe('cavaquinho shape knowledge', () => {
  it('classifies positions by the lowest pressed fret and includes open shapes in the low region', () => {
    expect(getChordShapeRegion({ frets: [0, 2, 3, 3], baseFret: 1 })).toBe('low');
    expect(getChordShapeRegion({ frets: [5, 7, 5, 8], baseFret: 1 })).toBe('middle');
    expect(getChordShapeRegion({ frets: [9, 11, 9, 12], baseFret: 1 })).toBe('high');
  });

  it('uses the equal-tempered fret position ratio and lowers relative distance in higher regions', () => {
    expect(fretboardPositionRatio(12)).toBeCloseTo(0.5);
    expect(fretboardPositionRatio(24)).toBeCloseTo(0.75);
    expect(getShapeHandCost({ frets: [9, 11, 9, 9], fingers: [1, 3, 1, 1] }))
      .toBeLessThan(getShapeHandCost({ frets: [1, 3, 1, 1], fingers: [1, 3, 1, 1] }));
  });

  it('returns per-string sounding notes and marks muted strings without inventing a note', () => {
    const details = getShapeNoteDetails({ frets: [2, -1, 2, 5], baseFret: 1 }, 'C#', 'dim', () => ({ note: 'test', degreeLabel: '1' }));
    expect(details.map(detail => detail.muted)).toEqual([false, true, false, false]);
    expect(details[1]).toMatchObject({ stringIndex: 1, note: null, degree: null });
  });

  it('keeps both comfortable Em fingerings attached to one physical grip', () => {
    expect(getShapeFingeringAlternatives({ frets: [5, 4, 5, 5], fingers: [2, 1, 3, 4] }))
      .toEqual([[2, 1, 3, 4], [2, 1, 3, 3]]);
  });
});
