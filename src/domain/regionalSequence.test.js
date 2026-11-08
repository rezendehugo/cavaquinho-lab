import { describe, expect, it } from 'vitest';
import { getCavaquinhoChords } from './chords';
import { buildRegionalSequence } from './regionalSequence';

describe('regional sequence studies', () => {
  it('builds three successive blocks while preserving each chord identity', () => {
    const source = { id: 'c-major-study', title: 'C maior', steps: [{ id: 'c', key: 'C', suffix: 'major', practiceBeats: 3 }] };
    const result = buildRegionalSequence(source, getCavaquinhoChords());
    expect(result.complete).toBe(true);
    expect(result.blocks.map(block => block.regionId)).toEqual(['low', 'middle', 'high']);
    expect(result.sequence.steps.map(step => step.regionBlockId)).toEqual([
      'c-major-study:region:low', 'c-major-study:region:middle', 'c-major-study:region:high'
    ]);
    expect(result.sequence.steps.map(step => step.key)).toEqual(['C', 'C', 'C']);
    expect(result.sequence.steps.map(step => step.practiceBeats)).toEqual([3, 3, 3]);
  });

  it('reports missing chord-region solutions instead of returning a partial study', () => {
    const result = buildRegionalSequence({ id: 'unsupported', title: 'Teste', steps: [{ id: 'x', key: 'C', suffix: 'unsupported' }] }, getCavaquinhoChords());
    expect(result.complete).toBe(false);
    expect(result.sequence).toBeNull();
    expect(result.blocks).toEqual([]);
    expect(result.missing.map(item => item.regionId)).toEqual(['low', 'middle', 'high']);
  });
});
