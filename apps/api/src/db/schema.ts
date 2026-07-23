import { integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const importStatus = pgEnum('score_import_status', ['uploaded', 'queued', 'processing', 'draft', 'needs_correction', 'ready', 'failed']);

export const scoreImports = pgTable('score_imports', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  sourceType: text('source_type').notNull(),
  status: importStatus('status').notNull(),
  originalName: text('original_name').notNull(),
  storageKey: text('storage_key').notNull(),
  sha256: text('sha256').notNull(),
  pageCount: integer('page_count'),
  pipelineVersion: text('pipeline_version').notNull(),
  attemptCount: integer('attempt_count').notNull().default(0),
  lastErrorCode: text('last_error_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex('score_import_owner_hash').on(table.ownerId, table.sha256)]);

export const scoreDrafts = pgTable('score_drafts', {
  id: uuid('id').primaryKey(),
  importId: uuid('import_id').notNull().references(() => scoreImports.id, { onDelete: 'cascade' }).unique(),
  ownerId: uuid('owner_id').notNull(),
  revision: integer('revision').notNull().default(1),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const importJobs = pgTable('score_import_jobs', {
  id: uuid('id').primaryKey(),
  importId: uuid('import_id').notNull().references(() => scoreImports.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  availableAt: timestamp('available_at', { withTimezone: true }).notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  attemptCount: integer('attempt_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const correctionEvents = pgTable('score_correction_events', {
  id: uuid('id').primaryKey(),
  importId: uuid('import_id').notNull().references(() => scoreImports.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').notNull(),
  revision: integer('revision').notNull(),
  measureNumber: integer('measure_number').notNull(),
  before: jsonb('before').notNull(),
  after: jsonb('after').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const melodyExercises = pgTable('melody_exercises', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  sourceImportId: uuid('source_import_id').notNull().references(() => scoreImports.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull().default(1),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
