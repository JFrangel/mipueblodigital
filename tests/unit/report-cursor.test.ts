import { expect, it } from "vitest";
import {
  reportCursor,
  parseReportCursor,
} from "../../src/domain/report-cursor";
it("conserva fecha e identidad para no saltar empates", () => {
  const date = "2026-10-21T12:00:00.000Z",
    id = "a".repeat(64);
  expect(parseReportCursor(reportCursor(date, id))).toEqual([date, id]);
  expect(() => parseReportCursor(date)).toThrow();
  expect(() => parseReportCursor(`${date}|../otra`)).toThrow();
});
