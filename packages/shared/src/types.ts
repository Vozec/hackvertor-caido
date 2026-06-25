// Core types shared between the parser, the tag registry, and the runtimes.

export type ArgType = "string" | "number" | "boolean";
export type ArgValue = string | number | boolean;

export interface TagArgDef {
  name: string;
  type: ArgType;
  default: ArgValue;
}

export type TagCategory =
  | "Custom"
  | "Globals"
  | "Variables"
  | "Encode"
  | "Decode"
  | "String"
  | "Convert"
  | "Conditions"
  | "Math"
  | "Hash"
  | "HMAC"
  | "Fake"
  | "Charsets"
  | "Compression"
  | "Date"
  | "Encrypt"
  | "Decrypt"
  | "Languages"
  | "System"
  | "XSS";

/**
 * A tag handler turns its inner text (`input`) plus parsed arguments into output.
 * Handlers may be async so that code-exec / crypto / network tags fit the same shape.
 */
export type TagHandler = (
  input: string,
  args: ArgValue[],
  ctx: EvalContext,
) => string | Promise<string>;

export interface TagDef {
  /** Unique tag name, e.g. "base64", "d_base64", "hmac_sha256". */
  name: string;
  category: TagCategory;
  /** Whether the tag consumes inner text. No-input tags are usually self-closing. */
  hasInput: boolean;
  tooltip: string;
  args: TagArgDef[];
  handler: TagHandler;
}

export type TagRegistry = Map<string, TagDef>;

/** Evaluation context threaded through a single conversion run. */
export interface EvalContext {
  /** Per-conversion (local) variables. */
  vars: Map<string, string>;
  /** Cross-conversion globals (persisted by the host). */
  globals: Map<string, string>;
  /** The registry in use (lets tags resolve siblings, e.g. auto_decode). */
  registry: TagRegistry;
  /** Live request context for context_* tags (raw HTTP request), if any. */
  request?: RequestContext;
  /**
   * Secret key that must match for code-execution tags to run. Mirrors
   * Hackvertor's per-session `tagCodeExecutionKey`. Empty = code-exec disabled.
   */
  codeExecuteKey?: string;
  /** Recursion depth guard. */
  depth: number;
}

export interface RequestContext {
  raw: string;
  method?: string;
  url?: string;
  host?: string;
  path?: string;
  query?: string;
  port?: number;
  protocol?: string;
  headers?: Record<string, string>;
}

export type Result<T> =
  | { kind: "Ok"; value: T }
  | { kind: "Error"; error: string };

export const Ok = <T>(value: T): Result<T> => ({ kind: "Ok", value });
export const Err = <T>(error: string): Result<T> => ({ kind: "Error", error });
