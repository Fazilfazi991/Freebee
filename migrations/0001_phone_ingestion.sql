CREATE TABLE phones (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL CHECK (brand IN ('apple', 'samsung', 'google')),
  slug TEXT NOT NULL,
  model TEXT NOT NULL,
  series TEXT NOT NULL,
  variant_name TEXT,
  quality TEXT NOT NULL CHECK (quality IN ('verified', 'partial', 'needs-review')),
  publication_state TEXT NOT NULL CHECK (publication_state IN ('draft', 'verified', 'partial', 'needs-review', 'published')),
  parser_version TEXT NOT NULL,
  normalized_json TEXT NOT NULL CHECK (json_valid(normalized_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE (brand, slug)
);
CREATE INDEX phones_public_brand_idx ON phones (publication_state, brand, model);

CREATE TABLE phone_sources (
  id TEXT PRIMARY KEY,
  phone_id TEXT NOT NULL REFERENCES phones(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  manufacturer TEXT NOT NULL,
  official_url TEXT NOT NULL,
  region TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  content_type TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  last_changed_at TEXT NOT NULL,
  UNIQUE (phone_id, official_url, region)
);
CREATE INDEX phone_sources_hash_idx ON phone_sources (source_hash);
CREATE INDEX phone_sources_phone_retrieved_idx ON phone_sources (phone_id, retrieved_at DESC);

CREATE TABLE field_provenance (
  phone_id TEXT NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES phone_sources(id) ON DELETE RESTRICT,
  source_section TEXT NOT NULL,
  source_text TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  PRIMARY KEY (phone_id, field_path, source_id)
);
CREATE INDEX field_provenance_source_idx ON field_provenance (source_id);

CREATE TABLE ingestion_runs (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL CHECK (brand IN ('apple', 'samsung', 'google')),
  model TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'blocked', 'failed', 'awaiting-review', 'completed')),
  http_status INTEGER,
  parser_version TEXT NOT NULL,
  validation_issues_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(validation_issues_json))
);
CREATE INDEX ingestion_runs_target_idx ON ingestion_runs (brand, model, started_at DESC);
CREATE INDEX ingestion_runs_status_idx ON ingestion_runs (status, started_at DESC);

CREATE TABLE ingestion_changes (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  phone_id TEXT NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  previous_value_json TEXT CHECK (previous_value_json IS NULL OR json_valid(previous_value_json)),
  new_value_json TEXT CHECK (new_value_json IS NULL OR json_valid(new_value_json)),
  source_id TEXT NOT NULL REFERENCES phone_sources(id) ON DELETE RESTRICT,
  review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  UNIQUE (run_id, phone_id, field_path)
);
CREATE INDEX ingestion_changes_review_idx ON ingestion_changes (review_status, run_id);
CREATE INDEX ingestion_changes_phone_idx ON ingestion_changes (phone_id, run_id);
