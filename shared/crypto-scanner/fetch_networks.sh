#!/bin/bash
mkdir -p /tmp/kol-network

fetch_timeline() {
  local handle=$1
  local outfile="/tmp/kol-network/${handle}.html"
  curl -s -L --max-time 15 \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
    "https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}" > "$outfile" 2>/dev/null
  local size=$(wc -c < "$outfile" | tr -d ' ')
  echo "${handle}: ${size} bytes"
}

# Tier 1 (>250K) - the big fish
TIER1=(cobie CryptoCapo_ CredibleCrypto DaanCrypto CryptoKaleo zachxbt MoonOverlord APompliano scottmelker Crypto_Birb PeterLBrandt MilesDeutscher RaoulGMI balajis VitalikButerin punk6529 brian_armstrong ansem DonAlt EmperorBTC saylor DocumentingBTC willclemente aantonop ErikVoorhees CathieDWood 100trillionUSD Bankless a16zcrypto DaanCrypto IvanOnTech whale_alert LayerZero_Labs)

# Tier 2 (100K-250K)
TIER2=(GCRClassic AltcoinSherpa CryptoGodJohn blknoiz06 gainzy222 Trader_XO CryptoTony__ GiganticRebirth KoroushAK LomahCrypto adam3us CamiRusso Zeneca_33 SolanaLegend JasonYanowitz TaschaLabs CryptoDiffer CryptoRank_io RunnerXBT boxmining ai16zdao shawmakesmagic 0xSisyphus DeFi_Dad Tetranode andrecronje CroissantEth AutismCapital 0xHamz mrjasonchoi hasufl 0xngmi nebraskangooner CryptoWendyO sassal0x KaitoAI virtuals_io MMCrypto CriptoNoticias JuanEnCripto cryptomanran santimentfeed IntoTheBlock Rewkang DeFianceCapital SOLBigBrain Elliotrades TheMoonCarl BarrySilbert laurashin cburniske nansen_ai glassnode DefiLlama MessariCrypto CelestiaOrg jimfan davincij15 GarethSoloway ColdBloodShill SmartContracter)

echo "=== Fetching Tier 1 ==="
for h in "${TIER1[@]}"; do
  fetch_timeline "$h" &
done
wait

echo "=== Fetching Tier 2 ==="
for h in "${TIER2[@]}"; do
  fetch_timeline "$h" &
done
wait

echo "=== DONE ==="
