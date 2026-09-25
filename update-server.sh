#!/bin/bash
# ============================================================
#  PETTY CASH — SERVER UPDATE SCRIPT
#  Run this on the Ubuntu server to pull latest code + restart
#  Usage: bash update-server.sh
# ============================================================
set -e

echo ""
echo "=============================================="
echo "🔄 PETTY CASH — PULLING LATEST UPDATE"
echo "=============================================="

# 1. Pull latest code from GitHub
echo "📥 [1/5] Pulling latest code from GitHub..."
git pull origin main

# 2. Update backend dependencies + rebuild
echo "📦 [2/5] Installing backend dependencies..."
cd backend
npm install

# 3. Apply any new schema changes to the existing database
echo "🗄️  [3/5] Applying database schema changes..."
npx prisma generate
npx prisma db push --accept-data-loss

# 4. Build backend
echo "🔨 [4/5] Building backend..."
npm run build
cd ..

# 5. Build frontend
echo "🎨 [5/5] Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 6. Restart PM2 backend service
echo "⚡ Restarting backend service..."
if pm2 list | grep -q "petty-cash-backend"; then
  pm2 restart petty-cash-backend
else
  pm2 start ecosystem.config.js
fi
pm2 save

# 7. Reload Nginx
echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx 2>/dev/null || true

echo ""
echo "=============================================="
echo "✅ UPDATE COMPLETED SUCCESSFULLY!"
echo "=============================================="
echo ""
echo "📊 PM2 Status:"
pm2 list
