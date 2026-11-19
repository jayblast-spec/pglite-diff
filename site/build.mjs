import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import site from "./site.config.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const { basePath, assetPrefix } = site;

if (basePath !== "/pglite-diff" || assetPrefix !== "/pglite-diff") {
  throw new Error("basePath and assetPrefix must both be /pglite-diff");
}

const template = await readFile(join(root, "index.html"), "utf8");
const html = template
  .replaceAll("__BASE_PATH__", basePath)
  .replaceAll("__ASSET_PREFIX__", assetPrefix);

if (html.includes("__BASE_PATH__") || html.includes("__ASSET_PREFIX__")) {
  throw new Error("unreplaced site path placeholders");
}

await mkdir(dist, { recursive: true });
await writeFile(join(dist, "index.html"), html);
await copyFile(join(root, "site.css"), join(dist, "site.css"));
await copyFile(join(root, "..", "docs", "banner.svg"), join(dist, "banner.svg"));
