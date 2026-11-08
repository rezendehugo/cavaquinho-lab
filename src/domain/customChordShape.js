const tuningMidi = [62, 67, 71, 74];

export function normalizeCustomPosition(value) {
  if (!value || !Array.isArray(value.frets) || value.frets.length !== 4) return null;
  const frets = value.frets.map(fret => Number.isInteger(fret) && fret >= -1 && fret <= 24 ? fret : null);
  if (frets.some(fret => fret === null)) return null;
  const fingers = Array.isArray(value.fingers) && value.fingers.length === 4
    ? value.fingers.map(finger => Number.isInteger(finger) && finger >= 0 && finger <= 4 ? finger : 0)
    : [0, 0, 0, 0];
  const played = frets.flatMap((fret, index) => fret < 0 ? [] : [tuningMidi[index] + fret]);
  const positiveFrets = frets.filter(fret => fret > 0);
  const baseFret = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const diagramFrets = frets.map(fret => fret <= 0 ? fret : fret - baseFret + 1);
  return { frets: diagramFrets, fingers, barres: [], baseFret, midi: played };
}

export const customShapeFrets = position => position?.frets?.map(fret => fret < 0 ? -1 : fret) || [];
