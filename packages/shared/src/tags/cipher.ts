import { bytesToLatin1, bytesToUtf8, latin1ToBytes, utf8ToBytes } from "../codec";
import type { TagDef } from "../types";
import { arg, tag } from "./define";

function rotN(s: string, n: number): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    // normalize so negative n rotates correctly ("a" rot -1 -> "z")
    const y = (((c.charCodeAt(0) - base + n) % 26) + 26) % 26;
    return String.fromCharCode(y + base);
  });
}

/**
 * XOR with a repeating key. Byte-exact and reversible for arbitrary Unicode text:
 * encrypt maps text -> UTF-8 bytes -> XOR -> latin1 byte-string; decrypt reverses
 * (latin1 byte-string -> XOR -> UTF-8 text). ASCII is unaffected.
 */
function xor(s: string, key: string, decrypt: boolean): string {
  if (!key) return s;
  const kb = utf8ToBytes(key);
  const sb = decrypt ? latin1ToBytes(s) : utf8ToBytes(s);
  const out = new Uint8Array(sb.length);
  for (let i = 0; i < sb.length; i++) out[i] = sb[i]! ^ kb[i % kb.length]!;
  return decrypt ? bytesToUtf8(out) : bytesToLatin1(out);
}

function affine(s: string, a: number, b: number, decrypt: boolean): string {
  const modInverse = (x: number, m: number): number => {
    x = ((x % m) + m) % m;
    for (let i = 1; i < m; i++) if ((x * i) % m === 1) return i;
    throw new Error(`'a' (${a}) must be coprime with 26`);
  };
  const aInv = decrypt ? modInverse(a, 26) : 0;
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    const x = c.charCodeAt(0) - base;
    const y = decrypt ? aInv * (x - b) : a * x + b;
    return String.fromCharCode((((y % 26) + 26) % 26) + base);
  });
}

function atbash(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(25 - (c.charCodeAt(0) - base) + base);
  });
}

function railFenceEncrypt(s: string, rails: number): string {
  if (rails < 2) return s;
  const rows: string[] = Array.from({ length: rails }, () => "");
  let r = 0;
  let dir = 1;
  for (const ch of s) {
    rows[r] += ch;
    if (r === 0) dir = 1;
    else if (r === rails - 1) dir = -1;
    r += dir;
  }
  return rows.join("");
}

function railFenceDecrypt(s: string, rails: number): string {
  if (rails < 2) return s;
  const chars = Array.from(s);
  const len = chars.length;
  const pattern: number[] = [];
  let r = 0;
  let dir = 1;
  for (let i = 0; i < len; i++) {
    pattern.push(r);
    if (r === 0) dir = 1;
    else if (r === rails - 1) dir = -1;
    r += dir;
  }
  const counts = new Array(rails).fill(0);
  for (const p of pattern) counts[p]++;
  const offsets: number[] = [];
  let acc = 0;
  for (let i = 0; i < rails; i++) {
    offsets.push(acc);
    acc += counts[i];
  }
  const idx = new Array(rails).fill(0);
  let out = "";
  for (let i = 0; i < len; i++) {
    const row = pattern[i]!;
    out += chars[offsets[row]! + idx[row]!];
    idx[row]++;
  }
  return out;
}

export const cipherTags: TagDef[] = [
  tag("Encrypt", "rotN", "Caesar/ROT-N cipher", (s, a) => rotN(s, Number(a[0])), {
    args: [arg("n", "number", 13)],
  }),
  tag("Encrypt", "xor", "XOR with a repeating key", (s, a) => xor(s, String(a[0]), false), {
    args: [arg("key", "string", "")],
  }),
  tag("Decrypt", "xor_decrypt", "XOR with a repeating key", (s, a) =>
    xor(s, String(a[0]), true),
    { args: [arg("key", "string", "")] },
  ),
  tag(
    "Encrypt",
    "affine_encrypt",
    "Affine cipher encrypt",
    (s, a) => affine(s, Number(a[0]), Number(a[1]), false),
    { args: [arg("a", "number", 5), arg("b", "number", 8)] },
  ),
  tag(
    "Decrypt",
    "affine_decrypt",
    "Affine cipher decrypt",
    (s, a) => affine(s, Number(a[0]), Number(a[1]), true),
    { args: [arg("a", "number", 5), arg("b", "number", 8)] },
  ),
  tag("Encrypt", "atbash_encrypt", "Atbash cipher", (s) => atbash(s)),
  tag("Decrypt", "atbash_decrypt", "Atbash cipher", (s) => atbash(s)),
  tag(
    "Encrypt",
    "rail_fence_encrypt",
    "Rail fence cipher encrypt",
    (s, a) => railFenceEncrypt(s, Number(a[0])),
    { args: [arg("rails", "number", 3)] },
  ),
  tag(
    "Decrypt",
    "rail_fence_decrypt",
    "Rail fence cipher decrypt",
    (s, a) => railFenceDecrypt(s, Number(a[0])),
    { args: [arg("rails", "number", 3)] },
  ),
];
