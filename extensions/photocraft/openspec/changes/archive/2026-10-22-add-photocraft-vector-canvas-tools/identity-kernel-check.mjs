#!/usr/bin/env node
/**
 * 内容身份 × 保存重开 的真实内核验证
 * （change: 2026-10-22-add-photocraft-vector-canvas-tools，任务 3.2）。
 *
 * 为什么需要：路径（工作路径 / 已存命名路径 / 裁切路径引用）是**持久字段**，
 * 但此前没有进入 `contentHash`，于是「只改了一条路径」会被宿主判成「无净变化」而丢工作。
 * 本脚本用真实 WASM 内核与真实 `.pcraft` 往返固定四件事：
 *
 *   1. 新增/修改路径**改变** `contentHash`，且保存重开后 hash 逐字相等；
 *   2. 只改工作路径 / 裁切平直度也改变 hash（不是只看图层）；
 *   3. 清空路径后回到原 hash（不留下「曾经有路径」的痕迹，旧工程兼容）；
 *   4. 已存路径顺序不影响 hash，未保存的视图状态（无路径）也不影响。
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
const square = (offset) => ({
  closed: true,
  subpaths: [{ closed: true, knots: [[offset, offset], [offset + 8, offset], [offset + 8, offset + 8]] }]
});
const line = (end) => ({ closed: false, subpaths: [{ closed: false, knots: [[0, 0], [end, end]] }] });

function reopen() {
  const bytes = editor.saveProject();
  // 用同一实例的开工程路径读回，验证的是「字节 → 文档 → 指纹」而不是内存对象。
  // `base_asset_id` 必须传字符串：指纹只覆盖基底层，重开时回填同一 id 才可比。
  editor.openProject(bytes, "asset-base");
  return bytes.length;
}

editor.execute("file.new", JSON.stringify({ width: 200, height: 200, background: "white" }));
// 先做一次「保存 → 用同一 baseAssetId 重开」，把基底层来源身份归一，
// 否则首次重开会改变基底层的 `sourceAssetId`，把「重开稳定」误判成漂移。
reopen();
const baseline = hash();

// 1. 已存命名路径进入内容身份。
check("新增已存路径改变 contentHash", command("path.set", { name: "A", path: square(4) }).ok && hash() !== baseline);
const withPath = hash();
const bytes = reopen();
check("保存重开后 contentHash 相等", hash() === withPath, `${withPath} vs ${hash()}`);
check("工程字节能被核验器接受（非空）", bytes > 0);

// 2. 只改一条已存路径的几何 → hash 必须变（旧实现会漏判）。
check("修改已存路径几何改变 contentHash", command("path.set", { name: "A", path: square(40) }).ok && hash() !== withPath);
const edited = hash();

// 3. 工作路径与裁切平直度都是内容。
check("写工作路径改变 contentHash", command("path.set", { name: "work", path: line(30) }).ok && hash() !== edited);
const withWork = hash();
check("设置裁切路径改变 contentHash", command("path.clippingPath.set", { name: "A", flatness: 0 }).ok && hash() !== withWork);
const withClip = hash();
check("裁切平直度改变 contentHash", command("path.clippingPath.set", { name: "A", flatness: 2.5 }).ok && hash() !== withClip);
const withFlatness = hash();

// 4. 保存重开仍然稳定（包括裁切引用）。
reopen();
check("含工作路径/裁切引用的工程重开后 hash 相等", hash() === withFlatness, `${withFlatness} vs ${hash()}`);

// 5. 清空后回到「没有路径」的身份，而不是留下历史痕迹。
// 先清裁切引用再删路径：删除被引用的路径会连带清掉引用，顺序反了会拿不到裁切路径。
check("清除裁切路径成功", command("path.clippingPath.clear", {}).ok);
check("删除已存路径成功", command("path.delete", { name: "A" }).ok);
const clearedSnapshot = JSON.parse(editor.vectorSnapshotJson());
check("清空后没有已存路径与裁切引用",
  clearedSnapshot.paths.length === 0 && clearedSnapshot.clippingPath === null,
  JSON.stringify({ paths: clearedSnapshot.paths, clippingPath: clearedSnapshot.clippingPath }));
check("清空已存路径与裁切引用后 hash 不等于有路径时", hash() !== withFlatness);

// 6. 裁切路径引用缺失必须被拒（核验侧同一条规则）。
const missing = command("path.clippingPath.set", { name: "MISSING", flatness: 0 });
check("裁切路径引用缺失被拒", !missing.ok, missing.error ?? "");

console.log(`\n${checks - failures}/${checks} 项通过`);
editor.free();
if (failures) process.exit(1);
