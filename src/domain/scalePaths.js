import { noteNames } from '../chordDisplay';
import { getPitchClass, getScalePitchClasses, scaleDefinitions } from './scales';

export const cavaquinhoOpenMidi = [62, 67, 71, 74];
export const scalePathStorageVersion = 2;

export const fretRegions = {
  low: { label: 'Grave', minimum: 0, maximum: 4 },
  middle: { label: 'Média', minimum: 4, maximum: 8 },
  high: { label: 'Aguda', minimum: 8, maximum: 12 },
  compact: { label: 'Mais compacta', minimum: 0, maximum: 12 }
};

/** @typedef {import('./scalePaths.types').ScalePathPosition} ScalePathPosition */
/** @typedef {import('./scalePaths.types').ScalePath} ScalePath */

export const buildFretboardPositions = () => cavaquinhoOpenMidi.flatMap((openMidi, stringIndex) => (
  Array.from({ length: 13 }, (_item, fret) => {
    const midi = openMidi + fret;
    const pitchClass = midi % 12;
    return { stringIndex, fret, midi, pitchClass, note: noteNames[pitchClass], octave: Math.floor(midi / 12) - 1 };
  })
));

const transitionCost = (left, right) => Math.abs(left.fret - right.fret) * 2 + Math.abs(left.stringIndex - right.stringIndex) * 1.25;

const findBestCandidatePath = (targetMidi, positions) => {
  let states = positions.filter(position => position.midi === targetMidi[0]).map(position => ({ score: position.fret * 0.03, positions: [position] }));
  for (const midi of targetMidi.slice(1)) {
    const candidates = positions.filter(position => position.midi === midi);
    if (!candidates.length || !states.length) return null;
    states = candidates.map(candidate => states.map(state => ({
      score: state.score + transitionCost(state.positions.at(-1), candidate),
      positions: state.positions.concat(candidate)
    })).reduce((best, current) => current.score < best.score ? current : best));
  }
  return states.reduce((best, current) => current.score < best.score ? current : best);
};

const createPathId = (root, scaleId, region) => ['generated', root, scaleId, region].join('-');

export const getScalePositionsInRegion = (root, scaleId, regionId = 'compact') => {
  const region = fretRegions[regionId] || fretRegions.compact;
  const pitchClasses = new Set(getScalePitchClasses(root, scaleId));
  return buildFretboardPositions()
    .filter(position => position.fret >= region.minimum && position.fret <= region.maximum && pitchClasses.has(position.pitchClass))
    .map(position => ({ ...position, degree: getScalePitchClasses(root, scaleId).indexOf(position.pitchClass) }));
};

const getScaleTargetMidi = (startMidi, endMidi, pitchClasses) => {
  const direction = Math.sign(endMidi - startMidi);
  if (!direction) return [];
  const targets = [];
  for (let midi = startMidi; direction > 0 ? midi <= endMidi : midi >= endMidi; midi += direction) {
    if (pitchClasses.includes(((midi % 12) + 12) % 12)) targets.push(midi);
  }
  return targets;
};

export const generateAnchoredScalePath = (root, scaleId, regionId, start, end) => {
  const empty = { id: createPathId(root, scaleId, regionId), name: (fretRegions[regionId] || fretRegions.compact).label, root, scaleId, region: regionId, start, end, positions: [] };
  if (!start || !end || start.midi === end.midi) return empty;
  const scalePitchClasses = getScalePitchClasses(root, scaleId);
  const regionalPositions = getScalePositionsInRegion(root, scaleId, regionId);
  const regionalKeys = new Set(regionalPositions.map(position => position.stringIndex + ':' + position.fret));
  const startKey = start.stringIndex + ':' + start.fret;
  const endKey = end.stringIndex + ':' + end.fret;
  if (!scalePitchClasses.includes(start.pitchClass) || !scalePitchClasses.includes(end.pitchClass) || !regionalKeys.has(startKey) || !regionalKeys.has(endKey)) return empty;
  const targets = getScaleTargetMidi(start.midi, end.midi, scalePitchClasses);
  if (targets.length < 2) return empty;
  let states = [{ score: 0, positions: [{ ...start, degree: scalePitchClasses.indexOf(start.pitchClass) }] }];
  for (const [index, midi] of targets.slice(1).entries()) {
    const isEnd = index === targets.length - 2;
    const candidates = isEnd ? [end] : regionalPositions.filter(position => position.midi === midi);
    if (!candidates.length) return empty;
    states = candidates.map(candidate => states.map(state => ({
      score: state.score + transitionCost(state.positions.at(-1), candidate),
      positions: state.positions.concat({ ...candidate, degree: scalePitchClasses.indexOf(candidate.pitchClass) })
    })).reduce((best, current) => current.score < best.score ? current : best));
  }
  const best = states.reduce((currentBest, candidate) => candidate.score < currentBest.score ? candidate : currentBest);
  return { ...empty, positions: best.positions };
};

export const generateScalePath = (root, scaleId, regionId = 'compact') => {
  const region = fretRegions[regionId] || fretRegions.compact;
  const pitchClasses = getScalePitchClasses(root, scaleId);
  const scale = scaleDefinitions[scaleId];
  if (!pitchClasses.length || !scale) return { id: createPathId(root, scaleId, regionId), name: region.label, root, scaleId, region: regionId, positions: [] };
  const positions = buildFretboardPositions().filter(position => position.fret >= region.minimum && position.fret <= region.maximum);
  const rootPitchClass = getPitchClass(root);
  const startMidi = [...new Set(positions.filter(position => position.pitchClass === rootPitchClass).map(position => position.midi))];
  const candidates = startMidi.map(start => {
    const targets = scale.intervals.concat(12).map(interval => start + interval);
    return findBestCandidatePath(targets, positions);
  }).filter(Boolean);
  const best = candidates.length ? candidates.reduce((currentBest, candidate) => candidate.score < currentBest.score ? candidate : currentBest) : null;
  const pathPositions = (best?.positions || []).map(position => ({ ...position, degree: pitchClasses.indexOf(position.pitchClass) }));
  return { id: createPathId(root, scaleId, regionId), name: region.label, root, scaleId, region: regionId, start: pathPositions[0], end: pathPositions.at(-1), positions: pathPositions };
};

export const getGeneratedScalePaths = (root, scaleId) => Object.keys(fretRegions)
  .map(region => generateScalePath(root, scaleId, region))
  .filter(path => path.positions.length > 0);

export const buildPathTraversal = (positions, direction = 'upDown') => {
  if (direction === 'down') return [...positions].reverse();
  if (direction === 'up' || direction === 'oneWay') return positions;
  return positions.concat(positions.slice(1, -1).reverse());
};

export const getCustomPathCandidates = (root, scaleId, selectedPositions) => {
  const scale = scaleDefinitions[scaleId];
  if (!scale || selectedPositions.length > scale.intervals.length) return [];
  const interval = scale.intervals.concat(12)[selectedPositions.length];
  const targetMidi = selectedPositions.length ? selectedPositions[0].midi + interval : null;
  return buildFretboardPositions().filter(position => selectedPositions.length
    ? position.midi === targetMidi
    : position.pitchClass === getPitchClass(root));
};

export const validateCustomScalePath = (path) => {
  if (!path || !scaleDefinitions[path.scaleId] || getPitchClass(path.root) < 0 || !Array.isArray(path.positions)) return { ok: false, message: 'Caminho inválido.' };
  if (path.positions.length < 2) return { ok: false, message: 'Escolha início e fim diferentes.' };
  const expectedClasses = getScalePitchClasses(path.root, path.scaleId);
  const expectedMidi = getScaleTargetMidi(path.positions[0].midi, path.positions.at(-1).midi, expectedClasses);
  if (expectedMidi.length !== path.positions.length) return { ok: false, message: 'O caminho deve seguir os graus da escala em ordem.' };
  const validPositions = path.positions.every((position, index) => Number.isInteger(position.stringIndex)
    && position.stringIndex >= 0 && position.stringIndex < 4
    && Number.isInteger(position.fret) && position.fret >= 0 && position.fret <= 12
    && position.midi === cavaquinhoOpenMidi[position.stringIndex] + position.fret
    && expectedClasses.includes(position.pitchClass)
    && position.pitchClass === position.midi % 12
    && position.octave === Math.floor(position.midi / 12) - 1
    && position.degree === expectedClasses.indexOf(position.pitchClass)
    && position.midi === expectedMidi[index]);
  const anchorsMatch = path.start && path.end
    && path.start.stringIndex === path.positions[0].stringIndex && path.start.fret === path.positions[0].fret
    && path.end.stringIndex === path.positions.at(-1).stringIndex && path.end.fret === path.positions.at(-1).fret;
  if (!validPositions || !anchorsMatch) return { ok: false, message: 'Siga os graus em ordem entre as âncoras.' };
  return { ok: true, message: '' };
};

export const normalizeStoredScalePaths = (value) => {
  const sourcePaths = Array.isArray(value?.paths) ? value.paths : [];
  const migrated = value?.version === 1 ? sourcePaths.map(path => {
    const pitchClasses = getScalePitchClasses(path.root, path.scaleId);
    const positions = Array.isArray(path.positions) ? path.positions.map(position => ({ ...position, degree: pitchClasses.indexOf(position.pitchClass) })) : [];
    return { ...path, start: positions[0], end: positions.at(-1), positions };
  }) : sourcePaths;
  const paths = [1, scalePathStorageVersion].includes(value?.version)
    ? migrated.filter(path => validateCustomScalePath(path).ok).map(path => ({ ...path, custom: true })) : [];
  return { version: scalePathStorageVersion, paths };
};
