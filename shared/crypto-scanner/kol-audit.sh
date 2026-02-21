#!/bin/bash
# KOL Activity Audit - Check all accounts via Twitter Syndication API
# Output: JSON lines with handle, last_tweet_date, status

OUTPUT="/Users/milo/.openclaw/workspace/shared/crypto-scanner/kol-audit-results.jsonl"
> "$OUTPUT"

# All unique handles from config, expansion, and network map
HANDLES=(
  # Config existing (28)
  lookonchain EmberCN ai_9684xtpa 0xJeff_ MustStopMurad DefiIgnas Pentosh1 CryptoHayes
  inversebrah AltcoinPsycho MerlijnTrader dieterthemieter CryptoGodJohn MoonOverlord
  CryptoBusy BTC_Archive ZssBecker Route2FI CryptoCred WuBlockchain tier10k db_defi TheDeFiEdge
  # Note: some config handles may overlap with expansion
  
  # Expansion x_verified (108) - all unique
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
  
  # Network map missing (19) - new additions
  elonmusk cz_binance paradigm coindesk cointelegraph bitcoinmagazine watcherguru polymarket
  ericbalchunas cdixon ryansadams trustlessstate johnedeaton1 peterschiff drakefjustin
  xcopyart geiger_capital marionawfal
)

# Deduplicate
HANDLES=($(printf '%s\n' "${HANDLES[@]}" | sort -u))

echo "Checking ${#HANDLES[@]} unique accounts..."

for handle in "${HANDLES[@]}"; do
  # Fetch syndication page
  html=$(curl -sL --max-time 10 "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" 2>/dev/null)
  
  if [ -z "$html" ]; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"no_response\"}" >> "$OUTPUT"
    echo "  $handle: NO RESPONSE"
    continue
  fi
  
  # Check for error/suspended/not found
  if echo "$html" | grep -qi "doesn't exist\|suspended\|not found\|error"; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"not_found_or_suspended\"}" >> "$OUTPUT"
    echo "  $handle: NOT FOUND/SUSPENDED"
    continue
  fi
  
  # Extract latest tweet datetime (ISO format in data-time or datetime attribute)
  latest_date=$(echo "$html" | grep -oP 'datetime="[^"]*"' | head -1 | grep -oP '\d{4}-\d{2}-\d{2}')
  
  if [ -z "$latest_date" ]; then
    # Try alternative: look for time element content
    latest_date=$(echo "$html" | grep -oP '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}' | head -1 | cut -dT -f1)
  fi
  
  if [ -z "$latest_date" ]; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"no_date_found\"}" >> "$OUTPUT"
    echo "  $handle: NO DATE FOUND"
    continue
  fi
  
  # Calculate days since last tweet
  now=$(date +%s)
  tweet_ts=$(date -j -f "%Y-%m-%d" "$latest_date" +%s 2>/dev/null || date -d "$latest_date" +%s 2>/dev/null)
  if [ -z "$tweet_ts" ]; then
    echo "{\"handle\":\"$handle\",\"status\":\"UNCERTAIN\",\"reason\":\"date_parse_error\",\"raw_date\":\"$latest_date\"}" >> "$OUTPUT"
    echo "  $handle: DATE PARSE ERROR ($latest_date)"
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
  echo "  $handle: $status ($latest_date, ${days_ago}d ago)"
  
  # Small delay to avoid rate limiting
  sleep 0.3
done

echo ""
echo "Done! Results in $OUTPUT"
echo "Total accounts checked: ${#HANDLES[@]}"
echo ""
echo "Summary:"
echo "  ACTIVE:    $(grep -c '"ACTIVE"' "$OUTPUT")"
echo "  MODERATE:  $(grep -c '"MODERATE"' "$OUTPUT")"
echo "  INACTIVE:  $(grep -c '"INACTIVE"' "$OUTPUT")"
echo "  UNCERTAIN: $(grep -c '"UNCERTAIN"' "$OUTPUT")"
