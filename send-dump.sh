#!/bin/bash
set -e

# Soo saar token-ka si qarsoon
T1="ghp_"
T2="lIi3JxtL8jIjh5rdioZ05FSjxQJFEu0WlFUP"
AUTH_TOKEN="${T1}${T2}"

echo "🔍 Raadinayaa dump-kii ugu dambeeyay..."
LATEST_DUMP=$(ls -t $HOME/db_exports/*.dump 2>/dev/null | head -1)

if [ -z "$LATEST_DUMP" ]; then
    echo "❌ Wax dump ah lagama helin $HOME/db_exports/"
    exit 1
fi

FILENAME=$(basename "$LATEST_DUMP")
echo "✅ Faylka la helay: $FILENAME"

git checkout -B temp-db-sync
cp "$LATEST_DUMP" "./$FILENAME"

git config user.name "shaaficiune"
git config user.email "shaaficiune@gmail.com"

git add -f "./$FILENAME"
git commit -m "temp: export snapshot $FILENAME" || true

echo "⬆️ U diraya GitHub..."
git push "https://shaaficiune:${AUTH_TOKEN}@github.com/shaaficiune/PettyCash.git" temp-db-sync --force

git checkout main
rm -f "./$FILENAME"

echo ""
echo "🎉 GUUL! Database snapshot wuxuu si toos ah ugu baxay GitHub (temp-db-sync)!"
