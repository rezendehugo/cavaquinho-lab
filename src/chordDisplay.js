export const suffixLabels = {
  major: '',
  minor: 'm',
  '6': '6',
  '7': '7',
  '9': '9',
  maj7: 'maj7',
  m7: 'm7',
  m7b5: 'm7(5b)',
  dim: 'dim',
  dim7: 'dim7',
  sus2: 'sus2',
  sus4: 'sus4'
};

export const qualityLabels = {
  major: 'Maior',
  minor: 'Menor',
  '6': 'Sexta',
  '7': 'Sétima dominante',
  '9': 'Nona',
  maj7: 'Sétima maior',
  m7: 'Menor com sétima',
  m7b5: 'Meio diminuto',
  dim: 'Diminuto',
  dim7: 'Diminuto com sétima',
  sus2: 'Suspenso com segunda',
  sus4: 'Suspenso com quarta'
};

export const formatSuffix = (suffix) => suffixLabels[suffix] ?? suffix;

export const formatChordName = (key, suffix, bass = '') => {
  const name = key + formatSuffix(suffix);
  return bass ? name + '/' + bass : name;
};

export const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const getPlayedNotes = (position) => (position.midi || []).map(midi => noteNames[midi % 12]);

export const getPlayedNotesText = (position) => getPlayedNotes(position).join(' - ');