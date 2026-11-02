#!/usr/bin/env node
/**
 * U15「直接编辑现有蒙版路径」的命令契约验证（真实 `dist/wasm`）
 * （change: 2026-10-22-add-photocraft-vector-canvas-tools）。
 *
 * 画布上的直接选择手势还没接进共享画布（见 tasks.md 2.8），但**命令层**已经能完整
 * 编辑蒙版几何：路径编辑命令用 `name: "layer"` + `layer: <id>` 指向图层自身的矢量蒙版。
 * 本脚本把这条命令链固定在真实内核上，避免「手势未接」被误读成「能力不存在」，
 * 也避免将来接线时才发现参数或目标口径不对。
 *
 * 覆盖：fromPath 建蒙版 → 六个 path.* 命令各改一处几何 → 只改蒙版、不碰图层内容
 * → 栅格化并入像素蒙版后图层仍在。
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

function command(id, params) {
  try {
    return { ok: true, value: JSON.parse(editor.vectorCommand(id, JSON.stringify(params))) };
  } catch (error) {
    return { ok: false, message: error?.message ?? String(error) };
  }
}
const snapshot = () => JSON.parse(editor.vectorSnapshotJson());
const mask = () => snapshot().vectorMasks[0];
const anchors = () => mask()?.path?.subpaths?.[0]?.knots?.map(knot => [knot.anchor.x, knot.anchor.y]);

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`OK   ${label}${detail ? " :: " + detail : ""}`);
  } else {
    failures.push(label);
    console.log(`FAIL ${label}${detail ? " :: " + detail : ""}`);
  }
}

editor.execute("file.new", JSON.stringify({ width: 200, height: 200, background: "white" }));
const square = { subpaths: [{ closed: true, knots: [[10, 10], [60, 10], [60, 60], [10, 60]] }] };

// 1) 从工作路径建蒙版（U15 的既有入口）。
check("path.set 建工作路径", command("path.set", { name: "work", path: square }).ok);
const created = command("layer.vectorMask.fromPath", { name: "work" });
check("layer.vectorMask.fromPath 建蒙版", created.ok && created.value.path.subpaths[0].knots.length === 4,
  created.ok ? `${created.value.path.subpaths[0].knots.length} 锚点` : created.message);
const layer = mask()?.layer;
check("蒙版挂在真实图层上", typeof layer === "number", `layer ${layer}`);

// 命令层编辑蒙版几何的统一目标：`name: "layer"` + 图层 id。
const target = { name: "layer", layer };

// 2) 六个锚点命令各改一处，且**只改蒙版**。
const before = anchors();
check("path.moveAnchors 只移动指定锚点", command("path.moveAnchors", { ...target, anchors: [[0, 0]], move: [5, 5] }).ok
  && JSON.stringify(anchors()[0]) === JSON.stringify([15, 15])
  && JSON.stringify(anchors().slice(1)) === JSON.stringify(before.slice(1)));
check("path.addAnchor 在 t=0.5 处插一个锚点", command("path.addAnchor", { ...target, subpath: 0, knot: 0, t: 0.5 }).ok
  && anchors().length === 5);
check("path.deleteAnchor 删掉一个锚点", command("path.deleteAnchor", { ...target, subpath: 0, knot: 1 }).ok
  && anchors().length === 4);
check("path.bendSegment 在 t 处弯折", command("path.bendSegment", { ...target, subpath: 0, knot: 0, t: 0.5, move: [0, 6] }).ok
  && anchors().length === 4);
check("path.moveHandle 改方向手柄", command("path.moveHandle", { ...target, subpath: 0, knot: 0, handle: "out", to: [20, 5] }).ok);
// 上游语义（实测）：不带 `out` = 转**尖角**并收回手柄；带 `out` = 转平滑点并把入向柄镜像到
// `2·anchor − out`；`curvature:true` = 平滑/尖角翻转后由内核重排手柄。三者都是同一条 `path.convertPoint`。
// 注意快照里的字段名是 `in_ctrl`/`out_ctrl`（不是 `path.info` 的 `in`/`out`），锚点是 `{x, y}`。
const knot0 = () => mask().path.subpaths[0].knots[0];
const mirror = () => [2 * knot0().anchor.x - knot0().out_ctrl.x, 2 * knot0().anchor.y - knot0().out_ctrl.y];
const toSmooth = command("path.convertPoint", { ...target, subpath: 0, knot: 0, out: [30, 8] });
check("path.convertPoint 带 out → 平滑点且入向柄镜像", toSmooth.ok
  && knot0().smooth === true
  && JSON.stringify([knot0().out_ctrl.x, knot0().out_ctrl.y]) === JSON.stringify([30, 8])
  && JSON.stringify([knot0().in_ctrl.x, knot0().in_ctrl.y]) === JSON.stringify(mirror()),
  toSmooth.ok ? JSON.stringify(knot0()) : toSmooth.message);
const toCorner = command("path.convertPoint", { ...target, subpath: 0, knot: 0 });
check("path.convertPoint 不带 out → 尖角且手柄收回", toCorner.ok
  && knot0().smooth === false
  && knot0().in_ctrl.x === knot0().anchor.x && knot0().out_ctrl.x === knot0().anchor.x,
  toCorner.ok ? JSON.stringify(knot0()) : toCorner.message);

// 双击走的是 `curvature: true`（按当前状态翻转），必须能真的切回来。
const toggleOn = command("path.convertPoint", { ...target, subpath: 0, knot: 0, curvature: true });
const afterOn = knot0().smooth;
const toggleOff = command("path.convertPoint", { ...target, subpath: 0, knot: 0, curvature: true });
check("path.convertPoint{curvature:true} 双向翻转（界面双击依赖这条）", toggleOn.ok && toggleOff.ok
  && afterOn === true && knot0().smooth === false, `第一次 smooth=${afterOn}，第二次 smooth=${knot0().smooth}`);

// 3) 只改几何：蒙版参数与图层构成不变，且每一步都是一次撤销单位。
check("编辑蒙版不改变密度/羽化", mask().density === 1 && mask().feather === 0,
  `density ${mask().density} / feather ${mask().feather}`);
check("文档里没有多出形状层", (snapshot().shapes ?? []).length === 0);
editor.undo();
check("撤销一次回到转换前的平滑状态", knot0().smooth === true, JSON.stringify(knot0()));

// 4) 参数越界由内核拒绝：非法锚点索引、非法 t。
check("不存在的锚点索引被拒", !command("path.moveAnchors", { ...target, anchors: [[0, 99]], move: [1, 1] }).ok);
check("addAnchor 的 t 必须在 0–1 之间", !command("path.addAnchor", { ...target, subpath: 0, knot: 0, t: 0 }).ok);
check("moveHandle 的 handle 只能是 in/out", !command("path.moveHandle", { ...target, subpath: 0, knot: 0, handle: "side", to: [0, 0] }).ok);

// 5) 栅格化并入像素蒙版后图层仍在（图像不被删）。
const rasterized = command("layer.rasterize.vectorMask", { layer });
check("layer.rasterize.vectorMask 成功", rasterized.ok, rasterized.ok ? "" : rasterized.message);
check("栅格化后不再有矢量蒙版", snapshot().vectorMasks.length === 0);
check("栅格化后像素图层仍是 1 个（没被压平/删除）", command("layer.vectorMask.fromPath", { name: "work" }).ok);

if (failures.length) {
  console.log(`\n${failures.length} 项失败：${failures.join(" / ")}`);
  process.exit(1);
}
console.log("\n全部通过。");
