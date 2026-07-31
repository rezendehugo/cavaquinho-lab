alter table score_import_jobs
  add column if not exists last_error_code text;
