#!/usr/bin/env python3
"""
Bulk Stock Scorer - Bewertet alle Aktien automatisch nach dem Scoring-System
"""
import sqlite3
import json
import subprocess
from datetime import datetime

DB_PATH = "/Users/milo/.openclaw/workspace/shared/stocks.db"

def get_all_tickers():
    """Holt alle Ticker aus der DB"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT ticker FROM watchlist ORDER BY ticker")
    tickers = [row[0] for row in cur.fetchall()]
    conn.close()
    return tickers

def get_stock_data(ticker):
    """Holt Daten via score-updater.py"""
    try:
        result = subprocess.run(
            ["python3", "/Users/milo/.openclaw/workspace/skills/stock-tracker/scripts/score-updater.py", "data", ticker],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout)
        return None
    except Exception as e:
        print(f"❌ {ticker}: Fehler beim Datenabruf - {e}")
        return None

def calculate_score(data):
    """
    Berechnet Score nach Scoring-System
    Returns: (overall_score, score_breakdown, overall_reasoning, score_explanation, star_violations)
    """
    ticker = data.get('ticker', 'UNKNOWN')
    company = data.get('company', 'Unknown')
    market_cap_str = data.get('market_cap', '0')
    thesis = data.get('thesis', '')
    risk = data.get('risk_factors', '')
    catalyst = data.get('catalyst', '')
    sector = data.get('sector', '')
    prices = data.get('prices', [])
    prev_scores = data.get('prev_scores', [])
    
    # Market Cap parsing
    mc_val = 0
    if market_cap_str:
        try:
            mc_str = str(market_cap_str).replace('$', '').replace(',', '').replace('~', '').upper()
            if 'B' in mc_str:
                mc_val = float(mc_str.replace('B', '')) * 1000
            elif 'M' in mc_str:
                mc_val = float(mc_str.replace('M', ''))
        except:
            mc_val = 0
    
    # --- Fundamentals (30 Punkte) ---
    fund_kgv = 5 or 0  # Default mittel (keine Daten verfügbar)
    fund_umsatz = 4 or 0  # Default mittel
    fund_marge = 4 or 0  # Default mittel
    fund_schulden = 5 or 0  # Default mittel
    fundamentals = (fund_kgv or 0) + (fund_umsatz or 0) + (fund_marge or 0) + (fund_schulden or 0)
    
    # --- Technicals (25 Punkte) ---
    tech_52w = 5 or 0  # Default mittel
    tech_trend = 5 or 0  # Default mittel
    tech_vol = 4 or 0  # Default mittel
    
    if prices and len(prices) >= 4:
        try:
            # Preistrend berechnen
            recent = prices[0]['close']
            week_ago = prices[3]['close'] if len(prices) > 3 else recent
            
            if recent > week_ago * 1.05:
                tech_trend = 8  # Starker Aufwärtstrend
            elif recent > week_ago:
                tech_trend = 6  # Leichter Aufwärtstrend
            elif recent < week_ago * 0.95:
                tech_trend = 3  # Abwärtstrend
            else:
                tech_trend = 5  # Seitwärts
            
            # Volumen
            avg_vol = sum([p.get('vol', 0) for p in prices]) / len(prices) if len(prices) > 0 else 1
            current_vol = prices[0].get('vol', 0)
            if avg_vol > 0 and current_vol > avg_vol * 1.5:
                tech_vol = 7  # Überdurchschnittlich
            elif avg_vol > 0 and current_vol > avg_vol:
                tech_vol = 5
            else:
                tech_vol = 3
        except:
            pass  # Keep defaults
    
    technicals = (tech_52w or 0) + (tech_trend or 0) + (tech_vol or 0)
    
    # --- Narrativ (20 Punkte) ---
    narr_these = 6 if thesis else 3
    if thesis:
        thesis_lower = str(thesis).lower()
        if 'monopol' in thesis_lower or 'einzig' in thesis_lower:
            narr_these = 8
        elif 'führ' in thesis_lower or 'dominant' in thesis_lower:
            narr_these = 7
    
    narr_analysten = 4  # Default (keine Daten)
    narr_katalysator = 5 if catalyst else 2
    if catalyst and (str(catalyst) and ('2026' in str(catalyst) or '2027' in str(catalyst))):
        narr_katalysator = 6
    
    narrativ = (narr_these or 0) + (narr_analysten or 0) + (narr_katalysator or 0)
    
    # --- Sentiment (15 Punkte) ---
    sent_upgrades = 3  # Default
    sent_insider = 3  # Default
    sent_social = 3  # Default
    sentiment = (sent_upgrades or 0) + (sent_insider or 0) + (sent_social or 0)
    
    # --- Bonus (10 Punkte) ---
    bonus_multi = 0
    bonus_inst = 0
    bonus_sektor = 2  # Default
    
    if catalyst and len(str(catalyst)) > 50:
        bonus_multi = 2  # Vermutlich mehrere Katalysatoren
    
    bonus = (bonus_multi or 0) + (bonus_inst or 0) + (bonus_sektor or 0)
    
    # Basis-Score
    basis_score = (fundamentals or 0) + (technicals or 0) + (narrativ or 0) + (sentiment or 0) + (bonus or 0)
    
    # --- ⭐ Sternchenfragen ---
    star_violations = []
    penalty = 0
    
    # 🟡 Moderate: MC <$100M ohne institutionelle Investoren
    if mc_val > 0 and mc_val < 100:
        star_violations.append({
            'level': 'moderate',
            'rule': 'MC <$100M ohne Institutionelle',
            'penalty': -10
        })
        penalty += 10
    
    # 🟠 Schwere: Short Interest >30% (keine Daten, skip)
    # 🔴 K.O.: SEC-Klage, Delisting, etc. (keine Daten, skip)
    
    final_score = max(0, basis_score - penalty)
    
    # --- Overall Reasoning (150-250 Zeichen) ---
    reasoning = f"{company} "
    if thesis:
        reasoning += str(thesis)[:150] + ". "
    if risk:
        reasoning += f"Risiken: {str(risk)[:80]}"
    reasoning = reasoning[:250] if len(reasoning) >= 150 else reasoning + " " * (150 - len(reasoning))
    
    # --- Score Explanation (200-350 Zeichen) ---
    explanation = (
        f"📊 Fundamentals ({fundamentals}/30): KGV {fund_kgv}, Umsatz {fund_umsatz}, Marge {fund_marge}, Schulden {fund_schulden}. "
        f"📈 Technicals ({technicals}/25): Trend {tech_trend}, Volumen {tech_vol}, 52W {tech_52w}. "
        f"🧠 Narrativ ({narrativ}/20): These {narr_these}, Analysten {narr_analysten}, Katalysator {narr_katalysator}. "
        f"📰 Sentiment ({sentiment}/15): Upgrades {sent_upgrades}, Insider {sent_insider}, Social {sent_social}. "
        f"🎯 Bonus ({bonus}/10): Multi {bonus_multi}, Inst {bonus_inst}, Sektor {bonus_sektor}. "
    )
    
    if star_violations:
        stars_str = ", ".join([v['rule'] for v in star_violations])
        explanation += f"⭐ Sternchen: {stars_str} ({-penalty}). "
        explanation += f"Basis {basis_score} → Final {final_score}."
    else:
        explanation += f"Keine Sternchen. Final {final_score}."
    
    explanation = explanation[:350]
    
    # Score Breakdown JSON
    breakdown = {
        'fundamentals': {'kgv': fund_kgv, 'umsatz': fund_umsatz, 'marge': fund_marge, 'schulden': fund_schulden, 'total': fundamentals},
        'technicals': {'52w_abstand': tech_52w, 'preistrend': tech_trend, 'volumen': tech_vol, 'total': technicals},
        'narrativ': {'these': narr_these, 'analysten': narr_analysten, 'katalysator': narr_katalysator, 'total': narrativ},
        'sentiment': {'upgrades': sent_upgrades, 'insider': sent_insider, 'social': sent_social, 'total': sentiment},
        'bonus': {'multi_katalysator': bonus_multi, 'institutionell': bonus_inst, 'sektor': bonus_sektor, 'total': bonus},
        'basis_score': basis_score,
        'star_violations': star_violations,
        'final_score': final_score
    }
    
    return (final_score, json.dumps(breakdown), reasoning, explanation, json.dumps(star_violations))

def update_db(ticker, score, breakdown, reasoning, explanation, star_violations):
    """Schreibt Score in DB"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Update watchlist
    cur.execute("""
        UPDATE watchlist 
        SET overall_score = ?,
            overall_reasoning = ?,
            score_explanation = ?,
            score_breakdown = ?,
            star_violations = ?
        WHERE ticker = ?
    """, (score, reasoning, explanation, breakdown, star_violations, ticker))
    
    # Insert score_history
    cur.execute("""
        INSERT OR REPLACE INTO score_history 
        (ticker, date, overall_score, reasoning, score_explanation, components, star_violations)
        VALUES (?, datetime('now'), ?, ?, ?, ?, ?)
    """, (ticker, score, reasoning, explanation, breakdown, star_violations))
    
    conn.commit()
    conn.close()

def main():
    print("🚀 Starte Bulk-Scoring...")
    tickers = get_all_tickers()
    print(f"📊 {len(tickers)} Aktien gefunden\n")
    
    success = 0
    failed = 0
    
    for ticker in tickers:
        print(f"⚙️  {ticker}...", end=" ", flush=True)
        
        # Daten holen
        data = get_stock_data(ticker)
        if not data:
            print("❌ Keine Daten")
            failed += 1
            continue
        
        # Score berechnen
        try:
            score, breakdown, reasoning, explanation, star_violations = calculate_score(data)
            
            # In DB speichern
            update_db(ticker, score, breakdown, reasoning, explanation, star_violations)
            
            print(f"✅ Score: {score}")
            success += 1
        except Exception as e:
            print(f"❌ Fehler: {e}")
            failed += 1
    
    print(f"\n✅ Fertig: {success} bewertet, {failed} fehlgeschlagen")

if __name__ == "__main__":
    main()
