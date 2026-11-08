import { getChordShapeCandidates } from '../progressionOptimizer';
import { chordShapeRegions, getChordShapeRegion } from './chordShapeKnowledge';

const createStepId = () => globalThis.crypto?.randomUUID?.() || `step-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const buildRegionalSequence = (sequence, chordDb) => {
  const blocks = [];
  const missing = [];
  for (const region of Object.values(chordShapeRegions)) {
    const blockId = `${sequence.id}:region:${region.id}`;
    const blockSteps = [];
    sequence.steps.forEach((step, index) => {
      const candidate = getChordShapeCandidates(step, chordDb)
        .find(item => getChordShapeRegion(item.position) === region.id);
      if (!candidate) {
        missing.push({ regionId: region.id, regionLabel: region.label, step, index });
        return;
      }
      blockSteps.push({
        ...step,
        id: createStepId(),
        positionIndex: candidate.custom ? null : candidate.positionIndex,
        shapeSuffix: candidate.shapeSuffix || step.suffix,
        ...(candidate.custom ? { customPosition: { frets: candidate.position.frets.map(fret => fret <= 0 ? fret : (candidate.position.baseFret || 1) + fret - 1), fingers: [...candidate.position.fingers] } } : { customPosition: undefined }),
        regionId: region.id,
        regionBlockId: blockId,
        regionSourceStepId: step.id
      });
    });
    if (blockSteps.length === sequence.steps.length) blocks.push({ id: blockId, regionId: region.id, label: region.label, steps: blockSteps });
  }
  const complete = missing.length === 0;
  return {
    complete,
    missing,
    blocks: complete ? blocks : [],
    sequence: complete ? { ...sequence, title: `${sequence.title} · regiões`, steps: blocks.flatMap(block => block.steps), loopStartIndex: 0, regionMode: 'blocks' } : null
  };
};
