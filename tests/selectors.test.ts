import { beforeEach, describe, expect, it } from "vitest";
import {
  EXCLUDED_CALENDAR_SELECTOR,
  EXCLUDED_TRANSACTION_SELECTOR
} from "../src/constants";

describe("excluded-row selectors", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <table id="detail-table">
        <tbody>
          <tr id="transfer" class="transaction_list mf-grayout"><td>振替</td></tr>
          <tr id="manual" class="transaction_list mf-grayout"><td>計算対象外</td></tr>
          <tr id="normal" class="transaction_list"><td>通常明細</td></tr>
        </tbody>
      </table>
      <table class="calendar-tooltip-table">
        <tbody>
          <tr id="calendar-excluded" class="gray"><td>対象外</td></tr>
          <tr id="calendar-normal"><td>通常明細</td></tr>
        </tbody>
      </table>
    `;
  });

  it("selects rows rather than the entire detail table", () => {
    const matches = [...document.querySelectorAll(EXCLUDED_TRANSACTION_SELECTOR)];
    expect(matches.map((element) => element.id)).toEqual(["transfer", "manual"]);
    expect(matches).not.toContain(document.getElementById("detail-table"));
  });

  it("selects only gray rows inside the calendar popup", () => {
    const matches = [...document.querySelectorAll(EXCLUDED_CALENDAR_SELECTOR)];
    expect(matches.map((element) => element.id)).toEqual([
      "calendar-excluded"
    ]);
  });
});
