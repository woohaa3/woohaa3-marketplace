# 验收计划与记录

## 本次实施状态

本域（`layers`）实现、**共享装配、能力登记、内容身份与核验器接线**均已落地，非渲染检查与
真实 WASM 主线脚本全部通过。仍缺的只有**真实 GPU 下的像素外观**与**人工逐项操作+截图**，
按仓库约定标「待人工验证」，原因见文末「真实 UI 与设备」。

## 必须验证的主线

可编辑渐变填充 → 链接多层 → 粘贴入选区 → 分离 Blend If → 样式跨层复制/转层 → 去边 → 两个图层复合往返。

本主线已在**真实匹配 WASM**（`packages/editor/dist/wasm`，`pnpm run wasm` 产物）上按上述顺序用脚本
逐项执行完毕，并逐项记录成功 / 拒绝 / 取消 / 内容身份 / 历史 / 工程重开。脚本与完整输出已入库为
[evidence/mainline-real-wasm.mjs](evidence/mainline-real-wasm.mjs) 与
[evidence/mainline-real-wasm.txt](evidence/mainline-real-wasm.txt)（146 项检查、0 失败，可直接复跑）。

另有**逐 U 组**的脚本 [evidence/per-unit-real-wasm.mjs](evidence/per-unit-real-wasm.mjs)
（输出 `evidence/per-unit-real-wasm.txt`，**126** 项检查全绿）。它按 U57/U58/U59/U60/U61/U62/U63/U64
分组独立起新文档，专门覆盖主线脚本没有逐条断言的部分：三类填充的创建/读回/重开、高级混合
`advancedBlending`/`channels`/`blendIf` 的真实读回、四条去边命令各自的预览像素与撤销、图层过滤
三种主条件、以及 U61 的全部跨层样式动作。两套脚本分工是「顺序主线」+「逐组穷举」，不是重复。
汇总如下：

| 阶段 | 关键实测结果 |
| --- | --- |
| 前置 | `file.new` 1440×1000，画布尺寸读回 `1440×1000` |
| U57 可编辑渐变填充 | 建层返回 `layer=3`；`fillLayerInfo` → `gradient`；预览 1024×711 且指纹不变；提交后指纹 `6ab6e8f3…`→`19c2ee5e…`；撤销复原；非法单端点被拒；重开后仍 `gradient` |
| U58 链接/标签/盖印/锁定 | 多选 `[4,5]`；`linkLayers` 后两层 `linkGroup=1`；标签读回 `blue`；`selectLinkedLayers` 选中 `[4,5]`；`stampDown` 4→5 层；位置锁定层参与对齐被明确拒绝 |
| U59 粘贴入/外 | `pasteInto` 5→6 层、`pasteOutside` 6→7 层，均改内容指纹；`pasteRegion()` 剪贴板摘要前后一致；无选区时被拒（「需要先建立选区」） |
| U60 分离 Blend If | 预览 1024×711 且指纹不变；提交后 `blendIf[0].thisLayer=[30,60,200,235]`、`channels=[true,true,false,true]`、`knockout=shallow`、`blend=Multiply`；交叉端点被拒 |
| U61 样式 | 应用 `Gold` 得真实效果 → 复制样式 → 粘贴到目标层生效 → 缩放 150% → 转移效果 → 效果转层 8→11 层 → 样式栅格化成功；预设 list/new/edit/reset 返回 `presetsRevision` 1→2→3→4，文档 `revision` 恒为 29 |
| U62 去边/净化 | 羽化边缘层上预览 1024×711 且指纹不变；`removeWhiteMatte`/`removeBlackMatte` `changed=true`、指纹变化、撤销后复原；`colorDecontaminate` 在纯色区 `changed=false`；宽度 0 被拒、调整层/填充层被拒、锁定层被拒 |
| U63 图层过滤 | `by:mode`+`multiply` → `visible=3/12`；`kinds:["raster"]`+`name:"像素"`+`onlySelected` → `visible=1`；`kinds:["raster","shape"]` → `visible=11`；过滤后内容指纹与选中层不变；非法主条件被拒 |
| U64 图层复合 | 建 A（三字段）/B（仅可见性）；B 快照 `{visible:true,position:null,appearance:null}`，A 快照 `position:[0,0]`+规范混合名；切 A 恢复可见、切 B 不改位置外观；previous/next/update/duplicate/rename/setComment/setOptions/delete 全通过；不存在的复合名被拒 |
| 保存重开 | `exportBundle()` 后以空 `baseAssetId` 打开：`contentHash()` 与 `bundle.documentContentHash` 一致；填充层参数可读回；复合 `A,B` 保留 |
| scope | `vendor/photocraft` 仍为只读引用 |

统计：146 项检查，**0 项失败或非预期拒绝**（其中 4 项为「按预期拒绝」的正向校验：宽度越界、
非像素层、锁定层、无选区粘贴）。

## 非渲染检查：实际结果

在 Linux x86_64（96 核 / 246 GB，无 GPU）worktree `woohaa3-openspec-2026-10-22-add-photocraft-layer-workflows` 运行，基线 `b0cd6cbc`。

| 命令 | 实际结果 |
| --- | --- |
| `pnpm -C photocraft run check` | 通过。build/typecheck 全绿；`protocol` 5 文件 91 测试、`project-verifier` 2 文件 40 测试、`editor` 41 文件 **304** 测试全部通过 |
| `cargo test --manifest-path rust/Cargo.toml --workspace --offline` | 通过。**233**（editor-core lib）+ 4 + 13 + 25 + 10 + 0 + 1 + 3 + 10 + 15 全绿 |
| `pnpm -C photocraft run wasm` | 通过。wasm 17.43 MiB、glue 97.6 KiB → `packages/editor/dist/wasm` |
| `pnpm -C photocraft run verifier` | 通过。`photocraft-project-verify` release 3.84 MiB |
| `pnpm -C photocraft run features:check` | 通过。`commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084` |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过（`tsc --noEmit` 无输出） |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过。34 文件 275 测试 |
| `pnpm boundary:check` | 通过。`open-closed-boundary.test.ts` 6/6 |
| `pnpm codemap:check` | 通过。47 manifest / 11 文档 / 1358 链接 / 8 模块入口 |
| `pnpm extensions:check` | **失败，与本 change 无关**：`EXTENSION_MODULE_MISSING：扩展 ark-provider 的模块不存在（./shared → 试过 ./dist/shared.js）`，需先构建 `ark-provider`；本 change 未改动 `web/` 下任何扩展目录 |
| `openspec validate 2026-10-22-add-photocraft-layer-workflows --strict` | 通过 |

### `features:check` 的等价性证明（只增不改既有行为）

`features:check` 逐项深比 `notes/feature-boundary-wasm-baseline.json`。基线已按本轮真实构建重新采集，
并逐键验证「只有命令与能力增加」：

| 键 | 结果 |
| --- | --- |
| `build` / `steps` / `errors` / `output` | 与旧基线**逐字节相同**（8 个内容/状态快照、撤销/重做/取消、PNG 字节均未变） |
| `commands` | +48，**删除 0**（新增 id 全部来自本域，如 `layer.newFillLayer.*`、`layerComp.*`、`style.presets.*`） |
| `capabilities.capabilities` | 71 → 79，新增 8 个 `layers.*`，删除 0 |
| `capabilities.nonGoals` / `stages` / `allStages` | 完全相同 |

`tests/fixtures/contract.json` 的 `capabilities` 只追加 8 项（插在 `adjust.curves` 之后），
由 `contract_fixture.rs` 断言等于 `delivered_capabilities()`；其 sha256 已随
`notes/feature-boundary-baseline.json` 的 `sharedFiles` 一并重算。

本域针对性测试（包含在上表内的部分，单列以便复核）：

- `rust/crates/editor-core/src/features/layers/layer_fill.rs` 8 个（U57：三类填充可重编、重开存活、创建时保持面板参数、锁/容量拒绝、预览只读 + 提交一步历史、非法参数不落地、选区生成填充层蒙版且改参数不丢蒙版、`path` 建立矢量蒙版且编辑期拒绝）。
- `rust/crates/editor-core/src/features/layers/tests_pattern_library_interaction.rs` 2 个（改图案库项不改变已应用的填充快照；用户图案库图案可直接用于填充层——这条先暴露了真实缺陷，见下）。
- `rust/crates/editor-core/src/features/layers/layer_workflows.rs` 13 个（U58–U62、U64：分组分派与嵌套键拒绝、Blend If/通道/Knockout 校验、链接/标签/盖印前置条件不改文档、链接层进入移动集合且位置锁定被拒、Blend If 预览只读 + 提交一步历史、粘贴入需选区与剪贴板且剪贴板不变、去边需像素与有界参数、样式预设/缩放/转层校验、样式预设管理可达且不碰文档、复合往返与缺失层报告、复合规范快照按选项裁剪、**复合缺失层报告真的转出到调用方**、复合预算）。
- `rust/crates/editor-core/src/features/layers/layer_filter_domain.rs` 4 个（U63：only_selected 保祖先、mode 匹配与仅组透传、组合条件取交集、非法值拒绝）。
- `rust/crates/editor-core/src/identity/tests.rs` 新增 1 个（填充参数进入内容身份且与其它 kind 兼容）。
- `rust/crates/project-verify/src/features/layers/fill_support.rs` 2 个（合法纯色/渐变/图案通过；越界颜色、乱序/过少端点、超范围缩放、缺失图案、超上限端点数被拒）。
- `rust/crates/project-verify/tests/verify.rs` 15 个（含合法 Fill 通过、非法填充 alpha 拒绝、组不能隐藏不支持内容改用画板用例）。
- `packages/protocol/src/features/layers/workflows.test.ts` 15 个、`fill-content.test.ts` 6 个（参数契约、上限、样式预设管理、填充规范描述与边界）。
- `packages/editor/src/photo-editor-chrome.test.tsx` 6 个（含 21 个本域新菜单命令的可达性与分派）、`layer-panel-interaction.test.tsx` 9 个（含标签颜色色块、`data-link-group`、图层颜色下拉）。
- `packages/editor/src/features/layers/layer-workflow-panels.test.tsx` **22** 个、`layer-workflow-bindings.test.ts` 9 个（面板交互与内核响应形状；渐变参数读回、预览画布实际绘制、预览失败不残留旧像素、混合选项读回、样式跨层动作、复合属性动作与快照显示）。
- `packages/editor/src/editor-view-model.test.ts` 新增 2 个（`linkGroup`/`labelColor`/`advancedBlending`/`channels`/`blendIf` 解码与非法端点丢弃）。
- `packages/editor/src/features/boundaries.test.ts`（section 总数 12→17，并断言 5 个新菜单项的顺序与 `menuOrder`）、`photo-editor-chrome.test.tsx`（5 个新菜单项都能分派到面板）、`editor-workspace-tools.test.ts`（`by`/`mode` 走公共签名）。

### 本轮接通共享装配时的实测（原「集成阻塞 1–7」的去向）

原 verification 把 7 项列为阻塞。本轮按用户指令全部落地，每项都有实测证据：

| 原阻塞 | 处理与证据 |
| --- | --- |
| 1 能力 id 未登记 | `CONTRIBUTION` 追加 8 能力（`order` 21–28）+ 48 命令（`order` 101–148），既有 `0–20`/`0–100` 前缀逐字节不变；`features:check` 通过 |
| 2 `features/index.ts` 装配 | 本域 `sections.tsx` 注册 5 项（`order` 12–16、`menuOrder` 2–6）；`boundaries.test.ts` 由 12 改 17 并断言顺序 |
| 3 `filterLayers` 签名 | `editor-workspace.ts` 加宽为 `{ name?; kinds?; by?; mode?; onlySelected? }`，`panels.tsx` 删掉非字面量对象绕类型的写法 |
| 4 共享 WASM/Editor 面 | 域内 `wasm.rs` 已导出 6 个 `js_name`（`newFillLayer`/`fillLayerInfo`/`previewFillLayer`/`applyFillLayer`/`layerWorkflow`/`layerComps`/`pasteRegion`/`stylePresets`），保持无状态设计，未在 `Editor` 上加草稿字段 |
| 5 内容身份未覆盖填充参数 | 三处同源接通：`content.rs::fill_content` → `document_content.rs`（`fillLayer` 字段，仅非空时输出）→ `identity.rs`（`"fill"` kind + `canonicalize_fill`）；TS 侧 `fill-content.ts` + `shared/content.ts`。实测改参数指纹变化、撤销复原、重开一致 |
| 6 核验器图案引用未接线 | `project-verify/src/lib.rs` 已调用 `fill_support::supported_document(&document)`；实测缺失图案的工程被拒 |
| 7 TS/原生 fill 判定不一致 | `project-verification.ts` 把 `fill` 移入 `ALLOWED_OBJECT_KINDS` 并新增 `inspectFill`/`inspectFillColor`/`inspectFillColorValue`（含图案引用查表）；两边 `objectKinds` 一致，40 测全绿 |

### 本轮新发现并修复的真实缺陷

**缺陷 1（图案库不可达）**：面板的图案下拉列的是**用户图案库**（`patternLibrary.presets`），而填充写路径原先只调用上游
`pattern_cmds::resolve`（只看文档与 `session.patterns`，即内置图案）。结果是从列表里选自定义
图案建填充层会报「找不到图案」。已在 `layer_fill.rs` 内修正：写路径先把用户库并入会话目录，
执行后精确回滚（失败也回滚），预览走隔离会话副本。新增回归同时覆盖「库改名/删除不改已应用快照」。

**缺陷 2（矢量蒙版不可达）**：上游 `mask_new_layer` 支持用 `path` 建设矢量蒙版的填充层，
但本域创建校验器的白名单里没有 `path`，会按「未知参数」拒绝。已把 `path` 加入**创建期**白名单
并校验其三种合法形态（`"work"`、已保存路径名、路径几何对象；空串必须拒绝）。**编辑期**用更严的
白名单（无 `path`）显式拒绝：改填充参数不应顺手替换蒙版类型。回归
`path_creates_a_vector_masked_fill_and_is_rejected_on_edit` 覆盖建层得到 `vector_mask`、编辑被拒且历史
不推进、空串被拒。第三轮又补上面板手势：`FillLayerPanel` 的「蒙版路径（仅新建）」下拉列出
`vectorSnapshot()` 的工作路径与已保存路径，选中后新建时发送 `path`、编辑时绝不发送。

**缺陷 3（背景互转 id 写错，本轮修）**：`MERGE_IDS` 里原用 `layer.layerFromBackground` /
`layer.backgroundFromLayer`，但上游注册的是 `layer.new.layerFromBackground` /
`layer.new.backgroundFromLayer`。错误 id 既不会被命令门放行，`check` 也永远不会被调用——两条命令
实际完全不可达。已改正 `MERGE_IDS`、`check_structure` 的白名单与图层目标分支，并由
`features:check` 的 `commands` 增量确认真实生效。

**缺陷 4（填充参数不进内容身份，本轮修）**：`document_content.rs` 的 `LayerContent` 分派只处理
Group/Smart/Shape/Raster/Text/Adjustment，`Fill` 落入兜底。实测把填充层从 `#112233` 改成 `#ff8800`
后 `content_hash()` **不变**。只补 `document_content.rs` 一条分派还不够——实测会让
`content_hash()` 从「不变」变成 `Err(NoDocument)`，因为共享 `identity.rs` 的 kind 白名单只认 5 种。
最终三处同源（`content.rs` / `document_content.rs` / `identity.rs` + TS 镜像）一起落地，
现有回归固定「改参数必有新指纹」。

**缺陷 5（U64 缺失层报告被统一入口吞掉，本轮修）**：`layerComp.updateWarnings` 的报告在上游是
**命令返回值**（`{warnings:[{comp,name,missingLayers}],count}`），不在文档里。统一入口
`layer_workflow_inner` 只用候选文档算 `changed`，把返回值丢掉了，于是面板点「检查缺失层」只能
显示「成功」而拿不到任何缺失层。实测确认：`warnings` 字段完全不存在。修法是让 `candidate()`
同时返回命令返回值，并在响应里以 `result` 透出（只在确实有对象/数组结果时）；`workspace.ts`
再把 `result` 转给面板。新增回归 `comp_missing_layer_report_reaches_the_caller` 断言空报告是
`[]` 而不是缺字段、删层后点名缺失层 id、报告本身 `changed:false` 不写历史。

**缺陷 6（U60 高级混合读回拿到的是默认值，本轮修）**：`stateJson()` 里
`advancedBlending`/`channels`/`blendIf` 由上游 `inspect` **按需输出**（`advancedBlending` 仅在
非默认时输出、`channels` 仅在排除某通道时输出、`blendIf` 仅在设置过时输出）。面板的读回依赖这些
字段，缺字段就会用面板默认值覆盖用户已保存的设置。已确认这是上游的「省略默认值」语义而非缺陷，
因此修在两处：视图模型 `decodeAdvancedBlending`/`decodeBlendIf` 对缺字段给出与上游一致的默认值，
面板读回依赖改为**值签名**（避免每次刷新重跑 effect 覆盖用户正在拖的值）。逐组实测
`U60 advancedBlending/channel/blendIf read back` 现在真实读到 `knockout=shallow`、
`[true,true,false,true]`、`[30,60,200,235]`。

**缺陷 7（填充/混合/去边预览只有文字没有像素，本轮修）**：三个面板的「预览」按钮原本只回一句
「预览已更新」，内核返回的候选像素被直接丢弃——spec 要求的「实际像素预览」在 UI 上并不存在。
已新增共享 `WorkflowPreview` 画布组件，把内核 RGBA 像素真正画出来；像素长度与尺寸不符或预览失败
时不渲染画布也不残留上一份像素（避免用户以为新参数已生效）。逐组实测四条去边命令、
U57 填充、U60 混合的预览都返回正尺寸像素且正式指纹不变。

### 本轮补齐的缺口

**U61「样式预设管理」原先只接了 `apply`**。上游有 `style.presets.list`/`new`/`edit`/`reset`，
但本域只包装了 `apply`，面板因此无法列出预设库、无法把样式存成预设、无法改名/删除/恢复默认。
这是 scope 明文要求的子能力，不是额外扩张。已补齐 `PRESET_IDS` 与 `check_preset` 逐动作校验，
并把 `layer.layerStyle.defaultFor`/`makeDefault`（「重置为默认」要读回用户默认）一并纳入。
它们改的是 `session.presets`（**会话偏好**），返回 `changed:false` + `presetsRevision`，
**不推进文档修订、不写历史、不改内容指纹**——实测 `revision` 恒为 29。

**U64「复合」原先只返回计数，无法交付快照**。`file.export.layerCompsToFiles` 需要写目录，浏览器宿主
没有该能力，因此改为在只读 `layerComps()` 上给出**规范快照**：每个复合新增 `snapshot`，严格按声明的
`visibility`/`position`/`appearance` 裁剪，未声明字段为 `null`，外观取规范小写混合名。第三轮补上真正
可交付的导出动作：面板「导出快照 JSON」把这份权威快照序列化为 `photocraft-layer-comps` v1 并走浏览器
下载（`URL.createObjectURL` + `a.download`），不重算、不写文档；无复合时按钮禁用，通道不可用时报
「导出失败：…」。逐组脚本断言交付物 `JSON.stringify` 往返后声明字段、未声明 `null`、缺失层 id 全部保持。

**U61「效果转层」与「重设为默认」原先既无面板入口、也缺少前置拒绝**。`layer.layerStyle.transferEffects`
与 `defaultFor`/`makeDefault` 早已登记，但面板只有「效果转层」（`createLayer`，指把效果拆成独立层）。
第三轮已补：面板可选目标层做「复制/移动效果到目标层」，并有「效果默认值」读写；内核侧同时补上
`transferEffects` 的源/目标存在、源层无效果、`effect` 越界、同层、目标层锁定与移动时源层锁定的前置校验，
拒绝时不写历史。效果默认值继续只推进 `presetsRevision`，实测内容指纹不变。

**U58「链接移动尊重锁定规则」原先只断言 `link_group` 有值**。已改为走 Move 工具同一链路
（`move_targets` + `moved`）并断言两层内容边界一起平移 7px、位置锁定层被拒；本轮主线脚本另补
「位置锁定层参与对齐被拒」的实测。

## 实现期失误与更正（如实记录）

补 U58 链接/锁定回归时，我用整块替换的方式重写了测试段，误删了该文件里原有的 4 个测试
（`check_dispatches_only_this_domains_groups_and_rejects_nested_keys`、
`blend_if_ranges_channels_and_knockout_are_validated`、`blend_preview_is_read_only_and_apply_is_one_history_step`、
`links_labels_and_stamps_reject_unmet_preconditions_without_writing`），且该文件尚未入库、无法用
`git checkout` 取回。已按真实 API 契约逐条重写恢复，并发现原断言与现行响应不符（预览响应只有
`preview` + `revision`）。教训：该目录下多个域文件仍是未入库状态，不能用「整段替换」编辑测试区。

主线脚本编写过程中也有两处**脚本自身**的错误（不是产品缺陷），一并记录以免误读：
`passStringToWasm0` 被传入对象而非 JSON 字符串导致 `memory access out of bounds`；
`select.deselect` 在无选区时本就返回「no selection」，被脚本当成失败。修正调用方式后两处都正常。

## 真实 UI 与设备

独立 dev 和 Woohaa 均使用真实匹配 WASM；电脑 1440×1000 和 Pad 正常窗口 1024×768 逐项操作并留应用内截图，检查菜单/弹层/参数/内容与边界一致性。Pad 窗口走查不代表真实 Pad/数位笔硬件验证。

先按平台探测 GPU：Windows 查询显示适配器，macOS 用 system_profiler，Linux 用 renderD；不得在 Windows/macOS 以 /dev/dri 判定无 GPU。确无 GPU 不采渲染/性能证据，标待人工验证并写原因；有 GPU 但缺显示会话、数位笔、Photoshop 或 codec 时分别记录对应原因，不笼统写「无 GPU」。软件渲染不能替代硬件结论。Photoshop 仅在本 change 修改 PSD 兼容项时需要外部可编辑往返验证。

**本次实际环境判定**：`ls /dev/dri | grep '^renderD'` 无输出（Linux，无 `renderD*`），确认该容器无真实 GPU。按仓库约定，渲染相关证据（真实设备帧率/长尾、GPU 计时、视觉截图、播放/编辑/拾取画面一致性）在此环境**不采集**，一律标「待人工验证」。真实原因是「该 CI 容器无 GPU（无 `/dev/dri/renderD*`）」，不是缺显示会话或缺依赖。

集成阻塞已全部解除，菜单入口现已可达（5 项「图层」菜单 + `boundaries`/`chrome` 测试断言），
三处「实际像素预览」也已真的把内核像素画到面板画布上（`WorkflowPreview`）。因此待验证项只剩
**像素外观的视觉效果**与**人工操作+截图**两类——注意这不是「预览不存在」，而是「预览的视觉
结论需要人眼在真实 GPU 上确认」：

| 待人工验证项 | 已完成的那一半 | 为什么本机做不了 |
| --- | --- | --- |
| U60 分离滑块的平滑过渡、组/剪贴合成外观 | 端点/通道/挖空**真实读回**、预览返回正尺寸像素且不改正式内容、提交一步历史、交叉端点被拒 | 需真实 GPU 合成像素做视觉比对（像素已能取到，结论需人眼） |
| U62 「去杂边而保留主体」的像素级外观 | 四条命令各自预览像素 + `changed=true` + 指纹变化 + 撤销复原 + 越界/非像素层拒绝 | 需真实 GPU 与真实图像做像素比对 |
| U57 填充层的最终视觉、U64 复合切换的视觉对比 | 参数往返、快照裁剪、切换语义、保存重开 | 同上 |
| U64「导出快照 JSON」在真实浏览器里的下载落地 | 交付物结构与逐字段一致性、无复合时禁用、通道不可用时报错 | 需真实浏览器触发 `a.download` 并核对落盘文件 |
| 电脑 1440×1000 / Pad 1024×768 逐项操作 + 应用内截图 | 主线脚本已在真实 WASM 上全部通过 | 需人工点击与截图 |

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。智能滤镜栈、外链资源、印刷色彩和未知 PSD 块继续拒绝。图层过滤不被当成内容编辑。

维持的 scope 排除项（未实现，属预期）：U05 不兼容色彩/特性格式、U76 原生 Droplet/脚本、U77 无浏览器 codec 路径。未修改 vendored 上游 `photocraft/vendor/photocraft`。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
