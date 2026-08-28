import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from "../codec";
import type { TagDef } from "../types";
import { arg, tag } from "./define";

// Number-base conversions. Many operate per-number using a split regex.
function mapNumbers(
  s: string,
  re: string,
  fn: (n: string) => string,
): string {
  const pattern = new RegExp(re, "g");
  return s.replace(pattern, (m) => fn(m));
}

export const convertTags: TagDef[] = [
  tag(
    "Convert",
    "dec2hex",
    "Decimal numbers to hex",
    (s, a) => mapNumbers(s, String(a[0]), (n) => parseInt(n, 10).toString(16)),
    { args: [arg("regex", "string", "\\d+")] },
  ),
  tag(
    "Convert",
    "dec2oct",
    "Decimal numbers to octal",
    (s, a) => mapNumbers(s, String(a[0]), (n) => parseInt(n, 10).toString(8)),
    { args: [arg("regex", "string", "\\d+")] },
  ),
  tag(
    "Convert",
    "dec2bin",
    "Decimal numbers to binary",
    (s, a) => mapNumbers(s, String(a[0]), (n) => parseInt(n, 10).toString(2)),
    { args: [arg("regex", "string", "\\d+")] },
  ),
  tag(
    "Convert",
    "hex2dec",
    "Hex numbers to decimal",
    (s, a) => mapNumbers(s, String(a[0]), (n) => parseInt(n, 16).toString(10)),
    { args: [arg("regex", "string", "[0-9a-fA-F]+")] },
  ),
  tag(
    "Convert",
    "oct2dec",
    "Octal numbers to decimal",
    (s, a) => mapNumbers(s, String(a[0]), (n) => parseInt(n, 8).toString(10)),
    { args: [arg("regex", "string", "[0-7]+")] },
  ),
  tag(
    "Convert",
    "bin2dec",
    "Binary numbers to decimal",
    (s, a) => mapNumbers(s, String(a[0]), (n) => parseInt(n, 2).toString(10)),
    { args: [arg("regex", "string", "[01]+")] },
  ),
  tag("Convert", "ascii2bin", "ASCII to binary (8-bit, space-separated)", (s) =>
    Array.from(utf8ToBytes(s))
      .map((b) => b.toString(2).padStart(8, "0"))
      .join(" "),
  ),
  tag("Convert", "bin2ascii", "Binary (space-separated) to ASCII", (s) => {
    const t = s.trim();
    if (!t) return "";
    return t
      .split(/\s+/)
      .map((b) => {
        const n = parseInt(b, 2);
        return isNaN(n) ? "" : String.fromCharCode(n);
      })
      .join("");
  }),
  tag(
    "Convert",
    "ascii2hex",
    "ASCII to hex with separator",
    (s, a) => bytesToHex(utf8ToBytes(s), String(a[0] ?? "")),
    { args: [arg("separator", "string", " ")] },
  ),
  tag("Convert", "hex2ascii", "Hex to ASCII", (s) => bytesToUtf8(hexToBytes(s))),
  tag(
    "Convert",
    "ascii2reverse_hex",
    "ASCII to reversed hex",
    (s, a) => bytesToHex(utf8ToBytes(s).reverse(), String(a[0] ?? "")),
    { args: [arg("separator", "string", " ")] },
  ),
];
