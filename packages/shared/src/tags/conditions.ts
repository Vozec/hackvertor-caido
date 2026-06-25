import type { TagDef } from "../types";
import { arg, tag } from "./define";

export const conditionTags: TagDef[] = [
  tag(
    "Conditions",
    "if_regex",
    "Output a value if input matches a regex",
    (s, a) => (new RegExp(String(a[0])).test(s) ? String(a[1]) : s),
    { args: [arg("regex", "string", ""), arg("value", "string", "")] },
  ),
  tag(
    "Conditions",
    "if_not_regex",
    "Output a value if input does NOT match a regex",
    (s, a) => (!new RegExp(String(a[0])).test(s) ? String(a[1]) : s),
    { args: [arg("regex", "string", ""), arg("value", "string", "")] },
  ),
];
