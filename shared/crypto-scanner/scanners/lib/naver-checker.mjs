#!/usr/bin/env node
/**
 * Naver (Korea) Virality Checker
 * 
 * Checks if a meme/token has viral presence on Naver (Korea's Google).
 * Korea is a MASSIVE crypto market - MEXC lists many Korea-trending coins.
 */

import https from 'https';

/**
 * Check Naver for search volume/blog posts
 * @param {string} query - Search term (token/meme name)
 * @returns {Promise<{blogPosts: number, newsArticles: number, cafeDiscussions: number}>}
 */
export async function checkNaver(query) {
  // Naver has multiple platforms: Blog, News, Cafe (forums)
  const results = await Promise.all([
    checkNaverBlog(query),
    checkNaverNews(query),
    checkNaverCafe(query)
  ]);
  
  return {
    blogPosts: results[0],
    newsArticles: results[1],
    cafeDiscussions: results[2],
    totalMentions: results[0] + results[1] + results[2]
  };
}

function checkNaverBlog(query) {
  return new Promise((resolve) => {
    // Naver Blog search (web scraping approach, no official API)
    const url = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(query)}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          // Parse HTML to count blog posts (rough estimate)
          const matches = data.match(/class="total_tit"/g);
          resolve(matches ? matches.length : 0);
        } catch {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
}

function checkNaverNews(query) {
  return new Promise((resolve) => {
    const url = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const matches = data.match(/class="news_tit"/g);
          resolve(matches ? matches.length : 0);
        } catch {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
}

function checkNaverCafe(query) {
  return new Promise((resolve) => {
    const url = `https://search.naver.com/search.naver?where=article&query=${encodeURIComponent(query)}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const matches = data.match(/class="total_sub"/g);
          resolve(matches ? matches.length : 0);
        } catch {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
}

/**
 * Check for Korean characters (strong Korea signal)
 */
export function hasKoreanCharacters(text) {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || '비트코인'; // Bitcoin in Korean
  console.log(`Checking Naver for: ${query}`);
  
  checkNaver(query).then(result => {
    console.log('Result:', result);
    console.log(`Total mentions: ${result.totalMentions}`);
  });
}
