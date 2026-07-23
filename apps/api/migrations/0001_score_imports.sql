CREATE TYPE score_import_status AS ENUM ('uploaded','queued','processing','draft','needs_correction','ready','failed');
CREATE TABLE score_imports (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL, source_type text NOT NULL,
  status score_import_status NOT NULL, original_name text NOT NULL,
  storage_key text NOT NULL, sha256 text NOT NULL, page_count integer,
  pipeline_version text NOT NULL, attempt_count integer NOT NULL DEFAULT 0,
  last_error_code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, sha256)
);
CREATE INDEX score_imports_owner_created ON score_imports(owner_id, created_at DESC);
CREATE TABLE score_drafts (
  id uuid PRIMARY KEY, import_id uuid NOT NULL UNIQUE REFERENCES score_imports(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL, revision integer NOT NULL DEFAULT 1, payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE score_import_jobs (
  id uuid PRIMARY KEY, import_id uuid NOT NULL REFERENCES score_imports(id) ON DELETE CASCADE,
  status text NOT NULL, available_at timestamptz NOT NULL, locked_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX score_jobs_claim ON score_import_jobs(status, available_at) WHERE status = 'queued';
CREATE TABLE score_correction_events (
  id uuid PRIMARY KEY, import_id uuid NOT NULL REFERENCES score_imports(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL, revision integer NOT NULL, measure_number integer NOT NULL,
  before jsonb NOT NULL, after jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE melody_exercises (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL,
  source_import_id uuid NOT NULL REFERENCES score_imports(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 1, payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE score_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_correction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE melody_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_import_owner ON score_imports USING (owner_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid) WITH CHECK (owner_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
CREATE POLICY score_draft_owner ON score_drafts USING (owner_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid) WITH CHECK (owner_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
CREATE POLICY score_correction_owner ON score_correction_events USING (owner_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid) WITH CHECK (owner_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
CREATE POLICY melody_exercise_owner ON melody_exercises USING (owner_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid) WITH CHECK (owner_id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
