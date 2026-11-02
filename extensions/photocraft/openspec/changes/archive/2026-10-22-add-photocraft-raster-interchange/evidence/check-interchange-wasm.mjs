#!/usr/bin/env node
/**
 * 真实 WASM 的栅格交换逐项验证（change: 2026-10-22-add-photocraft-raster-interchange）。
 *
 *   node openspec/changes/2026-10-22-add-photocraft-raster-interchange/evidence/check-interchange-wasm.mjs
 *
 * 前置：`pnpm -C photocraft run wasm`（产物在 packages/editor/dist/wasm）。
 * 本脚本不进 UI，只验证内核绑定与本文档记录的行为一致：矩阵、预览/交付同源、
 * 拒绝路径、逐层/资产打包、打开预检与内容指纹不变。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");
const dir = path.join(root, "packages/editor/dist/wasm");
const mod = await import(path.join(dir, "photocraft_editor.js"));
mod.initSync({ module: fs.readFileSync(path.join(dir, "photocraft_editor_bg.wasm")) });
const log = (label, value) => console.log(`${label}: ${JSON.stringify(value)}`);
const sig = (bytes) => Array.from(bytes.slice(0, 4));

const editor = new mod.WasmEditor();
editor.execute("file.new", JSON.stringify({ width: 32, height: 24 }));
editor.execute("layer.new.layer", JSON.stringify({ name: "图标.png" }));
editor.execute("edit.fillForeground", JSON.stringify({ color: "#3366cc" }));
editor.execute("layer.new.layer", JSON.stringify({ name: "背景2" }));
editor.execute("edit.fillForeground", JSON.stringify({ color: "#cc3366" }));

const matrix = JSON.parse(editor.interchangeMatrixJson());

// 宿主 accept 清单与内核矩阵必须同源：`OPEN_RASTER_*` 是宿主选择器用的静态清单，
// 这里用真实产物复核它不是拍脑袋写的（漂移会导致「选得中但打不开」）。
{
  const protocol = await import(path.join(root, "packages/protocol/dist/index.js"));
  const openable = matrix.formats.filter((row) => row.status === "open" || row.status === "read-only");
  const kernelExtensions = [...new Set(openable.flatMap((row) => row.extensions))].sort();
  const kernelMimes = [...new Set(openable.map((row) => row.mime))].sort();
  log("hostAcceptParity", {
    kernelExtensions: kernelExtensions.length,
    protocolExtensions: [...protocol.OPEN_RASTER_EXTENSIONS].sort().length,
    extensionsEqual: JSON.stringify(kernelExtensions) === JSON.stringify([...protocol.OPEN_RASTER_EXTENSIONS].sort()),
    mimesEqual: JSON.stringify(kernelMimes) === JSON.stringify([...protocol.OPEN_RASTER_MIMES].sort()),
    acceptHasTiff: protocol.OPEN_RASTER_ACCEPT.includes(".tiff"),
    acceptHasPcraft: protocol.OPEN_RASTER_ACCEPT.includes("pcraft"),
    deferredExcluded: ["exr", "hdr", "cin", "fits", "dpx", "avif", "heif"]
      .every((extension) => !protocol.OPEN_RASTER_EXTENSIONS.includes(extension)),
    // 端口返回值（`io.openAccept()`）需要 EditorHandle，由 wasm-integration.test.ts 覆盖同源。
    acceptHasNoProject: !protocol.OPEN_RASTER_ACCEPT.includes("pcraft")
  });
}
log("matrix.rows", {
  rows: matrix.formats.length,
  open: matrix.formats.filter((row) => row.status === "open").length,
  readOnly: matrix.formats.filter((row) => row.status === "read-only").length,
  deferred: matrix.formats.filter((row) => row.status === "deferred").length,
  openable: matrix.openable.length
});
log("exportMatrix", JSON.parse(editor.exportMatrixJson()).map((row) => row.format));

const hashBefore = editor.contentHash();
for (const params of [
  { format: "jpg", quality: 80 },
  { format: "webp", webpQuality: 75 },
  { format: "tif", tiffCompression: "lzw" },
  { format: "png" },
  { mode: "web", format: "png24" },
  { mode: "web", format: "png8", colors: 32 },
  { mode: "web", format: "jpeg", quality: 70 }
]) {
  const preview = editor.previewExport(JSON.stringify(params));
  const delivery = editor.exportRaster(JSON.stringify(params));
  const report = JSON.parse(delivery.reportJson);
  log(`export ${JSON.stringify(params)}`, {
    signature: sig(preview.bytes),
    bytes: preview.bytes.length,
    width: report.width,
    height: report.height,
    mime: report.mime,
    previewEqualsDelivery: preview.bytes.length === delivery.bytes.length && preview.bytes.every((v, i) => v === delivery.bytes[i]),
    previewFlag: [JSON.parse(preview.reportJson).preview, report.preview],
    documentChanged: report.documentChanged,
    colors: report.colors
  });
  preview.free();
  delivery.free();
}

const scaled = editor.exportRaster(JSON.stringify({ format: "png", width: 16 }));
log("scaled export", { width: JSON.parse(scaled.reportJson).width, height: JSON.parse(scaled.reportJson).height });
scaled.free();

for (const rejected of [
  { format: "exr" },
  { format: "png", percent: 50, width: 8 },
  // 预设自带格式与所选格式不一致：明确拒绝，而不是让两套格式互相覆盖。
  { mode: "web", format: "gif", preset: "JPEG High" },
  { format: "jpg", quality: 0 }
]) {
  try {
    const accepted = editor.exportRaster(JSON.stringify(rejected));
    accepted.free();
    console.log(`UNEXPECTED ACCEPT ${JSON.stringify(rejected)}`);
  } catch (error) {
    log(`reject ${JSON.stringify(rejected)}`, String(error).slice(0, 60));
  }
}

const plan = JSON.parse(editor.inspectLayerExport(JSON.stringify({ format: "png" })));
log("layer plan", plan.layers.map((layer) => `${layer.fileName}:${layer.width}x${layer.height}`));
const bundle = editor.exportLayerBundle(JSON.stringify({ format: "png" }));
const bundleReport = JSON.parse(bundle.reportJson);
log("layer bundle", {
  bytes: bundle.bytes.length,
  signature: sig(bundle.bytes),
  ok: bundleReport.okCount,
  failed: bundleReport.failedCount,
  files: bundleReport.files.map((file) => file.fileName)
});
const inspected = JSON.parse(editor.inspectIoBundle(bundle.bytes));
log("bundle inspect", { files: inspected.files.map((file) => file.name), hasReport: !!inspected.report });
bundle.free();

const single = editor.exportLayerAs(JSON.stringify({ format: "png" }));
log("export as", { bytes: single.bytes.length, signature: sig(single.bytes) });
single.free();

const assets = JSON.parse(editor.inspectImageAssets());
log("asset plan", assets.assets.map((file) => file.fileName));
const assetBundle = editor.exportImageAssets();
log("asset bundle", { bytes: assetBundle.bytes.length, files: JSON.parse(assetBundle.reportJson).files.map((file) => file.fileName) });
assetBundle.free();

// 打开：用真实 PNG 输出，验证预检不建文档、打开才替换、损坏输入不误接受。
const png = editor.exportRaster(JSON.stringify({ format: "png" }));
const pngBytes = png.bytes.slice();
png.free();
const target = new mod.WasmEditor();
log("inspectRaster", JSON.parse(target.inspectRaster(pngBytes)));
log("hasDocumentBeforeOpen", target.hasDocument());
target.openRaster("图.png", pngBytes);
log("hasDocumentAfterOpen", { has: target.hasDocument(), name: JSON.parse(target.stateJson()).document.name });
for (const [label, bytes] of [["corrupt", new Uint8Array([1, 2, 3])], ["empty", new Uint8Array()]]) {
  try {
    target.openRaster(`${label}.png`, bytes);
    console.log(`UNEXPECTED ${label} ACCEPT`);
  } catch (error) {
    log(`${label} rejected`, String(error).slice(0, 60));
  }
}
target.free();

// 逐格式打开：可写格式用自己的真实产物，只读格式用手工构造的真实签名字节。
const openResults = [];
for (const format of ["png", "jpg", "tif", "webp", "gif", "bmp", "tga", "ico", "qoi", "pnm"]) {
  const encoded = editor.exportRaster(JSON.stringify({ format }));
  const bytes = encoded.bytes.slice();
  encoded.free();
  const probe = new mod.WasmEditor();
  try {
    const info = JSON.parse(probe.inspectRaster(bytes));
    probe.openRaster(`probe.${format}`, bytes);
    const doc = JSON.parse(probe.stateJson()).document;
    openResults.push({ format, via: "own-encoder", status: info.status, depth: info.depth, size: `${doc.width}x${doc.height}` });
  } catch (error) {
    openResults.push({ format, via: "own-encoder", error: String(error).slice(0, 80) });
  }
  probe.free();
}
const readOnly = [
  ["pcx", (() => {
    const bytes = new Uint8Array(128 + 8);
    bytes.set([0x0a, 5, 1, 8]);
    bytes[8] = 1;
    bytes.set([0x2c, 0x01, 0x96, 0x00], 12);
    bytes[65] = 3;
    bytes[66] = 2;
    bytes[68] = 1;
    bytes.set([0xc1, 0xff, 0x00, 0x00, 0xc1, 0xff, 0x00, 0x00], 128);
    return bytes;
  })()],
  ["xpm", new TextEncoder().encode('/* XPM */\nstatic char *i[] = {\n"2 2 2 1",\n"a c #ff0000",\n"b c #0000ff",\n"ab",\n"ba"\n};\n')],
  ["dds", (() => {
    const bytes = new Uint8Array(128 + 16);
    const view = new DataView(bytes.buffer);
    bytes.set([0x44, 0x44, 0x53, 0x20], 0);
    view.setUint32(4, 124, true);
    view.setUint32(8, 0x1007, true);
    view.setUint32(12, 2, true);
    view.setUint32(16, 2, true);
    view.setUint32(76, 32, true);
    view.setUint32(80, 0x41, true);
    view.setUint32(88, 32, true);
    view.setUint32(92, 0x000000ff, true);
    view.setUint32(96, 0x0000ff00, true);
    view.setUint32(100, 0x00ff0000, true);
    view.setUint32(104, 0xff000000, true);
    view.setUint32(108, 0x1000, true);
    bytes.set([0, 0, 255, 255, 0, 255, 0, 255, 255, 255, 0, 255, 0, 0, 0, 255], 128);
    return bytes;
  })()]
];
for (const [format, bytes] of readOnly) {
  const probe = new mod.WasmEditor();
  try {
    const info = JSON.parse(probe.inspectRaster(bytes));
    probe.openRaster(`probe.${format}`, bytes);
    const doc = JSON.parse(probe.stateJson()).document;
    openResults.push({ format, via: "handmade-fixture", status: info.status, depth: info.depth, size: `${doc.width}x${doc.height}` });
  } catch (error) {
    openResults.push({ format, via: "handmade-fixture", error: String(error).slice(0, 80) });
  }
  probe.free();
}
log("openResults", openResults);

// 工程往返：打开 PNG → 存 .pcraft → 新实例重开 → 再存再重开。
const roundTrip = (() => {
  const source = new mod.WasmEditor();
  source.openRaster("art.png", pngBytes);
  const reencoded = source.exportRaster(JSON.stringify({ format: "png" })).bytes.slice();
  const project = source.saveProject();
  const first = JSON.parse(source.stateJson()).document;
  const restored = new mod.WasmEditor();
  restored.openProject(project, "art.png");
  const second = JSON.parse(restored.stateJson()).document;
  const restoredAgain = restored.saveProject();
  const third = new mod.WasmEditor();
  third.openProject(restoredAgain, "art.png");
  const value = {
    reencodedEqualsSource: JSON.stringify(reencoded) === JSON.stringify(Array.from(pngBytes)) || Buffer.compare(Buffer.from(reencoded), Buffer.from(pngBytes)) === 0,
    canvasEqual: first.canvasWidth === second.canvasWidth && first.canvasHeight === second.canvasHeight,
    layersEqual: first.layers.length === second.layers.length,
    nameEqual: first.name === second.name,
    hashStableAfterReopen: restored.contentHash() === third.contentHash()
  };
  source.free();
  restored.free();
  third.free();
  return value;
})();
log("projectRoundTrip", roundTrip);

// 失败场景：截断 / 超预算 / 16 位。预检与打开的结论必须一致（不能预检拒、打开收）。
const failures = (() => {
  const makePng = (width, height, bitDepth) => {
    const crcTable = (() => {
      const table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
      return table;
    })();
    const crc32 = (bytes) => {
      let crc = 0xffffffff;
      for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    };
    const chunk = (type, data) => {
      const out = new Uint8Array(12 + data.length);
      const view = new DataView(out.buffer);
      view.setUint32(0, data.length);
      out.set(new TextEncoder().encode(type), 4);
      out.set(data, 8);
      view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
      return out;
    };
    const ihdr = new Uint8Array(13);
    const header = new DataView(ihdr.buffer);
    header.setUint32(0, width);
    header.setUint32(4, height);
    ihdr[8] = bitDepth;
    ihdr[9] = 2;
    const sampleBytes = bitDepth === 16 ? 2 : 1;
    const raw = new Uint8Array(Math.max(1, Math.min(height, 2)) * (1 + Math.min(width, 2) * 3 * sampleBytes));
    const blocks = [0x78, 0x01];
    let offset = 0;
    do {
      const size = Math.min(65535, raw.length - offset);
      const last = offset + size >= raw.length ? 1 : 0;
      blocks.push(last, size & 0xff, size >> 8, ~size & 0xff, (~size >> 8) & 0xff);
      for (let index = 0; index < size; index++) blocks.push(raw[offset + index]);
      offset += size;
    } while (offset < raw.length);
    let a = 1;
    let b = 0;
    for (const byte of raw) {
      a = (a + byte) % 65521;
      b = (b + a) % 65521;
    }
    blocks.push((b >> 8) & 0xff, b & 0xff, (a >> 8) & 0xff, a & 0xff);
    const parts = [
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", Uint8Array.from(blocks)),
      chunk("IEND", new Uint8Array())
    ];
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let at = 0;
    for (const part of parts) { out.set(part, at); at += part.length; }
    return out;
  };
  const cases = [
    ["truncated", pngBytes.slice(0, Math.floor(pngBytes.length * 0.6))],
    ["oversized", makePng(100000, 100000, 8)],
    ["16-bit", makePng(2, 2, 16)]
  ];
  return cases.map(([label, bytes]) => {
    const probe = new mod.WasmEditor();
    let inspectError = null;
    let openError = null;
    try { probe.inspectRaster(bytes); } catch (error) { inspectError = String(error); }
    try { probe.openRaster(`${label}.png`, bytes); } catch (error) { openError = String(error); }
    probe.free();
    return {
      label,
      inspectRejected: inspectError !== null,
      openRejected: openError !== null,
      // 关键：预检与打开必须给出同一结论。
      consistent: (inspectError !== null) === (openError !== null),
      reason: (inspectError ?? "").slice(0, 90)
    };
  });
})();
log("failureMatrix", failures);

log("contentHashUnchangedByExports", hashBefore === editor.contentHash());
editor.free();
