"""AI Import Center tables + journal provenance columns

Revision ID: 20260731_0002
Revises: 20260729_0001
Create Date: 2026-07-31

Adds import session / notebook page / draft confidence / review metadata.
Does NOT create duplicate trading journal tables — reuses trading_journal_*.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_0002"
down_revision: str | None = "20260729_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_import_jobs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("notebook_label", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("review_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("current_stage", sa.String(length=64), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overall_confidence", sa.Float(), nullable=True),
        sa.Column("confidence_json", sa.Text(), nullable=True),
        sa.Column("draft_json", sa.Text(), nullable=True),
        sa.Column("draft_version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("detected_journal_date", sa.Date(), nullable=True),
        sa.Column("committed_journal_day_id", sa.String(length=36), nullable=True),
        sa.Column("model_id", sa.String(length=64), nullable=True),
        sa.Column("prompt_version", sa.String(length=64), nullable=True),
        sa.Column("content_fingerprint", sa.String(length=64), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "content_fingerprint", name="uk_ai_import_jobs_user_fingerprint"),
    )
    op.create_index("ix_ai_import_jobs_user_id", "ai_import_jobs", ["user_id"])
    op.create_index("ix_ai_import_jobs_status", "ai_import_jobs", ["status"])
    op.create_index("ix_ai_import_jobs_review_status", "ai_import_jobs", ["review_status"])
    op.create_index("ix_ai_import_jobs_current_stage", "ai_import_jobs", ["current_stage"])
    op.create_index("ix_ai_import_jobs_detected_journal_date", "ai_import_jobs", ["detected_journal_date"])
    op.create_index("ix_ai_import_jobs_committed_journal_day_id", "ai_import_jobs", ["committed_journal_day_id"])
    op.create_index("ix_ai_import_jobs_content_fingerprint", "ai_import_jobs", ["content_fingerprint"])

    op.create_table(
        "ai_import_pages",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.String(length=36), sa.ForeignKey("ai_import_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_index", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("original_file_name", sa.String(length=255), nullable=True),
        sa.Column("mime_type", sa.String(length=128), nullable=True),
        sa.Column("byte_size", sa.Integer(), nullable=True),
        sa.Column("checksum", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="uploaded"),
        sa.Column("quality_score", sa.Float(), nullable=True),
        sa.Column("ocr_confidence", sa.Float(), nullable=True),
        sa.Column("ocr_transcript", sa.Text(), nullable=True),
        sa.Column("ocr_meta_json", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("job_id", "page_index", name="uk_ai_import_pages_job_index"),
    )
    op.create_index("ix_ai_import_pages_user_id", "ai_import_pages", ["user_id"])
    op.create_index("ix_ai_import_pages_job_id", "ai_import_pages", ["job_id"])
    op.create_index("ix_ai_import_pages_checksum", "ai_import_pages", ["checksum"])
    op.create_index("ix_ai_import_pages_status", "ai_import_pages", ["status"])

    op.create_table(
        "ai_import_draft_versions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.String(length=36), sa.ForeignKey("ai_import_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False, server_default="model"),
        sa.Column("draft_json", sa.Text(), nullable=False),
        sa.Column("confidence_json", sa.Text(), nullable=True),
        sa.Column("overall_confidence", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("job_id", "version", name="uk_ai_import_draft_versions_job_ver"),
    )
    op.create_index("ix_ai_import_draft_versions_user_id", "ai_import_draft_versions", ["user_id"])
    op.create_index("ix_ai_import_draft_versions_job_id", "ai_import_draft_versions", ["job_id"])

    op.create_table(
        "ai_import_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.String(length=36), sa.ForeignKey("ai_import_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage", sa.String(length=64), nullable=True),
        sa.Column("level", sa.String(length=16), nullable=False, server_default="info"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ai_import_events_user_id", "ai_import_events", ["user_id"])
    op.create_index("ix_ai_import_events_job_id", "ai_import_events", ["job_id"])
    op.create_index("ix_ai_import_events_stage", "ai_import_events", ["stage"])

    # Provenance on existing journal tables (no new journal tables)
    with op.batch_alter_table("trading_journal_days") as batch:
        batch.add_column(
            sa.Column("ai_import_job_id", sa.String(length=36), nullable=True)
        )
        batch.create_foreign_key(
            "fk_trading_journal_days_ai_import_job",
            "ai_import_jobs",
            ["ai_import_job_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_index("ix_trading_journal_days_ai_import_job_id", ["ai_import_job_id"])

    with op.batch_alter_table("trading_journal_attachments") as batch:
        batch.add_column(
            sa.Column("ai_import_page_id", sa.String(length=36), nullable=True)
        )
        batch.create_foreign_key(
            "fk_trading_journal_attachments_ai_import_page",
            "ai_import_pages",
            ["ai_import_page_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_index("ix_trading_journal_attachments_ai_import_page_id", ["ai_import_page_id"])


def downgrade() -> None:
    with op.batch_alter_table("trading_journal_attachments") as batch:
        batch.drop_index("ix_trading_journal_attachments_ai_import_page_id")
        batch.drop_constraint("fk_trading_journal_attachments_ai_import_page", type_="foreignkey")
        batch.drop_column("ai_import_page_id")

    with op.batch_alter_table("trading_journal_days") as batch:
        batch.drop_index("ix_trading_journal_days_ai_import_job_id")
        batch.drop_constraint("fk_trading_journal_days_ai_import_job", type_="foreignkey")
        batch.drop_column("ai_import_job_id")

    op.drop_table("ai_import_events")
    op.drop_table("ai_import_draft_versions")
    op.drop_table("ai_import_pages")
    op.drop_table("ai_import_jobs")
