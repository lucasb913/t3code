import { describe, expect, it } from "vite-plus/test";
import { backgroundTaskIndicatorDelay, backgroundTaskIndicatorVisible } from "./backgroundTasks.ts";

describe("background task indicator", () => {
  const start = Date.parse("2026-10-02T10:00:00Z");
  const summary = { count: 1, oldestStartedAt: "2026-10-02T10:00:00Z" };
  it("promotes at one minute during the foreground turn and immediately after it ends", () => {
    expect(backgroundTaskIndicatorVisible(summary, true, start + 59_999)).toBe(false);
    expect(backgroundTaskIndicatorDelay(summary, true, start + 59_999)).toBe(1);
    expect(backgroundTaskIndicatorVisible(summary, true, start + 60_000)).toBe(true);
    expect(backgroundTaskIndicatorDelay(summary, true, start + 60_000)).toBe(0);
    expect(backgroundTaskIndicatorVisible(summary, false, start)).toBe(true);
  });
  it("does not invent work after completion or from an unknown launch time", () => {
    expect(
      backgroundTaskIndicatorVisible(
        { count: 0, oldestStartedAt: summary.oldestStartedAt },
        false,
        start,
      ),
    ).toBe(false);
    expect(backgroundTaskIndicatorVisible({ count: 1, oldestStartedAt: null }, true, start)).toBe(
      false,
    );
    expect(
      backgroundTaskIndicatorDelay({ count: 1, oldestStartedAt: "invalid" }, true, start),
    ).toBeNull();
    expect(backgroundTaskIndicatorVisible(undefined, false, start)).toBe(false);
  });
});
