#!/usr/bin/env python3
"""Export scanner.db to JSON for GitHub dashboard"""
import sqlite3
import json
from datetime import datetime

# Connect to DB
conn = sqlite3.connect('scanner.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Export all coins
cursor.execute("SELECT * FROM coins ORDER BY score DESC")
coins = [dict(row) for row in cursor.fetchall()]

# Export to JSON
output = {
    'updated_at': datetime.utcnow().isoformat() + 'Z',
    'total_coins': len(coins),
    'coins': coins
}

with open('scanner-export.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"✅ Exported {len(coins)} coins to scanner-export.json")

conn.close()
