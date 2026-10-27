import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { getSiteConfig, rootDir, safeJson } from "./config.mjs";
import { serveFile } from "./http-file.mjs";

const site = await getSiteConfig();
const port = Number(process.env.PORT || 4173);
const formatAmount = (amount) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount);
const formatSchemaAmount = (amount) => Number(amount).toFixed(2);
const pageFiles = new Map([["/", "index.html"], ["/privacidade", "privacy.html"], ["/termos", "terms.html"], ["/styles.css", "styles.css"], ["/app.js", "app.js"], ["/ui.js", "ui.js"], ["/robots.txt", "robots.txt"]]);
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"], [".webp", "image/webp"], [".png", "image/png"],
  [".mp4", "video/mp4"], [".vtt", "text/vtt; charset=utf-8"], [".txt", "text/plain; charset=utf-8"], [".woff2", "font/woff2"],
]);

const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (pathname === "/runtime-config.js") {
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
    response.end(`window.LANDING_CONFIG = Object.freeze(${safeJson(site)});\n`);
    return;
  }

  const routeFile = pageFiles.get(pathname);
  const relativePath = routeFile || pathname.slice(1);
  const fullPath = path.resolve(rootDir, routeFile ? relativePath : path.join("public", relativePath));
  const allowedRoot = path.resolve(routeFile ? rootDir : path.join(rootDir, "public")) + path.sep;
  if (!routeFile && !fullPath.startsWith(allowedRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileInfo = await stat(fullPath);
    if (!fileInfo.isFile()) throw new Error("Not a file");
    if (path.extname(fullPath) === ".html") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      let html = await readFile(fullPath, "utf8");
      html = html
        .replaceAll("__CHECKOUT_URL__", site.checkoutUrl)
        .replaceAll("__SUPPORT_EMAIL__", site.supportEmail)
        .replaceAll("__PRODUCT_PRICE__", formatAmount(site.price))
        .replaceAll("__PRODUCT_PRICE_SCHEMA__", formatSchemaAmount(site.price))
        .replaceAll("__CAKTO_SERVICE_FEE__", formatAmount(site.checkoutServiceFee))
        .replaceAll("__CHECKOUT_TOTAL__", formatAmount(site.checkoutTotal))
        .replaceAll("__CHECKOUT_CARD_INSTALLMENTS__", `${site.checkoutCardInstallmentCount} × R$ ${formatAmount(site.checkoutCardInstallmentAmount)}`)
        .replaceAll("__CHECKOUT_CARD_TOTAL__", formatAmount(site.checkoutCardTotal));
      response.end(html);
      return;
    }
    await serveFile(request, response, fullPath, mimeTypes.get(path.extname(fullPath)) || "application/octet-stream");
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Página ou arquivo não encontrado.");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Landing page disponível em http://localhost:${port}`);
});
