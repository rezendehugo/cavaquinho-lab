import { z } from 'zod';

const pitchClass = z.enum(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
const chordSuffix = z.enum(['major', 'minor', '6', '7', '69', 'm6', '9', 'add9', 'aug', 'maj7', 'maj9', 'm7', 'm9', 'madd9', 'mmaj7', 'm7b5', 'dim', 'dim7', 'sus2', 'sus4', '7sus4']);

export const sequenceStepSchema = z.object({
  id: z.string().uuid(),
  key: pitchClass,
  suffix: chordSuffix,
  bassNote: pitchClass.optional(),
  displayKey: z.string().trim().min(1).max(8).optional(),
  displayBassNote: z.string().trim().min(1).max(8).optional(),
  positionIndex: z.number().int().nonnegative().nullable(),
  practiceBeats: z.number().int().min(1).max(16)
});

export const sequenceCreateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  practiceBpm: z.number().int().min(40).max(220),
  loopStartIndex: z.number().int().nonnegative(),
  steps: z.array(sequenceStepSchema).max(500)
}).refine(value => value.steps.length === 0 ? value.loopStartIndex === 0 : value.loopStartIndex < value.steps.length, 'Invalid loop start');

export const sequenceUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120), practiceBpm: z.number().int().min(40).max(220),
  loopStartIndex: z.number().int().nonnegative(), steps: z.array(sequenceStepSchema).max(500), revision: z.number().int().positive()
}).refine(value => value.steps.length === 0 ? value.loopStartIndex === 0 : value.loopStartIndex < value.steps.length, 'Invalid loop start');

export const localMigrationSchema = z.object({
  sequences: z.array(sequenceCreateSchema).max(500)
});

export const practiceSessionSchema = z.object({
  id: z.string().uuid(),
  sequenceId: z.string().uuid().nullable(),
  bpm: z.number().int().min(40).max(220),
  durationSeconds: z.number().int().nonnegative().max(24 * 60 * 60),
  completed: z.boolean(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable()
});

export const checkoutSchema = z.object({ price: z.enum(['monthly', 'annual']) });
