import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSiteConfig, rootDir, safeJson } from "./config.mjs";

const outputDir = path.join(rootDir, "dist");
const site = await getSiteConfig();
const formatAmount = (amount) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount);
const formatSchemaAmount = (amount) => Number(amount).toFixed(2);

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
    await writeFile(path.join(outputDir, file), source);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await cp(path.join(rootDir, "public"), outputDir, { recursive: true });
await writeFile(
  path.join(outputDir, "runtime-config.js"),
  `window.LANDING_CONFIG = Object.freeze(${safeJson(site)});\n`,
);

console.log(`Build concluído em ${path.relative(rootDir, outputDir)}.`);
