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
    'dominant-ninth': '9', 'dominant-13th': '13', 'major-ninth': 'maj9',
    augmented: '+', 'half-diminished': 'm7b5', suspended: 'sus4'
  };
  const degrees = asArray(harmony.degree as Record<string, unknown> | Array<Record<string, unknown>>);
  const degreeNumber = (degree: Record<string, unknown>): number => asNumber(degree['degree-value'], 0);
  const degreeAlter = (degree: Record<string, unknown>): number => asNumber(degree['degree-alter'], 0);
  const flatNinth = degrees.some(degree => degreeNumber(degree) === 9 && degreeAlter(degree) < 0);
  const flatThirteenth = degrees.some(degree => degreeNumber(degree) === 13 && degreeAlter(degree) < 0);
  let suffix = suffixes[kindValue] ?? kindValue;
  if (flatNinth && ['7', '9'].includes(suffix)) suffix = '7b9';
  if (flatThirteenth && ['7', '13'].includes(suffix)) suffix = '7b13';
  const bass = harmony.bass as Record<string, unknown> | undefined;
  const bassStep = bass ? String(bass['bass-step'] ?? '') : '';
  const bassAlter = asNumber(bass?.['bass-alter'], 0);
  const bassAccidental = bassAlter === 1 ? '#' : bassAlter === -1 ? 'b' : '';
  const slash = bassStep ? `/${bassStep}${bassAccidental}` : '';
  return `${step}${accidental}${suffix}${slash}`;
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

const PRINTED_CHORD_SYMBOL = /^[A-G](?:#|b|♯|♭)?(?:7(?:b|♭)(?:13|9)|maj(?:7|9)|m(?:7(?:b5|♭5)?|9|6)?|dim7?|aug|\+|13|9|7|6|sus[24]?|add9|7M)?(?:\/[A-G](?:#|b|♯|♭)?)?$/;

function extractPrintedChordSymbols(value: string): string[] {
  const normalized = value
    .replace(/♯/g, '#').replace(/♭/g, 'b')
    .replace(/[’‘']/g, '')
    .replace(/([A-G]#?7)[|l]a?13/g, (_match, root) => `${root}b13`)
    .replace(/([A-G]7)l13/g, (_match, root) => `${root}b13`)
    .replace(/([A-G]m)G\b/g, (_match, root) => `${root}6`)
    .replace(/\b([A-G])I>7\b/g, (_match, root) => `${root}b7`)
    .replace(/\b([A-G])ma7J?\b/g, (_match, root) => `${root}maj7`)
    .replace(/\b([A-G]b)d\b/g, (_match, root) => `${root}dim7`);
  const symbols = normalized.match(/[A-G](?:#|b)?(?:7b(?:13|9)|maj(?:7|9)|m(?:7(?:b5)?|9|6)?|dim7?|aug|\+|13|9|7|6|sus[24]?|add9|7M)?(?:\/[A-G](?:#|b)?)?/g) ?? [];
  return symbols.filter(symbol => PRINTED_CHORD_SYMBOL.test(symbol));
}

function directionChordEvents(rawMeasure: Record<string, unknown>): ChordEvent[] {
  return asArray(rawMeasure.direction as Record<string, unknown> | Array<Record<string, unknown>>)
    .flatMap(direction => {
      const directionTypes = asArray(direction['direction-type'] as Record<string, unknown> | Array<Record<string, unknown>>);
      const offset = asNumber(direction.offset, 0);
      return directionTypes.flatMap(directionType => asArray(directionType.words as unknown)
        .flatMap(readDirectionText)
        .flatMap(extractPrintedChordSymbols)
        .map(symbol => ({ id: randomUUID(), offsetTicks: offset, symbol, confidence: 0.72, alternatives: [] })));
    });
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
    for (const chord of directionChordEvents(rawMeasure)) {
      if (!chords.some(existing => existing.symbol.toLowerCase() === chord.symbol.toLowerCase())) chords.push(chord);
    }
    chords.sort((a, b) => a.offsetTicks - b.offsetTicks);
    const structuralIssues: ScoreIssue[] = events.some(event => event.durationTicks <= 0 || event.rest === Boolean(event.pitch))
      ? [{ code: 'invalid_note_event', severity: 'critical', message: 'A medida contém uma nota ou pausa inválida.' }]
      : [];
    const measure: ScoreMeasure = {
      number: asNumber(rawMeasure['@_number'], measureIndex + 1),
      divisions,
      expectedTicks: divisions * meter.beats * (4 / meter.beatType),
      page,
      system,
      layoutWidth: asNumber(rawMeasure['@_width'], 0) || undefined,
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
