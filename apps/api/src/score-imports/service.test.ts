import { describe, expect, test } from 'vitest';
import { InMemoryScoreImportRepository } from './repository.js';
import { ScoreImportService } from './service.js';

const musicXml = `<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><harmony><root><root-step>C</root-step></root><kind>major</kind></harmony><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`;

describe('direct MusicXML imports', () => {
  test('parses synchronously without scheduling an OMR job that can overwrite the draft', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository);

    const result = await service.importMusicXml('dev-owner', 'study.musicxml', musicXml);

    expect(result.item.status).toBe('draft');
    expect(repository.jobs.size).toBe(0);
    expect((await repository.getDraft(result.item.id))?.measures).toHaveLength(1);
  });

  test('keeps uploaded score imports in the OMR queue', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository);

    await service.create('dev-owner', {
      sourceType: 'pdf', originalName: 'study.pdf', storageKey: 'private/dev-owner/study.pdf', sha256: 'file-checksum'
    });

    expect(repository.jobs.size).toBe(1);
  });
});
