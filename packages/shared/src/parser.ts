// Tolerant ("weak") parser for the Hackvertor tag grammar.
//
//   <@name>...</@name>      paired tag with inner text
//   <@name(args)>...</@name> paired tag with arguments
//   <@name/>  <@name@/>      self-closing (no-input) tag
//   <@name(args)/>           self-closing with arguments
//
// Numbered tags (<@base64_0>...</@base64_0>) let the same tag nest/repeat with a
// unique name; the `_N` suffix is stripped at resolution time (see engine).
//
// Unknown or mismatched tags are left as literal text (never throw) so that
// arbitrary request data containing "<@" survives unharmed.

import type { ArgValue } from "./types";

export interface TextNode {
  type: "text";
  value: string;
}

export interface TagNode {
  type: "tag";
  name: string;
  args: ArgValue[];
  selfClosing: boolean;
  /** Set true once a matching close tag is found; unclosed tags render literally. */
  closed: boolean;
  /** Raw open marker, used to render literally when the tag is unclosed/unknown. */
  rawOpen: string;
  children: Node[];
}

export type Node = TextNode | TagNode;

const NAME_RE = /[A-Za-z0-9_]+/y;

interface ParsedHeader {
  name: string;
  args: ArgValue[];
  selfClosing: boolean;
  end: number; // index just past the '>'
  raw: string;
}

/** Parse arguments inside the parentheses of a tag header. */
function parseArgs(raw: string): ArgValue[] {
  const args: ArgValue[] = [];
  let i = 0;
  const n = raw.length;
  const skipWs = () => {
    while (i < n && /\s/.test(raw[i]!)) i++;
  };
  while (i < n) {
    skipWs();
    if (i >= n) break;
    const ch = raw[i]!;
    if (ch === "'" || ch === '"') {
      // quoted string with backslash escapes
      const quote = ch;
      i++;
      let s = "";
      while (i < n) {
        const c = raw[i]!;
        if (c === "\\" && i + 1 < n) {
          const next = raw[i + 1]!;
          const map: Record<string, string> = {
            n: "\n",
            r: "\r",
            t: "\t",
            "0": "\0",
          };
          s += map[next] ?? next;
          i += 2;
          continue;
        }
        if (c === quote) {
          i++;
          break;
        }
        s += c;
        i++;
      }
      args.push(s);
    } else {
      // unquoted token up to next comma
      let tok = "";
      while (i < n && raw[i] !== ",") {
        tok += raw[i];
        i++;
      }
      tok = tok.trim();
      if (tok === "true") args.push(true);
      else if (tok === "false") args.push(false);
      else if (/^0x[0-9a-fA-F]+$/.test(tok)) args.push(parseInt(tok, 16));
      else if (/^-?\d+(\.\d+)?$/.test(tok)) args.push(Number(tok));
      else args.push(tok);
    }
    skipWs();
    if (i < n && raw[i] === ",") i++;
  }
  return args;
}

/** Find the index of the closing ')' matching the '(' at `open`, respecting quotes. */
function matchParen(s: string, open: number): number {
  let depth = 0;
  let i = open;
  const n = s.length;
  while (i < n) {
    const c = s[i]!;
    if (c === "'" || c === '"') {
      const quote = c;
      i++;
      while (i < n) {
        if (s[i] === "\\") {
          i += 2;
          continue;
        }
        if (s[i] === quote) break;
        i++;
      }
    } else if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/** Try to parse an opening/self-closing tag header at `pos` (which points at '<@'). */
function parseHeader(s: string, pos: number): ParsedHeader | null {
  let i = pos + 2; // skip '<@'
  NAME_RE.lastIndex = i;
  const m = NAME_RE.exec(s);
  if (!m || m.index !== i) return null;
  const name = m[0];
  i += name.length;
  let args: ArgValue[] = [];
  // optional arguments
  while (i < s.length && /\s/.test(s[i]!)) i++;
  if (s[i] === "(") {
    const close = matchParen(s, i);
    if (close === -1) return null;
    args = parseArgs(s.slice(i + 1, close));
    i = close + 1;
  }
  while (i < s.length && /\s/.test(s[i]!)) i++;
  // closing of the header: '>' (open) | '/>' or '@/>' (self-closing)
  let selfClosing = false;
  if (s[i] === "@" && s[i + 1] === "/" && s[i + 2] === ">") {
    selfClosing = true;
    i += 3;
  } else if (s[i] === "/" && s[i + 1] === ">") {
    selfClosing = true;
    i += 2;
  } else if (s[i] === ">") {
    i += 1;
  } else {
    return null;
  }
  return { name, args, selfClosing, end: i, raw: s.slice(pos, i) };
}

/** Try to parse a closing tag </@name> at `pos`. Returns the name and end index. */
function parseClose(
  s: string,
  pos: number,
): { name: string; end: number } | null {
  let i = pos + 3; // skip '</@'
  NAME_RE.lastIndex = i;
  const m = NAME_RE.exec(s);
  if (!m || m.index !== i) return null;
  const name = m[0];
  i += name.length;
  while (i < s.length && /\s/.test(s[i]!)) i++;
  if (s[i] !== ">") return null;
  return { name, end: i + 1 };
}

type Token =
  | { kind: "text"; value: string }
  | { kind: "open"; header: ParsedHeader }
  | { kind: "self"; header: ParsedHeader }
  | { kind: "close"; name: string; raw: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let textStart = 0;
  const n = input.length;
  const flushText = (upto: number) => {
    if (upto > textStart) {
      tokens.push({ kind: "text", value: input.slice(textStart, upto) });
    }
  };
  while (i < n) {
    if (input[i] === "<" && input[i + 1] === "/" && input[i + 2] === "@") {
      const close = parseClose(input, i);
      if (close) {
        flushText(i);
        tokens.push({
          kind: "close",
          name: close.name,
          raw: input.slice(i, close.end),
        });
        i = close.end;
        textStart = i;
        continue;
      }
    } else if (input[i] === "<" && input[i + 1] === "@") {
      const header = parseHeader(input, i);
      if (header) {
        flushText(i);
        tokens.push({
          kind: header.selfClosing ? "self" : "open",
          header,
        });
        i = header.end;
        textStart = i;
        continue;
      }
    }
    i++;
  }
  flushText(n);
  return tokens;
}

/** Build a tolerant tree from the token stream. */
export function parse(input: string): Node[] {
  const tokens = tokenize(input);
  const root: TagNode = {
    type: "tag",
    name: "",
    args: [],
    selfClosing: false,
    closed: true,
    rawOpen: "",
    children: [],
  };
  const stack: TagNode[] = [root];
  const top = () => stack[stack.length - 1]!;

  for (const tok of tokens) {
    if (tok.kind === "text") {
      top().children.push({ type: "text", value: tok.value });
    } else if (tok.kind === "self") {
      top().children.push({
        type: "tag",
        name: tok.header.name,
        args: tok.header.args,
        selfClosing: true,
        closed: true,
        rawOpen: tok.header.raw,
        children: [],
      });
    } else if (tok.kind === "open") {
      const node: TagNode = {
        type: "tag",
        name: tok.header.name,
        args: tok.header.args,
        selfClosing: false,
        closed: false,
        rawOpen: tok.header.raw,
        children: [],
      };
      top().children.push(node);
      stack.push(node);
    } else {
      // close: find a matching open up the stack (numbered-aware)
      let idx = -1;
      for (let j = stack.length - 1; j >= 1; j--) {
        if (nameMatches(stack[j]!.name, tok.name)) {
          idx = j;
          break;
        }
      }
      if (idx === -1) {
        // unmatched close -> literal text
        top().children.push({ type: "text", value: tok.raw });
      } else {
        stack[idx]!.closed = true;
        // anything above idx stays unclosed (rendered literally at eval)
        stack.length = idx;
      }
    }
  }
  return root.children;
}

/** A close name matches an open name exactly, or matches its numbered base. */
function nameMatches(openName: string, closeName: string): boolean {
  if (openName === closeName) return true;
  // <@base64_0>...</@base64> or </@base64_0> tolerance: compare bases
  return stripNumber(openName) === stripNumber(closeName);
}

export function stripNumber(name: string): string {
  const m = /^(.*)_\d+$/.exec(name);
  return m ? m[1]! : name;
}
