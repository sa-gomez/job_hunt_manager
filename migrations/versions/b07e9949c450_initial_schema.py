"""initial_schema

Revision ID: b07e9949c450
Revises:
Create Date: 2026-04-08 15:00:22.910508

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b07e9949c450'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_profiles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('remote_ok', sa.Boolean(), nullable=False),
        sa.Column('skills', sa.JSON(), nullable=False),
        sa.Column('experience_years', sa.Integer(), nullable=True),
        sa.Column('experience_notes', sa.Text(), nullable=True),
        sa.Column('target_roles', sa.JSON(), nullable=False),
        sa.Column('target_companies', sa.JSON(), nullable=False),
        sa.Column('salary_min', sa.Integer(), nullable=True),
        sa.Column('salary_max', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )

    op.create_table(
        'credentials',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('service', sa.String(100), nullable=False),
        sa.Column('username_enc', sa.Text(), nullable=True),
        sa.Column('password_enc', sa.Text(), nullable=True),
        sa.Column('extra_enc', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['user_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'job_postings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('discovered_at', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(50), nullable=False),
        sa.Column('external_id', sa.String(255), nullable=True),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('company', sa.String(255), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('remote_flag', sa.Boolean(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('salary_min', sa.Integer(), nullable=True),
        sa.Column('salary_max', sa.Integer(), nullable=True),
        sa.Column('posted_at', sa.DateTime(), nullable=True),
        sa.Column('raw_json', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source', 'external_id', name='uq_source_external'),
    )

    op.create_table(
        'scan_results',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scanned_at', sa.DateTime(), nullable=False),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('score_breakdown', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['job_postings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['profile_id'], ['user_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('scan_results')
    op.drop_table('job_postings')
    op.drop_table('credentials')
    op.drop_table('user_profiles')
