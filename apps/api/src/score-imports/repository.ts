import type { ImportJob, ScoreDraft, ScoreImport } from './types.js';

export interface ScoreImportRepository {
  createImport(value: ScoreImport): Promise<void>;
  getImport(id: string): Promise<ScoreImport | null>;
  updateImport(value: ScoreImport): Promise<void>;
  saveDraft(value: ScoreDraft, expectedRevision?: number): Promise<boolean>;
  getDraft(importId: string): Promise<ScoreDraft | null>;
  createJob(value: ImportJob): Promise<void>;
  countRecentImports(ownerId: string, since: string): Promise<number>;
  countActiveJobs(ownerId: string): Promise<number>;
  deleteImport(id: string, ownerId: string): Promise<boolean>;
}

export class InMemoryScoreImportRepository implements ScoreImportRepository {
  readonly imports = new Map<string, ScoreImport>();
  readonly drafts = new Map<string, ScoreDraft>();
  readonly jobs = new Map<string, ImportJob>();

  async createImport(value: ScoreImport): Promise<void> { this.imports.set(value.id, structuredClone(value)); }
  async getImport(id: string): Promise<ScoreImport | null> { return structuredClone(this.imports.get(id) ?? null); }
  async updateImport(value: ScoreImport): Promise<void> { this.imports.set(value.id, structuredClone(value)); }
  async saveDraft(value: ScoreDraft, expectedRevision?: number): Promise<boolean> {
    const current = this.drafts.get(value.importId);
    if (expectedRevision !== undefined && current?.revision !== expectedRevision) return false;
    this.drafts.set(value.importId, structuredClone(value));
    return true;
  }
  async getDraft(importId: string): Promise<ScoreDraft | null> { return structuredClone(this.drafts.get(importId) ?? null); }
  async createJob(value: ImportJob): Promise<void> { this.jobs.set(value.id, structuredClone(value)); }
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
