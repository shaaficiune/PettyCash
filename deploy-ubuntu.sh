#!/bin/bash
set -e

echo "🚀 Starting Ubuntu PM2 + Nginx Deployment for Petty Cash App..."

# 1. Pull latest changes if using git
if [ -d ".git" ]; then
  echo "📥 Pulling latest git commits..."
  git pull origin main || true
fi

# 2. Setup Backend
echo "📦 Setting up Backend..."
cd backend
npm install
npx prisma db push --accept-data-loss
npx prisma generate
npm run build
cd ..

# 3. Setup Frontend
echo "🎨 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 4. Start / Restart PM2 Backend Service
echo "⚡ Managing PM2 Service..."
if pm2 list | grep -q "petty-cash-backend"; then
  pm2 restart ecosystem.config.js
else
  pm2 start ecosystem.config.js
fi
pm2 save

# 5. Reload Nginx
echo "🌐 Reloading Nginx Service..."
if systemctl is-active --quiet nginx; then
  sudo systemctl reload nginx
fi

echo "✅ Deployment completed successfully!"
echo "📍 Access system at: http://10.35.70.251"
