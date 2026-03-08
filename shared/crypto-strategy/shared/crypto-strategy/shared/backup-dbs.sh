#!/bin/bash
# K2: Daily Auto-Backup for critical DBs
BACKUP_DIR="/Users/milo/.openclaw/workspace/shared/backups"
DATE=$(date +%Y-%m-%d)
ERRORS=""
mkdir -p "$BACKUP_DIR"

for db in portfolio.db bilanz.db; do
  src="/Users/milo/.openclaw/workspace/shared/$db"
  if [ -f "$src" ]; then
    cp "$src" "$BACKUP_DIR/${db%.db}-$DATE.db" || ERRORS="$ERRORS $db"
  else
    ERRORS="$ERRORS $db(missing)"
  fi
done

# scanner.db in crypto-strategy
src="/Users/milo/.openclaw/workspace/shared/crypto-strategy/scanner.db"
if [ -f "$src" ]; then
  cp "$src" "$BACKUP_DIR/scanner-$DATE.db" || ERRORS="$ERRORS scanner.db"
fi

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete

if [ -n "$ERRORS" ]; then
  echo "❌ Backup FAILED for:$ERRORS ($DATE)"
  exit 1
else
  echo "✅ Backup done: $DATE ($(ls $BACKUP_DIR/*.db 2>/dev/null | wc -l) files)"
fi
