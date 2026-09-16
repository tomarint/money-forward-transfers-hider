import { beforeEach, describe, expect, it } from "vitest";
import { browser } from "wxt/browser";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { STORAGE_KEY } from "../src/constants";
import {
  DEFAULT_HIDE_EXCLUDED,
  getHideExcluded,
  setHideExcluded
} from "../src/preferences";

describe("preferences", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("defaults to hiding excluded rows", async () => {
    await expect(getHideExcluded()).resolves.toBe(DEFAULT_HIDE_EXCLUDED);
  });

  it("keeps the existing storage key for update compatibility", async () => {
    await setHideExcluded(false);

    await expect(getHideExcluded()).resolves.toBe(false);
    await expect(browser.storage.local.get(STORAGE_KEY)).resolves.toEqual({
      [STORAGE_KEY]: false
    });
  });

  it("falls back when stored data is malformed", async () => {
    await browser.storage.local.set({ [STORAGE_KEY]: "invalid" });
    await expect(getHideExcluded()).resolves.toBe(DEFAULT_HIDE_EXCLUDED);
  });
});
