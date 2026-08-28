import { listTags, type TagSummary } from "shared";

import { defineApp } from "@/app";
import type { FrontendSDK } from "@/plugins/sdk";
import { pageInput, pageOutput } from "@/composables/state";

import "@/styles/index.css";

const PATH = "/hackvertor";

const CMD_CONVERT = "hackvertor.convert-selection";
const CMD_SEND = "hackvertor.send-to-tab";

// Common tags surfaced directly in the request/response right-click menu.
// (Caido's menu API is flat — no nested submenus — so the full set lives in the
// command palette and the Hackvertor page palette instead.)
const MENU_TAGS = [
  "base64",
  "d_base64",
  "base64url",
  "d_base64url",
  "urlencode",
  "d_url",
  "hex",
  "hex2ascii",
  "html_entities",
  "d_html_entities",
  "base32",
  "d_base32",
  "md5",
  "sha1",
  "sha256",
  "hmac_sha256",
  "uppercase",
  "lowercase",
  "reverse",
  "rotN",
  "xor",
];

function tagArgString(t: TagSummary): string {
  if (t.args.length === 0) return "";
  return (
    "(" +
    t.args
      .map((a) =>
        a.type === "string" ? JSON.stringify(a.default) : String(a.default),
      )
      .join(",") +
    ")"
  );
}

function wrap(t: TagSummary, selection: string): string {
  const argStr = tagArgString(t);
  return t.hasInput
    ? `<@${t.name}${argStr}>${selection}</@${t.name}>`
    : `<@${t.name}${argStr}/>`;
}

export const init = (sdk: FrontendSDK) => {
  const allTags = listTags();
  const byName = new Map(allTags.map((t) => [t.name, t]));

  // --- Page + sidebar (registered first so menus exist even if mount fails) ---
  const root = document.createElement("div");
  root.id = "plugin--hackvertor";
  Object.assign(root.style, { height: "100%", width: "100%" });

  sdk.navigation.addPage(PATH, { body: root });
  sdk.sidebar.registerItem("Hackvertor", PATH, {
    icon: "fas fa-wand-magic-sparkles",
  });

  // --- One "wrap selection in <@tag>" command per tag (full set) ---
  for (const t of allTags) {
    const id = `hackvertor.wrap.${t.name}`;
    sdk.commands.register(id, {
      name: `Hackvertor ${t.category}: ${t.name}`,
      group: "Hackvertor",
      run: () => {
        const editor = sdk.window.getActiveEditor();
        if (!editor) {
          sdk.window.showToast("Open a request/response editor first", {
            variant: "warning",
          });
          return;
        }
        const sel = editor.getSelectedText() ?? "";
        editor.replaceSelectedText(wrap(t, sel));
      },
    });
    // Make every tag fuzzy-searchable from the command palette.
    try {
      sdk.commandPalette.register(id);
    } catch {
      /* older runtimes may not expose commandPalette */
    }
  }

  // Surface the common tags directly in the right-click menu.
  for (const name of MENU_TAGS) {
    if (!byName.has(name)) continue;
    const commandId = `hackvertor.wrap.${name}`;
    for (const type of ["Request", "Response"] as const) {
      sdk.menu.registerItem({ type, commandId, leadingIcon: "fas fa-tag" });
    }
  }

  // --- Convert all tags in the current selection, in place ---
  sdk.commands.register(CMD_CONVERT, {
    name: "Hackvertor: Convert tags in selection",
    group: "Hackvertor",
    run: async () => {
      const editor = sdk.window.getActiveEditor();
      const selected = editor?.getSelectedText() ?? "";
      if (!selected) {
        sdk.window.showToast("Select text containing <@tags> first", {
          variant: "warning",
        });
        return;
      }
      const res = await sdk.backend.convert(selected);
      if (res.kind === "Ok") editor?.replaceSelectedText(res.value);
      else sdk.window.showToast("Convert failed: " + res.error, { variant: "error" });
    },
  });

  // --- Send selection to the Hackvertor page ---
  sdk.commands.register(CMD_SEND, {
    name: "Hackvertor: Send selection to Hackvertor",
    group: "Hackvertor",
    run: async (context) => {
      let selection = "";
      if (
        (context.type === "RequestContext" ||
          context.type === "ResponseContext") &&
        "selection" in context &&
        typeof context.selection === "string"
      ) {
        selection = context.selection;
      }
      if (!selection)
        selection = sdk.window.getActiveEditor()?.getSelectedText() ?? "";
      pageInput.value = selection;
      sdk.navigation.goTo(PATH);
      // Programmatic input assignment doesn't fire the page's @input handler, so
      // run the conversion here and populate the output pane.
      try {
        const res = await sdk.backend.convert(selection);
        pageOutput.value = res.kind === "Ok" ? res.value : `[error] ${res.error}`;
      } catch (e) {
        pageOutput.value = `[error] ${String(e)}`;
      }
    },
  });

  for (const type of ["Request", "Response"] as const) {
    sdk.menu.registerItem({
      type,
      commandId: CMD_CONVERT,
      leadingIcon: "fas fa-bolt",
    });
    sdk.menu.registerItem({
      type,
      commandId: CMD_SEND,
      leadingIcon: "fas fa-arrow-right-to-bracket",
    });
  }

  // --- Mount the Vue app last; never let a render error kill registrations ---
  try {
    const app = defineApp(sdk);
    app.mount(root);
  } catch (e) {
    console.error("[hackvertor] frontend mount failed:", e);
    sdk.window.showToast("Hackvertor UI failed to load (menus still work)", {
      variant: "error",
    });
  }
};
