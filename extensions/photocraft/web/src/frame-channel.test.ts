import { expect, it } from "vitest";
// @ts-expect-error App asset is intentionally a browser-native JavaScript module.
import { FrameChannel, captureGeometry } from "./app-assets/frame-channel.js";
it("bounds captures, recovers lost acknowledgments, and ignores a late acknowledgment", () => {
  const channel = new FrameChannel();
  expect(channel.canCapture(0, true)).toBe(true);
  channel.start(0);
  expect(channel.canCapture(1000, true)).toBe(false);
  const first = channel.sent(10);
  expect(channel.canCapture(200, true)).toBe(false);
  expect(channel.canCapture(210, true)).toBe(true);
  channel.start(210); const second = channel.sent(211);
  channel.ack(first);
  expect(channel.canCapture(300, true)).toBe(false);
  channel.ack(second);
  expect(channel.canCapture(300, true)).toBe(true);
  channel.paused = true;
  expect(channel.canCapture(1000, true)).toBe(false);
});
it("uses source DPR, caps the long edge and handles an out-of-surface rectangle", () => {
  expect(captureGeometry({ width: 4000, height: 2000, clientWidth: 2000, clientHeight: 1000 }, [10, 20, 1800, 900]))
    .toEqual({ x: 20, y: 40, width: 3600, height: 1800, outWidth: 2048, outHeight: 1024 });
  expect(captureGeometry({ width: 10, height: 10, clientWidth: 10, clientHeight: 10 }, [20, 0, 5, 5])).toBeNull();
});
