"""Knowledge Inbox tables

Revision ID: 20260731_0004
Revises: 20260731_0003
Create Date: 2026-07-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_0004"
down_revision: str | None = "20260731_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_knowledge_inbox_items",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.String(length=36), sa.ForeignKey("ai_import_jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("parser_type", sa.String(length=32), nullable=False, server_default="general"),
        sa.Column("suggested_destination", sa.String(length=32), nullable=True),
        sa.Column("chosen_destination", sa.String(length=32), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("draft_json", sa.Text(), nullable=True),
        sa.Column("ocr_summary", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("classification_confidence", sa.Float(), nullable=True),
        sa.Column("routed_journal_day_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ai_knowledge_inbox_items_user_id", "ai_knowledge_inbox_items", ["user_id"])
    op.create_index("ix_ai_knowledge_inbox_items_job_id", "ai_knowledge_inbox_items", ["job_id"])
    op.create_index("ix_ai_knowledge_inbox_items_status", "ai_knowledge_inbox_items", ["status"])

    op.create_table(
        "ai_import_corrections",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=True),
        sa.Column("inbox_item_id", sa.String(length=36), nullable=True),
        sa.Column("predicted_parser_type", sa.String(length=32), nullable=True),
        sa.Column("predicted_destination", sa.String(length=32), nullable=True),
        sa.Column("chosen_parser_type", sa.String(length=32), nullable=True),
        sa.Column("chosen_destination", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ai_import_corrections_user_id", "ai_import_corrections", ["user_id"])
    op.create_index("ix_ai_import_corrections_job_id", "ai_import_corrections", ["job_id"])
    op.create_index("ix_ai_import_corrections_inbox_item_id", "ai_import_corrections", ["inbox_item_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_import_corrections_inbox_item_id", table_name="ai_import_corrections")
    op.drop_index("ix_ai_import_corrections_job_id", table_name="ai_import_corrections")
    op.drop_index("ix_ai_import_corrections_user_id", table_name="ai_import_corrections")
    op.drop_table("ai_import_corrections")
    op.drop_index("ix_ai_knowledge_inbox_items_status", table_name="ai_knowledge_inbox_items")
    op.drop_index("ix_ai_knowledge_inbox_items_job_id", table_name="ai_knowledge_inbox_items")
    op.drop_index("ix_ai_knowledge_inbox_items_user_id", table_name="ai_knowledge_inbox_items")
    op.drop_table("ai_knowledge_inbox_items")
