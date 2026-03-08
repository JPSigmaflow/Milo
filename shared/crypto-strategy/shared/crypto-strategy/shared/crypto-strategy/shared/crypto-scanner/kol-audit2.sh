#!/bin/bash
# KOL Activity Audit v2 - macOS compatible, with rate limit handling
OUTPUT="/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-results.jsonl"
> "$OUTPUT"

# All unique handles
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

# Deduplicate
HANDLES=($(printf '%s\n' "${HANDLES[@]}" | sort -u))
TOTAL=${#HANDLES[@]}
echo "Checking $TOTAL unique accounts..."

COUNT=0
for handle in "${HANDLES[@]}"; do
  COUNT=$((COUNT + 1))
  
  # Fetch with retry on rate limit
  for attempt in 1 2 3; do
    html=$(curl -sL --max-time 15 \
      -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
      "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" 2>/dev/null)
    
    if echo "$html" | grep -qi "Rate limit"; then
      echo "  [$COUNT/$TOTAL] $handle: RATE LIMITED (attempt $attempt, waiting 30s...)"
      sleep 30
      continue
    fi
    break
  done
  
  if [ -z "$html" ] || echo "$html" | grep -qi "Rate limit"; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"rate_limited\"}" >> "$OUTPUT"
    echo "  [$COUNT/$TOTAL] $handle: RATE LIMITED (skipped)"
    sleep 2
    continue
  fi
  
  # Check for error/suspended/not found
  if echo "$html" | grep -qi "doesn't exist\|suspended\|This account doesn"; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"not_found_or_suspended\"}" >> "$OUTPUT"
    echo "  [$COUNT/$TOTAL] $handle: NOT FOUND/SUSPENDED"
    sleep 2
    continue
  fi
  
  # Extract datetime from <time> tags - macOS compatible
  # The syndication API returns HTML with <time datetime="2026-02-14T..."> tags
  latest_date=$(echo "$html" | grep -o 'datetime="[0-9T:ZZ.+\-]*"' | head -1 | sed 's/datetime="//;s/"//' | cut -dT -f1)
  
  if [ -z "$latest_date" ]; then
    # Try extracting from data attributes or other patterns
    latest_date=$(echo "$html" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1 | cut -dT -f1)
  fi
  
  if [ -z "$latest_date" ]; then
    # Check if page has content at all
    content_len=$(echo "$html" | wc -c | tr -d ' ')
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"no_date_found\",\"html_bytes\":$content_len}" >> "$OUTPUT"
    echo "  [$COUNT/$TOTAL] $handle: NO DATE FOUND (${content_len}b)"
    sleep 2
    continue
  fi
  
  # Calculate days since last tweet (macOS date)
  now=$(date +%s)
  tweet_ts=$(date -j -f "%Y-%m-%d" "$latest_date" +%s 2>/dev/null)
  if [ -z "$tweet_ts" ]; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"date_parse_error\",\"raw_date\":\"$latest_date\"}" >> "$OUTPUT"
    echo "  [$COUNT/$TOTAL] $handle: DATE PARSE ERROR ($latest_date)"
    sleep 2
    continue
  fi
  
  days_ago=$(( (now - tweet_ts) / 86400 ))
  
  if [ "$days_ago" -le 7 ]; then
    status="ACTIVE"
  elif [ "$days_ago" -le 30 ]; then
    status="MODERATE"
  else
    status="INACTIVE"
  fi
  
  echo "{\"handle\":\"$handle\",\"status\":\"$status\",\"last_tweet\":\"$latest_date\",\"days_ago\":$days_ago}" >> "$OUTPUT"
  echo "  [$COUNT/$TOTAL] $handle: $status ($latest_date, ${days_ago}d ago)"
  
  # 2 second delay between requests
  sleep 2
done

echo ""
echo "Done! Results in $OUTPUT"
echo "Total: $TOTAL"
echo "ACTIVE:    $(grep -c '"ACTIVE"' "$OUTPUT")"
echo "MODERATE:  $(grep -c '"MODERATE"' "$OUTPUT")"
echo "INACTIVE:  $(grep -c '"INACTIVE"' "$OUTPUT")"
echo "UNCERTAIN: $(grep -c '"UNCERTAIN"' "$OUTPUT")"
