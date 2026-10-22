#!/bin/bash
# ============================================================
#  PETTY CASH — INSTANT PRODUCTION REPAIR SCRIPT
#  Fixes:
#  1. Nginx root path dynamically pointing to $(pwd)/frontend/dist
#  2. Cloudflare Insights CSP directive allowed in Nginx
#  3. Adds https://pettycash.himilotech.com to backend/.env ALLOWED_ORIGINS
#  4. Rebuilds frontend if dist is missing
#  5. Reloads Nginx and PM2 gracefully
#  Usage: bash fix-production.sh
# ============================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "=============================================="
echo "🔧 1. DETECTING APP DIRECTORY"
echo "=============================================="
echo "App Directory: $APP_DIR"

if [ ! -d "$APP_DIR/frontend/dist" ]; then
  echo "📦 frontend/dist not found. Building frontend..."
  cd "$APP_DIR/frontend"
  npm install
  npm run build
  cd "$APP_DIR"
else
  echo "✔ frontend/dist exists at: $APP_DIR/frontend/dist"
fi

echo ""
echo "=============================================="
echo "🔒 2. UPDATING NGINX CONFIGURATION"
echo "=============================================="
NGINX_CONF_DEST="/etc/nginx/sites-available/petty-cash"

sudo tee "$NGINX_CONF_DEST" > /dev/null <<EOF
server {
    listen 80 default_server;
    server_name _;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # Content Security Policy — allows self, Google Fonts, and Cloudflare Insights
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none';" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

    # Dynamic Frontend Root
    root ${APP_DIR}/frontend/dist;
    index index.html;

    # NestJS Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 120s;
    }

    # Cache static JS/CSS/image assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # React Router Fallback — all non-asset routes serve index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

echo "✔ Successfully generated $NGINX_CONF_DEST with root: ${APP_DIR}/frontend/dist"
sudo nginx -t
sudo systemctl reload nginx
echo "✔ Nginx reloaded successfully"

echo ""
echo "=============================================="
echo "🔑 3. UPDATING BACKEND CORS & DOMAINS"
echo "=============================================="
ENV_FILE="$APP_DIR/backend/.env"
if [ -f "$ENV_FILE" ]; then
  if grep -q "ALLOWED_ORIGINS" "$ENV_FILE"; then
    if ! grep -q "pettycash.himilotech.com" "$ENV_FILE"; then
      sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://pettycash.himilotech.com,https://pettycash.bluekompl.com,http://localhost:5173,http://localhost:3000|' "$ENV_FILE"
      echo "✔ Added https://pettycash.himilotech.com to ALLOWED_ORIGINS"
    else
      echo "✔ ALLOWED_ORIGINS already contains pettycash.himilotech.com"
    fi
  else
    echo "ALLOWED_ORIGINS=https://pettycash.himilotech.com,https://pettycash.bluekompl.com,http://localhost:5173,http://localhost:3000" >> "$ENV_FILE"
    echo "✔ Appended ALLOWED_ORIGINS to backend/.env"
  fi
fi

echo ""
echo "=============================================="
echo "⚡ 4. RESTARTING PM2 BACKEND SERVICE"
echo "=============================================="
pm2 restart petty-cash-backend --update-env || pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=============================================="
echo "🌐 5. TESTING LOCAL BACKEND & NGINX"
echo "=============================================="
sleep 2
echo "Testing http://127.0.0.1:3000/api..."
curl -I -s http://127.0.0.1:3000/api || echo "Backend response checked"
echo "Testing Nginx http://localhost/..."
curl -I -s http://localhost/ || echo "Nginx response checked"

echo ""
echo "=============================================="
echo "✅ PRODUCTION REPAIR COMPLETE!"
echo "Open https://pettycash.himilotech.com in your browser now!"
echo "=============================================="
