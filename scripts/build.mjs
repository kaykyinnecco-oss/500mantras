import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { getSiteConfig, rootDir, safeJson } from "./config.mjs";
import { renderContent } from "./render-content.mjs";

const outputDir = path.join(rootDir, "dist");
const site = await getSiteConfig();
const formatAmount = (amount) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount);
const formatSchemaAmount = (amount) => Number(amount).toFixed(2);
const assetHash = async (file) => createHash("sha256")
  .update(await readFile(path.join(rootDir, file)))
  .digest("hex")
  .slice(0, 12);
const stylesAsset = `styles.${await assetHash("styles.css")}.css`;
const appAsset = `app.${await assetHash("app.js")}.js`;
const interactionsAsset = `interactions.${await assetHash("interactions.js")}.js`;

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of ["index.html", "privacy.html", "terms.html", "styles.css", "app.js", "interactions.js", "robots.txt"]) {
  const sourcePath = path.join(rootDir, file);
  try {
    let source = renderContent(await readFile(sourcePath, "utf8"), site);
    source = source
      .replaceAll("__CHECKOUT_URL__", site.checkoutUrl)
      .replaceAll("__SUPPORT_EMAIL__", site.supportEmail)
      .replaceAll("__PRODUCT_PRICE__", formatAmount(site.price))
      .replaceAll("__PRODUCT_PRICE_SCHEMA__", formatSchemaAmount(site.price))
      .replaceAll("__CAKTO_SERVICE_FEE__", formatAmount(site.checkoutServiceFee))
      .replaceAll("__CHECKOUT_TOTAL__", formatAmount(site.checkoutTotal));
    if (["index.html", "privacy.html", "terms.html"].includes(file)) {
      source = source
        .replaceAll('href="/styles.css"', `href="/assets/${stylesAsset}"`)
        .replaceAll('src="/app.js"', `src="/assets/${appAsset}"`)
        .replaceAll('src="/interactions.js"', `src="/assets/${interactionsAsset}"`);
    }
    await writeFile(path.join(outputDir, file), source);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const assetDir = path.join(outputDir, "assets");
await mkdir(assetDir, { recursive: true });
await cp(path.join(rootDir, "styles.css"), path.join(assetDir, stylesAsset));
await cp(path.join(rootDir, "app.js"), path.join(assetDir, appAsset));
await cp(path.join(rootDir, "interactions.js"), path.join(assetDir, interactionsAsset));
await cp(path.join(rootDir, "public"), outputDir, {
  recursive: true,
  // Retain earlier videos in Git, but do not publish their outdated price artwork.
  filter: (source) => !["500-mantras-apresentacao.mp4", "500-mantras-apresentacao-mobile.mp4"]
    .some((file) => source === path.join(rootDir, "public", "videos", file)),
});
await writeFile(
  path.join(outputDir, "runtime-config.js"),
  `window.LANDING_CONFIG = Object.freeze(${safeJson(site)});\n`,
);

console.log(`Build concluído em ${path.relative(rootDir, outputDir)}.`);
