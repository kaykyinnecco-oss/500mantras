import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

// Optional browser QA; Playwright is not shipped with the landing page.
const require = createRequire(import.meta.url);
const playwright = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(path.dirname(process.env.CODEX_MCP_NODE_PATH), 'node_modules/playwright'));
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || 'C:/Users/Lucio/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe' });
const base = process.env.BASE_URL || 'http://localhost:4195';
const output = 'node_modules/.cache/manual-popup';
await mkdir(output, { recursive: true });
const query = '?utm_source=qa&utm_campaign=manual-popup&fbclid=qa-not-a-real-click';
const report = { base, status: 'RUNNING', viewports: [], analytics: [] };
async function boot(width = 390, before = false) {
  const context = await browser.newContext({ viewport: { width, height: width < 1024 ? 844 : 768 }, reducedMotion: 'reduce' });
  await context.route('**/fbevents.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.__metaCalls=Array.from(window.fbq.queue);window.fbq.callMethod=function(){window.__metaCalls.push(Array.from(arguments))};' }));
  if (before) {
    const source = await readFile(process.env.BASELINE_SCRIPT, 'utf8');
    await context.route('**/script.js', r => r.fulfill({ contentType: 'text/javascript', body: source }));
    await context.addInitScript(() => sessionStorage.setItem('offer_popup_dismissed', '1'));
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.clock.install();
  await page.goto(base + '/' + query, { waitUntil: 'networkidle' });
  await page.clock.pauseAt(new Date(Date.now() + 100));
  return { context, page, errors };
}
const hidden = p => p.locator('#offer-popup').evaluate(e => e.hidden);
async function analytics(before) {
  const { context, page, errors } = await boot(390, before);
  await page.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('.checkout-link')) e.preventDefault(); }));
  const links = await page.locator('.checkout-link').evaluateAll(es => es.map(e => e.href));
  for (const link of await page.locator('.checkout-link').all()) await link.evaluate(e => e.click());
  const calls = await page.evaluate(() => window.__metaCalls);
  assert.equal(calls.filter(c => c[0] === 'track' && c[1] === 'PageView').length, 1);
  assert.equal(calls.filter(c => c[0] === 'track' && c[1] === 'InitiateCheckout').length, links.length);
  assert.ok(!calls.some(c => c[1] === 'Purchase'));
  for (const link of links) {
    const url = new URL(link);
    assert.equal(url.hostname, 'pay.cakto.com.br');
    assert.equal(url.searchParams.get('utm_source'), 'qa');
    assert.equal(url.searchParams.get('utm_campaign'), 'manual-popup');
  }
  assert.deepEqual(errors, []);
  await context.close();
  return { links, calls };
}
try {
  for (const width of [360, 390, 430, 1366]) {
    const { context, page, errors } = await boot(width);
    for (const seconds of [8, 7, 15]) { await page.clock.runFor(seconds * 1000); assert.equal(await hidden(page), true); }
    await page.evaluate(() => { scrollTo(0, document.documentElement.scrollHeight); document.dispatchEvent(new MouseEvent('mouseout', { clientY: 0, bubbles: true })); });
    await page.clock.runFor(30000); assert.equal(await hidden(page), true);
    await page.reload({ waitUntil: 'networkidle' }); await page.clock.runFor(30000); assert.equal(await hidden(page), true);
    const buttons = page.locator('a[href="#planos"]');
    assert.equal(await buttons.count(), 2);
    for (const button of await buttons.all()) {
      await button.click(); await page.clock.runFor(100);
      assert.equal(await hidden(page), false);
      assert.ok((await page.locator('#offer-popup').innerText()).includes('R$ 37,99'));
      assert.ok((await page.locator('#offer-popup').innerText()).includes('R$ 9,99'));
      await page.locator('.popup-close').click(); assert.equal(await hidden(page), true);
      await page.clock.runFor(30000); assert.equal(await hidden(page), true);
    }
    await buttons.first().click(); await page.clock.runFor(100);
    await page.screenshot({ path: `${output}/${width}.png` });
    await page.keyboard.press('Escape'); assert.equal(await hidden(page), true);
    await buttons.first().click(); await page.clock.runFor(100);
    await page.locator('.popup-continue').click(); assert.equal(await hidden(page), true);
    await page.clock.runFor(30000); assert.equal(await hidden(page), true);
    await buttons.first().click(); await page.clock.runFor(100);
    await page.locator('.offer-popup__backdrop').click({ position: { x: 2, y: 2 } }); assert.equal(await hidden(page), true);
    assert.deepEqual(errors, []);
    report.viewports.push({ width, automaticAt8_15_30Seconds: false, manualButtons: 2, closeEscapeContinueBackdrop: 'PASS', consoleErrors: 0 });
    await context.close();
  }
  const after = await analytics(false);
  if (process.env.BASELINE_SCRIPT) assert.deepEqual(after, await analytics(true), 'tracking calls, payloads and attribution links match the previous version');
  report.analytics = after;
  report.status = 'PASS';
  console.log(JSON.stringify({ status: report.status, viewports: report.viewports, checkoutLinks: after.links.length, trackingMatchesBaseline: Boolean(process.env.BASELINE_SCRIPT) }));
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
