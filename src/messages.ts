import { STATUS_REQUEST } from "./constants";

export interface StatusRequest {
  readonly type: typeof STATUS_REQUEST;
}

export interface PageStatusResponse {
  readonly supported: true;
  readonly hideExcluded: boolean;
  readonly excludedTransactionCount: number;
}

export function isStatusRequest(value: unknown): value is StatusRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === STATUS_REQUEST
  );
}

export function isPageStatusResponse(
  value: unknown
): value is PageStatusResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PageStatusResponse>;
  return (
    candidate.supported === true &&
    typeof candidate.hideExcluded === "boolean" &&
    typeof candidate.excludedTransactionCount === "number" &&
    Number.isSafeInteger(candidate.excludedTransactionCount) &&
    candidate.excludedTransactionCount >= 0
  );
}
