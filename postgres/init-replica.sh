#!/bin/bash
# PostgreSQL Replica Setup Script

set -e

echo "Setting up PostgreSQL replica..."

# Wait for master to be ready
echo "Waiting for master database to be ready..."
until pg_isready -h "$POSTGRES_MASTER_HOST" -U "$POSTGRES_USER"; do
    sleep 2
done

# Check if this is first run (empty data directory)
if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "First run - creating replica from master..."

    # Remove any existing data
    rm -rf "$PGDATA"/*

    # Create base backup from master
    PGPASSWORD="$POSTGRES_REPLICATION_PASSWORD" pg_basebackup \
        -h "$POSTGRES_MASTER_HOST" \
        -D "$PGDATA" \
        -U "$POSTGRES_REPLICATION_USER" \
        -v \
        -P \
        -W \
        -R \
        -X stream

    # Set proper ownership
    chown -R postgres:postgres "$PGDATA"
    chmod 700 "$PGDATA"

    echo "✅ Base backup completed!"
else
    echo "Data directory already exists, skipping base backup..."
fi

# Create standby.signal file (PostgreSQL 12+)
touch "$PGDATA/standby.signal"

echo "✅ PostgreSQL replica setup completed!"