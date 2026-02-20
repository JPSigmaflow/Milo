import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage();
const html = readFileSync('masterplan-mobile.html', 'utf-8');
await page.setViewportSize({ width: 1080, height: 1920 });
await page.setContent(html, { waitUntil: 'networkidle' });

// Full page screenshot first
await page.screenshot({ path: 'masterplan-full.png', fullPage: true });

// Get dimensions
const { exec } = await import('child_process');
const { promisify } = await import('util');
const run = promisify(exec);

const { stdout } = await run('file masterplan-full.png');
console.log(stdout);

// Split with sips/imagemagick
const match = stdout.match(/(\d+) x (\d+)/);
if (match) {
  const [_, w, h] = match;
  const chunkH = 1920;
  const numChunks = Math.ceil(parseInt(h) / chunkH);
  
  for (let i = 0; i < numChunks; i++) {
    const y = i * chunkH;
    const thisH = Math.min(chunkH, parseInt(h) - y);
    await run(`sips -c ${thisH} ${w} --cropOffset ${y} 0 masterplan-full.png --out masterplan-m${i+1}.png`);
  }
  console.log(`Split into ${numChunks} chunks`);
}

await browser.close();
