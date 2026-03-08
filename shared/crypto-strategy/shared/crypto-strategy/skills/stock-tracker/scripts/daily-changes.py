#!/usr/bin/env python3
"""
Daily Changes Report
Shows 24h price & score changes for all watchlist stocks
"""
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path.home() / ".openclaw/workspace/shared/stocks.db"

def get_24h_changes():
    """Get price & score changes over last 24h"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    now = datetime.now()
    yesterday = now - timedelta(hours=24)
    yesterday_str = yesterday.strftime('%Y-%m-%d')
    
    # Get all watchlist stocks with current data
    stocks = conn.execute("""
        SELECT ticker, company, last_price, score, overall_score, sector
        FROM watchlist
        ORDER BY overall_score DESC NULLS LAST, ticker
    """).fetchall()
    
    results = []
    
    for stock in stocks:
        ticker = stock['ticker']
        current_price = stock['last_price']
        current_overall = stock['overall_score']
        
        # Get 24h ago price
        old_price_row = conn.execute("""
            SELECT close FROM price_history
            WHERE ticker = ? AND date <= ?
            ORDER BY date DESC LIMIT 1
        """, (ticker, yesterday_str)).fetchone()
        
        price_change = None
        price_change_pct = None
        if old_price_row and current_price:
            old_price = old_price_row['close']
            price_change = current_price - old_price
            price_change_pct = (price_change / old_price) * 100
        
        # Get 24h ago score
        old_score_row = conn.execute("""
            SELECT overall_score FROM score_history
            WHERE ticker = ? AND date <= datetime('now', '-1 day')
            ORDER BY date DESC LIMIT 1
        """, (ticker,)).fetchone()
        
        score_change = None
        if old_score_row and current_overall:
            old_score = old_score_row['overall_score']
            score_change = current_overall - old_score
        
        results.append({
            'ticker': ticker,
            'company': stock['company'],
            'sector': stock['sector'],
            'price': current_price,
            'price_change': price_change,
            'price_change_pct': price_change_pct,
            'score': current_overall,
            'score_change': score_change
        })
    
    conn.close()
    return results

def format_change(value, is_percent=False):
    """Format change with color indicators"""
    if value is None:
        return "—"
    
    sign = "📈" if value > 0 else "📉" if value < 0 else "—"
    
    if is_percent:
        return f"{sign} {value:+.1f}%"
    else:
        return f"{sign} {value:+.1f}"

def print_report(changes):
    """Print formatted report"""
    print("\n🔄 STOCK WATCHLIST — 24h Änderungen\n")
    
    # Group by significant changes
    big_movers = [s for s in changes if s['price_change_pct'] and abs(s['price_change_pct']) >= 5]
    score_changes = [s for s in changes if s['score_change'] and s['score_change'] != 0]
    
    if big_movers:
        print("📊 GRÖßTE PREIS-BEWEGUNGEN (±5%+)\n")
        for s in sorted(big_movers, key=lambda x: abs(x['price_change_pct'] or 0), reverse=True):
            price_str = f"${s['price']:.2f}" if s['price'] else "N/A"
            print(f"{s['ticker']:8} {price_str:>10} {format_change(s['price_change_pct'], True):>12}  {s['company'][:40]}")
        print()
    
    if score_changes:
        print("⭐ SCORE-ÄNDERUNGEN\n")
        for s in sorted(score_changes, key=lambda x: abs(x['score_change'] or 0), reverse=True):
            score_str = f"{s['score']:.0f}" if s['score'] else "—"
            print(f"{s['ticker']:8} Score {score_str:>3} {format_change(s['score_change']):>10}  {s['company'][:40]}")
        print()
    
    # Full list summary
    print("📋 ALLE WATCHLIST-STOCKS\n")
    print(f"{'Ticker':<8} {'Preis':>10} {'24h Δ%':>12} {'Score':>6} {'Δ':>6}  Unternehmen")
    print("─" * 90)
    
    for s in changes:
        price_str = f"${s['price']:.2f}" if s['price'] else "N/A"
        score_str = f"{s['score']:.0f}" if s['score'] else "—"
        score_change_str = format_change(s['score_change']).replace("📈", "+").replace("📉", "")
        
        print(f"{s['ticker']:<8} {price_str:>10} {format_change(s['price_change_pct'], True):>12} "
              f"{score_str:>6} {score_change_str:>6}  {s['company'][:40]}")

if __name__ == "__main__":
    changes = get_24h_changes()
    print_report(changes)
