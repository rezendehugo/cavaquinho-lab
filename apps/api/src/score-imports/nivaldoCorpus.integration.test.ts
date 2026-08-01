import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { buildApp } from '../app.js';
import { DevelopmentStorage } from '../storage.js';
import { getPitchPositions } from './melodyRoute.js';
import { InMemoryScoreImportRepository } from './repository.js';
import { ScoreImportService } from './service.js';
import type { ScoreEvent, ScoreMeasure } from './types.js';

const musicXmlPath = process.env.NIVALDO_MUSICXML;
const reportPath = process.env.NIVALDO_OMR_REPORT;
const headers = { authorization: 'Bearer dev:corpus-reviewer' };

function fitEventsToMeasure(measure: ScoreMeasure): ScoreEvent[] {
  const validEvents = measure.events.filter(event => event.durationTicks > 0);
  if (!validEvents.length) {
    return [{
      id: randomUUID(),
      offsetTicks: 0,
      durationTicks: measure.expectedTicks,
      pitch: null,
      rest: true,
      tie: null,
      confidence: 1,
      alternatives: [],
    }];
  }
  let remaining = measure.expectedTicks;
  let offsetTicks = 0;
  const corrected: ScoreEvent[] = [];
  for (const event of validEvents) {
    if (remaining <= 0) break;
    const durationTicks = Math.min(event.durationTicks, remaining);
    corrected.push({ ...event, offsetTicks, durationTicks });
    offsetTicks += durationTicks;
    remaining -= durationTicks;
  }
  if (remaining > 0) {
    const last = corrected.at(-1);
    if (last) last.durationTicks += remaining;
  }
  return corrected;
}

describe.skipIf(!musicXmlPath || !reportPath)('Nivaldo no choro private corpus', () => {
  test('reviews real OMR output and returns bounded sequence and melody data', async () => {
    const [musicXml, reportContent, referenceContent] = await Promise.all([
      readFile(musicXmlPath!, 'utf8'),
      readFile(reportPath!, 'utf8'),
      readFile(new URL('./fixtures/nivaldoNoChoro.reference.json', import.meta.url), 'utf8'),
    ]);
    const report = JSON.parse(reportContent);
    const reference = JSON.parse(referenceContent);
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository, 'nivaldo-corpus-v1');
    const item = await service.create('corpus-reviewer', {
      sourceType: 'pdf',
      originalName: 'Nivaldo_no_choro.pdf',
      storageKey: 'private/corpus-reviewer/nivaldo.pdf',
      sha256: reference.sha256,
    });
    const initialDraft = await service.completeOmr(item.id, {
      musicXml,
      pageCount: reference.pageCount,
      engine: 'Audiveris',
      engineVersion: '5.10.2',
      textReport: report,
    });
    const app = await buildApp({
      authenticate: async () => ({ id: 'corpus-reviewer' }),
      storage: new DevelopmentStorage(),
      service,
      allowedOrigins: ['http://127.0.0.1:5173'],
      allowDirectMusicXml: true,
    });

    expect(initialDraft).toMatchObject({
      title: expect.stringMatching(/nivaldo no choro/i),
      composer: expect.stringMatching(/severino/i),
      tempo: reference.tempo,
      meter: reference.meter,
      provenance: { pageCount: 2, omrEngine: 'Audiveris' },
    });
    expect(initialDraft.measures.length).toBeGreaterThanOrEqual(reference.measureCount.minimum);
    const criticalMeasures = initialDraft.measures.filter(measure =>
      measure.issues.some(issue => issue.severity === 'critical'));
    expect(criticalMeasures.length).toBeGreaterThan(0);
    const chordCorrections = new Map<number, string[]>(
      reference.checkpoints.flatMap((checkpoint: { chordCorrections: Array<{ measure: number; symbols: string[] }> }) =>
        checkpoint.chordCorrections.map(correction => [correction.measure, correction.symbols] as const))
    );

    const blocked = await app.inject({
      method: 'POST',
      url: `/v1/score-imports/${item.id}/create-practice`,
      headers,
      payload: { targets: ['sequence', 'melody'] },
    });
    expect(blocked.statusCode).toBe(422);

    let revision = initialDraft.revision;
    let reviewedDraft = initialDraft;
    const measuresToReview = initialDraft.measures.filter(measure =>
      measure.issues.some(issue => issue.severity === 'critical') || chordCorrections.has(measure.number));
    for (const measure of measuresToReview) {
      const correctedSymbols = chordCorrections.get(measure.number);
      const chords = correctedSymbols
        ? correctedSymbols.map((symbol, index) => ({
            ...(measure.chords[index] || {
              id: randomUUID(), offsetTicks: 0, confidence: 1, alternatives: [],
            }),
            symbol,
          }))
        : measure.chords;
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/score-imports/${item.id}/measures/${measure.number}`,
        headers,
        payload: {
          revision,
          events: fitEventsToMeasure(measure),
          chords,
        },
      });
      expect(response.statusCode).toBe(200);
      reviewedDraft = response.json();
      revision = reviewedDraft.revision;
    }
    expect(revision).toBe(initialDraft.revision + measuresToReview.length);
    for (const checkpoint of reference.checkpoints) {
      const symbols = reviewedDraft.measures
        .filter((measure: ScoreMeasure) =>
          measure.number >= checkpoint.startMeasure && measure.number <= checkpoint.endMeasure)
        .flatMap((measure: ScoreMeasure) => measure.chords.map(chord => chord.symbol));
      expect(symbols).toEqual(expect.arrayContaining(checkpoint.requiredChords));
    }

    const validated = await app.inject({
      method: 'POST',
      url: `/v1/score-imports/${item.id}/validate`,
      headers,
    });
    expect(validated.statusCode).toBe(200);
    expect(validated.json().status).toBe('ready');

    const checkpoint = reference.checkpoints.find((value: { id: string }) => value.id === 'section-b-opening');
    const practice = await app.inject({
      method: 'POST',
      url: `/v1/score-imports/${item.id}/create-practice`,
      headers,
      payload: {
        targets: ['sequence', 'melody'],
        range: { startMeasure: checkpoint.startMeasure, endMeasure: checkpoint.endMeasure },
      },
    });
    expect(practice.statusCode).toBe(200);
    const artifacts = practice.json();
    const selectedMeasures = reviewedDraft.measures.filter((measure: ScoreMeasure) =>
      measure.number >= checkpoint.startMeasure && measure.number <= checkpoint.endMeasure);
    const selectedSymbols = selectedMeasures.flatMap((measure: ScoreMeasure) =>
      measure.chords.map(chord => chord.symbol));

    expect(artifacts.sequence).toMatchObject({
      id: expect.any(String),
      sourceImportId: item.id,
      title: expect.stringMatching(/nivaldo no choro/i),
    });
    expect(artifacts.sequence.steps).toHaveLength(selectedSymbols.length);
    expect(artifacts.sequence.steps.map((step: { symbol: string }) => step.symbol)).toEqual(selectedSymbols);
    expect(artifacts.sequence.steps.every((step: { measure: number; symbol: string }) =>
      step.symbol && step.measure >= checkpoint.startMeasure && step.measure <= checkpoint.endMeasure)).toBe(true);

    const selectedEventCount = selectedMeasures.reduce((count: number, measure: ScoreMeasure) =>
      count + measure.events.length, 0);
    expect(artifacts.melody).toMatchObject({
      id: expect.any(String),
      sourceImportId: item.id,
      title: expect.stringMatching(/nivaldo no choro/i),
      meter: reference.meter,
      tempo: reference.tempo,
      ticksPerQuarter: expect.any(Number),
    });
    expect(artifacts.melody.events).toHaveLength(selectedEventCount);
    expect(artifacts.melody.events.every((event: ScoreEvent & { measure: number }) =>
      event.measure >= checkpoint.startMeasure && event.measure <= checkpoint.endMeasure)).toBe(true);
    expect(artifacts.melody.events.filter((event: ScoreEvent) => event.rest)
      .every((event: ScoreEvent & { suggestedPosition: unknown }) => event.suggestedPosition === null)).toBe(true);
    for (const event of artifacts.melody.events.filter((value: ScoreEvent) => !value.rest)) {
      if (!event.pitch) continue;
      const playable = getPitchPositions(event.pitch).length > 0;
      expect(event.suggestedPosition !== null).toBe(playable);
    }
    for (const measure of selectedMeasures) {
      expect(measure.events.reduce((sum, event) => sum + event.durationTicks, 0)).toBe(measure.expectedTicks);
    }
    await app.close();
  }, 30_000);
});
