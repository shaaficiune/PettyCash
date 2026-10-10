#!/usr/bin/env bash
# =============================================================================
# backup-to-r2.sh — Petty Cash App: Automated PostgreSQL → Cloudflare R2 Backup
# =============================================================================
# Usage:
#   bash ~/app/backup-to-r2.sh
#
# Schedule via crontab (every 6 hours):
#   0 */6 * * * /bin/bash /home/<YOUR_USER>/app/backup-to-r2.sh >> /home/<YOUR_USER>/app/logs/backup.log 2>&1
#
# Requirements:
#   - rclone installed and configured (run: rclone config → name it "r2")
#   - pg_dump available (installed with PostgreSQL)
# =============================================================================

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

APP_DIR="$HOME/app"
BACKUP_DIR="$HOME/backups/petty-cash"
LOG_DIR="$APP_DIR/logs"

# PostgreSQL credentials auto-loaded from backend/.env
ENV_FILE="$APP_DIR/backend/.env"

# rclone remote name (as set during: rclone config)
RCLONE_REMOTE="r2"
R2_BUCKET="petty-cash-backups"
R2_PATH="$RCLONE_REMOTE:$R2_BUCKET"

# Retention policy
LOCAL_RETAIN_DAYS=3
R2_RETAIN_DAYS=30

# ─────────────────────────────────────────────────────────────────────────────
# 2. SETUP
# ─────────────────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR" "$LOG_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="petty_cash_db_${TIMESTAMP}.sql.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

echo ""
echo "======================================================================"
echo "  Petty Cash DB Backup — $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "======================================================================"

# ─────────────────────────────────────────────────────────────────────────────
# 3. READ DATABASE CREDENTIALS FROM .env
# ─────────────────────────────────────────────────────────────────────────────

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] .env file not found at $ENV_FILE"
  exit 1
fi

DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [[ -z "$DATABASE_URL" ]]; then
  echo "[ERROR] DATABASE_URL not found in $ENV_FILE"
  exit 1
fi

# Parse postgresql://user:password@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')

echo "[INFO] Database : $DB_NAME @ $DB_HOST:$DB_PORT (user: $DB_USER)"
echo "[INFO] Output   : $BACKUP_PATH"

# ─────────────────────────────────────────────────────────────────────────────
# 4. DUMP & COMPRESS
# ─────────────────────────────────────────────────────────────────────────────

echo "[INFO] Running pg_dump..."

PGPASSWORD="$DB_PASS" pg_dump \
  -U "$DB_USER" \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  --no-password \
  --format=plain \
  --clean \
  --if-exists \
  "$DB_NAME" | gzip > "$BACKUP_PATH"

BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo "[OK]   Dump complete — compressed size: $BACKUP_SIZE"

# ─────────────────────────────────────────────────────────────────────────────
# 5. UPLOAD TO CLOUDFLARE R2
# ─────────────────────────────────────────────────────────────────────────────

if ! command -v rclone &> /dev/null; then
  echo "[ERROR] rclone is not installed."
  echo "        Install: sudo apt install rclone -y"
  echo "        Then configure: rclone config  (name the remote 'r2')"
  exit 1
fi

echo "[INFO] Uploading to Cloudflare R2 ($R2_PATH)..."

rclone copy "$BACKUP_PATH" "$R2_PATH" \
  --progress \
  --stats-one-line \
  --retries 3 \
  --low-level-retries 5

echo "[OK]   Upload complete → $R2_PATH/$BACKUP_FILENAME"

# ─────────────────────────────────────────────────────────────────────────────
# 6. CLEAN UP — LOCAL
# ─────────────────────────────────────────────────────────────────────────────

echo "[INFO] Removing local backups older than $LOCAL_RETAIN_DAYS days..."
find "$BACKUP_DIR" -name "petty_cash_db_*.sql.gz" -mtime +$LOCAL_RETAIN_DAYS -delete
LOCAL_COUNT=$(ls -1 "$BACKUP_DIR"/petty_cash_db_*.sql.gz 2>/dev/null | wc -l)
echo "[OK]   Local backups retained: $LOCAL_COUNT file(s)"

# ─────────────────────────────────────────────────────────────────────────────
# 7. CLEAN UP — R2
# ─────────────────────────────────────────────────────────────────────────────

echo "[INFO] Removing R2 backups older than $R2_RETAIN_DAYS days..."

rclone delete "$R2_PATH" \
  --min-age "${R2_RETAIN_DAYS}d" \
  --include "petty_cash_db_*.sql.gz" \
  2>/dev/null && echo "[OK]   Old R2 backups pruned." || echo "[WARN] R2 pruning: no old files found."

# ─────────────────────────────────────────────────────────────────────────────
# 8. SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "----------------------------------------------------------------------"
echo "  BACKUP SUCCESSFUL"
echo "     File    : $BACKUP_FILENAME"
echo "     Size    : $BACKUP_SIZE"
echo "     Local   : $BACKUP_PATH"
echo "     Remote  : $R2_PATH/$BACKUP_FILENAME"
echo "     Time    : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "----------------------------------------------------------------------"
echo ""
