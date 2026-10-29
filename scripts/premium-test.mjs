import assert from "node:assert/strict";
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { rootDir } from "./config.mjs";

// Optional integration QA. Playwright and browser binaries never enter the site build.
const require = createRequire(import.meta.url);
const engine = process.env.QA_BROWSER || "chromium";
assert.ok(["chromium", "webkit"].includes(engine), "QA_BROWSER must be chromium or webkit");
if (engine === "webkit" && !process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(rootDir, "node_modules/.cache/ms-playwright");
let playwright;
for (const candidate of [process.env.PLAYWRIGHT_MODULE_PATH, "playwright", process.env.CODEX_MCP_NODE_PATH && path.join(path.dirname(process.env.CODEX_MCP_NODE_PATH), "node_modules/playwright")].filter(Boolean)) {
  try { playwright = require(candidate); break; } catch { /* Optional QA dependency. */ }
}
assert.ok(playwright?.[engine], "Install Playwright for QA or set PLAYWRIGHT_MODULE_PATH");
async function chromiumPath() {
  if (process.env.CHROMIUM_EXECUTABLE_PATH) return process.env.CHROMIUM_EXECUTABLE_PATH;
  for (const base of [process.env.LOCALAPPDATA, process.env.USERPROFILE && path.join(process.env.USERPROFILE, "AppData/Local")].filter(Boolean)) {
    const cache = path.join(base, "ms-playwright");
    for (const entry of (await readdir(cache).catch(() => [])).filter((name) => /^chromium_headless_shell-\d+$/.test(name)).sort().reverse()) {
      const binary = path.join(cache, entry, "chrome-headless-shell-win64/chrome-headless-shell.exe");
      try { await access(binary); return binary; } catch { /* Try installed revision. */ }
    }
  }
}
const baseUrl = process.env.BASE_URL || "http://localhost:4174";
const outputDir = process.env.QA_OUTPUT_DIR || path.join(rootDir, "node_modules/.cache/premium-qa", engine);
await mkdir(outputDir, { recursive: true });
const browser = await playwright[engine].launch({ headless: true, ...(engine === "chromium" ? { executablePath: await chromiumPath() } : {}) });
const request = await playwright.request.newContext({ baseURL: baseUrl });
const runtimeResponse = await request.get("/runtime-config.js");
assert.ok(runtimeResponse.ok(), "Preview server must expose built runtime configuration");
const runtime = await runtimeResponse.text();
const config = JSON.parse(runtime.match(/Object\.freeze\(({[\s\S]*})\)/)?.[1] || "null");
assert.ok(config?.checkoutUrl, "Valid site configuration");
const tracking = /connect\.facebook\.net|facebook\.com\/tr|googletagmanager\.com|google-analytics\.com/;
const scope = process.env.QA_SCOPE || "full";
const desktopHeight = Number(process.env.QA_DESKTOP_HEIGHT || 1000);
const report = { status: "RUNNING", engine, scope, baseUrl, widths: [], checks: [], limitations: ["Browser emulation on Windows does not replace a physical iPhone test."] };
const frozenTime = new Date("2026-10-28T21:00:00Z");
let lastPage;
function fixture(overrides = {}) {
  return { ...config, ...overrides, popup: { ...config.popup, ...overrides.popup }, campaign: { ...config.campaign, ...overrides.campaign }, socialProof: { ...config.socialProof, ...overrides.socialProof } };
}
async function boot(overrides = {}, options = {}) {
  const context = await browser.newContext({ viewport: { width: options.width || 390, height: options.height || (options.width > 768 ? desktopHeight : 844) }, isMobile: (options.width || 390) <= 430, hasTouch: (options.width || 390) <= 430, reducedMotion: options.motion || "reduce", ...options.context });
  const metrics = { errors: [], failed: [], tracking: [], calls: [], loaders: 0 };
  const current = fixture(overrides);
  await context.route("**/runtime-config.js", (route) => route.fulfill({ contentType: "text/javascript", body: `window.LANDING_CONFIG = Object.freeze(${JSON.stringify(current)});` }));
  await context.route(tracking, async (route) => {
    metrics.tracking.push(route.request().url());
    if (options.mockAnalytics && route.request().url().includes("fbevents.js")) {
      metrics.loaders++;
      await route.fulfill({ contentType: "text/javascript", body: "window.__metaCalls = Array.from(window.fbq.queue); window.fbq.callMethod = function(){window.__metaCalls.push(Array.from(arguments));};" });
    } else await route.abort();
  });
  if (options.storage) await context.addInitScript((record) => localStorage.setItem("mantras.analytics.consent.v2", record), options.storage);
  if (options.visibility) await context.addInitScript(() => { window.__qaHidden = false; Object.defineProperty(document, "visibilityState", { configurable: true, get: () => window.__qaHidden ? "hidden" : "visible" }); });
  const page = await context.newPage(); lastPage = page;
  page.on("pageerror", (error) => metrics.errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") metrics.errors.push(message.text()); });
  page.on("response", (response) => { if (response.url().startsWith(baseUrl) && response.status() >= 400) metrics.failed.push(`${response.status()} ${response.url()}`); });
  if (options.clock) { await page.clock.install({ time: new Date(frozenTime.getTime() - 1000) }); await page.clock.pauseAt(frozenTime); }
  await page.goto(baseUrl + (options.query || ""), { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("data-premium-interactions-ready"), "true", "one premium interaction module initializes");
  return { context, page, metrics, current };
}
async function click(page, selector) { await page.locator(selector).first().evaluate((element) => element.click()); }
async function opened(page, id = "offerPopup") { return page.locator("#" + id).evaluate((dialog) => dialog.open); }
async function scrollAll(page) {
  await page.evaluate(async () => { for (let position = 0; position < document.documentElement.scrollHeight; position += 650) { scrollTo({ top: position, behavior: "instant" }); await new Promise((resolve) => setTimeout(resolve, 100)); } });
}
async function settleDialogs(page) { await page.waitForFunction(() => document.querySelectorAll("dialog[open]").length === 0, null, { polling: 50 }); }
try {
  assert.equal(config.price, 9.9, "configured product price matches the inspected Cakto checkout");
  assert.equal(config.checkoutUrl, "https://pay.cakto.com.br/323zgdr_1243414");
  assert.equal(config.analytics.metaPixelId, "2429955871112248");
  assert.equal(config.campaign.endsAt, null, "no unconfirmed promotional deadline is published");
  assert.equal(config.popup.initialDelayMs, 6000);
  assert.equal(config.popup.repeatDelayMs, 4000);
  assert.ok(Number.isInteger(config.popup.maxDisplaysPerSession) && config.popup.maxDisplaysPerSession > 0, "popup repetition has an explicit finite session cap");
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    const { context, page, metrics } = await boot({ popup: { enabled: false } }, { width });
    await scrollAll(page);
    const layout = await page.evaluate(() => {
      const visible = (element) => Boolean(element.getClientRects().length) && getComputedStyle(element).visibility !== "hidden";
      return {
        viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth,
        hero: document.querySelectorAll("#inicio").length, h1: document.querySelectorAll("h1").length,
        footer: document.querySelectorAll("footer.site-footer").length, closing: document.querySelectorAll(".closing").length,
        dialogs: document.querySelectorAll("dialog[open]").length,
        h1Size: parseFloat(getComputedStyle(document.querySelector("h1")).fontSize),
        checkout: [...document.querySelectorAll("a[data-checkout]")].map((link) => ({ href: link.href, location: link.dataset.ctaLocation, visible: visible(link), height: link.getBoundingClientRect().height })),
        missingImages: [...document.images].filter((image) => {
          if (!visible(image)) return false;
          const carousel = image.closest("[data-carousel]");
          if (carousel) {
            const rect = image.getBoundingClientRect();
            const clip = carousel.getBoundingClientRect();
            // Correct lazy loading need not fetch slides outside the horizontal clip.
            if (rect.right <= clip.left || rect.left >= clip.right) return false;
          }
          return !image.complete || image.naturalWidth <= 0;
        }).map((image) => image.getAttribute("src")),
        clipped: [...document.querySelectorAll("h1,h2,h3,summary,figcaption,.offer-list li")].filter((element) => visible(element) && ["hidden", "clip"].includes(getComputedStyle(element).overflowX) && element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent.trim()),
        tinyBody: [...document.querySelectorAll(".hero-description,.section-description,.step-card p,.benefit-card p,.faq-list details>p")].filter(visible).filter((element) => parseFloat(getComputedStyle(element).fontSize) < 16).map((element) => element.className),
        ids: [...document.querySelectorAll("[id]")].map((element) => element.id),
        styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map((element) => element.getAttribute("href")),
      };
    });
    assert.ok(layout.document <= layout.viewport + 1, `${width}px: no horizontal page overflow (${layout.document})`);
    assert.equal(layout.hero, 1); assert.equal(layout.h1, 1); assert.equal(layout.footer, 1); assert.equal(layout.closing, 1);
    assert.equal(layout.dialogs, 0, `${width}px: no unsolicited cookie or duplicate modal`);
    assert.ok(layout.h1Size >= (width <= 430 ? 34 : 40), `${width}px: headline is visually dominant`);
    assert.deepEqual(layout.clipped, [], `${width}px: no clipped heading or caption`);
    assert.deepEqual(layout.tinyBody, [], `${width}px: reading copy is at least 16px`);
    assert.deepEqual(layout.missingImages, [], `${width}px: visible assets decode correctly`);
    assert.equal(layout.ids.length, new Set(layout.ids).size, `${width}px: unique DOM IDs`);
    assert.equal(layout.styles.length, 1, `${width}px: one consolidated stylesheet`);
    if (!report.stylesheets) report.stylesheets = layout.styles;
    assert.ok(layout.checkout.length >= 5, `${width}px: purchase actions are distributed across the journey`);
    assert.equal(layout.checkout.map((link) => link.location).length, new Set(layout.checkout.map((link) => link.location)).size, "checkout locations are uniquely attributed");
    for (const link of layout.checkout) { assert.equal(link.href, config.checkoutUrl); if (link.visible) assert.ok(link.height >= 48, `${width}px: comfortable checkout touch target`); }
    assert.deepEqual(metrics.errors, [], `${width}px: no JS or console errors`);
    assert.deepEqual(metrics.failed, [], `${width}px: no missing resources`);
    assert.deepEqual(metrics.tracking, [], `${width}px: no optional tracking before consent`);
    assert.equal(await page.locator('[data-social-rating]:visible').count(), 0, "no unsupported numerical rating");
    assert.equal(await page.locator('[data-social-stars]:visible').count(), 0, "no unsupported star score");
    const pdfImages = page.locator('[data-image-group="ebook"]');
    const testimonialImages = page.locator('[data-image-group="testimonials"]');
    assert.ok(await pdfImages.count() >= 4, "real edition pages are integrated");
    assert.equal(await testimonialImages.count(), config.content.testimonials.length, "all supplied WhatsApp screenshots are integrated");
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => scrollY === 0);
    const firstAction = await page.locator("#heroCheckout").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
    });
    assert.ok(firstAction.top >= 0 && firstAction.bottom <= firstAction.viewport + 1, `${width}px: hero purchase action fits completely in the first viewport`);
    await page.screenshot({ path: path.join(outputDir, `hero-${width}.png`) });
    await page.screenshot({ path: path.join(outputDir, `full-${width}.png`), fullPage: true });
    await page.locator(".offer-card").screenshot({ path: path.join(outputDir, `offer-${width}.png`), style: ".reading-progress { visibility: hidden; }" });
    await page.locator(".closing").screenshot({ path: path.join(outputDir, `closing-${width}.png`) });
    await page.locator("#offerPopup").evaluate((dialog) => dialog.showModal());
    const popupBounds = await page.locator("#offerPopup").evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewport: innerWidth, height: innerHeight, scrollWidth: dialog.scrollWidth, clientWidth: dialog.clientWidth };
    });
    assert.ok(popupBounds.left >= -1 && popupBounds.right <= popupBounds.viewport + 1 && popupBounds.top >= -1 && popupBounds.bottom <= popupBounds.height + 1, `${width}px: popup remains inside the viewport`);
    assert.ok(popupBounds.scrollWidth <= popupBounds.clientWidth + 1, `${width}px: popup has no sideways overflow`);
    assert.equal(await page.locator("#offerPopup [data-popup-close]").first().isVisible(), true);
    await page.screenshot({ path: path.join(outputDir, `popup-${width}.png`) });
    await click(page, "[data-popup-close]"); await settleDialogs(page);
    report.widths.push({ width, overflow: false, headlinePx: layout.h1Size, heroCtaBottom: Math.round(firstAction.bottom), viewportHeight: firstAction.viewport, checkoutCount: layout.checkout.length, consoleErrors: 0 });
    await context.close();
  }
  report.checks.push("Seven responsive widths, unique hero/closing/footer, readable copy, complete images and checkout integrity.");

  if (scope === "layout") {
    for (const width of [390, 1440]) {
      const { context, page, metrics } = await boot({ popup: { enabled: false } }, { width, motion: "no-preference" });
      await scrollAll(page);
      for (const [name, selector] of [["benefits", ".benefit-lead"], ["explorer", ".explorer-intro"], ["guarantee", ".guarantee-copy"]]) {
        const section = page.locator(selector);
        await section.scrollIntoViewIfNeeded();
        await page.waitForFunction((target) => {
          const element = document.querySelector(target);
          return element.classList.contains("is-visible") && element.getBoundingClientRect().height > 0 && Number(getComputedStyle(element).opacity) >= .99;
        }, selector);
        await section.screenshot({ path: path.join(outputDir, `reveal-${name}-${width}.png`) });
      }
      assert.deepEqual(metrics.errors, []);
      await context.close();
    }
    report.checks.push("Normal-motion benefit, explorer and guarantee entries reveal completely at mobile and desktop sizes.");
  }

  if (scope !== "layout") {
  // Complete lightbox/carousel/explorer behavior with authentic content and no popup interruptions.
  {
    const { context, page } = await boot({ popup: { enabled: false } });
    for (const group of ["ebook", "testimonials"]) {
      const triggers = page.locator(`[data-image-group="${group}"]`);
      const count = await triggers.count();
      await triggers.first().click();
      assert.equal(await opened(page, "imageDialog"), true);
      await page.locator("#lightboxImage").evaluate((image) => image.decode());
      await page.screenshot({ path: path.join(outputDir, `lightbox-${group}-390.png`) });
      assert.equal(await page.locator("#imageDialog").getAttribute("data-image-index"), "0");
      await click(page, '[data-image-step="1"]');
      assert.equal(await page.locator("#imageDialog").getAttribute("data-image-index"), String(count > 1 ? 1 : 0));
      await page.keyboard.press("ArrowLeft");
      assert.equal(await page.locator("#imageDialog").getAttribute("data-image-index"), "0");
      const focusIsInside = await page.locator("#imageDialog").evaluate((dialog) => dialog.contains(document.activeElement));
      assert.ok(focusIsInside, "lightbox keeps focus inside");
      for (let tab = 0; tab < 5; tab++) await page.keyboard.press("Tab");
      assert.ok(await page.locator("#imageDialog").evaluate((dialog) => dialog.contains(document.activeElement)), "Tab cannot escape the modal into the page");
      await page.keyboard.press("Escape"); await settleDialogs(page);
      assert.ok(await triggers.first().evaluate((element) => element === document.activeElement), "lightbox returns focus to its trigger");
    }
    for (const track of await page.locator("[data-carousel][id]").all()) {
      const id = await track.getAttribute("id");
      const overflow = await track.evaluate((element) => element.scrollWidth > element.clientWidth + 2);
      if (!overflow) continue;
      const next = page.locator(`[data-carousel-target="${id}"][data-carousel-step="1"]`);
      const before = await track.evaluate((element) => element.scrollLeft);
      await next.click();
      await page.waitForFunction((target) => document.getElementById(target).scrollLeft > 0, id);
      assert.ok(await track.evaluate((element) => element.scrollLeft) > before, "carousel arrow advances");
      await track.focus(); await page.keyboard.press("ArrowRight");
      assert.ok(await track.evaluate((element) => element.scrollLeft) > 0, "native horizontal keyboard navigation remains available");
      if (engine === "chromium") {
        await track.evaluate((element) => { element.scrollLeft = 0; });
        await track.scrollIntoViewIfNeeded();
        const rect = await track.boundingBox();
        const session = await context.newCDPSession(page);
        const y = Math.max(40, Math.min(700, rect.y + 80));
        const start = Math.min(370, rect.x + rect.width - 20);
        const end = Math.max(20, rect.x + 20);
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: start, y }] });
        for (let step = 1; step <= 8; step++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start + (end - start) * step / 8, y }] });
        await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForFunction((target) => document.getElementById(target).scrollLeft > 0, id);
        await session.detach();
      }
    }
    assert.equal(await page.locator("#journeySelect option").count(), 10);
    for (const journey of config.content.journeys) {
      await page.selectOption("#journeySelect", journey.id);
      assert.equal(await page.locator("#mantraText").textContent(), journey.samples[0].text);
      assert.equal(await page.locator("#mantraJourney").textContent(), journey.title);
      await click(page, "[data-mantra-next]");
      assert.equal(await page.locator("#mantraText").textContent(), journey.samples[journey.samples.length > 1 ? 1 : 0].text);
    }
    const pause = page.locator("[data-motion-toggle], [data-journey-motion]").first();
    const motionTarget = await pause.getAttribute("data-motion-toggle") || await pause.getAttribute("data-journey-motion") || "journeyMarquee";
    const strip = page.locator("#" + motionTarget);
    const journeyNames = await strip.textContent();
    for (const journey of config.content.journeys) assert.ok(journeyNames.includes(journey.title), "the animated strip uses each original journey title");
    await pause.click(); assert.equal(await pause.getAttribute("aria-pressed"), "true");
    assert.equal(await strip.getAttribute("data-paused"), "true");
    await context.close();
  }
  report.checks.push("PDF and WhatsApp lightbox navigation, focus/Escape, carousel arrows, keyboard and all ten real mantra selections.");

  // Fixture data verifies readiness only; no test rating or duplicate image is published.
  {
    const image = config.content.testimonials[0]?.src || config.content.gallery[0]?.src;
    const { context, page } = await boot({ popup: { enabled: false }, socialProof: { avatars: [{ src: image, alt: "Imagem fornecida: fixture de integração" }, { src: image, alt: "Imagem fornecida: segunda posição de teste" }], verified: true, rating: 4.2, ratingCount: 5, text: "Prévia de integração, sem publicação" } });
    const proof = page.locator("[data-social-proof]").first();
    assert.equal(await proof.isVisible(), true);
    assert.equal(await proof.locator("[data-social-avatars] img").count(), 2);
    assert.equal(await proof.locator("[data-social-rating]").textContent(), "4,2/5");
    assert.equal(await proof.locator("[data-social-stars]").isVisible(), true);
    assert.equal(await proof.locator("[data-social-count]").textContent(), "5 avaliações");
    const overlap = await proof.locator("[data-social-avatars] img").evaluateAll((images) => images[1].getBoundingClientRect().left < images[0].getBoundingClientRect().right);
    assert.ok(overlap, "supplied avatar slots have the requested overlapping composition");
    await context.close();
  }
  report.checks.push("Social proof remains empty without evidence and accepts future authorized avatar/rating fixture data without rebuilding the component.");

  // Real 6s / 4s configuration exercised with the browser's controlled clock.
  {
    const { context, page } = await boot({ popup: { enabled: true, exitIntentEnabled: false, maxDisplaysPerSession: 3 } }, { clock: true });
    await page.locator("#heroCheckout").focus();
    await page.clock.runFor(5999); assert.equal(await opened(page), false, "popup waits six foreground seconds");
    await page.clock.runFor(1); assert.equal(await opened(page), true, "popup opens at six seconds");
    assert.equal(await page.locator("dialog[open]").count(), 1);
    assert.ok(await page.locator("#offerPopup").evaluate((dialog) => dialog.contains(document.activeElement)), "popup receives focus");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.ctaLocation), "popup", "popup initially focuses its existing checkout CTA");
    await click(page, "[data-popup-close]"); await page.clock.runFor(1);
    assert.equal(await opened(page), false, "close button works");
    assert.equal(await page.evaluate(() => document.activeElement.id), "heroCheckout", "popup returns focus");
    await page.clock.runFor(3998); assert.equal(await opened(page), false, "repeat does not open before four seconds");
    await page.clock.runFor(2); assert.equal(await opened(page), true, "popup reopens four seconds after dismissal");
    await page.keyboard.press("Escape"); await page.clock.runFor(1);
    assert.equal(await opened(page), false, "Escape dismisses popup");
    await page.clock.runFor(4000); assert.equal(await opened(page), true);
    assert.equal(await page.locator("#offerPopup").getAttribute("data-popup-display-count"), "3");
    await click(page, "[data-popup-close]"); await page.clock.runFor(20000);
    assert.equal(await opened(page), false, "session cap prevents an endless interruption loop");
    await page.reload({ waitUntil: "networkidle" }); await page.clock.runFor(20000);
    assert.equal(await opened(page), false, "session cap persists across reloads");
    await context.close();
  }
  {
    const { context, page } = await boot({ popup: { enabled: true, exitIntentEnabled: false } }, { clock: true, visibility: true });
    await page.clock.runFor(2000);
    await page.evaluate(() => { window.__qaHidden = true; document.dispatchEvent(new Event("visibilitychange")); });
    await page.clock.runFor(30000); assert.equal(await opened(page), false, "hidden tab cannot open a popup");
    await page.evaluate(() => { window.__qaHidden = false; document.dispatchEvent(new Event("visibilitychange")); });
    await page.clock.runFor(3999); assert.equal(await opened(page), false);
    await page.clock.runFor(1); assert.equal(await opened(page), true, "only foreground time counts toward the delay");
    await context.close();
  }
  {
    const { context, page } = await boot({ popup: { enabled: true, exitIntentEnabled: false } }, { clock: true });
    await page.clock.runFor(2000); await click(page, "[data-consent-preferences]");
    await page.clock.runFor(10000);
    assert.equal(await opened(page), false, "offer never opens on top of privacy preferences");
    assert.equal(await page.locator("dialog[open]").count(), 1);
    await click(page, "[data-consent-close]"); await page.clock.runFor(1);
    await page.clock.runFor(3998); assert.equal(await opened(page), false);
    await page.clock.runFor(2); assert.equal(await opened(page), true, "delay resumes after another modal closes");
    await context.close();
  }
  {
    const { context, page } = await boot({ popup: { enabled: true, exitIntentEnabled: false } }, { clock: true });
    await page.locator("#heroCheckout").evaluate((link) => link.addEventListener("click", (event) => event.preventDefault(), { once: true }));
    await click(page, "#heroCheckout"); await page.clock.runFor(30000);
    assert.equal(await opened(page), false, "checkout click cancels the offer schedule");
    assert.equal(await page.locator("#offerPopup").getAttribute("data-popup-state"), "checkout");
    await context.close();
  }
  report.checks.push("Popup initial 6000ms / repeat 4000ms, close/Escape/focus, session cap, background pause, modal conflict and checkout suppression.");

  {
    const { context, page, metrics } = await boot({}, { clock: true });
    await page.clock.runFor(6000);
    await page.locator('#offerPopup [data-popup-close]').first().focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await opened(page), false, 'keyboard can leave the offer instead of cycling indefinitely');
    await page.clock.runFor(4000);
    const scroll = await page.evaluate(() => scrollY);
    await click(page, '[data-popup-continue]');
    await page.clock.runFor(15000);
    assert.equal(await opened(page), false, 'continue suppresses repeated offers');
    assert.equal(await page.evaluate(() => scrollY), scroll, 'continue preserves reading position');
    await page.reload({waitUntil:'networkidle'}); await page.clock.runFor(15000);
    assert.equal(await opened(page), false, 'continue choice persists for the session');
    assert.deepEqual(metrics.tracking, [], 'continue never triggers optional tracking');
    await context.close();
  }

  // A shared absolute deadline ticks correctly and does not restart on reload.
  {
    const endsAt = new Date(frozenTime.getTime() + 3661000).toISOString();
    const { context, page } = await boot({ popup: { enabled: false }, campaign: { endsAt, message: "Campanha de teste", expiredMessage: "Prazo de teste encerrado" } }, { clock: true });
    assert.equal(await page.locator("[data-campaign-timer]").first().isVisible(), true);
    const clockValue = async () => page.locator("[data-countdown]").evaluateAll((elements) => Object.fromEntries(elements.map((element) => [element.dataset.countdown, element.textContent])));
    assert.deepEqual(await clockValue(), { hours: "01", minutes: "01", seconds: "01" });
    await page.clock.runFor(1000); assert.deepEqual(await clockValue(), { hours: "01", minutes: "01", seconds: "00" });
    await page.reload({ waitUntil: "networkidle" });
    assert.deepEqual(await clockValue(), { hours: "01", minutes: "01", seconds: "00" }, "deadline does not restart for the visitor");
    await page.clock.fastForward(3660000);
    assert.equal(await page.locator("[data-campaign-timer]").first().isVisible(), false);
    assert.equal(await page.locator("[data-campaign-state]").first().getAttribute("data-campaign-state"), "expired");
    assert.equal(await page.locator("[data-campaign-message]").first().textContent(), "Prazo de teste encerrado");
    await context.close();
  }
  {
    const { context, page } = await boot({ popup: { enabled: false }, campaign: { endsAt: null } });
    assert.equal(await page.locator("[data-campaign-timer]").first().isVisible(), false);
    assert.equal(await page.locator("[data-campaign-state]").first().getAttribute("data-campaign-state"), "neutral");
    await context.close();
  }
  report.checks.push("Absolute campaign clock ticks every second, survives reload, expires without resetting and remains neutral without a real deadline.");

  // Optional analytics is stubbed, so the test cannot contaminate campaign metrics.
  for (const stored of ["invalid-json", JSON.stringify({ version: 2, status: "accepted", updatedAt: Date.now() - 200 * 86400000, expiresAt: Date.now() - 86400000 })]) {
    const { context, metrics } = await boot({ popup: { enabled: false } }, { storage: stored });
    assert.deepEqual(metrics.tracking, [], "invalid consent cannot initialize optional SDKs"); await context.close();
  }
  {
    const { context, page, metrics } = await boot({ popup: { enabled: false } }, { mockAnalytics: true, query: "?utm_source=qa&utm_campaign=premium&src=review&sck=landing" });
    assert.equal(metrics.loaders, 0);
    await click(page, "[data-consent-preferences]"); await click(page, '[data-consent="denied"]');
    await page.reload({ waitUntil: "networkidle" }); assert.equal(metrics.loaders, 0);
    await click(page, "[data-consent-preferences]"); await click(page, '[data-consent="accepted"]');
    await page.waitForFunction(() => window.__metaCalls?.some((args) => args[1] === "PageView"));
    const calls = () => page.evaluate(() => window.__metaCalls || []);
    assert.equal(metrics.loaders, 1); assert.equal((await calls()).filter((args) => args[1] === "PageView").length, 1);
    assert.ok((await calls()).some((args) => args[0] === "init" && args[1] === "2429955871112248"));
    await page.locator("#oferta").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__metaCalls?.some((args) => args[1] === "OfferViewed"));
    await page.locator("#inicio").scrollIntoViewIfNeeded(); await page.locator("#oferta").scrollIntoViewIfNeeded();
    assert.equal((await calls()).filter((args) => args[1] === "OfferViewed").length, 1);
    await page.locator("#heroCheckout").evaluate((link) => link.addEventListener("click", (event) => event.preventDefault(), { once: true }));
    await page.locator("#heroCheckout").click();
    assert.equal((await calls()).filter((args) => args[1] === "InitiateCheckout").length, 1);
    assert.equal((await calls()).find((args) => args[1] === "InitiateCheckout")[2].value, 9.9);
    assert.ok(!(await calls()).some((args) => args[1] === "Purchase"));
    const checkout = new URL(await page.locator("#heroCheckout").getAttribute("href"));
    for (const [key, value] of Object.entries({ utm_source: "qa", utm_campaign: "premium", src: "review", sck: "landing" })) assert.equal(checkout.searchParams.get(key), value);
    await click(page, "[data-consent-preferences]");
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle" }), click(page, '[data-consent="denied"]')]);
    assert.equal(await page.evaluate(() => typeof window.fbq), "undefined"); assert.equal(metrics.loaders, 1);
    await context.close();
  }
  report.checks.push("Consent rejection, invalid records, explicit acceptance, revocation, Meta Pixel ID, single PageView/OfferViewed/InitiateCheckout, no Purchase and UTM forwarding.");

  for (const width of [390, 1440]) {
    const { context, page, metrics } = await boot({ popup: { enabled: false } }, { width, motion: "no-preference" });
    await scrollAll(page);
    const hidden = await page.locator("main h1, main h2, main a[data-checkout]").evaluateAll((elements) => elements.filter((element) => {
      if (!element.getClientRects().length) return false;
      for (let parent = element; parent; parent = parent.parentElement) if (Number(getComputedStyle(parent).opacity) === 0) return true;
      return false;
    }).map((element) => element.id || element.textContent.trim().slice(0,60)));
    assert.deepEqual(hidden, [], `${width}px: normal-motion reveal wrappers never hide important content`);
    assert.deepEqual(metrics.errors, []);
    await context.close();
  }
  const html = await (await request.get("/")).text();
  const video = html.match(/<source\b[^>]*src="([^"]+)"[^>]*type="video\/mp4"/)?.[1];
  if (video) {
    const head = await request.head(video); assert.equal(head.headers()["content-type"], "video/mp4"); assert.equal(head.headers()["accept-ranges"], "bytes");
    const range = await request.get(video, { headers: { Range: "bytes=0-1" } }); assert.equal(range.status(), 206); assert.equal((await range.body()).length, 2);
    const invalid = await request.get(video, { headers: { Range: "bytes=999999999999-" } }); assert.equal(invalid.status(), 416);
    const { context, page } = await boot({ popup: { enabled: false } });
    const player = page.locator("video").first();
    assert.ok(await player.evaluate((element) => element.controls && element.playsInline && !element.autoplay), "video retains native controls and inline playback without autoplay");
    const play = page.locator("#videoPlay");
    if (await play.count() && await play.isVisible()) await play.click();
    else await player.click();
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0, null, { timeout: 15000 });
    await player.evaluate((element) => element.pause());
    await context.close();
  }
  report.checks.push("Normal/reduced motion and MP4 byte-range support.");
  }
  report.status = "PASS";
  await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, artifacts: outputDir }, null, 2));
} catch (error) {
  report.status = "FAIL"; report.error = error.message;
  await lastPage?.screenshot({ path: path.join(outputDir, "failure.png") }).catch(() => {});
  await writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  throw error;
} finally { await request.dispose(); await browser.close(); }
