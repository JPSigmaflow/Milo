import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const parts = ['masterplan-part1.html', 'masterplan-part2.html', 'masterplan-part3.html'];

const browser = await chromium.launch();

for (let i = 0; i < parts.length; i++) {
  const page = await browser.newPage();
  const html = readFileSync(parts[i], 'utf-8');
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  // High-res screenshot (2x width for retina quality)
  await page.setViewportSize({ width: 2400, height: 800 });
  await page.screenshot({ 
    path: `masterplan-hq-p${i+1}.png`, 
    fullPage: true,
    type: 'png'
  });
  
  // Also PDF
  await page.pdf({
    path: `masterplan-p${i+1}.pdf`,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
  });
  
  await page.close();
}

await browser.close();
console.log('Done — HQ PNGs + PDFs created');
