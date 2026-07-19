# Database Migrations Guide

Complete guide to managing database schema changes using Alembic.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Running Migrations](#running-migrations)
4. [Creating Migrations](#creating-migrations)
5. [Migration Workflow](#migration-workflow)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Common Scenarios](#common-scenarios)

---

## Overview

**Alembic** is a lightweight database migration tool for SQLAlchemy. It manages schema changes in a version-controlled, reversible way.

### Key Benefits

✅ **Version Control** — Track all schema changes in git  
✅ **Reversible** — Downgrade if needed with `downgrade` command  
✅ **Automated** — Auto-generate migrations from model changes  
✅ **Safe** — Review changes before deploying  
✅ **Tracked** — Know exactly what changed and when  

### Architecture

```
alembic.ini          ← Main configuration
alembic/
├── env.py           ← Migration environment/runner
├── script.py.mako   ← Migration template
└── versions/        ← Migration files
    ├── 001_initial_schema.py
    ├── 002_add_column.py
    └── ...
```

---

## Setup

### 1. Install Alembic

Alembic is already in requirements.txt:

```bash
cd /opt/cyberrange/app/backend
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Verify Installation

```bash
alembic version
# Output: Alembic version 1.13.1
```

### 3. Update Configuration

Edit `alembic.ini` and update the database URL (if needed):

```ini
# For MySQL (used in production)
sqlalchemy.url = mysql+pymysql://user:password@host/dbname

# Or set via environment variable (recommended)
# DATABASE_URL=mysql+pymysql://user:password@host/dbname
```

### 4. Test Database Connection

```bash
# This should run the initial migration
alembic upgrade head
```

---

## Running Migrations

### Upgrade to Latest Version

Run all pending migrations:

```bash
# Navigate to backend directory
cd /opt/cyberrange/app/backend

# Run all pending migrations
alembic upgrade head

# Example output:
# INFO  [alembic.runtime.migration] Context impl MySQLImpl.
# INFO  [alembic.runtime.migration] Will assume InnoDB with utf8mb4 charset.
# INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial_schema, create initial schema...
```

### Upgrade to Specific Version

```bash
# Upgrade to a specific revision
alembic upgrade 001_initial_schema

# Upgrade exactly one revision
alembic upgrade +1
```

### Downgrade to Previous Version

```bash
# Downgrade one revision
alembic downgrade -1

# Downgrade to specific version
alembic downgrade 001_initial_schema

# Downgrade all migrations
alembic downgrade base
```

### View Current Database Version

```bash
# Show current revision
alembic current

# Example output:
# INFO  [alembic.runtime.migration] Context impl MySQLImpl.
# INFO  [alembic.runtime.migration] Will assume InnoDB with utf8mb4 charset.
# e7c5f3d2a1b -> 001_initial_schema (head)
```

### View All Versions

```bash
# Show migration history
alembic history

# Example output:
# <base> -> 001_initial_schema (head), create initial schema
```

---

## Creating Migrations

### Automatic Migration Generation

Generate migration from model changes:

```bash
# This auto-generates migration by comparing models to database
alembic revision --autogenerate -m "add user_status column"

# Review the generated file in alembic/versions/
# It should show changes to User model
```

**Important:** Always review auto-generated migrations! They sometimes need adjustments.

### Manual Migration

Create a blank migration template:

```bash
# Create empty migration
alembic revision -m "add phone column to users"

# Edit the file manually in alembic/versions/
# Add your upgrade() and downgrade() logic
```

### Migration File Structure

```python
"""Add phone column to users.

Revision ID: 002_add_phone_column
Revises: 001_initial_schema
Create Date: 2026-07-17 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "002_add_phone_column"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Add phone column."""
    op.add_column(
        "users",
        sa.Column("phone", sa.String(20), nullable=True)
    )

def downgrade() -> None:
    """Remove phone column."""
    op.drop_column("users", "phone")
```

---

## Migration Workflow

### Step 1: Make Model Changes

Edit `app/models.py`:

```python
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(256))
    email: Mapped[str] = mapped_column(String(256), unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # NEW
    # ... rest of columns
```

### Step 2: Generate Migration

```bash
# Auto-generate based on model changes
alembic revision --autogenerate -m "add phone column to users"

# Review generated file
cat alembic/versions/002_add_phone_column.py
```

### Step 3: Review Migration

Check the generated migration looks correct:

```python
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))

def downgrade():
    op.drop_column('users', 'phone')
```

**Fix if needed:**
- Ensure nullable is correct
- Add constraints if required
- Verify column types match models

### Step 4: Test Migration on Dev Database

```bash
# Backup current database (if production)
# mysqldump -u user -p dbname > backup.sql

# Run migration
alembic upgrade head

# Verify change in database
mysql -u user -p dbname -e "DESCRIBE users;"
```

### Step 5: Commit to Git

```bash
git add alembic/versions/002_add_phone_column.py
git commit -m "Migration: add phone column to users table"
git push origin scintilla
```

### Step 6: Deploy to Production

```bash
# On production server
cd /opt/cyberrange/app/backend
source venv/bin/activate

# Backup database first
mysqldump -u user -p dbname > backup_$(date +%Y%m%d).sql

# Run migration
alembic upgrade head

# Verify successful
alembic current
```

---

## Best Practices

### ✅ DO

- **Create one migration per logical change** (e.g., one for adding column, one for index)
- **Test migrations on dev database first** before production
- **Backup production database** before running migrations
- **Review auto-generated migrations** before committing
- **Write descriptive commit messages** with migration reasons
- **Keep migrations small and focused** for easier rollback
- **Always include both upgrade() and downgrade()** functions
- **Test both upgrade AND downgrade** during development

### ❌ DON'T

- **Don't manually modify database** and skip migration (defeats version control)
- **Don't create massive migrations** (hard to debug)
- **Don't forget to backup production** before migrations
- **Don't edit old migration files** (breaks history for other developers)
- **Don't use raw SQL** unless necessary (use SQLAlchemy API)
- **Don't commit without testing** the migration

### Naming Conventions

Use descriptive, sequential naming:

```
001_initial_schema.py          ← Initial full schema
002_add_phone_column.py        ← Single feature
003_create_audit_log_table.py  ← New entity
004_add_cascade_delete.py      ← Relationship change
005_add_indexes_for_perf.py    ← Performance optimization
```

---

## Troubleshooting

### Problem: Migration Won't Run

```
FAILED: Can't find revision for 001_initial_schema
```

**Solution:**
```bash
# Verify migration file exists
ls alembic/versions/001_initial_schema.py

# Check file has correct format
head -20 alembic/versions/001_initial_schema.py

# Try running with verbose output
alembic upgrade head -v
```

### Problem: Database Connection Error

```
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError)
Can't connect to MySQL server
```

**Solution:**
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Or edit alembic.ini with correct connection string
# Test connection:
mysql -u user -p -h host dbname -e "SELECT 1;"
```

### Problem: Can't Downgrade

```
Can't find a target that matches the specified revision
```

**Solution:**
```bash
# View available versions
alembic history

# Downgrade to valid revision
alembic downgrade 001_initial_schema
```

### Problem: Forgot to Add Index

**Solution:**
```bash
# Create new migration
alembic revision -m "add index to user_email"

# Edit file and add index operation:
def upgrade():
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

def downgrade():
    op.drop_index('ix_users_email', table_name='users')

# Test and deploy
alembic upgrade head
```

---

## Common Scenarios

### Add a New Column

```python
def upgrade():
    op.add_column(
        "users",
        sa.Column("bio", sa.Text(), nullable=True)
    )

def downgrade():
    op.drop_column("users", "bio")
```

### Add a New Table

```python
def upgrade():
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

def downgrade():
    op.drop_table("audit_logs")
```

### Add a Foreign Key

```python
def upgrade():
    op.add_column(
        "challenges",
        sa.Column("created_by_id", sa.Integer(), nullable=False)
    )
    op.create_foreign_key(
        "fk_challenges_created_by_id",
        "challenges",
        "users",
        ["created_by_id"],
        ["id"]
    )

def downgrade():
    op.drop_constraint("fk_challenges_created_by_id", "challenges")
    op.drop_column("challenges", "created_by_id")
```

### Add an Index

```python
def upgrade():
    op.create_index(
        "ix_challenges_title",
        "challenges",
        ["title"]
    )

def downgrade():
    op.drop_index("ix_challenges_title", table_name="challenges")
```

### Rename a Column

```python
def upgrade():
    op.alter_column(
        "users",
        "full_name",
        new_column_name="name"
    )

def downgrade():
    op.alter_column(
        "users",
        "name",
        new_column_name="full_name"
    )
```

### Change Column Type

```python
def upgrade():
    op.alter_column(
        "challenges",
        "points",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=False,
        nullable=False
    )

def downgrade():
    op.alter_column(
        "challenges",
        "points",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=False,
        nullable=False
    )
```

---

## Environment Variable Configuration

### Set Database URL

For production, set the DATABASE_URL environment variable:

```bash
# In deployment systemd service
export DATABASE_URL=mysql+pymysql://cyberrange:password@localhost:3306/cyberrange

# Or in .env file
DATABASE_URL=mysql+pymysql://user:password@host/dbname

# Or in production config
export DATABASE_URL="mysql+pymysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
```

### Verify Configuration

```bash
# Check if DATABASE_URL is used
alembic upgrade head -v  # Shows connection info

# Check current revision
alembic current
```

---

## Integration with FastAPI

Migrations run automatically during deployment:

```bash
# In deployment script (DEPLOYMENT_GUIDE.md):
cd /opt/cyberrange/app/backend
source venv/bin/activate
alembic upgrade head
gunicorn app.main:app --bind 0.0.0.0:8000 --workers 4
```

Or create a systemd service hook to run migrations before starting app.

---

## Next Steps

1. **Test initial migration:**
   ```bash
   alembic upgrade head
   alembic current
   ```

2. **Make a schema change** to models.py

3. **Auto-generate migration:**
   ```bash
   alembic revision --autogenerate -m "describe your change"
   ```

4. **Test the migration** (upgrade and downgrade)

5. **Commit to scintilla branch:**
   ```bash
   git add alembic/
   git commit -m "Migration: your change"
   ```

---

**Last Updated:** 2026-07-17
