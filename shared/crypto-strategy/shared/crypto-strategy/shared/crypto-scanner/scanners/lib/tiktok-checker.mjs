#!/usr/bin/env node
/**
 * TikTok Virality Checker
 * 
 * Checks if a meme/token name has viral presence on TikTok.
 * Uses TikTok's unofficial API (similar to BiliBili approach).
 */

import https from 'https';

/**
 * Check TikTok for viral videos matching query
 * @param {string} query - Search term (token/meme name)
 * @returns {Promise<{totalViews: number, videoCount: number, topHashtags: string[]}>}
 */
export async function checkTikTok(query) {
  return new Promise((resolve) => {
    // TikTok search endpoint (web version)
    const url = `https://www.tiktok.com/api/search/general/full/?keyword=${encodeURIComponent(query)}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.data) {
            const videos = json.data || [];
            const totalViews = videos.reduce((sum, v) => {
              const views = v.stats?.playCount || v.video?.playCount || 0;
              return sum + views;
            }, 0);
            
            // Extract popular hashtags
            const hashtags = new Set();
            videos.forEach(v => {
              if (v.textExtra) {
                v.textExtra.forEach(tag => {
                  if (tag.hashtagName) hashtags.add(tag.hashtagName);
                });
              }
            });
            
            resolve({
              totalViews,
              videoCount: videos.length,
              topHashtags: Array.from(hashtags).slice(0, 5)
            });
          } else {
            resolve({ totalViews: 0, videoCount: 0, topHashtags: [] });
          }
        } catch (err) {
          // Fallback: Try hashtag lookup
          checkTikTokHashtag(query).then(resolve).catch(() => {
            resolve({ totalViews: 0, videoCount: 0, topHashtags: [] });
          });
        }
      });
    }).on('error', () => {
      resolve({ totalViews: 0, videoCount: 0, topHashtags: [] });
    });
  });
}

/**
 * Fallback: Check TikTok hashtag stats
 */
function checkTikTokHashtag(query) {
  return new Promise((resolve) => {
    const hashtag = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const url = `https://www.tiktok.com/api/challenge/detail/?challengeName=${hashtag}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const views = json.challengeInfo?.stats?.viewCount || 0;
          const videos = json.challengeInfo?.stats?.videoCount || 0;
          
          resolve({
            totalViews: views,
            videoCount: videos,
            topHashtags: [hashtag]
          });
        } catch {
          resolve({ totalViews: 0, videoCount: 0, topHashtags: [] });
        }
      });
    }).on('error', () => {
      resolve({ totalViews: 0, videoCount: 0, topHashtags: [] });
    });
  });
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || 'doge';
  console.log(`Checking TikTok for: ${query}`);
  
  checkTikTok(query).then(result => {
    console.log('Result:', result);
    console.log(`Total Views: ${(result.totalViews / 1e6).toFixed(1)}M`);
    console.log(`Videos: ${result.videoCount}`);
    console.log(`Top Hashtags: ${result.topHashtags.join(', ')}`);
  });
}
