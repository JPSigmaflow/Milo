#!/usr/bin/env python3
"""
Score Calculator für Stock Tracker
Berechnet 0-100 Scores nach SCORING-SYSTEM.md
"""
import sqlite3
import json
from datetime import datetime

DB_PATH = '/Users/milo/.openclaw/workspace/skills/stock-tracker/data/watchlist.db'

def calculate_score(ticker_data, web_insights):
    """
    Berechnet Score nach dem Scoring-System
    
    Args:
        ticker_data: Dict mit Ticker-Daten vom score-updater.py
        web_insights: Dict mit aktuellen Web-News
    
    Returns:
        Dict mit score_breakdown, overall_score, overall_reasoning, score_explanation
    """
    
    score_breakdown = {
        "fundamentals": {"kgv": 0, "umsatz": 0, "marge": 0, "schulden": 0, "total": 0},
        "technicals": {"52w_abstand": 0, "preistrend": 0, "volumen": 0, "total": 0},
        "narrativ": {"these": 0, "analysten": 0, "katalysator": 0, "total": 0},
        "sentiment": {"upgrades": 0, "insider": 0, "social": 0, "total": 0},
        "bonus": {"multi_katalysator": 0, "institutionell": 0, "sektor": 0, "total": 0},
        "basis_score": 0,
        "star_violations": [],
        "final_score": 0,
        "ko_triggered": False
    }
    
    # TODO: Implement scoring logic basierend auf SCORING-SYSTEM.md
    # Dies ist ein Template - manuelle Bewertung erforderlich
    
    return {
        "score_breakdown": json.dumps(score_breakdown),
        "overall_score": score_breakdown["final_score"],
        "overall_reasoning": "Placeholder reasoning",
        "score_explanation": "Placeholder explanation"
    }

def save_score(ticker, score_data):
    """Speichert Score in DB"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Update watchlist
    c.execute("""
        UPDATE watchlist 
        SET overall_score = ?,
            overall_reasoning = ?,
            score_explanation = ?,
            score_breakdown = ?,
            star_violations = ?
        WHERE ticker = ?
    """, (
        score_data["overall_score"],
        score_data["overall_reasoning"],
        score_data["score_explanation"],
        score_data["score_breakdown"],
        json.dumps([v["rule"] for v in json.loads(score_data["score_breakdown"])["star_violations"]]),
        ticker
    ))
    
    # Insert into score_history
    c.execute("""
        INSERT OR REPLACE INTO score_history 
        (ticker, date, overall_score, reasoning, score_explanation, components, star_violations)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        ticker,
        datetime.now().strftime("%Y-%m-%d"),
        score_data["overall_score"],
        score_data["overall_reasoning"],
        score_data["score_explanation"],
        score_data["score_breakdown"],
        json.dumps([v["rule"] for v in json.loads(score_data["score_breakdown"])["star_violations"]])
    ))
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    print("Score Calculator Template erstellt")
