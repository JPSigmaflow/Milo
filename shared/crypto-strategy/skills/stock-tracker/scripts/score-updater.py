#!/usr/bin/env python3
"""
Score Updater — reads latest overall_score from score_history 
and writes it back to watchlist/holdings.
"""

import sqlite3
import sys

DB_PATH = "/Users/milo/.openclaw/workspace/shared/stocks.db"


def update_latest_scores():
    """Copy latest score from score_history into watchlist + holdings."""
    conn = sqlite3.connect(DB_PATH)
    
    # Update watchlist
    conn.execute("""
        UPDATE watchlist SET 
            overall_score = (
                SELECT sh.overall_score FROM score_history sh 
                WHERE sh.ticker = watchlist.ticker 
                ORDER BY sh.date DESC LIMIT 1
            ),
            overall_reasoning = (
                SELECT sh.reasoning FROM score_history sh 
                WHERE sh.ticker = watchlist.ticker 
                ORDER BY sh.date DESC LIMIT 1
            )
        WHERE ticker IN (SELECT DISTINCT ticker FROM score_history)
    """)
    w_count = conn.execute("SELECT changes()").fetchone()[0]
    
    # Update holdings
    conn.execute("""
        UPDATE holdings SET 
            overall_score = (
                SELECT sh.overall_score FROM score_history sh 
                WHERE sh.ticker = holdings.ticker 
                ORDER BY sh.date DESC LIMIT 1
            ),
            overall_reasoning = (
                SELECT sh.reasoning FROM score_history sh 
                WHERE sh.ticker = holdings.ticker 
                ORDER BY sh.date DESC LIMIT 1
            )
        WHERE ticker IN (SELECT DISTINCT ticker FROM score_history)
    """)
    h_count = conn.execute("SELECT changes()").fetchone()[0]
    
    conn.commit()
    conn.close()
    print(f"Updated: {w_count} watchlist, {h_count} holdings")


def get_all_data(ticker):
    """Get all available data for a ticker across all tables."""
    conn = sqlite3.connect(DB_PATH)
    
    # Watchlist info
    w = conn.execute("SELECT company, sector, market_cap, last_price, score, category, thesis, risk_factors, catalyst, research_source FROM watchlist WHERE ticker = ?", (ticker,)).fetchone()
    
    # Recent insights (last 7 days)
    insights = conn.execute("SELECT category, headline, summary FROM insights WHERE ticker = ? ORDER BY date DESC LIMIT 10", (ticker,)).fetchall()
    
    # Price history (last 5 days)
    prices = conn.execute("SELECT date, close, volume FROM price_history WHERE ticker = ? ORDER BY date DESC LIMIT 5", (ticker,)).fetchall()
    
    # Previous scores
    prev_scores = conn.execute("SELECT date, overall_score FROM score_history WHERE ticker = ? ORDER BY date DESC LIMIT 3", (ticker,)).fetchall()
    
    conn.close()
    
    result = {"ticker": ticker}
    if w:
        result["company"] = w[0]
        result["sector"] = w[1]
        result["market_cap"] = w[2]
        result["last_price"] = w[3]
        result["research_score"] = w[4]
        result["category"] = w[5]
        result["thesis"] = w[6]
        result["risk_factors"] = w[7]
        result["catalyst"] = w[8]
        result["research_source"] = w[9]
    result["insights"] = [{"cat": i[0], "headline": i[1], "summary": i[2]} for i in insights]
    result["prices"] = [{"date": p[0], "close": p[1], "vol": p[2]} for p in prices]
    result["prev_scores"] = [{"date": s[0], "score": s[1]} for s in prev_scores]
    
    return result


def list_tickers():
    """List all tickers that need scoring."""
    conn = sqlite3.connect(DB_PATH)
    tickers = conn.execute("SELECT ticker FROM watchlist WHERE ticker IS NOT NULL AND ticker != '' UNION SELECT ticker FROM holdings WHERE ticker IS NOT NULL").fetchall()
    conn.close()
    return [t[0] for t in tickers]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Commands: tickers, data <ticker>, update")
        sys.exit(1)
    
    cmd = sys.argv[1]
    if cmd == "tickers":
        for t in list_tickers():
            print(t)
    elif cmd == "data":
        import json
        print(json.dumps(get_all_data(sys.argv[2]), indent=2, default=str))
    elif cmd == "update":
        update_latest_scores()
    else:
        print(f"Unknown: {cmd}")
