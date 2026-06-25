# Hackvertor for Caido

A port of [Hackvertor](https://github.com/hackvertor/hackvertor) (Burp Suite) to
[Caido](https://caido.io). It brings Hackvertor's tag-based conversion engine to
Caido as **native workflows**, a **converter page**, and **right-click editor
actions** — plus optional **auto-conversion of `<@tags>` in outgoing requests**.

## What you get

Every transform is exposed on four surfaces:

| Surface | How |
|---|---|
| **Workflow nodes** | One `convert` workflow per tag, named `Category: tag` (e.g. `Encode: base64`). Drop them into any Caido workflow and chain them. |
| **Convert operations** | The same workflows appear in the **Convert** tab and the right-click **Convert** menu (a Convert workflow *is* a Convert op in Caido). |
| **`Hackvertor: Tags` node** | A single workflow that parses a full `<@tag1><@tag2>…</@tag2></@tag1>` string and applies everything — power-user mode. |
| **Hackvertor page** | Sidebar tab with a live converter + category-grouped tag palette + search. |
| **Right-click menu** | On any request/response editor: *Convert tags in selection* and *Send selection to Hackvertor*. |
| **Auto on send** | Backend `onUpstream` hook converts `<@tags>` in outgoing requests. Gated by Caido's per-domain **Upstream Plugins** setting + an in-app toggle. |

## Tag syntax

```
<@base64>hello</@base64>                 encode
<@d_base64>aGVsbG8=</@d_base64>          decode
<@base64><@sha256>secret</@sha256></@base64>   nested (innermost first)
<@hex(" ")>AB</@hex>                     arguments
<@uuid/>                                 self-closing (no input)
<@base64_0>a</@base64_0><@base64_1>b</@base64_1>   numbered (repeat/nest same tag)
```

Unknown or unclosed tags are left as literal text (tolerant "weak" convert), so
arbitrary request data containing `<@` is never mangled.

## Project layout

```
caido.config.ts            frontend + backend plugin config (drives the base manifest)
scripts/build.mjs          orchestrator: caido-dev build + workflows + manifest merge + zip
packages/
  shared/                  pure-TS engine (parser, eval, codecs, hashes, all tags)
  backend/                 convert RPC + onUpstream auto-convert + runtime-crypto hashes
  frontend/                Vue/PrimeVue page + commands + context-menu items
  workflows/               generator -> one convert workflow per tag (+ combined)
```

The conversion engine lives in `shared` as pure TypeScript so it runs identically
in three places: the backend (Node-ish runtime, with extra crypto), the frontend
(browser), and inside each workflow node (esbuild inlines the engine into the
`caido/code-js` node — workflow nodes can't call backend RPC).

## Build & install

```bash
pnpm install
pnpm run build          # -> dist/plugin_package.zip
```

Then in Caido: **Plugins → Install package** → pick `dist/plugin_package.zip`.

Useful scripts:

- `pnpm run build` — full build (frontend + backend + 118 workflows, zipped & validated)
- `pnpm run build:base` — frontend + backend only (no workflows)
- `pnpm --filter workflows build` — regenerate + bundle the workflow definitions
- `pnpm -r typecheck` — typecheck every package

## How the workflow generation works

`@caido-community/dev` validates `kind: "workflow"` plugins but does **not** bundle
them. So `packages/workflows`:

1. `scripts/generate.mjs` reads the shared tag registry and writes one
   `src/generated/<slug>/{definition.json, javascript.ts}` per tag.
2. `scripts/build.mjs` esbuild-bundles each `javascript.ts` (externalizing
   `caido:*`) and inlines the result as the `caido/code-js` node's `code` input.
3. The root `scripts/build.mjs` copies those definitions into the package built by
   `caido-dev`, appends the workflow entries to its `manifest.json`, and re-zips.

## Status / roadmap

Implemented: Encode, Decode, String, Convert, Math, Conditions, Date, XSS,
classic ciphers (ROT-N, XOR, affine, atbash, rail-fence), MD5/SHA-1/SHA-256 +
HMAC (pure JS, in workflows) and SHA-224/384/512, SHA-3, RIPEMD-160, Whirlpool +
HMAC-SHA-384/512 (backend, via the runtime `crypto` module), variables/globals,
and request `context_*` tags.

Not yet ported (tracked): charsets (dynamic), Faker, compression (gzip/deflate/
brotli/bzip2), AES encrypt/decrypt, JWT, exotic hashes (Skein/Tiger/SM3/GOST),
and the code-execution / AI tags (which need the `codeExecuteKey` gating model).
