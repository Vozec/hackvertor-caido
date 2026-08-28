import type { TagDef } from "../types";
import { arg, tag } from "./define";

export const stringTags: TagDef[] = [
  tag("String", "uppercase", "Uppercase", (s) => s.toUpperCase()),
  tag("String", "lowercase", "Lowercase", (s) => s.toLowerCase()),
  tag("String", "capitalise", "Capitalise first letter", (s) =>
    s.charAt(0).toUpperCase() + s.slice(1),
  ),
  tag("String", "uncapitalise", "Lowercase first letter", (s) =>
    s.charAt(0).toLowerCase() + s.slice(1),
  ),
  tag("String", "reverse", "Reverse string", (s) =>
    Array.from(s).reverse().join(""),
  ),
  tag("String", "length", "Character length", (s) => String(Array.from(s).length)),
  tag("String", "unique", "Unique characters (preserve order)", (s) => {
    const seen = new Set<string>();
    let out = "";
    for (const ch of s)
      if (!seen.has(ch)) {
        seen.add(ch);
        out += ch;
      }
    return out;
  }),
  tag("String", "from_charcode", "Char codes (space-separated) to string", (s) => {
    const t = s.trim();
    if (!t) return "";
    return t
      .split(/\s+/)
      .map((n) => {
        const code = parseInt(n, 10);
        return isNaN(code) || code < 0 || code > 0x10ffff
          ? ""
          : String.fromCodePoint(code);
      })
      .join("");
  }),
  tag("String", "to_charcode", "String to space-separated char codes", (s) =>
    Array.from(s)
      .map((ch) => ch.codePointAt(0))
      .join(" "),
  ),
  tag("String", "space", "Insert a space", () => " ", { hasInput: false }),
  tag("String", "newline", "Insert a newline", () => "\n", { hasInput: false }),
  tag(
    "String",
    "find",
    "Return regex match (optional group)",
    (s, a) => {
      const re = new RegExp(String(a[0]));
      const m = re.exec(s);
      if (!m) return "";
      const g = Number(a[1] ?? 0);
      return m[g] ?? "";
    },
    { args: [arg("regex", "string", "\\w+"), arg("group", "number", 0)] },
  ),
  tag(
    "String",
    "replace",
    "Replace all occurrences (literal)",
    (s, a) => s.split(String(a[0])).join(String(a[1])),
    { args: [arg("find", "string", ""), arg("replace", "string", "")] },
  ),
  tag(
    "String",
    "regex_replace",
    "Replace via regex (global)",
    (s, a) => s.replace(new RegExp(String(a[0]), "g"), String(a[1])),
    { args: [arg("regex", "string", ""), arg("replace", "string", "")] },
  ),
  tag(
    "String",
    "repeat",
    "Repeat input N times",
    (s, a) => s.repeat(Math.max(0, Number(a[0]))),
    { args: [arg("amount", "number", 2)] },
  ),
  tag(
    "String",
    "substring",
    "Substring from start to end",
    (s, a) => {
      const end = Number(a[1]);
      // any negative end means "to the end of the string"
      return s.substring(Number(a[0]), end < 0 ? undefined : end);
    },
    { args: [arg("start", "number", 0), arg("end", "number", -1)] },
  ),
  tag(
    "String",
    "split_join",
    "Split on a char and join with another",
    (s, a) => s.split(String(a[0])).join(String(a[1])),
    { args: [arg("split", "string", ","), arg("join", "string", "\n")] },
  ),
  tag("String", "remove_output", "Discard output (keeps side effects)", () => ""),
];
