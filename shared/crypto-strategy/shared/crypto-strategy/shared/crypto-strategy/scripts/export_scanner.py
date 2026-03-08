#!/usr/bin/env python3
"""Export scanner.db to JSON for GitHub dashboard"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "scanner.db"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "scanner-export.json"

def export_scanner():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            symbol, name, address, chain, narrative,
            market_cap, liquidity, volume_24h, score,
            result, reason, source, scanned_at, updated_at
        FROM coins
        ORDER BY score DESC, scanned_at DESC
    """)
    
    coins = []
    for row in cursor:
        coins.append({
            "symbol": row["symbol"],
            "name": row["name"],
            "address": row["address"],
            "chain": row["chain"],
            "narrative": row["narrative"],
            "market_cap": row["market_cap"],
            "liquidity": row["liquidity"],
            "volume_24h": row["volume_24h"],
            "score": row["score"],
            "result": row["result"],
            "reason": row["reason"],
            "source": row["source"],
            "scanned_at": row["scanned_at"],
            "updated_at": row["updated_at"]
        })
    
    export_data = {
        "exported_at": datetime.now().isoformat(),
        "total_coins": len(coins),
        "coins": coins
    }
    
    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(export_data, f, indent=2)
    
    print(f"✓ Exported {len(coins)} coins to {OUTPUT_PATH}")
    conn.close()

if __name__ == "__main__":
    export_scanner()
