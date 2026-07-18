import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
  extensions: [".svelte"],
  kit: {
    adapter: adapter({
      out: "build",
    }),
    alias: {
      "@/*": "./*",
      "#/*": "./public/*",
      "$/*": "./lib/*",
    },
    experimental: {
      remoteFunctions: true,
    },
    files: {
      assets: "public",
    },
  },
  preprocess: vitePreprocess(),
};

export default config;
