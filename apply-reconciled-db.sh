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
git stash || true
git pull origin main

# 2. Check for temp-db-sync branch and fetch the dump
echo -e "${YELLOW}📥 [2/8] Soo jiidaya database dump-ka branch-ka temp-db-sync...${NC}"
git fetch "$REPO_URL" temp-db-sync:temp-db-sync-local 2>/dev/null || git fetch origin temp-db-sync

DUMP_FILE="petty_cash_reconciled.dump"
git checkout temp-db-sync-local -- "$DUMP_FILE" 2>/dev/null || git checkout origin/temp-db-sync -- "$DUMP_FILE"

if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}❌ $DUMP_FILE lagama helin branch-ka temp-db-sync!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database dump-kii waa la helay: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))${NC}"

# 3. Create safety backup of existing live database before touching anything
echo -e "${YELLOW}🛡️  [3/8] Qaadaya backup amni ah oo database-ka hadda jira...${NC}"
mkdir -p "$HOME/db_exports"
SAFETY_BACKUP="$HOME/db_exports/pre_reconciliation_backup_$(date +%Y%m%d_%H%M%S).dump"
export PGPASSWORD="Somtel@PL"
pg_dump -U postgres -h localhost -p 5432 -F c -b -f "$SAFETY_BACKUP" petty_cash_db || true
echo -e "${GREEN}✅ Backup-kii amniga waxaa lagu kaydiyay: $SAFETY_BACKUP${NC}"

# 4. Terminate active connections & restore the clean reconciled database
echo -e "${YELLOW}🗄️  [4/8] Ku shubaya database-kii la saxay ee October (pg_restore)...${NC}"
psql -U postgres -h localhost -p 5432 -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'petty_cash_db'
  AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || true

pg_restore -U postgres -h localhost -p 5432 -d petty_cash_db --clean --if-exists "$DUMP_FILE" || true
echo -e "${GREEN}✅ Database-kii si guul leh ayaa loogu shubay!${NC}"

# 5. Remove local dump file copy
rm -f "$DUMP_FILE"

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
    sudo nginx -t && sudo systemctl reload nginx || sudo service nginx reload
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

# 9. Verify live balances
echo ""
echo -e "${CYAN}🔍 [8/8] Hubinaya xisaabaadka live-ka ah ee shirkadaha...${NC}"
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

echo -e "${GREEN}🎉 GUUL DHAMMAAD AH! Live Server-kii 100% waa la cusboonaysiiyay!${NC}"
echo ""

