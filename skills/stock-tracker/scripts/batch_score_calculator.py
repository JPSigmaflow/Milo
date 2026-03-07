#!/usr/bin/env python3
"""
Batch Score Calculator - Berechnet Scores für alle Watchlist-Aktien nach SCORING-SYSTEM.md
"""
import sqlite3
import json
import sys
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "stocks.db"

def calculate_score(data):
    """Berechnet Overall Score basierend auf SCORING-SYSTEM.md"""
    
    # Fundamentals (30 Punkte)
    fundamentals = 0
    # KGV vs Branche (8 Punkte) - vereinfacht
    fundamentals += 6  # Default mittlere Bewertung
    
    # Umsatzwachstum (8 Punkte) - aus insights/thesis ableiten
    if data.get('research_score', 0) >= 8:
        fundamentals += 7
    elif data.get('research_score', 0) >= 7:
        fundamentals += 5
    else:
        fundamentals += 3
    
    # Gewinnmarge (7 Punkte)
    fundamentals += 5
    
    # Schulden (7 Punkte)
    fundamentals += 6
    
    # Technicals (25 Punkte)
    technicals = 0
    prices = data.get('prices', [])
    if len(prices) >= 5:
        current = prices[0]['close']
        # 52W-Hoch simulieren (10% über letzter Preis als Proxy)
        high_52w = max([p['close'] for p in prices[:min(30, len(prices))]])
        drop_pct = ((high_52w - current) / high_52w) * 100
        
        if drop_pct < 5:
            technicals += 4  # Nahe ATH
        elif drop_pct < 20:
            technicals += 6  # Leichter Rücksetzer
        elif drop_pct < 40:
            technicals += 8  # Sweet Spot
        else:
            technicals += 3  # Tief gefallen
        
        # Preistrend (9 Punkte)
        trend = (prices[0]['close'] - prices[-1]['close']) / prices[-1]['close'] * 100
        if trend > 5:
            technicals += 8
        elif trend > 0:
            technicals += 6
        else:
            technicals += 3
        
        # Volumen (8 Punkte)
        technicals += 5
    else:
        technicals = 12  # Default bei fehlenden Daten
    
    # Narrativ (20 Punkte)
    narrativ = 0
    research_score = data.get('research_score', 0)
    if research_score:
        narrativ += min(8, int(research_score))  # These-Stärke
    else:
        narrativ += 5
    
    # Analysten (6 Punkte)
    narrativ += 4
    
    # Katalysator (6 Punkte)
    if data.get('catalyst'):
        narrativ += 5
    else:
        narrativ += 2
    
    # Sentiment (15 Punkte)
    sentiment = 0
    insights = data.get('insights', [])
    
    # Upgrades
    has_upgrade = any('upgrade' in str(i).lower() or 'raise' in str(i).lower() for i in insights)
    sentiment += 4 if has_upgrade else 2
    
    # Insider
    has_insider_buy = any('insider' in str(i).lower() and 'buy' in str(i).lower() for i in insights)
    has_insider_sell = any('insider' in str(i).lower() and 'sell' in str(i).lower() for i in insights)
    if has_insider_buy:
        sentiment += 4
    elif has_insider_sell:
        sentiment += 1
    else:
        sentiment += 2
    
    # Social/News
    if len(insights) >= 3:
        sentiment += 4
    elif len(insights) >= 1:
        sentiment += 3
    else:
        sentiment += 1
    
    # Bonus (10 Punkte)
    bonus = 0
    if len(insights) >= 4:
        bonus += 3  # Multi-Katalysator
    else:
        bonus += 1
    
    bonus += 2  # Institutionell (Default)
    bonus += 2  # Sektor-Momentum (Default)
    
    basis_score = fundamentals + technicals + narrativ + sentiment + bonus
    
    # Sternchenfragen prüfen
    star_violations = []
    penalty = 0
    
    # Moderate Violations (-10)
    mc_str = str(data.get('market_cap', ''))
    if 'B' not in mc_str and '$' in mc_str:
        # Small cap ohne klare Größe
        star_violations.append({"level": "moderate", "rule": "MC <$100M möglich", "penalty": -10})
        penalty += 10
    
    final_score = max(0, min(100, basis_score - penalty))
    
    return {
        "fundamentals": fundamentals,
        "technicals": technicals,
        "narrativ": narrativ,
        "sentiment": sentiment,
        "bonus": bonus,
        "basis_score": basis_score,
        "star_violations": star_violations,
        "final_score": final_score
    }

def generate_reasoning(data, score_data):
    """Generiert overall_reasoning (3-4 Sätze, 150-250 Zeichen)"""
    company = data.get('company', data.get('ticker', ''))
    thesis = data.get('thesis', '')
    catalyst = data.get('catalyst', '')
    risk = data.get('risk_factors', '')
    
    # Kürzen und kombinieren
    parts = []
    if thesis:
        parts.append(thesis[:80])
    if catalyst:
        parts.append(catalyst[:60])
    if risk:
        parts.append(f"Risiko: {risk[:50]}")
    
    reasoning = ". ".join(parts)
    return reasoning[:250] if reasoning else f"{company} Bewertung basierend auf verfügbaren Daten."

def generate_explanation(score_data):
    """Generiert score_explanation (200-350 Zeichen)"""
    f = score_data['fundamentals']
    t = score_data['technicals']
    n = score_data['narrativ']
    s = score_data['sentiment']
    b = score_data['bonus']
    basis = score_data['basis_score']
    final = score_data['final_score']
    
    exp = f"📊 Fundamentals ({f}/30), 📈 Technicals ({t}/25), 🧠 Narrativ ({n}/20), 📰 Sentiment ({s}/15), 🎯 Bonus ({b}/10)."
    
    if score_data['star_violations']:
        violations = ", ".join([v['rule'] for v in score_data['star_violations']])
        total_penalty = sum([v['penalty'] for v in score_data['star_violations']])
        exp += f" ⭐ {violations} ({total_penalty}). Basis {basis} → Final {final}."
    else:
        exp += f" Final Score: {final}/100."
    
    return exp

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Alle Ticker holen
    cur.execute("SELECT ticker FROM watchlist ORDER BY ticker")
    tickers = [row[0] for row in cur.fetchall()]
    
    print(f"📊 Berechne Scores für {len(tickers)} Aktien...")
    
    updated = 0
    for ticker in tickers:
        # Daten laden
        cur.execute("""
            SELECT company, sector, market_cap, research_score, thesis, 
                   risk_factors, catalyst, insights
            FROM watchlist WHERE ticker = ?
        """, (ticker,))
        row = cur.fetchone()
        if not row:
            continue
        
        # Preise laden
        cur.execute("""
            SELECT date, close, vol FROM prices 
            WHERE ticker = ? ORDER BY date DESC LIMIT 30
        """, (ticker,))
        prices = [{"date": r[0], "close": r[1], "vol": r[2]} for r in cur.fetchall()]
        
        data = {
            "ticker": ticker,
            "company": row[0],
            "sector": row[1],
            "market_cap": row[2],
            "research_score": row[3],
            "thesis": row[4],
            "risk_factors": row[5],
            "catalyst": row[6],
            "insights": json.loads(row[7]) if row[7] else [],
            "prices": prices
        }
        
        # Score berechnen
        score_data = calculate_score(data)
        reasoning = generate_reasoning(data, score_data)
        explanation = generate_explanation(score_data)
        
        # In DB schreiben
        cur.execute("""
            UPDATE watchlist 
            SET overall_score = ?,
                overall_reasoning = ?,
                score_explanation = ?,
                score_breakdown = ?
            WHERE ticker = ?
        """, (
            score_data['final_score'],
            reasoning,
            explanation,
            json.dumps(score_data),
            ticker
        ))
        
        # Score History
        cur.execute("""
            INSERT OR REPLACE INTO score_history 
            (ticker, date, overall_score, reasoning, score_explanation, components, star_violations)
            VALUES (?, datetime('now'), ?, ?, ?, ?, ?)
        """, (
            ticker,
            score_data['final_score'],
            reasoning,
            explanation,
            json.dumps({
                "fundamentals": score_data['fundamentals'],
                "technicals": score_data['technicals'],
                "narrativ": score_data['narrativ'],
                "sentiment": score_data['sentiment'],
                "bonus": score_data['bonus']
            }),
            json.dumps(score_data['star_violations'])
        ))
        
        updated += 1
        print(f"✅ {ticker}: {score_data['final_score']}/100")
    
    conn.commit()
    conn.close()
    
    print(f"\n✨ {updated} Scores aktualisiert!")

if __name__ == "__main__":
    main()
