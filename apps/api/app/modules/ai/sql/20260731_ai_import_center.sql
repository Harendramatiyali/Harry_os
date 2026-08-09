-- AI Import Center schema (SQLite / MySQL-compatible strings for enums)
-- Reuses trading_journal_* for committed journals. Does not duplicate journal tables.

-- ---------------------------------------------------------------------------
-- Import sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_import_jobs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NULL,
    notebook_label VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    review_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    current_stage VARCHAR(64) NULL,
    page_count INTEGER NOT NULL DEFAULT 0,
    overall_confidence FLOAT NULL,
    confidence_json TEXT NULL,
    draft_json TEXT NULL,
    draft_version INTEGER NOT NULL DEFAULT 0,
    detected_journal_date DATE NULL,
    committed_journal_day_id CHAR(36) NULL,
    model_id VARCHAR(64) NULL,
    prompt_version VARCHAR(64) NULL,
    content_fingerprint VARCHAR(64) NULL,
    error_code VARCHAR(64) NULL,
    error_message TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    CONSTRAINT fk_ai_import_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_ai_import_jobs_user_fingerprint UNIQUE (user_id, content_fingerprint)
);

CREATE INDEX IF NOT EXISTS ix_ai_import_jobs_user_id ON ai_import_jobs (user_id);
CREATE INDEX IF NOT EXISTS ix_ai_import_jobs_status ON ai_import_jobs (status);
CREATE INDEX IF NOT EXISTS ix_ai_import_jobs_review_status ON ai_import_jobs (review_status);
CREATE INDEX IF NOT EXISTS ix_ai_import_jobs_current_stage ON ai_import_jobs (current_stage);
CREATE INDEX IF NOT EXISTS ix_ai_import_jobs_detected_journal_date ON ai_import_jobs (detected_journal_date);
CREATE INDEX IF NOT EXISTS ix_ai_import_jobs_committed_journal_day_id ON ai_import_jobs (committed_journal_day_id);
CREATE INDEX IF NOT EXISTS ix_ai_import_jobs_content_fingerprint ON ai_import_jobs (content_fingerprint);

-- ---------------------------------------------------------------------------
-- Notebook images (storage metadata)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_import_pages (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    job_id CHAR(36) NOT NULL,
    page_index INTEGER NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    original_file_name VARCHAR(255) NULL,
    mime_type VARCHAR(128) NULL,
    byte_size INTEGER NULL,
    checksum VARCHAR(64) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'uploaded',
    quality_score FLOAT NULL,
    ocr_confidence FLOAT NULL,
    ocr_transcript TEXT NULL,
    ocr_meta_json TEXT NULL,
    error_message TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    CONSTRAINT fk_ai_import_pages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_import_pages_job FOREIGN KEY (job_id) REFERENCES ai_import_jobs(id) ON DELETE CASCADE,
    CONSTRAINT uk_ai_import_pages_job_index UNIQUE (job_id, page_index)
);

CREATE INDEX IF NOT EXISTS ix_ai_import_pages_user_id ON ai_import_pages (user_id);
CREATE INDEX IF NOT EXISTS ix_ai_import_pages_job_id ON ai_import_pages (job_id);
CREATE INDEX IF NOT EXISTS ix_ai_import_pages_checksum ON ai_import_pages (checksum);
CREATE INDEX IF NOT EXISTS ix_ai_import_pages_status ON ai_import_pages (status);

-- ---------------------------------------------------------------------------
-- Draft versions + confidence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_import_draft_versions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    job_id CHAR(36) NOT NULL,
    version INTEGER NOT NULL,
    source VARCHAR(16) NOT NULL DEFAULT 'model',
    draft_json TEXT NOT NULL,
    confidence_json TEXT NULL,
    overall_confidence FLOAT NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    CONSTRAINT fk_ai_import_draft_versions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_import_draft_versions_job FOREIGN KEY (job_id) REFERENCES ai_import_jobs(id) ON DELETE CASCADE,
    CONSTRAINT uk_ai_import_draft_versions_job_ver UNIQUE (job_id, version)
);

CREATE INDEX IF NOT EXISTS ix_ai_import_draft_versions_user_id ON ai_import_draft_versions (user_id);
CREATE INDEX IF NOT EXISTS ix_ai_import_draft_versions_job_id ON ai_import_draft_versions (job_id);

-- ---------------------------------------------------------------------------
-- Pipeline / review audit events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_import_events (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    job_id CHAR(36) NOT NULL,
    stage VARCHAR(64) NULL,
    level VARCHAR(16) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    payload_json TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL,
    CONSTRAINT fk_ai_import_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_import_events_job FOREIGN KEY (job_id) REFERENCES ai_import_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_ai_import_events_user_id ON ai_import_events (user_id);
CREATE INDEX IF NOT EXISTS ix_ai_import_events_job_id ON ai_import_events (job_id);
CREATE INDEX IF NOT EXISTS ix_ai_import_events_stage ON ai_import_events (stage);

-- ---------------------------------------------------------------------------
-- Provenance on existing journal tables (no new journal tables)
-- Prefer Alembic batch_alter on SQLite; below is the logical DDL.
-- ---------------------------------------------------------------------------
ALTER TABLE trading_journal_days
  ADD COLUMN ai_import_job_id CHAR(36) NULL;

-- SQLite may require table rebuild for FK; MySQL/Postgres:
-- ALTER TABLE trading_journal_days
--   ADD CONSTRAINT fk_trading_journal_days_ai_import_job
--   FOREIGN KEY (ai_import_job_id) REFERENCES ai_import_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_trading_journal_days_ai_import_job_id
  ON trading_journal_days (ai_import_job_id);

ALTER TABLE trading_journal_attachments
  ADD COLUMN ai_import_page_id CHAR(36) NULL;

-- ALTER TABLE trading_journal_attachments
--   ADD CONSTRAINT fk_trading_journal_attachments_ai_import_page
--   FOREIGN KEY (ai_import_page_id) REFERENCES ai_import_pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_trading_journal_attachments_ai_import_page_id
  ON trading_journal_attachments (ai_import_page_id);
