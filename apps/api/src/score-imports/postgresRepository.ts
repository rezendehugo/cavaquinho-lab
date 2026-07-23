import postgres, { type Sql } from 'postgres';
import type { ImportJob, ScoreDraft, ScoreImport } from './types.js';
import type { ScoreImportRepository } from './repository.js';

type Row = Record<string, unknown>;
const iso = (value: unknown): string => value instanceof Date ? value.toISOString() : String(value);

function mapImport(row: Row): ScoreImport {
  return {
    id: String(row.id), ownerId: String(row.owner_id), sourceType: row.source_type as ScoreImport['sourceType'],
    status: row.status as ScoreImport['status'], originalName: String(row.original_name), storageKey: String(row.storage_key),
    sha256: String(row.sha256), pageCount: row.page_count === null ? null : Number(row.page_count),
    pipelineVersion: String(row.pipeline_version), attemptCount: Number(row.attempt_count),
    lastErrorCode: row.last_error_code === null ? null : String(row.last_error_code),
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at)
  };
}

export class PostgresScoreImportRepository implements ScoreImportRepository {
  constructor(private readonly sql: Sql) {}
  static connect(databaseUrl: string): PostgresScoreImportRepository {
    return new PostgresScoreImportRepository(postgres(databaseUrl, { max: 10, prepare: true }));
  }
  async createImport(value: ScoreImport): Promise<void> {
    await this.sql`insert into score_imports (id, owner_id, source_type, status, original_name, storage_key, sha256, page_count, pipeline_version, attempt_count, last_error_code, created_at, updated_at)
      values (${value.id}, ${value.ownerId}, ${value.sourceType}, ${value.status}, ${value.originalName}, ${value.storageKey}, ${value.sha256}, ${value.pageCount}, ${value.pipelineVersion}, ${value.attemptCount}, ${value.lastErrorCode}, ${value.createdAt}, ${value.updatedAt})`;
  }
  async getImport(id: string): Promise<ScoreImport | null> {
    const rows = await this.sql`select * from score_imports where id = ${id} limit 1`;
    return rows[0] ? mapImport(rows[0]) : null;
  }
  async updateImport(value: ScoreImport): Promise<void> {
    await this.sql`update score_imports set status=${value.status}, page_count=${value.pageCount}, attempt_count=${value.attemptCount}, last_error_code=${value.lastErrorCode}, updated_at=${value.updatedAt} where id=${value.id}`;
  }
  async saveDraft(value: ScoreDraft, expectedRevision?: number): Promise<boolean> {
    const rows = expectedRevision === undefined
      ? await this.sql`insert into score_drafts (id, import_id, owner_id, revision, payload, created_at, updated_at)
      values (${value.id}, ${value.importId}, ${value.ownerId}, ${value.revision}, ${this.sql.json(value as unknown as postgres.JSONValue)}, ${value.createdAt}, ${value.updatedAt})
      on conflict (import_id) do update set revision=excluded.revision, payload=excluded.payload, updated_at=excluded.updated_at returning id`
      : await this.sql`update score_drafts set revision=${value.revision}, payload=${this.sql.json(value as unknown as postgres.JSONValue)}, updated_at=${value.updatedAt}
        where import_id=${value.importId} and revision=${expectedRevision} returning id`;
    return rows.length === 1;
  }
  async getDraft(importId: string): Promise<ScoreDraft | null> {
    const rows = await this.sql`select payload from score_drafts where import_id=${importId} limit 1`;
    return rows[0] ? rows[0].payload as ScoreDraft : null;
  }
  async createJob(value: ImportJob): Promise<void> {
    await this.sql`insert into score_import_jobs (id, import_id, status, available_at, locked_at, attempt_count, created_at)
      values (${value.id}, ${value.importId}, ${value.status}, ${value.availableAt}, ${value.lockedAt}, ${value.attemptCount}, ${value.createdAt})`;
  }
  async countRecentImports(ownerId: string, since: string): Promise<number> {
    const rows = await this.sql`select count(*)::int as count from score_imports where owner_id=${ownerId} and created_at >= ${since}`;
    return Number(rows[0]?.count ?? 0);
  }
  async countActiveJobs(ownerId: string): Promise<number> {
    const rows = await this.sql`select count(*)::int as count from score_import_jobs j join score_imports i on i.id=j.import_id where i.owner_id=${ownerId} and j.status in ('queued','processing')`;
    return Number(rows[0]?.count ?? 0);
  }
  async deleteImport(id: string, ownerId: string): Promise<boolean> {
    const rows = await this.sql`delete from score_imports where id=${id} and owner_id=${ownerId} returning id`;
    return rows.length === 1;
  }
}
