#!/bin/bash
OUTDIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-results3"
mkdir -p "$OUTDIR"

HANDLES=(lookonchain EmberCN ai_9684xtpa 0xJeff_ MustStopMurad DefiIgnas Pentosh1 CryptoHayes inversebrah Route2FI CryptoCred WuBlockchain tier10k db_defi TheDeFiEdge cobie GCRClassic CryptoCapo_ CredibleCrypto ColdBloodShill DaanCrypto SmartContracter CryptoKaleo AltcoinSherpa CryptoGodJohn blknoiz06 zachxbt TheMoonCarl gainzy222 Trader_XO CryptoTony__ GiganticRebirth MoonOverlord Elliotrades KoroushAK LomahCrypto ErgoBTC 100trillionUSD APompliano scottmelker CryptoCapital_V Crypto_Birb PeterLBrandt CryptoMaestro_ cryptomanran MessariCrypto nansen_ai DefiLlama whale_alert santimentfeed glassnode IntoTheBlock MilesDeutscher RaoulGMI balajis VitalikButerin Rewkang BarrySilbert CathieDWood cburniske ErikVoorhees aantonop adam3us laurashin CamiRusso Zeneca_33 punk6529 brian_armstrong SOLBigBrain SolanaLegend ansem JasonYanowitz TaschaLabs CryptoDiffer CryptoRank_io RunnerXBT IvanOnTech boxmining ai16zdao shawmakesmagic jimfan 0xSisyphus DeFi_Dad Tetranode andrecronje LayerZero_Labs CelestiaOrg willclemente CroissantEth AutismCapital 0xHamz mrjasonchoi hasufl FrankResearcher 0xngmi DonAlt Bankless DeFianceCapital a16zcrypto EmperorBTC nebraskangooner CryptoWendyO sassal0x DocumentingBTC saylor davincij15 GarethSoloway KaitoAI virtuals_io blocktrainer btcecho JulianHosp HossDE Blockmagazin InvestmentPunk roman_reher finanzfluss marc_friedrich MMCrypto KryptoKumpel CriptoNoticias CriptoDinero Matidroid JuanEnCripto Criptomonedas_ CryptoSpanish Cripto247 CriptoTendencia elonmusk cz_binance paradigm coindesk cointelegraph bitcoinmagazine watcherguru polymarket ericbalchunas cdixon ryansadams trustlessstate johnedeaton1 peterschiff drakefjustin xcopyart geiger_capital marionawfal)

total=${#HANDLES[@]}
BATCH_SIZE=25
WAIT_SECS=920  # ~15 min + buffer

echo "Total: $total handles, batch size: $BATCH_SIZE"
echo "Estimated time: ~$((total / BATCH_SIZE * WAIT_SECS / 60)) minutes"

for ((i=0; i<total; i++)); do
  handle="${HANDLES[$i]}"
  
  # Skip if already checked successfully
  if [ -f "$OUTDIR/${handle}.txt" ]; then
    existing=$(cat "$OUTDIR/${handle}.txt")
    if ! echo "$existing" | grep -qE "RATE_LIMITED|NO_RESPONSE"; then
      echo "SKIP $((i+1))/$total ${handle} (already done)"
      continue
    fi
  fi
  
  response=$(curl -sL --max-time 10 \
    "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" 2>/dev/null)
  
  if echo "$response" | grep -q "Rate limit"; then
    echo "RATE LIMITED at $((i+1))/$total (${handle}). Waiting ${WAIT_SECS}s..."
    echo "${handle}|RATE_LIMITED|" > "$OUTDIR/${handle}.txt"
    # Rewind index to retry this one
    ((i--))
    sleep $WAIT_SECS
    continue
  fi
  
  if [ -z "$response" ] || [ ${#response} -lt 100 ]; then
    echo "$((i+1))/$total ${handle}: EMPTY (${#response}b)"
    echo "${handle}|EMPTY|" > "$OUTDIR/${handle}.txt"
    continue
  fi
  
  rsize=${#response}
  
  # Extract dates
  latest=$(echo "$response" | grep -oE 'datetime="[^"]*"' | sed 's/datetime="//;s/"//' | sort -r | head -1)
  
  if [ -z "$latest" ]; then
    latest=$(echo "$response" | grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | sort -r | head -1)
  fi
  
  if [ -z "$latest" ]; then
    echo "$((i+1))/$total ${handle}: NO_DATES (${rsize}b)"
    echo "${handle}|NO_DATES_${rsize}|" > "$OUTDIR/${handle}.txt"
    # Save snippet for debug
    echo "$response" | head -c 1000 > "$OUTDIR/${handle}_raw.txt"
  else
    echo "$((i+1))/$total ${handle}: $latest"
    echo "${handle}|${latest}|" > "$OUTDIR/${handle}.txt"
  fi
done

echo ""
echo "=== RESULTS ==="
cat "$OUTDIR"/*.txt | grep -v "_raw" | sort
echo ""
echo "DONE at $(date)"
