import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { rootDir } from "./config.mjs";

const outputDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 4174);
const types = new Map([[".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"], [".webp", "image/webp"], [".svg", "image/svg+xml"], [".mp4", "video/mp4"], [".vtt", "text/vtt; charset=utf-8"]]);
const pageFiles = new Map([["/", "index.html"], ["/privacidade", "privacy.html"], ["/termos", "terms.html"]]);

const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const filePath = path.resolve(outputDir, pageFiles.get(pathname) || pathname.slice(1) || "index.html");
  if (!filePath.startsWith(outputDir + path.sep)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    await stat(filePath);
    response.writeHead(200, { "Content-Type": types.get(path.extname(filePath)) || "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end("Arquivo não encontrado. Rode primeiro: node scripts/build.mjs");
  }
});

server.listen(port, "0.0.0.0", () => console.log(`Prévia de produção em http://localhost:${port}`));
