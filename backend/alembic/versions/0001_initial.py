"""Create dataset, run and audit tables."""

import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def key(name="id"):
    return sa.Column(name, sa.String(), primary_key=True)


def fk(name, target):
    return sa.Column(name, sa.String(), sa.ForeignKey(target), nullable=False)


def text(name):
    return sa.Column(name, sa.String(), nullable=False)


def payload(name):
    return sa.Column(name, sa.JSON(), nullable=False)


def upgrade():
    op.create_table(
        "datasets",
        key(),
        text("name"),
        text("version"),
        payload("source"),
        payload("quality"),
        sa.Column("raw", sa.LargeBinary(), nullable=False),
        text("created"),
    )
    for table, field in [("dataset_columns", "info"), ("citrus_records", "values")]:
        op.create_table(
            table,
            sa.Column("id", sa.Integer(), primary_key=True),
            fk("dataset_id", "datasets.id"),
            payload(field),
        )
        op.create_index("ix_" + table + "_dataset_id", table, ["dataset_id"])
    op.create_table(
        "analysis_runs",
        key(),
        fk("dataset_id", "datasets.id"),
        text("version"),
        payload("params"),
        text("status"),
        sa.Column("error", sa.String()),
        text("created"),
    )
    for table in [
        "analysis_run_steps",
        "tool_logs",
        "agent_executions",
        "scenario_results",
        "optimization_results",
    ]:
        op.create_table(
            table,
            sa.Column("id", sa.Integer(), primary_key=True),
            fk("run_id", "analysis_runs.id"),
            payload("payload"),
        )
        op.create_index("ix_" + table + "_run_id", table, ["run_id"])
    op.create_table(
        "reports",
        sa.Column("id", sa.String(), sa.ForeignKey("analysis_runs.id"), primary_key=True),
        text("created"),
        payload("payload"),
    )


def downgrade():
    for table in [
        "reports",
        "optimization_results",
        "scenario_results",
        "agent_executions",
        "tool_logs",
        "analysis_run_steps",
        "analysis_runs",
        "citrus_records",
        "dataset_columns",
        "datasets",
    ]:
        op.drop_table(table)
