#!/bin/bash
# Verify X accounts via syndication API
AUTH_TOKEN="9a90162cad8ecbe888dc05d97af9fc40c5fbe1bf"
CT0="f17ab672a1e8016cbaca3c2a92b401166fefd61673940cee886678b5c386b481dfedba1be2ef49d34b09c33c0502489d9a403b9f1f7b4aa0bd1de24552c6b9e34a3258e3e09bd3162aeaa5c97a7d2052"
BEARER="AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"

ACCOUNTS=(lookonchain EmberCN ai_9684xtpa MustStopMurad DefiIgnas Pentosh1 CryptoHayes inversebrah Route2FI CryptoCred WuBlockchain tier10k TheDeFiEdge cz_binance VitalikButerin saylor bitcoinmagazine watcherguru coindesk cointelegraph whale_alert 100trillionUSD CathieDWood APompliano MMCrypto brian_armstrong TheMoonCarl RaoulGMI balajis DocumentingBTC polymarket scottmelker AutismCapital CryptoCapo_ cryptomanran zachxbt cobie PeterLBrandt CryptoGodJohn davincij15 Elliotrades ErikVoorhees blknoiz06 BarrySilbert aantonop adam3us CryptoKaleo Crypto_Birb DonAlt MilesDeutscher glassnode CryptoRank_io CryptoTony__ Trader_XO IvanOnTech punk6529 MessariCrypto CredibleCrypto CryptoWendyO EmperorBTC KaitoAI DaanCrypto Rewkang nebraskangooner GCRClassic ericbalchunas KoroushAK DefiLlama nansen_ai ColdBloodShill Bankless cburniske geiger_capital gainzy222 LomahCrypto SOLBigBrain MoonOverlord sassal0x CryptoDiffer virtuals_io laurashin paradigm ryansadams AltcoinSherpa GiganticRebirth CriptoNoticias trustlessstate hasufl GarethSoloway santimentfeed SolanaLegend a16zcrypto 0xngmi mrjasonchoi DeFi_Dad boxmining shawmakesmagic TaschaLabs 0xSisyphus JasonYanowitz CroissantEth JulianHosp Spot_On_Chain HsakaTrades Pentoshi theblock__ AltcoinDailyio BTC_Archive aixbt_agent BitcoinArchive willywoo intocryptoverse danheld TheCryptoDog CryptoMichNL WClemente IncomeSharks markminervini maxkeiser eliz883 PeterMcCormack PrestonPysh TechDev_52 jackmallers lopp JamesWynnReal Breedlove22 nic_carter AndreCronjeTech DylanLeClair DegenerateNews saifedean MuroCrypto alphatrends JeffBooth BigCheds BobLoukas Trader_Dante cryptorand mert TuurDemeester cryptoquant_com ThinkingUSD bbands MartyBent gladstein CaitlinLong_ SimonDixonTwitt TrueCrypto28 SatoshiFlipper jespow udiWertheimer rendernetwork TraderLion JanaCryptoQueen ercwl FossGregfoss ZeroHedge_ caprioleio OGDfarmer CryptoJelleNL Cryptoyieldinfo BagCalls EvgenyGaevoy RunnerXBT CamiRusso CryptoHornHairs DeFianceCapital FrankResearcher ErgoBTC)

echo "Total accounts: ${#ACCOUNTS[@]}"
echo "---"

DEAD=()
ALIVE=()

for acct in "${ACCOUNTS[@]}"; do
  RESP=$(curl -s --max-time 10 "https://syndication.twitter.com/srv/timeline-profile/screen-name/${acct}" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
  
  # Check if suspended or not found
  if echo "$RESP" | grep -qi "suspended\|doesn.t exist\|account has been suspended\|This account doesn"; then
    echo "DEAD: $acct (suspended/not found)"
    DEAD+=("$acct")
  elif echo "$RESP" | grep -qi "data-testid\|TweetText\|UserName\|tweet-"; then
    echo "OK: $acct"
    ALIVE+=("$acct")
  elif [ -z "$RESP" ] || echo "$RESP" | grep -qi "error\|rate limit\|429"; then
    echo "SKIP: $acct (rate limited or error)"
    ALIVE+=("$acct")  # keep if unsure
  else
    # Check for empty/minimal response indicating dead account
    RESP_LEN=${#RESP}
    if [ "$RESP_LEN" -lt 500 ]; then
      echo "DEAD: $acct (empty response, len=$RESP_LEN)"
      DEAD+=("$acct")
    else
      echo "OK: $acct (len=$RESP_LEN)"
      ALIVE+=("$acct")
    fi
  fi
  sleep 0.5
done

echo "=== SUMMARY ==="
echo "Alive: ${#ALIVE[@]}"
echo "Dead: ${#DEAD[@]}"
echo "Dead accounts: ${DEAD[*]}"

# Save results
echo "${DEAD[*]}" > /tmp/x_dead_accounts.txt
echo "${ALIVE[*]}" > /tmp/x_alive_accounts.txt
