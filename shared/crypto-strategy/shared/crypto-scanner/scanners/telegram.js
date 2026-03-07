import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const config = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));

// Telegram public channels can be scraped via t.me/s/ (public preview)
export async function scanTelegram() {
  const seenFile = join(ROOT, 'data', 'seen-tg.json');
  const raw = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : [];
  const seen = Array.isArray(raw) ? raw : (raw.ids || []);
  const seenSet = new Set(seen);
  const results = [];
  const channels = config.telegram?.channels || [];

  for (const channel of channels) {
    try {
      // t.me/s/<channel> gives public preview HTML
      const html = execSync(
        `curl -s -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" "https://t.me/s/${channel}"`,
        { timeout: 10000, maxBuffer: 5 * 1024 * 1024 }
      ).toString();

      // Extract messages from the HTML
      const msgRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
      let match;
      let count = 0;
      while ((match = msgRegex.exec(html)) !== null && count < 20) {
        const text = match[1]
          .replace(/<[^>]+>/g, ' ')  // strip HTML tags
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (text.length < 20) continue;
        
        const msgId = `${channel}:${text.substring(0, 50)}`;
        if (seenSet.has(msgId)) continue;
        
        seenSet.add(msgId);
        count++;
        
        // Check for crypto-relevant keywords
        const keywords = ['pump', 'moon', 'gem', '100x', 'whale', 'alert', 'buy', 'sell',
          'solana', 'eth', 'base', 'token', 'launch', 'listing', 'AI', 'agent',
          'memecoin', 'contract', 'CA:', 'dex', 'liquidity', 'volume'];
        const matched = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
        
        if (matched.length >= 2) {
          results.push({
            source: 'telegram',
            channel,
            text: text.substring(0, 300),
            keywords: matched,
            timestamp: new Date().toISOString()
          });
        }
      }
      console.log(`[Telegram] @${channel}: scanned, ${count} new messages`);
    } catch(e) {
      console.log(`[Telegram] @${channel}: error - ${e.message?.substring(0, 60)}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }

  // Keep last 5000 seen
  const seenArr = [...seenSet].slice(-5000);
  writeFileSync(seenFile, JSON.stringify(seenArr));
  console.log(`[Telegram] Total: ${results.length} relevant messages`);
  return results;
}
