import { createHash, randomUUID } from 'node:crypto';
import type { ScoreImportRepository } from './repository.js';
import type { ChordEvent, PracticeArtifacts, ScoreDraft, ScoreEvent, ScoreImport, ScoreMeasure } from './types.js';
import { hasCriticalIssues, parseMusicXml } from './musicXmlParser.js';
import { suggestMelodyRoute } from './melodyRoute.js';

export class ScoreImportError extends Error {
  constructor(readonly code: string, readonly statusCode: number) { super(code); }
}

const now = () => new Date().toISOString();
const checksum = (value: string) => createHash('sha256').update(value).digest('hex');

function validateMeasure(measure: ScoreMeasure): ScoreMeasure {
  const total = measure.events.reduce((sum, event) => sum + event.durationTicks, 0);
  const otherIssues = measure.issues.filter(issue => issue.code !== 'measure_duration_mismatch');
  return {
    ...measure,
    issues: total === measure.expectedTicks ? otherIssues : [...otherIssues, {
      code: 'measure_duration_mismatch', severity: 'critical',
      message: `A medida soma ${total} ticks, mas deveria somar ${measure.expectedTicks}.`
    }]
  };
}

export class ScoreImportService {
  constructor(private readonly repository: ScoreImportRepository, private readonly pipelineVersion = 'musicxml-v1') {}

  async create(ownerId: string, input: { sourceType: 'musicxml' | 'pdf'; originalName: string; storageKey: string; sha256: string }): Promise<ScoreImport> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (await this.repository.countRecentImports(ownerId, since) >= 20) throw new ScoreImportError('daily_import_limit', 429);
    if (await this.repository.countActiveJobs(ownerId) >= 5) throw new ScoreImportError('concurrent_import_limit', 429);
    const timestamp = now();
    const item: ScoreImport = {
      id: randomUUID(), ownerId, sourceType: input.sourceType, status: 'queued', originalName: input.originalName,
      storageKey: input.storageKey, sha256: input.sha256, pageCount: null, pipelineVersion: this.pipelineVersion,
      attemptCount: 0, lastErrorCode: null, createdAt: timestamp, updatedAt: timestamp
    };
    await this.repository.createImport(item);
    await this.repository.createJob({ id: randomUUID(), importId: item.id, status: 'queued', availableAt: timestamp, lockedAt: null, attemptCount: 0, createdAt: timestamp });
    return item;
  }

  async importMusicXml(ownerId: string, originalName: string, content: string): Promise<{ item: ScoreImport; draft: ScoreDraft }> {
    const item = await this.create(ownerId, { sourceType: 'musicxml', originalName, storageKey: `private/${ownerId}/${randomUUID()}.musicxml`, sha256: checksum(content) });
    item.status = 'processing';
    item.updatedAt = now();
    await this.repository.updateImport(item);
    try {
      const draft = parseMusicXml(content, { importId: item.id, ownerId });
      await this.repository.saveDraft(draft);
      item.status = hasCriticalIssues(draft) ? 'needs_correction' : 'draft';
      item.updatedAt = now();
      await this.repository.updateImport(item);
      return { item, draft };
    } catch (error) {
      item.status = 'failed';
      item.lastErrorCode = error instanceof Error ? error.message : 'musicxml_failure';
      item.updatedAt = now();
      await this.repository.updateImport(item);
      throw error;
    }
  }

  async getOwned(ownerId: string, importId: string): Promise<{ item: ScoreImport; draft: ScoreDraft | null }> {
    const item = await this.repository.getImport(importId);
    if (!item || item.ownerId !== ownerId) throw new ScoreImportError('score_import_not_found', 404);
    return { item, draft: await this.repository.getDraft(importId) };
  }

  async updateMeasure(ownerId: string, importId: string, number: number, revision: number, events: ScoreEvent[], chords: ChordEvent[]): Promise<ScoreDraft> {
    const { item, draft } = await this.getOwned(ownerId, importId);
    if (!draft) throw new ScoreImportError('draft_not_found', 404);
    if (draft.revision !== revision) throw new ScoreImportError('revision_conflict', 409);
    const measureIndex = draft.measures.findIndex(measure => measure.number === number);
    if (measureIndex < 0) throw new ScoreImportError('measure_not_found', 404);
    draft.measures[measureIndex] = validateMeasure({ ...draft.measures[measureIndex], events, chords });
    draft.revision += 1;
    draft.updatedAt = now();
    item.status = hasCriticalIssues(draft) ? 'needs_correction' : 'draft';
    item.updatedAt = draft.updatedAt;
    if (!await this.repository.saveDraft(draft, revision)) throw new ScoreImportError('revision_conflict', 409);
    await this.repository.updateImport(item);
    return draft;
  }

  async validate(ownerId: string, importId: string): Promise<ScoreImport> {
    const { item, draft } = await this.getOwned(ownerId, importId);
    if (!draft) throw new ScoreImportError('draft_not_found', 404);
    item.status = hasCriticalIssues(draft) ? 'needs_correction' : 'ready';
    item.updatedAt = now();
    await this.repository.updateImport(item);
    return item;
  }

  async retry(ownerId: string, importId: string): Promise<ScoreImport> {
    const { item } = await this.getOwned(ownerId, importId);
    if (!['failed', 'needs_correction'].includes(item.status)) throw new ScoreImportError('retry_not_allowed', 409);
    const timestamp = now();
    item.status = 'queued';
    item.lastErrorCode = null;
    item.attemptCount += 1;
    item.updatedAt = timestamp;
    await this.repository.updateImport(item);
    await this.repository.createJob({ id: randomUUID(), importId, status: 'queued', availableAt: timestamp, lockedAt: null, attemptCount: item.attemptCount, createdAt: timestamp });
    return item;
  }

  async createPractice(ownerId: string, importId: string, targets: Array<'sequence' | 'melody'>): Promise<PracticeArtifacts> {
    const { item, draft } = await this.getOwned(ownerId, importId);
    if (!draft || item.status !== 'ready') throw new ScoreImportError('draft_not_ready', 422);
    const result: PracticeArtifacts = {};
    if (targets.includes('sequence')) {
      result.sequence = {
        id: randomUUID(), title: draft.title, sourceImportId: importId,
        steps: draft.measures.flatMap(measure => measure.chords.map(chord => ({ id: randomUUID(), symbol: chord.symbol, measure: measure.number, offsetTicks: chord.offsetTicks })))
      };
    }
    if (targets.includes('melody')) {
      const route = suggestMelodyRoute(draft);
      result.melody = {
        id: randomUUID(), ownerId, sourceImportId: importId, title: draft.title,
        ticksPerQuarter: draft.measures[0]?.divisions ?? 1, meter: draft.meter, tempo: draft.tempo,
        events: draft.measures.flatMap(measure => measure.events.map(event => ({
          ...event, measure: measure.number, suggestedPosition: route.get(event.id) ?? null, selectedPosition: null
        }))), createdAt: now()
      };
    }
    return result;
  }

  async delete(ownerId: string, importId: string): Promise<void> {
    if (!await this.repository.deleteImport(importId, ownerId)) throw new ScoreImportError('score_import_not_found', 404);
  }
}
