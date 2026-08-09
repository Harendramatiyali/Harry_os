"""Knowledge Import Engine columns on ai_import_jobs

Revision ID: 20260731_0003
Revises: 20260731_0002
Create Date: 2026-07-31

Additive only — defaults preserve Trading Import behavior.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_0003"
down_revision: str | None = "20260731_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ai_import_jobs",
        sa.Column("parser_type", sa.String(length=32), nullable=False, server_default="trading"),
    )
    op.add_column(
        "ai_import_jobs",
        sa.Column("classification_confidence", sa.Float(), nullable=True),
    )
    op.add_column(
        "ai_import_jobs",
        sa.Column(
            "destination_module",
            sa.String(length=32),
            nullable=False,
            server_default="trading",
        ),
    )
    op.add_column(
        "ai_import_jobs",
        sa.Column("review_schema_version", sa.String(length=32), nullable=True),
    )
    op.create_index("ix_ai_import_jobs_parser_type", "ai_import_jobs", ["parser_type"])
    op.create_index(
        "ix_ai_import_jobs_destination_module", "ai_import_jobs", ["destination_module"]
    )


def downgrade() -> None:
    op.drop_index("ix_ai_import_jobs_destination_module", table_name="ai_import_jobs")
    op.drop_index("ix_ai_import_jobs_parser_type", table_name="ai_import_jobs")
    op.drop_column("ai_import_jobs", "review_schema_version")
    op.drop_column("ai_import_jobs", "destination_module")
    op.drop_column("ai_import_jobs", "classification_confidence")
    op.drop_column("ai_import_jobs", "parser_type")
