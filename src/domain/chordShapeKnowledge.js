import { cavaquinhoOpenMidi } from './scalePaths';

export const chordShapeKnowledgeVersion = 1;

export const validatedShapeFingerings = Object.freeze({
  '5,4,5,5': [[2, 1, 3, 4], [2, 1, 3, 3]],
  '5,7,5,8': [[1, 3, 1, 4]],
  '5,9,5,5': [[1, 4, 1, 1]],
  '7,11,7,7': [[1, 4, 1, 1]],
  '2,6,2,5': [[1, 4, 1, 3]]
});

export const chordShapeRegions = Object.freeze({
  low: { id: 'low', label: 'Baixa', minimum: 0, maximum: 4 },
  middle: { id: 'middle', label: 'Média', minimum: 5, maximum: 8 },
  high: { id: 'high', label: 'Aguda', minimum: 9, maximum: 14 }
});

export const getAbsoluteShapeFrets = position => {
  const baseFret = position?.baseFret || 1;
  return (position?.frets || []).map(fret => fret <= 0 ? fret : baseFret + fret - 1);
};

export const getShapeFingeringAlternatives = position => {
  const frets = getAbsoluteShapeFrets(position);
  const key = frets.join(',');
  const candidates = [position?.fingers, ...(validatedShapeFingerings[key] || [])];
  const seen = new Set();
  return candidates.filter(fingers => {
    if (!Array.isArray(fingers) || fingers.length !== 4 || fingers.some(finger => !Number.isInteger(finger) || finger < 0 || finger > 4)) return false;
    const signature = fingers.join(',');
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
};

export const getChordShapeRegion = position => {
  const fretted = getAbsoluteShapeFrets(position).filter(fret => fret > 0);
  const anchor = fretted.length ? Math.min(...fretted) : 0;
  return Object.values(chordShapeRegions).find(region => anchor >= region.minimum && anchor <= region.maximum)?.id || null;
};

export const fretboardPositionRatio = fret => 1 - 2 ** (-Math.max(0, fret) / 12);

export const getShapeHandCost = position => {
  const frets = getAbsoluteShapeFrets(position);
  const pressed = frets.filter(fret => fret > 0);
  if (!pressed.length) return 0;
  const normalizedSpan = Math.max(...pressed.map(fretboardPositionRatio)) - Math.min(...pressed.map(fretboardPositionRatio));
  const indexSpan = Math.max(...pressed) - Math.min(...pressed);
  const fingers = position?.fingers || [];
  const fingerCount = new Set(fingers.filter(Boolean)).size;
  const barreCount = Array.isArray(position?.barres) ? position.barres.length : 0;
  return normalizedSpan * 12 + indexSpan * 0.2 + fingerCount * 0.15 + barreCount * 0.35;
};

export const getShapeNoteDetails = (position, key, suffix, getToneDetail) => {
  const frets = getAbsoluteShapeFrets(position);
  let midiIndex = -1;
  return frets.map((fret, stringIndex) => {
    if (fret < 0) return { stringIndex, muted: true, note: null, degree: null };
    const midi = cavaquinhoOpenMidi[stringIndex] + fret;
    const tone = getToneDetail(key, suffix, midi);
    midiIndex += 1;
    return { stringIndex, midiIndex, fret, midi, muted: false, note: tone?.note || null, degree: tone?.degreeLabel || null };
  });
};
