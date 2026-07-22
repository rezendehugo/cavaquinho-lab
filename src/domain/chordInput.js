import { chromaticKeys } from '../sequences';

const suffixAliases = new Map([
  ['', 'major'], ['maj', 'major'], ['major', 'major'], ['maior', 'major'],
  ['m', 'minor'], ['min', 'minor'], ['minor', 'minor'], ['menor', 'minor'],
  ['6', '6'], ['sexta', '6'], ['7', '7'], ['dominante', '7'], ['setima', '7'],
  ['m6', 'm6'], ['min6', 'm6'], ['menor6', 'm6'], ['9', '9'], ['nona', '9'],
  ['add9', 'add9'], ['adiciona9', 'add9'], ['nonaadicionada', 'add9'], ['maj7', 'maj7'], ['major7', 'maj7'],
  ['maior7', 'maj7'], ['setimamaior', 'maj7'], ['m7', 'm7'], ['min7', 'm7'],
  ['minor7', 'm7'], ['menor7', 'm7'], ['m7b5', 'm7b5'], ['m7(5b)', 'm7b5'],
  ['ø7', 'm7b5'], ['meiodiminuto', 'm7b5'], ['dim', 'dim'], ['diminuto', 'dim'],
  ['dim7', 'dim7'], ['diminuto7', 'dim7'], ['4', 'sus4'], ['sus', 'sus4'], ['sus4', 'sus4'],
  ['suspenso', 'sus4'], ['suspenso4', 'sus4'], ['sus2', 'sus2'], ['suspenso2', 'sus2'],
  ['7sus4', '7sus4'], ['7sus', '7sus4'], ['7suspenso', '7sus4']
]);

const pitchClasses = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const normalizeAlias = (value) => value.trim().toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');

export const parseQualityInput = (value) => suffixAliases.get(normalizeAlias(value)) || null;

export const parseRootInput = (value, currentSuffix) => {
  const match = value.trim().match(/^([a-gA-G])([#b♯♭]?)(.*)$/);
  if (!match) return null;
  const accidental = match[2].replace('♯', '#').replace('♭', 'b');
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const pitchClass = (pitchClasses[match[1].toUpperCase()] + offset + 12) % 12;
  const key = chromaticKeys[pitchClass];
  const displayKey = match[1].toUpperCase() + accidental;
  const suffix = match[3] ? parseQualityInput(match[3]) : currentSuffix;
  return suffix ? { key, suffix, displayKey } : null;
};
