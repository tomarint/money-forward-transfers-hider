import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/i18n/module"],
  manifest: ({ browser }) => ({
    default_locale: "en",
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    permissions: ["storage"],
    action: {
      default_title: "__MSG_extensionName__"
    },
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "{258008b6-7d8f-450d-b11a-3baf8b357246}",
              data_collection_permissions: {
                required: ["none"]
              }
            }
          }
        }
      : {})
  }),
  zip: {
    name: "money-forward-transfers-hider",
    dotSources: true,
    artifactTemplate:
      "{{name}}-v{{packageVersion}}-{{browser}}-{{manifestVersion}}.zip",
    sourcesTemplate: "{{name}}-v{{packageVersion}}-sources.zip",
    includeSources: [
      "entrypoints/**/*",
      "src/**/*",
      "locales/**/*",
      "public/**/*",
      "assets/**/*",
      "package.json",
      "pnpm-lock.yaml",
      "README.md",
      "README.en.md",
      ".npmrc",
      ".gitignore",
      "tsconfig.json",
      "vitest.config.ts",
      "wxt.config.ts"
    ]
  }
});
