import { browser } from "wxt/browser";
import {
  EXCLUDED_TRANSACTION_SELECTOR,
  ROOT_ATTRIBUTE,
  STORAGE_KEY
} from "../../src/constants";
import { isStatusRequest } from "../../src/messages";
import { getHideExcluded } from "../../src/preferences";
import "./style.css";

declare global {
  var __mfthExcludedHiderLoaded: boolean | undefined;
}

export default defineContentScript({
  matches: ["https://moneyforward.com/*"],
  runAt: "document_start",
  cssInjectionMode: "manifest",
  main() {
    if (window.top !== window || globalThis.__mfthExcludedHiderLoaded) {
      return;
    }
    globalThis.__mfthExcludedHiderLoaded = true;

    let hideExcluded = true;
    let changedSinceLoad = false;

    const applyPreferenceToDocument = (): void => {
      const apply = (): void => {
        document.documentElement?.setAttribute(
          ROOT_ATTRIBUTE,
          hideExcluded ? "true" : "false"
        );
      };

      if (document.documentElement) {
        apply();
      } else {
        document.addEventListener("readystatechange", apply, { once: true });
      }
    };

    browser.storage.onChanged.addListener((changes, areaName) => {
      const nextValue = changes[STORAGE_KEY]?.newValue;
      if (areaName === "sync" && typeof nextValue === "boolean") {
        changedSinceLoad = true;
        hideExcluded = nextValue;
        applyPreferenceToDocument();
      }
    });

    browser.runtime.onMessage.addListener(
      (message, _sender, sendResponse): false | undefined => {
        if (!isStatusRequest(message)) {
          return undefined;
        }

        sendResponse({
          supported: true,
          hideExcluded,
          excludedTransactionCount: document.querySelectorAll(
            EXCLUDED_TRANSACTION_SELECTOR
          ).length
        });
        return false;
      }
    );

    void getHideExcluded()
      .then((storedValue) => {
        if (!changedSinceLoad) {
          hideExcluded = storedValue;
        }
      })
      .catch(() => {
        if (!changedSinceLoad) {
          hideExcluded = true;
        }
      })
      .finally(applyPreferenceToDocument);
  }
});
