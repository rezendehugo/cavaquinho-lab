import { z } from 'zod';

export const importSourceTypeSchema = z.enum(['musicxml', 'pdf']);
export const importStatusSchema = z.enum(['uploaded', 'queued', 'processing', 'draft', 'needs_correction', 'ready', 'failed']);

export const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum(['application/pdf', 'application/vnd.recordare.musicxml+xml', 'application/xml', 'text/xml']),
  size: z.number().int().positive().max(20 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/)
});

export const createImportSchema = z.object({
  sourceType: importSourceTypeSchema,
  originalName: z.string().trim().min(1).max(180),
  storageKey: z.string().min(1).max(500),
  sha256: z.string().regex(/^[a-f0-9]{64}$/)
});

const pitchSchema = z.object({
  step: z.enum(['C', 'D', 'E', 'F', 'G', 'A', 'B']),
  alter: z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)]),
  octave: z.number().int().min(0).max(9)
});

const eventPatchSchema = z.object({
  id: z.string().uuid(),
  offsetTicks: z.number().int().nonnegative(),
  durationTicks: z.number().int().positive(),
  pitch: pitchSchema.nullable(),
  rest: z.boolean(),
  tie: z.enum(['start', 'stop']).nullable(),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(pitchSchema).max(5)
}).refine(event => event.rest !== Boolean(event.pitch), 'Event must contain either a rest or a pitch');

export const measurePatchSchema = z.object({
  revision: z.number().int().positive(),
  events: z.array(eventPatchSchema).max(512),
  chords: z.array(z.object({
    id: z.string().uuid(),
    offsetTicks: z.number().int().nonnegative(),
    symbol: z.string().trim().min(1).max(32),
    confidence: z.number().min(0).max(1),
    alternatives: z.array(z.string().max(32)).max(5)
  })).max(128)
});

export const createPracticeSchema = z.object({
  targets: z.array(z.enum(['sequence', 'melody'])).min(1).max(2)
});
