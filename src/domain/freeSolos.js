import { cavaquinhoOpenMidi } from './scalePaths';

export const freeSoloStorageVersion = 1;
export const maximumSoloSteps = 1000;

const validPosition = (position) => Number.isInteger(position?.stringIndex)
  && position.stringIndex >= 0 && position.stringIndex < cavaquinhoOpenMidi.length
  && Number.isInteger(position.fret) && position.fret >= 0 && position.fret <= 12
  && position.midi === cavaquinhoOpenMidi[position.stringIndex] + position.fret
  && position.pitchClass === position.midi % 12
  && position.octave === Math.floor(position.midi / 12) - 1
  && typeof position.note === 'string';

export const validateFreeSolo = (solo) => {
  if (!solo || !Array.isArray(solo.positions) || !solo.positions.length) return { ok: false, message: 'Adicione ao menos uma nota.' };
  if (solo.positions.length > maximumSoloSteps) return { ok: false, message: 'O solo ultrapassa o tamanho permitido.' };
  if (!solo.positions.every(validPosition)) return { ok: false, message: 'O solo contém uma posição inválida.' };
  return { ok: true, message: '' };
};

export const appendSoloPosition = (positions, position) => positions.length >= maximumSoloSteps
  ? positions
  : positions.concat({ ...position });

export const normalizeStoredSolos = (value) => ({
  version: freeSoloStorageVersion,
  solos: value?.version === freeSoloStorageVersion && Array.isArray(value.solos)
    ? value.solos.filter(solo => typeof solo.id === 'string' && typeof solo.name === 'string' && validateFreeSolo(solo).ok)
    : []
});
