import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

// Safari requests byte ranges to start and seek through MP4 files.
export async function serveFile(request, response, filePath, contentType) {
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error("Not a file");
  const headers = { "Content-Type": contentType, "Accept-Ranges": "bytes" };
  let start = 0;
  let end = info.size - 1;
  let status = 200;
  if (request.headers.range) {
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    if (range && (range[1] || range[2])) {
      if (range[1]) {
        start = Number(range[1]);
        end = range[2] ? Math.min(Number(range[2]), end) : end;
      } else {
        start = Math.max(0, info.size - Number(range[2]));
      }
    }
    if (!range || (!range[1] && !range[2]) || start > end || start >= info.size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      response.writeHead(416, { ...headers, "Content-Range": `bytes */${info.size}` }).end();
      return;
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
  }
  headers["Content-Length"] = end - start + 1;
  response.writeHead(status, headers);
  if (request.method === "HEAD") { response.end(); return; }
  const stream = createReadStream(filePath, { start, end });
  stream.on("error", () => response.destroy());
  response.on("close", () => stream.destroy());
  stream.pipe(response);
}
