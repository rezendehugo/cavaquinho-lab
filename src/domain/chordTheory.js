const pitchNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const chordQualities = {
  major: { intervals: [0, 4, 7], family: 'tríade maior', required: [0, 4] },
  minor: { intervals: [0, 3, 7], family: 'tríade menor', required: [0, 3] },
  '6': { intervals: [0, 4, 7, 9], family: 'tétrade maior com sexta', required: [0, 4, 9] },
  m6: { intervals: [0, 3, 7, 9], family: 'tétrade menor com sexta', required: [0, 3, 9] },
  '7': { intervals: [0, 4, 7, 10], family: 'tétrade dominante', required: [0, 4, 10] },
  maj7: { intervals: [0, 4, 7, 11], family: 'tétrade maior com sétima', required: [0, 4, 11] },
  m7: { intervals: [0, 3, 7, 10], family: 'tétrade menor com sétima', required: [0, 3, 10] },
  m7b5: { intervals: [0, 3, 6, 10], family: 'tétrade meio diminuta', required: [0, 3, 6, 10] },
  dim: { intervals: [0, 3, 6], family: 'tríade diminuta', required: [0, 3, 6] },
  dim7: { intervals: [0, 3, 6, 9], family: 'tétrade diminuta simétrica', required: [0, 3, 6, 9], symmetry: 3 },
  sus2: { intervals: [0, 2, 7], family: 'tríade suspensa com segunda', required: [0, 2] },
  sus4: { intervals: [0, 5, 7], family: 'tríade suspensa com quarta', required: [0, 5], aliases: ['4', 'sus'] },
  '7sus4': { intervals: [0, 5, 7, 10], family: 'tétrade dominante suspensa com quarta', required: [0, 5, 10], aliases: ['7sus'] },
  add9: { intervals: [0, 2, 4, 7], family: 'tríade maior com nona adicionada', required: [0, 2, 4] },
  '9': { intervals: [0, 2, 4, 7, 10], family: 'dominante com nona', required: [2, 4, 10] },
  aug: { intervals: [0, 4, 8], family: 'tríade aumentada', required: [0, 4, 8], aliases: ['+', 'aum'] },
  '69': { intervals: [0, 2, 4, 7, 9], family: 'acorde maior com sexta e nona', required: [0, 4, 9], aliases: ['6/9'] },
  m9: { intervals: [0, 2, 3, 7, 10], family: 'acorde menor com nona', required: [2, 3, 10] },
  maj9: { intervals: [0, 2, 4, 7, 11], family: 'acorde maior com sétima maior e nona', required: [2, 4, 11], aliases: ['7M(9)'] },
  madd9: { intervals: [0, 2, 3, 7], family: 'tríade menor com nona adicionada', required: [0, 2, 3], aliases: ['m(add9)'] }
};

const uniqueSorted = (values) => [...new Set(values)].sort((a, b) => a - b);
const sameSet = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
const spokenPitchNames = ['Dó', 'Ré bemol', 'Ré', 'Mi bemol', 'Mi', 'Fá', 'Sol bemol', 'Sol', 'Lá bemol', 'Lá', 'Si bemol', 'Si'];
const degreeDetails = {
  0: { degreeId: 'root', degreeLabel: '1', description: 'tônica', colorGroup: 'root' },
  1: { degreeId: 'ninth', degreeLabel: '♭9', description: 'nona menor', colorGroup: 'ninth' },
  2: { degreeId: 'ninth', degreeLabel: '9', description: 'nona', colorGroup: 'ninth' },
  3: { degreeId: 'third', degreeLabel: '♭3', description: 'terça menor', colorGroup: 'third' },
  4: { degreeId: 'third', degreeLabel: '3', description: 'terça maior', colorGroup: 'third' },
  5: { degreeId: 'fourth', degreeLabel: '4', description: 'quarta justa', colorGroup: 'fourth' },
  6: { degreeId: 'fifth', degreeLabel: '♭5', description: 'quinta diminuta', colorGroup: 'fifth' },
  7: { degreeId: 'fifth', degreeLabel: '5', description: 'quinta justa', colorGroup: 'fifth' },
  8: { degreeId: 'fifth', degreeLabel: '♯5', description: 'quinta aumentada', colorGroup: 'fifth' },
  9: { degreeId: 'sixth', degreeLabel: '6', description: 'sexta', colorGroup: 'seventh' },
  10: { degreeId: 'seventh', degreeLabel: '♭7', description: 'sétima menor', colorGroup: 'seventh' },
  11: { degreeId: 'seventh', degreeLabel: '7M', description: 'sétima maior', colorGroup: 'seventh' }
};

export function getChordToneDetail(key, suffix, midi) {
  const root = pitchNames.indexOf(key);
  const quality = chordQualities[suffix];
  if (root < 0 || !quality || !Number.isFinite(midi)) return null;
  const pitchClass = ((midi % 12) + 12) % 12;
  const interval = (pitchClass - root + 12) % 12;
  if (!quality.intervals.includes(interval)) return null;
  const detail = degreeDetails[interval];
  return {
    pitchClass,
    note: pitchNames[pitchClass],
    interval,
    ...detail,
    accessibleName: `${spokenPitchNames[pitchClass]}, ${detail.description} de ${spokenPitchNames[root]}`
  };
}

export function getChordDegreeLegend(key, suffix, position) {
  const details = (position?.midi || [])
    .map((midi) => getChordToneDetail(key, suffix, midi))
    .filter(Boolean);
  return [...details
    .reduce((items, detail) => {
      if (!items.has(detail.interval)) items.set(detail.interval, detail);
      return items;
    }, new Map())
    .values()]
    .sort((left, right) => left.interval - right.interval);
}

export const getChordPitchClasses = (key, suffix) => {
  const root = pitchNames.indexOf(key);
  const quality = chordQualities[suffix];
  if (root < 0 || !quality) return [];
  return uniqueSorted(quality.intervals.map(interval => (root + interval) % 12));
};

export const getPositionPitchClasses = (position) => uniqueSorted((position?.midi || []).map(note => note % 12));

export const positionMatchesChordExactly = (position, key, suffix) => sameSet(getPositionPitchClasses(position), getChordPitchClasses(key, suffix));

export const getVoicingCompleteness = (analysis) => {
  if (!analysis) return null;
  if (analysis.extraNotes.length) {
    return { id: 'additional', label: `Voicing com notas adicionais: ${analysis.extraNotes.join(', ')}.` };
  }
  if (analysis.rootMissing && analysis.missingEssentialNotes.length === 0) {
    return {
      id: 'rootless',
      label: analysis.suffix === '9'
        ? 'Voicing sem raiz: contém terça, sétima menor e nona. Recomendado com baixo ou acompanhamento.'
        : 'Voicing sem raiz: contém terça, sétima e nona. Recomendado com baixo ou acompanhamento.'
    };
  }
  if (analysis.missingNotes.length) {
    return { id: 'incomplete', label: `Voicing incompleto: omite ${analysis.missingNotes.join(', ')}. Válido no cavaquinho.` };
  }
  return { id: 'complete', label: 'Voicing completo: contém todas as notas do acorde.' };
};

export const getEquivalentChords = (key, suffix) => {
  const target = getChordPitchClasses(key, suffix);
  if (!target.length) return [];
  return pitchNames.flatMap(candidateKey => Object.keys(chordQualities).map(candidateSuffix => ({ key: candidateKey, suffix: candidateSuffix })))
    .filter(candidate => !(candidate.key === key && candidate.suffix === suffix))
    .filter(candidate => sameSet(getChordPitchClasses(candidate.key, candidate.suffix), target));
};

export const analyzeChordVoicing = (step, position) => {
  const quality = chordQualities[step.suffix];
  if (!quality) return null;
  const expected = getChordPitchClasses(step.key, step.suffix);
  const played = getPositionPitchClasses(position);
  const missing = expected.filter(note => !played.includes(note));
  const extra = played.filter(note => !expected.includes(note));
  const equivalents = getEquivalentChords(step.key, step.suffix);
  const root = pitchNames.indexOf(step.key);
  const essentialPitchClasses = quality.required.map(interval => (root + interval) % 12);
  const missingEssential = essentialPitchClasses.filter(note => !played.includes(note));
  const notes = quality.intervals.map(interval => pitchNames[(root + interval) % 12]);
  const playedInStringOrder = [...new Set((position?.midi || []).map(note => note % 12))];
  const lowestMidi = position?.midi?.length ? Math.min(...position.midi) : null;
  const bassNote = lowestMidi === null ? null : pitchNames[lowestMidi % 12];
  return {
    suffix: step.suffix,
    family: quality.family,
    notes,
    playedNotes: playedInStringOrder.map(note => pitchNames[note]),
    missingNotes: missing.map(note => pitchNames[note]),
    missingEssentialNotes: missingEssential.map(note => pitchNames[note]),
    extraNotes: extra.map(note => pitchNames[note]),
    rootMissing: !played.includes(root),
    exact: missing.length === 0 && extra.length === 0,
    equivalents,
    aliases: (quality.aliases || []).map(alias => `${step.key}${alias}`),
    bassNote,
    inversion: Boolean(bassNote && bassNote !== step.key),
    symmetry: quality.symmetry || null
  };
};
