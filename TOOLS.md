# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

### MEXC API
- Keys: `/private/mexc-api.json`
- Permissions: read + spot_trade (NO withdraw)
- Expires: 2026-05-19 (Reminder gesetzt: 12. Mai)
- Dual-Approval: Chris + Juri müssen beide bestätigen vor jedem Trade

### Dashboard/Document Standard (Telegram)
- **Width:** 1080px
- **Font:** Inter (alle Texte)
- **Font sizes STANDARDISIERT:**
  - **Headers:** 32px (Inter Bold)
  - **Subheaders:** 24px (Inter SemiBold) 
  - **Body Text:** 18px (Inter Regular)
  - **Labels/Small:** 14px (Inter Medium)
- **Theme:** Dark (#0a0a0f bg), Orange (#f7931a) headers, Blue (#64b5f6) subheaders
- **Layout:** 1 topic per page/image, no max-width constraint
- **Cards:** #14141f bg, #2a2a3a border, 12px radius
- **Tables:** 18px font (Inter Regular), #1a1a2e header bg
- **Send as:** Document (not photo) to avoid Telegram compression
- **Template:** `/shared/crypto-strategy/masterplan-card*.html`

### Engagement-Paket Format (Chris Standard)
- **IMMER** Link und Kommentar als **separate Nachrichten** senden
- Reihenfolge: Link → Text (einzeln, kopierbar)
- KEIN Markdown, KEINE Code-Blöcke, KEIN Formatierung im Kommentar-Text
- Chris kopiert den Text direkt → muss plain text sein
- Gilt für PomesTeam Engagement-Pakete und alle Copy-Paste Inhalte

---

Add whatever helps you do your job. This is your cheat sheet.
