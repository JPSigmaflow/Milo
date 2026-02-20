# Lessons Learned — Crypto System

## L001: Virales Bild ≠ Investment (2026-02-12)
**Coin:** $BIT (Lil Bit) — Katzenbild von Reddit
**Was passiert ist:** Virales Bild → Token auf PumpSwap → $1.79M Volume in 24h → -69% in 6h
**Lektion:**
- Viralität allein ist KEIN Kaufgrund
- Hoher Volume bei niedriger Liquidity ($22K) = Falle
- Retail kauft den Hype, Smart Money verkauft rein
- MC $66K bei $1.79M Volume = 27x Turnover → reines Gambling
**Regel für Scanner:**
- Wenn Volume/MC > 10x UND Liquidity < $50K → automatisch NO-GO
- Meme ohne Utility, Team oder Roadmap → NO-GO
- Kein AI-Narrativ → raus laut Governance v2.1

## L002: Kontext nie verlieren (2026-02-12)
**Was passiert ist:** Chris fragte nach dem Katzenbild-Coin, ich wusste nicht wovon er sprach
**Lektion:**
- Alles was in WEundMILO besprochen wird SOFORT loggen
- Coin-Log pflegen nach jeder Diskussion
- Milo muss IMMER wissen was in seinen eigenen Chats läuft
**Regel:** Jeder erwähnte Coin → coin-log.md. Keine Ausnahme.

## L003: Besprochenes sofort umsetzen (2026-02-12)
**Was passiert ist:** Chris und Milo hatten 2 getrennte Scanner besprochen (Viral + Portfolio). Milo hatte es nicht sofort umgesetzt und musste nachgefragt werden.
**Lektion:**
- Wenn etwas besprochen und beschlossen wurde → SOFORT umsetzen
- Nicht warten bis jemand fragt "läuft das schon?"
- Milo muss Kontext aus ALLEN Chats behalten, nicht nur dem aktuellen
**Regel:** Beschluss = Umsetzung. Keine Verzögerung.

## L004: Kein Crypto in Chris' privatem Chat (2026-02-12)
**Was passiert ist:** Milo hat Crypto-Lagebericht in Chris' privaten Chat geschickt statt nur in WEundMILO
**Lektion:**
- Chris' privater Chat = NUR PomesTeam, Lu, persönliche Sachen
- Crypto = NUR in WEundMILO Gruppe (-5299930122)
- KEINE Ausnahme. Auch nicht auf die Frage "wie ist die Lage"
**Regel:** Crypto-Inhalte → WEundMILO. Immer. Punkt.

## L005: Datenbank-Struktur kennen (2026-02-12)
**Was passiert ist:** Milo hat crypto.db erstellt obwohl portfolio.db bereits existierte mit vollständigen Daten
**Lektion:**
- Vor dem Erstellen neuer DBs IMMER prüfen was schon existiert
- Es gibt genau 3 DBs: portfolio.db (Portfolio/Preise), scanner.db (Scanner/Lessons), blueprint.db (Lera/Juri)
- KEINE weiteren DBs erstellen ohne Freigabe
**Regel:** portfolio.db = Portfolio. scanner.db = Scanner. Fertig.

---

*Jede Lektion hat eine Nummer. Jede Lektion wird in den Scanner eingebaut. Wir machen denselben Fehler nie zweimal.*
