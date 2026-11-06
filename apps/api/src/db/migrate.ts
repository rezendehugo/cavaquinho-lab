import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to apply migrations.');

const migrationsDirectory = resolve(process.cwd(), 'apps/api/migrations');
const sql = postgres(databaseUrl, { max: 1 });

async function recordExistingMigrations() {
  const [state] = await sql<{
    imports: string | null;
    jobErrors: boolean;
    pipelineIndex: boolean;
    sequences: string | null;
    shapeSuffix: boolean;
    customPosition: boolean;
    sourceSymbol: boolean;
  }[]>`
    select
      to_regclass('public.score_imports') as imports,
      exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'score_import_jobs' and column_name = 'last_error_code') as "jobErrors",
      exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'score_import_owner_hash_pipeline') as "pipelineIndex",
      to_regclass('public.sequences') as sequences,
      exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sequence_steps' and column_name = 'shape_suffix') as "shapeSuffix",
      exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sequence_steps' and column_name = 'custom_position') as "customPosition",
      exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sequence_steps' and column_name = 'source_symbol') as "sourceSymbol"
  `;
  const known = [
    state?.imports ? '0001_score_imports.sql' : null,
    state?.jobErrors ? '0002_job_errors.sql' : null,
    state?.pipelineIndex ? '0003_pipeline_cache.sql' : null,
    state?.sequences ? '0004_product_accounts.sql' : null,
    state?.shapeSuffix ? '0005_sequence_shape_suffix.sql' : null,
    state?.customPosition ? '0006_sequence_custom_position.sql' : null,
    state?.sourceSymbol ? '0007_sequence_source_symbol.sql' : null,
    state?.pipelineIndex ? '0008_pipeline_versioned_import_cache.sql' : null
  ].filter(Boolean);
  for (const filename of known) {
    await sql`insert into schema_migrations (filename) values (${filename!}) on conflict do nothing`;
  }
}

async function run() {
  await sql`create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())`;
  await recordExistingMigrations();
  const applied = new Set((await sql<{ filename: string }[]>`select filename from schema_migrations`).map(row => row.filename));
  const files = (await readdir(migrationsDirectory)).filter(file => /^\d+_.+\.sql$/.test(file)).sort();

  for (const filename of files) {
    if (applied.has(filename)) continue;
    const source = await readFile(resolve(migrationsDirectory, filename), 'utf8');
    await sql.begin(async transaction => {
      await transaction.unsafe(source);
      await transaction`insert into schema_migrations (filename) values (${filename})`;
    });
    process.stdout.write(`Applied migration ${filename}\n`);
  }
}

try {
  await run();
} finally {
  await sql.end({ timeout: 5 });
}
