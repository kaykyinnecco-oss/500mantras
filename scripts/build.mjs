import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { getSiteConfig, rootDir, safeJson } from "./config.mjs";

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

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of ["index.html", "privacy.html", "terms.html", "styles.css", "app.js", "robots.txt"]) {
  const sourcePath = path.join(rootDir, file);
  try {
    let source = await readFile(sourcePath, "utf8");
    source = source
      .replaceAll("__CHECKOUT_URL__", site.checkoutUrl)
      .replaceAll("__SUPPORT_EMAIL__", site.supportEmail)
      .replaceAll("__PRODUCT_PRICE__", formatAmount(site.price))
      .replaceAll("__PRODUCT_PRICE_SCHEMA__", formatSchemaAmount(site.price))
      .replaceAll("__CAKTO_SERVICE_FEE__", formatAmount(site.checkoutServiceFee))
      .replaceAll("__CHECKOUT_TOTAL__", formatAmount(site.checkoutTotal))
      .replaceAll("__CHECKOUT_CARD_INSTALLMENTS__", `${site.checkoutCardInstallmentCount} × R$ ${formatAmount(site.checkoutCardInstallmentAmount)}`)
      .replaceAll("__CHECKOUT_CARD_TOTAL__", formatAmount(site.checkoutCardTotal));
    if (["index.html", "privacy.html", "terms.html"].includes(file)) {
      source = source
        .replaceAll('href="/styles.css"', `href="/assets/${stylesAsset}"`)
        .replaceAll('src="/app.js"', `src="/assets/${appAsset}"`);
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
await cp(path.join(rootDir, "public"), outputDir, {
  recursive: true,
  // Preserve the source video in Git; only publish the optimized playback asset.
  filter: (source) => source !== path.join(rootDir, "public", "videos", "500-mantras-apresentacao.mp4"),
});
await writeFile(
  path.join(outputDir, "runtime-config.js"),
  `window.LANDING_CONFIG = Object.freeze(${safeJson(site)});\n`,
);

console.log(`Build concluído em ${path.relative(rootDir, outputDir)}.`);
