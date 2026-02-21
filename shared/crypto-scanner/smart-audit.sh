#!/bin/bash
OUTDIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-results3"
mkdir -p "$OUTDIR"

HANDLES=(lookonchain EmberCN ai_9684xtpa 0xJeff_ MustStopMurad DefiIgnas Pentosh1 CryptoHayes inversebrah Route2FI CryptoCred WuBlockchain tier10k db_defi TheDeFiEdge cobie GCRClassic CryptoCapo_ CredibleCrypto ColdBloodShill DaanCrypto SmartContracter CryptoKaleo AltcoinSherpa CryptoGodJohn blknoiz06 zachxbt TheMoonCarl gainzy222 Trader_XO CryptoTony__ GiganticRebirth MoonOverlord Elliotrades KoroushAK LomahCrypto ErgoBTC 100trillionUSD APompliano scottmelker CryptoCapital_V Crypto_Birb PeterLBrandt CryptoMaestro_ cryptomanran MessariCrypto nansen_ai DefiLlama whale_alert santimentfeed glassnode IntoTheBlock MilesDeutscher RaoulGMI balajis VitalikButerin Rewkang BarrySilbert CathieDWood cburniske ErikVoorhees aantonop adam3us laurashin CamiRusso Zeneca_33 punk6529 brian_armstrong SOLBigBrain SolanaLegend ansem JasonYanowitz TaschaLabs CryptoDiffer CryptoRank_io RunnerXBT IvanOnTech boxmining ai16zdao shawmakesmagic jimfan 0xSisyphus DeFi_Dad Tetranode andrecronje LayerZero_Labs CelestiaOrg willclemente CroissantEth AutismCapital 0xHamz mrjasonchoi hasufl FrankResearcher 0xngmi DonAlt Bankless DeFianceCapital a16zcrypto EmperorBTC nebraskangooner CryptoWendyO sassal0x DocumentingBTC saylor davincij15 GarethSoloway KaitoAI virtuals_io blocktrainer btcecho JulianHosp HossDE Blockmagazin InvestmentPunk roman_reher finanzfluss marc_friedrich MMCrypto KryptoKumpel CriptoNoticias CriptoDinero Matidroid JuanEnCripto Criptomonedas_ CryptoSpanish Cripto247 CriptoTendencia elonmusk cz_binance paradigm coindesk cointelegraph bitcoinmagazine watcherguru polymarket ericbalchunas cdixon ryansadams trustlessstate johnedeaton1 peterschiff drakefjustin xcopyart geiger_capital marionawfal)

total=${#HANDLES[@]}
echo "Total: $total handles"

i=0
while [ $i -lt $total ]; do
  handle="${HANDLES[$i]}"
  
  # Skip if already have good data
  if [ -f "$OUTDIR/${handle}.txt" ]; then
    existing=$(cat "$OUTDIR/${handle}.txt")
    if ! echo "$existing" | grep -qE "RATE_LIMITED|NO_RESPONSE|EMPTY"; then
      ((i++))
      continue
    fi
  fi
  
  # Get response with headers
  tmpfile=$(mktemp)
  curl -sL --max-time 10 -D - \
    "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" \
    > "$tmpfile" 2>/dev/null
  
  # Check for rate limit
  if grep -q "429" "$tmpfile" || grep -qi "rate limit" "$tmpfile"; then
    # Extract reset time
    reset=$(grep -i "x-rate-limit-reset" "$tmpfile" | grep -oE '[0-9]+' | tail -1)
    now=$(date +%s)
    if [ -n "$reset" ] && [ "$reset" -gt "$now" ]; then
      wait_secs=$((reset - now + 5))
    else
      wait_secs=900
    fi
    echo "[$i/$total] RATE LIMITED. Waiting ${wait_secs}s until $(date -r $((now + wait_secs)) '+%H:%M:%S')..."
    rm "$tmpfile"
    sleep $wait_secs
    continue  # retry same index
  fi
  
  # Extract body (after blank line)
  body=$(sed -n '/^\r*$/,$p' "$tmpfile" | tail -n +2)
  rsize=${#body}
  
  if [ $rsize -lt 100 ]; then
    echo "[$((i+1))/$total] ${handle}: EMPTY (${rsize}b)"
    echo "${handle}|EMPTY|" > "$OUTDIR/${handle}.txt"
    ((i++))
    rm "$tmpfile"
    continue
  fi
  
  # Extract dates
  latest=$(echo "$body" | grep -oE 'datetime="[^"]*"' | sed 's/datetime="//;s/"//' | sort -r | head -1)
  if [ -z "$latest" ]; then
    latest=$(echo "$body" | grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | sort -r | head -1)
  fi
  
  if [ -z "$latest" ]; then
    echo "[$((i+1))/$total] ${handle}: NO_DATES (${rsize}b)"
    echo "${handle}|NO_DATES_${rsize}|" > "$OUTDIR/${handle}.txt"
    echo "$body" | head -c 2000 > "$OUTDIR/${handle}_raw.txt"
  else
    echo "[$((i+1))/$total] ${handle}: $latest"
    echo "${handle}|${latest}|" > "$OUTDIR/${handle}.txt"
  fi
  
  ((i++))
  rm "$tmpfile"
done

echo ""
echo "=== FINAL RESULTS ==="
cat "$OUTDIR"/*.txt 2>/dev/null | grep -v "_raw" | sort
echo ""
echo "DONE at $(date)"
