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
    'major-sixth': '6', 'minor-sixth': 'm6', diminished: 'dim', 'diminished-seventh': 'dim7',
    augmented: '+', 'half-diminished': 'm7b5', suspended: 'sus4'
  };
  const bass = harmony.bass as Record<string, unknown> | undefined;
  const bassStep = bass ? String(bass['bass-step'] ?? '') : '';
  const bassAlter = asNumber(bass?.['bass-alter'], 0);
  const bassAccidental = bassAlter === 1 ? '#' : bassAlter === -1 ? 'b' : '';
  const slash = bassStep ? `/${bassStep}${bassAccidental}` : '';
  return `${step}${accidental}${suffixes[kindValue] ?? kindValue}${slash}`;
}

function directionValues(rawMeasure: Record<string, unknown>, name: string): unknown[] {
  return asArray(rawMeasure.direction as Record<string, unknown> | Array<Record<string, unknown>>)
    .flatMap(direction => asArray(direction['direction-type'] as Record<string, unknown> | Array<Record<string, unknown>>))
    .flatMap(directionType => asArray(directionType[name] as unknown));
}

function readDirectionText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return String(record['#text'] ?? record['@_text'] ?? '').trim();
}

function parseSections(rawMeasures: Array<Record<string, unknown>>, measureNumbers: number[]): ScoreDraft['sections'] {
  const markers = rawMeasures.flatMap((measure, index) =>
    [...directionValues(measure, 'rehearsal'), ...directionValues(measure, 'words')]
      .map(readDirectionText)
      .filter(value => /^[A-Z]$/.test(value))
      .map(title => ({ title, measure: measureNumbers[index] })));
  return markers.map((marker, index) => ({
    id: `section-${marker.title.toLowerCase()}-${index + 1}`,
    title: `Seção ${marker.title}`,
    startMeasure: marker.measure,
    endMeasure: markers[index + 1]?.measure - 1 || measureNumbers.at(-1) || marker.measure
  }));
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
  let page = 1;
  let system = 1;
  const rawMeasures = asArray(part.measure as Record<string, unknown> | Array<Record<string, unknown>>);
  const measures = rawMeasures.map((rawMeasure, measureIndex) => {
    const print = rawMeasure.print as Record<string, unknown> | undefined;
    const newPage = print?.['@_new-page'] === 'yes';
    const newSystem = newPage || print?.['@_new-system'] === 'yes';
    if (measureIndex > 0 && newPage) page += 1;
    if (measureIndex > 0 && newSystem) system += 1;
    const attributes = rawMeasure.attributes as Record<string, unknown> | undefined;
    divisions = asNumber(attributes?.divisions, divisions);
    const time = attributes?.time as Record<string, unknown> | undefined;
    meter = time ? { beats: asNumber(time.beats, meter.beats), beatType: asNumber(time['beat-type'], meter.beatType) } : meter;
    const directions = asArray(rawMeasure.direction as Record<string, unknown> | Array<Record<string, unknown>>);
    const sound = directions.map(direction => direction.sound as Record<string, unknown> | undefined).find(Boolean);
    const metronome = directions
      .flatMap(direction => asArray(direction['direction-type'] as Record<string, unknown> | Array<Record<string, unknown>>))
      .map(directionType => directionType.metronome as Record<string, unknown> | undefined)
      .find(Boolean);
    tempo = asNumber(sound?.['@_tempo'] ?? metronome?.['per-minute'], tempo);
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
      id: randomUUID(), offsetTicks: asNumber((harmony.offset as Record<string, unknown> | undefined)?.['#text'] ?? harmony.offset, 0),
      symbol: parseChordSymbol(harmony), confidence: 1, alternatives: []
    }));
    const structuralIssues: ScoreIssue[] = events.some(event => event.durationTicks <= 0 || event.rest === Boolean(event.pitch))
      ? [{ code: 'invalid_note_event', severity: 'critical', message: 'A medida contém uma nota ou pausa inválida.' }]
      : [];
    const measure: ScoreMeasure = {
      number: asNumber(rawMeasure['@_number'], measureIndex + 1),
      divisions,
      expectedTicks: divisions * meter.beats * (4 / meter.beatType),
      page,
      system,
      newPage,
      newSystem,
      events,
      chords,
      issues: structuralIssues
    };
    measure.issues = [...measure.issues, ...validateMeasure(measure)];
    return measure;
  });

  const now = new Date().toISOString();
  const identification = score.identification as Record<string, unknown> | undefined;
  const creators = asArray(identification?.creator as Record<string, unknown> | Array<Record<string, unknown>>);
  const composer = creators.find(creator => creator['@_type'] === 'composer');
  const work = score.work as Record<string, unknown> | undefined;
  return {
    id: randomUUID(), importId: context.importId, ownerId: context.ownerId,
    title: String(work?.['work-title'] ?? score['movement-title'] ?? 'Partitura importada'),
    composer: composer ? readDirectionText(composer) || null : null,
    tempo, meter, revision: 1, measures,
    sections: parseSections(rawMeasures, measures.map(measure => measure.number)),
    createdAt: now, updatedAt: now
  };
}

export function hasCriticalIssues(draft: ScoreDraft): boolean {
  return draft.measures.some(measure => measure.issues.some(issue => issue.severity === 'critical'));
}
