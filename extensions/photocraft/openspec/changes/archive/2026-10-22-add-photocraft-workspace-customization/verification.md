# 验收计划与记录

## 实施状态（2026-10-23 本轮）

本 change 的域内实现、外壳适配层、**共享外壳消费端**与自动化验证均已完成；`pnpm -C photocraft run check` 全绿。
偏好现在真的接管运行中的按键、菜单、工具栏、工作区重排与工具选项恢复（见「外壳接入验证」）。

任务 4.2/4.3 的电脑/Pad 主线已在**真实 Chromium**（Playwright 驱动 `dev` 独立宿主，真实 WASM +
真实 React 外壳）于 1440×1000 与 1024×768 各执行两套主线并留证 34 张截图（见「真实 UI 主线执行记录」与「补充主线」）。
这轮实测抓出并修掉了两个自动化测不到的真实缺陷：中文命令搜不到、面板被侧栏裁掉。

仍未采集的是**桌面 GUI 人工观感与真实 GPU 渲染**（本机无显示会话、无 `renderD*`），单列为任务 4.7。

实现基线 `b61da631`（含结构前置与 `bdc3c084` 实现提交）。上游固定来源
`4e7a17cd5d5723313f459753663d0d155f047e19`。会话绑定见文末。

## 逐子能力矩阵（U78）

| 子能力 | 实现 | 自动化证据 | 外壳/宿主接入 | 状态 |
| --- | --- | --- | --- | --- |
| 命令搜索（模糊 + 关键字 + 最近使用） | `command-palette.ts`：只索引 `allowed` 命令，禁用项带原因 | `command-palette.test.ts`（9 项，含中文标签替换） | 面板直接使用 | 完成 |
| 搜索执行同一门禁动作 | 执行经 `controller.dispatch`；偏好命中后仍由命令门复核 | `panels.test.tsx` 执行/失败/只读/禁用用例 | 使用既有门禁，无第二写入口 | 完成 |
| 自定义快捷键 | `preferences.ts` 组合键解析、覆盖、解绑、恢复出厂、按键匹配；`shell-adapter.ts::resolveWithPreferences` 保证改绑/解绑后旧出厂组合真的失效 | `preferences.test.ts` 解析/匹配/解绑 9 项、`shell-adapter.test.ts` 改绑失效 3 项、`workspace.test.ts` 会话端口 1 项、宿主 `customization-interaction.test.tsx` 改绑/解绑 1 项 | 已接入：`photo-editor-app.tsx` 用 `useCustomizationPreferences()` + `resolveWithPreferences(...)` | 完成 |
| 键位冲突处理 | 冲突返回候选；「覆盖」只解绑同组合动作，「取消」保留原绑定；工具组/剪贴蒙版共用不算冲突 | `preferences.test.ts` 冲突 3 项、`panels.test.tsx` 覆盖/取消 | 无 | 完成 |
| 浏览器保留键 | 可保存，标注「浏览器可能拦截」，不承诺拦截 | `preferences.test.ts`、`panels.test.tsx` | 无 | 完成 |
| IME/输入控件不误触发 | 组合解析、面板按键、偏好匹配都跳过 `isComposing`/229；输入框走 `editorInputConsumesKeys` | `preferences.test.ts`、`panels.test.tsx`、`shell-adapter.test.ts` | 适配层保留同一判定 | 完成 |
| 工具栏隐藏/顺序 | 有界写入、恢复出厂；`toolbarToolIds` 合并出厂顺序/过期 id/新增工具 | `preferences.test.ts`、`panels.test.tsx`、`shell-contract.test.ts`、`shell-consumption.test.tsx` 隐藏/顺序/组语义 2 项 | 已接入：`EditorToolRail` 用 `toolbarRenderGroups(preferences)`（含共用按钮的组语义） | 完成 |
| 菜单隐藏 | 有界写入、出厂菜单项清单（含宿主文件项）、整组隐藏不留空菜单 | `preferences.test.ts`、`panels.test.tsx`、`shell-adapter.test.ts`、`shell-consumption.test.tsx` 隐藏项/提示跟随 2 项 | 已接入：`EditorMenuBar` 用 `filterHiddenMenuItems` + `shortcutHint` | 完成 |
| 工作区保存/应用/删除 | 保存快捷键+工具栏+菜单+面板几何；应用恢复并交回几何；上限 8；应用后再改设置自动取消「当前工作区」标记 | `preferences.test.ts` 工作区 3 项、`panels.test.tsx`、`workspace.test.ts`、宿主 `customization-interaction.test.tsx` 当场重排 1 项 | 已接入：`workspacePanelLayout(...)` → `display.updatePanels(...)`（经 `FeaturePanelContext.applyPanelLayout`），当场重排 | 完成 |
| 恢复默认 | 单动作、单分组、全部三类入口 | `preferences.test.ts`、`panels.test.tsx` | 无 | 完成 |
| 工具选项记忆 | 有界 `rememberToolOptions`/`clearToolOptions`；`brushOptionValues`/`restoreBrushOptions` 只取数值字段 | `preferences.test.ts`、`workspace.test.ts`、`shell-adapter.test.ts`、宿主 `customization-interaction.test.tsx` 恢复/记忆 2 项 | 已接入：外壳在切换画笔类工具时 `restoreBrushOptions`，数值变化时 `rememberToolOptions` | 完成 |
| 偏好持久化与版本 | 版本化键 `woohaa.image-editor.customization.v1`；版本失配/坏 JSON 整体拒绝并保留旧数据；写入失败回滚 | `preferences.test.ts` 存储 4 项、`storage-roundtrip.test.ts` 真实 `localStorage` 5 项 | 无 | 完成 |
| 偏好导入/导出 | JSON 导出/导入；默认浏览器下载，宿主可换端口；离线明确提示；导入时被丢弃的条目逐条回报，版本失配说明版本而非笼统「格式非法」 | `preferences.test.ts`、`panels.test.tsx` | `exportPreferences` 端口 | 完成 |
| 改偏好不改文档 | 偏好不进入工程字节/内容 hash/历史；面板「文档门禁」只挡命令执行 | `workspace.test.ts`、`features:check` 快照等价 | 无 | 完成 |
| 真实电脑/Pad UI 主线 | — | Playwright + 真实 Chromium 于 1440×1000 / 1024×768 各跑两套主线，34 张截图，控制台零错误 | 真实 WASM + 真实外壳 | 完成（4.2/4.3） |
| 桌面 GUI 人工观感与真实 GPU 渲染 | — | 未采集 | 无显示会话、无 `renderD*` | **待人工验证**（4.7） |

## 本轮实际执行的检查与结果

全部在本工作树执行；命令与结果如实记录。

| 命令 | 结果 |
| --- | --- |
| `pnpm -C photocraft run check` | **通过**：build + typecheck + test；`protocol` 70 项、`project-verifier` 40 项、`editor` 49 文件 **377** 项全部通过 |
| `pnpm -C photocraft/packages/editor exec vitest run src/features/customization` | **通过**：10 文件 **108** 项（`packages/editor` 内，含外壳消费层 `shell-consumption.test.tsx` 5 项） |
| `pnpm -C photocraft run rust:test` | **通过**：280 项，0 失败（本轮无 Rust 改动，沿用上一轮结果；`git status` 已确认 `rust/`、`packages/protocol`、`vendor/` 未改动） |
| `pnpm -C photocraft run wasm` | **通过**：`packages/editor/dist/wasm`（wasm 17.36 MiB，glue 90.5 KiB） |
| `pnpm -C photocraft run verifier` | **通过**：`packages/project-verifier/dist/bin/photocraft-project-verify`（3.84 MiB） |
| `pnpm -C photocraft run features:check` | **通过**：命令、能力、错误、8 组内容/状态快照、撤销/重做/取消与 PNG 字节与 `bdc3c084` 基线一致（本域未新增命令或能力） |
| `pnpm -C photocraft/integrations/woohaa test` | **通过**：35 文件 280 项（含宿主 `photo-editor-app` 54 项、新增 `customization-interaction.test.tsx` 5 项、菜单/快捷键/变换/绘画交互） |
| `pnpm --filter @woohaa3/photocraft-woohaa run typecheck`（在仓库根运行） | **通过** |
| `pnpm --filter @woohaa3/frontend run typecheck`（在仓库根运行） | **通过** |
| `pnpm boundary:check` | **通过**（6 项），本域只 import 包内与 `@woohaa3/photocraft-protocol` |
| `pnpm codemap:check` | **通过**（47 manifest / 11 篇文档 / 1358 链接 / 8 模块入口） |

> 上一轮记录的 `Cannot find module 'react'` 是干净副本缺 `node_modules/.pnpm/react@18.3.1`
> （适配包 `vitest.config.ts` 用它做 React 别名）。链接本机 pnpm store 中同一版本的
> React/ReactDOM 后通过；该缺陷属仓库副本环境，不是本 change 的代码问题。
>
> `rust:test` 首次运行曾因**磁盘写满**（`/data` 仅剩 472M，`ld` 报 `Bus error`）链接失败；
> 删掉 `rust/target/debug/incremental`（2.2G 构建缓存）后 280 项全部通过。Rust 源码零改动，
> `git status` 可证 `rust/`、`packages/protocol`、`vendor/` 均未修改。这是环境容量问题，
> 与本 change 无关，记录在此避免后续误判为回归。

域内回归覆盖（10 文件 108 项）：

- `preferences.test.ts`（29）：组合解析/规范化、非法组合拒绝、IME 与平台修饰键、浏览器保留键标注、
  出厂清单可重解析、版本失配、未知动作/超限条目丢弃、存储写入失败回滚、无存储降级、冲突覆盖/取消、
  工具组共享字母、解绑与出厂、工具栏/菜单有界、工具选项边界、工作区保存/应用/删除/上限与「改设置即
  离开当前工作区」、导出导入往返与导入告警、订阅通知、按键匹配（含 `=`/`+` 等价）。
- `command-palette.test.ts`（9）：模糊评分、`allowed` 过滤（未开放命令不出现在搜索且不可执行）、
  禁用原因、完全同名优先、最近使用加权与上限、空查询回退、显示名换成菜单中文标签而英文原名保留为
  关键字（中文/英文都能命中）。
- `panels.test.tsx`（21）：搜索执行走同一 `dispatch`、失败保留错误、禁用项不执行、IME 不执行、
  方向键只移动高亮、空结果、内核给英文 label 时列表标题仍是中文且中英文都能搜到、冲突覆盖/取消、
  IME 不绑定、Esc 取消捕获、单动作出厂、显式解绑与再出厂、**出厂组合无需先改绑即可直接解绑**、
  工具栏/菜单隐藏不触发文档命令、工作区捕获/应用/删除、导出走宿主端口与离线提示、存储不可用与
  写入失败提示、导入告警可见、全部恢复出厂、文档门禁只挡命令执行、命令表更新后搜索随之刷新。
- `workspace.test.ts`（5）：偏好快照与订阅、按键解析随偏好变化、外壳按键端口（改绑后旧出厂组合失效、
  恢复出厂后重新生效）、工作区几何交回、工具选项记忆不改绑定。
- `customization-feature.test.ts`（4）：只贡献一个 section、无新增工具、菜单归属与自带隐藏规则、
  在共享 `FEATURE_SECTIONS`/`FEATURE_PANELS`/`featureMenuSections` 装配中可见。
- `shell-adapter.test.ts`（23）：每个出厂绑定翻译出的分派形状与 `resolveEditorShortcut` 完全相同、
  **改绑/解绑后旧出厂组合不再触发**、工具组共用字母仍组内循环、`Delete` 按文档状态的分派不被抑制、
  IME 与平台修饰键、菜单提示换算、隐藏菜单项不出现在菜单但仍在搜索里、工具栏顺序与过期 id、
  隐藏工具仍留在设置清单可重新启用、**共用按钮的工具组按组渲染（隐藏组内一项不连累另一项、整组都
  隐藏才消失、每组只出现一次且顺序跟随偏好）**、工作区几何规范化、画笔选项恢复与未记忆不覆盖、
  解绑后搜索提示不显示过期组合。
- `shell-contract.test.ts`（5）：工具栏 id 与 `PHOTO_TOOLS` 一致、可定制命令 id 与菜单叶子 id 一致、
  宿主文件菜单项可被隐藏清单引用、每个可定制动作都能翻译成共享 `EditorShortcut`。
- `storage-roundtrip.test.ts`（5）：真实 `localStorage` 写入后新仓库读回（等同重载保留偏好）、
  落盘 JSON 只有版本/动作 id/布局参数、存储拒绝写入时整体失败且保留原设置、存储读取抛错时降级并给出
  原因、完全无存储时明确只在会话内保留。
- `use-customization-preferences.test.tsx`（2）：偏好变化触发外壳重渲染、快照引用稳定不无限重渲染、
  无变化写入不发布新状态（不产生多余渲染）。
- `shell-consumption.test.tsx`（5，**真实外壳组件**）：隐藏的菜单项从 `EditorMenuBar` 消失且运行时
  取消隐藏立即回来（证明读的是订阅而非一次性快照）、快捷键提示跟随改绑且解绑后不显示出厂组合、
  「窗口」菜单出现定制入口并能打开对应面板、`EditorToolRail` 隐藏工具后消失、顺序偏好生效、
  隐藏组内一项不连累同组另一项。

宿主应用层回归（`integrations/woohaa/tests/customization-interaction.test.tsx`，5 项，走真实
`PhotoEditorApp` 与真实键盘事件）：

- 改绑 `edit.undo` 到 `Mod+U` 后 **`Mod+Z` 不再触发撤销、`Mod+U` 立即触发**；解绑后两者都不触发
  （也不会偷偷回退出厂键位）。
- 解绑工具组共用字母中的一个（`tool.wand`）后，`W` 仍能切到组内另一个工具，不会整组哑掉。
- 切走再切回画笔恢复上次尺寸，且修订号不变、无文档命令（工具偏好不造 dirty）。
- 全新会话直接选画笔时按已记忆选项起始（出厂 24 被 96 覆盖，硬度 0.35 → 35），证明恢复读偏好
  而不是上次会话内存。
- 应用命名工作区后**当场**改变面板宽度（280px → 420px）与槽位折叠状态，提示为「工作区已应用」
  而非「重新打开编辑器后生效」。

## 真实 UI 主线执行记录（任务 4.2 / 4.3）

本机没有显示会话（`DISPLAY` 未设置、无 `renderD*`），因此**没有**用桌面截图冒充验收。改为在
**真实 Chromium**（Playwright 1.63 自带 chromium-1243，`--use-gl=swiftshader`）里驱动
`dev` 独立宿主（真实 WASM 内核 + 真实 React 外壳），在两个目标尺寸各跑一遍同一主线：

- 1440×1000（电脑）
- 1024×768（Pad 正常窗口）

启动方式：`pnpm -C photocraft/dev exec vite --port 4399 --strictPort`；驱动脚本与截图存放在本
change 的 `evidence/`（`mainline.mjs` 为主线，`extra-mainline.mjs` 为下节的补充主线，都可直接重跑）。注意仓库里 4318 端口可能已被
**另一个工作树**的 dev 服务占用，本轮首次跑就撞上了（`photocraft-channel-workflows`），会测到别处的
代码；因此显式换端口并在测试前核对「窗口」菜单里能看到定制入口。

### 逐步结果（两个尺寸结果一致）

| 步骤 | 操作 | 实际结果 |
| --- | --- | --- |
| 1 入口 | 窗口 ▸ 工作区、快捷键与命令搜索… | 菜单项存在，点击后面板打开（`1440x1000-01-panel.png`） |
| 2 搜索 | 搜索框输入「撤销」 | 命中 1 条 `edit.undo`，显示中文标题与 `Ctrl+Z`（`*-02-search.png`） |
| 3 改绑 | `edit.undo` 绑定 `Ctrl+U` | 行内提示变为 `Ctrl+U`（`*-03-rebind.png`） |
| 4 真实按键 | 先建一个图层（rev 1→2），再按 `Ctrl+Z` / `Ctrl+U` | **`Ctrl+Z` 不撤销（rev 保持 2）、`Ctrl+U` 撤销（rev 2→3）**——旧键位确实失效 |
| 5 工具栏 | 取消勾选「画笔」 | 工具栏画笔按钮数量 0（`*-04-toolbar-hidden.png`） |
| 6 菜单 | 取消勾选「重做」 | 「编辑 ▸ 重做」从菜单消失 |
| 7 工作区 | 命名「审查工作区」并保存 | 列表出现 1 个预设（`*-05-workspace-saved.png`） |
| 8 重载 | 刷新页面后重读 `localStorage` | 存储字节完全一致（`sameBytes: true`），`shortcuts['edit.undo'] = "Mod+U"`、`workspaces[0].name = "审查工作区"`（`*-06-after-reload.png`） |
| 9 冲突 | 把 `edit.undo` 绑到 `Ctrl+Shift+Z` | 出现「Ctrl+Shift+Z 已被「撤销、重做」使用」+「覆盖 / 取消」（`*-07b-conflict-visible.png`） |
| 10 取消冲突 | 点「取消」 | `edit.undo` 仍是 `Mod+U`，未被改写 |
| 11 恢复默认 | 存储页「全部恢复出厂」 | `workspaces: 0`、`toolbarHidden: []`、`menuHidden: []`、`shortcuts: {}`（`*-08-after-reset.png`） |
| 12 不改文档 | 全程观察 | 只有第 4 步主动建图层推进修订；偏好操作本身不产生修订/历史/内容变化 |

两个尺寸下控制台**零错误**（`console-errors: none`）。

> 说明：第 3 步的「改绑」在 `dev` 宿主里用 `Ctrl` 修饰键（Linux 无 Meta），保存的规范组合仍是
> `Mod+U`，因此重载后读到的值是两个平台都成立的 `Mod+U`。

### 本轮由此发现的两个真实缺陷（已修）

真实浏览器暴露出两个自动化测试没覆盖到的问题：

1. **中文命令搜不到**。内核命令表自报英文名（`Undo`/`Redo`），搜索直接拿它当标题与匹配文本，
   于是「撤销」「重做」「图层」**全部 0 结果**，只有输入 `undo` 才有。界面菜单是中文，用户看到
   的名字和能搜到的名字不是一套。修法：搜索用同一 id 换成菜单中文标签，英文名保留为关键字
   （`labelFor` 端口），中文与英文输入都能命中同一条命令。回归：`command-palette.test.ts` 新增
   「显示名可换成界面中文标签，英文原样保留为关键字」。
2. **面板被侧栏裁掉**。定制面板的类（`advanced-group` / `customization-row` / `-results` 等）
   **完全没有 CSS**，行内「绑定 / 出厂 / 解绑」按钮在 240–280px 宽的侧栏里被直接裁出视野，
   两个目标尺寸都能复现——功能“存在”但按钮点不到。修法：在 `photo-editor.css` 补一段最小样式，
   让分组框、行、搜索框与结果列表换行、`min-width: 0` 并允许纵向滚动。修复后按钮全部可见可达。

   这段样式**逐条限定在** `[data-advanced-section="customization"]` 下：`.photo-editor__advanced-group`
   是 10 个功能的高级面板共用类，不加限定的写法会把 selections/adjustments/filters 等面板的间距和
   边框一起改掉，超出本 change 范围。已用浏览器核对：其他功能的高级分组仍是 `padding: 0px`、
   `border-width: 0px`，与本 change 之前一致；样式表规则总数 399 条、无解析中断。

这两个缺陷的共同点与快捷键缺陷一样：**只测域内纯函数/单测发现不了**，必须在真实外壳、真实尺寸
下走一遍。因此 4.2/4.3 的实测不是形式验收，而是抓到了会直接影响可用的缺陷。

## 补充主线：4.2 原先未覆盖的子能力（本轮补测）

上一轮主线验证了「搜索出结果 / 改绑生效 / 隐藏画笔 / 存工作区后存储不变 / 冲突提示 / 恢复出厂」，
但下列子能力只是单测覆盖，**没有在真实 UI 里跑过**，因此当时不足以支撑 4.2 的全量结论。本轮补齐
（脚本 `evidence/extra-mainline.mjs`，两个尺寸结果一致，各 8 张截图）：

| 子能力 | 真实 UI 操作 | 实际结果 |
| --- | --- | --- |
| 搜索**执行**（不只出结果） | 搜「新建图层」并点执行 | 命中 1 条；**文档修订 1→2**，提示「已执行「新建图层…」」；清空搜索后最近使用把它排到第一（`*-00-search-execute.png`） |
| 工具栏**顺序** | 把「画笔」上移一位 | 存储 `toolbarOrder` 变为 `…tool.wand, tool.brush, tool.quick…`，即画笔真的排到快速选择之前（`*-01-order.png`） |
| 工作区**几何当场重排** | 存 `width=420` 的工作区，把侧栏改回 280，再点「应用」 | 侧栏实测宽度 **280 → 420**，提示「工作区已应用」，不是「重开后生效」（`*-03-workspace-applied.png`） |
| 工具选项**跨重载记忆** | 画笔尺寸设 96 → 切橡皮 → 切回 → 刷新页面重新导入图片 | 同会话内仍为 96；**重载后仍是 96**；存储里 `toolOptions.brush.size=96`、`eraser.size=24` 互不污染（`*-04-brush-restored.png`） |
| 菜单隐藏的实际渲染 | 隐藏「重做」后打开「编辑」菜单 | 菜单里**没有**「重做」，「撤销」仍在（`*-05-menu-hidden.png`） |
| 共用按钮组不误伤 | 只隐藏「魔棒」，再隐藏「快速选择」 | 隐藏魔棒后按钮变成「快速选择」（**整组没消失**）；两个都隐藏后该组才消失 |
| 解绑后键位真的失效 | 解绑工具 `B`，切到矩形选框后按 `B` | 仍是「矩形选框」，`B` 不再切画笔（`*-06-unbound.png`） |
| 偏好导出 | 点「导出 JSON」 | 下载 `photocraft-customization.json`，1451 字节，含 `shortcuts`（`*-07-storage.png`） |
| 导入失败不破坏设置 | 导入 `{ this is not json` | 提示「偏好文件不是有效 JSON」，**存储字节完全未变** |
| 版本失配说明具体原因 | 导入 `version: 99` | 提示「偏好版本不匹配（期望 1，实际 99）」，不是笼统「格式非法」 |
| 合法导入 | 导入刚导出的文件 | 提示「偏好已导入」 |

两个尺寸下控制台**零错误**。工具栏顺序的**渲染**顺序没有逐个移动是正确行为：魔棒/快速选择、
修复/修饰各自折成一个按钮并占两个槽位，因此以存储的 `toolbarOrder` 为准判定，渲染只作旁证。

## 本轮新发现并修复的缺陷：出厂组合无法直接解绑

真实操作「解绑工具 B」时发现按钮是 **disabled**：原实现把「解绑」绑定在 `overridden`
（该动作是否已被用户改过）上，于是**出厂默认组合必须先随便改绑一次才能解绑**。而底层
`setShortcut(id, "")` 一直支持直接解绑，外壳 `resolveWithPreferences` 也把空串正确当成
「不再认领出厂组合」。

这是一个纯 UI 层的多余门槛，正好挡住最常用的「我不想要这个快捷键」。修法：`disabled` 只在
当前已空绑时成立。回归 `panels.test.tsx` 增「出厂组合无需先改绑即可直接解绑」，并把原用例里
「未自定义时不可点」的旧断言改正。反向验证：把条件改回 `|| !overridden`，两条用例都失败。

### 与任务勾选的关系

- 4.2 的主线（搜索并**执行** → 改键位/工具栏**顺序**/菜单 → 保存工作区重载与**当场重排** →
  冲突处理与恢复默认 → 工具选项**跨重载**记忆 → 导入导出失败路径 → 不改文档）已在上述两套真实
  浏览器自动化中执行并留证；主线的每一步都能对应到逐子能力矩阵里的一行。
- 但**桌面 GUI 人工走查与真实 GPU 渲染观感**（字体、对比、动画、真实鼠标拖拽手感）仍未采集：
  本机无显示会话、无 `renderD*`。这部分按 AGENTS.md 要求标注为「待人工验证」，不冒充已通过。

## 本轮修正的域内缺陷

实施收尾时发现并修掉三处真实缺陷（都在本域单写文件内，需回归锁定，否则接入外壳后是错的）：

1. **改绑/解绑后旧出厂组合仍然生效**。原适配层只提供 `preferredShortcut`（偏好认领，未命中返回
   `null`）并建议外壳写成 `preferredShortcut(...) ?? resolveEditorShortcut(...)`；偏好认领不到就
   回退出厂解析，于是把 `Mod+Z` 改成 `Mod+U`、或解绑撤销后，`Mod+Z` 仍会撤销——「自定义快捷键」
   实际无效。现新增 `resolveWithPreferences`（偏好优先、出厂兜底，但被用户显式改过的出厂组合不再
   认领），并区分：工具组共用字母仍在组内循环、剪贴蒙版开关与 `Delete` 按文档状态的分派不参与抑制。
   会话端口相应为 `resolveCustomizationKey`。见 `shell-adapter.test.ts`（21 项）与 `workspace.test.ts`。
2. **导入偏好会静默丢条目**。`importJson` 丢弃未知动作/非法组合后仍报「导入成功」，用户看不出设置
   少了；版本失配也报笼统「格式非法」。现成功结果带回 `warnings` 并在界面逐条显示，版本失配说明
   期望/实际版本；`importJson` 里恒等的 `code === "version" ? "invalid" : "invalid"` 一并清理。
3. **「当前工作区」标记会撒谎**。应用工作区后再改快捷键/工具栏/菜单，界面仍标着该工作区为当前。
   现 `commit` 在设置偏离工作区快照时清除 `activeWorkspace`（工具选项等快照外内容不打断标记）。

另外把面板里「面板几何在重新打开编辑器后生效」改为按是否提供实时布局端口显示，避免给了端口
仍提示需要重开。

## 外壳接入验证（已落地）

上一轮为了遵守「共享文件单写」把外壳接入留成补丁。本轮用户明确授权修改这些共享文件，因此
**已实际接入并提交到工作树**，不再存在「适配层齐全但外壳没调用」的状态——那正是让整个功能看起来
无效的原因。

| 接入项 | 实际改动 |
| --- | --- |
| 键盘分派 | `photo-editor-app.tsx`：`useCustomizationPreferences()` + `resolveWithPreferences(customizer, event.nativeEvent, isEditorMac())` 替换 `resolveEditorShortcut` |
| 菜单隐藏 + 快捷键提示 | `photo-editor-chrome.tsx`：`menuItems()` 先过 `filterHiddenMenuItems(entries, preferences.menuHidden)`；提示改用 `shortcutHint(preferences, id, isMac, factory)` |
| 工具栏隐藏/排序/分组 | `photo-editor-chrome.tsx`：`EditorToolRail` 改为遍历 `toolbarRenderGroups(preferences)`；工具组（魔棒/快速选择、修复/修饰）按组折叠，隐藏组内一项不会带走整组 |
| 工作区当场重排 | `features/panel-context.ts` 新增可选 `applyPanelLayout` 端口；`photo-editor-app.tsx` 用 `workspacePanelLayout(...)` → `display.updatePanels(...)` 实现它；`sections.tsx` 透传给面板 |
| 工具选项恢复/记忆 | `photo-editor-app.tsx`：切换到画笔类工具时 `restoreBrushOptions`，数值变化时 `defaultCustomizationStore().rememberToolOptions(tool, brushOptionValues(brush))` |
| 「窗口」菜单入口 | `sections.tsx` 的 `menu` 改为「窗口」；`photo-editor-chrome.tsx` 为窗口菜单渲染 `featureMenuSections("窗口")` |

### 反向验证（证明测试真的锁住了接入，而不是恰好通过）

每一条都先把接入改动撤掉，确认对应用例**确实失败**，再恢复：

| 撤掉的改动 | 失败表现 |
| --- | --- |
| 键盘分派换回 `resolveEditorShortcut` | 「改绑后旧组合不再触发」失败（`Mod+Z` 仍撤销）；工具组解绑用例也失败（`W` 整组哑掉） |
| 去掉 `restoreBrushOptions` 调用 | 「全新会话按已记忆选项起始」失败：期望 `96`，实际出厂 `24` |
| 去掉 `FeaturePanelContext.applyPanelLayout` 端口 | 「工作区应用后当场重排」失败：期望 `420px`，实际 `280px` |
| 去掉面板的 `labelFor`（中文标签替换） | 「内核自报英文名时…」失败：列表里没有「撤销」 |

全量回归：`pnpm -C photocraft run check` 通过（editor 49 文件 377 项），宿主 35 文件 280 项通过。

## 未执行 / 待人工验证（真实原因）

- **桌面 GUI 人工观感与真实 GPU 渲染**（任务 4.7）：本机为无显示会话的 Linux 容器（`DISPLAY` 未设置），
  且未检出 `renderD*` 渲染节点。功能与布局可达性已由 Playwright + 真实 Chromium 的电脑/Pad 主线覆盖
  （见上节），但字体/对比/动画、真实鼠标拖拽手感与硬件渲染帧率仍未采集，不作为「已通过」记录。
- **PSD/工程往返**：本 change 不新增持久内容字段，偏好不进入工程字节，`features:check` 的工程/PNG
  字节等价已覆盖「不改工程」。

## 用户本轮要求的缺陷修复

用户指出「报告说使定制功能失效的快捷键缺陷」。定位结果是两层问题叠加：

1. **适配层语义错误**（上一轮已修）：原建议写法 `preferredShortcut(...) ?? resolveEditorShortcut(...)`
   在偏好认领不到时回退出厂解析，导致改绑/解绑后旧组合仍生效。现由 `resolveWithPreferences` 统一
   解析——偏好优先、出厂兜底，但**用户显式改过的出厂组合不再认领**，同时保留工具组共用字母循环与
   `Delete` 的文档状态分派。
2. **外壳根本没调用**（本轮修复）：`photo-editor-app.tsx` 仍在调用 `resolveEditorShortcut`，所以
   `resolveWithPreferences` 是**死代码**——测试全绿但功能不生效。本轮把外壳接上，并补了走真实
   `PhotoEditorApp` 与真实键盘事件的宿主层回归（`customization-interaction.test.tsx`），以及直接
   断言 `EditorMenuBar`/`EditorToolRail` 行为的 `shell-consumption.test.tsx`。

关键结论：只测适配函数**无法**发现第 2 层问题。因此新增的两组测试都断言外壳组件/应用行为，而不是
适配函数返回值；并逐条做了反向验证（见上表）。

## 共享基线测试变更说明

`packages/editor/src/features/boundaries.test.ts` 原先断言「本域为空、section 计数 12」。本域已有
真实入口后该断言必然失败，本轮做了最小同步：section 计数 12→13、把 `customization` 从「空域」
清单移到「有一个 section、无新增工具」的断言。**遗留一项待集成负责人处理**（已记为任务 4.6）：
其它 change（painting/animation/history/raster 等分支）也在同处累计 section 数，需按合并后的
实际域入口数统一一次，避免逐分支覆盖。

## 外壳接入清单（历史记录，现已落地）

上一轮留作交接的 5 条接入建议已全部实现，见「外壳接入验证（已落地）」的实际改动表。
保留此节只为说明**为什么不能**写成 `preferredShortcut(...) ?? resolveEditorShortcut(...)`：

偏好认领不到时会回退出厂解析，用户改绑/解绑后的旧组合会继续生效，等于「自定义快捷键」无效。
正确写法是 `resolveWithPreferences(preferences, event, isMac)`。

## 会话绑定

本 worktree 已通过 ATC 复用 OpenCode `ses_e9ca1353affe1CC8DHk7y7r3Qr` 与 Codex
`01a163c2-f4b4-7570-8cf4-aa47aa4bda24`，两者与 change 同目录
（`/data/workspace/woohaa3-openspec-2026-10-22-add-photocraft-workspace-customization`），未发送
实施或评审提示词。

本轮收尾再次执行 `pnpm atc:bind-change 2026-10-22-add-photocraft-workspace-customization --project photocraft`，
返回 `ok: true`、`errors: []`，两个 provider 与上面的 id/目录一致；`seeded: false` 是因为会话本就
绑在这个 worktree 上（复制源与目标同一目录），并非复制失败。

主仓 `/data/workspace/woohaa3` 里的同名 change 目录仍是规划期版本（与 worktree 的 `design.md`、
`tasks.md`、`verification.md`、`specs/` 等均不同）。这些改动尚未提交，按约定不自动覆盖主仓：
同步须由集成负责人在合入时把本 worktree 的 change 文档与实现一起带入。

## 发布记录格式（后续填写）

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 /
通过或待验证 / 暂缓理由。不重做已经交付的标签位置、面板浮动、鼠标滚轮语义；手机布局及无障碍
专项不在范围。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
