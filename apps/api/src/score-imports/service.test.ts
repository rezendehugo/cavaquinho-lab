import { describe, expect, test, vi } from 'vitest';
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

  test('checks independent import quotas concurrently after the deduplication lookup', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository);
    let resolveRecent!: (value: number) => void;
    let resolveActive!: (value: number) => void;
    const recent = new Promise<number>(resolve => { resolveRecent = resolve; });
    const active = new Promise<number>(resolve => { resolveActive = resolve; });
    const recentRead = vi.spyOn(repository, 'countRecentImports').mockReturnValue(recent);
    const activeRead = vi.spyOn(repository, 'countActiveJobs').mockReturnValue(active);

    const created = service.create('dev-owner', {
      sourceType: 'pdf', originalName: 'study.pdf', storageKey: 'private/dev-owner/study.pdf', sha256: 'file-checksum'
    });
    await vi.waitFor(() => expect(recentRead).toHaveBeenCalledTimes(1));
    const bothQuotaReadsStarted = recentRead.mock.calls.length === 1 && activeRead.mock.calls.length === 1;
    resolveRecent(0);
    resolveActive(0);

    expect(bothQuotaReadsStarted).toBe(true);
    expect((await created).status).toBe('queued');
  });

  test('lists import summaries without issuing one draft query per import', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository);
    await service.importMusicXml('dev-owner', 'first.musicxml', musicXml);
    await service.importMusicXml('dev-owner', 'second.musicxml', musicXml.replace('<step>C</step>', '<step>D</step>'));
    const individualDraftRead = vi.spyOn(repository, 'getDraft');
    const batchDraftRead = vi.spyOn(repository, 'getDrafts');

    const result = await service.list('dev-owner', 50);

    expect(result).toHaveLength(2);
    expect(result.map(entry => entry.summary?.measureCount)).toEqual([1, 1]);
    expect(individualDraftRead).not.toHaveBeenCalled();
    expect(batchDraftRead).toHaveBeenCalledTimes(1);
  });

  test('uses timeline coverage when saving simultaneous notes in a corrected measure', async () => {
    const repository = new InMemoryScoreImportRepository();
    const service = new ScoreImportService(repository);
    const chordMusicXml = `<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration></note>
      </measure></part></score-partwise>`;
    const imported = await service.importMusicXml('dev-owner', 'chord.musicxml', chordMusicXml);
    expect(imported.draft.measures[0].issues).toEqual([]);
    const saved = await service.updateMeasure(
      'dev-owner', imported.item.id, 1, imported.draft.revision,
      imported.draft.measures[0].events, imported.draft.measures[0].chords
    );
    expect(saved.measures[0].issues).toEqual([]);
    expect(saved.measures[0].events.reduce((sum, event) => sum + event.durationTicks, 0)).toBe(8);
  });
});
