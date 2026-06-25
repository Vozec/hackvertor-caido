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
    initialised = true;
    try {
      tags.value = (await s.backend.listTags()) as TagSummary[];
    } catch (e) {
      s.window.showToast("Failed to load tags: " + String(e), {
        variant: "error",
      });
    }
  }

  async function convert() {
    busy.value = true;
    try {
      const res = await s.backend.convert(pageInput.value);
      pageOutput.value = res.kind === "Ok" ? res.value : `[error] ${res.error}`;
    } finally {
      busy.value = false;
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
    autoConvert.value = value;
    try {
      await s.backend.setAutoConvert(value);
    } catch {
      /* ignore */
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
