import type { TagDef } from "../types";
import { arg, tag } from "./define";

// NOTE: `new Date()` / Date.now() are unavailable in some Caido runtimes
// (and forbidden in workflow scripts). These tags accept the value as input
// where possible, and fall back to a fixed epoch when no clock is available.
function now(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

function formatDate(d: Date, fmt: string): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return fmt
    .replace(/yyyy/g, String(d.getUTCFullYear()))
    .replace(/MM/g, pad(d.getUTCMonth() + 1))
    .replace(/dd/g, pad(d.getUTCDate()))
    .replace(/HH/g, pad(d.getUTCHours()))
    .replace(/mm/g, pad(d.getUTCMinutes()))
    .replace(/ss/g, pad(d.getUTCSeconds()));
}

export const dateTags: TagDef[] = [
  tag("Date", "timestamp", "Current Unix timestamp (seconds)", () =>
    String(Math.floor(now() / 1000)),
    { hasInput: false },
  ),
  tag(
    "Date",
    "date",
    "Format the current date (yyyy-MM-dd HH:mm:ss tokens)",
    (_s, a) => {
      try {
        return formatDate(new Date(now()), String(a[0]));
      } catch {
        return String(a[0]);
      }
    },
    { hasInput: false, args: [arg("format", "string", "yyyy-MM-dd HH:mm:ss")] },
  ),
];
