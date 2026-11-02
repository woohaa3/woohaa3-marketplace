# 验收计划与记录

## 本次实施状态

本 change 已在单一写入边界内实施（`features/selections/` 域目录 + 本 change 文档），未提交 Git。
逐子能力矩阵见 [capability-matrix.md](capability-matrix.md)。以下区分三类结果：**已实测通过**、
**阻塞未完成**（含真实原因）、**待人工验证**（当前环境无法采集）。

## 环境

- 平台：Linux 容器，96 核，无 `renderD/B*`（`ls /dev/dri` 不存在），无显示会话（`DISPLAY` 未设置），
  无 Canvas/WebGL 上下文。
- 因此本机**只能**跑非渲染检查与真实 WASM 语义冒烟；GPU 帧率、视觉截图、播放/编辑/拾取画面一致性
  一律未采集。
- Node 24.14.1，pnpm workspace 离线安装（`pnpm install --offline`），Cargo 离线构建。

## 非渲染检查（实跑结果）

| 命令 | 结果 |
| --- | --- |
| `pnpm -C photocraft run check` | 通过：build + typecheck 全绿；protocol 74、project-verifier 40、editor 341 |
| `pnpm -C photocraft run rust:test` | 通过：共 311 项（editor-core lib 230、contract_fixture 4、editor 13、interaction_state 25、project-verify lib 10、limits_agree 1、native_binary 3、smart_source 10、verify 15） |
| `pnpm -C photocraft run wasm` | 通过：wasm 17.42 MiB、glue 107.4 KiB（release + wasm-bindgen + wasm-opt） |
| `pnpm -C photocraft run verifier` | 通过：原生核验工具 3.84 MiB |
| `pnpm -C photocraft/packages/editor run typecheck` | 通过 |
| `pnpm -C photocraft/dev test` | 通过：1 文件 / 8 用例（独立 dev 宿主消费同一实现） |
| `pnpm -C photocraft/integrations/woohaa test` | 通过：34 文件 / 282 用例（Woohaa 宿主消费同一实现；含 Q 键真实按键、U17 画布单击放置与 U22 画布取样回归；见下方环境说明） |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `pnpm codemap:check` | 通过：47 manifest、11 篇地图、1353 本地链接、8 模块入口 |
| `pnpm boundary:check` | **失败（与本次改动无关，基线同样失败）**：`清单目录都存在（planned 除外）` 期望 `['artifacts','logs']` 为空；这两个目录在本仓库从不创建 |
| `pnpm -C photocraft run features:check` | 通过：commands、capabilities、errors、8 个内容/状态快照、undo/redo/cancel 与 PNG 字节全部与基线一致（基线已纯追加 9 条命令，见下节） |

### Woohaa 适配测试的环境说明

`integrations/woohaa/vitest.config.ts` 把 react 别名硬编码为 `../../node_modules/.pnpm/react@18.3.1/...`。
本 checkout 用 pnpm 11 的**全局虚拟存储**（`enable-global-virtual-store=true`），安装时不会生成
`node_modules/.pnpm`，因此该路径缺失、28/34 文件报 `Failed to resolve import "react/jsx-dev-runtime"`。

这是**安装布局**问题而不是代码问题，验证方式有两种，结论一致：

1. 未改仓库任何文件的临时配置 `/data/tmp/opencode/woohaa.vitest.config.mjs`（按同样的 dedupe/alias
   语义指向真实安装位置）→ **277 通过**；
2. 在未跟踪的 `photocraft/node_modules/.pnpm` 下补两个符号链接指向真实安装位置后，仓库自带命令
   `pnpm -C integrations/woohaa test` → **34 文件 / 277 用例通过**。

两者都只改本机安装布局，没有改动任何被跟踪文件。基线在此环境同样失败，非本 change 引入。

**已知抖动（非本 change 引入）**：`tests/transform-interaction.test.tsx` 的 context-menu 用例约每 5 次
整包运行出现 1 次 `Cannot read properties of null (reading 'dispatchEvent')`——右键菜单节点在同一 tick
尚未挂载就被查询。该文件不在本 change 的改动范围内（`git status` 未涉及 `integrations/woohaa`），
单独重跑与多数整包运行均通过。记录在此，避免把偶发失败当成回归结论；修复应归属宿主适配的负责人。
覆盖本域实现的用例包括 `tests/selection-interaction.test.tsx`、`tests/editor-workspace.test.ts`、
`tests/photo-editor-app.test.tsx`。


### features:check 的差异明细

`scripts/check-feature-boundaries.mjs` 的差异曾是 9 条新增命令白名单（无删除），现已按**纯追加**同步两个
fixture 到 194 条，门禁恢复通过：

```
layer.layerMask.edit  layer.removeBackground  layer.toggleMaskOverlay
select.editInQuickMaskMode  select.focusArea  select.magneticLasso  select.object
select.sky  select.subject
```

`build` / `capabilities` / 8 个内容与状态快照 / `errors` / `output` 全部未改，因此该门禁现在校验的是
"命令面扩展之外一切不变"，而不是被放宽。

## 真实 WASM 冒烟（U17–U24）

脚本：`/data/tmp/opencode/wasm-smoke-u17-u24.mjs`（临时目录，不入库），加载 `packages/editor/dist/wasm`
的 release 产物。**35 项检查全部通过（0 失败）**，每项在干净场景上独立执行：

| 检查 | 实测结果 |
| --- | --- |
| U17 单行 | `bounds [0,5,24,1]`，`hasSelection` 为真 |
| U17 单列 + add | `bounds [0,0,24,18]` |
| U17 画布外拒绝 | `画布外` 拒绝 |
| U17 单击放置（面板布防后的落点） | 单击 y=2 → `[0,2,60,1]`；`add` 并集 `[0,2,60,5]`（保住先前选区）；`replace` 回到 `[0,9,60,1]`——单击点/方向/组合模式三项都真的被采纳 |
| U22 画布多点/增减取样 | 两块色块：红 `[2,10,20,20]`、蓝 `[35,10,20,20]`；两点 `+` 并集 `[2,10,53,20]`（覆盖两块，不退化成一侧）；`points:[红]+subtractPoints:[蓝]` 回到 `[2,10,20,20]` |
| U18 磁性预览 + 一步确认 | 预览 `[1,6,22,11]`；预览期修订/历史不变；确认恰好 +1 步 |
| U18 锚点不足 | 拒绝（"至少"） |
| U18 多边形（`trace:false`） | 多边形 `[2,2,18,13]` ≠ 磁性 `[1,6,22,11]` ≠ 直线闭合 `[4,6,19,11]`；确认后选区存在 |
| U18 草稿门禁（写/关/存） | 有活动选区草稿时写命令、`file.close`、`saveProject` 均以 `请先确认或取消选区修改` 拒绝；`cancelSelectionDraft()` 后保存立即成功 |
| U18 宿主切换门禁读的真值 | 空闲时 `selectionDraftState().active` 为假；打开磁性草稿后为真且 `stale` 为假；`cancelSelectionDraft()` 后立刻回到假——宿主 `pendingDraftOf()` 依赖的就是这条，避免"草稿已丢弃但仍挡切换" |
| U18 草稿期间换文档被内核拒绝 | 草稿打开时 `file.new` / `file.openImage` / `file.openProject` 全部以 `请先确认或取消选区修改` 拒绝，且草稿仍存活——"另开一个文档"绕不过门禁 |
| U18 草稿轮廓可见 | `selectionDraftOutlineJson()` 返回 70 段真实追踪段，全部落在候选包围盒 `[3,3,28,22]` 内；预览期修订/历史不变；取消后轮廓清空；多边形模式 42 段（=锚点闭合边数） |
| U19 保存/覆盖拒绝/覆盖/重载 | 未确认覆盖被拒；覆盖后重载边界 `[4,4,8,6]` 与保存时一致 |
| U18 追踪超预算 | 400×400 场景 1600 个对角锚点：拒绝并说明"border is longer than 200000 px"，且不留草稿 |
| U19 命名选区存储上限 | 1×1 画布连续保存到 4095 个后拒绝（"命名选区条目已满（层 1 + 通道 4095 ≥ 上限 4096）"）；`overwrite: true` 覆盖同名通道仍成功 |
| U19 Grow vs Similar vs 几何 Expand | `[0,0,21,10]` / `[0,0,21,9]` / `[0,0,8,8]` 三者不同 |
| U20 快速蒙版绘画→退选区 | 绘画期 hash `9c4fda5a8557cf72`、修订与历史不变；退出恰好 +1 步 |
| U20 快速蒙版取消 | 进入前 `[1,1,4,4]` → 取消后 `[1,1,4,4]` |
| U20 覆盖色查看 | 草稿 `draft.overlay` 报出内核临时通道的真值：`#ff0000` / `0.5` / `maskedAreas`；退出后不再残留；面板据此显示"着色遮住的一侧 50%"与色块 |
| U20 黑白笔迹语义 | 白笔白区并入选区（`[2,2,31,14]`）、黑笔遮出（`[2,2,6,6]`）；面板只给黑白两档，纠正先前误把"覆盖色"接到笔迹颜色 |
| U21 对象选择 | 预览 `[0,0,22,10]`，确认后 `hasSelection`，撤销一步 |
| U21 采样区域（点/矩形） | 同一场景取样点 `[92,72,56,56]` vs 矩形 `[72,71,96,80]`，两者**不同**；候选在场时再次 `begin` 会被门禁拒绝（"请先确认或取消选区修改"），先 `cancel` 再 `begin` 才能重算且不新增历史 |
| U21 焦点区域参数 | `range 0.9 / noise 0` → `[0,0,240,180]`；`range 0.1 / noise 0.6` → `[0,17,240,135]`，参数确实改变候选 |
| U21 采样层 | 空活动层默认被拒（`the active layer is empty; set "sampleAllLayers": true`）；`sampleAllLayers: true` 后能找到另一层上的对象 |
| U21 主体选择（已开放） | 命令表含 `select.subject`；预览 `[3,11,54,18]` 期间修订/hash/历史不变；确认后边界等于预览、恰好 1 步历史；一次撤销回到无选区 |
| U21 天空/焦点 | 焦点草稿 `focusArea` 可达；无天空场景由真实算法拒绝并说明原因 |
| U21 移除背景 | `kind=removeBackground`，确认后 `hasMask: true`，像素内容不变，恰好一步历史 |
| U21 智能选择输出到蒙版 | `output: "mask"` 确认后写出一层蒙版，选区+转蒙版合并为**一步**历史（实测 steps=1），一次撤销把蒙版与选区一起回滚 |
| U21 主体 | 已开放（能力表登记 `select.subject`），见上一条同名检查；面板按运行时能力表决定是否显示"主体"选项 |
| U22 多点色彩范围 | 首次 `[2,8,20,9]`；增加/减去取样后 `[0,0,24,18]`；确认边界等于最后预览；恰好一步 |
| U22 局部群组 | 局部颜色群组参数到达内核，候选 `[0,0,23,17]` |
| 轮廓预览截断 | 700 段候选只画前 600 段，并显示"轮廓共 700 段，预览只画前 600 段"；`data-draft-outline` 仍报真实段数 |
| U22/U23/U21 草稿轮廓 | 色彩范围 22 段、修边 14 段、传统分割 4 段真实候选段；取消后一律清空（0 段）；快速蒙版按设计不给选区轮廓（0 段，且不残留） |
| U22 色调区间 | 透明背景三块亮度：高光 230 → `[0,11,20,18]`、高光 120 → `[0,11,40,18]`、阴影 40 → `[38,11,22,18]`；`tonalRange` 300 与 `[200,100]` 均被拒绝 |
| U22 detectFaces | 仍拒绝 |
| U23 修边预览 | 预览 `[1,1,18,14]`，修边笔迹并入后仍为该边界；预览不改修订/历史；确认一步 |
| U23 输出 | `newLayer` / `newLayerWithMask` / `layerMask` 全部成功且 `kind=refine` |
| U23 净化颜色（输出被升级） | 选"选区"+`decontaminate: true` → 层数 2→3（新图层含蒙版）且 `hasSelection` 变假；同一请求不勾净化 → 层数不变、选区保留。面板据此显示"实际按新图层（含蒙版）输出"，但转发给内核的仍是用户所选 + `decontaminate/amount` |
| U23 非法输入 | 无选区+无蒙版、`radius 999`、`output: bogus` 三种均拒绝 |
| U24 密度/羽化 | 读回 `density 40 / feather 6`、`pixelsPreserved: true`；编辑后 hash 变、历史 +1；查看 gray→overlay→off 期间 hash 与历史不变 |
| U24 `\` 切换叠加 | `layer.toggleMaskOverlay` 两次调用 overlay→off；查看状态随之改变；内容 hash 与历史均不变 |
| U24 切换命令真实侧翻转 | 真实 WASM：`view` 基线 `null` → 第一次 `"overlay"` → 第二次 `null`；期间内容 hash 与历史不变（面板按钮与 `\` 按键共用的就是这条命令） |
| U24 `\` 真实按键 | `resolveEditorShortcut` 对 `code: "Backslash"` 产出 `{kind:"maskOverlay"}`；宿主真实 keydown 使 `dispatch` 收到 `["layer.toggleMaskOverlay", null]`；Shift+`\` 与系统修饰键不触发 |
| U24 越界/无蒙版 | `density 400`、`feather 1001`、`density -1`、空参数、无蒙版编辑全部拒绝；无蒙版读取返回 `mask: null` |
| 草稿状态/边界 JSON | 空闲 `active:false`；活动中 `kind:modify`、`bounds [0,0,10,10]`、12 条边界线段、`stale:false`；取消后 `active:false` |

补充分步验证（同一构建产物）：

- 多边形与磁性边界确实不同：在 40×30 场景中多边形 `[4,4,32,22]`、磁性 `[1,5,39,25]`、直线闭合 `[2,5,38,25]`。
- 蒙版密度/羽化不进内容身份之外的东西：16×12 场景中编辑前后 `contentHash` 均为 `72f67534f1b3a696`
  （蒙版属性不进内容指纹，符合"重开仍可改参数、蒙版采样值不变"的存储语义）。

## 领域内回归测试

新增/改写的本域测试（全部通过）：

| 文件 | 数量 | 覆盖 |
| --- | --- | --- |
| `packages/editor/src/features/selections/workflow-parameters.test.ts` | 25 | U17–U24 参数编译、夹紧、非法拒绝、锚点模型、蒙版换算、多边形关闭追踪、草稿归属与过期丢弃、智能选择输出目标与主体参数、色调区间、净化颜色的输出升级映射 |
| `packages/editor/src/features/selections/workflow-panels.test.tsx` | 22 | 面板接本域会话、重挂载认领草稿、非法最后输入禁止确认、回退锚点、闭合完成、多边形模式、快速蒙版黑白笔迹、修边、过期归属草稿只可取消、蒙版读取被拒区分"目标已删除"与"没有蒙版"、各草稿真实轮廓预览与截断、`select.subject` 按能力表出选项、U21 采样区域/参数真的送到内核、切种类不残留矩形采样、U23 净化颜色如实提示输出升级、旧运行时缺入口时整块不渲染 |
| `packages/editor/src/features/selections/wasm-handle.test.ts` | 2 | 旧运行时门禁：U17–U24 共 22 个入口在缺少导出时逐条返回 `capability-unavailable`（不抛 `TypeError`），新运行时上正常透传参数 |
| `packages/protocol/src/features/selections/content.test.ts` | 4 | 蒙版内容身份：`none` 与非法可区分、`linked` 缺省 ≡ `linked: true`（旧工程兼容）、三个属性各自改变身份、蒙版真的进入工程内容指纹 |
| `packages/editor/src/features/selections/canvas-pick.test.ts` | 2 | U17/U22 共用单击待命：一次性消费（点完即解除、不重复认领）、按控制器实例隔离（多标签宿主互不影响） |
| `packages/editor/src/features/selections/workflow-sections.test.tsx` | 4 | 三个既有分区 id 不变、U17–U24 入口确实挂在其中、按钮真的调用本域会话与 `layer.toggleMaskOverlay` |
| `packages/editor/src/features/selections/workspace-switch-gate.test.ts` | 15 | 宿主切换门禁的域侧契约；Q 与画布共用的 `paintQuickMaskStroke`（黑白归并、拒绝无草稿、非法点位）；真控制器下 begin/绘画/确认/取消与 `hasActiveDraft()` 同源 |
| `packages/editor/src/photo-editor-shortcuts.test.ts`（共享文件，本域新增 1 条） | 1 | Q 解析为 `{kind:"quickMask"}`，且不被修饰键抢走 |
| `integrations/woohaa/tests/photo-editor-app.test.tsx`（共享宿主测试，本域新增 4 条） | 4 | 真实按键：Q 经域会话进入/退出且 `dispatch` 从未收到 `select.editInQuickMaskMode`；只读预览下 Q 不进入；U17 面板布防后真实画布单击建成一像素行且不经 `dispatch`；U22 面板布防后真实画布单击把取样点送进 `points`/`order` 并立即预览 |
| `rust/crates/editor-core/src/features/selections/tests_workflows.rs` | 29 | U17–U24 内核语义：拒绝条件、取消、无变化、一步历史、只读、工程往返、切文档后过期草稿不误写、追踪超预算、命名选区条目上限 |
| `rust/crates/project-verify/src/features/selections/mod.rs`（`#[cfg(test)]`） | 2 | 像素蒙版属性越界与非灰度表面拒绝 |

### 文档归属门禁（任务 3.3 的域内部分）

切换活动文档后，内核草稿保留旧文档的候选。此前只有 `draftState()` 里的 `document`/`revision` 字段，
界面面板只比对 `kind` 就认领，等于允许把 A 的候选确认进 B。现在：

1. 内核 `selection_draft_state()` 增加 `stale`（活动 `DocState::doc.id` 与草稿归属不一致）；
2. `commit_selection_draft` / `commit_selection_modify` 在提交前比对归属，不一致直接拒绝并丢弃现场；
3. TS `draftBelongsTo` 把 `stale` 视为不可认领，六个认领草稿的面板（磁性套索、按颜色扩大、快速蒙版、传统分割、色彩范围、选择并遮住）对 `stale` 禁用确认/追踪/修边，
   只保留"取消"。

回归：Rust `u18_draft_is_discarded_when_the_active_document_is_swapped`（拒绝 + B 的修订/历史/选区都没变）、
TS `workflow-panels.test.tsx` 的"过期归属的草稿只读可取消"、`workflow-parameters.test.ts` 的
"内核标记为过期归属的草稿即使文档号相同也不被认领"。

该门禁只在 Rust 层做回归：WASM 公开面没有"在不结算草稿的前提下换活动文档"的导出
（`openImage`/`openProject` 都被统一草稿门禁挡住），所以这条路径由内核直接覆盖，而不是 WASM 冒烟。

### 仍然缺的宿主环节（任务 3.3 未勾选的原因）

宿主切换门禁 `integrations/woohaa/src/document-session.ts` 的 `pendingDraftOf()` 只查
图层属性 / 调整 / 文字 / 变换四类草稿，**不查选区草稿**，因此有活动选区草稿时仍能切标签。
补这一项需要改宿主适配文件（`parallel-work.md` 列为共享单一写入），须由集成负责人顺序落地。

内核侧已把"误写"堵住：即使宿主放行切标签，旧草稿也会被标记 `stale` 并在提交时拒绝、丢弃现场。
缺的是"切标签前先提示用户结算"这一层交互，所以 3.3 保持未勾选。


## 逐 U 组记录

| U | 入口 | 预览/确认/取消 | 内容与历史 | 工程往返 | 核验器 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| U17 | 单行/单列分组 | 无草稿，一次命令 | 选区非内容；一步历史 | 不涉及 | 不涉及 | 已实测通过 |
| U18 | 磁性套索分组（含多边形开关） | 预览=真实追踪；确认一步；取消清草稿 | 预览不改修订/历史/hash | 不涉及 | 不涉及 | 已实测通过 |
| U19 | 命名选区 + 按颜色扩大 | Grow/Similar 草稿；覆盖需确认 | Alpha 通道进工程；一步历史 | Rust `u19_named_selection_survives_a_project_roundtrip` 通过 | 不涉及 | 已实测通过 |
| U20 | 快速蒙版分组 | 绘画即时；退出/取消分流 | 临时通道不写图层；取消零写入 | 不涉及 | 不涉及 | 已实测通过 |
| U21 | 对象选择分组 | 候选遮罩/选区；确认一步 | `removeBackground` 挂蒙版不改像素 | 不涉及 | 像素蒙版属性检查已加 | 对象/主体/天空/焦点/移除背景全部通过 |
| U22 | 色彩范围（画布多点/增减取样） | 预览即候选；确认最后预览 | 选区非内容；一步历史 | 不涉及 | 不涉及 | 已实测通过 |
| U23 | 选择并遮住工作区 | 真实像素边缘预览 + 修边笔迹 | 预览零写入；输出各自落地 | 输出新文档受共享名额约束 | 不涉及 | 已实测通过 |
| U24 | 像素蒙版分组 | density/feather 内容，查看会话 | 采样值不变；查看不改 hash/历史 | `u24_*_survives` 重开仍可改参数 | 新增属性/格式检查通过 | 已实测通过 |

| U20 Q 键同源（进入/绘画/保存/撤销/取消） | 进入即产生真实草稿（`active:true`、`kind:quickMask`）；绘画期正式文档零写入；草稿期 `saveProject` 与 `undo` 均被拒绝且草稿存活；取消恢复到进入前边界；确认恰好 1 步历史且撤销回落 |
| U20 画布按帧合并落笔 | 40 点分 40 批与合并成 1 批的最终边界差 ≤1px（`[100,100,426,300]` vs `[100,100,425,300]`），两批都覆盖首末点，绘画期正式文档零写入 |
| U20 上游命令直通反证 | 直接 `execute("select.editInQuickMaskMode")` 时 `selectionDraftState().active` 仍为假、`paintQuickMask` 拒绝、`saveProject` 却成功、修订 +1——这正是"既画不了也退不出"的死状态，故界面各处必须改道本域会话 |

## 阻塞与未完成项

1. **`boundary:check` 的环境性失败**。`artifacts`/`logs` 目录不存在，改动前的基线同样失败，非本 change 引入。
   Woohaa 适配测试已不再属于阻塞：补齐本地安装布局后仓库自带命令通过 34/34（见上文环境说明）。
（Q 键、U21 主体与 `features:check` 基线均已在本轮交付，列于下节。）

## 之前列为阻塞、本轮已消除

1. ~~**U21 主体（`select.subject`）未开放**~~ —— **本轮已交付**。本域侧本就齐备，
   缺的只是能力表那一行。本轮登记 `StagedId { stage: "P5", order: 22, id: "select.subject" }`，
   并把三处"断言它关闭"的守卫翻转为"已开放"：
   `capability.rs`（`assert!(command_allowed("select.subject"))`）、`tests/editor.rs` 命令表
   `allowed: true`、dispatch 层改为继续断言真正未交付的 `edit.preferences.general` 仍被拒。
   说明：这三处记的是**前置阶段尚未交付**的状态，而不是产品选择；本 change 的 spec 明写
   "系统 SHALL 接入传统 Object/**Subject**/Sky/Focus Area"，design 也写明"传统 select.subject/object
   不按名称误禁为 AI"，因此交付后断言该翻转，不构成语义变更。
   真实 WASM 实测：`allowedCommandIdsJson()` 含 `select.subject`；预览 `[3,11,54,18]` 期间
   修订/hash/历史三者不变；确认后 `hasSelection: true`、边界等于预览、恰好 1 步历史；一次撤销回到无选区。
   回归：Rust `u21_subject_produces_a_real_candidate_and_commits_in_one_step`、WASM 冒烟
   「U21 主体选择：传统分割端到端可用（非 AI 模型）」。宿主测试未受影响——`editor-workspace.test.ts`
   用的是硬编码假内核，不读真实能力表，因此无"四处共享断言"之说。
2. ~~**`features:check` 基线未更新**~~ —— **本轮已修**。实测该门禁差异恰好是 9 条新增白名单命令
   （`select.subject` 随 U21 一起开放），无删除、无顺序变化：
   `select.magneticLasso`、`select.editInQuickMaskMode`、`select.object`、`select.subject`、`select.sky`、
   `select.focusArea`、`layer.removeBackground`、`layer.layerMask.edit`、`layer.toggleMaskOverlay`。
   两个 fixture 只做**纯追加**：`notes/feature-boundary-wasm-baseline.json` 的 `commands` 与
   `notes/feature-boundary-baseline.json` 的 `allowedCommands` 同步到 194 条；`build`/`capabilities`/
   8 个内容/状态快照/`errors`/`output` 全部未改，故该门禁现在真正校验的是
   "命令面扩展之外一切不变"，而不是被放宽。
3. **选区草稿接入宿主切换门禁** —— **本轮已落地**。`pendingDraftOf()` 现在会问本域的
`features.selections.unsettledDraftReason()`；判定与文案（`SELECTION_DRAFT_SWITCH_REASON`）留在
本域，宿主只搬运结果，没有第二份草稿状态机。同一 `pendingDraft` 也进 `planCloseDocument()` /
`planLeave()`，所以切标签、关闭单个文档、离开页面都会先要求结算。
关键设计点：判定以**内核** `selectionDraftState()` 为准而不是 `selectionModifyActive`——过期草稿被内核
丢弃后若仍按标记拦截，用户会被一个不存在的草稿永久挡住。回归覆盖了这条
（`workspace-switch-gate.test.ts`「内核已经丢弃草稿（含过期归属被丢弃）时不再拦截」）。
另实测内核层兜底：草稿期间 `file.new` / `file.openImage` / `file.openProject` 同样被统一门禁拒绝，
"另开一个文档"绕不过去。真实标签栏点击与保存回执仍待人工走查（见 4.2）。
4. **快速蒙版的 Q 键** —— **本轮已交付**。`photo-editor-shortcuts.ts` 新增 `{ kind: "quickMask" }`
   动作，`photo-editor-app.tsx` 的 `toggleQuickMask()` 经 `controller.features.selections` 分派：
   未开 → `beginQuickMask()`，已开 → `exitQuickMask(false)`；其它受控草稿在场时不抢按键。
   刻意**不**映射成 `{kind:"command", id:"select.editInQuickMaskMode"}`——共享 `run()` 会绕过本域草稿，
   实测得到 `active:false` + `paintQuickMask` 报"没有活动的快速蒙版会话" + `saveProject` 却成功，
   即 stuck 状态。
   同源保证：画布画笔在草稿期改走 `paintQuickMask`（参数编译留在本域新函数 `paintQuickMaskStroke`，
   并显式钉死 `target: "quickMask"`）；Esc 走 `exitQuickMask(true)` 恢复进入前选区；
   保存/undo/`select.all`/`file.close` 由 `hasActiveDraft()` 与内核统一门禁挡住，取消后立即恢复。
   回归：TS 快捷键 1 项、`快速蒙版笔迹走同一草稿` 5 项、真控制器 `Q 快速蒙版与面板共用同一草稿` 3 项、
   `Q 键（外界）进入快速蒙版后，面板下一次渲染就跟随同一草稿`、`命令 id 改道判定` 1 项；
   WASM 冒烟「U20 Q 键路径走真实草稿」与「U20 上游命令直通会产生无草稿的死状态」。
   另外把两处会静默绕过草稿的隐患一并收口：面板不再只在挂载时读一次草稿（否则 Q 进入后仍显示"未进入"，
   诱导用户再按一次而恰好确认退出）；画布笔迹按已画点数去重，抬笔不重画整条（半透明笔不会变深）。
   真实按键手感与光标反馈仍属人工走查（见 4.2）。

## U21 外部依赖核查（不是人工验收项）

用户要求逐项确认：U21 的五种分割是否依赖外部模型或产品决策。**结论：都不依赖，已全部本地交付。**

| 子能力 | 实现来源 | 是否外部模型 | 是否待产品决策 |
| --- | --- | --- | --- |
| 对象 | `vendor/photocraft/crates/engine/src/smartselect_cmds.rs` 的 Object Finder（超像素 + 显著性） | 否，纯本地算法 | 否 |
| 主体 | `crates/algo/src/segment/subject.rs`：SLIC 超像素 + Zhu 显著性 + GrabCut 两次精修 | 否，纯本地算法（源码注释明写"Photoshop uses a learned model; we approximate it"） | 否 |
| 天空 | `crates/algo/src/segment/sky.rs` 经典天空分割 | 否 | 否 |
| 焦点区域 | `focus::focus_area`（局部拉普拉斯） | 否 | 否 |
| 移除背景 | `cutout_cmds.rs` = 主体分割 + 边缘 matting → 图层蒙版 | 否 | 否 |

因此 U21 不构成"依赖外部模型"或"等待产品决策"的阻塞；本 change 也不宣称 AI 能力
（`select.subject` 是传统算法，design 已写明不按名称误禁为 AI）。AI 主体/发丝模型与上游未实现的
`detectFaces` 明确不在本 change 范围内，也不列为本 change 的待办。

真实性能（本机 96 核、无 GPU，WASM release 产物）：240×180 主体 111 ms、焦点 12 ms；
1200×900 主体 226 ms；4000×3000 主体 658 ms、移除背景 925 ms。全部为**同步**调用，
超时/长计算取消未接线——上游 `select.*` 命令没有取消入口，本域也不伪造进度；
真实设备上的手感属 4.2 人工走查，不在此冒充已验证。

## 宿主测试的既有偶发失败（已做基线对照，非本 change 引入）

`integrations/woohaa` 偶发 `1 failed | 281 passed`，失败项是
`tests/transform-interaction.test.tsx > 2 个所选图层从 context-menu 进入变换，统一提交或取消`，
报错 `Cannot read properties of undefined (reading 'click')`——即 Radix 下拉项在负载下尚未挂载。

**基线对照（关键）**：把本轮全部改动 `git stash` 掉后在**未含本 change 任何代码**的基线上
连跑 5 次，同样出现 1 次失败（`base4: 1 failed | 274 passed`）。因此这是**既有**的时序抖动，
不是本 change 引入，也没有被本 change 修好：`transform-interaction.test.tsx` 自初始提交
`c5ffeace` 后未改动，本次也未触碰它或 `photo-editor-context-menu.tsx`。

结论：本轮以可复现的 **282/282** 作为验收依据；这条抖动如实保留，不标成"已修复"。
（本轮收尾时又在连续 4 次全量运行中复现 1 次 `1 failed | 281 passed`，失败项仍是同一条
`transform-interaction.test.tsx`；随后 3 次连续运行均为 282/282。抖动次数与本轮新增用例无关：
新增的选区/蒙版用例在单独运行与全量运行中都未失败。）
若要在后续消除，应单独改为等待菜单项出现（轮询/`findBy*`）而不是同步 `querySelector`，
属于上下文菜单测试的独立改动，不在本 change 范围内。

## 待人工验证（缺真实环境）

- 电脑 1440×1000 与 Pad 1024×768 主线走查（多边形/磁性套索 → 命名保存重载 → 快速蒙版修补 →
  多点色彩范围 → 真实修边预览 → 新层/蒙版输出）与应用内截图。
- 真实 GPU 下的帧率与长尾、GPU 计时、播放/编辑/拾取画面一致性。
- 真实宿主会话里的保存、切标签、关闭与父子回写端到端联动（切标签后"过期草稿不误写"的**域内**门禁
  已有自动化回归，但真实标签栏点击、宿主保存回执与父子回写仍需人工走查）。

真实原因：当前环境**无 GPU**（Linux 容器无 `renderD`）且**无显示会话**（`DISPLAY` 未设置），
无法启动浏览器渲染或采集画面证据；未用软件渲染或估算值代替硬件结论。

## 发布记录格式（后续人工验收填写）

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 /
通过或待验证 / 暂缓理由。AI 主体/发丝模型和上游未实现的 detectFaces 不在本 change；传统
select.subject/object 不按名称误禁为 AI。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
