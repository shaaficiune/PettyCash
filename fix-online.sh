#!/bin/bash
# ============================================================
#  PETTY CASH — INSTANT SERVER DIAGNOSTIC & RESCUE SCRIPT
#  Usage: bash fix-online.sh [optional_admin_password]
# ============================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "=============================================="
echo "🔍 1. CHECKING PM2 STATUS"
echo "=============================================="
pm2 status

echo ""
echo "=============================================="
echo "🔍 2. CHECKING RECENT BACKEND LOGS"
echo "=============================================="
pm2 logs petty-cash-backend --lines 25 --nostream || true

echo ""
echo "=============================================="
echo "🔧 3. ENSURING VALID JWT SECRETS IN .ENV"
echo "=============================================="
cd "$APP_DIR/backend"
node scripts/ensure-jwt-secrets.js

echo ""
echo "=============================================="
echo "🔧 4. UNLOCKING ADMIN ACCOUNT"
echo "=============================================="
ADMIN_PASS="${1:-Admin@123456}"
node scripts/reset-admin-password.js "$ADMIN_PASS"

echo ""
echo "=============================================="
echo "⚡ 5. RESTARTING PM2 WITH UPDATED ENVIRONMENT"
echo "=============================================="
cd "$APP_DIR"
pm2 restart petty-cash-backend --update-env
pm2 save

sleep 3

echo ""
echo "=============================================="
echo "🌐 6. TESTING BACKEND HTTP RESPONSE"
echo "=============================================="
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PASS\"}" || true

echo ""
echo ""
echo "=============================================="
echo "✅ DIAGNOSIS & RECOVERY FINISHED!"
echo "If curl above returned accessToken, login is 100% FIXED!"
echo "Admin password is set to: $ADMIN_PASS"
echo "=============================================="
