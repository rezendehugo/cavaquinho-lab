alter table sequences
  add column if not exists region_mode text;

alter table sequence_steps
  add column if not exists region_id text,
  add column if not exists region_block_id text,
  add column if not exists region_source_step_id text;
