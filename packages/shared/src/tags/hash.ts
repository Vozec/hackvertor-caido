import { bytesToHex, utf8ToBytes } from "../codec";
import { hmac, md5, sha1, sha256, HASH_FNS } from "../hash";
import type { TagDef } from "../types";
import { arg, tag } from "./define";

const enc = (s: string) => utf8ToBytes(s);

export const hashTags: TagDef[] = [
  tag("Hash", "md5", "MD5 hash (hex)", (s) => bytesToHex(md5(enc(s)))),
  tag("Hash", "sha1", "SHA-1 hash (hex)", (s) => bytesToHex(sha1(enc(s)))),
  tag("Hash", "sha256", "SHA-256 hash (hex)", (s) => bytesToHex(sha256(enc(s)))),
];

function hmacTag(name: string, algo: keyof typeof HASH_FNS): TagDef {
  return tag(
    "HMAC",
    name,
    `HMAC-${algo.toUpperCase()} (hex)`,
    (s, a) => {
      const spec = HASH_FNS[algo]!;
      return bytesToHex(hmac(spec.fn, spec.block, enc(String(a[0])), enc(s)));
    },
    { args: [arg("key", "string", "")] },
  );
}

export const hmacTags: TagDef[] = [
  hmacTag("hmac_md5", "md5"),
  hmacTag("hmac_sha1", "sha1"),
  hmacTag("hmac_sha256", "sha256"),
];
