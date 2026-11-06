alter table sequence_steps
  add column if not exists custom_position jsonb;
