import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { rootDir } from "./config.mjs";

const distDir = path.join(rootDir, "dist");
const output = (file) => readFile(path.join(distDir, file), "utf8");
const expectedCheckout = "https://pay.cakto.com.br/323zgdr_1243414";
const expectedPixel = "2429955871112248";
const expectedCta = "QUERO ACESSAR OS 500 MANTRAS";
const attr = (tag, name) => tag.match(new RegExp("\\b" + name + "=([\\\"'])((?:(?!\\1)[\\s\\S])*?)\\1"))?.[2];
const plainText = (markup) => markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const hash = (source) => createHash("sha256").update(source).digest("hex").slice(0, 12);
const exists = async (relative) => {
  const info = await stat(path.join(distDir, relative.replace(/^\//, "")));
  assert.ok(info.isFile() && info.size > 0, "production asset exists: " + relative);
};

const html = await output("index.html");
const runtime = await output("runtime-config.js");
const runtimeJson = runtime.match(/Object\.freeze\(({[\s\S]*})\);?\s*$/)?.[1];
assert.ok(runtimeJson, "runtime-config exposes a JSON configuration object");
const config = JSON.parse(runtimeJson);
const sourceContent = JSON.parse(await readFile(path.join(rootDir, "data", "product-content.json"), "utf8"));
const vercel = JSON.parse(await readFile(path.join(rootDir, "vercel.json"), "utf8"));

// Commercial and measurement invariants, independent of visual copy or spacing.
assert.equal(config.checkoutUrl, expectedCheckout, "the original Cakto checkout is preserved");
assert.equal(config.price, 9.9, "the confirmed ebook price is R$ 9,90");
assert.equal(config.currency, "BRL");
assert.equal(config.analytics.metaPixelId, expectedPixel, "the existing Meta Pixel is preserved");
assert.equal(config.supportEmail, "empresakagency@gmail.com", "support contact is preserved");
assert.equal(Math.round((config.price + config.checkoutServiceFee) * 100), Math.round(config.checkoutTotal * 100), "the configured product price, fee and total remain consistent");
assert.equal(config.experiment.enabled, false, "unapproved copy experiments remain disabled");
const checkoutAnchors = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]).filter((anchor) => /\bdata-checkout(?:[\s=>])/.test(anchor));
assert.ok(checkoutAnchors.length >= 4, "checkout actions are available across the purchase journey");
for (const anchor of checkoutAnchors) {
  assert.equal(attr(anchor, "href"), expectedCheckout, "every checkout action uses the configured Cakto URL");
  assert.equal(plainText(anchor), expectedCta, "purchase actions share one clear label");
  assert.ok(attr(anchor, "data-cta-location"), "checkout actions retain placement attribution");
}
assert.ok(html.includes("R$ 9,90") && html.includes("127 páginas"), "the actual price and page count are visible");
assert.ok(/pagamento único/i.test(html), "the payment model is disclosed");
assert.ok(/(?:taxa|total)[\s\S]{0,180}checkout/i.test(plainText(html)), "the checkout total and optional fees are disclosed");
assert.ok(!html.includes('class="optional-complements"'), "optional complements are offered only at checkout");
assert.match(plainText(html), /complementos[\s\S]{0,180}opcionais|opcionais[\s\S]{0,180}complementos/i, "separately charged complements are explicitly optional");
assert.ok(/<s>R\$ 49,90<\/s>/.test(html), "the reference price supplied by the owner is displayed accessibly");

// A single visual architecture, with no legacy styling or presentation runtimes.
const stylesheets = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]).filter((tag) => attr(tag, "rel") === "stylesheet");
assert.equal(stylesheets.length, 1, "the landing page has one stylesheet, avoiding stacked themes");
const cssUrl = attr(stylesheets[0], "href");
assert.match(cssUrl, /^\/assets\/styles\.[a-f0-9]{12}\.css$/, "CSS has a content-versioned URL");
const css = await output(cssUrl.slice(1));
assert.ok(cssUrl.includes(hash(css)), "the CSS asset name matches its bytes");
const scriptTags = [...html.matchAll(/<script\b[^>]*\bsrc=[^>]*>/g)].map((match) => match[0]);
assert.equal(scriptTags.length, 3, "only config, integration and presentation scripts are loaded");
const scriptSources = scriptTags.map((tag) => attr(tag, "src"));
assert.equal(new Set(scriptSources).size, scriptSources.length, "no script is loaded twice");
assert.equal(scriptSources.filter((url) => url === "/runtime-config.js").length, 1);
assert.ok(scriptTags.every((tag) => /\bdefer(?:\s|>)/.test(tag)), "page scripts are deferred");
const builtScript = async (name) => {
  const url = scriptSources.find((src) => new RegExp("^/assets/" + name + "\\.[a-f0-9]{12}\\.js$").test(src));
  assert.ok(url, "the current " + name + " script is loaded once with a content hash");
  const source = await output(url.slice(1));
  assert.ok(url.includes(hash(source)), name + " asset name matches its content");
  new vm.Script(source, { filename: url });
  return source;
};
const app = await builtScript("app");
const interactions = await builtScript("interactions");
assert.ok(!/(?:premium-content-v\d|premium-interactions-v\d|landing-light-theme|brand-horizontal-v\d|\/ui\.)(?:[^\"']*)\.(?:css|js)/.test(html), "legacy CSS and presentation scripts are not mounted");
for (const id of ["inicio", "oferta", "rodape", "closing-title", "offerPopup", "imageDialog", "consentPreferences", "journeySelect"]) assert.equal((html.match(new RegExp('\\bid="' + id + '"', "g")) || []).length, 1, "there is one integrated component target: " + id);
assert.equal((html.match(/<footer\b/g) || []).length, 1, "the institutional footer is not duplicated");
assert.ok(css.includes("prefers-reduced-motion"), "motion reduction is supported");
assert.ok(/font-display:\s*swap/.test(css), "local fonts have a rendering fallback");
assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(html + css), "font loading does not depend on third-party requests");

// Campaign and popup rules are configuration, never fabricated visitor deadlines.
assert.ok(config.campaign && Object.hasOwn(config.campaign, "endsAt"), "a campaign deadline is centrally configurable");
if (config.campaign.endsAt !== null) {
  assert.match(config.campaign.endsAt, /(?:Z|[+-]\d{2}:\d{2})$/, "a real campaign deadline includes its timezone");
  assert.ok(Number.isFinite(Date.parse(config.campaign.endsAt)), "the campaign deadline is a valid timestamp");
}
const campaignClocks = [...html.matchAll(/<[^>]+\bdata-campaign-timer(?:\s|=|>)[^>]*>/g)].map((match) => match[0]);
assert.ok(campaignClocks.length > 0, "the configured campaign clock is integrated into the page");
if (config.campaign.endsAt === null) assert.ok(campaignClocks.every((clock) => /\bhidden(?:\s|>)/.test(clock)), "an unconfigured clock starts hidden instead of showing artificial urgency");
for (const unit of ["hours", "minutes", "seconds"]) assert.ok(html.includes('data-countdown="' + unit + '"'), "the clock supports " + unit);
const popupOpening = html.match(/<dialog\b[^>]*\bid="offerPopup"[^>]*>/)?.[0];
assert.ok(popupOpening && !/\sopen(?:[\s=>])/.test(popupOpening), "the offer popup does not bypass its configured initial delay");
assert.equal(config.popup.initialDelayMs, 6000, "first popup delay follows the requested six seconds");
assert.equal(config.popup.repeatDelayMs, 4000, "popup recurrence follows the requested four seconds");
assert.equal(config.popup.repeatEnabled, true);
assert.equal(config.popup.exitIntentEnabled, true);
assert.ok(Number.isSafeInteger(config.popup.maxDisplaysPerSession) && config.popup.maxDisplaysPerSession > 0, "popup frequency has an explicit, adjustable session cap");
assert.equal(config.guarantee.days, 7, "the configured warranty duration is seven days");
assert.equal(typeof config.guarantee.confirmed, "boolean", "warranty publication requires confirmation");
if (config.guarantee.confirmed) {
  assert.ok(html.includes('id="garantia"') && /7\s*dias|sete dias/i.test(plainText(html)), "a confirmed warranty has its own clearly described section");
} else {
  assert.ok(!html.includes('id="garantia"'), "an unconfirmed warranty is not published as an offer");
}

// The final PDF and owner-supplied screenshots are the only content sources.
assert.ok(config.content, "verified editorial content is included in runtime configuration");
assert.equal(config.content.pageCount, 127);
assert.equal(config.content.mantraCount, 500);
assert.equal(config.content.journeyCount, 10);
assert.equal(config.content.journeys.length, 10);
assert.equal(config.content.journeys.reduce((sum, journey) => sum + journey.samples.length, 0), 30);
assert.deepEqual(config.content.journeys, sourceContent.journeys, "explorer samples and original journey names match the audited PDF data");
assert.equal(new Set(config.content.journeys.map((journey) => journey.id)).size, 10, "journey identifiers are unique");
for (const journey of config.content.journeys) {
  assert.ok(html.includes(journey.title), "each original journey is represented in the rendered page: " + journey.title);
  assert.ok(journey.samples.every((sample) => sample.text.length > 15 && Number.isInteger(sample.number) && Number.isInteger(sample.page)), "every explorer sample has its original text and PDF source");
}
assert.equal(config.content.gallery.length, 7, "the final edition supplies seven selected real page previews");
assert.equal(config.content.testimonials.length, 5, "only the five distinct owner-supplied WhatsApp screenshots are available");
assert.deepEqual(config.content.socialProof.avatars, [], "no unprovided portrait is used as a fabricated buyer avatar");
assert.equal(config.content.socialProof.rating, null, "there is no unverified aggregate rating");
assert.equal(config.content.socialProof.ratingCount, null);
assert.equal(config.content.socialProof.buyerCount, null);
assert.ok(!/[0-5][.,]\d{1,2}\s*\/\s*5/.test(plainText(html)), "the rendered page contains no invented review score");
for (const item of [...config.content.gallery, ...config.content.testimonials]) {
  for (const file of [item.src, item.thumbnail]) {
    assert.match(file, /^\/assets\/(?:edition|testimonials)\/[a-z0-9-]+\.webp$/, "content images use local, documented assets");
    await exists(file);
  }
  assert.ok(item.width > 0 && item.height > 0 && item.alt, "content images reserve dimensions and have alternative text");
}
assert.ok(config.content.gallery.every((item) => html.includes(item.thumbnail) || html.includes(item.src)), "the real PDF gallery is integrated into HTML");
assert.ok(config.content.testimonials.every((item) => html.includes(item.thumbnail) || html.includes(item.src)), "the real WhatsApp carousel is integrated into HTML");

// Existing measurement has one owner and still distinguishes checkout from purchase.
assert.equal((app.match(/window\.fbq\("track",\s*"PageView"\)/g) || []).length, 1, "PageView has one guarded dispatch point");
assert.equal((app.match(/window\.fbq\("track",\s*"InitiateCheckout",\s*payload\)/g) || []).length, 1, "InitiateCheckout has one dispatch point");
assert.ok(app.includes("analyticsInitialized") && app.includes("offerViewed"), "existing initialization and offer deduplication remain");
assert.ok(app.includes("mantras.analytics.consent.v2") && app.includes("record.expiresAt > now"), "optional tracking requires a valid, unexpired consent record");
assert.ok(app.includes("clearOptionalCookies") && app.includes("reload"), "revocation removes accessible cookies and unloads SDKs");
assert.ok(!/\b(?:fbq|gtag)\s*\(/.test(interactions), "presentation interactions do not introduce a second analytics owner");
assert.ok(!/(?:fbq|gtag)\s*\(\s*["'](?:track(?:Custom)?|event)["']\s*,\s*["']purchase["']|track\s*\(\s*["']purchase["']/i.test(app + interactions), "checkout clicks are never represented as completed purchases");
for (const eventName of ["view_offer", "begin_checkout", "video_start", "video_progress", "video_complete"]) assert.ok(app.includes('"' + eventName + '"'), "the existing event is preserved: " + eventName);

// SEO, legal navigation, accessible semantics and production resource integrity.
const schema = html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
assert.ok(schema, "product structured data is present");
const product = JSON.parse(schema);
assert.equal(product.name, config.productName);
assert.equal(Number(product.offers.price), config.price);
assert.equal(product.offers.priceCurrency, "BRL");
assert.equal(product.offers.url, expectedCheckout);
assert.ok(!product.aggregateRating, "structured data has no fabricated review aggregate");
assert.match(html, /<link rel="canonical" href="https:\/\/500mantras\.vercel\.app\/">/);
assert.match(html, /<meta name="description" content="[^\"]+"/);
assert.equal(Number(html.match(/<meta property="product:price:amount" content="([^\"]+)"/)?.[1]), config.price);
assert.deepEqual(vercel.rewrites, [{ source: "/privacidade", destination: "/privacy" }, { source: "/termos", destination: "/terms" }], "Portuguese legal routes are preserved");
for (const [name, page] of [["index", html], ["privacy", await output("privacy.html")], ["terms", await output("terms.html")]]) {
  assert.ok(!/__[A-Z][A-Z0-9_]+__/.test(page), name + " contains no unresolved template values");
  assert.match(page, /<html lang="pt-BR">/);
  assert.equal((page.match(/<h1\b/g) || []).length, 1, name + " has one primary heading");
  const ids = [...page.matchAll(/\bid="([^\"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, name + " has no duplicated IDs");
  for (const [, references] of page.matchAll(/\baria-(?:labelledby|describedby)="([^\"]+)"/g)) for (const id of references.split(/\s+/)) assert.ok(ids.includes(id), name + " has a valid ARIA reference: " + id);
  for (const [, id] of page.matchAll(/\bhref="#([^\"]+)"/g)) assert.ok(ids.includes(id), name + " has a valid fragment target: " + id);
  assert.ok(!/consentBanner|consent-banner/.test(page), name + " does not mount the old cookie banner");
  const dialog = page.match(/<dialog\b[^>]*\bid="consentPreferences"[^>]*>/)?.[0];
  assert.ok(dialog && !/\sopen(?:[\s=>])/.test(dialog), name + " keeps privacy choices closed until explicitly requested");
  for (const action of ["data-consent-preferences", 'data-consent="accepted"', 'data-consent="denied"', "data-consent-close"]) assert.ok(page.includes(action), name + " retains its explicit privacy control: " + action);
  assert.ok(page.includes(config.supportEmail), name + " preserves support contact");
  assert.ok(!/<(?:script|img)\b[^>]*src="https?:\/\/(?:connect\.facebook\.net|www\.facebook\.com\/tr|www\.googletagmanager\.com)/.test(page), name + " loads no tracking directly in HTML before consent");
  for (const [image] of [...page.matchAll(/<img\b[^>]*>/g)]) {
    assert.ok(Number(attr(image, "width")) > 0 && Number(attr(image, "height")) > 0, name + " reserves image dimensions");
    assert.notEqual(attr(image, "alt"), undefined, name + " declares alternative text for each image");
  }
}
assert.ok(html.includes('href="/privacidade"') && html.includes('href="/termos"'), "legal links remain available");
const video = html.match(/<video\b[^>]*>/)?.[0];
assert.ok(video && /\bcontrols\b/.test(video) && /\bplaysinline\b/.test(video) && /\bpreload="none"/.test(video) && !/\bautoplay\b/.test(video), "the original video remains lazy, inline and user controlled");
assert.equal((html.match(/<video\b/g) || []).length, 1, "the presentation video is not duplicated");
for (const [, asset] of [...html.matchAll(/(?:src|href|poster)="(\/(?:assets|videos)\/[^\"]+)"/g), ...css.matchAll(/url\(["']?(\/assets\/[^)'"\s]+)["']?\)/g)]) await exists(asset);
await exists("robots.txt");
async function filesIn(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? filesIn(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat();
}
const publishedFiles = await filesIn(distDir);
assert.ok(!publishedFiles.some((file) => /\.pdf$/i.test(file)), "the paid PDF is never distributed with the sales page");
assert.ok(!publishedFiles.some((file) => path.basename(file) === "500-mantras-apresentacao.mp4"), "the heavy source video stays outside the production build");

console.log("Smoke test OK: single architecture, real PDF samples and WhatsApp assets, configured campaign/popup, confirmed offer, seven-day warranty, consent-aware Meta events, SEO, legal pages and production resources verified.");
