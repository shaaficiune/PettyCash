# Petty Cash App – Deployment Guide

## Ubuntu Server Deployment (Manual / PM2)

### 1. Prerequisites

```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx
```

### 2. PostgreSQL Setup

```bash
sudo -u postgres psql

# Inside psql:
ALTER USER postgres PASSWORD 'Somtel@PL';
CREATE DATABASE petty_cash_db;
\q
```

### 3. Clone / Copy Project Files

```bash
mkdir -p /var/www/petty-cash
cd /var/www/petty-cash
# Copy your files here (scp, git clone, etc.)
```

### 4. Backend Setup

```bash
cd /var/www/petty-cash/backend

# Install dependencies
npm ci --only=production

# Initialize database
node scripts/init-db.js

# Generate Prisma client + seed
npx prisma db push
npx prisma db seed

# Start with PM2
pm2 start dist/src/main.js --name "petty-cash-api"
pm2 save
pm2 startup   # Follow the printed instruction
```

### 5. Frontend Build

```bash
cd /var/www/petty-cash/frontend
npm ci
npm run build
# Built files land in ./dist/
```

### 6. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/petty-cash
```

Paste:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/petty-cash/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 25M;
    }

    location /uploads/ {
        proxy_pass http://localhost:3000/uploads/;
        client_max_body_size 25M;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/petty-cash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Docker Deployment

```bash
cd "D:/Petty Cash App"

# Start all services
docker compose up --build -d

# View logs
docker compose logs -f backend

# Stop
docker compose down

# Destroy volumes (⚠️ deletes all data)
docker compose down -v
```

---

## Production Checklist

- [ ] Change all default passwords in `.env`
- [ ] Generate strong JWT secrets: `openssl rand -hex 64`
- [ ] Restrict CORS in `backend/src/main.ts`
- [ ] Configure SSL (Let's Encrypt or load balancer)
- [ ] Set up daily PostgreSQL backups
- [ ] Configure MinIO bucket policies and access keys
- [ ] Set `NODE_ENV=production`
- [ ] Enable firewall — only expose ports 80 and 443 publicly
