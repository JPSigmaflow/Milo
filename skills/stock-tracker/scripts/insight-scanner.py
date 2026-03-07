#!/usr/bin/env python3
"""
Insight Scanner — Fetches latest insights for watchlist stocks via Perplexity AI.
Uses browser automation, not API. Run via cron as isolated agentTurn.

Usage (by AI agent, not direct execution):
  1. For each ticker in watchlist, open Perplexity Finance page in browser
  2. Extract key insights (analyst ratings, news, catalysts)
  3. Hash and store only NEW insights in stocks.db insights table
  4. Report new insights to Alpha Stocks group

This script handles DB operations only. Browser scraping is done by the AI agent.
"""

import sqlite3
import hashlib
import json
import sys
from datetime import datetime

DB_PATH = "/Users/milo/.openclaw/workspace/shared/stocks.db"

def get_watchlist_tickers():
    """Get all tickers from watchlist that are listed."""
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT ticker, company FROM watchlist WHERE ticker IS NOT NULL AND ticker != '' AND status = 'listed'"
    ).fetchall()
    conn.close()
    return rows

def make_hash(ticker, headline):
    """Create hash from ticker + headline for dedup."""
    content = f"{ticker}:{headline}".lower().strip()
    return hashlib.md5(content.encode()).hexdigest()

def insight_exists(ticker, headline):
    """Check if this insight already exists."""
    h = make_hash(ticker, headline)
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT id FROM insights WHERE ticker = ? AND hash = ?", (ticker, h)).fetchone()
    conn.close()
    return row is not None

def save_insight(ticker, source, category, headline, summary):
    """Save a new insight. Returns True if new, False if duplicate."""
    h = make_hash(ticker, headline)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            "INSERT INTO insights (ticker, source, category, headline, summary, hash) VALUES (?, ?, ?, ?, ?, ?)",
            (ticker, source, category, headline, summary, h)
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

def get_recent_insights(ticker=None, days=7):
    """Get recent insights, optionally filtered by ticker."""
    conn = sqlite3.connect(DB_PATH)
    if ticker:
        rows = conn.execute(
            "SELECT ticker, date, source, category, headline, summary FROM insights WHERE ticker = ? AND date >= datetime('now', ?) ORDER BY date DESC",
            (ticker, f'-{days} days')
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT ticker, date, source, category, headline, summary FROM insights WHERE date >= datetime('now', ?) ORDER BY date DESC",
            (f'-{days} days',)
        ).fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Commands: tickers, check <ticker> <headline>, save <ticker> <source> <category> <headline> <summary>, recent [ticker]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "tickers":
        for ticker, company in get_watchlist_tickers():
            print(f"{ticker}\t{company}")
    
    elif cmd == "check" and len(sys.argv) >= 4:
        ticker = sys.argv[2]
        headline = sys.argv[3]
        exists = insight_exists(ticker, headline)
        print("EXISTS" if exists else "NEW")
    
    elif cmd == "save" and len(sys.argv) >= 7:
        ticker = sys.argv[2]
        source = sys.argv[3]
        category = sys.argv[4]
        headline = sys.argv[5]
        summary = sys.argv[6]
        is_new = save_insight(ticker, source, category, headline, summary)
        print("SAVED" if is_new else "DUPLICATE")
    
    elif cmd == "recent":
        ticker = sys.argv[2] if len(sys.argv) > 2 else None
        for row in get_recent_insights(ticker):
            print(f"[{row[1]}] {row[0]} ({row[3]}): {row[4]}")
            if row[5]:
                print(f"  → {row[5]}")
    
    else:
        print("Unknown command")
