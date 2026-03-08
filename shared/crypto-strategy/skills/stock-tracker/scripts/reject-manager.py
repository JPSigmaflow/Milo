#!/usr/bin/env python3
"""Manage rejected stocks: move from watchlist to rejected and back."""
import sqlite3, sys

DB = "/Users/milo/.openclaw/workspace/shared/stocks.db"

def demote(ticker, reason="Score < 6"):
    """Move from watchlist to rejected."""
    conn = sqlite3.connect(DB)
    row = conn.execute("SELECT * FROM watchlist WHERE ticker = ?", (ticker,)).fetchone()
    if not row:
        conn.close()
        return f"NOT_FOUND:{ticker}"
    cols = [d[0] for d in conn.execute("SELECT * FROM watchlist LIMIT 0").description]
    d = dict(zip(cols, row))
    
    conn.execute("""
        INSERT OR REPLACE INTO rejected (ticker, company, sector, country, market_cap, last_price, last_price_date,
        overall_score, overall_reasoning, category, thesis, risk_factors, catalyst, research_source, research_date,
        perplexity_url, rejected_reason, alert_base_price)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (d['ticker'], d.get('company'), d.get('sector'), d.get('country'), d.get('market_cap'),
          d.get('last_price'), d.get('last_price_date'), d.get('overall_score'), d.get('overall_reasoning'),
          d.get('category'), d.get('thesis'), d.get('risk_factors'), d.get('catalyst'),
          d.get('research_source'), d.get('research_date'), d.get('perplexity_url'),
          reason, d.get('last_price')))
    
    conn.execute("DELETE FROM watchlist WHERE ticker = ?", (ticker,))
    conn.commit()
    conn.close()
    return f"DEMOTED:{ticker}"

def reinstate(ticker):
    """Move from rejected back to watchlist."""
    conn = sqlite3.connect(DB)
    row = conn.execute("SELECT * FROM rejected WHERE ticker = ?", (ticker,)).fetchone()
    if not row:
        conn.close()
        return f"NOT_FOUND:{ticker}"
    cols = [d[0] for d in conn.execute("SELECT * FROM rejected LIMIT 0").description]
    d = dict(zip(cols, row))
    
    conn.execute("""
        INSERT OR REPLACE INTO watchlist (ticker, company, sector, country, market_cap, last_price, last_price_date,
        overall_score, overall_reasoning, category, thesis, risk_factors, catalyst, research_source, research_date,
        perplexity_url, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'listed')
    """, (d['ticker'], d.get('company'), d.get('sector'), d.get('country'), d.get('market_cap'),
          d.get('last_price'), d.get('last_price_date'), d.get('overall_score'), d.get('overall_reasoning'),
          d.get('category'), d.get('thesis'), d.get('risk_factors'), d.get('catalyst'),
          d.get('research_source'), d.get('research_date'), d.get('perplexity_url')))
    
    conn.execute("DELETE FROM rejected WHERE ticker = ?", (ticker,))
    conn.commit()
    conn.close()
    return f"REINSTATED:{ticker}"

def auto_demote():
    """Auto-demote all watchlist stocks with score < 40 (0-100 system)."""
    conn = sqlite3.connect(DB)
    rows = conn.execute("SELECT ticker FROM watchlist WHERE overall_score IS NOT NULL AND overall_score < 40 AND ticker IS NOT NULL AND ticker != ''").fetchall()
    conn.close()
    results = []
    for (ticker,) in rows:
        results.append(demote(ticker, "Auto-Demote: Score < 40"))
    return results

def check_alerts():
    """Check rejected stocks for +10% price increase from base."""
    conn = sqlite3.connect(DB)
    rows = conn.execute("""
        SELECT r.ticker, r.alert_base_price, r.alert_threshold, r.company,
               (SELECT ph.close FROM price_history ph WHERE ph.ticker = r.ticker ORDER BY ph.date DESC LIMIT 1) as current_price
        FROM rejected r WHERE r.alert_triggered = 0 AND r.alert_base_price IS NOT NULL
    """).fetchall()
    conn.close()
    
    alerts = []
    for ticker, base, threshold, company, current in rows:
        if current and base and base > 0:
            change = ((current - base) / base) * 100
            if change >= (threshold or 10):
                alerts.append({"ticker": ticker, "company": company, "base": base, "current": current, "change": round(change, 1)})
                conn = sqlite3.connect(DB)
                conn.execute("UPDATE rejected SET alert_triggered = 1 WHERE ticker = ?", (ticker,))
                conn.commit()
                conn.close()
    return alerts

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Commands: demote <ticker> [reason], reinstate <ticker>, auto-demote, check-alerts, list")
        sys.exit(1)
    
    cmd = sys.argv[1]
    if cmd == "demote":
        reason = sys.argv[3] if len(sys.argv) > 3 else "Score < 6"
        print(demote(sys.argv[2], reason))
    elif cmd == "reinstate":
        print(reinstate(sys.argv[2]))
    elif cmd == "auto-demote":
        for r in auto_demote():
            print(r)
    elif cmd == "check-alerts":
        alerts = check_alerts()
        for a in alerts:
            print(f"ALERT:{a['ticker']} {a['company']} +{a['change']}% (${a['base']:.2f} → ${a['current']:.2f})")
        if not alerts:
            print("NO_ALERTS")
    elif cmd == "list":
        conn = sqlite3.connect(DB)
        rows = conn.execute("SELECT ticker, company, overall_score, alert_base_price, rejected_date, rejected_reason FROM rejected ORDER BY ticker").fetchall()
        conn.close()
        for r in rows:
            print(f"{r[0]} | {r[1]} | Score {r[2]} | Base ${r[3]} | {r[4]} | {r[5]}")
    else:
        print(f"Unknown command: {cmd}")
