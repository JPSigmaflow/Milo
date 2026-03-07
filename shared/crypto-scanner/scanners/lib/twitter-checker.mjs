#!/usr/bin/env node
/**
 * Twitter/X Trends Checker
 * 
 * Checks if a token/meme is trending on Twitter.
 * Uses Twitter's syndication API (no auth required).
 */

import https from 'https';

/**
 * Check Twitter for mentions/trending
 * @param {string} query - Search term (token/meme name)
 * @returns {Promise<{tweetCount: number, engagement: number, isTrending: boolean}>}
 */
export async function checkTwitter(query) {
  return new Promise((resolve) => {
    // Twitter syndication API (public, no auth)
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/search?q=${encodeURIComponent(query)}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoScanner/1.0)',
        'Referer': 'https://twitter.com'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.body) {
            // Count tweet mentions in HTML
            const tweetMatches = json.body.match(/class="timeline-Tweet"/g);
            const tweetCount = tweetMatches ? tweetMatches.length : 0;
            
            // Rough engagement estimate (likes + RTs visible in HTML)
            const likeMatches = json.body.match(/Icon--heart/g);
            const rtMatches = json.body.match(/Icon--retweet/g);
            const engagement = (likeMatches?.length || 0) + (rtMatches?.length || 0);
            
            resolve({
              tweetCount,
              engagement,
              isTrending: tweetCount > 50 || engagement > 100
            });
          } else {
            resolve({ tweetCount: 0, engagement: 0, isTrending: false });
          }
        } catch {
          resolve({ tweetCount: 0, engagement: 0, isTrending: false });
        }
      });
    }).on('error', () => {
      resolve({ tweetCount: 0, engagement: 0, isTrending: false });
    });
  });
}

/**
 * Check if account exists (for tokens with Twitter handle)
 */
export async function checkTwitterAccount(handle) {
  return new Promise((resolve) => {
    const cleanHandle = handle.replace(/^@/, '').replace(/^https?:\/\/(www\.)?twitter\.com\//, '');
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${cleanHandle}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoScanner/1.0)'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.body) {
            // Parse follower count from HTML
            const followerMatch = json.body.match(/(\d+(?:,\d+)*)\s*Followers/i);
            const followers = followerMatch ? parseInt(followerMatch[1].replace(/,/g, '')) : 0;
            
            resolve({
              exists: true,
              followers,
              hasSignificantFollowing: followers > 1000
            });
          } else {
            resolve({ exists: false, followers: 0, hasSignificantFollowing: false });
          }
        } catch {
          resolve({ exists: false, followers: 0, hasSignificantFollowing: false });
        }
      });
    }).on('error', () => {
      resolve({ exists: false, followers: 0, hasSignificantFollowing: false });
    });
  });
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || 'solana';
  console.log(`Checking Twitter for: ${query}`);
  
  checkTwitter(query).then(result => {
    console.log('Result:', result);
  });
}
