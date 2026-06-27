import { chromaticKeys } from '../sequences';

export const cavaquinhoTuning = ['D', 'G', 'B', 'D'];

export const enharmonicNotes = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#'
};

export const getFretNote = (openNote, fret) => chromaticKeys[(chromaticKeys.indexOf(openNote) + fret) % chromaticKeys.length];

export const buildFretboardRows = (tuning = cavaquinhoTuning, fretCount = 12, startFret = 1) => (
  Array.from({ length: fretCount - startFret + 1 }, (_item, index) => {
    const fret = startFret + index;
    return {
      fret,
      notes: tuning.map((openNote, stringIndex) => ({
        note: getFretNote(openNote, fret),
        stringIndex,
        fret
      }))
    };
  })
);
