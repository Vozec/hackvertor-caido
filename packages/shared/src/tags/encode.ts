import {
  bytesToBase32,
  bytesToBase58,
  bytesToBase64,
  bytesToBase64Url,
  bytesToHex,
  utf8ToBytes,
} from "../codec";
import type { TagDef } from "../types";
import { arg, tag } from "./define";

const enc = (s: string) => utf8ToBytes(s);

/* Named HTML entity table (common subset) for html_entities. */
const NAMED: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
  " ": "&nbsp;",
};

function htmlEntities(s: string): string {
  let out = "";
  for (const ch of s) out += NAMED[ch] ?? ch;
  return out;
}

function html5Entities(s: string): string {
  // numeric entity for every non-alphanumeric char
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    out += /[a-zA-Z0-9]/.test(ch) ? ch : `&#${c};`;
  }
  return out;
}

function urlencode(s: string, all = false, plusSpace = false): string {
  const bytes = enc(s);
  let out = "";
  for (const b of bytes) {
    const ch = String.fromCharCode(b);
    if (!all && /[A-Za-z0-9\-_.~]/.test(ch)) out += ch;
    else if (plusSpace && b === 0x20) out += "+";
    else out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

function phpNonAlpha(s: string): string {
  // simplistic: each char as octal-escaped within a string concat is overkill;
  // emit a chr() based representation
  return Array.from(enc(s))
    .map((b) => `chr(${b})`)
    .join(".");
}

function quotedPrintable(s: string): string {
  const bytes = enc(s);
  let out = "";
  for (const b of bytes) {
    if (b === 0x20 || b === 0x09) out += String.fromCharCode(b);
    else if (b >= 33 && b <= 126 && b !== 61)
      out += String.fromCharCode(b);
    else out += "=" + b.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

function jsString(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c < 0x20 || c > 0x7e || ch === "\\" || ch === '"' || ch === "'")
      out += "\\u" + c.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out;
}

export const encodeTags: TagDef[] = [
  tag("Encode", "base64", "Base64 encode", (s) => bytesToBase64(enc(s))),
  tag("Encode", "base64url", "URL-safe Base64 encode", (s) =>
    bytesToBase64Url(enc(s)),
  ),
  tag("Encode", "base32", "Base32 encode", (s) => bytesToBase32(enc(s))),
  tag("Encode", "base58", "Base58 (bitcoin) encode", (s) =>
    bytesToBase58(enc(s)),
  ),
  tag(
    "Encode",
    "hex",
    "Hex encode with optional separator",
    (s, a) => bytesToHex(enc(s), String(a[0] ?? "")),
    { args: [arg("separator", "string", "")] },
  ),
  tag("Encode", "sql_hex", "SQL hex literal (0x...)", (s) =>
    "0x" + bytesToHex(enc(s)),
  ),
  tag("Encode", "ascii2hex", "ASCII to hex", (s, a) =>
    bytesToHex(enc(s), String(a[0] ?? "")),
    { args: [arg("separator", "string", "")] },
  ),
  tag("Encode", "html_entities", "Named HTML entities", (s) => htmlEntities(s)),
  tag("Encode", "html5_entities", "Numeric HTML5 entities", (s) =>
    html5Entities(s),
  ),
  tag("Encode", "hex_entities", "Hex HTML entities", (s) =>
    Array.from(s)
      .map((ch) => `&#x${ch.codePointAt(0)!.toString(16)};`)
      .join(""),
  ),
  tag("Encode", "dec_entities", "Decimal HTML entities", (s) =>
    Array.from(s)
      .map((ch) => `&#${ch.codePointAt(0)};`)
      .join(""),
  ),
  tag("Encode", "hex_escapes", "\\xNN escapes", (s) =>
    Array.from(enc(s))
      .map((b) => "\\x" + b.toString(16).padStart(2, "0"))
      .join(""),
  ),
  tag("Encode", "octal_escapes", "\\NNN octal escapes", (s) =>
    Array.from(enc(s))
      .map((b) => "\\" + b.toString(8))
      .join(""),
  ),
  tag("Encode", "unicode_escapes", "\\uNNNN escapes", (s) =>
    Array.from(s)
      .map((ch) => "\\u" + ch.codePointAt(0)!.toString(16).padStart(4, "0"))
      .join(""),
  ),
  tag("Encode", "css_escapes", "CSS \\NN escapes", (s) =>
    Array.from(s)
      .map((ch) => "\\" + ch.codePointAt(0)!.toString(16))
      .join(""),
  ),
  tag("Encode", "css_escapes6", "CSS 6-digit \\NNNNNN escapes", (s) =>
    Array.from(s)
      .map((ch) => "\\" + ch.codePointAt(0)!.toString(16).padStart(6, "0") + " ")
      .join(""),
  ),
  tag("Encode", "urlencode", "URL-encode (reserved chars)", (s) =>
    urlencode(s, false, false),
  ),
  tag("Encode", "urlencode_all", "URL-encode every byte", (s) =>
    urlencode(s, true, false),
  ),
  tag("Encode", "urlencode_not_plus", "URL-encode, space as %20", (s) =>
    urlencode(s, false, false),
  ),
  tag("Encode", "burp_urlencode", "URL-encode unsafe chars (Burp-style)", (s) =>
    urlencode(s, false, false),
  ),
  tag("Encode", "php_chr", "PHP chr() concatenation", (s) => phpNonAlpha(s)),
  tag("Encode", "php_non_alpha", "PHP non-alphanumeric (chr based)", (s) =>
    phpNonAlpha(s),
  ),
  tag("Encode", "quoted_printable", "Quoted-printable encode", (s) =>
    quotedPrintable(s),
  ),
  tag("Encode", "js_string", "JavaScript string escaping", (s) => jsString(s)),
  tag("Encode", "powershell", "PowerShell -EncodedCommand (UTF-16LE base64)", (s) => {
    // UTF-16LE then base64
    const bytes: number[] = [];
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      bytes.push(c & 0xff, (c >> 8) & 0xff);
    }
    return bytesToBase64(Uint8Array.from(bytes));
  }),
];
