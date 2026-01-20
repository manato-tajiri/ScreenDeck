"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create stores table
    op.create_table(
        'stores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index('ix_stores_code', 'stores', ['code'])

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('role', sa.Enum('admin', 'staff', name='userrole'), nullable=False),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # Create areas table
    op.create_table(
        'areas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Create devices table
    op.create_table(
        'devices',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('device_code', sa.String(100), nullable=False),
        sa.Column('area_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('status', sa.Enum('online', 'offline', 'unknown', name='devicestatus'), nullable=False),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True),
        sa.Column('registered_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['area_id'], ['areas.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_code')
    )
    op.create_index('ix_devices_device_code', 'devices', ['device_code'])

    # Create campaigns table
    op.create_table(
        'campaigns',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('weight', sa.Integer(), nullable=False, default=1),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create campaign_areas table
    op.create_table(
        'campaign_areas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('area_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id']),
        sa.ForeignKeyConstraint(['area_id'], ['areas.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Create media table
    op.create_table(
        'media',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.Enum('image', 'video', name='mediatype'), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('gcs_path', sa.String(500), nullable=False),
        sa.Column('gcs_url', sa.String(1000), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, default=10),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Create playback_logs table
    op.create_table(
        'playback_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('device_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('media_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('played_at', sa.DateTime(), nullable=False),
        sa.Column('synced_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id']),
        sa.ForeignKeyConstraint(['media_id'], ['media.id']),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_playback_logs_played_at', 'playback_logs', ['played_at'])
    op.create_index('ix_playback_logs_device_id', 'playback_logs', ['device_id'])
    op.create_index('ix_playback_logs_campaign_id', 'playback_logs', ['campaign_id'])


def downgrade() -> None:
    op.drop_table('playback_logs')
    op.drop_table('media')
    op.drop_table('campaign_areas')
    op.drop_table('campaigns')
    op.drop_table('devices')
    op.drop_table('areas')
    op.drop_table('users')
    op.drop_table('stores')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS devicestatus')
    op.execute('DROP TYPE IF EXISTS mediatype')
