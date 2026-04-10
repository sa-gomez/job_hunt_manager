"""add_applications_table

Revision ID: a3f7c8d2e1b4
Revises: 0d56b4145e6c
Create Date: 2026-04-10 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a3f7c8d2e1b4'
down_revision: Union[str, Sequence[str], None] = '0d56b4145e6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'applications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=False),
        sa.Column('job_title', sa.String(length=500), nullable=False),
        sa.Column('job_url', sa.Text(), nullable=True),
        sa.Column('stage', sa.String(length=50), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recruiter_name', sa.String(length=255), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['profile_id'], ['user_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['job_id'], ['job_postings.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_applications_profile_id'), 'applications', ['profile_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_applications_profile_id'), table_name='applications')
    op.drop_table('applications')
