/**
 * Minify loader.js and renderer.js for production.
 *
 * Source of truth (editable): scripts/loader.js, scripts/renderer.js
 * Outputs:
 *   - scripts/dist/loader.js, scripts/dist/renderer.js (server + GitHub Pages)
 *   - client/public/loader.js, client/public/renderer.js (Vite static)
 *
 * Inject API base into loader BEFORE minify (terser removes the placeholder if
 * minified first). Set API_BASE_URL env or pass --api-base https://your-api.example
 *
 * Usage:
 *   node scripts/build.mjs
 *   API_BASE_URL=https://staging.betterblog.xyz node scripts/build.mjs
 *   node scripts/build.mjs --out ./pages-scripts --api-base https://app.example
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "terser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const FILES = ["loader.js", "renderer.js"];
const API_PLACEHOLDER = "__API_BASE_URL__";

const outArgIdx = process.argv.indexOf("--out");
const customOut =
  outArgIdx >= 0 && process.argv[outArgIdx + 1]
    ? path.resolve(process.argv[outArgIdx + 1])
    : null;

const apiBaseArgIdx = process.argv.indexOf("--api-base");
function resolveApiBaseForBuild() {
  const raw =
    (apiBaseArgIdx >= 0 && process.argv[apiBaseArgIdx + 1]
      ? process.argv[apiBaseArgIdx + 1]
      : null) ||
    process.env.API_BASE_URL ||
    process.env.APP_URL ||
    "";
  if (raw) return raw.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`.replace(/\/+$/, "");
  return "";
}
const apiBaseInject = resolveApiBaseForBuild();

const targets = [
  customOut || path.join(__dirname, "dist"),
  path.join(root, "client", "public"),
];

for (const dir of targets) {
  fs.mkdirSync(dir, { recursive: true });
}

function prepareLoaderSource(src) {
  if (!apiBaseInject) return src;
  if (!src.includes(API_PLACEHOLDER)) {
    console.warn(
      `[build:scripts] loader.js missing ${API_PLACEHOLDER}; skip API base injection`,
    );
    return src;
  }
  console.log(`[build:scripts] injecting API base into loader: ${apiBaseInject}`);
  return src.split(API_PLACEHOLDER).join(apiBaseInject);
}

for (const name of FILES) {
  const srcPath = path.join(__dirname, name);
  let src = fs.readFileSync(srcPath, "utf8");
  if (name === "loader.js") {
    src = prepareLoaderSource(src);
  }
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
  console.log(
    `[build:scripts] ${name}: ${srcKb} KB → ${(Buffer.byteLength(code, "utf8") / 1024).toFixed(1)} KB (${ratio}% smaller)`,
  );
}
