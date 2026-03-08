#!/usr/bin/env node
/**
 * GitHub Activity Checker
 * 
 * For TECH tokens: Check GitHub for real development activity.
 * Strong signal for serious tech plays (AI, ZK, DePIN, etc.)
 */

import https from 'https';

/**
 * Search GitHub for repositories matching token name
 * @param {string} query - Token/project name
 * @returns {Promise<{repoCount: number, totalStars: number, recentCommits: number, topLanguages: string[]}>}
 */
export async function checkGitHub(query) {
  return new Promise((resolve) => {
    // GitHub search API (no auth needed for public search)
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=10`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoScanner/1.0)',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.items) {
            const repos = json.items;
            const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
            
            // Extract languages
            const languages = {};
            repos.forEach(r => {
              if (r.language) {
                languages[r.language] = (languages[r.language] || 0) + 1;
              }
            });
            
            const topLanguages = Object.entries(languages)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([lang]) => lang);
            
            // Check for recent activity (updated in last 30 days)
            const now = Date.now();
            const recentRepos = repos.filter(r => {
              const updated = new Date(r.updated_at).getTime();
              return (now - updated) < 30 * 86400000; // 30 days
            });
            
            resolve({
              repoCount: repos.length,
              totalStars,
              recentCommits: recentRepos.length,
              topLanguages,
              hasActiveRepo: recentRepos.length > 0
            });
          } else {
            resolve({
              repoCount: 0,
              totalStars: 0,
              recentCommits: 0,
              topLanguages: [],
              hasActiveRepo: false
            });
          }
        } catch {
          resolve({
            repoCount: 0,
            totalStars: 0,
            recentCommits: 0,
            topLanguages: [],
            hasActiveRepo: false
          });
        }
      });
    }).on('error', () => {
      resolve({
        repoCount: 0,
        totalStars: 0,
        recentCommits: 0,
        topLanguages: [],
        hasActiveRepo: false
      });
    });
  });
}

/**
 * Check GitHub Trending (popular repos right now)
 */
export async function checkGitHubTrending() {
  return new Promise((resolve) => {
    const url = 'https://api.github.com/search/repositories?q=stars:>100&sort=updated&per_page=30';
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoScanner/1.0)',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const trending = json.items?.map(r => r.name) || [];
          resolve(trending);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2] || 'solana';
  console.log(`Checking GitHub for: ${query}`);
  
  checkGitHub(query).then(result => {
    console.log('Result:', result);
    console.log(`Total Stars: ${result.totalStars}`);
    console.log(`Active Repos: ${result.recentCommits}`);
  });
}
