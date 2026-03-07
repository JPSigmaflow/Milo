#!/usr/bin/env node
/**
 * Reddit Virality Checker
 * 
 * Checks if a meme/token name has viral presence on Reddit.
 * Uses Reddit's JSON API (no auth required for read).
 */

import https from 'https';

/**
 * Check Reddit for posts/comments matching query
 * @param {string} query - Search term (token/meme name)
 * @returns {Promise<{totalUpvotes: number, postCount: number, topSubreddits: string[]}>}
 */
export async function checkReddit(query) {
  return new Promise((resolve) => {
    // Reddit search API (JSON endpoint, no auth needed)
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=100&sort=top&t=all`;
    
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
          
          if (json.data?.children) {
            const posts = json.data.children.map(p => p.data);
            
            const totalUpvotes = posts.reduce((sum, p) => sum + (p.ups || 0), 0);
            const subreddits = {};
            
            posts.forEach(p => {
              if (p.subreddit) {
                subreddits[p.subreddit] = (subreddits[p.subreddit] || 0) + 1;
              }
            });
            
            // Sort subreddits by frequency
            const topSubreddits = Object.entries(subreddits)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([sub]) => sub);
            
            resolve({
              totalUpvotes,
              postCount: posts.length,
              topSubreddits
            });
          } else {
            resolve({ totalUpvotes: 0, postCount: 0, topSubreddits: [] });
          }
        } catch {
          resolve({ totalUpvotes: 0, postCount: 0, topSubreddits: [] });
        }
      });
    }).on('error', () => {
      resolve({ totalUpvotes: 0, postCount: 0, topSubreddits: [] });
    });
  });
}

/**
 * Check specific crypto subreddits for mentions
 */
export async function checkCryptoSubreddits(query) {
  const subreddits = [
    'cryptocurrency',
    'cryptomoonshots', 
    'satoshistreetbets',
    'memecoins',
    'solana'
  ];
  
  const results = await Promise.all(
    subreddits.map(sub => checkSubreddit(sub, query))
  );
  
  const total = results.reduce((sum, r) => ({
    totalUpvotes: sum.totalUpvotes + r.totalUpvotes,
    postCount: sum.postCount + r.postCount,
    mentions: sum.mentions + r.mentions
  }), { totalUpvotes: 0, postCount: 0, mentions: 0 });
  
  return total;
}

function checkSubreddit(subreddit, query) {
  return new Promise((resolve) => {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&limit=25&sort=top`;
    
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
          const posts = json.data?.children?.map(p => p.data) || [];
          const totalUpvotes = posts.reduce((sum, p) => sum + (p.ups || 0), 0);
          
          resolve({
            totalUpvotes,
            postCount: posts.length,
            mentions: posts.length
          });
        } catch {
          resolve({ totalUpvotes: 0, postCount: 0, mentions: 0 });
        }
      });
    }).on('error', () => {
      resolve({ totalUpvotes: 0, postCount: 0, mentions: 0 });
    });
  });
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || 'pepe';
  console.log(`Checking Reddit for: ${query}`);
  
  checkReddit(query).then(result => {
    console.log('General Search:', result);
  });
  
  checkCryptoSubreddits(query).then(result => {
    console.log('Crypto Subreddits:', result);
  });
}
