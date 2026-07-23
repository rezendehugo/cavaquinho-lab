import { describe, expect, test } from 'vitest';
import { buildApp } from './app.js';
import { InMemoryScoreImportRepository } from './score-imports/repository.js';
import { ScoreImportService } from './score-imports/service.js';
import { DevelopmentStorage } from './storage.js';
import { createDevelopmentAuthenticator } from './auth.js';

const xml = `<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><harmony><root><root-step>C</root-step></root><kind>major</kind></harmony><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`;

async function fixture() {
  return buildApp({
    authenticate: createDevelopmentAuthenticator(),
    storage: new DevelopmentStorage(),
    service: new ScoreImportService(new InMemoryScoreImportRepository()),
    allowedOrigins: ['http://127.0.0.1:5173']
    ,allowDirectMusicXml: true
  });
}

describe('score import API', () => {
  test('requires authentication and enforces ownership', async () => {
    const app = await fixture();
    const unauthorized = await app.inject({ method: 'POST', url: '/v1/score-imports/musicxml', payload: { fileName: 'study.musicxml', content: xml } });
    expect(unauthorized.statusCode).toBe(401);
    const created = await app.inject({ method: 'POST', url: '/v1/score-imports/musicxml', headers: { authorization: 'Bearer dev:alice' }, payload: { fileName: 'study.musicxml', content: xml } });
    expect(created.statusCode).toBe(201);
    const id = created.json().item.id;
    const forbiddenAsNotFound = await app.inject({ method: 'GET', url: `/v1/score-imports/${id}`, headers: { authorization: 'Bearer dev:bob' } });
    expect(forbiddenAsNotFound.statusCode).toBe(404);
    await app.close();
  });

  test('validates a draft and creates rhythmic practice artifacts', async () => {
    const app = await fixture();
    const headers = { authorization: 'Bearer dev:alice' };
    const created = await app.inject({ method: 'POST', url: '/v1/score-imports/musicxml', headers, payload: { fileName: 'study.musicxml', content: xml } });
    const id = created.json().item.id;
    const validated = await app.inject({ method: 'POST', url: `/v1/score-imports/${id}/validate`, headers });
    expect(validated.json().status).toBe('ready');
    const practice = await app.inject({ method: 'POST', url: `/v1/score-imports/${id}/create-practice`, headers, payload: { targets: ['sequence', 'melody'] } });
    expect(practice.statusCode).toBe(200);
    expect(practice.json().sequence.steps[0].symbol).toBe('C');
    expect(practice.json().melody.events[0]).toMatchObject({ durationTicks: 4, measure: 1, suggestedPosition: expect.any(Object) });
    await app.close();
  });

  test('rejects a stale measure revision without overwriting the latest correction', async () => {
    const app = await fixture();
    const headers = { authorization: 'Bearer dev:alice' };
    const created = await app.inject({ method: 'POST', url: '/v1/score-imports/musicxml', headers, payload: { fileName: 'study.musicxml', content: xml } });
    const { item, draft } = created.json();
    const measure = draft.measures[0];
    const payload = { revision: draft.revision, events: measure.events, chords: measure.chords };
    expect((await app.inject({ method: 'PATCH', url: `/v1/score-imports/${item.id}/measures/1`, headers, payload })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: `/v1/score-imports/${item.id}/measures/1`, headers, payload })).statusCode).toBe(409);
    await app.close();
  });
});
