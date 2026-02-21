#!/bin/bash
# Use node to fetch and parse - sequential with delays via web_fetch workaround
# Actually let's just use curl with delays between each request

OUTDIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-results2"
mkdir -p "$OUTDIR"

ACCOUNTS=(
cobie GCRClassic CryptoCapo_ CredibleCrypto ColdBloodShill DaanCrypto SmartContracter CryptoKaleo AltcoinSherpa CryptoGodJohn
blknoiz06 zachxbt TheMoonCarl gainzy222 Trader_XO CryptoTony__ GiganticRebirth MoonOverlord Elliotrades KoroushAK
LomahCrypto ErgoBTC 100trillionUSD APompliano scottmelker CryptoCapital_V Crypto_Birb PeterLBrandt CryptoMaestro_ cryptomanran
MessariCrypto nansen_ai DefiLlama whale_alert santimentfeed glassnode IntoTheBlock MilesDeutscher RaoulGMI balajis
VitalikButerin Rewkang BarrySilbert CathieDWood cburniske ErikVoorhees aantonop adam3us laurashin CamiRusso
Zeneca_33 punk6529 brian_armstrong SOLBigBrain SolanaLegend ansem JasonYanowitz TaschaLabs CryptoDiffer CryptoRank_io
RunnerXBT IvanOnTech boxmining ai16zdao shawmakesmagic jimfan 0xSisyphus DeFi_Dad Tetranode andrecronje
LayerZero_Labs CelestiaOrg willclemente CroissantEth AutismCapital 0xHamz mrjasonchoi hasufl FrankResearcher 0xngmi
DonAlt Bankless DeFianceCapital a16zcrypto EmperorBTC nebraskangooner CryptoWendyO sassal0x DocumentingBTC saylor
davincij15 GarethSoloway KaitoAI virtuals_io blocktrainer btcecho JulianHosp HossDE Blockmagazin InvestmentPunk
roman_reher finanzfluss marc_friedrich MMCrypto KryptoKumpel CriptoNoticias CriptoDinero Matidroid JuanEnCripto Criptomonedas_
CryptoSpanish Cripto247 CriptoTendencia
elonmusk cz_binance paradigm coindesk cointelegraph bitcoinmagazine watcherguru polymarket ericbalchunas cdixon
ryansadams trustlessstate johnedeaton1 peterschiff drakefjustin tier10k xcopyart geiger_capital marionawfal
lookonchain EmberCN ai_9684xtpa 0xJeff_ MustStopMurad DefiIgnas Pentosh1 CryptoHayes inversebrah Route2FI
CryptoCred WuBlockchain db_defi TheDeFiEdge
)

echo "Total: ${#ACCOUNTS[@]} accounts"
COUNT=0

for handle in "${ACCOUNTS[@]}"; do
  COUNT=$((COUNT+1))
  outfile="$OUTDIR/${handle}.txt"
  
  # Skip if already fetched successfully
  if [ -f "$outfile" ] && ! grep -q "RATELIMIT\|NODATA" "$outfile" 2>/dev/null; then
    echo "[$COUNT] $handle: CACHED"
    continue
  fi
  
  html=$(curl -sL --max-time 20 \
    -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' \
    -H 'Accept: text/html,application/xhtml+xml' \
    -H 'Accept-Language: en-US,en;q=0.9' \
    "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" 2>/dev/null)
  
  if echo "$html" | grep -q "Rate limit"; then
    echo "RATELIMIT" > "$outfile"
    echo "[$COUNT] $handle: RATELIMIT - waiting 30s"
    sleep 30
    # Retry once
    html=$(curl -sL --max-time 20 \
      -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' \
      "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" 2>/dev/null)
    if echo "$html" | grep -q "Rate limit"; then
      echo "[$COUNT] $handle: STILL RATELIMITED"
      continue
    fi
  fi
  
  if [ -z "$html" ]; then
    echo "NODATA" > "$outfile"
    echo "[$COUNT] $handle: NODATA"
    sleep 3
    continue
  fi
  
  # Extract ALL created_at dates to find the most recent one
  dates=$(echo "$html" | perl -ne 'while (/"created_at":"([^"]+)"/g) { print "$1\n" }' | head -20)
  
  if [ -z "$dates" ]; then
    echo "NODATE" > "$outfile"
    echo "[$COUNT] $handle: NODATE"
  else
    # Get the most recent date (they should be in order but let's sort)
    most_recent=$(echo "$dates" | head -1)
    echo "$most_recent" > "$outfile"
    echo "[$COUNT] $handle: $most_recent"
  fi
  
  sleep 4
done

echo "=== DONE ==="
