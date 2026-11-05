import { expect, it, vi } from "vitest";
// @ts-expect-error browser-native JS asset
import { createCaptureMetrics } from "./app-assets/capture-metrics.js";

it("is inert unless an explicit collector exists", () => {
  const clock = { now: vi.fn(), mark: vi.fn() };
  const metrics = createCaptureMetrics(undefined, clock);
  expect(metrics.measure(1, "state", () => 42)).toBe(42);
  expect(clock.now).not.toHaveBeenCalled();
});
it("records async wall time and clears marks without hiding failures", async () => {
  let now = 10;
  const records: any[] = [];
  const clock = { now: () => now, timeOrigin: 1000, mark: vi.fn(), measure: vi.fn(), clearMarks: vi.fn(), clearMeasures: vi.fn() };
  const metrics = createCaptureMetrics((v: unknown) => records.push(v), clock);
  await metrics.measureAsync(3, "bitmap", async () => { now = 18; });
  expect(records[0]).toMatchObject({ frame: 3, stage: "bitmap", startMs: 10, durationMs: 8, timeOrigin: 1000 });
  expect(clock.clearMarks).toHaveBeenCalledTimes(2);
  expect(clock.clearMeasures).toHaveBeenCalledOnce();
  expect(() => metrics.measure(4, "readback", () => { throw Error("read failed"); })).toThrow("read failed");
  expect(records[1].stage).toBe("readback");
});
it("keeps sampling failures out of editing", () => {
  const metrics = createCaptureMetrics(() => { throw Error("collector unavailable"); });
  expect(metrics.measure(1, "compare", () => true)).toBe(true);
});
