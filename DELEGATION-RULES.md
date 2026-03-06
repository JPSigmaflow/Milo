# DELEGATION RULES - Automatic Sub-Agent Routing

Wenn eine Nachricht in einem Chat ankommt, prüfe diese Regeln und delegiere automatisch an den passenden Sub-Agent.

## 🎰 PUMP (pumpwatch)
**Delegiere an Pump wenn:**
- Chat ist Pump.fun Chat (-5100226475)
- ODER Nachricht enthält: "pump.fun", "memecoin", "solana meme", "dexscreener", "bonding curve", "graduation"
- ODER Frage zu tracked coins (TRIPLET, CATANA, etc.)
- ODER Dashboard/Scanner Status Anfrage

**Delivery:** Über Milo zurück an WEundMILO oder Pump.fun Chat

**Workflow:**
```
sessions_spawn(
  runtime: "subagent",
  agentId: "pumpwatch",
  mode: "run",
  task: <user's message>
)
```

## 🍟 POMI (pomesteam)
**Delegiere an Pomi wenn:**
- Chat ist PomesTeam related
- ODER Nachricht enthält: "@pomesteam", "instagram post", "engagement", "caption", "hashtags"
- ODER Fragen zu Milo/Lanna/Dogs
- ODER Instagram Metrics Anfrage

**Delivery:** Über Milo zurück an requestor

**Workflow:**
```
sessions_spawn(
  runtime: "subagent",
  agentId: "pomesteam",
  mode: "run",
  task: <user's message>
)
```

## 📊 ANALYST (analyst)
**Delegiere an Analyst wenn:**
- Frage zu Aktien, Stock Scanner, Deep Research
- ODER Nachricht enthält: "stock", "aktie", "ticker", "watchlist"

## 🛡️ SENTINEL (sentinel)
**Delegiere an Sentinel wenn:**
- VDA Audit Anfragen
- Quality Check Requests
- Compliance Fragen

## ⚙️ FALLBACK
Wenn keine Regel matcht → Milo (main) antwortet selbst

## 🔄 COORDINATION
Milo bleibt **Supervisor** - überwacht alle Sub-Agents, eskaliert bei Problemen, koordiniert cross-functional tasks.
