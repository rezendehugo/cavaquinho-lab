import { XMLParser } from 'fast-xml-parser';
import { randomUUID } from 'node:crypto';
import type { ChordEvent, Pitch, ScoreDraft, ScoreEvent, ScoreIssue, ScoreMeasure } from './types.js';

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true, trimValues: true });
const asArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const asNumber = (value: unknown, fallback: number): number => Number.isFinite(Number(value)) ? Number(value) : fallback;

function parsePitch(note: Record<string, unknown>): Pitch | null {
  const raw = note.pitch as Record<string, unknown> | undefined;
  if (!raw) return null;
  return {
    step: String(raw.step) as Pitch['step'],
    alter: asNumber(raw.alter, 0) as Pitch['alter'],
    octave: asNumber(raw.octave, 4)
  };
}

function parseChordSymbol(harmony: Record<string, unknown>): string {
  const root = harmony.root as Record<string, unknown> | undefined;
  const step = String(root?.['root-step'] ?? 'C');
  const alter = asNumber(root?.['root-alter'], 0);
  const accidental = alter === 1 ? '#' : alter === -1 ? 'b' : '';
  const kind = harmony.kind;
  const kindValue = typeof kind === 'object' && kind !== null
    ? String((kind as Record<string, unknown>)['#text'] ?? (kind as Record<string, unknown>)['@_text'] ?? '')
    : String(kind ?? '');
  const suffixes: Record<string, string> = {
    major: '', minor: 'm', dominant: '7', 'major-seventh': 'maj7', 'minor-seventh': 'm7',
    diminished: 'dim', augmented: '+', 'half-diminished': 'm7b5', suspended: 'sus4'
  };
  return `${step}${accidental}${suffixes[kindValue] ?? kindValue}`;
}

function validateMeasure(measure: ScoreMeasure): ScoreIssue[] {
  const playedTicks = measure.events.reduce((sum, event) => sum + event.durationTicks, 0);
  if (playedTicks === measure.expectedTicks) return [];
  return [{
    code: 'measure_duration_mismatch',
    severity: 'critical',
    message: `A medida soma ${playedTicks} ticks, mas deveria somar ${measure.expectedTicks}.`
  }];
}

export function parseMusicXml(content: string, context: { importId: string; ownerId: string }): ScoreDraft {
  if (content.length > 20 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(content)) throw new Error('unsafe_musicxml');
  if ((content.match(/<measure\b/gi) ?? []).length > 2000 || (content.match(/<part\s+id=/gi) ?? []).length !== 1) throw new Error('unsupported_musicxml_structure');
  const document = parser.parse(content) as Record<string, unknown>;
  const score = document['score-partwise'] as Record<string, unknown> | undefined;
  const part = asArray(score?.part as Record<string, unknown> | Array<Record<string, unknown>>)[0];
  if (!score || !part) throw new Error('invalid_musicxml');

  let divisions = 1;
  let meter = { beats: 4, beatType: 4 };
  let tempo = 80;
  const measures = asArray(part.measure as Record<string, unknown> | Array<Record<string, unknown>>).map((rawMeasure, measureIndex) => {
    const attributes = rawMeasure.attributes as Record<string, unknown> | undefined;
    divisions = asNumber(attributes?.divisions, divisions);
    const time = attributes?.time as Record<string, unknown> | undefined;
    meter = time ? { beats: asNumber(time.beats, meter.beats), beatType: asNumber(time['beat-type'], meter.beatType) } : meter;
    const direction = rawMeasure.direction as Record<string, unknown> | undefined;
    const sound = direction?.sound as Record<string, unknown> | undefined;
    tempo = asNumber(sound?.['@_tempo'], tempo);
    let offsetTicks = 0;
    const events: ScoreEvent[] = asArray(rawMeasure.note as Record<string, unknown> | Array<Record<string, unknown>>).map(note => {
      const durationTicks = asNumber(note.duration, 0);
      const isChordTone = note.chord !== undefined;
      const event: ScoreEvent = {
        id: randomUUID(),
        offsetTicks: isChordTone ? Math.max(0, offsetTicks - durationTicks) : offsetTicks,
        durationTicks,
        pitch: parsePitch(note),
        rest: note.rest !== undefined,
        tie: asArray(note.tie as Record<string, unknown> | Array<Record<string, unknown>>)[0]?.['@_type'] as ScoreEvent['tie'] ?? null,
        confidence: 1,
        alternatives: []
      };
      if (!isChordTone) offsetTicks += durationTicks;
      return event;
    });
    const chords: ChordEvent[] = asArray(rawMeasure.harmony as Record<string, unknown> | Array<Record<string, unknown>>).map(harmony => ({
      id: randomUUID(), offsetTicks: 0, symbol: parseChordSymbol(harmony), confidence: 1, alternatives: []
    }));
    const structuralIssues: ScoreIssue[] = events.some(event => event.durationTicks <= 0 || event.rest === Boolean(event.pitch))
      ? [{ code: 'invalid_note_event', severity: 'critical', message: 'A medida contém uma nota ou pausa inválida.' }]
      : [];
    const measure: ScoreMeasure = {
      number: asNumber(rawMeasure['@_number'], measureIndex + 1),
      divisions,
      expectedTicks: divisions * meter.beats * (4 / meter.beatType),
      events,
      chords,
      issues: structuralIssues
    };
    measure.issues = [...measure.issues, ...validateMeasure(measure)];
    return measure;
  });

  const now = new Date().toISOString();
  return {
    id: randomUUID(), importId: context.importId, ownerId: context.ownerId,
    title: String((score['work'] as Record<string, unknown> | undefined)?.['work-title'] ?? 'Partitura importada'),
    composer: null, tempo, meter, revision: 1, measures, createdAt: now, updatedAt: now
  };
}

export function hasCriticalIssues(draft: ScoreDraft): boolean {
  return draft.measures.some(measure => measure.issues.some(issue => issue.severity === 'critical'));
}
