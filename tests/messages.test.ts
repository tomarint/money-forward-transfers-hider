import { describe, expect, it } from "vitest";
import { STATUS_REQUEST } from "../src/constants";
import { isPageStatusResponse, isStatusRequest } from "../src/messages";

describe("message guards", () => {
  it("accepts only the status request", () => {
    expect(isStatusRequest({ type: STATUS_REQUEST })).toBe(true);
    expect(isStatusRequest({ type: "other" })).toBe(false);
    expect(isStatusRequest(null)).toBe(false);
  });

  it("validates a complete non-negative status response", () => {
    expect(
      isPageStatusResponse({
        supported: true,
        hideExcluded: true,
        excludedTransactionCount: 3
      })
    ).toBe(true);
    expect(
      isPageStatusResponse({
        supported: true,
        hideExcluded: true,
        excludedTransactionCount: -1
      })
    ).toBe(false);
    expect(
      isPageStatusResponse({
        supported: true,
        excludedTransactionCount: 3
      })
    ).toBe(false);
  });
});
