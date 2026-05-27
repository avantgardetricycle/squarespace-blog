/**
 * Minify loader.js and renderer.js for production.
 *
 * Source of truth (editable): scripts/loader.js, scripts/renderer.js
 * Outputs:
 *   - scripts/dist/loader.js, scripts/dist/renderer.js (server + GitHub Pages)
 *   - client/public/loader.js, client/public/renderer.js (Vite static)
 *
 * Usage:
 *   node scripts/build.mjs
 *   node scripts/build.mjs --out ./pages-out   # custom deploy directory (CI)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "terser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const FILES = ["loader.js", "renderer.js"];

const outArgIdx = process.argv.indexOf("--out");
const customOut =
  outArgIdx >= 0 && process.argv[outArgIdx + 1]
    ? path.resolve(process.argv[outArgIdx + 1])
    : null;

const targets = [
  customOut || path.join(__dirname, "dist"),
  path.join(root, "client", "public"),
];

for (const dir of targets) {
  fs.mkdirSync(dir, { recursive: true });
}

for (const name of FILES) {
  const srcPath = path.join(__dirname, name);
  const src = fs.readFileSync(srcPath, "utf8");
  const result = await minify(src, {
    compress: { passes: 2, drop_console: false },
    mangle: true,
    format: { comments: false },
  });
  if (result.error) {
    console.error(`[build:scripts] Failed to minify ${name}:`, result.error);
    process.exit(1);
  }
  const code = result.code;
  for (const dir of targets) {
    const outPath = path.join(dir, name);
    fs.writeFileSync(outPath, code);
    const kb = (Buffer.byteLength(code, "utf8") / 1024).toFixed(1);
    console.log(`[build:scripts] ${name} → ${outPath} (${kb} KB)`);
  }
  const srcKb = (Buffer.byteLength(src, "utf8") / 1024).toFixed(1);
  const ratio = ((1 - Buffer.byteLength(code, "utf8") / Buffer.byteLength(src, "utf8")) * 100).toFixed(
    0,
  );
  console.log(`[build:scripts] ${name}: ${srcKb} KB → ${(Buffer.byteLength(code, "utf8") / 1024).toFixed(1)} KB (${ratio}% smaller)`);
}
