import type { ImportJob, ScoreDraft, ScoreImport, ScoreMeasure } from './types.js';

export interface ScoreImportRepository {
  createImport(value: ScoreImport): Promise<void>;
  findImportByOwnerAndSha(ownerId: string, sha256: string, pipelineVersion: string): Promise<ScoreImport | null>;
  listImports(ownerId: string, limit: number, before?: string): Promise<ScoreImport[]>;
  getImport(id: string): Promise<ScoreImport | null>;
  updateImport(value: ScoreImport): Promise<void>;
  saveDraft(value: ScoreDraft, expectedRevision?: number): Promise<boolean>;
  getDraft(importId: string): Promise<ScoreDraft | null>;
  recordCorrection(value: { id: string; importId: string; ownerId: string; revision: number; measureNumber: number; before: ScoreMeasure; after: ScoreMeasure; createdAt: string }): Promise<void>;
  createJob(value: ImportJob): Promise<void>;
  claimNextJob(now: string, staleBefore: string): Promise<ImportJob | null>;
  finishJob(id: string, status: 'completed' | 'failed', errorCode?: string): Promise<void>;
  rescheduleJob(id: string, availableAt: string, errorCode: string): Promise<void>;
  countRecentImports(ownerId: string, since: string): Promise<number>;
  countActiveJobs(ownerId: string): Promise<number>;
  deleteImport(id: string, ownerId: string): Promise<boolean>;
}

export class InMemoryScoreImportRepository implements ScoreImportRepository {
  readonly imports = new Map<string, ScoreImport>();
  readonly drafts = new Map<string, ScoreDraft>();
  readonly jobs = new Map<string, ImportJob>();
  readonly corrections: Array<{ importId: string; revision: number; measureNumber: number }> = [];

  async createImport(value: ScoreImport): Promise<void> { this.imports.set(value.id, structuredClone(value)); }
  async findImportByOwnerAndSha(ownerId: string, sha256: string, pipelineVersion: string): Promise<ScoreImport | null> {
    const item = [...this.imports.values()].find(value => value.ownerId === ownerId
      && value.sha256 === sha256 && value.pipelineVersion === pipelineVersion);
    return structuredClone(item ?? null);
  }
  async listImports(ownerId: string, limit: number, before?: string): Promise<ScoreImport[]> {
    return [...this.imports.values()]
      .filter(item => item.ownerId === ownerId && (!before || item.createdAt < before))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit)
      .map(item => structuredClone(item));
  }
  async getImport(id: string): Promise<ScoreImport | null> { return structuredClone(this.imports.get(id) ?? null); }
  async updateImport(value: ScoreImport): Promise<void> { this.imports.set(value.id, structuredClone(value)); }
  async saveDraft(value: ScoreDraft, expectedRevision?: number): Promise<boolean> {
    const current = this.drafts.get(value.importId);
    if (expectedRevision !== undefined && current?.revision !== expectedRevision) return false;
    this.drafts.set(value.importId, structuredClone(value));
    return true;
  }
  async getDraft(importId: string): Promise<ScoreDraft | null> { return structuredClone(this.drafts.get(importId) ?? null); }
  async recordCorrection(value: { importId: string; revision: number; measureNumber: number }): Promise<void> {
    this.corrections.push({ importId: value.importId, revision: value.revision, measureNumber: value.measureNumber });
  }
  async createJob(value: ImportJob): Promise<void> { this.jobs.set(value.id, structuredClone(value)); }
  async claimNextJob(timestamp: string, staleBefore: string): Promise<ImportJob | null> {
    const job = [...this.jobs.values()]
      .filter(candidate => (candidate.status === 'queued' && candidate.availableAt <= timestamp)
        || (candidate.status === 'processing' && Boolean(candidate.lockedAt && candidate.lockedAt < staleBefore)))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
    if (!job) return null;
    job.status = 'processing';
    job.lockedAt = timestamp;
    job.attemptCount += 1;
    this.jobs.set(job.id, structuredClone(job));
    return structuredClone(job);
  }
  async finishJob(id: string, status: 'completed' | 'failed', errorCode?: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = status;
    job.lastErrorCode = errorCode ?? null;
    this.jobs.set(id, structuredClone(job));
  }
  async rescheduleJob(id: string, availableAt: string, errorCode: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = 'queued';
    job.availableAt = availableAt;
    job.lockedAt = null;
    job.lastErrorCode = errorCode;
    this.jobs.set(id, structuredClone(job));
  }
  async countRecentImports(ownerId: string, since: string): Promise<number> {
    return [...this.imports.values()].filter(item => item.ownerId === ownerId && item.createdAt >= since).length;
  }
  async countActiveJobs(ownerId: string): Promise<number> {
    return [...this.jobs.values()].filter(job => {
      const item = this.imports.get(job.importId);
      return item?.ownerId === ownerId && ['queued', 'processing'].includes(job.status);
    }).length;
  }
  async deleteImport(id: string, ownerId: string): Promise<boolean> {
    const item = this.imports.get(id);
    if (!item || item.ownerId !== ownerId) return false;
    this.imports.delete(id);
    this.drafts.delete(id);
    [...this.jobs.values()].filter(job => job.importId === id).forEach(job => this.jobs.delete(job.id));
    return true;
  }
}
