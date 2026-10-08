import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prefix = '/brad-to-jacksonville/';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(target);
    res.writeHead(200, { 'content-type': types[path.extname(target)] || 'text/plain' });
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = origin + prefix;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const initialCampaign = { goalCents: null, collectedCents: 0, paymentUrl: null, updatedAt: null, contributions: [] };
  await page.route('**/campaign.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(initialCampaign) }));
  await page.goto(url);
  await page.waitForFunction(() => document.body.textContent.includes('$0'));
  assert.match(await page.locator('h1').innerText(), /Brad[\s\S]*kids/i);
  assert.equal(await page.locator('h1').count(), 1);
  const canonical = 'https://johnloringpollard.github.io/brad-to-jacksonville/';
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), canonical);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), canonical + 'assets/social-preview.png');
  assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
  assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'), '1200');
  assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'), '630');
  await page.locator('img').first().evaluate(image => image.decode());
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'artifacts/desktop.png'), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow at ${width}px`);
    await page.screenshot({ path: path.join(root, `artifacts/mobile-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, [], 'Page loads without browser or resource errors');
  console.log('PASS: desktop, 390px/320px layouts, photo, honest initial total, canonical and social metadata, GitHub Pages subpath');
  assert.equal(await page.locator('#payment-link').getAttribute('href'), null);
  assert.equal(await page.locator('#payment-unavailable').isDisabled(), true);
  assert.equal(await page.locator('#progress-fill').evaluate(el => el.style.width), '0%');
  const base = { goalCents: 100000, collectedCents: 2575, paymentUrl: 'https://buy.stripe.com/test_example', updatedAt: '2026-10-08T12:00:00Z', contributions: [] };
  async function campaign(data, status = 200) {
    await page.unroute('**/campaign.json');
    await page.route('**/campaign.json', route => route.fulfill({ status, contentType: 'application/json', body: typeof data === 'string' ? data : JSON.stringify(data) }));
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#collected-label').textContent.includes('Checking'));
  }
  await campaign(base);
  assert.equal(await page.locator('#collected').innerText(), '$25.75');
  assert.equal(await page.locator('#goal').innerText(), 'of $1,000 goal');
  assert.equal(await page.locator('#payment-link').getAttribute('href'), base.paymentUrl);
  assert.equal(await page.locator('#payment-link').isVisible(), true);
  assert.equal(await page.locator('#payment-unavailable').isVisible(), false);
  assert.equal(await page.locator('#payment-link').getAttribute('rel'), 'noopener noreferrer');
  assert.ok(Math.abs(Number(await page.locator('#progress').getAttribute('aria-valuenow')) - 2.575) < 0.001);
  await campaign({ ...base, collectedCents: 10000, contributions: [{ name: 'John Pollard', amountCents: 10000, method: 'offline' }] });
  assert.equal(await page.locator('#collected').innerText(), '$100');
  assert.equal(await page.locator('#contributions').isVisible(), true);
  assert.match(await page.locator('#contributions').innerText(), /John Pollard · \$100/);
  assert.match(await page.locator('#contributions').innerText(), /Received outside Stripe · confirmed by organizer/);
  await campaign({ ...base, collectedCents: 10000, contributions: [{ name: '<img src=x onerror=alert(1)>', amountCents: 10000, method: 'offline' }] });
  assert.equal(await page.locator('#contributions img').count(), 0);
  await campaign({ ...base, collectedCents: 150000 });
  assert.equal(await page.locator('#collected').innerText(), '$1,500');
  assert.equal(await page.locator('#progress-fill').evaluate(el => el.style.width), '100%');
  for (const invalid of [
    { ...base, contributions: [{ name: 'John', amountCents: 10000, method: 'offline' }] },
    { ...base, contributions: [{ name: 'John', amountCents: -1, method: 'offline' }] },
    { ...base, contributions: [{ name: 'John', amountCents: 100, method: 'pledge' }] },
    { ...base, collectedCents: -1 },
    { ...base, collectedCents: '10000' },
    { ...base, goalCents: 0 },
    { ...base, paymentUrl: 'javascript:alert(1)' },
    { ...base, paymentUrl: 'http://example.com' },
    { ...base, paymentUrl: 'https://user:secret@example.com' },
    '{bad json',
  ]) {
    await campaign(invalid);
    assert.equal(await page.locator('#collected-label').innerText(), 'Total unavailable');
    assert.equal(await page.locator('#payment-link').getAttribute('href'), null);
    assert.equal(await page.locator('#payment-unavailable').isDisabled(), true);
  }
  await campaign(base);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedText = text; } } });
  });
  await page.locator('#share-button').click();
  await page.waitForFunction(() => window.copiedText);
  assert.equal(await page.evaluate(() => window.copiedText), canonical);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await page.locator('#share-button').click();
  assert.equal(await page.locator('#share-fallback').isVisible(), true);
  assert.equal(await page.locator('#share-url').inputValue(), canonical);
  assert.deepEqual(errors, [], 'No runtime errors during interaction checks');
  console.log('PASS: checkout availability, accurate currency, capped progress, invalid config fails closed, clipboard and manual share fallback');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
