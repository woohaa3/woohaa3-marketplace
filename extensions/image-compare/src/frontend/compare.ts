/**
 * 逐像素图片比对：纯函数，不依赖 DOM，便于单测。
 *
 * 判据：两张图同一位置 RGBA 四个通道里**最大的差值**超过阈值，就算这个像素变了。
 * 不做模糊、不做形态学去噪——预处理会把真实的小差异一起抹掉。JPEG 压缩噪点由阈值处理，
 * 报告里同时给出几档阈值下的差异占比，让人自己判断剩下的是噪点还是内容差异。
 *
 * 两张图尺寸不同时直接失败，不缩放：缩放会让所有像素都变，比对结果没有意义。
 */

export type RgbaImage = {
  width: number;
  height: number;
  /** RGBA，每像素 4 字节，长度 = width * height * 4。 */
  data: Uint8ClampedArray | Uint8Array;
};

export type DiffRegion = {
  /** 包围框，含 x0/y0，不含 x1/y1。 */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** 区域内超过阈值的像素数。 */
  pixels: number;
};

export type CompareReport = {
  width: number;
  height: number;
  threshold: number;
  totalPixels: number;
  changedPixels: number;
  /** changedPixels / totalPixels，0..1。 */
  changedRatio: number;
  /** 所有像素的最大通道差。 */
  maxDiff: number;
  /** 所有像素通道差的平均值。 */
  meanDiff: number;
  /** 阈值 0 / 10 / 25 / 50 下的差异像素数，用来区分压缩噪点和内容差异。 */
  histogram: ReadonlyArray<{ threshold: number; pixels: number }>;
  /** 按面积从大到小，最多 `maxRegions` 个；不过滤小区域。 */
  regions: DiffRegion[];
  /** regions 被 `maxRegions` 截掉的个数。 */
  omittedRegions: number;
};

export type CompareResult = {
  report: CompareReport;
  /** 每像素 1 字节：1 表示超过阈值。长度 = width * height。 */
  mask: Uint8Array;
};

export type CompareOptions = {
  /** 通道最大差大于它才算变了。默认 25。 */
  threshold?: number;
  /** 相距不超过这么多像素的差异合并成一个区域。默认 16。 */
  mergeGap?: number;
  /** 最多列出多少个区域。默认 20。 */
  maxRegions?: number;
};

export const DEFAULT_THRESHOLD = 25;
const HISTOGRAM_THRESHOLDS = [0, 10, 25, 50] as const;

export class ImageSizeMismatchError extends Error {
  readonly a: { width: number; height: number };
  readonly b: { width: number; height: number };
  constructor(a: { width: number; height: number }, b: { width: number; height: number }) {
    super(`两张图尺寸不一致：A ${a.width}×${a.height}，B ${b.width}×${b.height}`);
    this.name = "ImageSizeMismatchError";
    this.a = { width: a.width, height: a.height };
    this.b = { width: b.width, height: b.height };
  }
}

export function compareImages(a: RgbaImage, b: RgbaImage, options: CompareOptions = {}): CompareResult {
  if (a.width !== b.width || a.height !== b.height) throw new ImageSizeMismatchError(a, b);
  const { width, height } = a;
  const expected = width * height * 4;
  if (a.data.length !== expected || b.data.length !== expected) {
    throw new Error("图片像素数据长度与宽高不符");
  }
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 255) throw new Error("阈值要在 0 到 255 之间");
  const mergeGap = Math.max(1, Math.floor(options.mergeGap ?? 16));
  const maxRegions = Math.max(1, Math.floor(options.maxRegions ?? 20));

  const total = width * height;
  const mask = new Uint8Array(total);
  const counts = HISTOGRAM_THRESHOLDS.map(() => 0);
  let changed = 0;
  let maxDiff = 0;
  let sum = 0;
  const da = a.data;
  const db = b.data;
  for (let i = 0, p = 0; i < total; i++, p += 4) {
    let d = Math.abs(da[p]! - db[p]!);
    const g = Math.abs(da[p + 1]! - db[p + 1]!);
    if (g > d) d = g;
    const bl = Math.abs(da[p + 2]! - db[p + 2]!);
    if (bl > d) d = bl;
    const al = Math.abs(da[p + 3]! - db[p + 3]!);
    if (al > d) d = al;
    sum += d;
    if (d > maxDiff) maxDiff = d;
    for (let k = 0; k < HISTOGRAM_THRESHOLDS.length; k++) {
      if (d > HISTOGRAM_THRESHOLDS[k]!) counts[k]!++;
    }
    if (d > threshold) {
      mask[i] = 1;
      changed++;
    }
  }

  const allRegions = changed === 0 ? [] : findRegions(mask, width, height, mergeGap);
  const regions = allRegions.slice(0, maxRegions);
  return {
    mask,
    report: {
      width,
      height,
      threshold,
      totalPixels: total,
      changedPixels: changed,
      changedRatio: total === 0 ? 0 : changed / total,
      maxDiff,
      meanDiff: total === 0 ? 0 : sum / total,
      histogram: HISTOGRAM_THRESHOLDS.map((t, k) => ({ threshold: t, pixels: counts[k]! })),
      regions,
      omittedRegions: allRegions.length - regions.length
    }
  };
}

/**
 * 把差异像素按网格单元聚类：含差异的单元与 8 邻域内同样含差异的单元合并。
 * 单元边长取 `gap`，所以相距不到一个单元的差异会并到同一区域。包围框仍由真实差异像素算出，
 * 不会被单元边界撑大。
 */
function findRegions(mask: Uint8Array, width: number, height: number, gap: number): DiffRegion[] {
  const cols = Math.ceil(width / gap);
  const rows = Math.ceil(height / gap);
  const cellCount = new Uint32Array(cols * rows);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    const cy = Math.floor(y / gap) * cols;
    for (let x = 0; x < width; x++) {
      if (mask[row + x]) cellCount[cy + Math.floor(x / gap)]!++;
    }
  }

  const label = new Int32Array(cols * rows).fill(-1);
  const regions: DiffRegion[] = [];
  const stack: number[] = [];
  for (let start = 0; start < cellCount.length; start++) {
    if (cellCount[start] === 0 || label[start] !== -1) continue;
    const id = regions.length;
    regions.push({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, pixels: 0 });
    label[start] = id;
    stack.push(start);
    while (stack.length > 0) {
      const cell = stack.pop()!;
      const cx = cell % cols;
      const cy = (cell - cx) / cols;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const next = ny * cols + nx;
          if (cellCount[next] === 0 || label[next] !== -1) continue;
          label[next] = id;
          stack.push(next);
        }
      }
    }
  }

  for (let y = 0; y < height; y++) {
    const row = y * width;
    const cy = Math.floor(y / gap) * cols;
    for (let x = 0; x < width; x++) {
      if (!mask[row + x]) continue;
      const region = regions[label[cy + Math.floor(x / gap)]!]!;
      if (x < region.x0) region.x0 = x;
      if (y < region.y0) region.y0 = y;
      if (x + 1 > region.x1) region.x1 = x + 1;
      if (y + 1 > region.y1) region.y1 = y + 1;
      region.pixels++;
    }
  }
  return regions.sort((l, r) => r.pixels - l.pixels);
}

const pct = (ratio: number) => `${(ratio * 100).toFixed(ratio < 0.01 ? 3 : 2)}%`;

/** 中文结论，落成文本节点。 */
export function describeReport(report: CompareReport, names: { a: string; b: string }): string {
  const lines = [`图片对比：A「${names.a}」 vs B「${names.b}」`, `尺寸 ${report.width}×${report.height}，阈值 ${report.threshold}（RGBA 通道最大差）`];
  if (report.changedPixels === 0) {
    lines.push(
      report.maxDiff === 0
        ? "结论：两张图逐像素完全一致。"
        : `结论：阈值 ${report.threshold} 下没有差异，最大通道差只有 ${report.maxDiff}，属于压缩噪点量级。`
    );
  } else {
    lines.push(
      `结论：有差异。${report.changedPixels} / ${report.totalPixels} 个像素超过阈值（${pct(report.changedRatio)}），最大通道差 ${report.maxDiff}，平均 ${report.meanDiff.toFixed(2)}。`
    );
  }
  lines.push(
    "不同阈值下的差异像素占比（越往下越接近真实内容差异）：",
    ...report.histogram.map((h) => `  > ${h.threshold}：${h.pixels}（${pct(h.pixels / report.totalPixels)}）`)
  );
  if (report.regions.length > 0) {
    lines.push("差异区域（按面积从大到小，x0,y0 – x1,y1）：");
    report.regions.forEach((r, i) => {
      lines.push(`  ${i + 1}. ${r.x0},${r.y0} – ${r.x1},${r.y1}（${r.x1 - r.x0}×${r.y1 - r.y0}，${r.pixels} 像素）`);
    });
    if (report.omittedRegions > 0) lines.push(`  …另有 ${report.omittedRegions} 个更小的区域未列出`);
    lines.push("提示：面积很小且分散的区域多半是压缩噪点，请放大核对后再下结论。");
  }
  return lines.join("\n");
}

/**
 * 画在对比图下方的摘要：比 describeReport 短——只留结论、各档阈值的像素数和最大的几个区域。
 * 完整报告仍写进 nodeData，这里是给人在节点里一眼看的。
 */
export function captionLines(report: CompareReport, names: { a: string; b: string }, maxRegions = 5): string[] {
  const lines = [`A「${names.a}」 vs B「${names.b}」 · ${report.width}×${report.height} · 阈值 ${report.threshold}`];
  if (report.changedPixels === 0) {
    lines.push(
      report.maxDiff === 0
        ? "结论：两张图逐像素完全一致。"
        : `结论：阈值 ${report.threshold} 下没有差异，最大通道差只有 ${report.maxDiff}，属于压缩噪点量级。`
    );
  } else {
    lines.push(
      `结论：有差异。${report.changedPixels} / ${report.totalPixels} 个像素超过阈值（${pct(report.changedRatio)}），最大通道差 ${report.maxDiff}，平均 ${report.meanDiff.toFixed(2)}。`
    );
  }
  lines.push(`各档阈值下的差异像素：${report.histogram.map((h) => `>${h.threshold}：${h.pixels}`).join("　")}`);
  const shown = report.regions.slice(0, maxRegions);
  shown.forEach((r, i) => {
    lines.push(`区域 ${i + 1}：${r.x0},${r.y0} – ${r.x1},${r.y1}（${r.x1 - r.x0}×${r.y1 - r.y0}，${r.pixels} 像素）`);
  });
  const hidden = report.regions.length - shown.length + report.omittedRegions;
  if (hidden > 0) lines.push(`…另有 ${hidden} 个更小的区域，完整列表见节点数据`);
  return lines;
}
