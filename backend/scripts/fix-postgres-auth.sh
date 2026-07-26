#!/bin/bash

# Script untuk memperbaiki konfigurasi PostgreSQL di VPS
# Jalankan di VPS sebagai root: sudo bash scripts/fix-postgres-auth.sh

echo "=== Fixing PostgreSQL Authentication ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: Please run as root (sudo bash scripts/fix-postgres-auth.sh)"
    exit 1
fi

# Database credentials dari VPS
DB_USER="postgres"
DB_PASS="ehf2026@"
DB_NAME="plazo_db"

echo "Database Configuration:"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo "  Password: ${DB_PASS:0:3}***"
echo ""

# Step 1: Update PostgreSQL password
echo "Step 1: Updating PostgreSQL password for user '$DB_USER'..."
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
if [ $? -eq 0 ]; then
    echo "✓ Password updated successfully"
else
    echo "✗ Failed to update password"
    echo "  Creating user if not exists..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
fi
echo ""

# Step 2: Update pg_hba.conf
echo "Step 2: Updating pg_hba.conf for password authentication..."
PG_HBA_FILE=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;')
echo "pg_hba.conf location: $PG_HBA_FILE"

# Backup original file
cp "$PG_HBA_FILE" "${PG_HBA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✓ Backup created: ${PG_HBA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Add/update authentication rules
# Remove old localhost rules and add new ones
sed -i '/^host.*127.0.0.1.*md5/d' "$PG_HBA_FILE"
sed -i '/^host.*::1.*md5/d' "$PG_HBA_FILE"

# Add new rules at the beginning (after comments)
sed -i '/^# TYPE/a\
# IPv4 local connections with password authentication\
host    all             all             127.0.0.1/32            md5\
# IPv6 local connections with password authentication\
host    all             all             ::1/128                 md5' "$PG_HBA_FILE"

echo "✓ pg_hba.conf updated"
echo ""

# Step 3: Reload PostgreSQL
echo "Step 3: Reloading PostgreSQL configuration..."
systemctl reload postgresql
if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL reloaded successfully"
else
    echo "✗ Failed to reload PostgreSQL"
    echo "  Try: sudo systemctl restart postgresql"
fi
echo ""

# Step 4: Test connection
echo "Step 4: Testing connection..."
sleep 2
PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U $DB_USER -d $DB_NAME -c "SELECT 'Connection successful!' as status;"
if [ $? -eq 0 ]; then
    echo "✓ Connection test successful!"
else
    echo "✗ Connection test failed"
    echo ""
    echo "Manual steps to fix:"
    echo "1. Edit pg_hba.conf: sudo nano $PG_HBA_FILE"
    echo "2. Add this line at the top:"
    echo "   host    all             all             127.0.0.1/32            md5"
    echo "3. Reload PostgreSQL: sudo systemctl reload postgresql"
    echo "4. Reset password: sudo -u postgres psql -c \"ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';\""
fi
echo ""

echo "=== Fix Complete ==="
echo ""
echo "Next steps:"
echo "1. Update .env file to use 127.0.0.1 instead of localhost:"
echo "   DATABASE_URL=\"postgresql://postgres:ehf2026@127.0.0.1:5432/plazo_db?connection_limit=20&pool_timeout=20&connect_timeout=10\""
echo ""
echo "2. Rebuild and restart the application:"
echo "   cd /root/plazo/backend"
echo "   npm run build"
echo "   pm2 restart plazo-backend"
