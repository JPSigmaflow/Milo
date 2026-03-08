#!/usr/bin/env python3
"""
Batch-Bewertung aller Aktien mit 0-100 Scoring-System
"""

import sqlite3
import json
import subprocess
import sys

DB_PATH = "/Users/milo/.openclaw/workspace/shared/stocks.db"

def get_all_tickers():
    """Hole alle Ticker aus watchlist"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    # Alle Ticker außer rejected
    cur.execute("SELECT ticker FROM watchlist WHERE status IN ('listed', 'watching')")
    tickers = [row[0] for row in cur.fetchall()]
    conn.close()
    return tickers

def get_ticker_data(ticker):
    """Hole Ticker-Daten via score-updater.py"""
    try:
        result = subprocess.run(
            ["python3", "/Users/milo/.openclaw/workspace/skills/stock-tracker/scripts/score-updater.py", "data", ticker],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
    except Exception as e:
        print(f"⚠️  {ticker}: Fehler beim Datenabruf - {e}", file=sys.stderr)
    return None

def calculate_score(data):
    """Berechne 0-100 Score basierend auf SCORING-SYSTEM.md"""
    
    # Fundamentals (30)
    fund_kgv = 5  # Default bei fehlenden Daten
    research_score_val = data.get("research_score") or 5
    fund_umsatz = 6 if research_score_val >= 8 else 4  # Heuristik
    fund_marge = 5
    fund_schulden = 5
    fundamentals = fund_kgv + fund_umsatz + fund_marge + fund_schulden
    
    # Technicals (25)
    prices = data.get("prices", [])
    if len(prices) >= 2:
        current = prices[0]["close"]
        prev = prices[1]["close"]
        change_pct = ((current - prev) / prev) * 100
        
        # Preistrend
        if change_pct > 3:
            tech_trend = 7
        elif change_pct > 0:
            tech_trend = 5
        elif change_pct > -3:
            tech_trend = 3
        else:
            tech_trend = 2
        
        # Volumen
        vol_current = prices[0].get("vol") or 0
        vol_prev = prices[1].get("vol") or 1
        vol_ratio = vol_current / vol_prev if vol_prev > 0 else 1
        tech_vol = 6 if vol_ratio > 1.2 else 4 if vol_ratio > 0.8 else 2
    else:
        tech_trend = 4
        tech_vol = 4
    
    tech_52w = 5  # Neutral ohne detaillierte Daten
    technicals = tech_52w + tech_trend + tech_vol
    
    # Narrativ (20)
    research_score = data.get("research_score") or 5
    narr_these = int(research_score)  # Research-Score als Proxy
    narr_analysten = 3  # Neutral
    narr_katalysator = 4 if data.get("catalyst") else 2
    narrativ = narr_these + narr_analysten + narr_katalysator
    
    # Sentiment (15)
    sent_upgrades = 2
    sent_insider = 3
    sent_social = 2
    sentiment = sent_upgrades + sent_insider + sent_social
    
    # Bonus (10)
    bonus_multi = 2 if data.get("catalyst") else 0
    bonus_inst = 1
    bonus_sektor = 2 if data.get("sector") == "Technology" else 1
    bonus = bonus_multi + bonus_inst + bonus_sektor
    
    basis_score = fundamentals + technicals + narrativ + sentiment + bonus
    
    # Sternchenfragen
    star_violations = []
    final_score = basis_score
    
    # MC <$100M Check
    mc_str = data.get("market_cap", "0")
    try:
        if "B" in mc_str:
            mc_val = float(mc_str.replace("B", "").replace("$", ""))
        elif "M" in mc_str:
            mc_val = float(mc_str.replace("M", "").replace("$", "")) / 1000
        else:
            mc_val = 1  # Unknown = assume OK
        
        if mc_val < 0.1:  # <$100M
            star_violations.append({
                "level": "moderate",
                "rule": "MC <$100M ohne Institutionelle",
                "penalty": -10
            })
            final_score -= 10
    except:
        pass
    
    # Klumpenrisiko Check (heuristisch)
    thesis = (data.get("thesis") or "").lower()
    if "einziger" in thesis or "monopol" in thesis:
        star_violations.append({
            "level": "moderate",
            "rule": "Klumpenrisiko Einzelkunde >50%",
            "penalty": -10
        })
        final_score -= 10
    
    ko_triggered = False
    
    breakdown = {
        "fundamentals": {"kgv": fund_kgv, "umsatz": fund_umsatz, "marge": fund_marge, "schulden": fund_schulden, "total": fundamentals},
        "technicals": {"52w_abstand": tech_52w, "preistrend": tech_trend, "volumen": tech_vol, "total": technicals},
        "narrativ": {"these": narr_these, "analysten": narr_analysten, "katalysator": narr_katalysator, "total": narrativ},
        "sentiment": {"upgrades": sent_upgrades, "insider": sent_insider, "social": sent_social, "total": sentiment},
        "bonus": {"multi_katalysator": bonus_multi, "institutionell": bonus_inst, "sektor": bonus_sektor, "total": bonus},
        "basis_score": basis_score,
        "star_violations": star_violations,
        "final_score": final_score,
        "ko_triggered": ko_triggered
    }
    
    # Reasoning generieren
    category = data.get("category") or "Unbekannt"
    thesis_raw = data.get("thesis") or "Keine These verfügbar"
    thesis_short = thesis_raw[:100]
    change_str = f"{change_pct:+.1f}%" if len(prices) >= 2 else "k.A."
    
    reasoning = f"{category} mit Score {final_score}/100. These: {thesis_short}. Preisentwicklung: {change_str}."
    if star_violations:
        reasoning += f" Warnung: {star_violations[0]['rule']}."
    
    return final_score, reasoning, breakdown, star_violations

def update_db(ticker, score, reasoning, breakdown, star_violations):
    """Schreibe Score in DB"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    breakdown_json = json.dumps(breakdown, ensure_ascii=False)
    violations_json = json.dumps(star_violations, ensure_ascii=False)
    
    # Update watchlist
    cur.execute("""
        UPDATE watchlist 
        SET overall_score=?, overall_reasoning=?, score_breakdown=?, star_violations=?
        WHERE ticker=?
    """, (score, reasoning, breakdown_json, violations_json, ticker))
    
    # Insert score_history
    cur.execute("""
        INSERT INTO score_history (ticker, date, overall_score, reasoning, components, star_violations)
        VALUES (?, datetime('now'), ?, ?, ?, ?)
    """, (ticker, score, reasoning, breakdown_json, violations_json))
    
    conn.commit()
    conn.close()

def main():
    tickers = get_all_tickers()
    print(f"📊 Starte Bewertung von {len(tickers)} Aktien...\n")
    
    results = []
    
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i}/{len(tickers)}] {ticker}...", end=" ", flush=True)
        
        data = get_ticker_data(ticker)
        if not data:
            print("⚠️  Keine Daten")
            continue
        
        score, reasoning, breakdown, violations = calculate_score(data)
        update_db(ticker, score, reasoning, breakdown, violations)
        
        results.append({
            "ticker": ticker,
            "score": score,
            "company": data.get("company", ""),
            "violations": violations
        })
        
        print(f"✅ {score}/100")
    
    # Sortiere nach Score
    results.sort(key=lambda x: x["score"], reverse=True)
    
    print(f"\n{'='*60}")
    print("🏆 TOP 10")
    print(f"{'='*60}")
    for r in results[:10]:
        star = " ⭐" if r["violations"] else ""
        print(f"{r['score']:3.0f} | {r['ticker']:10s} | {r['company'][:30]}{star}")
    
    print(f"\n{'='*60}")
    print("📉 BOTTOM 10")
    print(f"{'='*60}")
    for r in results[-10:]:
        star = " ⭐" if r["violations"] else ""
        print(f"{r['score']:3.0f} | {r['ticker']:10s} | {r['company'][:30]}{star}")
    
    print(f"\n✅ Alle {len(results)} Aktien bewertet und in DB gespeichert!")

if __name__ == "__main__":
    main()
