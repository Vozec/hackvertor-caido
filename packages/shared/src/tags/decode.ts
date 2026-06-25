import {
  base32ToBytes,
  base58ToBytes,
  base64ToBytes,
  base64UrlToBytes,
  bytesToUtf8,
  hexToBytes,
} from "../codec";
import type { TagDef } from "../types";
import { tag } from "./define";

const dec = (b: Uint8Array) => bytesToUtf8(b);

const NAMED_REV: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body) => {
    if (body[0] === "#") {
      const hex = body[1] === "x" || body[1] === "X";
      const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return isNaN(code) ? m : String.fromCodePoint(code);
    }
    return NAMED_REV[body] ?? m;
  });
}

function urldecode(s: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "%" && /[0-9a-fA-F]{2}/.test(s.substr(i + 1, 2))) {
      bytes.push(parseInt(s.substr(i + 1, 2), 16));
      i += 2;
    } else if (ch === "+") bytes.push(0x20);
    else {
      // push utf8 of this char
      const c = ch.charCodeAt(0);
      bytes.push(c & 0xff);
    }
  }
  return bytesToUtf8(Uint8Array.from(bytes));
}

function decodeJsString(s: string): string {
  return s
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\([nrt0\\'"])/g, (_, c) => {
      const map: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        "0": "\0",
        "\\": "\\",
        "'": "'",
        '"': '"',
      };
      return map[c] ?? c;
    });
}

function decodeOctalEscapes(s: string): string {
  return s.replace(/\\([0-7]{1,3})/g, (_, o) =>
    String.fromCharCode(parseInt(o, 8)),
  );
}

function decodeCssEscapes(s: string): string {
  return s.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, h) =>
    String.fromCodePoint(parseInt(h, 16)),
  );
}

function decodeUnicodeEscapes(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16)),
  );
}

function decodeQuotedPrintable(s: string): string {
  const cleaned = s.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]!;
    if (ch === "=" && /[0-9a-fA-F]{2}/.test(cleaned.substr(i + 1, 2))) {
      bytes.push(parseInt(cleaned.substr(i + 1, 2), 16));
      i += 2;
    } else bytes.push(ch.charCodeAt(0));
  }
  return bytesToUtf8(Uint8Array.from(bytes));
}

export const decodeTags: TagDef[] = [
  tag("Decode", "d_base64", "Base64 decode", (s) => dec(base64ToBytes(s))),
  tag("Decode", "d_base64url", "URL-safe Base64 decode", (s) =>
    dec(base64UrlToBytes(s)),
  ),
  tag("Decode", "d_base32", "Base32 decode", (s) => dec(base32ToBytes(s))),
  tag("Decode", "d_base58", "Base58 decode", (s) => dec(base58ToBytes(s))),
  tag("Decode", "d_url", "URL decode", (s) => urldecode(s)),
  tag("Decode", "d_burp_url", "URL decode (Burp-style)", (s) => urldecode(s)),
  tag("Decode", "hex2ascii", "Hex to ASCII", (s) => dec(hexToBytes(s))),
  tag("Decode", "d_html_entities", "Decode HTML entities", (s) =>
    decodeHtmlEntities(s),
  ),
  tag("Decode", "d_html5_entities", "Decode HTML5 entities", (s) =>
    decodeHtmlEntities(s),
  ),
  tag("Decode", "d_js_string", "Decode JS string escapes", (s) =>
    decodeJsString(s),
  ),
  tag("Decode", "d_octal_escapes", "Decode octal escapes", (s) =>
    decodeOctalEscapes(s),
  ),
  tag("Decode", "d_css_escapes", "Decode CSS escapes", (s) =>
    decodeCssEscapes(s),
  ),
  tag("Decode", "d_unicode_escapes", "Decode \\uNNNN escapes", (s) =>
    decodeUnicodeEscapes(s),
  ),
  tag("Decode", "d_quoted_printable", "Decode quoted-printable", (s) =>
    decodeQuotedPrintable(s),
  ),
];
