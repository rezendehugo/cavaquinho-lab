alter table sequence_steps
  add column if not exists source_symbol text;
