# U17–U24 能力矩阵

逐子能力记录「生产命令/参数 → 包装 → WASM 导出 → UI 入口 → 内容/核验 → 验收证据」。
矩阵不是完成声明：某项只有在整条链路与验收证据都成立时才标记已接通；未接通项写真实原因。

实现提交：工作区改动基于 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，未提交。
验收命令与计数见 [verification.md](verification.md)。

## 包装层与导出层

| 层 | 位置 | 说明 |
| --- | --- | --- |
| 内核命令 | `vendor/photocraft`（固定上游，不改） | 全部 U17–U24 都复用上游生产算法 |
| 域命令/草稿 | `rust/crates/editor-core/src/features/selections/tools.rs`、`selection_draft.rs` | 参数校验、草稿门禁、预览/确认/取消 |
| WASM 导出 | `rust/crates/editor-core/src/features/selections/wasm.rs` | 23 个 `#[wasm_bindgen]` 导出 |
| 能力登记 | `rust/crates/editor-core/src/features/selections/mod.rs` | 命令与能力进入 P5 阶段表 |
| TS 适配 | `packages/editor/src/features/selections/wasm-handle.ts`、`wasm-instance.ts` | 每个导出逐条 `missing()` 检查，缺能力返回 `capability-unavailable` |
| 域会话 | `packages/editor/src/features/selections/workspace.ts` | 共用活动草稿门禁与 `afterWrite()`，草稿归属判定 |
| UI | `packages/editor/src/features/selections/workflow-panels.tsx`、`sections.tsx` | 组合进三个既有分区，不新增 section id / tool id |
| 纯参数层 | `packages/editor/src/features/selections/draft-state.ts` | 参数编译/解码、锚点模型、蒙版属性换算 |
| 内容核验 | `rust/crates/project-verify/src/features/selections/mod.rs` | 像素蒙版属性与表面格式的有界检查 |

## U17 单行/单列选框

| 项 | 值 |
| --- | --- |
| 命令 | `select.rect`，`line: "row" \| "column"` |
| 包装 | `Editor::select_line`（`tools.rs`） |
| WASM | `selectLine(paramsJson)` |
| UI | 「选择」→ 选区分区「单行 / 单列选框」；方向、行号/列号、组合模式；**「单击画布放置单行/单列」** |
| 内容/核验 | 选区不是内容：内容指纹与工程内容不变；一次命令一步历史 |
| 验收 | 真实 WASM：行 `[0,5,24,1]`、列 + add、画布外拒绝；Rust `u17_*` 3 项；宿主真实单击回归 |

已接通：单行/单列各一源像素，边界随回执返回并由视图持续显示。

**单击放置（spec 明写「缩放后单击形成准确的一源像素行/列」）**：此前只有面板输入行号，
不带画布单击。共享 `boundaries.test.ts` 冻结了 `FEATURE_TOOLS` 的工具 id 清单，
本域不能自行新增 `singleRow`/`singleColumn` 工具，因此把"子工具"表达为**一次性待命**
（`features/selections/canvas-pick.ts`）：面板布防 → 画布下一次单击落到具体像素行/列 → 自动解除。
待命按控制器实例用 `WeakMap` 隔离（多标签宿主里 A 布防不影响 B）；图外单击也解除，
避免点飞一次后下一次无关单击莫名建行；参数编译、图外拒绝与组合模式全在本域
（`selectLineParams`），共享外壳只把点位交进来。回归：`canvas-pick.test.ts` 2 项 +
宿主真实画布单击 `U17 面板布防后画布单击直接落成一像素行/列，不走共享 dispatch`。

## U18 多边形套索、磁性套索

| 项 | 值 |
| --- | --- |
| 命令 | `select.magneticLasso`（`trace`、`width`、`contrast`、`close`、`mode`） |
| 包装 | `Editor::begin_magnetic_lasso` / `update_magnetic_lasso` |
| WASM | `beginMagneticLasso`、`updateMagneticLasso` |
| UI | 「磁性套索」分区：锚点文本、宽度、对比、闭合方式、多边形开关、回退锚点、闭合完成；预览按内核真实追踪段画成 SVG（`[x0,y0,x1,y1]`），不是只显示包围盒 |
| 内容/核验 | 预览在 scratch session，不推进修订/历史/hash；确认一次历史 |
| 验收 | 磁性预览边界 `[1,6,22,11]`、多边形 `[2,2,18,13]`、`close:straight` 产生不同边界、锚点不足拒绝、超 200000 px 追踪预算拒绝且不留草稿；Rust `u18_*` 4 项 |

已接通：多边形套索以锚点作边界（`trace:false`），磁性套索由内核沿边缘追踪；回退锚点与闭合完成都是真实 UI 动作。

## U19 命名选区、扩大选取和选取相似

| 项 | 值 |
| --- | --- |
| 命令 | `select.saveSelection`、`select.loadSelection`、`select.grow`、`select.similar` |
| 包装 | `save_named_selection` / `load_named_selection` / `begin_color_grow` / `update_color_grow` |
| WASM | `saveNamedSelection`、`loadNamedSelection`、`beginColorGrow`、`updateColorGrow` |
| UI | 「命名选区」与「按颜色扩大」两个分组（后者含 Grow/Similar 与取样全部图层） |
| 内容/核验 | 命名选区进 Alpha 通道并随工程往返；同名未确认覆盖直接拒绝；新增通道前核对 `MAX_ENTRIES`（层 + 通道 + 1），覆盖不占新条目 |
| 验收 | 保存/覆盖拒绝/覆盖成功/重载边界、工程往返、Grow `[0,0,21,10]` vs Similar `[0,0,21,9]` vs 几何 Expand `[0,0,8,8]`；存储上限实测在 4095 个通道处拒绝且覆盖仍可用；Rust `u19_*` 5 项 |

已接通。

## U20 快速蒙版及其画笔编辑

| 项 | 值 |
| --- | --- |
| 命令 | `select.editInQuickMaskMode`（进入/退出），临时通道绘画 |
| 包装 | `begin_quick_mask` / `paint_quick_mask` / `exit_quick_mask` |
| WASM | `beginQuickMask`、`paintQuickMask`、`exitQuickMask` |
| UI | 「快速蒙版」分区：覆盖色（内核真值：颜色/不透明度/着色侧）、笔迹黑/白两档、笔刷大小、笔迹点、进入/画入/退出/取消 |
| 内容/核验 | 笔迹只写临时选择通道，不写图层像素或像素蒙版；退出转选区一步历史，取消恢复进入前选区；覆盖色是视图属性，`draft.overlay` 报出临时通道的 `color`/`opacity`/`indicates` |
| 验收 | 进入→两笔→退出的 hash/修订/历史在中途不变、退出恰好一步；取消后选区回到 `[1,1,4,4]`；白笔加入选区 `[2,2,31,14]` / 黑笔遮出 `[2,2,6,6]`；Rust `u20_*` 3 项 |

已接通鼠标与 Q 两条入口，二者共用同一草稿：

- **Q**：`photo-editor-shortcuts.ts` 解析为 `{kind:"quickMask"}`（不是上游命令直通），
  `photo-editor-app.tsx` 的 `toggleQuickMask()` 经 `controller.features.selections` 分派：
  未开 → `beginQuickMask()`；已开 → `exitQuickMask(false)`（确认转选区）；其它草稿在场时不抢按键。
- **画笔同源**：草稿在场时画布笔迹改走本域 `paintQuickMaskStroke`（编译与 `target:"quickMask"` 在域内，
  逐批落笔且抬笔去重），Esc 走 `exitQuickMask(true)` 取消。
- **兜底改道**：`run()` 遇到 `select.editInQuickMaskMode` 一律转到本域，任何未来的菜单/脚本入口都绕不过草稿。
- **门禁**：草稿期 `saveProject` / `undo` / 其它写命令由 `hasActiveDraft()` 与内核统一门禁拒绝。

## U21 对象/主体/天空/焦点选择和移除背景

| 子能力 | 命令 | WASM | UI | 状态 |
| --- | --- | --- | --- | --- |
| 对象 | `select.object` | `beginSmartSelect("object", …)`（`point` 或 `rect`） | 方式=对象 + 采样区域（取样点 / 矩形区域）+ 输出（选区/像素蒙版） | 已接通：点 `[92,72,56,56]` 与矩形 `[72,71,96,80]` 候选不同 |
| 天空 | `select.sky` | `beginSmartSelect("sky", …)` | 方式=天空 + 阈值/软化（阈值越高判得越严） | 已接通（无天空场景按真实算法拒绝并说明原因） |
| 焦点区域 | `select.focusArea` | `beginSmartSelect("focusArea", …)`（`range`/`noise`） | 方式=焦点区域 + 范围 + 噪点 | 已接通：`range 0.9 → [0,0,240,180]` vs `range 0.1/noise 0.6 → [0,17,240,135]` |
| 移除背景 | `layer.removeBackground` | `beginSmartSelect("removeBackground", …)` | 方式=移除背景 | 已接通（输出蒙版，不改像素） |
| 主体 | `select.subject` | `beginSmartSelect("subject", …)`（参数 `mode`/`sampleAllLayers`） | 「主体」选项跟随运行时命令表自动出现 | 已实测通过：预览 `[3,11,54,18]`、确认一步历史、撤销回无选区 |

采样层（“采样所有可见层”）对对象/主体/天空/焦点可切换；移除背景不暴露该选项（上游该命令固定只看活动层）。
参数在候选在场时仍可编辑，“更新预览”先丢弃旧候选再重算——上游 `select.*` 没有 update 变体，
不先丢会被统一草稿门禁以“请先确认或取消选区修改”拒绝（已实测）。

验收：对象预览 `[0,0,22,10]` 且确认后一步历史可撤销；`output: "mask"` 时确认写出像素蒙版，选区+转蒙版合并为一步历史（实测 steps=1，一次撤销回滚蒙版与选区）；`removeBackground` 挂上蒙版、像素不变；`select.subject` 已开放，预览零写入、确认一步、撤销复原。

`select.subject` 已随 U21 交付开放：能力表登记在 `features/selections/mod.rs`，三处"断言它关闭"的
守卫（`capability.rs`、`tests/editor.rs` 命令表与 dispatch 层）翻转为"已开放"——它们记的是前置阶段
尚未交付的状态而非产品选择（spec 明确要求接入传统 Subject，design 写明不按名称误禁为 AI）。
宿主 `editor-workspace.test.ts` 用硬编码假内核，不读真实能力表，因此不受影响。

## U22 色彩范围的画布取样和高级选项

| 项 | 值 |
| --- | --- |
| 命令 | `select.colorRange`（`points`、`subtractPoints`、`order`、`fuzziness`、`localized`、`range`、`tonalRange`、`sampleAllLayers`、`invert`、`mode`） |
| 包装 | `begin_color_range` / `update_color_range` |
| WASM | `beginColorRange`、`updateColorRange`；候选轮廓经 `draftOutline` |
| UI | 「色彩范围（画布取样）」新增分组：**「单击画布加点 +」/「单击画布减点 −」**、手输 X/Y 取样、局部群组、色调区间（高光/阴影单电平、中间调上下限）、采样层、反相；保留既有单色/反相面板 |
| 内容/核验 | 预览用 scratch session；确认提交最后一份预览 |
| 验收 | 多点增/减取样改变候选、确认边界等于最后预览、色调区间实测改变候选（高光 230→`[0,11,20,18]`、高光 120→`[0,11,40,18]`、阴影 40→`[38,11,22,18]`）、非法电平/反向区间被拒、`detectFaces` 仍拒绝；Rust `u22_*` 2 项 |

已接通。`detectFaces` 上游未实现，保持拒绝并按本 change 边界记录。

**画布单击取样**：spec 标题就是「色彩范围的**画布取样**」，要求「画布多点/增减取样」，此前取样点
只能手输 X/Y。现在与 U17 共用 `features/selections/canvas-pick.ts` 的一次性待命：面板布防 →
画布单击把该点推进取样队列并立即重算候选 → 自动解除。实测（两块不同色块）：
红 `[2,10,20,20]`、蓝 `[35,10,20,20]`、两点 `+` 并集 `[2,10,53,20]`、
`points:[红] + subtractPoints:[蓝]` 回到 `[2,10,20,20]`。

**上游语义（不是缺陷）**：`replace` 模式会把结果与**已有选区**取交集（`scope_color_range`），
所以"先提交红、再按 replace 取蓝"会被削成空选区并报"取样没有命中任何像素"。这与 Photoshop 一致，
出口是面板的组合模式选择器；本域不改上游语义，也不替用户偷偷改成 `add`。

## U23 选择并遮住的修边画笔和预览

| 项 | 值 |
| --- | --- |
| 命令 | `select.refineEdge`（`radius`、`smartRadius`、`smooth`、`feather`、`contrast`、`shiftEdge`、`decontaminate`、`amount`、`sampleAllLayers`、`refineStrokes`、`output`） |
| 包装 | `begin_refine_edge` / `update_refine_edge` |
| WASM | `beginRefineEdge`、`updateRefineEdge`；修边后候选轮廓经 `draftOutline` |
| UI | 「选择并遮住工作区」：参数、智能半径、取样全部图层、净化颜色/量、前景/背景修边笔迹、六种输出 |
| 内容/核验 | 预览不改修订/历史；输出按选择/蒙版/新层/新层带蒙版/新文档/新文档带蒙版分别落地 |
| 验收 | 真实预览 `[1,1,18,14]`、修边笔迹并入预览、确认一步历史；`newLayer` / `newLayerWithMask` / `layerMask` 各自成功；非法半径、未知输出、无选区均拒绝；**净化颜色会把 `selection`/`layerMask` 升级为 `newLayerWithMask`（实测层 2→3、选区清空），面板如实提示真实输出**；Rust `u23_*` 3 项 |

已接通。新文档输出受共享文档名额约束，名额不足时整次拒绝（由共享注册表给出）。

**净化颜色的静默升级已显式化**：上游 `refine_edge` 在 `decontaminate: true` 时把
`selection` / `layerMask` 改成 `newLayerWithMask`（去色需要新像素，与 Photoshop 同义）。
面板此前直接照抄用户所选，用户会以为"输出设置没生效"。现在显示
「净化颜色需要新像素：确认后实际按『新图层（含蒙版）』输出，而不是『选区』」，
但**不偷偷改下拉框、也不在前端伪造升级**——转发给内核的仍是用户所选 + `decontaminate/amount`。

## U24 像素蒙版密度、非破坏羽化和显示模式

| 项 | 值 |
| --- | --- |
| 命令 | `layer.layerMask.edit`（`density` 0–100、`feather` 0–1000）；查看 `view.layerMask`，`\` 等价开关 `layer.toggleMaskOverlay` |
| 包装 | `edit_layer_mask` / `layer_mask_properties` / `view_layer_mask` |
| WASM | `editLayerMask`、`layerMaskProperties`、`viewLayerMask` |
| UI | 「像素蒙版」分组：密度、羽化、独立查看/叠加查看/切换叠加（`\`）/关闭查看；`\` 是真实键位（`code: "Backslash"` → `{kind:"maskOverlay"}` → `layer.toggleMaskOverlay`） |
| 内容/核验 | density/feather 是属性：采样值不变、工程重开仍可改；查看模式不改内容 hash/历史 |
| 验收 | 编辑后重读 `density 40 / feather 6`、`pixelsPreserved: true`；gray→overlay→off 期间 hash 与历史不变；越界与无蒙版均拒绝；`project-verify` 新增两条属性/表面格式检查；`\` 真按键落到 `layer.toggleMaskOverlay`（Shift/修饰键不抢），该切换命令在真实内核上 `view` 由 `null`→`"overlay"`→`null` 且不写内容 |

已接通。核验器现在拒绝越界 density/feather 与非 8 位灰度蒙版表面。

## 覆盖矩阵缺口

- ~~`select.subject`~~：已随 U21 交付开放，不再是缺口。
- ~~宿主切换门禁~~：**已接通**。`pendingDraftOf()` 调用本域
  `features.selections.unsettledDraftReason()`；判定（只读内核 `selectionDraftState()`）与文案
  （`SELECTION_DRAFT_SWITCH_REASON`）都留在本域，宿主没有第二份草稿状态机。同一 `pendingDraft`
  也进 `planCloseDocument()` / `planLeave()`，所以切标签、关闭、离开页面都会先要求结算。
  内核侧另有兜底：过期草稿被标记 `stale`、提交前比对归属，且 `file.new`/`file.openImage`/
  `file.openProject` 在草稿期间一律被统一门禁拒绝。
- 真实设备交互（电脑 1440×1000 / Pad 1024×768）与截图：当前环境无 GPU 且无显示会话，
  待人工验证；原因写在 verification.md。
