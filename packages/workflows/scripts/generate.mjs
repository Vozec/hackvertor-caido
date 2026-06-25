// Generate one Caido `convert` workflow per pure tag from the shared registry,
// plus a combined "Hackvertor Tags" workflow that runs the full <@tag> parser.
//
// Output: src/generated/<slug>/{definition.json, javascript.ts}
// and src/generated/index.json (the manifest plugin entries).

import fs from "fs";
import path from "path";
import { generatedDir, importBundled, pkgRoot, slugify } from "./common.mjs";
import { convertDefinition } from "./definition-template.mjs";

// Tags whose handler is async (need the backend) — skip in workflow nodes.
const ASYNC_ONLY = new Set();

const meta = await importBundled(path.join(pkgRoot, "src", "meta.ts"));
const tags = meta.listTags();

fs.rmSync(generatedDir, { recursive: true, force: true });
fs.mkdirSync(generatedDir, { recursive: true });

const entries = [];
const usedSlugs = new Set();

function nodeScript(tagName, args) {
  return `import { BytesInput, SDK } from "caido:workflow";
import { DEFAULT_REGISTRY, applyTagSync } from "shared";

export function run(input: BytesInput, sdk: SDK) {
  const text = sdk.asString(input);
  return applyTagSync(DEFAULT_REGISTRY, ${JSON.stringify(tagName)}, text, ${JSON.stringify(args)});
}
`;
}

function write(slug, name, description, script) {
  if (usedSlugs.has(slug)) slug = slug + "-x";
  usedSlugs.add(slug);
  const dir = path.join(generatedDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const def = convertDefinition({ id: slug, name, description });
  fs.writeFileSync(
    path.join(dir, "definition.json"),
    JSON.stringify(def, null, 2),
  );
  fs.writeFileSync(path.join(dir, "javascript.ts"), script);
  entries.push({ kind: "workflow", id: slug, name, definition: `${slug}/definition.json` });
}

let count = 0;
for (const t of tags) {
  if (ASYNC_ONLY.has(t.name)) continue;
  const slug = slugify("hv-" + t.name);
  const name = `${t.category}: ${t.name}`;
  const args = t.args.map((a) => a.default);
  write(slug, name, t.tooltip, nodeScript(t.name, args));
  count++;
}

// Combined full-parser workflow.
write(
  "hackvertor-tags",
  "Hackvertor: Tags",
  "Apply all <@tag>...</@tag> conversions found in the input",
  `import { BytesInput, SDK } from "caido:workflow";
import { DEFAULT_REGISTRY, convertSync } from "shared";

export function run(input: BytesInput, sdk: SDK) {
  const text = sdk.asString(input);
  return convertSync(text, { registry: DEFAULT_REGISTRY });
}
`,
);

fs.writeFileSync(
  path.join(generatedDir, "index.json"),
  JSON.stringify(entries, null, 2),
);

console.log(`[generate] wrote ${count} tag workflows + 1 combined -> ${generatedDir}`);
