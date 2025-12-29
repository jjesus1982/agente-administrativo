#!/bin/bash
# PostgreSQL Master Replication Setup Script

set -e

echo "Setting up PostgreSQL master for replication..."

# Create replication user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create replication user
    CREATE USER $POSTGRES_REPLICATION_USER REPLICATION LOGIN CONNECTION LIMIT 5 ENCRYPTED PASSWORD '$POSTGRES_REPLICATION_PASSWORD';

    -- Grant necessary permissions
    GRANT USAGE ON SCHEMA public TO $POSTGRES_REPLICATION_USER;

    -- Create replication slot for each replica
    SELECT pg_create_physical_replication_slot('replica_1');
EOSQL

# Configure pg_hba.conf for replication
echo "# Replication connections" >> "$PGDATA/pg_hba.conf"
echo "host replication $POSTGRES_REPLICATION_USER 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"

# Create archive directory
mkdir -p /var/lib/postgresql/archive
chown postgres:postgres /var/lib/postgresql/archive
chmod 750 /var/lib/postgresql/archive

echo "✅ PostgreSQL master replication setup completed!"