#!/usr/bin/env node
/**
 * U16 形状库管理（重命名 / 分组 / 移动 / 删除）的真实内核验证
 * （change: 2026-10-22-add-photocraft-vector-canvas-tools）。
 *
 * 为什么需要：U16 要求「预设选择/保存/重命名/分组/删除」，但面板此前只有
 * 选择/保存/删除，重命名与分组没有入口。补 UI 前先把内核的真实口径固定下来：
 *
 *   - 内置组里的预设**必须带 `group`** 才能被找到（`presets::find` 按组收窄）；
 *   - 「自定形状」是 edit_state 里的合成组，**不能**带 `group`（带组名会被拒）；
 *   - 自定形状不支持 `move`（上游 `edit` 只对 `presets.shapes` 做 move）；
 *   - `newGroup` 重名会自动改名成 `X 1`，`renameGroup`/`deleteGroup` 对缺失组报错。
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

/** 成功返回 value，失败返回 {error}，让拒绝用例也能被断言。 */
function command(id, params) {
  try {
    return { ok: true, value: JSON.parse(editor.vectorCommand(id, JSON.stringify(params))) };
  } catch (error) {
    return { ok: false, message: error?.message ?? String(error) };
  }
}
const library = () => JSON.parse(editor.vectorPresetsJson());

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
const initial = library();
check("内置库初始有 5 组", initial.groups.length >= 5, `${initial.groups.length} 组`);
const group0 = initial.groups[0].name;
const shape0 = initial.groups[0].shapes[0].name;

// 1) 新建分组 + 重名自动改名。
const created = command("shape.presets.edit", { action: "newGroup", name: "Mine" });
check("newGroup 建组", created.ok && created.value.group === "Mine", JSON.stringify(created.value ?? created.message));
const dup = command("shape.presets.edit", { action: "newGroup", name: "Mine" });
check("newGroup 重名自动改名", dup.ok && dup.value.group === "Mine 1", dup.ok ? dup.value.group : dup.message);

// 2) 重命名内置预设必须带 group。
const wrong = command("shape.presets.edit", { action: "rename", preset: shape0, group: "NoSuchGroup", name: "X" });
check("组名不符时拒绝（证明 group 是真收窄条件）", !wrong.ok, wrong.message ?? "");
const renamed = command("shape.presets.edit", { action: "rename", preset: shape0, group: group0, name: "HeartX" });
check("带 group 重命名内置预设成功", renamed.ok && renamed.value.name === "HeartX", JSON.stringify(renamed.value ?? renamed.message));
check("重命名不改变几何摘要", library().groups[0].shapes[0].digest === initial.groups[0].shapes[0].digest);

// 3) 移动到已存在的分组；目标不存在时内核按 `group_index` 新建。
const moved = command("shape.presets.edit", { action: "move", preset: "HeartX", group: group0, to: "Mine" });
check("move 内置预设到目标组", moved.ok && moved.value.group === "Mine", JSON.stringify(moved.value ?? moved.message));
const afterMove = library();
check("源组减少、目标组增加", afterMove.groups.find(g => g.name === group0).shapes.length === initial.groups[0].shapes.length - 1
  && afterMove.groups.find(g => g.name === "Mine").shapes.length === 1);

// 4) 分组重命名、删除，以及「删库不伤已应用形状」。
const renamedGroup = command("shape.presets.edit", { action: "renameGroup", group: "Mine", name: "Mine2" });
check("renameGroup 成功", renamedGroup.ok && renamedGroup.value.group === "Mine2", JSON.stringify(renamedGroup.value ?? renamedGroup.message));
const place = command("shape.presets.place", { preset: "HeartX", group: "Mine2", rect: [8, 8, 40, 40] });
const layer = place.ok ? place.value.layer : undefined;
check("从重命名后的分组放置预设", layer != null, `layer ${layer}`);
const shapePath = (id) => JSON.stringify((JSON.parse(editor.vectorSnapshotJson()).shapes ?? []).find(shape => shape.layer === id));
const before = layer == null ? null : shapePath(layer);
const deletedGroup = command("shape.presets.edit", { action: "deleteGroup", group: "Mine2" });
check("deleteGroup 成功且报告删除条数", deletedGroup.ok && deletedGroup.value.deleted === 1, JSON.stringify(deletedGroup.value ?? deletedGroup.message));
check("删除分组后已应用的形状几何不变", layer != null && before != null && before === shapePath(layer));
check("缺失分组报错", !command("shape.presets.edit", { action: "deleteGroup", group: "Mine2" }).ok);

// 5) 自定形状：重命名不带 group；带 group 会被拒；move 不支持。
command("path.set", { name: "work", path: { subpaths: [{ closed: true, knots: [[4, 4], [40, 4], [40, 40], [4, 40]] }] } });
const defined = command("edit.defineCustomShape", { name: "Cust", path: "work" });
check("defineCustomShape 成功", defined.ok, JSON.stringify(defined.value ?? defined.message));
const customRename = command("shape.presets.edit", { action: "rename", preset: "Cust", name: "Cust2" });
check("自定形状重命名（不带 group）成功", customRename.ok && library().custom[0].name === "Cust2", JSON.stringify(customRename.value ?? customRename.message));
const customWithGroup = command("shape.presets.edit", { action: "rename", preset: "Cust2", group: "Mine 1", name: "Cust3" });
check("自定形状带 group 被拒（面板据此不传 group）", !customWithGroup.ok, customWithGroup.message ?? "");
const customMove = command("shape.presets.edit", { action: "move", preset: "Cust2", to: group0 });
check("自定形状不支持组间移动（面板禁用该按钮）", !customMove.ok, customMove.message ?? "");
const customDelete = command("shape.presets.edit", { action: "delete", preset: "Cust2" });
check("自定形状可删除", customDelete.ok && library().custom.length === 0, JSON.stringify(customDelete.value ?? customDelete.message));

// 6) 删库不伤已应用形状（与既有 U16 结论一致，这里再固定一次）。
check("恢复默认形状后仍可放置", command("shape.presets.reset", {}).ok && command("shape.presets.place", { preset: "Heart", group: "Symbols", rect: [8, 8, 40, 40] }).ok);

if (failures.length) {
  console.log(`\n${failures.length} 项失败：${failures.join(" / ")}`);
  process.exit(1);
}
console.log("\n全部通过。");
