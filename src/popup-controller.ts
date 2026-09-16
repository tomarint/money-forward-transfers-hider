import { browser } from "wxt/browser";
import { i18n } from "#i18n";
import { STATUS_REQUEST } from "./constants";
import {
  isPageStatusResponse,
  type PageStatusResponse
} from "./messages";
import {
  DEFAULT_HIDE_EXCLUDED,
  getHideExcluded,
  setHideExcluded
} from "./preferences";

export interface PopupDependencies {
  readonly getPreference: () => Promise<boolean>;
  readonly setPreference: (value: boolean) => Promise<void>;
  readonly getCurrentPageStatus: () => Promise<PageStatusResponse | null>;
}

const defaultDependencies: PopupDependencies = {
  getPreference: getHideExcluded,
  setPreference: setHideExcluded,
  async getCurrentPageStatus() {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    if (typeof tab?.id !== "number" || !Number.isSafeInteger(tab.id)) {
      return null;
    }

    try {
      const response: unknown = await browser.tabs.sendMessage(tab.id, {
        type: STATUS_REQUEST
      });
      return isPageStatusResponse(response) ? response : null;
    } catch {
      return null;
    }
  }
};

function requireElement<T extends HTMLElement>(
  document: Document,
  id: string
): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required element #${id} was not found.`);
  }
  return element as T;
}

export async function initializePopup(
  document: Document,
  dependencies: PopupDependencies = defaultDependencies
): Promise<void> {
  // Match the displayed translation, including the English fallback.
  document.documentElement.lang = i18n.t("documentLanguage");
  document.title = i18n.t("extensionName");
  const labels = {
    "extension-name": "extensionName",
    // "extension-subtitle": "popup.unofficial",
    "setting-label": "popup.toggleLabel",
    "page-heading": "popup.currentPage",
    "visibility-note": "popup.note"
  } as const;
  for (const [id, key] of Object.entries(labels)) {
    requireElement<HTMLElement>(document, id).textContent = i18n.t(key);
  }

  const toggle = requireElement<HTMLInputElement>(document, "hide-excluded");
  const settingState = requireElement<HTMLElement>(document, "setting-state");
  const settingError = requireElement<HTMLElement>(document, "setting-error");
  const pageStatus = requireElement<HTMLElement>(document, "page-status");
  let persistedPreference = DEFAULT_HIDE_EXCLUDED;
  let statusRequestId = 0;
  toggle.disabled = true;
  settingState.textContent = i18n.t("popup.loading");

  const renderSettingError = (text = ""): void => {
    settingError.textContent = text;
    settingError.hidden = text.length === 0;
  };
  renderSettingError();

  const renderPreference = (value: boolean): void => {
    toggle.checked = value;
    settingState.textContent = value
      ? i18n.t("popup.enabled")
      : i18n.t("popup.disabled");
  };

  const renderPageStatus = (
    text: string,
    kind: "normal" | "muted" | "error" = "normal"
  ): void => {
    pageStatus.textContent = text;
    pageStatus.dataset.kind = kind;
  };

  const refreshCurrentPageStatus = async (): Promise<void> => {
    const requestId = ++statusRequestId;
    renderPageStatus(i18n.t("popup.checking"), "muted");

    try {
      const status = await dependencies.getCurrentPageStatus();
      if (requestId !== statusRequestId) {
        return;
      }

      if (!status) {
        renderPageStatus(
          i18n.t("popup.unsupported"),
          "muted"
        );
        return;
      }

      const count = status.excludedTransactionCount;
      renderPageStatus(
        count > 0
          ? i18n.t("popup.detected", [count])
          : i18n.t("popup.noneDetected")
      );
    } catch {
      if (requestId === statusRequestId) {
        renderPageStatus(i18n.t("popup.pageError"), "error");
      }
    }
  };

  const savePreference = async (requestedValue: boolean): Promise<void> => {
    toggle.disabled = true;
    settingState.textContent = i18n.t("popup.saving");
    renderSettingError();

    try {
      await dependencies.setPreference(requestedValue);
      persistedPreference = requestedValue;
      renderPreference(persistedPreference);
      void refreshCurrentPageStatus();
    } catch {
      renderPreference(persistedPreference);
      renderSettingError(i18n.t("popup.saveError"));
    } finally {
      toggle.disabled = false;
    }
  };

  toggle.addEventListener("change", () => {
    if (!toggle.disabled) {
      void savePreference(toggle.checked);
    }
  });

  const loadPreference = async (): Promise<void> => {
    try {
      persistedPreference = await dependencies.getPreference();
      renderPreference(persistedPreference);
      toggle.disabled = false;
    } catch {
      // Keep the toggle disabled when the actual stored value is unknown.
      settingState.textContent = i18n.t("popup.unavailable");
      renderSettingError(i18n.t("popup.loadError"));
    }
  };

  await Promise.all([loadPreference(), refreshCurrentPageStatus()]);
}
