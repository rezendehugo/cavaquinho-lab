const pitchNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const enharmonicPitchClasses = { 'C#': 1, 'D#': 3, 'F#': 6, 'G#': 8, 'A#': 10, Cb: 11, Fb: 4, 'E#': 5, 'B#': 0 };
const spokenNamesByPitch = {
  C: 'Dó', Db: 'Ré bemol', 'C#': 'Dó sustenido', D: 'Ré', Eb: 'Mi bemol', 'D#': 'Ré sustenido', E: 'Mi', F: 'Fá',
  Gb: 'Sol bemol', 'F#': 'Fá sustenido', G: 'Sol', Ab: 'Lá bemol', 'G#': 'Sol sustenido', A: 'Lá', Bb: 'Si bemol', 'A#': 'Lá sustenido', B: 'Si'
};

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
  aug: { intervals: [0, 4, 8], family: 'tríade aumentada', required: [0, 4, 8], aliases: ['+', 'aum'], rootRequired: true },
  '69': { intervals: [0, 2, 4, 7, 9], family: 'acorde maior com sexta e nona', required: [0, 4, 9], aliases: ['6/9'] },
  m9: { intervals: [0, 2, 3, 7, 10], family: 'acorde menor com nona', required: [2, 3, 10] },
  maj9: { intervals: [0, 2, 4, 7, 11], family: 'acorde maior com sétima maior e nona', required: [2, 4, 11], aliases: ['7M(9)'] },
  madd9: { intervals: [0, 2, 3, 7], family: 'tríade menor com nona adicionada', required: [0, 2, 3], aliases: ['m(add9)'], rootRequired: true },
  mmaj7: { intervals: [0, 3, 7, 11], family: 'acorde menor com sétima maior', required: [0, 3, 11], aliases: ['m(7M)', 'm(maj7)', 'mM7'], rootRequired: true }
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

const letterSemitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const degreeLetterOffsets = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 8: 4, 9: 5, 10: 6, 11: 6 };

const detailForInterval = (interval, suffix) => {
  if (suffix === 'sus2' && interval === 2) return { degreeId: 'second', degreeLabel: '2', description: 'segunda maior', colorGroup: 'ninth' };
  if (suffix === 'dim7' && interval === 9) return { degreeId: 'seventh', degreeLabel: '♭♭7', description: 'sétima diminuta', colorGroup: 'seventh' };
  return degreeDetails[interval];
};

const getPitchClass = (key) => pitchNames.indexOf(key) >= 0 ? pitchNames.indexOf(key) : enharmonicPitchClasses[key] ?? -1;
const getSpokenName = (key, pitchClass) => spokenNamesByPitch[key] || spokenPitchNames[pitchClass];

const spellChordTone = (key, interval, suffix) => {
  const rootLetter = key?.[0];
  const rootPitch = letterSemitones[rootLetter];
  const root = getPitchClass(key);
  if (rootPitch === undefined || root < 0) return pitchNames[(root + interval + 12) % 12];
  const letterOffset = suffix === 'dim7' && interval === 9 ? 6 : degreeLetterOffsets[interval];
  const targetLetter = letters[(letters.indexOf(rootLetter) + letterOffset) % letters.length];
  const targetPitch = (root + interval) % 12;
  let delta = (targetPitch - letterSemitones[targetLetter] + 12) % 12;
  if (delta > 6) delta -= 12;
  return `${targetLetter}${delta === -2 ? 'bb' : delta === -1 ? 'b' : delta === 1 ? '#' : delta === 2 ? '##' : ''}`;
};

export function getChordToneDetail(key, suffix, midi) {
  const root = getPitchClass(key);
  const quality = chordQualities[suffix];
  if (root < 0 || !quality || !Number.isFinite(midi)) return null;
  const pitchClass = ((midi % 12) + 12) % 12;
  const interval = (pitchClass - root + 12) % 12;
  if (!quality.intervals.includes(interval)) return null;
  const detail = detailForInterval(interval, suffix);
  return {
    pitchClass,
    note: spellChordTone(key, interval, suffix),
    spokenNote: getSpokenName(spellChordTone(key, interval, suffix), pitchClass),
    interval,
    ...detail,
    accessibleName: `${getSpokenName(spellChordTone(key, interval, suffix), pitchClass)}, ${detail.description} de ${getSpokenName(key, root)}`
  };
}

export function getChordFormulaLegend(key, suffix) {
  const root = getPitchClass(key);
  const quality = chordQualities[suffix];
  if (root < 0 || !quality) return [];
  return quality.intervals.map((interval) =>
    getChordToneDetail(key, suffix, root + interval)
  );
}

export function compareChordShapes(step, reference, candidate) {
  const referenceDetails = getChordDegreeLegend(step.key, step.suffix, reference);
  const candidateDetails = getChordDegreeLegend(step.key, step.suffix, candidate);
  const referenceIntervals = new Set(referenceDetails.map(detail => detail.interval));
  const candidateIntervals = new Set(candidateDetails.map(detail => detail.interval));
  const detailByInterval = new Map([...referenceDetails, ...candidateDetails].map(detail => [detail.interval, detail]));
  const absoluteFret = (position, index) => {
    const fret = position?.frets?.[index] ?? -1;
    if (fret < 0) return null;
    return fret === 0 ? 0 : (position.baseFret || 1) + fret - 1;
  };
  return {
    added: [...candidateIntervals].filter(interval => !referenceIntervals.has(interval)).map(interval => detailByInterval.get(interval)),
    removed: [...referenceIntervals].filter(interval => !candidateIntervals.has(interval)).map(interval => detailByInterval.get(interval)),
    strings: Array.from({ length: 4 }, (_item, stringIndex) => {
      const from = absoluteFret(reference, stringIndex);
      const to = absoluteFret(candidate, stringIndex);
      const label = `Corda ${stringIndex + 1}`;
      if (from === null && to === null) return { stringIndex, description: `${label} permanece abafada.` };
      if (from === null) return { stringIndex, description: `${label}: entra no traste ${to}.` };
      if (to === null) return { stringIndex, description: `${label}: sai do traste ${from}.` };
      if (from === to) return { stringIndex, description: `${label}: permanece no traste ${to}.` };
      const distance = to - from;
      return { stringIndex, description: `${label}: ${distance > 0 ? 'sobe' : 'desce'} ${Math.abs(distance)} ${Math.abs(distance) === 1 ? 'traste' : 'trastes'} (${from} → ${to}).` };
    })
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
  const root = getPitchClass(key);
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
  if (analysis.blocked) {
    return {
      id: 'blocked',
      label: `Voicing bloqueado: omite tom característico (${analysis.missingCharacteristicNotes.join(', ')}).`
    };
  }
  if (analysis.acceptedDim7Omission) {
    return { id: 'incomplete', label: `Voicing incompleto: omite ${analysis.missingNotes.join(', ')}. Válido no cavaquinho.` };
  }
  if (analysis.rootMissing && !analysis.rootRequired) {
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

export const getVoicingPreferenceRank = (analysis) => {
  const state = getVoicingCompleteness(analysis)?.id;
  return { complete: 0, incomplete: 1, rootless: 2, blocked: 3, additional: 4 }[state] ?? 4;
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
  const spellingKey = step.displayKey || step.key;
  const expected = getChordPitchClasses(spellingKey, step.suffix);
  const played = getPositionPitchClasses(position);
  const missing = expected.filter(note => !played.includes(note));
  const extra = played.filter(note => !expected.includes(note));
  const equivalents = getEquivalentChords(spellingKey, step.suffix);
  const root = getPitchClass(spellingKey);
  const essentialPitchClasses = quality.required.map(interval => (root + interval) % 12);
  const missingEssential = essentialPitchClasses.filter(note => !played.includes(note));
  const characteristicIntervals = quality.required.filter(interval => interval !== 0);
  const characteristicPitchClasses = characteristicIntervals.map(interval => (root + interval) % 12);
  const missingCharacteristic = characteristicPitchClasses.filter(note => !played.includes(note));
  const acceptedDim7Omission = step.suffix === 'dim7' && missingEssential.length === 1 && extra.length === 0;
  const notes = quality.intervals.map(interval => spellChordTone(spellingKey, interval, step.suffix));
  const playedInStringOrder = [...new Set((position?.midi || []).map(note => note % 12))];
  const lowestMidi = position?.midi?.length ? Math.min(...position.midi) : null;
  const bassNote = lowestMidi === null ? null : getChordToneDetail(spellingKey, step.suffix, lowestMidi)?.note || pitchNames[lowestMidi % 12];
  return {
    suffix: step.suffix,
    family: quality.family,
    notes,
    playedNotes: playedInStringOrder.map(note => getChordToneDetail(spellingKey, step.suffix, note)?.note || pitchNames[note]),
    missingNotes: missing.map(note => getChordToneDetail(spellingKey, step.suffix, note)?.note || pitchNames[note]),
    missingEssentialNotes: missingEssential.map(note => getChordToneDetail(spellingKey, step.suffix, note)?.note || pitchNames[note]),
    missingCharacteristicNotes: missingCharacteristic.map(note => getChordToneDetail(spellingKey, step.suffix, note)?.note || pitchNames[note]),
    extraNotes: extra.map(note => pitchNames[note]),
    rootMissing: !played.includes(root),
    rootRequired: Boolean(quality.rootRequired),
    acceptedDim7Omission,
    blocked:
      extra.length > 0 ||
      (missingCharacteristic.length > 0 && !acceptedDim7Omission) ||
      (Boolean(quality.rootRequired) && !played.includes(root)),
    exact: missing.length === 0 && extra.length === 0,
    equivalents,
    aliases: (quality.aliases || []).map(alias => `${spellingKey}${alias}`),
    bassNote,
    inversion: Boolean(bassNote && bassNote !== spellingKey),
    symmetry: quality.symmetry || null
  };
};
