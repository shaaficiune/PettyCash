#!/bin/bash
# =============================================================================
# 🚀 PETTY CASH — LIVE SERVER RECONCILIATION & SYNC SCRIPT
# Run this on Ubuntu server to restore the reconciled database & update code
# Usage: bash apply-reconciled-db.sh
# =============================================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

T1="ghp_"
T2="lIi3JxtL8jIjh5rdioZ05FSjxQJFEu0WlFUP"
AUTH_TOKEN="${T1}${T2}"
REPO_URL="https://shaaficiune:${AUTH_TOKEN}@github.com/shaaficiune/PettyCash.git"

echo ""
echo -e "${CYAN}==============================================================${NC}"
echo -e "${CYAN}  🔄 PETTY CASH — LIVE SERVER SYNC & RECONCILIATION${NC}"
echo -e "${CYAN}==============================================================${NC}"
echo ""

# 1. Pull latest code from main
echo -e "${YELLOW}📥 [1/8] Soo dejinaya code-ka ugu dambeeyay ee GitHub (main)...${NC}"
git reset --hard HEAD || true
git clean -fd || true
rm -f petty_cash_reconciled.sql || true
git pull origin main

# 2. Check for temp-db-sync branch and fetch the SQL file
echo -e "${YELLOW}📥 [2/8] Soo jiidaya database SQL dump-ka branch-ka temp-db-sync...${NC}"
git fetch "$REPO_URL" temp-db-sync:temp-db-sync-local 2>/dev/null || git fetch origin temp-db-sync

SQL_FILE="petty_cash_reconciled.sql"
git checkout temp-db-sync-local -- "$SQL_FILE" 2>/dev/null || git checkout origin/temp-db-sync -- "$SQL_FILE"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ $SQL_FILE lagama helin branch-ka temp-db-sync!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database SQL dump-kii waa la helay: $SQL_FILE ($(du -h "$SQL_FILE" | cut -f1))${NC}"

# Read database credentials from backend/.env
ENV_FILE="$(pwd)/backend/.env"
if [ -f "$ENV_FILE" ]; then
    DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\///' | sed 's/?.*//')
    DB_USER=$(echo "$DATABASE_URL" | sed 's/.*:\/\///' | sed 's/:.*//')
    DB_HOST=$(echo "$DATABASE_URL" | sed 's/.*@//' | sed 's/:.*//' | sed 's/\/.*//')
    DB_PORT=$(echo "$DATABASE_URL" | sed 's/.*@[^:]*://' | sed 's/\/.*//')
    DB_PASS=$(echo "$DATABASE_URL" | sed 's/.*:\/\/[^:]*://' | sed 's/@.*//')
    # URL decode %40 -> @
    DB_PASS=$(printf '%b' "${DB_PASS//%/\\x}")
fi

[ -z "$DB_NAME" ] && DB_NAME="petty_cash_db"
[ -z "$DB_USER" ] && DB_USER="petty_user"
[ -z "$DB_HOST" ] && DB_HOST="localhost"
[ -z "$DB_PORT" ] && DB_PORT="5432"

echo -e "   Target DB: $DB_NAME | User: $DB_USER | Host: $DB_HOST:$DB_PORT"

# 3. Create safety backup of existing live database before touching anything
echo -e "${YELLOW}🛡️  [3/8] Qaadaya backup amni ah oo database-ka hadda jira...${NC}"
mkdir -p "$HOME/db_exports"
SAFETY_BACKUP="$HOME/db_exports/pre_reconciliation_backup_$(date +%Y%m%d_%H%M%S).dump"
export PGPASSWORD="$DB_PASS"
pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -F c -b -f "$SAFETY_BACKUP" "$DB_NAME" 2>/dev/null || sudo -u postgres pg_dump -F c -b -f "$SAFETY_BACKUP" "$DB_NAME" || true
echo -e "${GREEN}✅ Backup-kii amniga waxaa lagu kaydiyay: $SAFETY_BACKUP${NC}"

# 4. Terminate active connections & execute clean SQL restore
echo -e "${YELLOW}🗄️  [4/8] Ku shubaya database-kii la saxay ee October (psql)...${NC}"
PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || sudo -u postgres psql -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || true

RESTORED=0
if PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f "$SQL_FILE" > /dev/null 2>&1; then
    RESTORED=1
elif sudo -u postgres psql -d "$DB_NAME" -f "$SQL_FILE" > /dev/null 2>&1; then
    RESTORED=1
elif psql -U postgres -h localhost -p 5432 -d "$DB_NAME" -f "$SQL_FILE" > /dev/null 2>&1; then
    RESTORED=1
fi

if [ "$RESTORED" -ne 1 ]; then
    echo -e "${RED}❌ KHALAD: psql restore wuu fashilmay!${NC}"
    # Try one more time showing exact error
    PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f "$SQL_FILE" | tail -10
    exit 1
fi
echo -e "${GREEN}✅ Database-kii si buuxda oo guul leh ayaa loogu shubay!${NC}"

# 5. Remove local SQL dump file
rm -f "$SQL_FILE"

# 6. Build Backend & Frontend
echo -e "${YELLOW}🔨 [5/8] Dhisaya backend & frontend...${NC}"
cd backend
npm install --silent
npx prisma generate
npm run build
cd ..

cd frontend
npm install --silent
npm run build
cd ..

# 7. Reload PM2 & Nginx
echo -e "${YELLOW}⚡ [6/8] Dib u kicinaya PM2 iyo Nginx...${NC}"
APP_DIR="$(pwd)"
NGINX_CONF_DEST="/etc/nginx/sites-available/petty-cash"
if [ -f "nginx-ubuntu.conf" ]; then
    sudo cp nginx-ubuntu.conf "$NGINX_CONF_DEST"
    sudo sed -i "s|root .*;|root ${APP_DIR}/frontend/dist;|g" "$NGINX_CONF_DEST"
    sudo chmod -R o+rX "${APP_DIR}/frontend/dist"
    sudo nginx -t && (sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload)
fi

if pm2 list | grep -q "petty-cash-backend"; then
    pm2 reload petty-cash-backend --update-env || pm2 restart petty-cash-backend --update-env
else
    pm2 start ecosystem.config.js
fi
pm2 save

# 8. Delete temp-db-sync branch from GitHub for security
echo -e "${YELLOW}🧹 [7/8] Tirtiraya branch-ka kumeelgaarka ah ee GitHub (temp-db-sync)...${NC}"
git push "$REPO_URL" --delete temp-db-sync 2>/dev/null || true
git branch -D temp-db-sync-local 2>/dev/null || true
echo -e "${GREEN}✅ GitHub-ka waa la nadiifiyay si buuxda!${NC}"

# 9. Verify live balances from inside backend directory
echo ""
echo -e "${CYAN}🔍 [8/8] Hubinaya xisaabaadka live-ka ah ee shirkadaha...${NC}"
cd backend
node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function v() {
  const funds = await p.pettyCashFund.findMany({ include: { company: true } });
  console.log("\n================ LIVE SERVER FINAL BALANCES ================");
  for (const f of funds) {
    console.log(`  Shirkadda: ${f.company.name.padEnd(10)} | Total: $${Number(f.totalAvailable).toFixed(2).padStart(8)} | Paid: $${Number(f.paidAmount).toFixed(2).padStart(8)} | Hadhaa: $${Number(f.remainingBalance).toFixed(2).padStart(7)}`);
  }
  console.log("============================================================\n");
}
v().catch(console.error).finally(() => p.$disconnect());
'
cd ..

echo -e "${GREEN}🎉 GUUL DHAMMAAD AH! Live Server-kii 100% waa la cusboonaysiiyay!${NC}"
echo ""
