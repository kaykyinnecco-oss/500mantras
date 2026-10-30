import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSiteConfig, rootDir, safeJson } from "./config.mjs";
import { renderContent } from "./render-content.mjs";

const outputDir = path.join(rootDir, "dist");
const site = await getSiteConfig();

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of ["index.html", "styles.css", "script.js", "favicon.svg", "app.js"]) {
  await cp(path.join(rootDir, file), path.join(outputDir, file));
}

for (const file of ["privacy.html", "terms.html"]) {
  const source = renderContent(await readFile(path.join(rootDir, file), "utf8"), site);
  await writeFile(path.join(outputDir, file), source);
}

await cp(path.join(rootDir, "assets"), path.join(outputDir, "assets"), { recursive: true });
await cp(path.join(rootDir, "public", "robots.txt"), path.join(outputDir, "robots.txt"));
await writeFile(
  path.join(outputDir, "runtime-config.js"),
  `window.LANDING_CONFIG = Object.freeze(${safeJson(site)});\n`,
);

console.log(`Build concluído em ${path.relative(rootDir, outputDir)}.`);
