import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { rootDir } from "./config.mjs";

const distDir = path.join(rootDir, "dist");
const html = await readFile(path.join(distDir, "index.html"), "utf8");
const script = await readFile(path.join(distDir, "script.js"), "utf8");

assert.match(html, /2429955871112248/);
assert.match(html, /fbq\('track','PageView'\)/);
assert.equal((html.match(/323zgdr_1243414/g) || []).length, 2);
assert.equal((html.match(/ihyd7v3_1261754/g) || []).length, 2);
assert.match(script, /InitiateCheckout/);
assert.match(script, /utm_/);
assert.match(script, /OFFER_POPUP_INITIAL_DELAY_MS = 6000/);
assert.match(script, /OFFER_POPUP_REOPEN_DELAY_MS = 8000/);
assert.match(script, /OFFER_POPUP_MAX_REOPENS = 6/);

const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)]
  .map((match) => match[1])
  .filter((ref) => !/^(?:https?:|mailto:|\/)/.test(ref));
for (const ref of new Set(refs)) await access(path.join(distDir, ref));

assert.doesNotMatch(html, /landing-premium-v2|landing-ui-v2|mockup-produto/);
console.log(`Smoke test aprovado: ${new Set(refs).size} referências locais verificadas.`);
