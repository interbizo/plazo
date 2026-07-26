#!/bin/bash

# Script untuk deploy fix ke VPS
# Jalankan di local: bash scripts/deploy-fix-to-vps.sh

echo "=== Deploy Fix to VPS ==="
echo ""

# Konfigurasi VPS (sesuaikan dengan VPS Anda)
VPS_HOST="your-vps-ip-or-domain"
VPS_USER="root"
VPS_PATH="/root/plazo/backend"

echo "VPS Configuration:"
echo "  Host: $VPS_HOST"
echo "  User: $VPS_USER"
echo "  Path: $VPS_PATH"
echo ""

# Cek apakah sudah build
if [ ! -d "dist" ]; then
    echo "Building application..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "ERROR: Build failed"
        exit 1
    fi
fi

echo "Step 1: Upload built files to VPS..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'logs' \
    --exclude 'backups' \
    dist/ scripts/ package*.json \
    $VPS_USER@$VPS_HOST:$VPS_PATH/

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to upload files"
    exit 1
fi

echo ""
echo "Step 2: Run fix script on VPS..."
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /root/plazo/backend

# Make scripts executable
chmod +x scripts/*.sh

# Run fix script
sudo bash scripts/fix-postgres-auth.sh

# Update .env
echo "Updating .env file..."
sed -i 's/localhost/127.0.0.1/g' .env

# Restart application
echo "Restarting application..."
pm2 restart plazo-backend

# Show logs
echo ""
echo "=== Application Logs ==="
pm2 logs plazo-backend --lines 20 --nostream

echo ""
echo "=== PM2 Status ==="
pm2 status
ENDSSH

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Check logs with: ssh $VPS_USER@$VPS_HOST 'pm2 logs plazo-backend'"
