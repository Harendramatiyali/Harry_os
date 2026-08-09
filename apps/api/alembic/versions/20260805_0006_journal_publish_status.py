"""Add publish_status + workspace_meta_json to trading_journal_days

Revision ID: 20260805_0006
Revises: 20260731_0005
Create Date: 2026-08-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260805_0006"
down_revision: str | None = "20260731_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "trading_journal_days",
        sa.Column(
            "publish_status",
            sa.String(length=16),
            nullable=False,
            server_default="draft",
        ),
    )
    op.create_index(
        "ix_trading_journal_days_publish_status",
        "trading_journal_days",
        ["publish_status"],
    )
    op.add_column(
        "trading_journal_days",
        sa.Column("workspace_meta_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trading_journal_days", "workspace_meta_json")
    op.drop_index("ix_trading_journal_days_publish_status", table_name="trading_journal_days")
    op.drop_column("trading_journal_days", "publish_status")
