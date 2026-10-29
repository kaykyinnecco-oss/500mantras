// Layout/content contract for the corrected premium composition.
export async function verifyRevision({
  assert,
  html,
  sourceHtml,
  css,
  app,
  config,
  readOutput,
  stat,
  path,
  rootDir,
  distDir,
  vm,
  readFile,
  digest,
}) {
  const checkout = "https://pay.cakto.com.br/323zgdr_1243414";
  assert.equal(config.price, 9.9);
  assert.equal(config.checkoutUrl, checkout);
  assert.equal(config.analytics.metaPixelId, "2429955871112248");
  const links = [
    ...html.matchAll(/<a\b[^>]*data-checkout[^>]*href="([^"]+)"/g),
  ];
  assert.equal(
    links.length,
    7,
    "seven strategic CTAs use the existing delegated checkout handler",
  );
  for (const link of links) assert.equal(link[1], checkout);
  for (const location of [
    "hero",
    "conteudo",
    "galeria",
    "explorador",
    "oferta",
    "fechamento",
    "popup",
  ]) {
    assert.equal(html.split(`data-cta-location="${location}"`).length - 1, 1);
  }
  assert.equal(
    (html.match(/<link rel="stylesheet"/g) || []).length,
    1,
    "one canonical landing stylesheet",
  );
  assert.ok(html.includes('href="/assets/landing-premium-v2.css"'));
  assert.ok(
    !/premium-(?:content|interactions|architecture)-v1|landing-light-theme|reviews-carousel|src="\/assets\/ui\./.test(
      html,
    ),
    "obsolete UI layers are not loaded",
  );
  assert.match(html, /src="\/assets\/app\.[a-f0-9]{12}\.js"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /font-display: swap/);
  assert.match(
    css,
    /\.lp-offer-dialog:not\(\[open\]\)/,
    "closed offer modal is never an inline second hero",
  );
  for (const id of [
    "inicio",
    "social-proof-rating",
    "seu-momento",
    "como-funciona",
    "dez-jornadas",
    "o-que-recebe",
    "conteudo-do-ebook",
    "por-dentro",
    "whatsapp-testimonials",
    "explore-jornadas",
    "oferta",
    "garantia",
    "duvidas",
    "closing-title",
    "rodape",
  ])
    assert.equal(html.split(`id="${id}"`).length - 1, 1);
  assert.equal((html.match(/<footer\b/g) || []).length, 1);
  assert.equal((html.match(/class="lp-closing /g) || []).length, 1);
  assert.ok(
    !/mobile-purchase|videoEndedCta|class="review-card"/.test(html),
    "redundant mobile/ended CTA and old testimonial DOM removed",
  );
  assert.equal((html.match(/<video\b/g) || []).length, 1);
  assert.match(
    sourceHtml,
    /<video id="productVideo" controls preload="none" playsinline poster="\/assets\/edition\/video-poster.webp"/,
  );
  assert.match(html, /src="\/videos\/500-mantras-edicao-premium.mp4"/);
  assert.ok(!/<video\b[^>]*autoplay/.test(html));
  assert.equal((html.match(/id="videoPlay"/g) || []).length, 1);
  const consent = sourceHtml.match(
    /<dialog\b[^>]*id="consentPreferences"[\s\S]*?<\/dialog>/,
  )?.[0];
  assert.equal(
    digest(consent),
    "03d1fc54f7825ee469bb7f5c0ebe812a09ca938cafc1ea5d32a3d58d3feb6b1a",
    "original consent DOM is unchanged",
  );
  assert.equal(
    (app.match(/window\.fbq\("track", "PageView"\)/g) || []).length,
    1,
  );
  assert.equal(
    (app.match(/window\.fbq\("track", "InitiateCheckout", payload\)/g) || [])
      .length,
    1,
  );
  assert.ok(!/fbq\("track", "Purchase"/.test(app));
  const context = { window: {} };
  vm.runInNewContext(await readOutput("assets/landing-content-v2.js"), context);
  const content = JSON.parse(JSON.stringify(context.window.MANTRAS_CONTENT));
  assert.equal(
    content.promotion.endsAt,
    null,
    "no countdown is published without a real deadline",
  );
  assert.deepEqual(
    [
      content.popup.initialDelayMs,
      content.popup.repeatDelayMs,
      content.popup.maxDisplaysPerSession,
    ],
    [6000, 4000, 3],
  );
  assert.equal(
    content.rating.publish,
    false,
    "WhatsApp conversations are not evidence of a numeric star rating",
  );
  assert.equal(content.rating.count, null);
  assert.equal(content.rating.source, "");
  assert.equal(
    content.rating.avatars.length,
    4,
    "only four supplied portrait avatars, no fabricated faces",
  );
  assert.ok(!/4,8|4,9|compra verificada|1[.,]351/i.test(html));
  assert.equal(content.whatsapp.length, 5);
  assert.deepEqual(
    content.whatsapp.map((item) => item.name),
    [
      "Mariana Alves",
      "Camila Rocha",
      "Juliana Martins",
      "Renata Oliveira",
      "Patrícia Almeida",
    ],
  );
  for (const item of content.whatsapp) {
    assert.equal(item.authorized, true);
    assert.equal(item.privacyReviewed, true);
    assert.ok(item.alt && item.quote && item.source);
  }
  assert.match(
    html,
    /id="whatsapp-testimonials"[^>]*hidden/,
    "unconfigured section stays hidden until approved images are rendered",
  );
  const samples = JSON.parse(
    await readFile(path.join(rootDir, "docs/product-samples.json"), "utf8"),
  );
  assert.equal(samples.pdfPages, 127);
  assert.equal(content.journeys.length, 10);
  assert.deepEqual(
    content.journeys,
    samples.journeys,
    "all ten selectable excerpts are sourced from the supplied PDF",
  );
  assert.equal(content.gallery.length, 6);
  for (const item of content.gallery)
    assert.ok(
      samples.journeys.some(
        (sample) =>
          sample.text === item.text && sample.pdfPage === item.pdfPage,
      ),
    );
  for (const item of [
    ...content.gallery,
    ...content.whatsapp,
    ...content.rating.avatars,
  ]) {
    for (const asset of [item.src, item.full].filter(Boolean)) {
      assert.match(asset, /^\/assets\/[\w/.-]+\.webp$/);
      assert.ok(!asset.includes(".."));
      assert.ok((await stat(path.join(distDir, asset.slice(1)))).size > 0);
    }
  }
  assert.equal(
    (html.match(/<figure class="lp-page-card"/g) || []).length,
    6,
    "gallery has genuine HTML fallback previews",
  );
  assert.deepEqual(
    [...html.matchAll(/<strong>(500|10|127)<\/strong>/g)].map(
      (item) => item[1],
    ),
    ["500", "10", "127"],
  );
  assert.equal((html.match(/<article class="lp-step"/g) || []).length, 4);
  assert.equal((html.match(/<article class="lp-benefit"/g) || []).length, 4);
  assert.equal(
    (html.match(/class="lp-ticker-group"/g) || []).length,
    2,
    "identical ticker groups form the seamless loop",
  );
  assert.equal(
    (html.match(/class="[^"]*\blp-faq-grid\b[^"]*"/g) || []).length,
    1,
  );
  const faq = html.match(/<div class="faq-list">([\s\S]*?)<\/section>/)?.[1];
  assert.equal((faq?.match(/<details\b/g) || []).length, 7);
  for (const optional of [
    "100 Cartões Digitais de Afirmações",
    "Jornada dos 21 Dias de Conexão Interior",
    "Oráculo das 52 Mensagens",
  ])
    assert.ok(html.replace(/\s+/g, " ").includes(optional));
  assert.ok(html.includes("opcionais") && html.includes("separadamente"));
  for (const brand of ["Visa", "Mastercard", "Elo"])
    assert.ok(html.includes(`alt="${brand}"`));
  assert.ok(
    html.includes("mesmo depois de abrir ou baixar o e-book") &&
      html.includes("artigo 49"),
  );
  assert.ok(
    !/R\$\s*(?:19|29),90/.test(html),
    "no unexplained historical price comparisons",
  );
  const product = JSON.parse(
    html.match(
      /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
    )[1],
  );
  assert.equal(product.offers.price, "9.90");
  assert.equal(product.offers.url, checkout);
  assert.equal(
    html.split("Produto digital em PDF. Não inclui versão física.").length - 1,
    1,
  );
  for (const file of [
    "landing-content-v2.js",
    "popup-scheduler-v2.js",
    "landing-ui-v2.js",
  ]) {
    const script = await readOutput("assets/" + file);
    new vm.Script(script, { filename: file });
    assert.ok(
      !/fbq|gtag|track\(/.test(script),
      "presentation has no independent analytics dispatch: " + file,
    );
  }
  const legal = [
    await readOutput("privacy.html"),
    await readOutput("terms.html"),
  ];
  for (const [index, page] of [html, ...legal].entries()) {
    assert.ok(!/__CHECKOUT_URL__|__SUPPORT_EMAIL__|__PRODUCT_PRICE/.test(page));
    assert.equal((page.match(/<h1\b/g) || []).length, 1);
    const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map((item) => item[1]);
    assert.equal(ids.length, new Set(ids).size, "unique IDs on page " + index);
    for (const [, refs] of page.matchAll(
      /aria-(?:labelledby|describedby|controls)="([^"]+)"/g,
    ))
      for (const id of refs.split(/\s+/))
        assert.ok(ids.includes(id), "valid ARIA target: " + id);
    for (const [, id] of page.matchAll(/href="#([^"]+)"/g))
      assert.ok(ids.includes(id), "valid fragment: " + id);
    assert.ok(
      page.includes("data-consent-preferences") &&
        page.includes('data-consent="accepted"') &&
        page.includes('data-consent="denied"'),
    );
    assert.ok(
      !/<(?:script|img)\b[^>]*src="https?:\/\/(?:connect.facebook.net|www.facebook.com\/tr|www.googletagmanager.com)/.test(
        page,
      ),
    );
    if (index)
      assert.ok(
        !page.includes("landing-premium-v2.css"),
        "legal palette stays unchanged",
      );
  }
  for (const [, asset] of html.matchAll(
    /(?:src|href)="\/(assets\/[^"#]+|videos\/[^"#]+)"/g,
  ))
    await stat(path.join(distDir, asset));
  for (const [, asset] of css.matchAll(
    /url\(['"]?(\/assets\/[^)'"\s]+)['"]?\)/g,
  ))
    await stat(path.join(distDir, asset.slice(1)));
  console.log(
    "Revision contract OK: protected checkout/consent, 7 CTAs, 6 real PDF previews, 10 sourced journeys, 5 real prints, neutral rating, single composition and legal pages.",
  );
}
