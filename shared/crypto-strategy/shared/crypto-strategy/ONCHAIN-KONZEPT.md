# 🔗 On-Chain Crypto Trading Konzept

**Erstellt für:** Juri & Chris  
**Datum:** 7. Februar 2026  
**Version:** 1.0

---

## 📋 Inhaltsverzeichnis

1. [Executive Summary](#executive-summary)
2. [Plattform-Analyse](#plattform-analyse)
3. [Sicherheitskonzept](#sicherheitskonzept)
4. [Trading-Workflow](#trading-workflow)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Milo Integration (Sub-Agent)](#milo-integration)
7. [Risikomanagement](#risikomanagement)
8. [Implementierungsplan](#implementierungsplan)

---

## 1. Executive Summary

### Ziel
Autonomes On-Chain Trading mit maximaler Sicherheit, vollständiger Transparenz und automatisierter Überwachung aller Prozesse.

### Empfehlung (TL;DR)
| Kategorie | Empfehlung |
|-----------|------------|
| **Primäre Chain** | Solana (Speed + niedrige Fees) |
| **Sekundäre Chain** | Base (ETH-Ökosystem, günstig) |
| **Wallet** | Phantom (Solana) + Rabby (EVM) |
| **Hardware Wallet** | Ledger Nano X (Cold Storage) |
| **DEX** | Jupiter (SOL), Uniswap (Base) |
| **Monitoring** | Milo Sub-Agent + On-Chain Alerts |

---

## 2. Plattform-Analyse

### 2.1 Solana ⭐ EMPFOHLEN

**Vorteile:**
- ⚡ ~400ms Transaktionszeit
- 💰 ~$0.00025 pro Transaktion
- 🔥 Aktives DeFi-Ökosystem (Jupiter, Raydium, Orca)
- 📈 Starkes Wachstum bei Memecoins & neuen Projekten
- 🤖 Beste API/SDK für Automatisierung

**Nachteile:**
- ⚠️ Gelegentliche Netzwerk-Ausfälle (historisch)
- 📊 Weniger etablierte Blue-Chips als Ethereum

**Wichtige DEXs:**
| DEX | Typ | Besonderheit |
|-----|-----|--------------|
| Jupiter | Aggregator | Beste Preise, routet über alle DEXs |
| Raydium | AMM | Concentrated Liquidity |
| Orca | AMM | User-friendly |
| Pump.fun | Launchpad | Neue Memecoins |

### 2.2 Base (Layer 2)

**Vorteile:**
- 🏦 Backed by Coinbase
- 💎 Zugang zum Ethereum-Ökosystem
- 💰 Niedrige Fees (~$0.01-0.10)
- 🔐 Ethereum-Sicherheit

**Nachteile:**
- 🐢 Langsamer als Solana (~2s)
- 📉 Weniger neue Projekte als Solana

**Wichtige DEXs:**
| DEX | Typ | Besonderheit |
|-----|-----|--------------|
| Uniswap | AMM | Standard, zuverlässig |
| Aerodrome | AMM | Native Base DEX |
| 1inch | Aggregator | Multi-Chain |

### 2.3 Ethereum Mainnet

**Nur für:**
- Blue-Chip DeFi (Aave, Compound)
- NFT-Trades (OpenSea)
- Große Summen (>$10k) wo Sicherheit > Fees

**Nicht empfohlen für:**
- Häufiges Trading (Fees $5-50+)
- Kleine Positionen

### 2.4 Weitere Chains (Optional)

| Chain | Use Case | Fees |
|-------|----------|------|
| Arbitrum | ETH DeFi, günstiger | ~$0.10 |
| Avalanche | Gaming, Subnets | ~$0.05 |
| BNB Chain | Binance Ökosystem | ~$0.10 |

---

## 3. Sicherheitskonzept

### 3.1 Wallet-Architektur (3-Tier)

```
┌─────────────────────────────────────────────────────────┐
│                    TIER 1: COLD STORAGE                 │
│                    (Ledger Nano X)                      │
│                                                         │
│  📦 Langfristige Holdings (>80% des Portfolios)        │
│  🔐 Offline, niemals mit DApps verbunden               │
│  💰 Nur für Ein-/Auszahlungen                          │
└─────────────────────────────────────────────────────────┘
                          ↓ Transfer bei Bedarf
┌─────────────────────────────────────────────────────────┐
│                    TIER 2: WARM WALLET                  │
│                 (Phantom/Rabby + Ledger)                │
│                                                         │
│  📊 Trading-Kapital (15% des Portfolios)               │
│  🔗 Hardware-Signatur für alle TXs                     │
│  ⚡ Verbunden mit verifizierten DEXs                   │
└─────────────────────────────────────────────────────────┘
                          ↓ Kleine Beträge
┌─────────────────────────────────────────────────────────┐
│                    TIER 3: HOT WALLET                   │
│                    (Burner Wallet)                      │
│                                                         │
│  🧪 Tests & neue DApps (<5% des Portfolios)            │
│  ⚠️ Annahme: Kann kompromittiert werden               │
│  🔄 Regelmäßig leeren/ersetzen                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Sicherheitsregeln

#### MUST-HAVE ✅
1. **Hardware Wallet für alle Signaturen** (Ledger/Trezor)
2. **Seed Phrase NIEMALS digital speichern**
   - Metall-Backup (Cryptosteel/Billfodl)
   - 2 separate physische Orte
3. **Revoke alte Approvals** (revoke.cash wöchentlich)
4. **Separate Browser-Profile** für Crypto
5. **2FA auf allen CEX-Accounts** (Yubikey > Google Auth > SMS)

#### NICE-TO-HAVE 🎯
- Dedizierter Laptop nur für Crypto
- VPN bei Public WiFi
- Regelmäßige Wallet-Rotation

### 3.3 Transaktionssicherheit

```
Vor JEDEM Trade prüfen:
┌────────────────────────────────────────┐
│ □ Contract verifiziert? (Etherscan)   │
│ □ Liquidity ausreichend? (>$100k)     │
│ □ Slippage eingestellt? (max 1-3%)    │
│ □ Approval-Amount begrenzt?           │
│ □ Simulation erfolgreich? (Tenderly)  │
└────────────────────────────────────────┘
```

### 3.4 Scam-Erkennung

**Red Flags 🚩:**
- Token kann nicht verkauft werden (Honeypot)
- Hohe Buy/Sell Tax (>5%)
- Unlocked Liquidity
- Anonymous Team + kein GitHub
- Zu gut um wahr zu sein (1000% APY)

**Tools:**
| Tool | Zweck |
|------|-------|
| [honeypot.is](https://honeypot.is) | Honeypot-Check |
| [tokensniffer.com](https://tokensniffer.com) | Contract-Analyse |
| [rugcheck.xyz](https://rugcheck.xyz) | Solana Token Check |
| [dexscreener.com](https://dexscreener.com) | Liquidity & Charts |

---

## 3.5 Verkauf-Sicherheit & Fee-Optimierung

### Pre-Trade Checks (Automatisch)

**VOR jedem Kauf führt Milo automatisch durch:**

```
┌─────────────────────────────────────────────────────────┐
│              AUTOMATISCHER PRE-TRADE CHECK              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. HONEYPOT-TEST                                       │
│     → API-Check: honeypot.is                           │
│     → Simulation: Verkauf möglich?                     │
│     → ❌ STOP wenn nicht verkaufbar                    │
│                                                         │
│  2. LIQUIDITY-CHECK                                     │
│     → LP muss mind. 10x der Position sein              │
│     → Beispiel: €1000 Trade → LP mind. €10.000        │
│     → ⚠️ Warnung wenn knapp                           │
│                                                         │
│  3. TAX-ANALYSE                                         │
│     → Buy Tax + Sell Tax berechnen                     │
│     → ❌ STOP wenn Total >10%                          │
│     → ⚠️ Warnung wenn >5%                             │
│                                                         │
│  4. SLIPPAGE-PRÜFUNG                                   │
│     → Erwarteter vs. tatsächlicher Preis              │
│     → Auto-Adjust basierend auf Volatilität           │
│                                                         │
└─────────────────────────────────────────────────────────┘

→ KEIN KAUF OHNE GRÜNES LICHT AUF ALLEN CHECKS!
```

### Fee-Optimierung (Beste Route)

**Solana - Jupiter Aggregator:**
```
Jupiter routet automatisch über ALLE DEXs:

Beispiel: USDC → TOKEN X

┌──────────────────────────────────────┐
│ DEX        │ Fee    │ Preis         │
├──────────────────────────────────────┤
│ Raydium    │ 0.25%  │ $0.0451       │
│ Orca       │ 0.30%  │ $0.0449       │
│ Meteora    │ 0.20%  │ $0.0452       │
└──────────────────────────────────────┘

→ Beste Route: 60% Raydium + 40% Meteora
→ Ersparnis: 2-5% vs. einzelner DEX
```

**EVM (Base/ETH) - 1inch Aggregator:**
- Gleiche Funktion wie Jupiter
- Routet über Uniswap, Sushiswap, Curve, etc.
- Automatische Split-Orders für beste Preise

### Milo Monitoring Matrix

| Check | Automatisch | Aktion bei Fail |
|-------|-------------|-----------------|
| Honeypot-Test | ✅ | Trade blockiert |
| Liquidity Check | ✅ | Warnung + Limit |
| Tax-Berechnung | ✅ | Warnung wenn >5% |
| Beste Route | ✅ | Auto via Jupiter/1inch |
| Slippage | ✅ | Auto-Adjust |
| Gas-Timing (ETH) | ✅ | Warten auf günstiges Gas |

### Minimal-Effort Workflow

```
IHR                          MILO
 │                            │
 │  "Kauf TOKEN X für €500"   │
 │ ─────────────────────────► │
 │                            │
 │                       ┌────┴────┐
 │                       │ CHECKS  │
 │                       │ laufen  │
 │                       └────┬────┘
 │                            │
 │  ◄───────────────────────  │
 │                            │
 │   ✅ Honeypot: Clean       │
 │   ✅ Liquidity: $500k      │
 │   ✅ Tax: 1% buy, 1% sell  │
 │   ✅ Beste Route: Jupiter  │
 │   ✅ Fees: ~$0.02          │
 │   ✅ Erwartete Tokens: XXX │
 │                            │
 │   [✅ BESTÄTIGEN]          │
 │ ─────────────────────────► │
 │                            │
 │                       Trade wird
 │                       ausgeführt
 │                            │
 │   "✅ Gekauft! TX: abc..."  │
 │  ◄───────────────────────  │
```

**= Ein Button-Klick, Milo macht den Rest.**

---

## 4. Trading-Workflow

### 4.1 Kauf-Prozess (Solana Beispiel)

```
1. RECHERCHE
   └─→ CoinGecko/DexScreener: MCap, Volume, Holders
   └─→ Twitter/Discord: Community-Sentiment
   └─→ rugcheck.xyz: Contract-Check
   └─→ Milo: Scam-Check Bericht

2. VORBEREITUNG
   └─→ SOL auf Warm Wallet (Phantom)
   └─→ Jupiter öffnen: jupiter.ag
   └─→ Token-Contract kopieren (nicht suchen!)
   └─→ Slippage: 1% (stable) / 5-10% (volatile)

3. EXECUTION
   └─→ Betrag eingeben
   └─→ Route prüfen (beste via Jupiter)
   └─→ Transaktion simulieren
   └─→ Mit Ledger signieren
   └─→ TX-Hash speichern

4. POST-TRADE
   └─→ Milo: Trade in DB loggen
   └─→ Solscan: TX verifizieren
   └─→ Alert setzen (Take-Profit / Stop-Loss)
```

### 4.2 Verkauf-Prozess

```
1. TRIGGER
   └─→ Milo Alert: Zielpreis erreicht
   └─→ ODER: Manueller Verkauf

2. EXECUTION
   └─→ Jupiter: Token → SOL/USDC
   └─→ Slippage beachten bei illiquiden Coins
   └─→ Mit Ledger signieren

3. PROFIT-SICHERUNG
   └─→ Gewinne → USDC (Stablecoin)
   └─→ Bei größeren Summen → CEX → Bank
   └─→ Steuer dokumentieren (!)
```

---

## 5. Monitoring & Alerts

### 5.1 Echtzeit-Überwachung

| Was | Tool | Frequenz |
|-----|------|----------|
| Portfolio-Wert | Milo Dashboard | Live |
| Preisänderungen | DexScreener + Milo | 1 Min |
| Wallet-Aktivität | Solscan/Basescan | Live |
| Große Transfers | Whale Alert | Instant |
| Liquidität | DexScreener | 5 Min |

### 5.2 Alert-Typen

```python
# Milo Alert-Konfiguration

ALERTS = {
    "price_target": {
        "type": "above/below",
        "threshold": "user_defined",
        "action": "telegram_notify"
    },
    "whale_movement": {
        "type": "large_transfer",
        "threshold": ">$100k",
        "action": "telegram_notify"
    },
    "liquidity_drop": {
        "type": "below",
        "threshold": "-20% in 1h",
        "action": "telegram_urgent"
    },
    "new_token_listing": {
        "type": "dex_listing",
        "filter": "mcap < $10M",
        "action": "research_queue"
    }
}
```

### 5.3 Dashboard-Metriken

Das Crypto Dashboard zeigt:
- Live-Preise aller Portfolio-Coins
- 24h Änderung + Trend
- P&L seit Kauf
- Watchlist mit Alerts
- Micro-Cap Radar (<$10M)

---

## 6. Milo Integration (Sub-Agent)

### 6.1 Empfehlung: Dedizierter Crypto Sub-Agent

**Warum Sub-Agent?**
- 🔒 Isolierte Session (keine Vermischung mit anderen Tasks)
- 📊 Spezialisiertes Kontextwissen
- ⚡ Schnellere Reaktionszeiten
- 📝 Eigene Memory für Trades

### 6.2 Sub-Agent Aufgaben

```
┌─────────────────────────────────────────────────────────┐
│              MILO CRYPTO SUB-AGENT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 MONITORING (kontinuierlich)                        │
│     • Portfolio-Preise alle 5 Min                      │
│     • Alert-Checks                                      │
│     • Whale-Bewegungen                                  │
│                                                         │
│  📈 DAILY TASKS (8:00 Uhr)                             │
│     • 5 neue Coins recherchieren                       │
│     • Preise updaten                                    │
│     • Report an Telegram                               │
│                                                         │
│  🔔 ALERTS (event-based)                               │
│     • Preisziele erreicht                              │
│     • Große Wallet-Bewegungen                          │
│     • Liquiditäts-Warnung                              │
│                                                         │
│  📝 LOGGING                                             │
│     • Alle Trades in DB                                │
│     • Performance-Tracking                             │
│     • Steuer-Export                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Automatisierbare Aktionen

| Aktion | Automatisierbar? | Risiko |
|--------|------------------|--------|
| Preise abrufen | ✅ Ja | Niedrig |
| Alerts senden | ✅ Ja | Niedrig |
| Research & Reports | ✅ Ja | Niedrig |
| Trade empfehlen | ✅ Ja | Niedrig |
| Trade ausführen | ⚠️ Möglich* | HOCH |
| Wallet verwalten | ❌ Nein | KRITISCH |

*Trade-Ausführung nur mit:
- Expliziter Bestätigung per Telegram-Button
- Hardware-Wallet-Signatur (manuell)
- Maximalbetrag pro Trade

### 6.4 Sub-Agent Setup (Optional)

```yaml
# Vorgeschlagene Konfiguration
name: "MiloCrypto"
telegram_account: "crypto" # Separater Bot
schedule:
  - "0 8 * * *"   # Täglicher Report
  - "*/5 * * * *" # Preis-Check alle 5 Min
alerts:
  channel: telegram
  targets: [juri_id, chris_id]
database: shared/crypto.db
```

---

## 7. Risikomanagement

### 7.1 Position Sizing

```
REGEL: Nie mehr als X% in eine Position

┌─────────────────────────────────────┐
│ Portfolio-Anteil nach Risiko:       │
├─────────────────────────────────────┤
│ Blue Chips (BTC, ETH, SOL)   │ 50%  │
│ Mid Caps ($100M-$1B)         │ 30%  │
│ Small Caps ($10M-$100M)      │ 15%  │
│ Micro Caps (<$10M)           │  5%  │
└─────────────────────────────────────┘

Max pro einzelnem Trade: 5% des Portfolios
Max pro Micro-Cap: 1% des Portfolios
```

### 7.2 Stop-Loss Strategie

| Coin-Typ | Stop-Loss | Take-Profit |
|----------|-----------|-------------|
| Blue Chip | -15% | +50% (partial) |
| Mid Cap | -20% | +100% (partial) |
| Small Cap | -30% | +200% (partial) |
| Micro Cap | -50% | +500% (partial) |

**"Partial" = 50% der Position verkaufen, Rest laufen lassen**

### 7.3 Steuer-Dokumentation

**Wichtig für Deutschland:**
- Haltefrist >1 Jahr = Steuerfrei
- <1 Jahr = Einkommensteuer
- Jeder Trade dokumentieren!

**Milo trackt automatisch:**
- Kaufdatum + Preis
- Verkaufsdatum + Preis
- Gewinn/Verlust
- Haltefrist

---

## 8. Implementierungsplan

### Phase 1: Setup (Diese Woche)
- [ ] Ledger Nano X bestellen
- [ ] Phantom Wallet einrichten
- [ ] Hardware mit Phantom verbinden
- [ ] Jupiter testen (kleiner Betrag)

### Phase 2: Sicherheit (Woche 2)
- [ ] Seed Phrase Backup (Metall)
- [ ] Separate Browser-Profile
- [ ] revoke.cash Bookmark
- [ ] Sicherheitscheckliste ausdrucken

### Phase 3: Trading (Woche 3+)
- [ ] Erste Position kaufen (Test)
- [ ] Alerts einrichten
- [ ] Trade-Logging starten

### Phase 4: Automation (Optional)
- [ ] Sub-Agent aktivieren
- [ ] Telegram-Buttons für Trades
- [ ] Automatische Reports

---

## 📎 Anhang

### Wichtige Links

| Ressource | Link |
|-----------|------|
| Jupiter (Solana DEX) | jupiter.ag |
| Phantom Wallet | phantom.app |
| Solscan (Explorer) | solscan.io |
| DexScreener | dexscreener.com |
| RugCheck | rugcheck.xyz |
| Revoke Approvals | revoke.cash |

### Empfohlene Hardware

| Produkt | Preis | Wo kaufen |
|---------|-------|-----------|
| Ledger Nano X | ~€149 | ledger.com (NUR offizielle Seite!) |
| Cryptosteel Capsule | ~€99 | cryptosteel.com |
| YubiKey 5 NFC | ~€55 | yubico.com |

---

**Fragen?** Einfach in der Gruppe fragen — Milo hilft! 🦁

*Konzept erstellt von Milo • 7. Februar 2026*
