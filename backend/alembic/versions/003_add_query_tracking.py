"""add query tracking

Revision ID: 003
Revises: 002
Create Date: 2025-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create queries table for tracking RAG queries
    op.create_table(
        'queries',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', sa.String(), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('query_text', sa.Text(), nullable=False),
        sa.Column('results_count', sa.Integer(), default=0),
        sa.Column('processing_time', sa.Float(), default=0.0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    
    # Create indexes for performance
    op.create_index('ix_queries_tenant_id', 'queries', ['tenant_id'])
    op.create_index('ix_queries_created_at', 'queries', ['created_at'])
    op.create_index('ix_queries_tenant_created', 'queries', ['tenant_id', 'created_at'])

def downgrade() -> None:
    op.drop_index('ix_queries_tenant_created', table_name='queries')
    op.drop_index('ix_queries_created_at', table_name='queries')
    op.drop_index('ix_queries_tenant_id', table_name='queries')
    op.drop_table('queries')
