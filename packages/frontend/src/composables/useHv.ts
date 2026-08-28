import { useSDK, type FrontendSDK } from "@/plugins/sdk";
import { autoConvert, busy, pageInput, pageOutput, tags } from "./state";
import type { TagSummary } from "shared";

export type { TagSummary };

let sdk: FrontendSDK | null = null;
let initialised = false;

export function buildTag(t: TagSummary): string {
  const argStr =
    t.args.length > 0
      ? "(" +
        t.args
          .map((a) =>
            a.type === "string" ? JSON.stringify(a.default) : String(a.default),
          )
          .join(",") +
        ")"
      : "";
  return t.hasInput
    ? `<@${t.name}${argStr}></@${t.name}>`
    : `<@${t.name}${argStr}/>`;
}

export function useHv() {
  if (!sdk) sdk = useSDK();
  const s = sdk;

  async function ensureInit() {
    if (initialised) return;
    try {
      tags.value = (await s.backend.listTags()) as TagSummary[];
      // reflect the backend's real auto-convert state (avoids UI/backend drift)
      try {
        autoConvert.value = await s.backend.getAutoConvert();
      } catch {
        /* older backend without getAutoConvert — keep default */
      }
      initialised = true; // only mark done on success, so a failure can retry
    } catch (e) {
      s.window.showToast("Failed to load tags: " + String(e), {
        variant: "error",
      });
    }
  }

  // Monotonic token: only the newest convert() may write pageOutput, so
  // out-of-order RPC responses never clobber fresh output.
  let convertSeq = 0;
  async function convert() {
    const seq = ++convertSeq;
    busy.value = true;
    try {
      const res = await s.backend.convert(pageInput.value);
      if (seq !== convertSeq) return; // a newer request superseded this one
      pageOutput.value = res.kind === "Ok" ? res.value : `[error] ${res.error}`;
    } catch (e) {
      if (seq === convertSeq) pageOutput.value = `[error] ${String(e)}`;
    } finally {
      if (seq === convertSeq) busy.value = false;
    }
  }

  /** Insert a tag, wrapping the current input (so it converts what's there). */
  function insertTag(t: TagSummary) {
    if (t.hasInput) {
      const argStr =
        t.args.length > 0
          ? "(" +
            t.args
              .map((a) =>
                a.type === "string"
                  ? JSON.stringify(a.default)
                  : String(a.default),
              )
              .join(",") +
            ")"
          : "";
      pageInput.value = `<@${t.name}${argStr}>${pageInput.value}</@${t.name}>`;
    } else {
      pageInput.value += buildTag(t);
    }
    void convert();
  }

  async function toggleAuto(value: boolean) {
    const prev = autoConvert.value;
    autoConvert.value = value;
    try {
      await s.backend.setAutoConvert(value);
    } catch (e) {
      // revert so the UI never claims a state the backend didn't accept
      autoConvert.value = prev;
      s.window.showToast("Failed to change auto-convert: " + String(e), {
        variant: "error",
      });
    }
  }

  function setInput(value: string) {
    pageInput.value = value;
    void convert();
  }

  return {
    input: pageInput,
    output: pageOutput,
    tags,
    autoConvert,
    busy,
    ensureInit,
    convert,
    insertTag,
    toggleAuto,
    setInput,
    buildTag,
  };
}
