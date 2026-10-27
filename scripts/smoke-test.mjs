import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
const vercelConfig = JSON.parse(await readFile(path.join(rootDir, "vercel.json"), "utf8"));
const checkoutLinks = [...html.matchAll(/<a\b[^>]*\bdata-checkout\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
const expectedCheckout = "https://pay.cakto.com.br/323zgdr_1243414";

// Protected source contract captured from main ca9b6a2 before the visual redesign.
// Normalize Git line endings so the same contract runs on Windows and Linux.
const digest = (source) => createHash("sha256").update(source.replace(/\r\n/g, "\n")).digest("hex");
const protectedSources = {
  "app.js": "9ee9b11cd92b5c2002d68871f34c33e035da0d7c31bd3dcf5f3ad69bed9cb25e",
  "site.config.json": "457d0403e8e799ef317b2ce167c8eec89e998719db27e523f98f22b625e84aa2",
  "vercel.json": "043eea13cad854007c92bc18510b47012534ad53d786d7e42a296e19cb0fd15b",
  "privacy.html": "fc39f462ef9e5ebd1a09df5303184cff0133ce42c36aa99e5d264350e6b3591b",
  "terms.html": "593c41912344e9a6e17862651d8549bdb94d3d2e959109a7d07fe3c195d8ad6b",
};
for (const [file, expectedHash] of Object.entries(protectedSources)) {
  assert.equal(digest(await readFile(path.join(rootDir, file), "utf8")), expectedHash, "protected source matches pre-redesign baseline: " + file);
}
assert.equal(digest(app), protectedSources["app.js"], "built analytics and checkout code matches the protected source");
const sourceHtml = await readFile(path.join(rootDir, "index.html"), "utf8");
const protectedCtaTags = [
  '<a class="button button-gold header-cta" data-checkout data-cta-location="header" href="__CHECKOUT_URL__">',
  '<a class="button button-gold hero-cta" id="heroCheckout" data-copy-slot="heroCta" data-checkout data-cta-location="hero" href="__CHECKOUT_URL__">',
  '<a class="button button-gold content-cta" data-checkout data-cta-location="conteudo" href="__CHECKOUT_URL__">',
  '<a class="button button-gold video-cta" data-checkout data-cta-location="video" href="__CHECKOUT_URL__">',
  '<a class="button button-gold" data-checkout data-cta-location="video-final" href="__CHECKOUT_URL__">',
  '<a class="button button-gold offer-cta" data-copy-slot="offerCta" data-checkout data-cta-location="oferta" href="__CHECKOUT_URL__">',
  '<a class="button button-gold closing-cta" data-checkout data-cta-location="fechamento" href="__CHECKOUT_URL__">',
];
for (const openingTag of protectedCtaTags) assert.equal(sourceHtml.split(openingTag).length - 1, 1, "existing checkout opening tag is preserved: " + openingTag);
const originalVideo = '<video id="productVideo" controls preload="none" playsinline poster="/assets/mockup-produto.webp" aria-label="Apresentação dos 500 Mantras para Elevar Sua Energia, com duração aproximada de 40 segundos."><source src="/videos/500-mantras-apresentacao-mobile.mp4" type="video/mp4">Seu navegador não consegue reproduzir este vídeo. <a href="/videos/500-mantras-apresentacao-mobile.mp4">Abra a apresentação</a> ou continue pelo botão de compra.</video>';
assert.ok(sourceHtml.includes(originalVideo), "the original video URL, controls, player attributes and fallback are preserved");
const sourceDialog = sourceHtml.match(/<dialog\b[^>]*id="consentPreferences"[\s\S]*?<\/dialog>/)?.[0];
assert.ok(sourceDialog, "the original consent dialog is present");
assert.equal(digest(sourceDialog), "3d1a5351d0d4b6bac3e6cc7423aeac24547faefd012fd57b20c0125cb31c7638", "the native consent dialog is preserved from the original page");

assert.equal(config.checkoutUrl, expectedCheckout, "configured Cakto checkout URL");
assert.equal(config.supportEmail, "empresakagency@gmail.com", "configured support email");
assert.equal(config.price, 19.9, "ebook price configured");
assert.equal(config.checkoutServiceFee, 0.99, "current Cakto service fee configured");
assert.equal(config.checkoutTotal, 20.89, "current checkout total configured");
assert.equal(config.checkoutTotalPaymentMethod, "PIX", "the configured total is tied to the verified payment method");
assert.equal(config.checkoutCardInstallmentCount, 4, "current default card installment count configured");
assert.equal(config.checkoutCardInstallmentAmount, 5.88, "current default card installment amount configured");
assert.equal(config.checkoutCardTotal, 23.52, "current default card total configured");
assert.equal(config.analytics.metaPixelId, "2429955871112248", "the production Meta Pixel ID is configured");
assert.equal(checkoutLinks.length, 8, "seven original CTAs plus one consent-aware mobile CTA should be present");
assert.deepEqual([...new Set(checkoutLinks)], [expectedCheckout], "every CTA should share the same checkout");
assert.ok(!/__CHECKOUT_URL__|__SUPPORT_EMAIL__|__PRODUCT_PRICE__|__PRODUCT_PRICE_SCHEMA__|__CAKTO_SERVICE_FEE__|__CHECKOUT_TOTAL__|__CHECKOUT_CARD_INSTALLMENTS__|__CHECKOUT_CARD_TOTAL__/.test(html), "production HTML has no unresolved values");
const ctaTexts = [...html.matchAll(/<a\b[^>]*\bdata-checkout\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1].replace(/<[^>]+>/g, "").trim());
assert.equal(ctaTexts.filter((text) => text === "QUERO RECEBER MEUS 500 MANTRAS").length, 7, "the original purchase CTAs use the approved new copy");
assert.equal(ctaTexts.filter((text) => text === "QUERO MEUS 500 MANTRAS").length, 1, "the mobile CTA uses the requested shorter label");
assert.equal(config.currency, "BRL", "product currency is preserved");
for (const location of ["header", "hero", "conteudo", "video", "video-final", "oferta", "fechamento"]) {
  assert.equal((html.match(new RegExp('data-cta-location="' + location + '"', "g")) || []).length, 1, "checkout location appears once: " + location);
}
assert.match(html, /href="\/assets\/styles\.[a-f0-9]{12}\.css"/, "production HTML references a versioned stylesheet");
assert.match(html, /src="\/assets\/app\.[a-f0-9]{12}\.js"/, "production HTML references a versioned application script");
assert.match(html, /src="\/assets\/ui\.[a-f0-9]{12}\.js"/, "production HTML references a versioned presentation-only script");
assert.ok(!/<p class="eyebrow[^\"]*"><span/i.test(html + await readOutput("privacy.html") + await readOutput("terms.html")), "decorative eyebrow strokes are removed throughout the site");
assert.ok(!css.includes(".eyebrow > span"), "eyebrow styles no longer render decorative strokes");
assert.ok(html.includes("id=\"inicio\"") && html.includes("id=\"conteudo-do-ebook\"") && html.includes("id=\"oferta\""));
assert.ok(html.includes("id=\"duvidas\"") && html.includes("id=\"rodape\""));
const sectionOrder = ["pause-title", "o-que-recebe", "conteudo-do-ebook", "themes-title", "apresentacao-video", "oferta", "duvidas", "closing-title"];
let previousSection = -1;
for (const id of sectionOrder) {
  const sectionIndex = html.indexOf('id="' + id + '"');
  assert.ok(sectionIndex > previousSection, "purchase journey retains logical section order: " + id);
  previousSection = sectionIndex;
}
assert.ok(html.includes('preload="none" playsinline poster="/assets/mockup-produto.webp"') && html.includes('type="video/mp4"'), "the player uses a poster, native controls, and lazy video loading");
assert.ok(html.includes('id="videoEndedCta"') && html.includes('data-cta-location="video-final"'), "the optional post-completion CTA is configured");
assert.match(html, /<meta name="description" content="[^\"]*500 mantras[^\"]*10 temas[^\"]*127 páginas/, "metadata describes the actual product");
assert.match(html, /<link rel="canonical" href="https:\/\/500mantras\.vercel\.app\/">/, "production canonical URL is preserved");
assert.ok(html.includes("127 páginas") && html.includes("R$ 19,90"), "page count and price are visible");
assert.ok(html.includes("Pagamento único") && html.includes("Não há mensalidade"), "the payment model is disclosed clearly");
assert.ok(!/<details\b/.test(html), "FAQ answers are visible by default");
const faq = html.match(/<div class="faq-list">([\s\S]*?)<\/div>/)?.[1];
assert.ok(faq, "FAQ is present");
assert.equal((faq.match(/<article\b/g) || []).length, 5, "the FAQ contains five visible questions and answers");
assert.equal((html.match(/class="page-preview-static"/g) || []).length, 3, "three authentic PDF page previews are displayed without modal");
assert.ok(!html.includes("previewDialog") && !app.includes("previewDialog"), "preview zoom is removed");
assert.ok(html.includes("/assets/logo-500-mantras.png"), "brand logo is present");
assert.ok(html.includes("500 mantras em 10 temas.") && html.includes("127 páginas em um único PDF."), "offer communicates the verified product contents");
const themeList = html.match(/<ol class="theme-list">([\s\S]*?)<\/ol>/);
assert.ok(themeList, "the ten real ebook themes are presented");
assert.equal((themeList[1].match(/<li>/g) || []).length, 10, "all ten verified themes are listed");
const themeItems = [...themeList[1].matchAll(/<li>([^<]+)<\/li>/g)].map((match, index) => [String(index + 1).padStart(2, "0"), match[1]]);
assert.deepEqual(themeItems, [
  ["01", "Amor-próprio e autoestima"], ["02", "Prosperidade e abundância"],
  ["03", "Proteção e equilíbrio energético"], ["04", "Gratidão e conexão com o universo"],
  ["05", "Paz interior e serenidade"], ["06", "Confiança e coragem"],
  ["07", "Recomeços e desapego"], ["08", "Intuição e sabedoria interior"],
  ["09", "Amor e relacionamentos"], ["10", "Energia positiva e intenção diária"],
], "all verified theme names and their order are preserved");
for (const mantra of ["Eu mereço o mesmo cuidado que ofereço às pessoas que amo.", "Meu valor não diminui nos dias em que produzo menos.", "Posso reconhecer minhas imperfeições sem deixar de me respeitar."]) {
  assert.ok(html.includes(mantra), "verified text from the authentic PDF preview is present: " + mantra);
}
assert.equal((html.match(/data-cta-location="conteudo"/g) || []).length, 1, "the content panels have one CTA");
assert.ok(app.includes("matchMedia(\"(prefers-reduced-motion: reduce)\")") && app.includes("new IntersectionObserver"), "panel reveals respect reduced-motion settings and use intersection observation");
assert.ok(!/\.reveal-ready\s+\.reveal\s*\{[^}]*opacity:\s*0(?:[;\s}]|$)/.test(css), "content is not hidden while waiting for an observation callback");
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, "reduced-motion visitors have a dedicated stylesheet override");
assert.ok(!/<track\b/i.test(html), "no unverified or unsynchronized subtitles are declared");
const guaranteeText = "Garantia de 7 dias. Se você abrir o e-book e sentir que não era o que esperava, é só pedir o reembolso em até 7 dias após a compra e devolvemos 100% do valor. Sem burocracia.";
assert.ok(html.includes(guaranteeText), "owner-confirmed full guarantee uses the exact approved text");
for (const position of ["hero", "included", "offer", "closing"]) {
  assert.equal((html.match(new RegExp('data-guarantee="' + position + '"', "g")) || []).length, 1, "guarantee appears at the approved position: " + position);
}
assert.ok(!/\[PREENCHER|DEPOIMENTO REAL|FOTO REAL/.test(html), "unverified author/testimonial placeholders are not public");
assert.ok(!/<(?:em|i)(?:\s|>)/.test(html) && !/\bitalic\b/.test(css), "the redesigned sales page and stylesheet contain no italics");
assert.ok(/font-display:\s*swap/.test(css), "web fonts let text render immediately");
assert.ok(html.includes('<a href="/privacidade">Política de privacidade</a>'), "privacy preferences link to the policy");
assert.ok(html.includes('href="/privacidade"') && html.includes('href="/termos"'), "legal links are preserved");
for (const [, image] of html.matchAll(/(<img\b[^>]+>)/g)) {
  assert.match(image, /\bwidth="\d+"/, "images reserve intrinsic width");
  assert.match(image, /\bheight="\d+"/, "images reserve intrinsic height");
  assert.match(image, /\balt="[^\"]+"/, "product images have alternative text");
}
assert.ok(!/<video\b[^>]*\bautoplay/.test(html), "product video does not autoplay");
assert.ok(app.includes('"mantras.analytics.consent.v2"') && app.includes("record?.version === 2"), "consent is versioned and validated");
assert.ok(app.includes("record.expiresAt > now") && app.includes("record.updatedAt <= now"), "saved consent requires valid timestamps");
assert.ok(app.includes("180 * 24 * 60 * 60 * 1000"), "preferences have a bounded lifetime");
assert.ok(app.includes('querySelectorAll("[data-consent-preferences]")'), "preferences are accessible through explicit controls");
assert.equal((app.match(/\.showModal\(\)/g) || []).length, 1, "privacy preferences have one explicit opening point");
assert.ok(!/consentBanner|consent-banner/.test(app), "legacy automatic banner logic is removed");
assert.ok(app.includes("clearOptionalCookies()") && app.includes("window.location.reload()"), "revocation removes accessible optional cookies and unloads vendor scripts");
assert.deepEqual(vercelConfig.rewrites, [
  { source: "/privacidade", destination: "/privacy" },
  { source: "/termos", destination: "/terms" },
], "Vercel serves the Portuguese privacy and terms routes");
assert.ok(app.includes('"begin_checkout"') && app.includes('"view_offer"'), "checkout and offer events remain configured");
assert.ok(app.includes('track("video_start"') && app.includes('track("video_progress"') && app.includes('track("video_complete"'), "video start, progress, and completion analytics use the existing consent-aware tracking");
assert.ok(app.includes("analyticsInitialized") && app.includes("offerViewed"), "analytics and offer events are guarded against duplicates");
assert.ok(app.includes('typeof window.fbq !== "function"') && app.includes("window._fbq = fbq") && app.includes("fbq.push = fbq"), "Meta Pixel uses a single compatible loader instance");
assert.ok(app.includes('window.fbq("track", "PageView")'), "Meta Pixel sends the standard PageView event after consent");
assert.ok(app.includes('window.fbq("track", "InitiateCheckout", payload)'), "Cakto CTA clicks send the standard Meta InitiateCheckout event");
assert.equal((app.match(/window\.fbq\("track", "PageView"\)/g) || []).length, 1, "PageView has one guarded dispatch point");
assert.equal((app.match(/window\.fbq\("track", "InitiateCheckout", payload\)/g) || []).length, 1, "InitiateCheckout has one delegated dispatch point");
assert.ok(app.includes('window.fbq("consent", allowed ? "grant" : "revoke")'), "Meta consent can be changed after the initial choice");
assert.ok(app.includes('window.gtag("consent", "update"'), "GA consent can be changed after the initial choice");
assert.ok(!app.includes('window.fbq("trackCustom", "CheckoutClick"'), "the legacy custom checkout event is not sent alongside InitiateCheckout");
assert.ok(!/(?:fbq|gtag)\s*\(\s*["'](?:track(?:Custom)?|event)["']\s*,\s*["']purchase["']|track\s*\(\s*["']purchase["']/i.test(app), "checkout clicks must not be reported as purchases");
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
assert.equal(product.offers.url, expectedCheckout, "Product schema retains the Cakto checkout");
assert.equal(html.match(/<meta property="product:price:amount" content="([^"]+)"/)?.[1], "19.90", "social product price matches schema and configuration");

for (const asset of [
  "assets/logo-500-mantras.png", "assets/mockup-produto.webp", "assets/preview-autocuidado.webp",
  "assets/preview-abundancia.webp", "assets/preview-gratidao.webp", "assets/simbolo-celestial.svg",
  ...[...html.matchAll(/(?:href|src)="\/(assets\/(?:styles\.[a-f0-9]{12}\.css|(?:app|ui)\.[a-f0-9]{12}\.js))"/g)].map((match) => match[1]),
  ...[...css.matchAll(/url\(["']?(\/assets\/[^)'"\s]+)["']?\)/g)].map((match) => match[1].slice(1)),
  "videos/500-mantras-apresentacao-mobile.mp4",
  "styles.css", "app.js", "privacy.html", "terms.html", "robots.txt",
]) {
  const info = await stat(path.join(distDir, asset));
  assert.ok(info.isFile() && info.size > 0, "production asset exists: " + asset);
}
await assert.rejects(stat(path.join(distDir, "assets/mockup-completo.webp")), { code: "ENOENT" }, "unused promo artwork should not ship");
await assert.rejects(stat(path.join(distDir, "videos/500-mantras-apresentacao.mp4")), { code: "ENOENT" }, "the heavy original video stays in Git, outside the production build");

const privacy = await readOutput("privacy.html");
const terms = await readOutput("terms.html");
assert.ok(privacy.includes("empresakagency@gmail.com"), "privacy page includes configured support");
assert.ok(privacy.includes("só é carregado após você aceitar o rastreamento opcional"), "privacy disclosure documents consent-gated tracking");
assert.ok(privacy.includes("180 dias") && privacy.includes("revogar"), "privacy disclosure describes expiration and revision");
assert.ok(terms.includes("empresakagency@gmail.com"), "terms page includes configured support");
assert.ok(terms.includes("R$ 0,99") && terms.includes("R$ 20,89"), "terms disclose the current checkout fee and PIX total");
for (const [name, page] of [["index", html], ["privacy", privacy], ["terms", terms]]) {
  assert.ok(!/__CHECKOUT_URL__|__SUPPORT_EMAIL__|__PRODUCT_PRICE__|__PRODUCT_PRICE_SCHEMA__|__CAKTO_SERVICE_FEE__|__CHECKOUT_TOTAL__|__CHECKOUT_CARD_INSTALLMENTS__|__CHECKOUT_CARD_TOTAL__/.test(page), name + " has no unresolved build values");
  assert.match(page, /<html lang="pt-BR">/, name + " declares its language");
  assert.equal((page.match(/<h1\b/g) || []).length, 1, name + " has one primary heading");
  assert.match(page, /href="\/assets\/styles\.[a-f0-9]{12}\.css"/, name + " references versioned CSS");
  assert.match(page, /<script defer src="\/runtime-config\.js"><\/script>/, name + " defers runtime configuration");
  assert.match(page, /<script defer src="\/assets\/app\.[a-f0-9]{12}\.js"><\/script>/, name + " defers versioned JavaScript");
  assert.ok(!/consentBanner|consent-banner/.test(page), name + " has no intrusive cookie banner");
  const dialogOpening = page.match(/<dialog\b[^>]*\bid="consentPreferences"[^>]*>/)?.[0];
  assert.ok(dialogOpening, name + " provides privacy preferences in a native dialog");
  assert.ok(!/\sopen(?:[\s=>])/.test(dialogOpening), name + " does not open privacy preferences automatically");
  assert.match(dialogOpening, /aria-labelledby="consent-title"/, name + " labels its privacy dialog");
  assert.match(dialogOpening, /aria-describedby="consent-description"/, name + " describes its privacy dialog");
  assert.match(page, /data-consent-preferences/, name + " provides an explicit preferences control");
  assert.match(page, /<button\b[^>]*\bdata-consent="accepted"[^>]*>[^<]+<\/button>/, name + " provides explicit acceptance");
  assert.match(page, /<button\b[^>]*\bdata-consent="denied"[^>]*>[^<]+<\/button>/, name + " provides explicit rejection");
  assert.match(page, /data-consent-close/, name + " allows closing preferences without choosing");
  const ids = [...page.matchAll(/\bid="([^\"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, name + " has no duplicated IDs");
  for (const [, references] of page.matchAll(/\baria-(?:labelledby|describedby)="([^\"]+)"/g)) {
    for (const reference of references.split(/\s+/)) assert.ok(ids.includes(reference), name + " has a valid ARIA reference: " + reference);
  }
  for (const [, target] of page.matchAll(/\bhref="#([^\"]+)"/g)) assert.ok(ids.includes(target), name + " has a valid fragment link: " + target);
  assert.ok(!/<(?:script|img)\b[^>]*(?:src="https?:\/\/(?:connect\.facebook\.net|www\.facebook\.com\/tr|www\.googletagmanager\.com))/.test(page), name + " loads no tracking directly in HTML before consent");
}

console.log("Smoke test OK: protected integrations and seven original CTAs, mobile CTA, confirmed guarantee, five visible FAQs, genuine previews, ten themes, native consent, metadata and production assets verified.");
