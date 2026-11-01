#!/bin/bash
# =============================================================================
# 🚀 PUSH LATEST DB SNAPSHOT TO TEMP GITHUB BRANCH
# =============================================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🔍 Raadinayaa dump-kii ugu dambeeyay...${NC}"

LATEST_DUMP=$(ls -t $HOME/db_exports/*.dump 2>/dev/null | head -1)

if [ -z "$LATEST_DUMP" ]; then
    echo -e "${RED}❌ Wax dump ah lagama helin $HOME/db_exports/${NC}"
    exit 1
fi

FILENAME=$(basename "$LATEST_DUMP")
echo -e "${GREEN}✅ Waxaa la helay: $FILENAME${NC}"

# Hubi branch-ka hadda
git checkout main 2>/dev/null || true

# Abuur ama u wareeg branch-ka kumeelgaarka ah
echo -e "${CYAN}🌿 Abuuraya branch-ka temp-db-sync...${NC}"
git checkout -B temp-db-sync

# Nuqul ka soo qaad dump-ka
cp "$LATEST_DUMP" "./$FILENAME"

# Force add maadaama *.dump uu ku jiro .gitignore
git add -f "./$FILENAME"
git commit -m "temp: export db snapshot $FILENAME"

echo -e "${CYAN}⬆️ U diraya GitHub (temp-db-sync)...${NC}"
git push origin temp-db-sync --force

# Dib ugu laabo main oo ka tirtir nuqulka local-ka ah
git checkout main
rm -f "./$FILENAME"

echo ""
echo -e "${GREEN}🎉 GUUL! Faylkii wuxuu u baxay branch-ka: temp-db-sync${NC}"
echo -e "${CYAN}Hadda Windows-ka ka dhih 'bash pull-db-snapshot.ps1'${NC}"

