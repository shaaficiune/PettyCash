#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f backend/package.json ]]; then
  echo "Run this script from the repository root."
  exit 1
fi

if [[ -e backend/.env ]]; then
  echo "backend/.env already exists. Keeping it unchanged; use update-server.sh for routine updates."
  exit 1
fi

if ! command -v sudo >/dev/null || ! command -v openssl >/dev/null; then
  echo "This setup requires sudo and openssl."
  exit 1
fi

if ! command -v npm >/dev/null; then
  sudo apt-get update
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo apt-get update
sudo apt-get install -y nginx postgresql postgresql-contrib
sudo systemctl start postgresql
sudo npm install -g pm2

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='petty_user'" | grep -q 1; then
  echo "Database role petty_user already exists. Refusing to replace its password."
  exit 1
fi
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='petty_cash_db'" | grep -q 1; then
  echo "Database petty_cash_db already exists. Refusing to alter existing data."
  exit 1
fi

DB_PASSWORD="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 64)"
JWT_REFRESH_SECRET="$(openssl rand -hex 64)"
INITIAL_ADMIN_PASSWORD="$(openssl rand -hex 24)"
INITIAL_ACCOUNTANT_PASSWORD="$(openssl rand -hex 24)"
INITIAL_EMPLOYEE_PASSWORD="$(openssl rand -hex 24)"
INITIAL_BLUEKOM_EMPLOYEE_PASSWORD="$(openssl rand -hex 24)"

printf "CREATE ROLE petty_user LOGIN ENCRYPTED PASSWORD '%s';\n" "$DB_PASSWORD" | sudo -u postgres psql --set=ON_ERROR_STOP=1
sudo -u postgres createdb --owner=petty_user petty_cash_db

umask 077
cat > backend/.env <<EOF
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL=postgresql://petty_user:${DB_PASSWORD}@localhost:5432/petty_cash_db?schema=public
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
INITIAL_ADMIN_PASSWORD=${INITIAL_ADMIN_PASSWORD}
INITIAL_ACCOUNTANT_PASSWORD=${INITIAL_ACCOUNTANT_PASSWORD}
INITIAL_EMPLOYEE_PASSWORD=${INITIAL_EMPLOYEE_PASSWORD}
INITIAL_BLUEKOM_EMPLOYEE_PASSWORD=${INITIAL_BLUEKOM_EMPLOYEE_PASSWORD}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://pettycash.bluekompl.com}
ENABLE_SWAGGER=false
EOF
chmod 600 backend/.env

echo "Installing backend dependencies and preparing the database..."
cd backend
npm install
npx prisma generate
node scripts/init-db.js
set -a
source .env
set +a
npm run prisma:seed
sed -i '/^INITIAL_.*_PASSWORD=/d' .env
npm run build
cd ..

echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

APP_DIR="$(pwd)"
sudo tee /etc/nginx/sites-available/petty-cash > /dev/null <<EOF
server {
    listen 80 default_server;
    server_name _;

    root ${APP_DIR}/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        client_max_body_size 50M;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/petty-cash /etc/nginx/sites-enabled/petty-cash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

mkdir -p logs
pm2 start ecosystem.config.js
pm2 save

cat <<EOF

Setup completed. Save these one-time passwords and have each user change theirs at first login:
admin: ${INITIAL_ADMIN_PASSWORD}
accountant: ${INITIAL_ACCOUNTANT_PASSWORD}
employee: ${INITIAL_EMPLOYEE_PASSWORD}
employee_bk: ${INITIAL_BLUEKOM_EMPLOYEE_PASSWORD}
EOF
