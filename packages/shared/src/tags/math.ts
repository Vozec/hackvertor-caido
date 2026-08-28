import type { ArgValue, TagDef } from "../types";
import { arg, tag } from "./define";

// Deterministic PRNG seeded from input length + content so workflow nodes don't
// need Math.random (which is unavailable in some runtimes). Good enough for payloads.
function makeRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 4294967296;
  };
}

function randomFrom(chars: string, len: number, seed: string): string {
  const rng = makeRng(seed + ":" + chars + ":" + len);
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(rng() * chars.length)]!;
  return out;
}

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const HEXC = "0123456789abcdef";

function arithmetic(s: string, amount: number, op: string, split: string): string {
  return s
    .split(split)
    .map((part) => {
      const n = Number(part);
      if (isNaN(n)) return part;
      switch (op) {
        case "+":
          return String(n + amount);
        case "-":
          return String(n - amount);
        case "*":
          return String(n * amount);
        case "/":
          return String(n / amount);
        case "%":
          return String(n % amount);
        default:
          return part;
      }
    })
    .join(split);
}

export const mathTags: TagDef[] = [
  tag(
    "Math",
    "range",
    "Generate a numeric range",
    (_s, a) => {
      const from = Number(a[0]);
      const to = Number(a[1]);
      const step = Number(a[2]) || 1;
      const out: number[] = [];
      for (let i = from; step > 0 ? i <= to : i >= to; i += step) out.push(i);
      return out.join("\n");
    },
    {
      hasInput: false,
      args: [
        arg("from", "number", 0),
        arg("to", "number", 10),
        arg("step", "number", 1),
      ],
    },
  ),
  tag("Math", "total", "Sum of numbers in the input", (s) => {
    const nums = s.match(/-?\d+(\.\d+)?/g) ?? [];
    return String(nums.reduce((acc, n) => acc + Number(n), 0));
  }),
  tag(
    "Math",
    "arithmetic",
    "Apply arithmetic to each number",
    (s, a) =>
      arithmetic(s, Number(a[0]), String(a[1]), String(a[2] ?? ",")),
    {
      args: [
        arg("amount", "number", 1),
        arg("operation", "string", "+"),
        arg("split", "string", ","),
      ],
    },
  ),
  tag(
    "Math",
    "zeropad",
    "Zero-pad each number to a width",
    (s, a) =>
      s
        .split(String(a[0]))
        .map((p) => {
          const width = Number(a[1]);
          // pad the digits, keep any leading sign in front ("-5" -> "-005")
          const m = /^([+-]?)(.*)$/.exec(p)!;
          return m[1] + m[2]!.padStart(width - m[1]!.length, "0");
        })
        .join(String(a[0])),
    { args: [arg("split", "string", ","), arg("amount", "number", 3)] },
  ),
  tag(
    "Math",
    "random",
    "Random string from a charset",
    (s, a) => randomFrom(String(a[0]), Number(a[1]), s),
    {
      hasInput: false,
      args: [
        arg("chars", "string", LOWER + UPPER + DIGITS),
        arg("len", "number", 10),
      ],
    },
  ),
  tag("Math", "random_alpha_lower", "Random lowercase letters", (s, a) =>
    randomFrom(LOWER, Number(a[0]), s),
    { hasInput: false, args: [arg("len", "number", 10)] },
  ),
  tag("Math", "random_alpha_upper", "Random uppercase letters", (s, a) =>
    randomFrom(UPPER, Number(a[0]), s),
    { hasInput: false, args: [arg("len", "number", 10)] },
  ),
  tag("Math", "random_alpha_mixed", "Random mixed-case letters", (s, a) =>
    randomFrom(LOWER + UPPER, Number(a[0]), s),
    { hasInput: false, args: [arg("len", "number", 10)] },
  ),
  tag("Math", "random_alphanum_lower", "Random lowercase alphanumeric", (s, a) =>
    randomFrom(LOWER + DIGITS, Number(a[0]), s),
    { hasInput: false, args: [arg("len", "number", 10)] },
  ),
  tag("Math", "random_alphanum_upper", "Random uppercase alphanumeric", (s, a) =>
    randomFrom(UPPER + DIGITS, Number(a[0]), s),
    { hasInput: false, args: [arg("len", "number", 10)] },
  ),
  tag("Math", "random_alphanum_mixed", "Random mixed alphanumeric", (s, a) =>
    randomFrom(LOWER + UPPER + DIGITS, Number(a[0]), s),
    { hasInput: false, args: [arg("len", "number", 10)] },
  ),
  tag("Math", "random_hex", "Random hex string", (s, a) =>
    randomFrom(HEXC, Number(a[0]), s),
    { hasInput: false, args: [arg("len", "number", 10)] },
  ),
  tag("Math", "random_num", "Random digits", (s, a) =>
    randomFrom(DIGITS, Number(a[0]), s),
    { hasInput: false, args: [arg("len", "number", 10)] },
  ),
  tag("Math", "uuid", "Random UUID v4", (s) => {
    const rng = makeRng(s + ":uuid");
    const hex = (n: number) => {
      let out = "";
      for (let i = 0; i < n; i++) out += HEXC[Math.floor(rng() * 16)]!;
      return out;
    };
    const y = "89ab"[Math.floor(rng() * 4)]!;
    return `${hex(8)}-${hex(4)}-4${hex(3)}-${y}${hex(3)}-${hex(12)}`;
  }, { hasInput: false }),
];

// Re-export charsets list helper placeholder (kept minimal in this build).
export const _mathArgHelper = (a: ArgValue[]) => a;
