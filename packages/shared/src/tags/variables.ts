import type { TagDef } from "../types";
import { arg, tag } from "./define";

// Variables: <@set_NAME>value</@set_NAME> stores; <@get_NAME/> retrieves.
// We expose generic set/get tags that take the variable name as an argument,
// plus a boolean to promote a local to global scope (mirrors Hackvertor).
export const variableTags: TagDef[] = [
  tag(
    "Variables",
    "set",
    "Store the input in a variable",
    (s, a, ctx) => {
      const name = String(a[0]);
      const global = Boolean(a[1]);
      if (global) ctx.globals.set(name, s);
      else ctx.vars.set(name, s);
      return s;
    },
    { args: [arg("name", "string", "var"), arg("global", "boolean", false)] },
  ),
  tag(
    "Variables",
    "get",
    "Retrieve a variable's value",
    (_s, a, ctx) => {
      const name = String(a[0]);
      return ctx.vars.get(name) ?? ctx.globals.get(name) ?? "UNDEFINED";
    },
    { hasInput: false, args: [arg("name", "string", "var")] },
  ),
  tag(
    "Variables",
    "increment_var",
    "Increment a counter variable",
    (_s, a, ctx) => {
      const name = String(a[1]);
      const global = Boolean(a[2]);
      const store = global ? ctx.globals : ctx.vars;
      const cur = store.has(name) ? Number(store.get(name)) : Number(a[0]);
      const next = cur + 1;
      store.set(name, String(next));
      return String(cur);
    },
    {
      hasInput: false,
      args: [
        arg("start", "number", 0),
        arg("name", "string", "counter"),
        arg("global", "boolean", false),
      ],
    },
  ),
  tag(
    "Variables",
    "decrement_var",
    "Decrement a counter variable",
    (_s, a, ctx) => {
      const name = String(a[1]);
      const global = Boolean(a[2]);
      const store = global ? ctx.globals : ctx.vars;
      const cur = store.has(name) ? Number(store.get(name)) : Number(a[0]);
      const next = cur - 1;
      store.set(name, String(next));
      return String(cur);
    },
    {
      hasInput: false,
      args: [
        arg("start", "number", 0),
        arg("name", "string", "counter"),
        arg("global", "boolean", false),
      ],
    },
  ),
];
