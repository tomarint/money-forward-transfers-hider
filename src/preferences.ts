import { browser } from "wxt/browser";
import { STORAGE_KEY } from "./constants";

export const DEFAULT_HIDE_EXCLUDED = true;

export async function getHideExcluded(): Promise<boolean> {
  const result = await browser.storage.local.get({
    [STORAGE_KEY]: DEFAULT_HIDE_EXCLUDED
  });
  const value = result[STORAGE_KEY];
  return typeof value === "boolean" ? value : DEFAULT_HIDE_EXCLUDED;
}

export async function setHideExcluded(value: boolean): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: value });
}
