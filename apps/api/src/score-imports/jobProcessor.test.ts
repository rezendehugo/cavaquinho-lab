import { describe, expect, test } from 'vitest';
import type { PrivateStorage } from '../storage.js';
import { ScoreImportJobProcessor } from './jobProcessor.js';
import type { OmrWorker } from './omrWorker.js';
import { InMemoryScoreImportRepository } from './repository.js';
import { ScoreImportService } from './service.js';

const musicXml = `<score-partwise><work><work-title>Sábado à tarde</work-title></work><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><harmony><root><root-step>A</root-step></root><kind>dominant</kind></harmony><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`;

describe('PDF job processor', () => {
  test('reuses an owner import with the same checksum without duplicating jobs', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository);
    const input = {
      sourceType: 'pdf' as const,
      originalName: 'nivaldo.pdf',
      storageKey: 'private/owner-1/nivaldo.pdf',
      sha256: 'c'.repeat(64)
    };
    const first = await service.create('owner-1', input);
    const repeated = await service.create('owner-1', { ...input, storageKey: 'private/owner-1/repeated.pdf' });
    expect(repeated.id).toBe(first.id);
    expect(repository.jobs.size).toBe(1);
  });

  test('claims a queued PDF and stores the private review draft', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository, 'omr-test');
    const item = await service.create('owner-1', {
      sourceType: 'pdf',
      originalName: 'sabadoAtarde.pdf',
      storageKey: 'private/owner-1/score.pdf',
      sha256: 'a'.repeat(64)
    });
    const storage: PrivateStorage = {
      createUploadTicket: async () => { throw new Error('not_used'); },
      createDownloadUrl: async () => '/signed/source',
      deletePrefix: async () => undefined
    };
    const worker: OmrWorker = {
      process: async () => ({
        musicXml,
        pageCount: 2,
        engine: 'Audiveris',
        engineVersion: '5.10.2',
        textReport: { title: 'Sábado à tarde', composer: 'Avena de Castro', chordCandidates: [] }
      })
    };
    const processor = new ScoreImportJobProcessor(repository, storage, worker, service, 'http://api.test');

    expect(await processor.tick()).toBe(true);
    const completed = await service.getOwned('owner-1', item.id);
    expect(completed.item).toMatchObject({ status: 'draft', pageCount: 2, pipelineVersion: 'omr-test' });
    expect(completed.draft).toMatchObject({
      title: 'Sábado à tarde',
      composer: 'Avena de Castro',
      provenance: { omrEngine: 'Audiveris', omrVersion: '5.10.2', pageCount: 2 }
    });
    expect([...repository.jobs.values()][0].status).toBe('completed');
  });

  test('retries transient failures and eventually leaves a terminal failure', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository);
    const item = await service.create('owner-1', {
      sourceType: 'pdf', originalName: 'broken.pdf', storageKey: 'private/owner-1/broken.pdf', sha256: 'b'.repeat(64)
    });
    const storage: PrivateStorage = {
      createUploadTicket: async () => { throw new Error('not_used'); },
      createDownloadUrl: async () => '/signed/source',
      deletePrefix: async () => undefined
    };
    const worker: OmrWorker = { process: async () => { throw new Error('audiveris_failed'); } };
    const processor = new ScoreImportJobProcessor(repository, storage, worker, service, 'http://api.test');

    await processor.tick();
    expect((await service.getOwned('owner-1', item.id)).item.status).toBe('queued');
    const job = [...repository.jobs.values()][0];
    job.attemptCount = 2;
    job.availableAt = new Date(0).toISOString();
    repository.jobs.set(job.id, job);
    await processor.tick();
    expect((await service.getOwned('owner-1', item.id)).item).toMatchObject({
      status: 'failed', lastErrorCode: 'audiveris_failed'
    });
  });

  test('does not retry a deterministic score failure', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository);
    const item = await service.create('owner-1', {
      sourceType: 'pdf', originalName: 'blank.pdf', storageKey: 'private/owner-1/blank.pdf', sha256: 'd'.repeat(64)
    });
    const storage: PrivateStorage = {
      createUploadTicket: async () => { throw new Error('not_used'); },
      createDownloadUrl: async () => '/signed/source',
      deletePrefix: async () => undefined
    };
    const worker: OmrWorker = { process: async () => { throw new Error('no_musical_content'); } };
    const processor = new ScoreImportJobProcessor(repository, storage, worker, service, 'http://api.test');

    await processor.tick();
    expect((await service.getOwned('owner-1', item.id)).item).toMatchObject({
      status: 'failed', lastErrorCode: 'no_musical_content'
    });
    expect([...repository.jobs.values()][0]).toMatchObject({ status: 'failed', attemptCount: 1 });
  });
});
