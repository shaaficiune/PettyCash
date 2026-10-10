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
echo "📥 [1/6] Pulling latest code from GitHub..."
git pull origin main

# 2. Update backend dependencies + rebuild
echo "📦 [2/6] Installing backend dependencies..."
cd backend
npm install
node scripts/ensure-jwt-secrets.js

# 3. Apply any new schema changes to the existing database
echo "🗄️  [3/6] Applying database schema changes..."
npx prisma generate
node scripts/init-db.js
node scripts/unlock-admin.js

# 4. Build backend
echo "🔨 [4/6] Building backend..."
npm run build
cd ..

# 5. Build frontend
echo "🎨 [5/6] Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 6. Sync nginx config (safe: tests before applying — aborts if config is invalid)
echo "🔒 [6/6] Syncing nginx security config..."
NGINX_CONF_SRC="$(pwd)/nginx-ubuntu.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/petty-cash"
if [ -f "$NGINX_CONF_SRC" ]; then
  sudo cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
  echo "   ✔ Copied nginx-ubuntu.conf → $NGINX_CONF_DEST"
  # Test nginx config BEFORE reloading — set -e will abort if test fails
  sudo nginx -t
  echo "   ✔ Nginx config test passed"
else
  echo "   ⚠ nginx-ubuntu.conf not found in repo root — skipping nginx config update"
fi

# 7. Restart PM2 backend service
echo "⚡ Restarting backend service..."
if pm2 list | grep -q "petty-cash-backend"; then
  pm2 restart petty-cash-backend --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

# 8. Reload Nginx (applies config + any pending systemd changes)
echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx 2>/dev/null || true

echo ""
echo "=============================================="
echo "✅ UPDATE COMPLETED SUCCESSFULLY!"
echo "=============================================="
echo ""
echo "📊 PM2 Status:"
pm2 list
