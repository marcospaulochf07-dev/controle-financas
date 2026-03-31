import { describe, expect, it } from "vitest";
import {
  createDateString,
  formatDateForDisplay,
  formatMonthKey,
  getMonthBounds,
  isDateInMonth,
  parseDateString,
} from "@/lib/date-utils";

describe("date-utils", () => {
  it("parses and formats date-only strings without timezone drift", () => {
    expect(parseDateString("2026-03-01")).toEqual({ year: 2026, month: 3, day: 1 });
    expect(formatDateForDisplay("2026-03-01")).toBe("01/03/2026");
  });

  it("creates safe month keys and month bounds", () => {
    expect(formatMonthKey(2026, 2)).toBe("2026-03");
    expect(getMonthBounds(2026, 2)).toEqual({
      start: "2026-03-01",
      endExclusive: "2026-04-01",
    });
  });

  it("clamps invalid day-of-month values to the last valid day", () => {
    expect(createDateString(2026, 1, 31)).toBe("2026-02-28");
  });

  it("matches dates by month using string logic instead of UTC parsing", () => {
    expect(isDateInMonth("2026-03-01", 2026, 2)).toBe(true);
    expect(isDateInMonth("2026-03-31", 2026, 2)).toBe(true);
    expect(isDateInMonth("2026-04-01", 2026, 2)).toBe(false);
  });
});
