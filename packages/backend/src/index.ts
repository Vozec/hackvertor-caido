import type { DefineAPI, DefineEvents, SDK } from "caido:plugin";
import {
  convert as convertEngine,
  applyTag as applyTagEngine,
  hasTags,
  listTags as listTagsShared,
  DEFAULT_REGISTRY,
  bytesToLatin1,
  latin1ToBytes,
  type ArgValue,
  type Result,
  Ok,
  Err,
} from "shared";

import { buildBackendRegistry } from "./crypto";

// Registry augmented with crypto/compression tags that need the backend runtime.
const REGISTRY = buildBackendRegistry();

export type BackendEvents = DefineEvents<{
  "hackvertor:auto-converted": (data: { host: string; count: number }) => void;
}>;

/** Convert a full tagged string (all built-in tags, incl. backend crypto). */
async function convert(_sdk: SDK, input: string): Promise<Result<string>> {
  try {
    const out = await convertEngine(input, { registry: REGISTRY });
    return Ok(out);
  } catch (e) {
    return Err(e instanceof Error ? e.message : String(e));
  }
}

/** Apply a single tag by name with optional arguments. */
async function applyTag(
  _sdk: SDK,
  name: string,
  input: string,
  args: ArgValue[],
): Promise<Result<string>> {
  try {
    const out = await applyTagEngine(REGISTRY, name, input, args ?? []);
    return Ok(out);
  } catch (e) {
    return Err(e instanceof Error ? e.message : String(e));
  }
}

/** List all available tags (for the frontend palette). */
function listTags(_sdk: SDK) {
  return listTagsShared(REGISTRY);
}

// In-memory flag toggled by the frontend; gates auto-conversion on send.
let autoConvertEnabled = true;

function setAutoConvert(_sdk: SDK, enabled: boolean): boolean {
  autoConvertEnabled = enabled;
  return autoConvertEnabled;
}

function getAutoConvert(_sdk: SDK): boolean {
  return autoConvertEnabled;
}

/**
 * Recompute the `Content-Length` header after the body was rewritten. Operates
 * on the latin1-domain raw request (1 char = 1 byte). Only touches an existing
 * header and never a chunked request. Returns the raw unchanged when it has no
 * header/body split.
 */
function updateContentLength(raw: string): string {
  const sepLen = 4;
  let sep = raw.indexOf("\r\n\r\n");
  let nlSep = "\r\n";
  if (sep === -1) {
    sep = raw.indexOf("\n\n");
    if (sep === -1) return raw; // no body
    nlSep = "\n";
  }
  const headEnd = sep + (nlSep === "\r\n" ? sepLen : 2);
  const head = raw.slice(0, sep);
  const body = raw.slice(headEnd);
  if (/^transfer-encoding:\s*chunked/im.test(head)) return raw;
  const clRe = /^(content-length:)([ \t]*)(\d+)/im;
  if (!clRe.test(head)) return raw; // no CL header to update
  const newHead = head.replace(clRe, (_m, k, ws) => `${k}${ws || " "}${body.length}`);
  return newHead + nlSep + nlSep + body;
}

export type API = DefineAPI<{
  convert: typeof convert;
  applyTag: typeof applyTag;
  listTags: typeof listTags;
  setAutoConvert: typeof setAutoConvert;
  getAutoConvert: typeof getAutoConvert;
}>;

export function init(sdk: SDK<API, BackendEvents>) {
  sdk.api.register("convert", convert);
  sdk.api.register("applyTag", applyTag);
  sdk.api.register("listTags", listTags);
  sdk.api.register("setAutoConvert", setAutoConvert);
  sdk.api.register("getAutoConvert", getAutoConvert);

  // Auto-convert <@tag> in outgoing requests. Fires only for domains where the
  // user enabled "Upstream Plugins". Runs synchronously before send.
  sdk.events.onUpstream(async (sdk, request) => {
    if (!autoConvertEnabled) return undefined;
    let raw: string;
    try {
      raw = bytesToLatin1(request.getRaw());
    } catch {
      return undefined;
    }
    if (!hasTags(raw)) return undefined;
    try {
      const converted = await convertEngine(raw, {
        registry: REGISTRY,
        request: { raw },
      });
      if (converted !== raw) {
        const withCl = updateContentLength(converted);
        request.setRaw(latin1ToBytes(withCl));
        sdk.console.log("[hackvertor] auto-converted tags in outgoing request");
        // Caido honors the returned RequestSpec, NOT in-place mutation — the
        // modified request must be returned to actually go on the wire.
        return { request: request.toSpec() };
      }
    } catch (e) {
      sdk.console.log("[hackvertor] auto-convert error: " + String(e));
    }
    // No tags converted (or an error) -> leave the request untouched.
    return undefined;
  });

  sdk.console.log("[hackvertor] backend ready");
}
