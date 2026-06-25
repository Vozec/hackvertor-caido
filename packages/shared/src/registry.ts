import { cipherTags } from "./tags/cipher";
import { conditionTags } from "./tags/conditions";
import { contextTags } from "./tags/context";
import { convertTags } from "./tags/convert";
import { dateTags } from "./tags/datetime";
import { decodeTags } from "./tags/decode";
import { encodeTags } from "./tags/encode";
import { hashTags, hmacTags } from "./tags/hash";
import { mathTags } from "./tags/math";
import { stringTags } from "./tags/string";
import { variableTags } from "./tags/variables";
import { xssTags } from "./tags/xss";
import type { TagCategory, TagDef, TagRegistry } from "./types";

/** All tags that run with no external crypto / runtime dependencies. */
export const ALL_TAGS: TagDef[] = [
  ...encodeTags,
  ...decodeTags,
  ...stringTags,
  ...convertTags,
  ...mathTags,
  ...conditionTags,
  ...dateTags,
  ...xssTags,
  ...cipherTags,
  ...hashTags,
  ...hmacTags,
  ...variableTags,
  ...contextTags,
];

export function buildRegistry(extra: TagDef[] = []): TagRegistry {
  const reg: TagRegistry = new Map();
  for (const t of [...ALL_TAGS, ...extra]) reg.set(t.name, t);
  return reg;
}

/** Default registry with the built-in pure tags. */
export const DEFAULT_REGISTRY = buildRegistry();

export interface TagSummary {
  name: string;
  category: TagCategory;
  hasInput: boolean;
  tooltip: string;
  args: { name: string; type: string; default: unknown }[];
}

export function listTags(reg: TagRegistry = DEFAULT_REGISTRY): TagSummary[] {
  return [...reg.values()].map((t) => ({
    name: t.name,
    category: t.category,
    hasInput: t.hasInput,
    tooltip: t.tooltip,
    args: t.args.map((a) => ({
      name: a.name,
      type: a.type,
      default: a.default,
    })),
  }));
}

export function tagsByCategory(
  reg: TagRegistry = DEFAULT_REGISTRY,
): Record<string, TagSummary[]> {
  const out: Record<string, TagSummary[]> = {};
  for (const t of listTags(reg)) {
    (out[t.category] ??= []).push(t);
  }
  return out;
}
