import { utf8ToBytes } from "../codec";
import type { TagDef } from "../types";
import { arg, tag } from "./define";

function rotN(s: string, n: number): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + n) % 26) + base);
  });
}

function xor(s: string, key: string): string {
  if (!key) return s;
  const kb = utf8ToBytes(key);
  const sb = utf8ToBytes(s);
  let out = "";
  for (let i = 0; i < sb.length; i++)
    out += String.fromCharCode(sb[i]! ^ kb[i % kb.length]!);
  return out;
}

function affine(s: string, a: number, b: number, decrypt: boolean): string {
  const modInverse = (x: number, m: number) => {
    x = ((x % m) + m) % m;
    for (let i = 1; i < m; i++) if ((x * i) % m === 1) return i;
    return 1;
  };
  const aInv = modInverse(a, 26);
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    const x = c.charCodeAt(0) - base;
    const y = decrypt
      ? (aInv * (x - b + 26 * 100)) % 26
      : (a * x + b) % 26;
    return String.fromCharCode(((y % 26) + 26) % 26 + base);
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
  const len = s.length;
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
    out += s[offsets[row]! + idx[row]!];
    idx[row]++;
  }
  return out;
}

export const cipherTags: TagDef[] = [
  tag("Encrypt", "rotN", "Caesar/ROT-N cipher", (s, a) => rotN(s, Number(a[0])), {
    args: [arg("n", "number", 13)],
  }),
  tag("Encrypt", "xor", "XOR with a repeating key", (s, a) => xor(s, String(a[0])), {
    args: [arg("key", "string", "")],
  }),
  tag("Decrypt", "xor_decrypt", "XOR with a repeating key", (s, a) =>
    xor(s, String(a[0])),
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
