import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import fs from "fs";
import { createHash } from "crypto";

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const pkgRoot = path.join(__dirname, "..");
export const generatedDir = path.join(pkgRoot, "src", "generated");
export const distDir = path.join(pkgRoot, "dist");

/** Bundle a TS entry to a single ESM string, externalizing caido:* + builtins. */
export async function bundleToString(entry) {
  const res = await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    external: ["caido:*"],
    mainFields: ["module", "main"],
    conditions: ["import", "module", "default"],
    resolveExtensions: [".ts", ".mjs", ".js", ".json"],
    legalComments: "none",
    treeShaking: true,
  });
  return res.outputFiles[0].text;
}

/** Bundle a TS entry, dynamic-import it, and return the module. */
export async function importBundled(entry) {
  const code = await bundleToString(entry);
  const tmp = path.join(os.tmpdir(), `hv-meta-${process.pid}.mjs`);
  fs.writeFileSync(tmp, code);
  try {
    return await import("file://" + tmp);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** A valid Caido plugin id: lowercase, digits, single -/_ separators. */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .replace(/[-_]{2,}/g, "-")
    .replace(/[-_]+$/g, "");
}

/**
 * Deterministic UUID-v4-shaped string derived from a seed. Uses a full SHA-1 of
 * the seed so distinct seeds never collide (a weak rolling hash previously mapped
 * several slugs onto the same UUID, shipping broken duplicate workflows).
 */
export function uuidFrom(seed) {
  const s = createHash("sha1").update(seed).digest("hex"); // 40 hex chars
  return (
    s.slice(0, 8) +
    "-" +
    s.slice(8, 12) +
    "-4" +
    s.slice(13, 16) +
    "-" +
    ((parseInt(s[16], 16) & 0x3) | 0x8).toString(16) +
    s.slice(17, 20) +
    "-" +
    s.slice(20, 32)
  );
}
