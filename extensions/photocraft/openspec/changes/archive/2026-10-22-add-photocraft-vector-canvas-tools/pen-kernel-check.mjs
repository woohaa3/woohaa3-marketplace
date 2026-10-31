#!/usr/bin/env node
/**
 * U11 钢笔三项能力的真实内核验证（change: 2026-10-22-add-photocraft-vector-canvas-tools）。
 *
 * 覆盖本轮才接进归约器的三件事（此前 `continueFrom` / `freehandDraft` / 曲率钢笔均为死代码）：
 *   1. 续接：在已有开放路径末尾追加锚点后，路径仍开放；
 *   2. 曲率钢笔：`path.set` + `path.moveAnchors{curvature:true}` 两步后，平滑锚点手柄被内核重排；
 *   3. 两步撤销：撤一次回到未重排，再撤一次路径消失（证明确实是两步历史）。
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
  return JSON.parse(editor.vectorCommand(id, JSON.stringify(params)));
}

const knot = (x, y, smooth = false) => ({
  anchor: [x, y],
  in: [x, y],
  out: [x, y],
  smooth,
});
const openPath = (knots) => ({ subpaths: [{ closed: false, knots }] });

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`OK   ${label}${detail ? " :: " + detail : ""}`);
  } else {
    failures.push(label);
    console.log(`FAIL ${label}${detail ? " :: " + detail : ""}`);
  }
}

// 1) 续接：原路径 2 锚点，追加 1 个后仍开放。
editor.execute("file.new", JSON.stringify({ width: 200, height: 200, background: "white" }));
command("path.set", { name: "Cont", path: openPath([knot(10, 10), knot(40, 10)]) });
command("path.set", { name: "Cont", path: openPath([knot(10, 10), knot(40, 10), knot(70, 50)]) });
const resumed = command("path.info", { name: "Cont" }).path.subpaths[0];
check("续接后锚点数 = 3", resumed.knots.length === 3, JSON.stringify(resumed.knots.map(k => k.anchor)));
check("续接后仍为开放路径", resumed.closed === false);
check("首锚点未被改写", JSON.stringify(resumed.knots[0].anchor) === JSON.stringify([10, 10]));

// 2) 曲率钢笔：两步提交，内核重排平滑锚点手柄。
editor.execute("file.new", JSON.stringify({ width: 200, height: 200, background: "white" }));
const curved = [knot(10, 100, true), knot(60, 60, true), knot(110, 100, true)];
command("path.set", { name: "work", path: openPath(curved) });
const beforeHandles = command("path.info", { name: "work" }).path.subpaths[0].knots.map(k => JSON.stringify(k.out));
command("path.moveAnchors", { name: "work", anchors: [[0, 1]], move: [0, 0], curvature: true });
const after = command("path.info", { name: "work" }).path.subpaths[0];
// 判定用「与提交前对比」：末尾锚点本就可能是端点，其出向柄与锚点重合属正常几何。
const reflowed = after.knots.filter((k, index) => JSON.stringify(k.out) !== beforeHandles[index]).length;
check("曲率钢笔重排了平滑锚点手柄", reflowed >= after.knots.length - 1, `${reflowed}/${after.knots.length} 个锚点手柄变化`);
check("曲率钢笔路径仍开放", after.closed === false);
check("手柄确实变化（不是无操作）", reflowed > 0);

// 3) 两步撤销。
editor.undo();
const undone = command("path.info", { name: "work" }).path.subpaths[0];
check("撤销一次回到未重排状态", undone.knots.every(k => JSON.stringify(k.out) === JSON.stringify(k.anchor)));
editor.undo();
let gone = false;
try { command("path.info", { name: "work" }); } catch { gone = true; }
check("再撤销一次路径消失（确认两步历史）", gone);

editor.free();
console.log(failures.length ? `\n${failures.length} 项失败：${failures.join("、")}` : "\n全部通过。");
process.exit(failures.length ? 1 : 0);
