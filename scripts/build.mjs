// Orchestrated build:
//   1. caido-dev build       -> dist/plugin_package/{manifest.json, frontend, backend}
//   2. workflows generate+build -> packages/workflows/dist/<slug>/definition.json
//   3. copy each workflow definition into the package + merge manifest entries
//   4. re-zip dist/plugin_package -> dist/plugin_package.zip

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pkgDir = path.join(root, "dist", "plugin_package");
const wfDist = path.join(root, "packages", "workflows", "dist");

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

// 1. frontend + backend
run("pnpm run build:base");

// 2. workflows
run("pnpm --filter workflows build");

// 3. merge workflows into the package
const manifestPath = path.join(pkgDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entries = JSON.parse(fs.readFileSync(path.join(wfDist, "index.json"), "utf8"));

let merged = 0;
for (const entry of entries) {
  const srcDef = path.join(wfDist, entry.id, "definition.json");
  if (!fs.existsSync(srcDef)) {
    throw new Error(
      `missing workflow definition ${srcDef} — aborting so a partial package is never shipped`,
    );
  }
  const outDir = path.join(pkgDir, entry.id);
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(srcDef, path.join(outDir, "definition.json"));
  manifest.plugins.push({
    kind: "workflow",
    id: entry.id,
    name: entry.name,
    definition: entry.definition,
  });
  merged++;
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\n[*] Merged ${merged} workflow plugins into manifest (${manifest.plugins.length} total)`);

// 4. re-zip — deterministic: sorted entries + fixed timestamps so identical
//    inputs produce a byte-identical package (reproducible builds).
const ZIP_DATE = new Date(0);
function addDir(zip, dir, base = "") {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(full).isDirectory()) addDir(zip, full, rel);
    else zip.file(rel, fs.readFileSync(full), { date: ZIP_DATE });
  }
}

const zip = new JSZip();
addDir(zip, pkgDir);
const content = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
});
const zipPath = path.join(root, "dist", "plugin_package.zip");
fs.writeFileSync(zipPath, content);
console.log(`[*] Wrote ${zipPath} (${(content.length / 1024).toFixed(0)} KB)`);
console.log("[✓] Build complete");
