import { describe, expect, it } from 'vitest';
import { applyChordShapeToOccurrences, getSequenceChordCatalog, getSequenceChordIdentity } from './sequenceChordCatalog';

describe('distinct chord catalog for shape selection', () => {
  it('groups enharmonic roots and suffix aliases but keeps different qualities and bass notes separate', () => {
    const chords = [
      { id: 'flat', key: 'Db', displayKey: 'Db', suffix: 'sus4' },
      { id: 'sharp', key: 'Db', displayKey: 'C#', suffix: '4' },
      { id: 'major', key: 'Db', displayKey: 'Db', suffix: 'major' },
      { id: 'slash', key: 'Db', displayKey: 'Db', suffix: 'sus4', bassNote: 'F' }
    ];

    expect(getSequenceChordIdentity(chords[0])).toBe(getSequenceChordIdentity(chords[1]));
    expect(getSequenceChordIdentity(chords[0])).not.toBe(getSequenceChordIdentity(chords[2]));
    expect(getSequenceChordIdentity(chords[0])).not.toBe(getSequenceChordIdentity(chords[3]));
    expect(getSequenceChordCatalog(chords).map(item => item.indexes)).toEqual([[0, 1], [2], [3]]);
  });

  it('keeps catalog order at first appearance and records every matching occurrence', () => {
    const steps = [
      { id: 'one', key: 'G', suffix: '7' },
      { id: 'two', key: 'D', suffix: 'minor' },
      { id: 'three', key: 'G', suffix: '7' },
      { id: 'four', key: 'G', suffix: 'm7' }
    ];
    expect(getSequenceChordCatalog(steps).map(({ step, indexes }) => [step.key, step.suffix, indexes])).toEqual([
      ['G', '7', [0, 2]], ['D', 'minor', [1]], ['G', 'm7', [3]]
    ]);
  });

  it('shares a selected library shape across repetitions without changing occurrence timing', () => {
    const steps = [
      { id: 'first', key: 'G', suffix: '7', practiceBeats: 2, positionIndex: 0 },
      { id: 'between', key: 'D', suffix: 'minor', practiceBeats: 3, positionIndex: 1 },
      { id: 'repeat', key: 'G', suffix: '7', practiceBeats: 5, positionIndex: 2 }
    ];
    const selected = applyChordShapeToOccurrences(steps, steps[2], { positionIndex: 4, shapeSuffix: '7', frets: [3, 2, 1, 0], fingers: [3, 2, 1, 0] });
    expect(selected.map(step => step.practiceBeats)).toEqual([2, 3, 5]);
    expect(selected.map(step => step.positionIndex)).toEqual([4, 1, 4]);
    expect(selected[1]).toBe(steps[1]);
  });

  it('persists physical frets for enharmonic occurrences instead of reusing an unrelated library index', () => {
    const steps = [
      { id: 'flat', key: 'Db', displayKey: 'Db', suffix: 'sus4', practiceBeats: 2 },
      { id: 'sharp', key: 'Db', displayKey: 'C#', suffix: '4', practiceBeats: 4 }
    ];
    const selected = applyChordShapeToOccurrences(steps, steps[0], {
      positionIndex: 3, shapeSuffix: 'sus4', frets: [1, 2, 3, 4], fingers: [1, 2, 3, 4]
    });
    expect(selected.map(step => step.positionIndex)).toEqual([3, null]);
    expect(selected[1].customPosition).toEqual({ frets: [1, 2, 3, 4], fingers: [1, 2, 3, 4] });
    expect(selected.map(step => step.practiceBeats)).toEqual([2, 4]);
  });

  it('keeps repeated chords shared inside a region block but independent between regions', () => {
    const steps = [
      { id: 'low-1', key: 'C', suffix: 'major', regionId: 'low', regionBlockId: 'c-low' },
      { id: 'low-2', key: 'C', suffix: 'major', regionId: 'low', regionBlockId: 'c-low' },
      { id: 'middle', key: 'C', suffix: 'major', regionId: 'middle', regionBlockId: 'c-middle' }
    ];
    expect(getSequenceChordCatalog(steps).map(item => item.indexes)).toEqual([[0, 1], [2]]);
    const selected = applyChordShapeToOccurrences(steps, steps[0], { positionIndex: 3, shapeSuffix: 'major' });
    expect(selected.map(step => step.positionIndex)).toEqual([3, 3, undefined]);
  });
});
