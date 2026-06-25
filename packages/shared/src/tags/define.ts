// Small helper to declare tags with less boilerplate.

import type {
  ArgType,
  ArgValue,
  TagCategory,
  TagDef,
  TagHandler,
} from "../types";

export function arg(
  name: string,
  type: ArgType,
  def: ArgValue,
): { name: string; type: ArgType; default: ArgValue } {
  return { name, type, default: def };
}

export function tag(
  category: TagCategory,
  name: string,
  tooltip: string,
  handler: TagHandler,
  opts: {
    hasInput?: boolean;
    args?: { name: string; type: ArgType; default: ArgValue }[];
  } = {},
): TagDef {
  return {
    name,
    category,
    hasInput: opts.hasInput ?? true,
    tooltip,
    args: opts.args ?? [],
    handler,
  };
}
