-- Knowledge Inbox (future table — not required for Trading path)
-- Applied manually or via a later Alembic revision when inbox UI ships.

CREATE TABLE IF NOT EXISTS ai_knowledge_inbox_items (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) NULL,
  parser_type VARCHAR(32) NOT NULL DEFAULT 'general',
  suggested_destination VARCHAR(32) NULL,
  chosen_destination VARCHAR(32) NULL,
  title VARCHAR(255) NULL,
  draft_json TEXT NULL,
  ocr_summary TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  classification_confidence FLOAT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX ix_inbox_user (user_id),
  INDEX ix_inbox_status (status),
  CONSTRAINT fk_inbox_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inbox_job FOREIGN KEY (job_id) REFERENCES ai_import_jobs(id) ON DELETE SET NULL
);
