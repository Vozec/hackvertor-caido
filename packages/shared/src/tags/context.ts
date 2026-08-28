import type { RequestContext, TagDef } from "../types";
import { arg, tag } from "./define";

/** Escape regex metacharacters so a header/param name is matched literally. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function header(ctx: RequestContext | undefined, name: string): string {
  if (!ctx) return "";
  if (ctx.headers) {
    const key = Object.keys(ctx.headers).find(
      (k) => k.toLowerCase() === name.toLowerCase(),
    );
    if (key) return ctx.headers[key]!;
  }
  // fall back to scanning the raw request
  if (ctx.raw) {
    const re = new RegExp(`^${escapeRegExp(name)}:\\s*(.*)$`, "im");
    const m = re.exec(ctx.raw);
    if (m) return m[1]!.trim();
  }
  return "";
}

function param(ctx: RequestContext | undefined, name: string): string {
  if (!ctx?.raw) return "";
  const re = new RegExp(`[?&]${escapeRegExp(name)}=([^&\\s]*)`);
  const m = re.exec(ctx.raw);
  return m ? m[1]! : "";
}

// Context tags read the live request (provided when running in a request workflow
// or the backend onUpstream hook).
export const contextTags: TagDef[] = [
  tag("Variables", "context_request", "The full raw request", (_s, _a, ctx) =>
    ctx.request?.raw ?? "",
    { hasInput: false },
  ),
  tag(
    "Variables",
    "context_url",
    "Parts of the request URL",
    (_s, a, ctx) => {
      const r = ctx.request;
      if (!r) return "";
      // single-pass replacement so a substituted value containing "$path" etc.
      // is not itself re-substituted
      const map: Record<string, string> = {
        $protocol: r.protocol ?? "",
        $host: r.host ?? "",
        $path: r.path ?? "",
        $query: r.query ?? "",
        $port: r.port != null ? String(r.port) : "",
      };
      return String(a[0]).replace(
        /\$protocol|\$host|\$path|\$query|\$port/g,
        (t) => map[t] ?? t,
      );
    },
    {
      hasInput: false,
      args: [arg("properties", "string", "$protocol $host $path $query")],
    },
  ),
  tag(
    "Variables",
    "context_header",
    "A request header value",
    (_s, a, ctx) => header(ctx.request, String(a[0])),
    { hasInput: false, args: [arg("name", "string", "Host")] },
  ),
  tag(
    "Variables",
    "context_param",
    "A request parameter value",
    (_s, a, ctx) => param(ctx.request, String(a[0])),
    { hasInput: false, args: [arg("name", "string", "id")] },
  ),
];
