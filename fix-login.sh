#!/bin/bash
# fix-login.sh — Diagnose & fix login issues on production server
# Run this on the Ubuntu server:
#   bash fix-login.sh

set -e

# ── Auto-detect app directory ─────────────────────────────
SEARCH_DIRS=(
  "/var/www/pettycash"
  "/home/$USER/pettycash"
  "/home/$USER/PettyCash"
  "/root/pettycash"
  "/root/PettyCash"
  "/opt/pettycash"
  "$HOME/pettycash"
  "$HOME/PettyCash"
)

APP_DIR=""
for DIR in "${SEARCH_DIRS[@]}"; do
  if [ -f "$DIR/backend/package.json" ]; then
    APP_DIR="$DIR"
    break
  fi
done

# Fallback: search entire filesystem (slower)
if [ -z "$APP_DIR" ]; then
  echo "  Searching for app directory..."
  FOUND=$(find /home /root /opt /srv -maxdepth 4 -name "package.json" -path "*/backend/package.json" 2>/dev/null | head -1)
  if [ -n "$FOUND" ]; then
    APP_DIR=$(dirname "$(dirname "$FOUND")")
  fi
fi

if [ -z "$APP_DIR" ]; then
  echo "  ERROR: Could not find pettycash app directory!"
  echo "  Please run this script from inside the app folder, e.g.:"
  echo "    cd /path/to/your/app && bash fix-login.sh"
  # Try using current directory as fallback
  if [ -f "./backend/package.json" ]; then
    APP_DIR="$(pwd)"
    echo "  Using current directory: $APP_DIR"
  else
    exit 1
  fi
fi

BACKEND_DIR="$APP_DIR/backend"
echo "  App found at: $APP_DIR"

echo "======================================================"
echo "  PettyCash Login Diagnostic & Fix Script"
echo "======================================================"

# ── 1. Check if .env exists ───────────────────────────────
echo ""
echo "[1/5] Checking .env file..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "  ERROR: .env file not found at $BACKEND_DIR/.env"
  echo "  Creating a default .env — PLEASE update the DB password!"
  cat > "$BACKEND_DIR/.env" << 'ENV'
NODE_ENV=production
DATABASE_URL="postgresql://pettycash:PettyCash@2026!@localhost:5432/pettycash_db"
JWT_SECRET=somtel_bluekom_petty_cash_secret_key_2026_jwt
JWT_REFRESH_SECRET=somtel_bluekom_petty_cash_refresh_secret_key_2026_jwt
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
PORT=3000
ALLOWED_ORIGINS=*
ENV
  echo "  .env created. Edit DATABASE_URL if your DB password differs."
else
  echo "  OK: .env found."
  echo "  DATABASE_URL = $(grep DATABASE_URL "$BACKEND_DIR/.env" | head -1)"
fi

# ── 2. Check PM2 app status ───────────────────────────────
echo ""
echo "[2/5] Checking PM2 status..."
pm2 status || true

# ── 3. Check DB connection & user count ───────────────────
echo ""
echo "[3/5] Checking database users..."
DB_URL=$(grep DATABASE_URL "$BACKEND_DIR/.env" | cut -d'"' -f2)

DB_USER=$(echo "$DB_URL" | sed -E 's|postgresql://([^:]+):.*|\1|')
DB_PASS=$(echo "$DB_URL" | sed -E 's|postgresql://[^:]+:([^@]+)@.*|\1|')
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:]+):.*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')

echo "  Connecting to DB: $DB_NAME at $DB_HOST:$DB_PORT as $DB_USER"

USER_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc 'SELECT COUNT(*) FROM "User";' 2>&1 || echo "ERROR")

if echo "$USER_COUNT" | grep -q "ERROR\|error\|FATAL"; then
  echo "  ERROR: Cannot connect to DB or table missing."
  echo "  Output: $USER_COUNT"
  echo ""
  echo "  Trying to run prisma db push to create tables..."
  cd "$BACKEND_DIR" && npx prisma db push --accept-data-loss
else
  echo "  Users in DB: $USER_COUNT"
fi

# ── 4. Re-seed if no users exist ──────────────────────────
echo ""
echo "[4/5] Seeding database if needed..."
FRESH_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc 'SELECT COUNT(*) FROM "User";' 2>/dev/null || echo "0")
FRESH_COUNT=$(echo "$FRESH_COUNT" | tr -d '[:space:]')

if [ "$FRESH_COUNT" = "0" ] || [ -z "$FRESH_COUNT" ]; then
  echo "  No users found — running seed..."
  cd "$BACKEND_DIR" && npx ts-node prisma/seed.ts
  echo "  Seed complete!"
else
  echo "  $FRESH_COUNT user(s) already in DB."
  echo ""
  echo "  Listing existing usernames & statuses:"
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c 'SELECT username, status, "resetPasswordRequired" FROM "User" ORDER BY username;' 2>&1 || true
fi

# ── 5. Force-reset seed user passwords ────────────────────
echo ""
echo "[5/5] Force-resetting seed user passwords to Welcome@2026..."
cd "$BACKEND_DIR"

node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetPasswords() {
  const hash = bcrypt.hashSync('Welcome@2026', 10);
  const users = ['admin', 'accountant', 'employee', 'employee_bk'];
  for (const username of users) {
    try {
      await prisma.user.update({
        where: { username },
        data: { passwordHash: hash, status: 'ACTIVE', resetPasswordRequired: true }
      });
      console.log('  Reset OK:', username);
    } catch(e) {
      console.log('  Skip (not found):', username);
    }
  }
  await prisma.\$disconnect();
}
resetPasswords().catch(e => { console.error(e); process.exit(1); });
" 2>&1

echo ""
echo "======================================================"
echo "  DONE! Try logging in with:"
echo ""
echo "  Username : admin        Password : Welcome@2026"
echo "  Username : accountant   Password : Welcome@2026"
echo "  Username : employee     Password : Welcome@2026"
echo ""
echo "  NOTE: You will be prompted to change password on first login."
echo "======================================================"

# Restart backend
echo ""
echo "  Restarting backend via PM2..."
pm2 restart pettycash-backend 2>/dev/null || pm2 restart all 2>/dev/null || true
pm2 status
