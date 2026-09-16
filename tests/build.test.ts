import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface GeneratedManifest {
  readonly manifest_version: number;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly default_locale: string;
  readonly permissions?: readonly string[];
  readonly icons?: Readonly<Record<string, string>>;
  readonly action?: { readonly default_popup?: string; readonly default_title?: string };
  readonly browser_action?: { readonly default_popup?: string; readonly default_title?: string };
  readonly content_scripts?: readonly {
    readonly matches?: readonly string[];
    readonly css?: readonly string[];
    readonly js?: readonly string[];
    readonly run_at?: string;
  }[];
  readonly browser_specific_settings?: {
    readonly gecko?: {
      readonly id?: string;
      readonly data_collection_permissions?: {
        readonly required?: readonly string[];
      };
    };
  };
}

const projectRoot = process.cwd();
const packageVersion = (JSON.parse(
  readFileSync(join(projectRoot, "package.json"), "utf8")
) as { version: string }).version;

function readManifest(output: string): GeneratedManifest {
  return JSON.parse(
    readFileSync(join(projectRoot, ".output", output, "manifest.json"), "utf8")
  ) as GeneratedManifest;
}

describe("WXT browser builds", () => {
  const builds = [
    { output: "chrome-mv3", manifestVersion: 3, popupKey: "action" },
    { output: "edge-mv3", manifestVersion: 3, popupKey: "action" },
    {
      output: "firefox-mv2",
      manifestVersion: 2,
      popupKey: "browser_action"
    }
  ] as const;

  for (const build of builds) {
    it(`generates a valid ${build.output} package`, () => {
      const manifest = readManifest(build.output);
      expect(manifest.manifest_version).toBe(build.manifestVersion);
      expect(manifest.version).toBe(packageVersion);
      expect(manifest.default_locale).toBe("en");
      expect(manifest.name).toBe("__MSG_extensionName__");
      expect(manifest.description).toBe("__MSG_extensionDescription__");
      expect(manifest.permissions).toContain("storage");

      const contentScript = manifest.content_scripts?.[0];
      expect(contentScript?.matches).toEqual(["https://moneyforward.com/*"]);
      expect(contentScript?.run_at).toBe("document_start");
      expect(contentScript?.js).toHaveLength(1);
      expect(contentScript?.css).toHaveLength(1);

      const popup = manifest[build.popupKey];
      expect(popup?.default_popup).toBe("popup.html");
      expect(popup?.default_title).toBe("__MSG_extensionName__");

      const catalogs = ["en", "ja"].map((locale) => JSON.parse(
        readFileSync(join(projectRoot, ".output", build.output, "_locales", locale, "messages.json"), "utf8")
      ) as Record<string, { message: string }>);
      expect(catalogs[0]?.extensionName?.message).toBe("Money Forward Transfers Hider");
      expect(catalogs[1]?.extensionName?.message).toBe("マネーフォワード振替非表示");
      expect(Object.keys(catalogs[0]!).sort()).toEqual(Object.keys(catalogs[1]!).sort());
      for (const catalog of catalogs) {
        for (const { message } of Object.values(catalog)) {
          expect(message.trim().length).toBeGreaterThan(0);
        }
        for (const match of JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)) {
          expect(catalog[match[1]!]?.message).toBeTruthy();
        }
      }

      for (const size of ["16", "32", "48", "128"]) {
        const icon = manifest.icons?.[size];
        expect(icon).toBeTypeOf("string");
        expect(statSync(join(projectRoot, ".output", build.output, icon!)).size).toBeGreaterThan(0);
      }

      const cssPath = contentScript?.css?.[0];
      expect(cssPath).toBeTypeOf("string");
      const css = readFileSync(
        join(projectRoot, ".output", build.output, cssPath!),
        "utf8"
      );
      expect(css).toContain("tr.transaction_list.mf-grayout");
      expect(css).toMatch(
        /table\.calendar-tooltip-table tbody\s*>\s*tr\.gray/
      );
      expect(css).not.toContain("mfth-transfer-row");
    });
  }

  it("adds the Firefox extension ID only to Firefox", () => {
    const firefoxSettings =
      readManifest("firefox-mv2").browser_specific_settings?.gecko;
    expect(firefoxSettings?.id).toBe("{258008b6-7d8f-450d-b11a-3baf8b357246}");
    expect(firefoxSettings?.data_collection_permissions?.required).toEqual([
      "none"
    ]);
    expect(readManifest("chrome-mv3").browser_specific_settings).toBeUndefined();
    expect(readManifest("edge-mv3").browser_specific_settings).toBeUndefined();
  });
});
