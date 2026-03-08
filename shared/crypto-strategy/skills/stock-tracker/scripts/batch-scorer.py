#!/usr/bin/env python3
"""
Batch Scoring Script - Bewertet alle Aktien systematisch nach dem 5-Kategorien-System
"""

import json
import sys
import sqlite3
from datetime import datetime
from pathlib import Path

# DB-Pfad
DB_PATH = Path(__file__).parent.parent / "stocks.db"

def get_all_tickers():
    """Holt alle Ticker aus der Watchlist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT ticker FROM watchlist ORDER BY ticker")
    tickers = [row[0] for row in cursor.fetchall()]
    conn.close()
    return tickers

def calculate_score(ticker_data):
    """
    Berechnet den Overall Score basierend auf Fundamentals, Technicals, Narrativ, Sentiment, Bonus
    
    Rückgabe: dict mit score, breakdown, reasoning, explanation, star_violations
    """
    
    # Basis-Daten extrahieren
    price = ticker_data.get('last_price', 0)
    prices = ticker_data.get('prices', [])
    insights = ticker_data.get('insights', [])
    research_score = ticker_data.get('research_score')
    thesis = ticker_data.get('thesis', '')
    catalyst = ticker_data.get('catalyst', '')
    
    # Score-Komponenten initialisieren
    fundamentals = 0  # Max 30
    technicals = 0    # Max 25
    narrativ = 0      # Max 20
    sentiment = 0     # Max 15
    bonus = 0         # Max 10
    
    star_violations = []
    
    # === FUNDAMENTALS (30 Punkte) ===
    # Basierend auf research_score, thesis quality, market_cap
    if research_score:
        fundamentals = int(research_score * 3.5)  # 8.5 * 3.5 = ~30
    else:
        fundamentals = 15  # Default falls keine Research-Score
    
    # === TECHNICALS (25 Punkte) ===
    if len(prices) >= 2:
        current_price = prices[0]['close']
        week_ago_price = prices[-1]['close'] if len(prices) > 4 else prices[-1]['close']
        
        # Momentum-Check
        momentum = (current_price - week_ago_price) / week_ago_price
        if momentum > 0.05:
            technicals += 10
        elif momentum > 0:
            technicals += 7
        elif momentum > -0.05:
            technicals += 4
        else:
            technicals += 2
            
        # Volatilität
        technicals += 8  # Basis-Punkte für Liquidität
        
        # Volumen-Trend
        if len(prices) >= 2 and prices[0].get('vol') and prices[1].get('vol'):
            vol_ratio = prices[0]['vol'] / prices[1]['vol']
            if vol_ratio > 1.2:
                technicals += 7
            else:
                technicals += 5
    else:
        technicals = 12  # Default
    
    # === NARRATIV (20 Punkte) ===
    # AI-Bezug, Katalysatoren, Thesis-Qualität
    if thesis and len(thesis) > 100:
        narrativ += 8
    elif thesis:
        narrativ += 5
        
    if catalyst:
        narrativ += 7
        
    # Analysten-Coverage
    analyst_count = sum(1 for i in insights if i.get('cat') == 'analyst')
    if analyst_count >= 3:
        narrativ += 5
    elif analyst_count >= 1:
        narrativ += 3
    
    # === SENTIMENT (15 Punkte) ===
    # News, Upgrades, Insider-Activity
    positive_news = sum(1 for i in insights if i.get('cat') in ['analyst', 'earnings', 'product', 'partnership'])
    negative_news = sum(1 for i in insights if 'cut' in i.get('headline', '').lower() or 'downgrade' in i.get('headline', '').lower())
    
    if positive_news >= 5:
        sentiment += 10
    elif positive_news >= 3:
        sentiment += 7
    elif positive_news >= 1:
        sentiment += 5
    else:
        sentiment += 3
        
    if negative_news > 2:
        sentiment -= 2
    
    sentiment = max(0, sentiment + 5)  # Basis-Punkte
    
    # === BONUS (10 Punkte) ===
    # Katalysatoren, institutionelle Aktivität, Sektor-Momentum
    bonus_reasons = []
    
    if catalyst:
        bonus += 3
        bonus_reasons.append("Katalysator vorhanden")
        
    earnings_insights = [i for i in insights if i.get('cat') == 'earnings']
    if earnings_insights:
        bonus += 3
        bonus_reasons.append("Earnings-Beat")
        
    if len(insights) >= 8:
        bonus += 2
        bonus_reasons.append("Hohe News-Aktivität")
        
    if research_score and research_score >= 8:
        bonus += 2
        bonus_reasons.append("Top Research-Score")
    
    # === STERNCHENFRAGEN PRÜFEN ===
    # Diese ziehen Punkte AB!
    
    # 1. Klumpenrisiko (Kundenkonzentration)
    if 'abh\u00e4ngig' in thesis.lower() or 'konzentration' in thesis.lower():
        star_violations.append("Klumpenrisiko")
        
    # 2. Unrealistisches KGV
    if 'p/e' in thesis.lower() or 'kgv' in thesis.lower():
        # Parse KGV aus thesis
        if any(x in thesis.lower() for x in ['pe 100', 'pe 120', 'kgv 100', 'kgv 120', 'pe ~100']):
            star_violations.append("Extremes KGV")
    
    # 3. Zyklizität
    if 'zyklisch' in thesis.lower() or 'zyklus' in thesis.lower():
        star_violations.append("Hohe Zyklizität")
    
    # 4. Liquiditätsrisiko
    if ticker_data.get('market_cap'):
        try:
            mc_val = float(ticker_data['market_cap'].replace('B', '').replace('$', '').strip())
            if mc_val < 5:
                star_violations.append("Small-Cap Risiko")
        except:
            pass
    
    # === ABZÜGE FÜR STERNCHEN ===
    penalty = len(star_violations) * 3  # -3 Punkte pro Sternchen
    
    # === GESAMT-SCORE ===
    base_score = fundamentals + technicals + narrativ + sentiment + bonus
    final_score = max(0, min(100, base_score - penalty))
    
    # === REASONING & EXPLANATION ===
    company = ticker_data.get('company', ticker_data.get('ticker'))
    sector = ticker_data.get('sector', 'N/A')
    
    # Overall Reasoning (3-4 Sätze, 150-250 Zeichen)
    reasoning_parts = []
    if thesis:
        reasoning_parts.append(thesis[:120])  # Erste 120 Zeichen der These
    if catalyst:
        reasoning_parts.append(f"Katalysator: {catalyst[:80]}")
    
    overall_reasoning = '. '.join(reasoning_parts)[:250]
    
    # Score Explanation (alle 5 Kategorien, 200-350 Zeichen)
    explanation = (
        f"📊 Fundamentals ({fundamentals}/30): Research-Score basiert. "
        f"📈 Technicals ({technicals}/25): Momentum & Volumen-Analyse. "
        f"🧠 Narrativ ({narrativ}/20): Thesis-Qualität & Katalysatoren. "
        f"📰 Sentiment ({sentiment}/15): News-Flow & Analyst-Coverage. "
        f"🎯 Bonus ({bonus}/10): {', '.join(bonus_reasons) if bonus_reasons else 'Standard'}. "
    )
    
    if star_violations:
        explanation += f"⭐ Abzüge: {', '.join(star_violations)} (-{penalty}). "
    
    explanation += f"Basis {base_score} → Final {final_score}."
    
    return {
        'overall_score': final_score,
        'overall_reasoning': overall_reasoning,
        'score_explanation': explanation[:350],  # Max 350 Zeichen
        'score_breakdown': json.dumps({
            'fundamentals': fundamentals,
            'technicals': technicals,
            'narrativ': narrativ,
            'sentiment': sentiment,
            'bonus': bonus,
            'penalty': penalty,
            'base_score': base_score
        }),
        'star_violations': ', '.join(star_violations) if star_violations else None
    }

def save_score_to_db(ticker, score_data):
    """Speichert Score in DB"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Update watchlist
    cursor.execute("""
        UPDATE watchlist 
        SET overall_score = ?,
            overall_reasoning = ?,
            score_explanation = ?,
            score_breakdown = ?,
            star_violations = ?,
            last_updated = ?
        WHERE ticker = ?
    """, (
        score_data['overall_score'],
        score_data['overall_reasoning'],
        score_data['score_explanation'],
        score_data['score_breakdown'],
        score_data['star_violations'],
        datetime.now().isoformat(),
        ticker
    ))
    
    # Insert into score_history
    cursor.execute("""
        INSERT OR REPLACE INTO score_history 
        (ticker, date, overall_score, reasoning, score_explanation, components, star_violations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        ticker,
        datetime.now().date().isoformat(),
        score_data['overall_score'],
        score_data['overall_reasoning'],
        score_data['score_explanation'],
        score_data['score_breakdown'],
        score_data['star_violations']
    ))
    
    conn.commit()
    conn.close()
    
    print(f"✅ {ticker}: Score {score_data['overall_score']} gespeichert")

def main():
    """Hauptfunktion - Bewertet alle Ticker"""
    
    print("🦁 BATCH SCORER - Systematische Bewertung aller Aktien\n")
    
    tickers = get_all_tickers()
    print(f"📊 {len(tickers)} Ticker zu bewerten\n")
    
    for ticker in tickers:
        # Daten laden (via score-updater.py)
        import subprocess
        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent / "score-updater.py"), "data", ticker],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"❌ {ticker}: Fehler beim Laden der Daten")
            continue
            
        try:
            ticker_data = json.loads(result.stdout)
        except:
            print(f"❌ {ticker}: Keine gültigen Daten")
            continue
        
        # Score berechnen
        score_data = calculate_score(ticker_data)
        
        # In DB speichern
        save_score_to_db(ticker, score_data)
    
    print(f"\n✅ Alle {len(tickers)} Ticker bewertet!")

if __name__ == "__main__":
    main()
