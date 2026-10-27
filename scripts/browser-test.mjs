import assert from "node:assert/strict";
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { rootDir } from "./config.mjs";

// Optional QA tool: use a local Playwright install or PLAYWRIGHT_MODULE_PATH.
// No browser or test library is shipped with the production site.
const require = createRequire(import.meta.url);
const engine = process.env.QA_BROWSER || "chromium";
assert.ok(["chromium", "webkit"].includes(engine), "QA_BROWSER must be chromium or webkit.");
if (engine === "webkit" && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(rootDir, "node_modules", ".cache", "ms-playwright");
}
const candidates = [
  process.env.PLAYWRIGHT_MODULE_PATH,
  "playwright",
  process.env.CODEX_MCP_NODE_PATH && path.join(path.dirname(process.env.CODEX_MCP_NODE_PATH), "node_modules", "playwright"),
].filter(Boolean);
let playwright;
for (const candidate of candidates) {
  try { playwright = require(candidate); break; } catch { /* Try the next available install. */ }
}
assert.ok(playwright?.chromium, "Install Playwright for QA or set PLAYWRIGHT_MODULE_PATH.");

async function installedChromium() {
  if (process.env.CHROMIUM_EXECUTABLE_PATH) return process.env.CHROMIUM_EXECUTABLE_PATH;
  const caches = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "ms-playwright"),
    process.env.USERPROFILE && path.join(process.env.USERPROFILE, "AppData", "Local", "ms-playwright"),
  ].filter(Boolean);
  for (const cache of caches) {
    const entries = await readdir(cache).catch(() => []);
    for (const entry of entries.filter((name) => /^chromium_headless_shell-\d+$/.test(name)).sort().reverse()) {
      const binary = path.join(cache, entry, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
      try { await access(binary); return binary; } catch { /* Try another installed revision. */ }
    }
  }
  return undefined;
}

const baseUrl = process.env.BASE_URL || "http://localhost:4174";
const outputDir = process.env.QA_OUTPUT_DIR || path.join(rootDir, "node_modules", ".cache", engine === "webkit" ? "browser-qa-webkit" : "browser-qa");
const report = { baseUrl, browser: engine === "webkit" ? "WebKit" : "Chromium", widths: [], checks: [], limitations: [] };
await mkdir(outputDir, { recursive: true });
const browser = await playwright[engine].launch({ headless: true, ...(engine === "chromium" ? { executablePath: await installedChromium() } : {}) });
const checkout = "https://pay.cakto.com.br/323zgdr_1243414";
const trackingUrl = /connect\.facebook\.net|facebook\.com\/tr|googletagmanager\.com|google-analytics\.com/;

async function newContext(width = 390, extra = {}) {
  return browser.newContext({
    viewport: { width, height: width > 768 ? 1000 : 844 },
    deviceScaleFactor: 1,
    isMobile: width <= 430,
    hasTouch: width <= 430,
    reducedMotion: "reduce",
    ...extra,
  });
}

async function scrollPage(page) {
  await page.evaluate(async () => {
    for (let position = 0; position < document.documentElement.scrollHeight; position += 650) {
      window.scrollTo(0, position);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  });
  await page.locator(".hero").scrollIntoViewIfNeeded();
}

try {
  // Capture the published baseline without granting consent or sending analytics.
  if (process.env.BASELINE_URL) {
    const context = await newContext();
    await context.route(trackingUrl, (route) => route.abort());
    const page = await context.newPage();
    await page.goto(process.env.BASELINE_URL, { waitUntil: "networkidle" });
    await scrollPage(page);
    await page.screenshot({ path: path.join(outputDir, "baseline-mobile-390.png"), fullPage: true });
    await context.close();
    report.checks.push("Published mobile baseline captured with optional analytics blocked.");
  }

  for (const width of [320, 360, 375, 390, 414, 430, 768, 1440]) {
    const context = await newContext(width);
    const page = await context.newPage();
    const errors = [];
    const failedAssets = [];
    const trackingRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => { if (trackingUrl.test(request.url())) trackingRequests.push(request.url()); });
    page.on("response", (response) => { if (response.url().startsWith(baseUrl) && response.status() >= 400) failedAssets.push(response.url()); });
    await context.route(trackingUrl, (route) => route.abort());
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await scrollPage(page);
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      visibleDialogs: [...document.querySelectorAll("dialog[open]")].length,
      previews: [...document.querySelectorAll(".page-preview img")].map((image) => ({ loaded: image.complete && image.naturalWidth > 0, fit: getComputedStyle(image).objectFit })),
      checkouts: [...document.querySelectorAll("a[data-checkout]")].map((link) => ({ href: link.href, location: link.dataset.ctaLocation, label: link.textContent.trim(), height: link.getBoundingClientRect().height, visible: Boolean(link.getClientRects().length) })),
      croppedText: [...document.querySelectorAll("h1,h2,h3,figcaption,summary,.offer-list li,.offer-facts > *")].filter((element) => {
        if (element.classList.contains("visually-hidden")) return false;
        const style = getComputedStyle(element);
        return element.clientWidth > 0 && (style.overflowX === "hidden" || style.overflowX === "clip") && element.scrollWidth > element.clientWidth + 1;
      }).map((element) => element.textContent.trim()),
    }));
    assert.ok(layout.document <= layout.viewport + 1, `${width}px: horizontal page overflow (${layout.document}px)`);
    assert.equal(layout.visibleDialogs, 0, `${width}px: no dialog opens automatically`);
    assert.deepEqual(layout.croppedText, [], `${width}px: visible text is not clipped`);
    assert.ok(layout.previews.length === 3 && layout.previews.every((image) => image.loaded), `${width}px: three original page images load`);
    assert.equal(layout.checkouts.length, 8, "seven original purchase actions plus the mobile CTA are present");
    assert.deepEqual(layout.checkouts.map((link) => link.location).sort(), ["header", "hero", "conteudo", "video", "video-final", "oferta", "fechamento", "mobile"].sort(), "all original checkout locations remain unique");
    for (const link of layout.checkouts) {
      assert.equal(link.href, checkout, `${width}px: checkout URL preserved`);
      assert.equal(link.label, "QUERO RECEBER MEUS 500 MANTRAS", `${width}px: purchase copy matches the redesign`);
      if (link.visible) assert.ok(link.height >= 56, `${width}px: purchase tap target at least 56px`);
    }
    assert.equal(await page.locator("[data-guarantee]").count(), 4, `${width}px: guarantee appears at the four approved locations`);
    assert.equal(await page.locator('[data-guarantee="offer"]').innerText().then((text) => text.includes("Garantia de 7 dias. Se você abrir o e-book e sentir que não era o que esperava, é só pedir o reembolso em até 7 dias após a compra e devolvemos 100% do valor. Sem burocracia.")), true, `${width}px: full guarantee matches the owner-confirmed policy`);
    assert.equal(await page.locator(".faq-list article").count(), 6, `${width}px: all six FAQ answers are present`);
    assert.equal(await page.locator(".digital-product-note").count(), 1, `${width}px: final format notice appears once`);
    assert.ok(await page.locator(".site-footer").innerText().then((text) => text.includes("Produto digital em PDF. Não inclui versão física.")), `${width}px: final format notice belongs to the footer`);
    assert.equal(await page.locator("main").innerText().then((text) => text.includes("empresakagency@gmail.com")), false, `${width}px: no support email competes with the offer`);
    assert.equal(await page.locator(".offer-summary img").getAttribute("src").then((src) => src.includes("mockup-produto.webp")), false, `${width}px: offer image differs from the hero mockup`);
    assert.equal(await page.locator('.guarantee-panel img[src="/assets/selo-garantia-premium-7-dias-v1.webp"]').isVisible(), true, `${width}px: official premium guarantee image is visible`);
    assert.equal(await page.locator('.review-card').count(), 8, `${width}px: eight supplied reviews appear`);
    assert.equal(await page.locator('.reviews-summary').getAttribute('data-rating-exact'), '4.75');
    assert.equal(await page.locator('.previous-price del').count(), 2, `${width}px: real former price appears in hero and offer`);
    for (const answer of await page.locator(".faq-list article p").all()) assert.equal(await answer.isVisible(), true, `${width}px: FAQ answers are visible without a click`);
    assert.deepEqual(trackingRequests, [], `${width}px: no optional tracking without consent`);
    assert.deepEqual(failedAssets, [], `${width}px: no missing local resources`);
    assert.deepEqual(errors, [], `${width}px: no console or runtime errors`);
    await page.screenshot({ path: path.join(outputDir, `page-${width}.png`), fullPage: true });
    await page.locator(".offer-card").screenshot({ path: path.join(outputDir, `offer-${width}.png`), style: ".reading-progress { visibility: hidden; }" });
    if (width <= 430) {
      await page.locator('#readerReviews').scrollIntoViewIfNeeded();
      await page.locator('#readerReviews').focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => document.querySelector('[data-review-status]').textContent === '8 de 8');
      assert.equal(await page.locator('[data-review-next]').isDisabled(), true, `${width}px: review carousel stops at the eighth card`);
      await page.keyboard.press('Home');
      await page.waitForFunction(() => document.querySelector('[data-review-status]').textContent === '1 de 8');
      assert.equal(await page.locator('[data-review-prev]').isDisabled(), true);
      await page.locator('[data-review-next]').click();
      await page.waitForFunction(() => document.querySelector('[data-review-status]').textContent === '2 de 8');
      await page.locator('[data-review-prev]').click();
      await page.waitForFunction(() => document.querySelector('[data-review-status]').textContent === '1 de 8');
      for (let index = 0; index < 3; index++) {
        const card = page.locator(".page-preview").nth(index);
        await card.scrollIntoViewIfNeeded();
        const fits = await card.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const gallery = element.closest(".preview-gallery").getBoundingClientRect();
          const caption = element.querySelector("figcaption").getBoundingClientRect();
          return bounds.left >= gallery.left - 1 && bounds.right <= gallery.right + 1
            && caption.left >= gallery.left - 1 && caption.right <= gallery.right + 1;
        });
        assert.ok(fits, `${width}px: gallery page ${index + 1} and its caption fit fully when selected`);
        await card.screenshot({ path: path.join(outputDir, `gallery-${width}-${index + 1}.png`), style: ".reading-progress { visibility: hidden; }" });
      }
      await page.locator(".preview-gallery").evaluate((element) => { element.scrollLeft = 0; });
      await page.locator(".preview-gallery").focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() => document.querySelector(".preview-gallery").scrollLeft > 0);
      await page.waitForFunction(() => document.querySelector("[data-gallery-status]").textContent === "2 de 3");
      await page.locator("[data-gallery-next]").click();
      await page.waitForFunction(() => document.querySelector("[data-gallery-status]").textContent === "3 de 3");
      assert.equal(await page.locator("[data-gallery-next]").isDisabled(), true, `${width}px: carousel ends at the third authentic page`);
      await page.locator("[data-gallery-prev]").click();
      await page.waitForFunction(() => document.querySelector("[data-gallery-status]").textContent === "2 de 3");

      // Find a real reading interval with no standard purchase button in view.
      const readingPosition = await page.evaluate(() => {
        const topOf = (element) => element.getBoundingClientRect().top + window.scrollY;
        const heroBottom = topOf(document.getElementById("inicio")) + document.getElementById("inicio").offsetHeight;
        const footerTop = topOf(document.getElementById("rodape"));
        const buttons = [...document.querySelectorAll('a[data-checkout]:not([data-cta-location="mobile"])')]
          .filter((element) => element.getClientRects().length)
          .map((element) => ({ top: topOf(element), bottom: topOf(element) + element.offsetHeight }));
        for (let position = heroBottom + 1; position < footerTop - window.innerHeight - 88; position += 80) {
          if (buttons.every((button) => button.bottom < position || button.top > position + window.innerHeight + 88)) {
            window.scrollTo(0, position);
            return position;
          }
        }
        return null;
      });
      assert.notEqual(readingPosition, null, `${width}px: a reading interval exists after the hero`);
      await page.locator("#mobilePurchaseBar").waitFor({ state: "visible" });
      const barGeometry = await page.locator("#mobilePurchaseBar").evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, bottom: bounds.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight };
      });
      assert.ok(barGeometry.left >= 0 && barGeometry.right <= barGeometry.viewportWidth + 1 && barGeometry.bottom <= barGeometry.viewportHeight + 1, `${width}px: mobile purchase bar fits inside the viewport`);
      await page.locator("#heroCheckout").scrollIntoViewIfNeeded();
      await page.locator("#mobilePurchaseBar").waitFor({ state: "hidden" });
      await page.locator("[data-consent-preferences]").first().click();
      assert.equal(await page.locator("#mobilePurchaseBar").isVisible(), false, `${width}px: privacy preferences are never covered by the purchase bar`);
      await page.keyboard.press("Escape");
    } else if (width >= 768) {
      assert.equal(await page.locator("#mobilePurchaseBar").isVisible(), false, `${width}px: purchase bar is limited to mobile`);
    }
    report.widths.push({ width, horizontalOverflow: false, checkoutCount: layout.checkouts.length, consoleErrors: 0 });
    await context.close();
  }

  const now = Date.now();
  const invalidConsentSamples = [
    "not-json",
    JSON.stringify({ version: 2, status: "accepted", updatedAt: now - 200 * 86400000, expiresAt: now - 20 * 86400000 }),
    JSON.stringify({ version: 2, status: "accepted", updatedAt: now, expiresAt: now + 365 * 86400000 }),
    JSON.stringify({ version: 2, status: "accepted", updatedAt: now + 86400000, expiresAt: now + 2 * 86400000 }),
  ];
  for (const stored of invalidConsentSamples) {
    const invalidContext = await newContext();
    const requests = [];
    await invalidContext.addInitScript((value) => localStorage.setItem("mantras.analytics.consent.v2", value), stored);
    await invalidContext.route(trackingUrl, (route) => { requests.push(route.request().url()); return route.abort(); });
    const invalidPage = await invalidContext.newPage();
    await invalidPage.goto(baseUrl, { waitUntil: "networkidle" });
    assert.deepEqual(requests, [], "malformed, expired, overlong, or future-dated consent never enables optional scripts");
    await invalidContext.close();
  }
  report.checks.push("Malformed, expired, future-dated, and excessively long consent records remain blocked.");

  const httpContext = await playwright.request.newContext({ baseURL: baseUrl });
  const servedHtml = await (await httpContext.get("/")).text();
  const videoPath = servedHtml.match(/<source\b[^>]*src="([^"]+)"[^>]*type="video\/mp4"/)?.[1];
  assert.ok(videoPath, "the published MP4 source is present");
  const rangeResponse = await httpContext.get(videoPath, { headers: { Range: "bytes=0-1" } });
  assert.equal(rangeResponse.status(), 206, "video serves byte ranges for Safari seeking");
  assert.equal((await rangeResponse.body()).length, 2, "video range returns the requested two bytes");
  assert.match(rangeResponse.headers()["content-range"], /^bytes 0-1\/\d+$/);
  const headResponse = await httpContext.head(videoPath);
  assert.equal(headResponse.headers()["content-type"], "video/mp4");
  assert.equal(headResponse.headers()["accept-ranges"], "bytes");
  assert.equal((await headResponse.body()).length, 0, "HEAD returns video headers without a body");
  const invalidRange = await httpContext.get(videoPath, { headers: { Range: "bytes=999999999999-" } });
  assert.equal(invalidRange.status(), 416, "unsatisfiable video range is rejected correctly");
  await httpContext.dispose();
  report.checks.push("Video HTTP HEAD, byte-range 206 and invalid-range 416 support verified.");

  const zoomContext = await newContext(720, { deviceScaleFactor: 2, isMobile: false, hasTouch: false });
  const zoomPage = await zoomContext.newPage();
  await zoomContext.route(trackingUrl, (route) => route.abort());
  await zoomPage.goto(baseUrl, { waitUntil: "networkidle" });
  await scrollPage(zoomPage);
  assert.ok(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "200% desktop zoom equivalent reflows without horizontal overflow");
  await zoomPage.screenshot({ path: path.join(outputDir, "zoom-200-desktop.png"), fullPage: true });
  await zoomContext.close();
  report.checks.push("Desktop 200% zoom equivalent (1440 physical pixels, 720 CSS pixels at DPR 2) retains responsive layout.");

  for (const width of [390, 1440]) {
    const motionContext = await newContext(width, { reducedMotion: "no-preference" });
    await motionContext.route(trackingUrl, (route) => route.abort());
    const motionPage = await motionContext.newPage();
    await motionPage.goto(baseUrl, { waitUntil: "networkidle" });
    await scrollPage(motionPage);
    await motionPage.locator(".video-section").scrollIntoViewIfNeeded();
    await motionPage.waitForFunction(() => [...document.querySelectorAll(".video-copy h2,.video-copy p,.video-cta")].every((element) => {
      if (!element.getClientRects().length) return false;
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (Number(style.opacity) < 0.99 || style.visibility === "hidden" || style.display === "none") return false;
      }
      return true;
    }));
    assert.equal(await motionPage.locator(".video-cta").isVisible(), true, `${width}px: video CTA remains visible with normal motion`);
    await motionPage.locator(".video-section").screenshot({ path: path.join(outputDir, `video-normal-motion-${width}.png`), style: ".reading-progress { visibility: hidden; }" });
    await motionContext.close();
  }
  report.checks.push("Normal-motion video headings, copy and checkout CTA remain visible at 390px and 1440px.");

  const context = await newContext();
  // Simulate the analytics loader locally so tests never submit real Meta events.
  let loaderRequests = 0;
  await context.route(trackingUrl, async (route) => {
    if (route.request().url().includes("fbevents.js")) {
      loaderRequests++;
      await route.fulfill({ contentType: "application/javascript", body: `window.__metaCalls=[];const pending=window.fbq.queue.slice();window.fbq.callMethod=function(){window.__metaCalls.push(Array.from(arguments));};pending.forEach(args=>window.fbq.callMethod.apply(null,args));` });
    } else await route.fulfill({ contentType: "application/javascript", body: "" });
  });
  const page = await context.newPage();
  const events = () => page.evaluate(() => window.__metaCalls || []);
  await page.goto(baseUrl + "?utm_source=qa&utm_campaign=mobile&src=review&sck=landing", { waitUntil: "networkidle" });
  assert.equal(loaderRequests, 0, "no analytics loader on first visit");
  await page.locator("[data-consent-preferences]").first().click();
  assert.equal(await page.locator("#consentPreferences").evaluate((dialog) => dialog.open), true, "preferences open on explicit request");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.getElementById("consentPreferences").open, null, { timeout: 3000 });
  assert.equal(loaderRequests, 0, "closing preferences never implies consent");
  assert.equal(await page.locator("#consentPreferences").evaluate((dialog) => dialog.open), false, "preferences support Escape");
  await page.locator("[data-consent-preferences]").first().click();
  await page.locator('[data-consent="denied"]').click();
  assert.equal(loaderRequests, 0, "rejecting does not load optional tracking");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(loaderRequests, 0, "rejection persists across visits");
  assert.equal(await page.locator("#consentPreferences").evaluate((dialog) => dialog.open), false);
  await page.locator("[data-consent-preferences]").first().click();
  await page.locator('[data-consent="accepted"]').click();
  await page.waitForFunction(() => window.__metaCalls?.some((args) => args[1] === "PageView"));
  assert.equal(loaderRequests, 1, "explicit acceptance loads Pixel once");
  assert.equal((await events()).filter((args) => args[1] === "PageView").length, 1, "PageView fires once");
  assert.ok((await events()).some((args) => args[0] === "init" && args[1] === "2429955871112248"), "correct Meta Pixel ID");
  await page.locator(".offer-card").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__metaCalls?.some((args) => args[1] === "OfferViewed"));
  await page.locator(".hero").scrollIntoViewIfNeeded();
  await page.locator(".offer-card").scrollIntoViewIfNeeded();
  assert.equal((await events()).filter((args) => args[1] === "OfferViewed").length, 1, "offer view is not duplicated");

  await page.locator("#heroCheckout").evaluate((link) => link.addEventListener("click", (event) => event.preventDefault(), { once: true }));
  await page.locator("#heroCheckout").click();
  const checkoutEvents = (await events()).filter((args) => args[1] === "InitiateCheckout");
  assert.equal(checkoutEvents.length, 1, "one checkout event per purchase click");
  assert.equal(checkoutEvents[0][2].value, 19.9, "checkout event reports the product price");
  const attributedUrl = new URL(await page.locator("#heroCheckout").getAttribute("href"));
  assert.equal(attributedUrl.searchParams.get("utm_source"), "qa");
  assert.equal(attributedUrl.searchParams.get("utm_campaign"), "mobile");
  assert.equal(attributedUrl.searchParams.get("src"), "review");
  assert.equal(attributedUrl.searchParams.get("sck"), "landing");
  assert.ok(!(await events()).some((args) => args[1] === "Purchase"), "checkout clicks never simulate approved purchases");

  assert.equal(await page.locator(".faq-list article").count(), 6, "FAQ keeps all six questions visible by default");
  assert.equal(await page.locator(".faq-list details").count(), 0, "FAQ does not require expanding answers");
  for (const item of await page.locator(".faq-list article").all()) {
    assert.equal(await item.locator("h3").isVisible(), true, "FAQ question remains visible");
    assert.equal(await item.locator("p").isVisible(), true, "FAQ answer remains visible");
  }
  assert.equal(await page.locator("#previewDialog").count(), 0, "image enlargement modal stays removed");

  const video = page.locator("#productVideo");
  assert.equal(await video.getAttribute("preload"), "none");
  assert.ok(await video.evaluate((element) => element.controls && element.playsInline && !element.autoplay), "video retains native inline controls without autoplay");
  await page.locator("#videoPlay").click();
  await page.waitForFunction(() => document.getElementById("productVideo").currentTime > 0, null, { timeout: 15000 });
  await video.evaluate((element) => element.pause());
  report.checks.push("Mobile inline video plays after explicit tap; no autoplay.");

  await page.locator("[data-consent-preferences]").first().click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.locator('[data-consent="denied"]').click(),
  ]);
  assert.equal(await page.evaluate(() => typeof window.fbq), "undefined", "revocation reload clears the loaded Pixel");
  assert.equal(loaderRequests, 1, "revocation does not reload optional scripts");
  report.checks.push("Explicit consent/rejection, persistence, Pixel ID, revocation, unique events, checkout attribution, FAQ, and removed modal verified.");
  await context.close();

  report.limitations.push(engine === "webkit"
    ? "WebKit engine with mobile touch emulation was tested on Windows; a physical iPhone Safari device was not available."
    : "Chromium mobile emulation does not replace a physical iPhone Safari test; run QA_BROWSER=webkit for the available WebKit engine.");
  await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: "PASS", ...report, artifacts: outputDir }, null, 2));
} finally {
  await browser.close();
}
