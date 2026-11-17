import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { captionLines, compareImages, describeReport, ImageSizeMismatchError, type RgbaImage } from "../src/frontend/compare.ts";
import { renderComparison } from "../src/frontend/render.ts";

function solid(width: number, height: number, rgba: [number, number, number, number]): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i);
  return { width, height, data };
}

function paint(img: RgbaImage, x0: number, y0: number, x1: number, y1: number, rgba: [number, number, number, number]) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) img.data.set(rgba, (y * img.width + x) * 4);
}

describe("compareImages", () => {
  it("identical images: no changed pixels, no regions", () => {
    const a = solid(40, 30, [10, 20, 30, 255]);
    const { report } = compareImages(a, solid(40, 30, [10, 20, 30, 255]));
    assert.equal(report.changedPixels, 0);
    assert.equal(report.maxDiff, 0);
    assert.deepEqual(report.regions, []);
  });

  it("finds a changed block with the exact bounding box", () => {
    const a = solid(100, 80, [0, 0, 0, 255]);
    const b = solid(100, 80, [0, 0, 0, 255]);
    paint(b, 20, 10, 50, 30, [200, 0, 0, 255]);
    const { report } = compareImages(a, b);
    assert.equal(report.changedPixels, 30 * 20);
    assert.equal(report.regions.length, 1);
    assert.deepEqual(report.regions[0], { x0: 20, y0: 10, x1: 50, y1: 30, pixels: 600 });
  });

  it("threshold is strict greater-than on the max channel", () => {
    const a = solid(4, 4, [100, 100, 100, 255]);
    const b = solid(4, 4, [100, 125, 100, 255]);
    assert.equal(compareImages(a, b, { threshold: 25 }).report.changedPixels, 0);
    assert.equal(compareImages(a, b, { threshold: 24 }).report.changedPixels, 16);
  });

  it("uses the largest channel, including alpha", () => {
    const a = solid(2, 2, [0, 0, 0, 255]);
    const b = solid(2, 2, [0, 0, 0, 100]);
    assert.equal(compareImages(a, b).report.maxDiff, 155);
  });

  it("does not drop tiny regions", () => {
    const a = solid(200, 200, [0, 0, 0, 255]);
    const b = solid(200, 200, [0, 0, 0, 255]);
    paint(b, 5, 5, 6, 6, [255, 255, 255, 255]);
    paint(b, 150, 150, 160, 160, [255, 255, 255, 255]);
    const { report } = compareImages(a, b);
    assert.equal(report.regions.length, 2);
    assert.equal(report.regions[0]!.pixels, 100);
    assert.equal(report.regions[1]!.pixels, 1);
  });

  it("merges nearby changes into one region but keeps a tight box", () => {
    const a = solid(120, 60, [0, 0, 0, 255]);
    const b = solid(120, 60, [0, 0, 0, 255]);
    paint(b, 10, 10, 14, 14, [255, 0, 0, 255]);
    paint(b, 22, 12, 26, 16, [255, 0, 0, 255]);
    const { report } = compareImages(a, b, { mergeGap: 16 });
    assert.equal(report.regions.length, 1);
    assert.deepEqual(report.regions[0], { x0: 10, y0: 10, x1: 26, y1: 16, pixels: 32 });
  });

  it("caps listed regions and reports how many were omitted", () => {
    const a = solid(300, 40, [0, 0, 0, 255]);
    const b = solid(300, 40, [0, 0, 0, 255]);
    for (let i = 0; i < 5; i++) paint(b, i * 60, 5, i * 60 + 2, 7, [255, 255, 255, 255]);
    const { report } = compareImages(a, b, { maxRegions: 3, mergeGap: 8 });
    assert.equal(report.regions.length, 3);
    assert.equal(report.omittedRegions, 2);
  });

  it("histogram separates noise from real change", () => {
    const a = solid(10, 10, [50, 50, 50, 255]);
    const b = solid(10, 10, [50, 50, 50, 255]);
    paint(b, 0, 0, 10, 5, [56, 50, 50, 255]); // 噪点量级 6
    paint(b, 0, 5, 2, 10, [150, 50, 50, 255]); // 内容差异 100
    const { report } = compareImages(a, b);
    const at = (t: number) => report.histogram.find((h) => h.threshold === t)!.pixels;
    assert.equal(at(0), 60);
    assert.equal(at(10), 10);
    assert.equal(at(25), 10);
    assert.equal(at(50), 10);
    assert.equal(report.changedPixels, 10);
  });

  it("refuses different sizes instead of resizing", () => {
    assert.throws(() => compareImages(solid(10, 10, [0, 0, 0, 255]), solid(10, 11, [0, 0, 0, 255])), ImageSizeMismatchError);
  });

  it("rejects bad threshold", () => {
    const a = solid(2, 2, [0, 0, 0, 255]);
    assert.throws(() => compareImages(a, a, { threshold: -1 }));
    assert.throws(() => compareImages(a, a, { threshold: 256 }));
  });
});

describe("describeReport", () => {
  it("says identical only when maxDiff is 0", () => {
    const a = solid(4, 4, [1, 1, 1, 255]);
    const same = describeReport(compareImages(a, a).report, { a: "A", b: "B" });
    assert.match(same, /逐像素完全一致/);
    const noisy = describeReport(compareImages(a, solid(4, 4, [4, 1, 1, 255])).report, { a: "A", b: "B" });
    assert.match(noisy, /压缩噪点量级/);
    assert.doesNotMatch(noisy, /逐像素完全一致/);
  });

  it("lists regions", () => {
    const a = solid(50, 50, [0, 0, 0, 255]);
    const b = solid(50, 50, [0, 0, 0, 255]);
    paint(b, 3, 4, 13, 14, [255, 255, 255, 255]);
    const text = describeReport(compareImages(a, b).report, { a: "猫", b: "狗" });
    assert.match(text, /A「猫」 vs B「狗」/);
    assert.match(text, /1\. 3,4 – 13,14（10×10，100 像素）/);
  });
});

describe("captionLines", () => {
  it("is a short summary: conclusion, histogram line, top regions only", () => {
    const a = solid(300, 40, [0, 0, 0, 255]);
    const b = solid(300, 40, [0, 0, 0, 255]);
    for (let i = 0; i < 7; i++) paint(b, i * 40, 5, i * 40 + 2 + i, 7 + i, [255, 255, 255, 255]);
    const { report } = compareImages(a, b, { mergeGap: 4 });
    const lines = captionLines(report, { a: "猫", b: "狗" }, 3);
    assert.match(lines[0]!, /A「猫」 vs B「狗」 · 300×40 · 阈值 25/);
    assert.match(lines[1]!, /^结论：有差异/);
    assert.match(lines[2]!, />0：.*>10：.*>25：.*>50：/);
    assert.equal(lines.filter((l) => l.startsWith("区域 ")).length, 3);
    assert.match(lines.at(-1)!, /另有 4 个更小的区域/);
  });

  it("identical images get a one-line conclusion and no regions", () => {
    const a = solid(8, 8, [9, 9, 9, 255]);
    const lines = captionLines(compareImages(a, a).report, { a: "A", b: "B" });
    assert.match(lines[1]!, /逐像素完全一致/);
    assert.equal(lines.some((l) => l.startsWith("区域")), false);
  });
});

describe("renderComparison", () => {
  it("single diff panel at source size: changed red, rest B dimmed to 30%, region boxed", () => {
    const a = solid(20, 10, [100, 100, 100, 255]);
    const b = solid(20, 10, [100, 100, 100, 255]);
    paint(b, 8, 4, 12, 8, [255, 255, 255, 255]);
    const out = renderComparison(b, compareImages(a, b));
    assert.deepEqual([out.width, out.height], [20, 10]);
    const px = (x: number, y: number) => Array.from(out.data.slice((y * out.width + x) * 4, (y * out.width + x) * 4 + 4));
    assert.deepEqual(px(10, 5), [235, 40, 40, 255]);
    assert.deepEqual(px(0, 0), [30, 30, 30, 255]);
    // 包围框向外扩 2 像素：区域左边界 x=8 → 框在 x=6、7。
    assert.deepEqual(px(6, 5), [255, 214, 0, 255]);
  });
});
