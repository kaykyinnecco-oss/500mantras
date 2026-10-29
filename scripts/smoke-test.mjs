import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { rootDir } from "./config.mjs";

const distDir = path.join(rootDir, "dist");
const readOutput = (file) => readFile(path.join(distDir, file), "utf8");
const html = await readOutput("index.html");
const css = await readOutput("assets/landing-premium-v2.css");
const app = await readOutput("app.js");
const runtimeSource = await readOutput("runtime-config.js");
const config = JSON.parse(
  runtimeSource.match(/Object\.freeze\(({[\s\S]*})\);\s*$/)[1],
);
// Exact commercial/analytics/legal contract from production main 66f61f4.
const digest = (source) =>
  createHash("sha256").update(source.replace(/\r\n/g, "\n")).digest("hex");
const baseline = JSON.parse(
  await readFile(
    path.join(rootDir, "docs/protected-main-66f61f4.json"),
    "utf8",
  ),
);
for (const [file, hash] of Object.entries(baseline.files))
  assert.equal(
    digest(await readFile(path.join(rootDir, file), "utf8")),
    hash,
    "Protected file unchanged: " + file,
  );
assert.equal(digest(app), baseline.files["app.js"]);
const sourceHtml = await readFile(path.join(rootDir, "index.html"), "utf8");
const { verifyRevision } = await import("./revision-contract.mjs");
await verifyRevision({
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
});
await import("./premium-test.mjs");
