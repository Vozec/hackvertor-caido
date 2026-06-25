// For each generated workflow, bundle its javascript.ts and inline the result
// as the code-js node's `code` input. Emit ready-to-ship definition.json files
// under dist/, plus index.json (the manifest plugin entries).

import fs from "fs";
import path from "path";
import { bundleToString, distDir, generatedDir } from "./common.mjs";

if (!fs.existsSync(generatedDir)) {
  throw new Error("run `pnpm generate` first (no src/generated)");
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const slugs = fs
  .readdirSync(generatedDir)
  .filter((d) => fs.statSync(path.join(generatedDir, d)).isDirectory());

let built = 0;
for (const slug of slugs) {
  const srcDir = path.join(generatedDir, slug);
  const def = JSON.parse(
    fs.readFileSync(path.join(srcDir, "definition.json"), "utf8"),
  );
  const jsNodes = def.graph.nodes.filter(
    (n) => n.definition_id === "caido/code-js",
  );
  for (const node of jsNodes) {
    const scriptPath = path.join(srcDir, `${node.alias}.ts`);
    if (!fs.existsSync(scriptPath)) continue;
    const code = await bundleToString(scriptPath);
    node.inputs = node.inputs.map((inp) =>
      inp.alias === "code"
        ? { alias: "code", value: { data: code, kind: "string" } }
        : inp,
    );
  }
  const outDir = path.join(distDir, slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "definition.json"),
    JSON.stringify(def, null, 2),
  );
  built++;
}

fs.copyFileSync(
  path.join(generatedDir, "index.json"),
  path.join(distDir, "index.json"),
);

console.log(`[build] inlined + wrote ${built} workflow definitions -> ${distDir}`);
