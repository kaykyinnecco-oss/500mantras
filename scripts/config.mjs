import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadDotEnv() {
  try {
    const source = await readFile(path.join(rootDir, ".env"), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    // .env is optional; Vercel and the shell provide environment values directly.
  }
}

export async function getSiteConfig() {
  await loadDotEnv();
  const stored = JSON.parse(await readFile(path.join(rootDir, "site.config.json"), "utf8"));
  const content = JSON.parse(await readFile(path.join(rootDir, "data", "product-content.json"), "utf8"));
  const checkoutUrl = process.env.NEXT_PUBLIC_CAKTO_CHECKOUT_URL || stored.checkoutUrl;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || stored.supportEmail;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || stored.analytics.metaPixelId;
  const ga4MeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || stored.analytics.ga4MeasurementId;
  const price = Number(stored.price);
  const checkoutServiceFee = Number(stored.checkoutServiceFee || 0);
  const checkoutTotal = Number(stored.checkoutTotal ?? (price + checkoutServiceFee).toFixed(2));
  const checkoutTotalPaymentMethod = String(stored.checkoutTotalPaymentMethod || "PIX").toUpperCase();

  if (![price, checkoutServiceFee, checkoutTotal].every(Number.isFinite)
    || Math.round((price + checkoutServiceFee) * 100) !== Math.round(checkoutTotal * 100)) {
    throw new Error("Preço, taxa da plataforma e total do checkout precisam corresponder em site.config.json.");
  }
  if (checkoutTotalPaymentMethod !== "PIX") {
    throw new Error("checkoutTotalPaymentMethod deve corresponder à forma de pagamento usada para validar o total configurado.");
  }

  if (!checkoutUrl) {
    throw new Error("Checkout não configurado: informe NEXT_PUBLIC_CAKTO_CHECKOUT_URL antes de iniciar ou publicar.");
  }
  let checkout;
  try {
    checkout = new URL(checkoutUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_CAKTO_CHECKOUT_URL precisa ser um endereço HTTPS válido da Cakto.");
  }
  const officialDomain = checkout.hostname === "cakto.com.br" || checkout.hostname.endsWith(".cakto.com.br");
  if (checkout.protocol !== "https:" || !officialDomain) {
    throw new Error("O checkout configurado precisa usar HTTPS e um domínio oficial da Cakto.");
  }

  return {
    productName: stored.productName,
    checkoutUrl: checkout.toString(),
    supportEmail,
    price,
    checkoutServiceFee,
    checkoutTotal,
    checkoutTotalPaymentMethod,
    currency: stored.currency,
    analytics: { metaPixelId, ga4MeasurementId },
    experiment: { ...stored.experiment },
    campaign: { ...stored.campaign },
    popup: { ...stored.popup },
    guarantee: { ...stored.guarantee },
    socialProof: { ...stored.socialProof },
    content,
  };
}

export function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
