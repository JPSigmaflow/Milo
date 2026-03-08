#!/usr/bin/env python3
"""
Discovery DB Manager — manages the discoveries table in stocks.db.
Used by Deep Research skill to store and promote stock findings.
"""

import sqlite3
import json
import sys
from datetime import datetime

DB_PATH = "/Users/milo/.openclaw/workspace/shared/stocks.db"


def exists(ticker):
    """Check if ticker exists in discoveries, watchlist, or holdings."""
    conn = sqlite3.connect(DB_PATH)
    # Check discoveries
    r1 = conn.execute("SELECT id, status FROM discoveries WHERE ticker = ?", (ticker.upper(),)).fetchone()
    # Check watchlist
    r2 = conn.execute("SELECT id FROM watchlist WHERE ticker = ?", (ticker.upper(),)).fetchone()
    # Check holdings
    r3 = conn.execute("SELECT id FROM holdings WHERE ticker = ?", (ticker.upper(),)).fetchone()
    conn.close()
    
    if r2:
        return f"EXISTS_WATCHLIST"
    if r3:
        return f"EXISTS_HOLDINGS"
    if r1:
        return f"EXISTS_DISCOVERIES:{r1[1]}"
    return "NEW"


def save(ticker, company, sector, country, exchange, market_cap, price, thesis, category, score, risk_factors, catalyst, pe_ratio=None, revenue_growth=None):
    """Save a new discovery."""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("""
            INSERT OR REPLACE INTO discoveries 
            (ticker, company, sector, country, exchange, market_cap, current_price, thesis, category, score, risk_factors, catalyst, pe_ratio, revenue_growth)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (ticker.upper(), company, sector, country, exchange, market_cap, price, thesis, category, score, risk_factors, catalyst, pe_ratio, revenue_growth))
        conn.commit()
        conn.close()
        return "SAVED"
    except Exception as e:
        conn.close()
        return f"ERROR: {e}"


def promote(ticker, target):
    """
    Promote a stock through the pipeline. Each stock exists in ONLY ONE table:
    
    Pipeline: discoveries → watchlist → holdings
    
    - promote TICKER watchlist  → moves from discoveries to watchlist (deletes from discoveries)
    - promote TICKER holding    → moves from watchlist to holdings (deletes from watchlist)
                                  OR from discoveries to holdings (deletes from discoveries)
    - promote TICKER rejected   → deletes from discoveries
    """
    ticker = ticker.upper()
    conn = sqlite3.connect(DB_PATH)
    
    # Find where the stock currently lives
    disc_row = conn.execute("SELECT * FROM discoveries WHERE ticker = ?", (ticker,)).fetchone()
    watch_row = conn.execute("SELECT * FROM watchlist WHERE ticker = ?", (ticker,)).fetchone()
    
    if target == "watchlist":
        if not disc_row:
            conn.close()
            return "NOT_FOUND_IN_DISCOVERIES"
        cols = [d[0] for d in conn.execute("SELECT * FROM discoveries LIMIT 0").description]
        d = dict(zip(cols, disc_row))
        perp_url = f"https://www.perplexity.ai/finance/{d['ticker']}"
        conn.execute("""
            INSERT OR IGNORE INTO watchlist (company, ticker, country, status, sector, notes, market_cap, score, category, thesis, risk_factors, catalyst, research_source, research_date, perplexity_url)
            VALUES (?, ?, ?, 'listed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (d['company'], d['ticker'], d['country'], d['sector'],
              f"Score: {d['score']}/10", d['market_cap'], d['score'], d['category'], d['thesis'], d['risk_factors'], d['catalyst'],
              d.get('research_source', 'deep_research_claude'), d.get('discovered_at', '')[:10], perp_url))
        # DELETE from discoveries
        conn.execute("DELETE FROM discoveries WHERE ticker = ?", (ticker,))
        
    elif target == "holding":
        # Can come from watchlist OR discoveries
        if watch_row:
            cols = [d[0] for d in conn.execute("SELECT * FROM watchlist LIMIT 0").description]
            d = dict(zip(cols, watch_row))
            perp_url = f"https://www.perplexity.ai/finance/{d['ticker']}"
            conn.execute("""
                INSERT OR IGNORE INTO holdings (ticker, shares, avg_price, source, notes, score, research_source, category, thesis, risk_factors, catalyst, research_date, perplexity_url)
                VALUES (?, 0, 0, 'watchlist', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (d['ticker'], d.get('notes', ''), d.get('score'), d.get('research_source'),
                  d.get('category'), d.get('thesis'), d.get('risk_factors'), d.get('catalyst'), d.get('research_date'), perp_url))
            # DELETE from watchlist
            conn.execute("DELETE FROM watchlist WHERE ticker = ?", (ticker,))
        elif disc_row:
            cols = [d[0] for d in conn.execute("SELECT * FROM discoveries LIMIT 0").description]
            d = dict(zip(cols, disc_row))
            conn.execute("""
                INSERT OR IGNORE INTO holdings (ticker, shares, avg_price, source, notes, score, research_source, category, thesis, risk_factors, catalyst, research_date)
                VALUES (?, 0, 0, 'discovery', ?, ?, ?, ?, ?, ?, ?, ?)
            """, (d['ticker'], f"Score: {d['score']}/10", d.get('score'), d.get('research_source', 'deep_research_claude'),
                  d.get('category'), d.get('thesis'), d.get('risk_factors'), d.get('catalyst'), d.get('discovered_at', '')[:10]))
            # DELETE from discoveries
            conn.execute("DELETE FROM discoveries WHERE ticker = ?", (ticker,))
        else:
            conn.close()
            return "NOT_FOUND"
    
    elif target == "rejected":
        conn.execute("DELETE FROM discoveries WHERE ticker = ?", (ticker,))
        conn.execute("DELETE FROM watchlist WHERE ticker = ?", (ticker,))
    
    conn.commit()
    conn.close()
    return f"PROMOTED:{target}"


def list_discoveries(status=None, min_score=None):
    """List discoveries with optional filters."""
    conn = sqlite3.connect(DB_PATH)
    query = "SELECT ticker, company, score, category, status, substr(discovered_at,1,10) as date, thesis FROM discoveries"
    params = []
    conditions = []
    
    if status:
        conditions.append("status = ?")
        params.append(status)
    if min_score:
        conditions.append("score >= ?")
        params.append(float(min_score))
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY score DESC"
    
    rows = conn.execute(query, params).fetchall()
    conn.close()
    
    for r in rows:
        print(f"{r[0]}|{r[1]}|{r[2]}|{r[3]}|{r[4]}|{r[5]}|{r[6][:100]}")


def get_all_known_tickers():
    """Get all tickers across all tables for dedup."""
    conn = sqlite3.connect(DB_PATH)
    tickers = set()
    for table in ['watchlist', 'holdings', 'discoveries']:
        try:
            rows = conn.execute(f"SELECT ticker FROM {table} WHERE ticker IS NOT NULL").fetchall()
            tickers.update(r[0] for r in rows)
        except:
            pass
    conn.close()
    return sorted(tickers)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Commands: exists <ticker>, save <json>, promote <ticker> <watchlist|holding|rejected>, list [status] [min_score], known")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "exists":
        print(exists(sys.argv[2]))
    
    elif cmd == "save":
        data = json.loads(sys.argv[2])
        print(save(**data))
    
    elif cmd == "promote":
        print(promote(sys.argv[2], sys.argv[3]))
    
    elif cmd == "list":
        status = sys.argv[2] if len(sys.argv) > 2 else None
        min_score = sys.argv[3] if len(sys.argv) > 3 else None
        list_discoveries(status, min_score)
    
    elif cmd == "known":
        tickers = get_all_known_tickers()
        print(",".join(tickers))
    
    else:
        print(f"Unknown command: {cmd}")
