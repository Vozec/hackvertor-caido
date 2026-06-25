import path from "path";
import { defineConfig } from "@caido-community/dev";
import vue from "@vitejs/plugin-vue";
import tailwindCaido from "@caido/tailwindcss";
import prefixwrap from "postcss-prefixwrap";
import tailwindcss from "tailwindcss";
import tailwindPrimeui from "tailwindcss-primeui";

const id = "hackvertor";

export default defineConfig({
  id,
  name: "Hackvertor",
  description:
    "Tag-based conversion engine for Caido — encode/decode/hash/HMAC/encrypt/compress and more, with right-click transforms and auto-conversion of <@tag> in outgoing requests.",
  version: "0.1.0",
  author: {
    name: "vozec",
    email: "arthursd444@gmail.com",
    url: "https://github.com/Vozec",
  },
  plugins: [
    {
      kind: "backend",
      id: "backend",
      root: "packages/backend",
    },
    {
      kind: "frontend",
      id: "frontend",
      root: "packages/frontend",
      backend: { id: "backend" },
      vite: {
        plugins: [vue()],
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "packages/frontend/src"),
            },
          ],
        },
        build: {
          rollupOptions: {
            external: ["@caido/frontend-sdk"],
          },
        },
        css: {
          postcss: {
            plugins: [
              prefixwrap(`#plugin--${id}`),
              tailwindcss({
                corePlugins: { preflight: false },
                content: [
                  "./packages/frontend/src/**/*.{vue,ts}",
                  "./node_modules/@caido/primevue/dist/primevue.mjs",
                ],
                darkMode: ["selector", '[data-mode="dark"]'],
                plugins: [tailwindPrimeui, tailwindCaido],
              }),
            ],
          },
        },
      },
    },
  ],
});
