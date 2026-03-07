#!/bin/bash
# Full Audit Script - 2026-02-18
# Results directory
DIR="/Users/milo/.openclaw/workspace/shared/crypto-scanner"
RESULTS="$DIR/audit-results"
mkdir -p "$RESULTS"

echo "=== YOUTUBE AUDIT ==="
cat > "$RESULTS/youtube.txt" << 'YTEOF'
YTEOF

# YouTube channels
declare -a YT_IDS=(
"UCKQvGU-qtjGlArsgMu7Bcrg"
"UCbLhGKVY-bJPcawebgtNfbw"
"UCQrbbJKCRbsTCaK9xf34sZQ"
"UCAl9Ld79qaZxp9JzEOwd3aA"
"UCRvqjQPSeaWn-uEx-w0XOIg"
"UCjemQfjaXAzA-95RKoy9n_g"
"UCxODjeUwZHk3p-7TU-IsDOA"
"UCROBQsU_ABJQ2wBhdT_aBfQ"
"UCqK_GSMbpiV8spgD3ZGloSw"
"UCB_HBJoETFHCIjDXBO2GGWA"
"UCN9Nj4tjXbVTLYWN0EKly_Q"
"UCuSGhbOAgNR1KQMz2-yz_CA"
"UC67AEEecqFEc92nVEqBreiA"
"UCQglaVhGOsHop6McJKVYH_A"
"UC6F5vfcNu-R3OGR9FXNwrig"
"UCI7M65p3A-D3P4v5qW8POxQ"
"UCY0xL8V6NzzFcwzHCgB8orQ"
"UCCatR7nWbYrkVXdxXb4cGXw"
"UCJgHxpqfitLFB2eJKMGMhiA"
"UCMtJYS0PrtiUwlk6zjGDEMA"
"UCh1ob28ceGdqohUnR7vBACA"
"UClgJyzwGs-GyaNxUHcLZrkg"
"UCrYmtJBtLdtm2ov84ulV-yg"
"UC8s-JMdZEUHkXpGOPQzIC2g"
"UCl2oCaw8hdR_kbqyqd2klIA"
"UCVVX-7tHff75fRAEEEnZiAQ"
"UCkiJFEfm3HmrEZMwzG5CYg"
"UCBH5VZE_Y4F3CMcPIzPEB5A"
"UCkU60bz7Uk55HiiRH5Nqe9A"
"UCrDe0s5BlDAMr_dJzr1QJSA"
"UCL0J4MLEdLP0-UyLu0hCktg"
"UCc4Rz_T9Sb1w5SVhGoCbDyw"
"UCWiiMnsnw5Isc2PP1wFe1BQ"
"UCsYYksPHiGqXHPoHI-fm5sg"
)

declare -a YT_NAMES=(
"Alex Becker"
"Altcoin Daily"
"Anthony Pompliano"
"Bankless"
"Benjamin Cowen"
"BitBoy Crypto"
"Boxmining"
"Brian Jung"
"Coin Bureau"
"Coin Bureau Clips"
"Crypto Banter"
"Crypto Casey"
"Crypto Daily"
"Crypto Jebb"
"Crypto Mobster"
"CryptosRUs"
"Dapp University"
"DataDash"
"Digital Asset News"
"EllioTrades"
"Finematics"
"InvestAnswers"
"Ivan on Tech"
"JRNY Crypto"
"Lark Davis"
"Miles Deutscher"
"Paul Barron Network"
"Raoul Pal (Real Vision)"
"Sheldon Evans"
"Taiki Maeda"
"The Defiant"
"The Moon Carl"
"Unchained Podcast"
"Whiteboard Crypto"
)

yt_active=0
yt_dead=0
yt_dead_list=""
for i in "${!YT_IDS[@]}"; do
  id="${YT_IDS[$i]}"
  name="${YT_NAMES[$i]}"
  resp=$(curl -sL --max-time 8 "https://www.youtube.com/feeds/videos.xml?channel_id=$id" 2>/dev/null)
  if echo "$resp" | grep -q "<entry>"; then
    echo "ACTIVE: $name ($id)"
    ((yt_active++))
  else
    echo "DEAD: $name ($id)"
    ((yt_dead++))
    yt_dead_list="$yt_dead_list|$name|$id"
  fi
  sleep 0.5
done
echo "YT_SUMMARY: total=34 active=$yt_active dead=$yt_dead"
echo "YT_DEAD_LIST:$yt_dead_list"
echo ""

echo "=== INSTAGRAM AUDIT ==="
declare -a IG_ACCOUNTS=(
"cryptonary" "cryptoexplorer" "bitboy_crypto" "altcoindaily" "sharecrypto"
"cointelegraph" "coindesk" "coingrams" "thecryptograph" "investdiva"
"coin.bureau" "coinmarketcap" "coingecko" "bitcoinmagazine"
"thecryptolarkdavisofficial" "vitallybuterin" "coinbase" "binance" "solana"
"layahheilpern" "cryptowendyo" "cryptohumor" "thefatbitcoin" "cryptojack"
"cryptocasey" "girl_gone_crypto" "felix_hartmann" "thecryptolark" "ivanontech"
"cryptofinally" "coinstats" "thecoinrise" "cryptostache" "scottmelker"
"crypto_daily" "cryptoland_" "polkadotnetwork" "thedefiant.io" "cryptoworldjosh"
"krypticrooks" "tombilyeu" "nftcollector" "cryptomason" "cryptobanter"
)

ig_active=0
ig_dead=0
ig_dead_list=""
for acct in "${IG_ACCOUNTS[@]}"; do
  resp=$(curl -sL --max-time 8 "https://www.instagram.com/api/v1/users/web_profile_info/?username=$acct" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
    -H "X-IG-App-ID: 936619743392459" 2>/dev/null)
  if echo "$resp" | grep -q '"user"'; then
    echo "ACTIVE: $acct"
    ((ig_active++))
  else
    # Check if it's a login redirect or actual 404
    if echo "$resp" | grep -q "login" || echo "$resp" | grep -q "require_login"; then
      echo "UNCLEAR: $acct (login required)"
    else
      echo "DEAD: $acct"
      ((ig_dead++))
      ig_dead_list="$ig_dead_list|$acct"
    fi
  fi
  sleep 1
done
echo "IG_SUMMARY: total=44 active=$ig_active dead=$ig_dead"
echo "IG_DEAD_LIST:$ig_dead_list"
echo ""

echo "=== REDDIT AUDIT ==="
declare -a REDDIT_SUBS=(
"0xPolygon" "AirdropAlert" "airdrops" "algorand" "altcoin" "AltStreetBets"
"Aptos" "arbitrum" "ArtificialInteligence" "Avalanche" "Avax" "BaseChain"
"binance" "bitcoin" "BitcoinDE" "bitcoinmarkets" "Buttcoin" "cardano"
"Chainlink" "cosmosnetwork" "CryptoAirdrops" "CryptoAnalysis" "CryptoCurrencies"
"cryptocurrency" "CryptoCurrencyTrading" "CryptoGemDiscovery" "CryptoIndia"
"CryptoMarkets" "CryptoMars" "CryptoMexico" "CryptoMoonShots" "CryptoReality"
"CryptoTechnology" "CryptoTrading" "defi" "DeFiChain" "depin" "dogecoin"
"ethereum" "ethfinance" "ethtrader" "Fantom" "Hedera" "ICOCrypto" "injective"
"Kaspa" "layer2" "LiquidityMining" "Litecoin" "LowCapCrypto" "MakerDAO"
"memecoin" "Monero" "NEARProtocol" "NFT" "NFTsMarketplace" "opensea"
"Optimism" "pennycryptocurrency" "polkadot" "Ripple" "SatoshiStreetBets"
"SatoshiStreetDegens" "ShibArmy" "singularitynet" "solana" "SolanaMemecoin"
"SSBcrackheads" "Stacks" "Stellar" "Sui" "technicalanalysis"
"TechnicalAnalysis_Crypto" "Tezos" "Toncoin" "UniSwap" "VeChain"
"wallstreetbetscrypto" "XRP" "yield_farming" "zkSync"
)

reddit_active=0
reddit_dead=0
reddit_dead_list=""
for sub in "${REDDIT_SUBS[@]}"; do
  resp=$(curl -sL --max-time 8 -H "User-Agent: MiloCryptoBot/1.0" "https://www.reddit.com/r/$sub/about.json" 2>/dev/null)
  if echo "$resp" | grep -q '"subscribers"'; then
    subs=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('subscribers',0))" 2>/dev/null)
    if [ "$subs" -gt 0 ] 2>/dev/null; then
      echo "ACTIVE: r/$sub ($subs subscribers)"
      ((reddit_active++))
    else
      echo "DEAD: r/$sub (0 subscribers)"
      ((reddit_dead++))
      reddit_dead_list="$reddit_dead_list|$sub"
    fi
  else
    if echo "$resp" | grep -q "banned\|private\|404\|Forbidden"; then
      echo "DEAD: r/$sub (banned/private/404)"
      ((reddit_dead++))
      reddit_dead_list="$reddit_dead_list|$sub"
    else
      echo "UNCLEAR: r/$sub"
    fi
  fi
  sleep 1
done
echo "REDDIT_SUMMARY: total=81 active=$reddit_active dead=$reddit_dead"
echo "REDDIT_DEAD_LIST:$reddit_dead_list"
echo ""

echo "=== PHASE 1 COMPLETE (YT/IG/Reddit) ==="
