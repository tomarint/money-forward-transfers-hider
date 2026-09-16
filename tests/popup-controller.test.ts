import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";
import {
  initializePopup,
  type PopupDependencies
} from "../src/popup-controller";
import type { PageStatusResponse } from "../src/messages";

// Use WXT's generated catalogs and i18n wrapper. fake-browser does not
// implement browser.i18n, so only that browser API is stubbed here.
function useLocale(locale: "ja" | "en"): void {
  const messages = JSON.parse(readFileSync(
    join(process.cwd(), ".output/chrome-mv3/_locales", locale, "messages.json"), "utf8"
  )) as Record<string, { message: string }>;
  vi.spyOn(browser.i18n, "getMessage").mockImplementation((key, substitutions) => {
    const message = messages[key]?.message;
    if (message === undefined) {
      throw new Error(`Missing message: ${locale}/${key}`);
    }
    const values = Array.isArray(substitutions) ? substitutions : [substitutions];
    return message.replace(/\$(\d)/g, (_, number: string) =>
      String(values[Number(number) - 1] ?? "")
    );
  });
}

function renderPopupFixture(): HTMLInputElement {
  const html = readFileSync(join(process.cwd(), "entrypoints/popup/index.html"), "utf8");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  // The controller is imported above; do not execute the HTML entrypoint twice.
  parsed.querySelectorAll("script").forEach((script) => script.remove());
  document.body.innerHTML = parsed.body.innerHTML;
  const toggle = document.getElementById("hide-excluded");
  if (!(toggle instanceof HTMLInputElement)) {
    throw new TypeError("Popup fixture is missing its toggle.");
  }
  return toggle;
}

function createDependencies(): PopupDependencies {
  return {
    getPreference: vi.fn().mockResolvedValue(true),
    setPreference: vi.fn().mockResolvedValue(undefined),
    getCurrentPageStatus: vi.fn().mockResolvedValue({
      supported: true,
      hideExcluded: true,
      excludedTransactionCount: 5
    })
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("popup controller", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    useLocale("ja");
  });

  it.each([
    { locale: "ja" as const, name: "マネーフォワード振替非表示", count: "明細表の振替・計算対象外：5件" },
    { locale: "en" as const, name: "Money Forward Transfers Hider", count: "Transfers / excluded transactions in the list: 5" }
  ])("localizes the actual popup in $locale", async ({ locale, name, count }) => {
    useLocale(locale);
    const toggle = renderPopupFixture();
    await initializePopup(document, createDependencies());

    expect(document.documentElement.lang).toBe(locale);
    expect(document.title).toBe(name);
    expect(document.getElementById("extension-name")?.textContent).toBe(name);
    expect(toggle.checked).toBe(true);
    expect(toggle.disabled).toBe(false);
    expect(document.getElementById("page-status")?.textContent).toBe(count);
    expect(document.getElementById("setting-label")?.textContent).toBeTruthy();
    expect(document.getElementById("visibility-note")?.textContent).toBeTruthy();
  });

  it("persists a toggle change and refreshes the status", async () => {
    const toggle = renderPopupFixture();
    const dependencies = createDependencies();
    await initializePopup(document, dependencies);

    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));

    await vi.waitFor(() => {
      expect(dependencies.setPreference).toHaveBeenCalledWith(false);
      expect(toggle.disabled).toBe(false);
      expect(document.getElementById("setting-state")?.textContent).toBe(
        "オフ：振替・計算対象外を表示します"
      );
      expect(dependencies.getCurrentPageStatus).toHaveBeenCalledTimes(2);
    });
  });

  it("restores the saved state and shows an English error when saving fails", async () => {
    useLocale("en");
    const toggle = renderPopupFixture();
    const dependencies = {
      ...createDependencies(),
      setPreference: vi.fn().mockRejectedValue(new Error("storage failure"))
    };
    await initializePopup(document, dependencies);

    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));

    await vi.waitFor(() => {
      expect(toggle.checked).toBe(true);
      expect(toggle.disabled).toBe(false);
      expect(document.getElementById("setting-error")?.hidden).toBe(false);
      expect(document.getElementById("setting-error")?.textContent).toBe(
        "Could not save the setting. The previous setting has been restored."
      );
    });
  });

  it("disables changes until the stored preference is loaded", async () => {
    const toggle = renderPopupFixture();
    const preference = deferred<boolean>();
    const dependencies = {
      ...createDependencies(),
      getPreference: () => preference.promise
    };
    const initialized = initializePopup(document, dependencies);

    expect(toggle.disabled).toBe(true);
    toggle.dispatchEvent(new Event("change"));
    expect(dependencies.setPreference).not.toHaveBeenCalled();
    preference.resolve(false);
    await initialized;
    expect(toggle.checked).toBe(false);
    expect(toggle.disabled).toBe(false);
  });

  it("keeps a load error visible after a slower page-status response", async () => {
    const toggle = renderPopupFixture();
    const status = deferred<PageStatusResponse | null>();
    const initialized = initializePopup(document, {
      ...createDependencies(),
      getPreference: vi.fn().mockRejectedValue(new Error("storage failure")),
      getCurrentPageStatus: () => status.promise
    });

    await vi.waitFor(() => {
      expect(document.getElementById("setting-error")?.hidden).toBe(false);
    });
    status.resolve(null);
    await initialized;
    expect(toggle.disabled).toBe(true);
    expect(document.getElementById("setting-error")?.textContent).toBe(
      "設定を読み込めませんでした。ポップアップを開き直してください。"
    );
  });

  it("does not wait for a slow page-status refresh to finish saving", async () => {
    const toggle = renderPopupFixture();
    const status = deferred<PageStatusResponse | null>();
    const getCurrentPageStatus = vi.fn()
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(() => status.promise);
    await initializePopup(document, { ...createDependencies(), getCurrentPageStatus });

    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(toggle.disabled).toBe(false));
    expect(document.getElementById("setting-state")?.textContent).toContain("オフ");
    status.resolve(null);
  });
});
