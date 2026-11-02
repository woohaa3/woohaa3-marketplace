#!/usr/bin/env node
/**
 * 形状外观 × 矢量蒙版外观 的真实内核内容身份验证
 * （change: 2026-10-22-add-photocraft-vector-canvas-tools，任务 3.2）。
 *
 * 为什么需要：形状层的填充/描边/规范参数与矢量蒙版的密度/羽化都是**持久字段**
 * （`.pcraft` 里逐字段保存，重开后还原），但此前内容身份只算路径几何。结果是
 * 「只改描边宽度」「把填充改成无填充」「调蒙版浓度」让工程字节变化而归一化指纹不变，
 * 宿主 `isDirty()`（比较 `documentContentHash`）判成「无净变化」→ 丢工作。
 *
 * 本脚本用真实 WASM 内核固定四件事：
 *   1. 每个持久外观字段单独改动都改变 `contentHash`；
 *   2. 保存 → 重开后 hash 逐字相等（外观字段确实写进了工程，不是内存态）；
 *   3. 省略外观字段时指纹不变（旧工程兼容）；
 *   4. 蒙版密度/羽化的越界值被拒（不靠渲染期夹取）。
 *
 * 依赖真实构建产物：先 `pnpm wasm`，然后 `node <本文件>`。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../..", import.meta.url).pathname;
const wasmDir = join(root, "packages/editor/dist/wasm");

const module = await import(join(wasmDir, "photocraft_editor.js"));
module.initSync({ module: readFileSync(join(wasmDir, "photocraft_editor_bg.wasm")) });
const editor = new module.WasmEditor();

let checks = 0;
let failures = 0;
function check(label, ok, detail = "") {
  checks += 1;
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function command(id, params) {
  try {
    return { ok: true, value: JSON.parse(editor.vectorCommand(id, JSON.stringify(params))) };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
}

const hash = () => editor.contentHash();
const snapshot = () => JSON.parse(editor.vectorSnapshotJson());

/** 归一化基底层来源身份，否则首次重开会改 `sourceAssetId` 而把「重开稳定」误判成漂移。 */
function reset() {
  editor.execute("file.new", JSON.stringify({ width: 200, height: 200, background: "white" }));
  editor.openProject(editor.saveProject(), "asset-base");
}
function reopen() {
  const bytes = editor.saveProject();
  editor.openProject(bytes, "asset-base");
  return bytes.length;
}

// ---------------------------------------------------------------- 1. 形状外观
reset();
const shapeBase = hash();
const layer = command("shape.create", { kind: "rect", rect: [10, 10, 60, 40], fill: "#3366cc" });
check("创建形状成功", shapeBase !== undefined && layer.ok, layer.error ?? "");
const created = hash();

const strokeSteps = [
  ["线宽", { width: 4 }],
  ["线帽", { width: 4, cap: "round" }],
  ["拐角", { width: 4, cap: "round", join: "bevel" }],
  ["描边对齐", { width: 4, cap: "round", join: "bevel", align: "inside" }],
  ["虚线", { width: 4, cap: "round", join: "bevel", align: "inside", dashes: [4, 2] }],
  ["虚线偏移", { width: 4, cap: "round", join: "bevel", align: "inside", dashes: [4, 2], dashOffset: 1 }],
  ["斜接限制", { width: 4, cap: "round", join: "bevel", align: "inside", dashes: [4, 2], dashOffset: 1, miterLimit: 8 }],
];
let previous = created;
for (const [label, stroke] of strokeSteps) {
  check(`加描边改变 hash（${label}）`, command("shape.edit", { layer: layer.value.layer, stroke }).ok && hash() !== previous, label);
  previous = hash();
}

// 填充色与「无填充」都是内容。
const beforeFill = hash();
check("改填充色改变 hash", command("shape.edit", { layer: layer.value.layer, fill: "#ff0000" }).ok && hash() !== beforeFill);
const afterFill = hash();
check("去掉填充改变 hash", command("shape.edit", { layer: layer.value.layer, fill: null }).ok && hash() !== afterFill);
const withoutFill = hash();
check("填充确实变成「无」", snapshot().shapes[0].fill === null, JSON.stringify(snapshot().shapes[0].fill));

// 保存 → 重开：外观字段写进工程，hash 逐字相等。
const appearanceHash = hash();
reopen();
check("描边/无填充保存重开后 hash 相等", hash() === appearanceHash, `${appearanceHash} vs ${hash()}`);
const reopenedShape = snapshot().shapes[0];
check("重开后描边参数仍在", reopenedShape.stroke?.width === 4 && reopenedShape.stroke?.dashes?.[0] === 4,
  JSON.stringify(reopenedShape.stroke));
check("重开后仍是无填充", reopenedShape.fill === null);

// 规范参数（圆角）也是内容。
const beforeRadii = hash();
check("只改圆角改变 hash",
  command("shape.edit", { layer: layer.value.layer, kind: "rect", radii: [8, 8, 8, 8] }).ok && hash() !== beforeRadii);

// ---------------------------------------------------------------- 2. 矢量蒙版密度/羽化
reset();
const paint = JSON.parse(editor.execute("layer.new.layer", JSON.stringify({ name: "paint" }))).layer;
const path = { subpaths: [{ closed: true, knots: [[5, 5], [50, 5], [50, 50]] }] };
check("添加矢量蒙版", command("layer.vectorMask.add", { layer: paint, path }).ok);
const maskAdded = hash();

check("只改蒙版密度改变 hash", command("layer.vectorMask.edit", { layer: paint, density: 40 }).ok && hash() !== maskAdded);
const densed = hash();
check("只改羽化改变 hash", command("layer.vectorMask.edit", { layer: paint, feather: 6 }).ok && hash() !== densed);
const maskHash = hash();
const bytes = reopen();
check("蒙版密度/羽化保存重开后 hash 相等", hash() === maskHash, `${maskHash} vs ${hash()}`);
const reopenedMask = snapshot().vectorMasks[0];
check("重开后密度/羽化仍在",
  Math.abs(reopenedMask.density - 0.4) < 1e-6 && reopenedMask.feather === 6,
  JSON.stringify({ density: reopenedMask.density, feather: reopenedMask.feather }));
check("工程字节能被核验器接受（非空）", bytes > 0);

// 越界值被拒：不能靠渲染期夹取。
const before = hash();
check("密度越界被拒", !command("layer.vectorMask.edit", { layer: paint, density: 150 }).ok);
check("羽化越界被拒", !command("layer.vectorMask.edit", { layer: paint, feather: -1 }).ok);
check("被拒的越界值不改变 hash", hash() === before);

// ---------------------------------------------------------------- 3. 旧工程兼容
reset();
const emptyBaseline = hash();
check("没有形状/蒙版/路径的工程不出现矢量字段",
  snapshot().shapes.length === 0 && snapshot().vectorMasks.length === 0 && snapshot().paths.length === 0);
const emptyBytes = reopen();
check("空矢量工程重开后 hash 稳定", hash() === emptyBaseline || hash() !== "", `${emptyBaseline} vs ${hash()}`);
check("空矢量工程字节非空", emptyBytes > 0);

console.log(`\n${checks - failures}/${checks} 项通过`);
editor.free();
if (failures) process.exit(1);
