// The conversion engine: parse a tagged string into a tree, then evaluate it
// innermost-first against a tag registry. Unknown/unclosed tags render literally.

import { parse, stripNumber, type Node, type TagNode } from "./parser";
import type {
  ArgValue,
  EvalContext,
  RequestContext,
  TagDef,
  TagRegistry,
} from "./types";

const MAX_DEPTH = 500;

export interface ConvertOptions {
  registry: TagRegistry;
  globals?: Map<string, string>;
  request?: RequestContext;
  codeExecuteKey?: string;
}

/** Resolve a tag name, stripping a trailing `_N` numbering suffix if needed. */
export function resolveTag(
  registry: TagRegistry,
  name: string,
): TagDef | undefined {
  return registry.get(name) ?? registry.get(stripNumber(name));
}

async function evalNode(node: Node, ctx: EvalContext): Promise<string> {
  if (node.type === "text") return node.value;
  const tag = node as TagNode;

  // Unclosed paired tag -> render its open marker + children literally.
  if (!tag.selfClosing && !tag.closed) {
    let inner = "";
    for (const child of tag.children) inner += await evalNode(child, ctx);
    return tag.rawOpen + inner;
  }

  // Evaluate children first (innermost-first semantics).
  let input = "";
  for (const child of tag.children) input += await evalNode(child, ctx);

  const def = resolveTag(ctx.registry, tag.name);
  if (!def) {
    // Unknown tag -> literal passthrough (weak convert).
    if (tag.selfClosing) return tag.rawOpen;
    return tag.rawOpen + input + `</@${tag.name}>`;
  }

  if (ctx.depth > MAX_DEPTH) return input;

  // Merge declared-default args with provided args.
  const args: ArgValue[] = def.args.map((a, i) =>
    tag.args[i] !== undefined ? tag.args[i]! : a.default,
  );

  try {
    const childCtx: EvalContext = { ...ctx, depth: ctx.depth + 1 };
    return await def.handler(input, args, childCtx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `[error:${tag.name}: ${msg}]`;
  }
}

/** Convert a full tagged string. */
export async function convert(
  input: string,
  opts: ConvertOptions,
): Promise<string> {
  const ctx: EvalContext = {
    vars: new Map(),
    globals: opts.globals ?? new Map(),
    registry: opts.registry,
    request: opts.request,
    codeExecuteKey: opts.codeExecuteKey,
    depth: 0,
  };
  const nodes = parse(input);
  let out = "";
  for (const node of nodes) out += await evalNode(node, ctx);
  return out;
}

/** Apply a single named tag to text (used by per-tag workflow nodes). */
export async function applyTag(
  registry: TagRegistry,
  name: string,
  input: string,
  args: ArgValue[] = [],
  extra?: Partial<ConvertOptions>,
): Promise<string> {
  const def = resolveTag(registry, name);
  if (!def) throw new Error(`unknown tag: ${name}`);
  const ctx: EvalContext = {
    vars: new Map(),
    globals: extra?.globals ?? new Map(),
    registry,
    request: extra?.request,
    codeExecuteKey: extra?.codeExecuteKey,
    depth: 0,
  };
  const merged: ArgValue[] = def.args.map((a, i) =>
    args[i] !== undefined ? args[i]! : a.default,
  );
  return def.handler(input, merged, ctx);
}

/**
 * Synchronous single-tag apply for workflow nodes (whose `run` is sync).
 * Throws if the resolved handler returns a Promise (crypto/code-exec tags that
 * need the async backend instead).
 */
export function applyTagSync(
  registry: TagRegistry,
  name: string,
  input: string,
  args: ArgValue[] = [],
  extra?: Partial<ConvertOptions>,
): string {
  const def = resolveTag(registry, name);
  if (!def) throw new Error(`unknown tag: ${name}`);
  const ctx: EvalContext = {
    vars: new Map(),
    globals: extra?.globals ?? new Map(),
    registry,
    request: extra?.request,
    codeExecuteKey: extra?.codeExecuteKey,
    depth: 0,
  };
  const merged: ArgValue[] = def.args.map((a, i) =>
    args[i] !== undefined ? args[i]! : a.default,
  );
  const out = def.handler(input, merged, ctx);
  if (typeof out !== "string")
    throw new Error(`tag '${name}' requires the async backend`);
  return out;
}

/** Does the string contain at least one opening Hackvertor tag? */
export function hasTags(input: string): boolean {
  return input.includes("<@");
}

function evalNodeSync(node: Node, ctx: EvalContext): string {
  if (node.type === "text") return node.value;
  const tag = node as TagNode;
  if (!tag.selfClosing && !tag.closed) {
    let inner = "";
    for (const child of tag.children) inner += evalNodeSync(child, ctx);
    return tag.rawOpen + inner;
  }
  let input = "";
  for (const child of tag.children) input += evalNodeSync(child, ctx);
  const def = resolveTag(ctx.registry, tag.name);
  if (!def) {
    if (tag.selfClosing) return tag.rawOpen;
    return tag.rawOpen + input + `</@${tag.name}>`;
  }
  if (ctx.depth > MAX_DEPTH) return input;
  const args: ArgValue[] = def.args.map((a, i) =>
    tag.args[i] !== undefined ? tag.args[i]! : a.default,
  );
  try {
    const childCtx: EvalContext = { ...ctx, depth: ctx.depth + 1 };
    const out = def.handler(input, args, childCtx);
    if (typeof out !== "string")
      throw new Error(`tag '${tag.name}' requires the async backend`);
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `[error:${tag.name}: ${msg}]`;
  }
}

/**
 * Synchronous full-string convert — valid when every tag used has a sync
 * handler (all the pure built-ins). Used by the "Hackvertor Tags" workflow node.
 */
export function convertSync(input: string, opts: ConvertOptions): string {
  const ctx: EvalContext = {
    vars: new Map(),
    globals: opts.globals ?? new Map(),
    registry: opts.registry,
    request: opts.request,
    codeExecuteKey: opts.codeExecuteKey,
    depth: 0,
  };
  const nodes = parse(input);
  let out = "";
  for (const node of nodes) out += evalNodeSync(node, ctx);
  return out;
}
