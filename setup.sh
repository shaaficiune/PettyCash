#!/bin/bash
set -e

echo "=========================================="
echo "🚀 PETTY CASH ALL-IN-ONE UBUNTU SETUP"
echo "=========================================="

# 0. Fix Ubuntu 24.04 mirror if regional mirror (like so.archive) has connection issues
if [ -f /etc/apt/sources.list.d/ubuntu.sources ]; then
    sudo sed -i 's|http://so.archive.ubuntu.com|http://archive.ubuntu.com|g' /etc/apt/sources.list.d/ubuntu.sources
fi
if [ -f /etc/apt/sources.list ]; then
    sudo sed -i 's|http://so.archive.ubuntu.com|http://archive.ubuntu.com|g' /etc/apt/sources.list
fi

# Ensure node and npm are installed cleanly
if ! command -v npm &> /dev/null; then
    echo "📦 Node.js / npm not found. Installing Node.js 20 LTS..."
    sudo apt update --fix-missing
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs nginx postgresql postgresql-contrib
fi

# Also ensure postgresql and nginx are installed
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
fi

# 1. Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# 2. Setup PostgreSQL Database and User
echo "🗄️ Setting up PostgreSQL database..."
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE DATABASE petty_cash_db;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER petty_user WITH ENCRYPTED PASSWORD 'PettyCashPass2026!';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE petty_cash_db TO petty_user;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER DATABASE petty_cash_db OWNER TO petty_user;" 2>/dev/null || true

# 3. Create backend .env
echo "⚙️ Creating backend .env file..."
cat << 'EOF' > backend/.env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL="postgresql://petty_user:PettyCashPass2026!@localhost:5432/petty_cash_db?schema=public"
JWT_SECRET="super-secure-production-jwt-secret-key-2026"
JWT_EXPIRATION="8h"
JWT_REFRESH_SECRET="super-secure-production-refresh-secret-2026"
JWT_REFRESH_EXPIRATION="7d"
ALLOWED_ORIGINS="*"
ENABLE_SWAGGER="false"
EOF

# 4. Install backend dependencies & build
echo "📦 Building Backend..."
cd backend
npm install
npx prisma generate
npx prisma db push
npm run build
cd ..

# 5. Install frontend dependencies & build
echo "🎨 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 6. Configure Nginx
echo "🌐 Configuring Nginx..."
CURRENT_DIR=$(pwd)
sudo tee /etc/nginx/sites-available/petty-cash > /dev/null << EOF
server {
    listen 80 default_server;
    server_name _;

    root $CURRENT_DIR/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000/uploads/;
        client_max_body_size 50M;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/petty-cash /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 7. Start Backend with PM2
echo "⚡ Starting PM2 process..."
mkdir -p logs
pm2 delete petty-cash-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=========================================="
echo "✅ SETUP COMPLETED SUCCESSFULLY!"
echo "📍 Test locally: curl http://localhost"
echo "🌐 Next step: Connect Cloudflare Tunnel!"
echo "=========================================="
