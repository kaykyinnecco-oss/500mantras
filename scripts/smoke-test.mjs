import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { rootDir } from "./config.mjs";

const distDir = path.join(rootDir, "dist");
async function readOutput(file) {
  return readFile(path.join(distDir, file), "utf8");
}

const html = await readOutput("index.html");
const css = await readOutput("styles.css");
const app = await readOutput("app.js");
const runtimeSource = await readOutput("runtime-config.js");
const runtimeMatch = runtimeSource.match(/Object\.freeze\(({[\s\S]*})\);\s*$/);
assert.ok(runtimeMatch, "runtime-config.js must expose a JSON configuration object");
const config = JSON.parse(runtimeMatch[1]);
const checkoutLinks = [...html.matchAll(/<a\b[^>]*\bdata-checkout\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
const expectedCheckout = "https://pay.cakto.com.br/323zgdr_1243414";

assert.equal(config.checkoutUrl, expectedCheckout, "configured Cakto checkout URL");
assert.equal(config.supportEmail, "empresakagency@gmail.com", "configured support email");
assert.equal(config.price, 19.9, "ebook price configured");
assert.equal(config.checkoutServiceFee, 0.99, "current Cakto service fee configured");
assert.equal(config.checkoutTotal, 20.89, "current checkout total configured");
assert.equal(config.checkoutTotalPaymentMethod, "PIX", "the configured total is tied to the verified payment method");
assert.equal(config.checkoutCardInstallmentCount, 4, "current default card installment count configured");
assert.equal(config.checkoutCardInstallmentAmount, 5.88, "current default card installment amount configured");
assert.equal(config.checkoutCardTotal, 23.52, "current default card total configured");
assert.equal(checkoutLinks.length, 5, "header, hero, content, offer, and closing CTAs should be present");
assert.deepEqual([...new Set(checkoutLinks)], [expectedCheckout], "every CTA should share the same checkout");
assert.ok(!/__CHECKOUT_URL__|__SUPPORT_EMAIL__|__PRODUCT_PRICE__|__PRODUCT_PRICE_SCHEMA__|__CAKTO_SERVICE_FEE__|__CHECKOUT_TOTAL__|__CHECKOUT_CARD_INSTALLMENTS__|__CHECKOUT_CARD_TOTAL__/.test(html), "production HTML has no unresolved values");
const ctaTexts = [...html.matchAll(/<a\b[^>]*\bdata-checkout\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1].replace(/<[^>]+>/g, "").trim());
assert.deepEqual(ctaTexts, Array(5).fill("QUERO ACESSAR OS 500 MANTRAS"), "all purchase CTAs use the same approved label");
assert.ok(html.includes("class=\"ticker-track\"") && css.includes("@keyframes ticker-marquee"), "the continuous ticker is present and styled");
assert.ok(html.includes("id=\"inicio\"") && html.includes("id=\"conteudo-do-ebook\"") && html.includes("id=\"oferta\""));
assert.ok(html.includes("id=\"duvidas\"") && html.includes("id=\"rodape\""));
assert.ok(html.includes("500 mantras para transformar pequenos momentos do seu dia em"), "specific product value is clear in the hero");
assert.ok(html.includes("127 páginas") && html.includes("R$ 19,90"), "page count and price are visible");
assert.ok(html.includes("PREÇO DO E-BOOK") && html.includes("PIX e PicPay"), "base ebook price and the applicable payment methods are labeled clearly");
assert.equal((html.match(/R\$ 0,99/g) || []).length, 1, "mandatory PIX service fee is disclosed once on the sales page");
assert.equal((html.match(/R\$ 20,89/g) || []).length, 1, "PIX total is disclosed once on the sales page");
assert.ok(html.includes("4 × R$ 5,88") && html.includes("R$ 23,52"), "current default card installment and total are disclosed");
assert.equal((html.match(/<details>/g) || []).length, 5, "the compact FAQ should contain five questions");
assert.equal((html.match(/data-preview\b/g) || []).length, 3, "three authentic PDF page previews should be available");
const themeList = html.match(/<ol class="theme-list">([\s\S]*?)<\/ol>/);
assert.ok(themeList, "the ten real ebook themes are presented");
assert.equal((themeList[1].match(/<li>/g) || []).length, 10, "all ten verified themes are listed");
assert.ok(html.includes("Eu reconheço as oportunidades que surgem quando me preparo para percebê-las."), "the sample mantra is real PDF content");
assert.ok(!/<video\b|vsl-section/i.test(html), "the current page must not include a VSL section or player");
assert.ok(!/mobileStickyCta|mobile-sticky-cta/.test(html + css + app), "the mobile CTA does not cover reading content");
assert.ok(!/class=\"(?:benefit-card|step-card)/.test(html), "repeated generic card sections have been removed");
assert.ok(app.includes('"begin_checkout"') && app.includes('"view_offer"'), "checkout and offer events remain configured");
assert.ok(app.includes("analyticsInitialized") && app.includes("offerViewed"), "analytics and offer events are guarded against duplicates");
assert.ok(!/track(?:Custom)?\s*\(\s*["']Purchase/i.test(app), "checkout clicks must not be reported as purchases");
assert.ok(app.includes("value: Number(config.price || 19.9)"), "checkout-click analytics reports product price, not the PIX total or a purchase");
assert.ok(app.includes("data-copy-slot") && app.includes("lp_variant"), "copy test variants are configurable and attributed");
assert.equal(config.experiment.enabled, false, "copy experiment stays off until campaign setup");
assert.equal(config.experiment.variants["variante-b"].heroCta, "QUERO ACESSAR OS 500 MANTRAS", "CTA label remains standardized in hero copy variants");
assert.equal(config.experiment.variants["variante-b"].offerCta, "QUERO ACESSAR OS 500 MANTRAS", "CTA label remains standardized in offer copy variants");

const schemaMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
assert.ok(schemaMatch, "Product structured data is required");
const product = JSON.parse(schemaMatch[1]);
assert.equal(product.name, "500 Mantras para Elevar Sua Energia");
assert.equal(product.offers.price, "19.90");
assert.equal(product.offers.priceCurrency, "BRL");
assert.equal(html.match(/<meta property="product:price:amount" content="([^"]+)"/)?.[1], "19.90", "social product price matches schema and configuration");

for (const asset of [
  "assets/mockup-produto.webp", "assets/preview-autocuidado.webp",
  "assets/preview-abundancia.webp", "assets/preview-gratidao.webp", "assets/simbolo-celestial.svg",
  "styles.css", "app.js", "privacy.html", "terms.html", "robots.txt",
]) {
  const info = await stat(path.join(distDir, asset));
  assert.ok(info.isFile() && info.size > 0, "production asset exists: " + asset);
}
await assert.rejects(stat(path.join(distDir, "assets/mockup-completo.webp")), { code: "ENOENT" }, "unused promo artwork should not ship");

const privacy = await readOutput("privacy.html");
const terms = await readOutput("terms.html");
assert.ok(privacy.includes("empresakagency@gmail.com"), "privacy page includes configured support");
assert.ok(terms.includes("empresakagency@gmail.com"), "terms page includes configured support");
assert.ok(terms.includes("R$ 0,99") && terms.includes("R$ 20,89"), "terms disclose the current checkout fee and PIX total");
assert.ok(!/reprodução do vídeo|VSL/i.test(privacy + terms), "legal pages match the no-VSL page configuration");

console.log("Smoke test OK: five checkout CTAs, ten verified themes, a real PDF sample, authentic previews, copy-test config, and production assets verified.");
