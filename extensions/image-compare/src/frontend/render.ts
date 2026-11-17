/**
 * 差异图合成：以 B 为底压暗，超过阈值的像素涂红，差异区域加黄色包围框。保持原分辨率。
 * 纯函数，不依赖 DOM。
 *
 * 只出这一格：A、B 本来就以节点的形式连在画布上，不在结果里重复。图上不画文字，
 * 结论文字由调用方拼在图片下方。
 */
import type { CompareResult, RgbaImage } from "./compare.js";

export function renderComparison(b: RgbaImage, result: CompareResult): RgbaImage {
  const { width, height } = b;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    if (result.mask[i] === 1) {
      out[p] = 235;
      out[p + 1] = 40;
      out[p + 2] = 40;
    } else {
      out[p] = b.data[p]! * 0.3;
      out[p + 1] = b.data[p + 1]! * 0.3;
      out[p + 2] = b.data[p + 2]! * 0.3;
    }
    out[p + 3] = 255;
  }

  const line = Math.max(2, Math.round(Math.min(width, height) / 400));
  for (const region of result.report.regions) {
    // 框向外扩 line 像素，避免盖住差异本身。
    strokeRect(out, width, height, region.x0 - line, region.y0 - line, region.x1 + line, region.y1 + line, line);
  }
  return { width, height, data: out };
}

function strokeRect(out: Uint8ClampedArray, width: number, height: number, x0: number, y0: number, x1: number, y1: number, line: number): void {
  const put = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = (y * width + x) * 4;
    out[p] = 255;
    out[p + 1] = 214;
    out[p + 2] = 0;
    out[p + 3] = 255;
  };
  for (let t = 0; t < line; t++) {
    for (let x = x0; x < x1; x++) {
      put(x, y0 + t);
      put(x, y1 - 1 - t);
    }
    for (let y = y0; y < y1; y++) {
      put(x0 + t, y);
      put(x1 - 1 - t, y);
    }
  }
}
