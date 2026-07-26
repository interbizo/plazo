#!/bin/bash

# Script untuk test koneksi database PostgreSQL di VPS
# Jalankan di VPS: bash scripts/test-db-connection.sh

echo "=== Testing PostgreSQL Connection ==="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Parse DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not found in .env"
    exit 1
fi

# Extract database credentials from DATABASE_URL
# Format: postgresql://username:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Password: ${DB_PASS:0:3}***"
echo ""

# Test 1: Check if PostgreSQL is running
echo "Test 1: Checking if PostgreSQL is running..."
if systemctl is-active --quiet postgresql; then
    echo "✓ PostgreSQL service is running"
else
    echo "✗ PostgreSQL service is NOT running"
    echo "  Try: sudo systemctl start postgresql"
fi
echo ""

# Test 2: Test connection with psql
echo "Test 2: Testing connection with psql..."
PGPASSWORD="$DB_PASS" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Connection successful"
else
    echo "✗ Connection failed"
    echo ""
    echo "Possible solutions:"
    echo "1. Check if password is correct in .env file"
    echo "2. Check PostgreSQL pg_hba.conf authentication settings"
    echo "3. Try using 127.0.0.1 instead of localhost"
fi
echo ""

# Test 3: Check pg_hba.conf
echo "Test 3: Checking pg_hba.conf authentication settings..."
PG_HBA_FILE=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null)
if [ -n "$PG_HBA_FILE" ]; then
    echo "pg_hba.conf location: $PG_HBA_FILE"
    echo ""
    echo "Current authentication rules for local connections:"
    sudo grep -E "^(local|host)" $PG_HBA_FILE | grep -v "^#"
else
    echo "Could not locate pg_hba.conf"
fi
echo ""

# Test 4: Test pg_dump command
echo "Test 4: Testing pg_dump command..."
TEST_FILE="/tmp/test_backup.sql"
PGPASSWORD="$DB_PASS" pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p -f "$TEST_FILE" 2>&1
if [ $? -eq 0 ]; then
    echo "✓ pg_dump successful"
    rm -f "$TEST_FILE"
else
    echo "✗ pg_dump failed"
fi
echo ""

echo "=== Test Complete ==="
