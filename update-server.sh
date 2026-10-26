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
echo "📥 [1/9] Pulling latest code from GitHub..."
git stash || true
git pull origin main

# 2. Check and upgrade Node.js to v24 LTS if needed
CURRENT_NODE_MAJOR=$(node -v 2>/dev/null | cut -d'.' -f1 | sed 's/v//' || echo "0")
if [ "$CURRENT_NODE_MAJOR" -lt 24 ]; then
  echo "🚀 [2/9] Node.js version is currently v${CURRENT_NODE_MAJOR}. Upgrading to Node.js v24 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo "   ✔ Upgraded Node.js to: $(node -v)"
  echo "   ✔ Upgraded npm to: $(npm -v)"
  echo "   ✔ Updating PM2 globally..."
  sudo npm install -g pm2
  pm2 update || true
else
  echo "✔ [2/9] Node.js is already up-to-date: $(node -v)"
fi

# 3. Update backend dependencies
echo "📦 [3/9] Installing backend dependencies..."
cd backend
npm install
node scripts/ensure-jwt-secrets.js

# 4. Apply any new schema changes to the existing database
echo "🗄️  [4/9] Applying database schema changes..."
npx prisma generate
node scripts/init-db.js
node scripts/unlock-admin.js

# 5. Build backend
echo "🔨 [5/9] Building backend..."
npm run build
cd ..

# 6. Build frontend
echo "🎨 [6/9] Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 7. Sync nginx config with dynamic root path & permissions
echo "🔒 [7/9] Syncing nginx security config..."
APP_DIR="$(pwd)"
NGINX_CONF_SRC="${APP_DIR}/nginx-ubuntu.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/petty-cash"

if [ -f "$NGINX_CONF_SRC" ]; then
  sudo cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"
  # Dynamically replace root path with actual repository location to prevent 500 error
  sudo sed -i "s|root .*;|root ${APP_DIR}/frontend/dist;|g" "$NGINX_CONF_DEST"
  echo "   ✔ Injected root path: ${APP_DIR}/frontend/dist"

  # Ensure www-data (Nginx) has execute permissions to traverse parent directories & read dist
  chmod o+x "${APP_DIR}" 2>/dev/null || true
  chmod o+x "$(dirname "${APP_DIR}")" 2>/dev/null || true
  chmod -R o+rX "${APP_DIR}/frontend/dist"

  # Provide fallback symlink in /var/www/petty-cash
  sudo mkdir -p /var/www/petty-cash/frontend
  sudo ln -sfn "${APP_DIR}/frontend/dist" /var/www/petty-cash/frontend/dist 2>/dev/null || true

  # Ensure site is enabled and default site is removed
  sudo ln -sf "$NGINX_CONF_DEST" /etc/nginx/sites-enabled/petty-cash
  sudo rm -f /etc/nginx/sites-enabled/default

  # Test nginx config BEFORE reloading — set -e will abort if test fails
  sudo nginx -t
  echo "   ✔ Nginx config test passed"
else
  echo "   ⚠ nginx-ubuntu.conf not found in repo root — skipping nginx config update"
fi

# 8. Reload PM2 backend service (graceful reload with zero downtime)
echo "⚡ [8/9] Reloading backend service..."
if pm2 list | grep -q "petty-cash-backend"; then
  pm2 reload petty-cash-backend --update-env || pm2 restart petty-cash-backend --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

# 9. Restart Nginx to apply config & permissions immediately
echo "🌐 [9/9] Restarting Nginx..."
sudo systemctl restart nginx || sudo systemctl reload nginx || true

echo ""
echo "=============================================="
echo "✅ UPDATE COMPLETED SUCCESSFULLY!"
echo "=============================================="
echo ""
echo "📊 Current Node Version: $(node -v)"
echo "📊 PM2 Status:"
pm2 list
