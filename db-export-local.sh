#!/bin/bash
# =============================================================================
# 📦 PETTY CASH — DATABASE EXPORT SCRIPT (READ-ONLY, NO DATA DELETED)
# =============================================================================
# Ujeeddo:  Database-ka live-ka ka soo qaado si nabdoon (READ-ONLY)
# Server:   Ubuntu (VirtualBox) — ~/app
# Database: petty_cash_db (user: petty_user)
# Output:   ~/db_exports/ folder
#
# ⚠️  Script-kani WAXBA KA TIRAYNAYAA database-ka — akhris kaliya.
# ⚠️  Faylka soo baxaya WELIGAA GitHub main-ka ku ma dalin.
# =============================================================================

set -e  # Khalad yar hadduu jiro jooji isla markiiba

# ─── MIDABADA FARRIIMAHA ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║       📦 PETTY CASH — DATABASE EXPORT (READ-ONLY)            ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── STEP 1: .env ka akhri DATABASE_URL ───────────────────────────────────
echo -e "${BLUE}[1/6]${NC} backend/.env ka waxaan akhrinaynaa database xogta..."

ENV_FILE="$HOME/app/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ KHALAD: backend/.env lama helin: $ENV_FILE${NC}"
    echo "     Hubi in aad ku jirto server-ka sax ah: ~/app"
    exit 1
fi

DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ KHALAD: DATABASE_URL lama helin .env file-ka${NC}"
    exit 1
fi

# URL-ka ka saar qaybaheeda
DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\///' | sed 's/?.*//')
DB_USER=$(echo "$DATABASE_URL" | sed 's/.*:\/\///' | sed 's/:.*//')
DB_HOST=$(echo "$DATABASE_URL" | sed 's/.*@//' | sed 's/:.*//' | sed 's/\/.*//')
DB_PORT=$(echo "$DATABASE_URL" | sed 's/.*@[^:]*://' | sed 's/\/.*//')
DB_PASS=$(echo "$DATABASE_URL" | sed 's/.*:\/\/[^:]*://' | sed 's/@.*//')

# Hubi qiyamaha
[ -z "$DB_NAME" ] && DB_NAME="petty_cash_db"
[ -z "$DB_USER" ] && DB_USER="petty_user"
[ -z "$DB_HOST" ] && DB_HOST="localhost"
[ -z "$DB_PORT" ] && DB_PORT="5432"

echo -e "   ${GREEN}✅ Database:${NC} $DB_NAME"
echo -e "   ${GREEN}✅ User:${NC}     $DB_USER"
echo -e "   ${GREEN}✅ Host:${NC}     $DB_HOST:$DB_PORT"
echo ""

# ─── STEP 2: Exports folder samee ─────────────────────────────────────────
echo -e "${BLUE}[2/6]${NC} Export folder diyaariyaya..."

EXPORT_DIR="$HOME/db_exports"
mkdir -p "$EXPORT_DIR"
echo -e "   ${GREEN}✅ Folder:${NC} $EXPORT_DIR"
echo ""

# ─── STEP 3: Database-ka hubi inuu shaqaynayo (READ-ONLY TEST) ────────────
echo -e "${BLUE}[3/6]${NC} Database-ka xiriirka hubi (waxba lama badalayo)..."

PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" \
    -c "SELECT COUNT(*) as total_requests FROM \"PettyCashRequest\";" \
    -t --no-align 2>/dev/null | head -1 | xargs -I{} \
    echo -e "   ${GREEN}✅ Database online — PettyCashRequest rows:${NC} {}"

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  psql test khalad — laakin dump waan isku daynaa...${NC}"
fi
echo ""

# ─── STEP 4: Taariikhda filename-ka ───────────────────────────────────────
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="$EXPORT_DIR/petty_cash_live_${TIMESTAMP}.dump"
SQL_FILE="$EXPORT_DIR/petty_cash_live_${TIMESTAMP}.sql"

# ─── STEP 5: pg_dump — DATABASE KA SOO SAAR (WAXBA LAGAMA TIRAYO) ─────────
echo -e "${BLUE}[4/6]${NC} Database-ka soo saareynaa (read-only dump)..."
echo -e "   ${YELLOW}⏳ Fadlan sug — tani daqiiqad ayay qaadan kartaa...${NC}"
echo ""

# Format custom (compressed, restore-able)
PGPASSWORD="$DB_PASS" pg_dump \
    -U "$DB_USER" \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --no-password \
    --verbose \
    --file="$DUMP_FILE" 2>&1 | grep -E "(table|schema|sequence|dump)" | head -20

echo ""

# Plain SQL backup sidoo kale (akhrintu fudud)
echo -e "${BLUE}[5/6]${NC} Plain SQL backup sidoo kale samaynaynaa..."
PGPASSWORD="$DB_PASS" pg_dump \
    -U "$DB_USER" \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -d "$DB_NAME" \
    --format=plain \
    --no-password \
    --file="$SQL_FILE" 2>/dev/null

# ─── STEP 6: Natiijooyinka muuji ──────────────────────────────────────────
echo ""
echo -e "${BLUE}[6/6]${NC} Natiijooyinka..."
echo ""

if [ -f "$DUMP_FILE" ] && [ -f "$SQL_FILE" ]; then
    DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
    SQL_SIZE=$(du -sh "$SQL_FILE" | cut -f1)

    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║  ✅ DATABASE EXPORT GUULAYSATAY!                              ║${NC}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "   📁 ${BOLD}Custom Dump (restore-able):${NC}"
    echo -e "      $DUMP_FILE"
    echo -e "      Cabbirka: ${CYAN}$DUMP_SIZE${NC}"
    echo ""
    echo -e "   📄 ${BOLD}Plain SQL (akhrin fudud):${NC}"
    echo -e "      $SQL_FILE"
    echo -e "      Cabbirka: ${CYAN}$SQL_SIZE${NC}"
    echo ""
    echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠️  XUSUUSIN: Faylashaas DATABASE-ka SIR AH waxay wataan!${NC}"
    echo -e "${YELLOW}  ❌ WELIGAA GitHub-ka ku ma dalin — local kaliya u heli!${NC}"
    echo -e "${YELLOW}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}  💡 Windows-ka ugu dir:${NC}"
    echo -e "     VirtualBox Shared Folder ama:"
    echo -e "     ${BOLD}cp $DUMP_FILE /media/sf_SharedFolder/${NC}"
    echo ""
else
    echo -e "${RED}❌ KHALAD: Faylka export lama aboori — hubi database connection-ka${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Script dhammaatay — database-ka WAXBA LAGA TIRININ.${NC}"
echo ""

