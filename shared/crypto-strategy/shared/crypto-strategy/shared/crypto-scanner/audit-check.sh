#!/bin/bash
# KOL Audit Script - checks all handles via syndication API
OUTDIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner/audit-results"
mkdir -p "$OUTDIR"

check_handle() {
  local handle="$1"
  local outfile="$OUTDIR/${handle}.txt"
  local response=$(curl -sL --max-time 15 "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" 2>/dev/null)
  
  if [ -z "$response" ]; then
    echo "${handle}|NO_RESPONSE|" > "$outfile"
    return
  fi
  
  # Try to extract datetime attributes (ISO format)
  local dates=$(echo "$response" | grep -oE 'datetime="[^"]*"' | head -5 | sed 's/datetime="//;s/"//')
  
  if [ -z "$dates" ]; then
    # Try data-time or other date patterns
    dates=$(echo "$response" | grep -oE '20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -5)
  fi
  
  if [ -z "$dates" ]; then
    # Try another pattern - sometimes dates in JSON
    dates=$(echo "$response" | grep -oE '"created_at":"[^"]*"' | head -5 | sed 's/"created_at":"//;s/"//')
  fi
  
  if [ -z "$dates" ]; then
    echo "${handle}|NO_DATES|" > "$outfile"
  else
    local latest=$(echo "$dates" | sort -r | head -1)
    echo "${handle}|${latest}|" > "$outfile"
  fi
}

export -f check_handle
export OUTDIR

# All handles
HANDLES="lookonchain EmberCN ai_9684xtpa 0xJeff_ MustStopMurad DefiIgnas Pentosh1 CryptoHayes inversebrah Route2FI CryptoCred WuBlockchain tier10k db_defi TheDeFiEdge cobie GCRClassic CryptoCapo_ CredibleCrypto ColdBloodShill DaanCrypto SmartContracter CryptoKaleo AltcoinSherpa CryptoGodJohn blknoiz06 zachxbt TheMoonCarl gainzy222 Trader_XO CryptoTony__ GiganticRebirth MoonOverlord Elliotrades KoroushAK LomahCrypto ErgoBTC 100trillionUSD APompliano scottmelker CryptoCapital_V Crypto_Birb PeterLBrandt CryptoMaestro_ cryptomanran MessariCrypto nansen_ai DefiLlama whale_alert santimentfeed glassnode IntoTheBlock MilesDeutscher RaoulGMI balajis VitalikButerin Rewkang BarrySilbert CathieDWood cburniske ErikVoorhees aantonop adam3us laurashin CamiRusso Zeneca_33 punk6529 brian_armstrong SOLBigBrain SolanaLegend ansem JasonYanowitz TaschaLabs CryptoDiffer CryptoRank_io RunnerXBT IvanOnTech boxmining ai16zdao shawmakesmagic jimfan 0xSisyphus DeFi_Dad Tetranode andrecronje LayerZero_Labs CelestiaOrg willclemente CroissantEth AutismCapital 0xHamz mrjasonchoi hasufl FrankResearcher 0xngmi DonAlt Bankless DeFianceCapital a16zcrypto EmperorBTC nebraskangooner CryptoWendyO sassal0x DocumentingBTC saylor davincij15 GarethSoloway KaitoAI virtuals_io blocktrainer btcecho JulianHosp HossDE Blockmagazin InvestmentPunk roman_reher finanzfluss marc_friedrich MMCrypto KryptoKumpel CriptoNoticias CriptoDinero Matidroid JuanEnCripto Criptomonedas_ CryptoSpanish Cripto247 CriptoTendencia elonmusk cz_binance paradigm coindesk cointelegraph bitcoinmagazine watcherguru polymarket ericbalchunas cdixon ryansadams trustlessstate johnedeaton1 peterschiff drakefjustin xcopyart geiger_capital marionawfal"

echo "$HANDLES" | tr ' ' '\n' | xargs -P 15 -I{} bash -c 'check_handle "{}"'

echo "DONE - $(ls $OUTDIR | wc -l) accounts checked"
