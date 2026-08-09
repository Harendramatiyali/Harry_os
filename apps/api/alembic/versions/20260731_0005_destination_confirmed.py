"""Add destination_confirmed to ai_import_jobs

Revision ID: 20260731_0005
Revises: 20260731_0004
Create Date: 2026-07-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_0005"
down_revision: str | None = "20260731_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ai_import_jobs",
        sa.Column(
            "destination_confirmed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("ai_import_jobs", "destination_confirmed")
