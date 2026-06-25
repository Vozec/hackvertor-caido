// Backend-only tags that rely on the Caido/Node `crypto` module (hashes and
// HMACs not implemented in the pure shared engine). These extend the registry
// used by the backend RPC + onUpstream; workflow nodes keep the pure registry.

import { createHash, createHmac } from "crypto";
import {
  buildRegistry,
  utf8ToBytes,
  type ArgValue,
  type EvalContext,
  type TagDef,
  type TagRegistry,
} from "shared";

function hashTag(name: string, algo: string): TagDef {
  return {
    name,
    category: "Hash",
    hasInput: true,
    tooltip: `${algo.toUpperCase()} hash (hex)`,
    args: [],
    handler: (input: string) => {
      const h = createHash(algo);
      h.update(Buffer.from(utf8ToBytes(input)));
      return h.digest("hex");
    },
  };
}

function hmacTag(name: string, algo: string): TagDef {
  return {
    name,
    category: "HMAC",
    hasInput: true,
    tooltip: `HMAC-${algo.toUpperCase()} (hex)`,
    args: [{ name: "key", type: "string", default: "" }],
    handler: (input: string, args: ArgValue[], _ctx: EvalContext) => {
      const h = createHmac(algo, Buffer.from(utf8ToBytes(String(args[0] ?? ""))));
      h.update(Buffer.from(utf8ToBytes(input)));
      return h.digest("hex");
    },
  };
}

// Algorithm ids accepted by Node/Caido crypto. Guarded individually so an
// unsupported one doesn't break the whole registry.
const HASH_ALGOS: [string, string][] = [
  ["sha224", "sha224"],
  ["sha384", "sha384"],
  ["sha512", "sha512"],
  ["sha3_256", "sha3-256"],
  ["sha3_384", "sha3-384"],
  ["sha3_512", "sha3-512"],
  ["ripemd160", "ripemd160"],
  ["whirlpool", "whirlpool"],
];

const HMAC_ALGOS: [string, string][] = [
  ["hmac_sha224", "sha224"],
  ["hmac_sha384", "sha384"],
  ["hmac_sha512", "sha512"],
];

export function buildBackendRegistry(): TagRegistry {
  const extra: TagDef[] = [];
  for (const [name, algo] of HASH_ALGOS) {
    try {
      const t = hashTag(name, algo);
      // smoke test that the algo exists in this runtime
      createHash(algo);
      extra.push(t);
    } catch {
      /* algorithm unsupported in this runtime — skip */
    }
  }
  for (const [name, algo] of HMAC_ALGOS) {
    try {
      createHmac(algo, Buffer.from([0]));
      extra.push(hmacTag(name, algo));
    } catch {
      /* skip */
    }
  }
  return buildRegistry(extra);
}
