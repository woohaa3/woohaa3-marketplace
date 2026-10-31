#!/usr/bin/env node
/**
 * 核验器接线门禁：证明 `features::vectors::inspect_document` 确实被公开入口调用，
 * 而不是只在域内单测里通过。
 *
 * 做法：用真实 WASM 造工程，改坏 manifest 里的路径字段，再交给真实原生核验器。
 * 期望（已接线）：基线工程 ok，三个 tampered 用例都被拒（`ok:false`）。
 * 若三个 tampered 用例出现 `ok:true`，说明 `lib.rs` 没有调用该判据 —— 脚本以非 0 退出。
 *
 * 这条门禁只认**公开入口的行为**：单测全绿但入口没接时，它仍然会失败。
 *
 * 依赖真实构建产物，不参与 `pnpm test`：
 *   pnpm wasm && pnpm verifier && node <本文件>
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../../..", import.meta.url).pathname;
const wasmDir = join(root, "packages/editor/dist/wasm");
const verifier = join(root, "packages/project-verifier/dist/bin/photocraft-project-verify");
const work = mkdtempSync(join(tmpdir(), "photocraft-verify-gate-"));

const tampered = [
  ["clipping_path_missing", (document) => { document.clipping_path = { name: "MISSING", flatness: 0 }; }],
  ["saved_path_empty_name", (document) => { document.paths[0].name = ""; }],
  ["saved_path_huge_coord", (document) => { document.paths[0].path.subpaths[0].knots[0].anchor = { x: 1e12, y: 0 }; }],
];

function assertBuilt() {
  try { readFileSync(verifier); } catch { throw new Error(`缺少原生核验器：${verifier}（先运行 pnpm verifier）`); }
  try { readFileSync(join(wasmDir, "photocraft_editor_bg.wasm")); } catch { throw new Error(`缺少 WASM：${wasmDir}（先运行 pnpm wasm）`); }
}

/** 用真实内核造一份含已存路径 + 裁切路径的工程，返回解包目录。 */
async function makeProject() {
  const module = await import(join(wasmDir, "photocraft_editor.js"));
  module.initSync({ module: readFileSync(join(wasmDir, "photocraft_editor_bg.wasm")) });
  const editor = new module.WasmEditor();
  editor.execute("file.new", JSON.stringify({ width: 200, height: 200, background: "white" }));
  const command = (id, params) => JSON.parse(editor.vectorCommand(id, JSON.stringify(params)));
  command("path.set", { name: "P", path: { closed: false, subpaths: [{ closed: false, knots: [{ anchor: [10, 10] }, { anchor: [50, 50] }] }] } });
  command("path.clippingPath.set", { name: "P", flatness: 0 });
  const bytes = editor.saveProject();
  editor.free();
  const archive = join(work, "base.pcraft");
  writeFileSync(archive, Buffer.from(bytes));
  const unpacked = join(work, "base");
  cpSync(archive, join(work, "base.zip"));
  execFileSync("unzip", ["-q", "-o", archive, "-d", unpacked]);
  return unpacked;
}

function repack(directory, target) {
  rmSync(target, { force: true });
  execFileSync("zip", ["-q", "-r", target, "."], { cwd: directory });
}

function verify(file) {
  try {
    return JSON.parse(execFileSync(verifier, [file], { encoding: "utf8" }));
  } catch (error) {
    // 核验失败时 CLI 以非 0 退出，但 stdout 仍是 JSON。
    return JSON.parse(String(error.stdout ?? "{}"));
  }
}

assertBuilt();
const base = await makeProject();
console.log(`基线工程：${verify(join(work, "base.pcraft")).ok ? "ok" : "被拒"}（应 ok）`);

let escaped = 0;
for (const [name, corrupt] of tampered) {
  const directory = join(work, name);
  cpSync(base, directory, { recursive: true });
  const manifestPath = join(directory, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  corrupt(manifest.document);
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const archive = join(work, `${name}.pcraft`);
  repack(directory, archive);
  const result = verify(archive);
  if (result.ok) escaped += 1;
  console.log(`tampered/${name}: ${result.ok ? "ACCEPTED（缺陷：lib.rs 未调用 inspect_document）" : "rejected（正确）"}`);
}

rmSync(work, { recursive: true, force: true });
if (escaped) {
  console.error(`\n${escaped}/${tampered.length} 个损坏工程逃过核验：lib.rs 未调用 features::vectors::inspect_document。`);
  process.exit(1);
}
console.log(`\n全部 ${tampered.length} 个损坏工程被拒：路径核验已接线。`);
