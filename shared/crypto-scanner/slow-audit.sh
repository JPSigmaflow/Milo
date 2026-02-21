#!/bin/bash
OUTDIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-results2"
mkdir -p "$OUTDIR"

HANDLES=(lookonchain EmberCN ai_9684xtpa 0xJeff_ MustStopMurad DefiIgnas Pentosh1 CryptoHayes inversebrah Route2FI CryptoCred WuBlockchain tier10k db_defi TheDeFiEdge cobie GCRClassic CryptoCapo_ CredibleCrypto ColdBloodShill DaanCrypto SmartContracter CryptoKaleo AltcoinSherpa CryptoGodJohn blknoiz06 zachxbt TheMoonCarl gainzy222 Trader_XO CryptoTony__ GiganticRebirth MoonOverlord Elliotrades KoroushAK LomahCrypto ErgoBTC 100trillionUSD APompliano scottmelker CryptoCapital_V Crypto_Birb PeterLBrandt CryptoMaestro_ cryptomanran MessariCrypto nansen_ai DefiLlama whale_alert santimentfeed glassnode IntoTheBlock MilesDeutscher RaoulGMI balajis VitalikButerin Rewkang BarrySilbert CathieDWood cburniske ErikVoorhees aantonop adam3us laurashin CamiRusso Zeneca_33 punk6529 brian_armstrong SOLBigBrain SolanaLegend ansem JasonYanowitz TaschaLabs CryptoDiffer CryptoRank_io RunnerXBT IvanOnTech boxmining ai16zdao shawmakesmagic jimfan 0xSisyphus DeFi_Dad Tetranode andrecronje LayerZero_Labs CelestiaOrg willclemente CroissantEth AutismCapital 0xHamz mrjasonchoi hasufl FrankResearcher 0xngmi DonAlt Bankless DeFianceCapital a16zcrypto EmperorBTC nebraskangooner CryptoWendyO sassal0x DocumentingBTC saylor davincij15 GarethSoloway KaitoAI virtuals_io blocktrainer btcecho JulianHosp HossDE Blockmagazin InvestmentPunk roman_reher finanzfluss marc_friedrich MMCrypto KryptoKumpel CriptoNoticias CriptoDinero Matidroid JuanEnCripto Criptomonedas_ CryptoSpanish Cripto247 CriptoTendencia elonmusk cz_binance paradigm coindesk cointelegraph bitcoinmagazine watcherguru polymarket ericbalchunas cdixon ryansadams trustlessstate johnedeaton1 peterschiff drakefjustin xcopyart geiger_capital marionawfal)

total=${#HANDLES[@]}
echo "Checking $total handles with 2s delay each..."

for i in "${!HANDLES[@]}"; do
  handle="${HANDLES[$i]}"
  n=$((i+1))
  
  response=$(curl -sL --max-time 10 \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" 2>/dev/null)
  
  if echo "$response" | grep -q "Rate limit"; then
    echo "$n/$total ${handle}: RATE_LIMITED"
    echo "${handle}|RATE_LIMITED|" > "$OUTDIR/${handle}.txt"
    sleep 5
    continue
  fi
  
  if [ -z "$response" ] || [ ${#response} -lt 50 ]; then
    echo "$n/$total ${handle}: NO_RESPONSE (${#response} bytes)"
    echo "${handle}|NO_RESPONSE|" > "$OUTDIR/${handle}.txt"
    sleep 2
    continue
  fi
  
  # Save raw response size for debugging
  rsize=${#response}
  
  # Extract dates - try multiple patterns
  dates=$(echo "$response" | grep -oE 'datetime="[^"]*"' | sed 's/datetime="//;s/"//' | sort -r | head -1)
  
  if [ -z "$dates" ]; then
    dates=$(echo "$response" | grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | sort -r | head -1)
  fi
  
  if [ -z "$dates" ]; then
    echo "$n/$total ${handle}: NO_DATES (${rsize} bytes)"
    # Save first 500 chars for analysis
    echo "$response" | head -c 500 > "$OUTDIR/${handle}_raw.txt"
    echo "${handle}|NO_DATES_${rsize}|" > "$OUTDIR/${handle}.txt"
  else
    echo "$n/$total ${handle}: $dates"
    echo "${handle}|${dates}|" > "$OUTDIR/${handle}.txt"
  fi
  
  sleep 2
done

echo "DONE"
