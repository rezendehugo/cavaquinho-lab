ALTER TABLE score_imports DROP CONSTRAINT IF EXISTS score_imports_owner_id_sha256_key;
DROP INDEX IF EXISTS score_import_owner_hash;
CREATE UNIQUE INDEX IF NOT EXISTS score_import_owner_hash_pipeline
  ON score_imports(owner_id, sha256, pipeline_version);
