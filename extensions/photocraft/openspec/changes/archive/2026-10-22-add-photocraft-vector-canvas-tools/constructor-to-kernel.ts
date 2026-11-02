/**
 * 域内构造器 → 真实 WASM 内核（change: 2026-10-22-add-photocraft-vector-canvas-tools）。
 *
 * 为什么需要：手写参数的冒烟测试测不出「TS 构造器发的东西内核不认」。这里把
 * `packages/editor/src/features/vectors/*.ts` 的构造器打包后，**原样**把它们的输出交给
 * `packages/editor/dist/wasm`，参数一个字都不手写。
 *
 * 用法（先 `pnpm wasm`）：
 *   pnpm exec esbuild openspec/changes/<change>/constructor-to-kernel.ts \
 *     --bundle --platform=node --format=cjs --outfile=/tmp/c2k.cjs
 *   node /tmp/c2k.cjs
 *
 * 输出以 `OK` / `REJ` 逐项列出；`REJ` 未必是缺陷（有几条是故意留的探针边界），
 * 本 change 的判定记录见 verification.md「域内构造器 → 真实内核」一节。
 */
import { shapeCreateParams, type ShapeKind, type ShapeDrag } from "../../../packages/editor/src/features/vectors/shape-tools.js";
import {
  PATH_MATRIX, booleanCommand, booleanParams, clippingPathParams, selectionToShapeParams, transformParams,
  type BooleanOp,
} from "../../../packages/editor/src/features/vectors/boolean-ops.js";
import {
  defineCustomShapeParams, newPresetParams, placePresetParams, presetEditParams,
} from "../../../packages/editor/src/features/vectors/presets.js";
import {
  MASK_ACTIONS, maskEditParams, maskFromPathParams, rasterizeMaskParams,
} from "../../../packages/editor/src/features/vectors/mask-edit.js";
import {
  addAnchorParams, bendSegmentParams, commandForDrag, convertPointParams, deleteAnchorParams, type PathHit,
} from "../../../packages/editor/src/features/vectors/path-edit.js";
import { pathSetParams } from "../../../packages/editor/src/features/vectors/pen-tools.js";

declare const require: (id: string) => { readFileSync(path: string): Buffer };
declare const process: {
  cwd(): string;
  exit(code: number): never;
};

const fs = require("fs");
const nodePath = require("node:path") as { join(...parts: string[]): string };
// 以仓库根（photocraft/）为基准：直接运行时 cwd 可能不同，故允许用 PHOTOCRAFT_DIR 覆盖。
const root = (process as unknown as { env: Record<string, string | undefined> }).env.PHOTOCRAFT_DIR ?? process.cwd();
const wasmDir = nodePath.join(root, "packages/editor/dist/wasm");

type Editor = {
  execute(id: string, params: string): string;
  vectorCommand(id: string, params: string): string;
  vectorSnapshotJson(): string;
  saveProject(): Uint8Array;
  free(): void;
};

let editor: Editor;
let accepted = 0;
let rejected = 0;

function run(id: string, params: unknown): unknown {
  return JSON.parse(editor.vectorCommand(id, JSON.stringify(params)));
}

function report(label: string, id: string, params: unknown): void {
  try {
    run(id, params);
    accepted += 1;
    console.log(`OK   ${label} [${id}]`);
  } catch (error) {
    rejected += 1;
    let message = String(error);
    try { message = JSON.parse((error as { message: string }).message || "{}").message ?? message; } catch { /* 原样 */ }
    console.log(`REJ  ${label} [${id}] :: ${message}`);
  }
}

async function main(): Promise<void> {
  const module = await import(`${wasmDir}/photocraft_editor.js`);
  module.initSync({ module: fs.readFileSync(`${wasmDir}/photocraft_editor_bg.wasm`) });
  editor = new module.WasmEditor();
  editor.execute("file.new", JSON.stringify({ width: 260, height: 200, background: "white" }));

  console.log("=== 形状（7 种）===");
  for (const kind of ["rect", "roundedRect", "ellipse", "triangle", "polygon", "star", "line"] as ShapeKind[]) {
    const drag: ShapeDrag = { kind, start: [20, 20], end: [120, 90], modifiers: {}, radius: 8, sides: 6, starRatio: 0.4, weight: 3 };
    try {
      report(`shapeCreateParams(${kind})`, "shape.create", { ...shapeCreateParams(drag, [260, 200]), fill: "#3366cc" });
    } catch (error) {
      console.log(`REJ  shapeCreateParams(${kind}) 构造期抛错 :: ${(error as Error).message}`);
    }
  }

  console.log("=== 布尔（5 种）===");
  for (const op of ["unite", "subtractFrontShape", "intersectShapeAreas", "excludeOverlappingShapes", "mergeShapeComponents"] as BooleanOp[]) {
    editor.execute("file.new", JSON.stringify({ width: 260, height: 200, background: "white" }));
    for (const rect of [[10, 10, 100, 80], [60, 40, 100, 80]]) {
      run("shape.create", {
        ...shapeCreateParams({ kind: "rect", start: [rect[0], rect[1]], end: [rect[0] + rect[2], rect[1] + rect[3]], modifiers: {} } as ShapeDrag, [260, 200]),
        fill: "#ff0000",
      });
    }
    report(`booleanParams(${op})`, booleanCommand(op), booleanParams(op));
  }

  console.log("=== 路径变换 / 裁切 ===");
  editor.execute("file.new", JSON.stringify({ width: 260, height: 200, background: "white" }));
  run("path.set", pathSetParams("P", { subpaths: [{ closed: false, knots: [
    { anchor: [10, 120], in: [10, 120], out: [10, 120], smooth: false },
    { anchor: [60, 140], in: [60, 140], out: [60, 140], smooth: false },
    { anchor: [110, 120], in: [110, 120], out: [110, 120], smooth: false },
  ] }] }));
  report("transformParams", "path.transform", transformParams({ name: "P" }, PATH_MATRIX.translate(5, 5)));
  report("clippingPathParams", "path.clippingPath.set", clippingPathParams("P"));
  // 选区为空时内核必然拒绝：这里只确认参数形状能被解析（拒绝原因应提到 selection）。
  report("selectionToShapeParams（无选区，预期被拒）", "select.convertToShape", selectionToShapeParams({ tolerance: 1 }));

  console.log("=== 预设库 ===");
  editor.execute("file.new", JSON.stringify({ width: 260, height: 200, background: "white" }));
  run("path.set", pathSetParams("Box", { subpaths: [{ closed: true, knots: [
    { anchor: [0, 0], in: [0, 0], out: [0, 0], smooth: false },
    { anchor: [40, 0], in: [40, 0], out: [40, 0], smooth: false },
    { anchor: [40, 40], in: [40, 40], out: [40, 40], smooth: false },
    { anchor: [0, 40], in: [0, 40], out: [0, 40], smooth: false },
  ] }] }));
  report("defineCustomShapeParams", "edit.defineCustomShape", defineCustomShapeParams("Box", "Box"));
  report("newPresetParams", "shape.presets.new", newPresetParams("Box", { path: "Box" }));
  report("placePresetParams", "shape.presets.place", placePresetParams("Box", [10, 10, 50, 50], { fill: "#3366cc" }));
  report("presetEditParams(rename)", "shape.presets.edit", presetEditParams({ action: "rename", preset: "Box", name: "Box2" }));
  report("presetEditParams(newGroup)", "shape.presets.edit", presetEditParams({ action: "newGroup", name: "G1" }));
  report("presetEditParams(move)", "shape.presets.edit", presetEditParams({ action: "move", preset: "Box2", to: "G1" }));
  // 分组管理与删除（U16「重命名 / 分组 / 删除」的真实内核口径）。
  report("presetEditParams(renameGroup)", "shape.presets.edit", presetEditParams({ action: "renameGroup", group: "G1", name: "G2" }));
  report("presetEditParams(delete)", "shape.presets.edit", presetEditParams({ action: "delete", preset: "Box2", group: "G2" }));
  report("presetEditParams(deleteGroup)", "shape.presets.edit", presetEditParams({ action: "deleteGroup", group: "G2" }));

  console.log("=== 矢量蒙版（目标层用真实 id）===");
  editor.execute("file.new", JSON.stringify({ width: 260, height: 200, background: "white" }));
  run("path.set", pathSetParams("Box", { subpaths: [{ closed: true, knots: [
    { anchor: [5, 5], in: [5, 5], out: [5, 5], smooth: false },
    { anchor: [80, 5], in: [80, 5], out: [80, 5], smooth: false },
    { anchor: [80, 80], in: [80, 80], out: [80, 80], smooth: false },
  ] }] }));
  report("maskFromPathParams", MASK_ACTIONS.fromPath, maskFromPathParams(null, "Box"));
  const layer = (JSON.parse(editor.vectorSnapshotJson()) as { vectorMasks: { layer: number }[] }).vectorMasks[0]?.layer;
  if (layer != null) {
    report("maskEditParams(density)", MASK_ACTIONS.edit, maskEditParams(layer, { density: 40, feather: 12 }));
    report("maskEditParams(invert)", MASK_ACTIONS.edit, maskEditParams(layer, { invert: true }));
    // 命令入参 0–100、快照回读 0–1：这是有意分流，不是缺陷。要在栅格化之前读。
    const density = (JSON.parse(editor.vectorSnapshotJson()) as { vectorMasks: { density: number }[] }).vectorMasks[0]?.density;
    console.log(`     快照 density=${density}（0–1 口径；命令入参 40 对应回读 0.4）`);
    report("rasterizeMaskParams", MASK_ACTIONS.rasterize, rasterizeMaskParams(layer));
  }

  console.log("=== 锚点编辑 ===");
  editor.execute("file.new", JSON.stringify({ width: 260, height: 200, background: "white" }));
  run("path.set", pathSetParams("Q", { subpaths: [{ closed: false, knots: [
    { anchor: [10, 120], in: [10, 120], out: [10, 120], smooth: false },
    { anchor: [60, 150], in: [60, 150], out: [60, 150], smooth: false },
    { anchor: [110, 120], in: [110, 120], out: [110, 120], smooth: false },
  ] }] }));
  const hit: PathHit = { subpath: 0, knot: 1, kind: "anchor", distance: 0 };
  report("addAnchorParams", "path.addAnchor", addAnchorParams({ name: "Q" }, hit, 0.5).params);
  report("bendSegmentParams", "path.bendSegment", bendSegmentParams({ name: "Q" }, { ...hit, knot: 0 }, [0, 10], 0.5).params);
  report("commandForDrag(anchor)", "path.moveAnchors", commandForDrag({ hit, from: [60, 150], to: [63, 154] }, { name: "Q" }).params);
  report("commandForDrag(handle)", "path.moveHandle", commandForDrag({ hit: { ...hit, kind: "out" }, from: [60, 150], to: [70, 160] }, { name: "Q" }).params);
  report("convertPointParams(smooth)", "path.convertPoint", convertPointParams({ name: "Q" }, hit, [70, 160]).params);
  report("convertPointParams(corner)", "path.convertPoint", convertPointParams({ name: "Q" }, hit).params);
  report("deleteAnchorParams", "path.deleteAnchor", deleteAnchorParams({ name: "Q" }, hit).params);

  editor.free();
  console.log(`\n接受 ${accepted} 项，拒绝 ${rejected} 项（拒绝项需对照 verification.md 的判定）。`);
}

main().catch(error => {
  console.error("FATAL", error);
  process.exit(1);
});
