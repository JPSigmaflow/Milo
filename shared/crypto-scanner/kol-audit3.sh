#!/bin/bash
# KOL Activity Audit v3 - Proper JSON parsing for Twitter Syndication API
OUTPUT="/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-results.jsonl"
> "$OUTPUT"

HANDLES=(
  lookonchain EmberCN ai_9684xtpa 0xJeff_ MustStopMurad DefiIgnas Pentosh1 CryptoHayes
  inversebrah AltcoinPsycho MerlijnTrader dieterthemieter CryptoGodJohn MoonOverlord
  CryptoBusy BTC_Archive ZssBecker Route2FI CryptoCred WuBlockchain tier10k db_defi TheDeFiEdge
  cobie GCRClassic CryptoCapo_ CredibleCrypto ColdBloodShill DaanCrypto SmartContracter
  CryptoKaleo AltcoinSherpa blknoiz06 zachxbt TheMoonCarl gainzy222 Trader_XO
  CryptoTony__ GiganticRebirth Elliotrades KoroushAK LomahCrypto
  ErgoBTC 100trillionUSD APompliano scottmelker CryptoCapital_V Crypto_Birb PeterLBrandt
  CryptoMaestro_ cryptomanran MessariCrypto nansen_ai DefiLlama whale_alert santimentfeed
  glassnode IntoTheBlock MilesDeutscher RaoulGMI balajis VitalikButerin Rewkang BarrySilbert
  CathieDWood cburniske ErikVoorhees aantonop adam3us laurashin CamiRusso Zeneca_33 punk6529
  brian_armstrong SOLBigBrain SolanaLegend ansem JasonYanowitz TaschaLabs CryptoDiffer
  CryptoRank_io RunnerXBT IvanOnTech boxmining ai16zdao shawmakesmagic jimfan 0xSisyphus
  DeFi_Dad Tetranode andrecronje LayerZero_Labs CelestiaOrg willclemente CroissantEth
  AutismCapital 0xHamz mrjasonchoi hasufl FrankResearcher 0xngmi DonAlt Bankless
  DeFianceCapital a16zcrypto EmperorBTC nebraskangooner CryptoWendyO sassal0x DocumentingBTC
  saylor davincij15 GarethSoloway KaitoAI virtuals_io blocktrainer btcecho JulianHosp
  HossDE Blockmagazin InvestmentPunk roman_reher finanzfluss marc_friedrich MMCrypto KryptoKumpel
  CriptoNoticias CriptoDinero Matidroid JuanEnCripto Criptomonedas_ CryptoSpanish Cripto247
  CriptoTendencia
  elonmusk cz_binance paradigm coindesk cointelegraph bitcoinmagazine watcherguru polymarket
  ericbalchunas cdixon ryansadams trustlessstate johnedeaton1 peterschiff drakefjustin
  xcopyart geiger_capital marionawfal
)

HANDLES=($(printf '%s\n' "${HANDLES[@]}" | sort -u))
TOTAL=${#HANDLES[@]}
echo "Checking $TOTAL unique accounts..."

# Reference date for calculating days
NOW=$(date +%s)

COUNT=0
for handle in "${HANDLES[@]}"; do
  COUNT=$((COUNT + 1))
  
  for attempt in 1 2 3; do
    raw=$(curl -sL --max-time 15 \
      -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
      "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" 2>/dev/null)
    
    if echo "$raw" | grep -qi "Rate limit"; then
      echo "  [$COUNT/$TOTAL] $handle: RATE LIMITED (attempt $attempt, waiting 60s...)"
      sleep 60
      continue
    fi
    break
  done
  
  if [ -z "$raw" ] || echo "$raw" | grep -qi "Rate limit"; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"rate_limited\"}" >> "$OUTPUT"
    echo "  [$COUNT/$TOTAL] $handle: RATE LIMITED (skipped)"
    sleep 3
    continue
  fi
  
  if echo "$raw" | grep -qi "doesn't exist\|UserUnavailable\|suspended"; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"not_found\"}" >> "$OUTPUT"
    echo "  [$COUNT/$TOTAL] $handle: NOT FOUND"
    sleep 3
    continue
  fi
  
  # Extract followers_count  
  followers=$(echo "$raw" | grep -o '"followers_count":[0-9]*' | head -1 | cut -d: -f2)
  
  # Extract all created_at dates and find the most recent
  # Format: "Mon Jan 20 17:44:48 +0000 2025"
  # Get all created_at values from tweet entries (not user objects)
  # We look for created_at after "conversation_id_str" which means it's a tweet, not user
  dates=$(echo "$raw" | grep -oE '"created_at":"[A-Z][a-z]{2} [A-Z][a-z]{2} [0-9]{2} [0-9:]{8} \+0000 [0-9]{4}"' | sed 's/"created_at":"//;s/"//')
  
  if [ -z "$dates" ]; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"no_tweets\",\"followers\":${followers:-0}}" >> "$OUTPUT"
    echo "  [$COUNT/$TOTAL] $handle: NO TWEETS (followers: ${followers:-?})"
    sleep 3
    continue
  fi
  
  # Find the most recent date
  latest_ts=0
  latest_str=""
  while IFS= read -r datestr; do
    # Parse: "Mon Jan 20 17:44:48 +0000 2025"
    ts=$(date -j -f "%a %b %d %H:%M:%S +0000 %Y" "$datestr" +%s 2>/dev/null)
    if [ -n "$ts" ] && [ "$ts" -gt "$latest_ts" ]; then
      latest_ts=$ts
      latest_str=$datestr
    fi
  done <<< "$dates"
  
  if [ "$latest_ts" -eq 0 ]; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"date_parse_error\",\"followers\":${followers:-0}}" >> "$OUTPUT"
    echo "  [$COUNT/$TOTAL] $handle: DATE PARSE ERROR"
    sleep 3
    continue
  fi
  
  days_ago=$(( (NOW - latest_ts) / 86400 ))
  last_date=$(date -j -f "%s" "$latest_ts" "+%Y-%m-%d" 2>/dev/null)
  
  if [ "$days_ago" -le 7 ]; then
    status="ACTIVE"
  elif [ "$days_ago" -le 30 ]; then
    status="MODERATE"  
  else
    status="INACTIVE"
  fi
  
  echo "{\"handle\":\"$handle\",\"status\":\"$status\",\"last_tweet\":\"$last_date\",\"days_ago\":$days_ago,\"followers\":${followers:-0}}" >> "$OUTPUT"
  echo "  [$COUNT/$TOTAL] $handle: $status ($last_date, ${days_ago}d, ${followers:-?} followers)"
  
  sleep 3
done

echo ""
echo "=== DONE ==="
echo "Total: $TOTAL"
echo "ACTIVE:    $(grep -c '"ACTIVE"' "$OUTPUT")"
echo "MODERATE:  $(grep -c '"MODERATE"' "$OUTPUT")"
echo "INACTIVE:  $(grep -c '"INACTIVE"' "$OUTPUT")"
echo "UNCERTAIN: $(grep -c '"UNCERTAIN"' "$OUTPUT")"
