# 能力实现矩阵（P0 → P7）

> **历史快照。** 本表描述的是旧独立子项目（自建 `editor-core` Rust 内核 + `packages/editor` React 界面），
> 该实现已在 client `64765113` 删除。现在的编辑器是固定上游的 egui/WASM，源码在
> [`../web`](../web/README.md)；下表出现的 `rust/crates/…`、`packages/editor/…`、`vendor/photocraft/…`
> 路径都不再存在。当前生效的能力规格见主仓 `openspec/specs/photocraft-*`。

change: `2026-10-22-complete-photocraft-webui-editing`，任务 1.1 / design D2。

本文件记录**每一阶段实际接通**的链路：协议定义（`packages/protocol`）、内核命令与算法
（`rust/crates/editor-core`，复用 `vendor/photocraft` 快照）、WASM 绑定、React 入口、内容身份与
工程核验。状态只有三种：

- **已交付**：整条链路接通并有测试；UI 入口开放。
- **上游可复用**：vendor 快照里已有算法，本内核只做包装；仍需本 change 补包装与 UI。
- **需补建**：vendor 没有可直接复用的实现，必须在本内核新增。

`vendor/photocraft` 快照**逐字节只读**，任何能力都通过本地包装接入（design D1）。

> 覆盖更正（2026-10-22）：当前协议将 P0–P7 登记为已交付，但源码与实际 UI 复核仍发现工具、
> 参数和交互缺口（例如矩形拖绘、分通道曲线、笔刷纹理/颜色动态与路径节点编辑）。下表的
> 「已交付」不能作为完整 UI 覆盖结论；逐项状态以[上游接入差异清单](../../../docs/audits/photocraft-upstream-coverage-2026-10-22.md)为准。
> 「实现位置」保留现有包装事实，便于后续判断哪些只需接界面、哪些还需补包装。

## P0 基础与首期能力

| 能力 id | 上游实现 | 本内核包装 | 协议 | React | 核验器 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| `layers.composite` / `layers.groups` / `layers.blend.*` | `crates/compose`、`crates/doc` | `editor.rs` 预览与 `inspect::document` | `image-project-editor.ts` | 图层面板 | `verify` + `blend_modes` | 已交付 |
| `layers.styles.*`（含图案） | `crates/doc::effects`、`crates/compose` | `layer_properties_preview.rs`、`pattern_library.rs` | 同上 | 样式编辑器 | `style_support`、`pattern_support` | 已交付 |
| `compose.transform` | `crates/engine::transform_cmds` | `transform_preview.rs` | 同上 | 变换手势 | 通过内容指纹 | 已交付 |
| `selection.rect` / `selection.lasso` / `selection.feather` | `crates/engine::selection_cmds` | 命令直通 | 同上 | 选框／套索 | 选区不进入内容 hash | 已交付 |
| `mask.pixel` | `crates/engine::mask_cmds` | `mask_commands.rs` | 同上 | 图层面板 | `verify` | 已交付 |
| `paint.brush` / `paint.eraser` | `crates/paint`、`engine::brush_cmds` | `editor/stroke.rs`（LiveStroke） | 同上 | 画布手势 | 笔迹落为像素 | 已交付 |
| `text.horizontal` | `crates/text`、`engine::type_cmds` | `text_preview.rs` | 同上 | 原位文字 | `verify` | 已交付 |
| `adjust.brightness-contrast` / `hue-saturation` / `curves` | `crates/compose::adjust`、`engine::adjust_params` | `adjustment_preview.rs` | 同上 | 调整面板 | `verify::inspect_adjustment` | 已交付 |

### 图层工作流（change: `2026-10-22-add-photocraft-layer-workflows`）

| 能力 id | 上游实现 | 本内核包装 | 协议 | React | 核验器 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| `layers.fill` | `engine::commands`（`layer.newFillLayer.*`）、`gradient_fill_cmds`、`pattern_cmds` | `layer_fill.rs`：创建/预览/确认三步；创建时把 `gradient.fill.set` 的剩余参数（透明度/缩放/反相/仿色/对齐/偏移/中点）在隔离会话内一次合成，仍是**一步历史**；用户图案库并入解析 | `features/layers/workflows.ts` | `FillLayerPanel`（图层 ▸ 填充层…）：读回端点/透明度/偏移/反相/仿色/对齐/图案相位 + 真实像素预览画布；「蒙版路径（仅新建）」下拉取自 `vectorSnapshot()`，只在新建时发送 `path` | `fill_support` + TS `inspectFill` | 已交付（像素外观待人工验证） |
| `layers.links-and-labels` / `layers.stamp-and-background` | `engine::layer_multi_cmds`、`layer_menu_cmds` | `layer_workflows.rs`：链接/标签/剪切建层/盖印/背景互转的前置条件校验 | 同上 | 图层面板：行内标签色块 + `data-link-group` 链接栏 + 图层颜色下拉；图层/编辑菜单对应条目 | 通过内容指纹 | 已交付 |
| `layers.paste-into-outside` | `engine::edit_cmds`（`edit.pasteSpecial.*`） | `layer_workflows.rs`：选区+剪贴板前置，剪贴板不被消耗 | 同上 | 编辑 ▸ 选择性粘贴 ▸ 粘贴入/粘贴外 | 通过内容指纹 | 已交付 |
| `layers.advanced-blending` | `engine::layer_style`、`engine::compose` | `layer_workflows.rs`：Blend If 分离端点/通道/挖空校验 + 隔离会话预览；`stateJson()` 的真实读回走 `decodeAdvancedBlending`/`decodeBlendIf` | 同上 | `BlendingPanel`（图层 ▸ 混合选项…）：读回挖空/通道/Blend If/两个蒙版开关 + 合成像素预览；`BlendIfSliders` 提供合并 2 手柄/分离 4 手柄的滑块与合回开关 | 通过内容指纹 | 已交付（平滑过渡像素待人工验证） |
| `layers.style-presets` | `engine::presets::styles`、`layer_style` | `layer_workflows.rs`：复制/粘贴/缩放/转移/转层/栅格化 + `style.presets.*` 与 `defaultFor`/`makeDefault` 会话偏好管理（`changed:false` + `presetsRevision`，不进历史/身份） | 同上 | `StylePresetPanel`（图层 ▸ 样式预设…）：跨层六动作 + 预设四动作 + 应用预设；按目标层下拉做「复制/移动效果到目标层」，并有「效果默认值」`defaultFor`/`makeDefault` 编辑 | `style_support` | 已交付 |
| `layers.matting` | `engine::layer_menu_cmds`（`defringe`/`remove*Matte`/`color_decontaminate`） | `layer_workflows.rs`：仅像素层、有界参数、预览隔离 | 同上 | `MattingPanel`（图层 ▸ 去边与净化…）：四条命令 + 参数 + 真实像素预览画布 | 通过内容指纹 | 已交付（去杂边保主体像素待人工验证） |
| `layers.layer-comps` | `doc::LayerComp`、`engine::modes_cmds` | `layer_workflows.rs`：12 条复合命令 + 按声明选项裁剪的规范快照；命令自身的 `result`（缺失层报告）透出给调用方 | 同上 | `LayerCompPanel`（图层 ▸ 图层复合…）：新建/切换/更新/复制/删除/上一个/下一个/改名/注释/选项/恢复/**检查缺失层** + 快照显示 + **导出快照 JSON**（`photocraft-layer-comps` v1，走浏览器下载通道） | 通过内容指纹 | 已交付 |

已验证的细节（本节状态对应的实测，脚本见
`openspec/changes/archive/2026-10-22-add-photocraft-layer-workflows/evidence/per-unit-real-wasm.mjs`）：

- U57 创建时就保持面板参数（stops/透明度百分比/缩放/反相/仿色/对齐/偏移），且**只占一步历史**；
  空图案库时 `pattern` 被明确拒绝且不留半成品层；用面板「蒙版路径」新建得到 `vectorMask`，
  编辑同一层再带 `path` 被明确拒绝（改参数不顺手换蒙版类型）。
- U60 `advancedBlending`/`channels`/`blendIf` 能真实读回（上游按需省略默认值，视图模型补默认值）；
  2 端点与 4 端点滑块可互转，非法交叉端点被拒。
- U62 四条命令都有正尺寸预览像素；有杂边时 `changed=true` 并可一步撤销，无杂边时是 `changed=false`。
- U61 `transferEffects` 的源/目标不存在、源层无效果、`effect` 越界、同层、目标层锁定、移动时源层锁定
  都在内核侧提前拒绝且不写历史；`defaultFor`/`makeDefault` 只推进 `presetsRevision`，内容指纹不变。
- U64 缺失层报告不再是「成功但无内容」，删层后点名缺失层 id 且报告本身不写历史；
  导出的 `photocraft-layer-comps` v1 JSON 经 `JSON.stringify` 往返后逐字段与内核快照一致。

「像素外观待人工验证」的原因统一是：本机为无 GPU 的 Linux 容器（`/dev/dri` 无 `renderD*`），
按仓库约定不采集渲染/视觉证据；结构、拒绝、历史、内容身份、预览像素与工程往返已在真实 WASM 上实测。
注意这里的「待验证」是**视觉结论**，不是「没有预览」——三个面板都已把内核像素画在画布上。


## P1a 笔刷基础

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `brush.presets` | `paint::BrushPreset`、`engine` 预设命令 | `brush_library.rs`（版本化库 + 程序性默认 + 原子发布）、`brush-library-state.ts` | 已交付 |
| `brush.tip-shape`（间距／角度／圆度／翻转） | `paint::BrushSettings{spacing,angle,roundness,flip_x,flip_y}` | `paint.stroke` 的 `brush` 深合并；`dynamicsPatch` 编译 | 已交付 |
| `brush.pressure`（大小／不透明度／流量压感＋最小值＋曲线） | `paint::ShapeDynamics`、`Transfer`、`ResponseCurve` | 同上；画布逐 coalesced sample 传 pressure | 已交付 |
| `brush.smoothing`（量／拉绳／追赶） | `paint::Smoothing`、`brush_cmds::LiveStroke` | `editor/stroke.rs` 传 `zoom`；面板开关 | 已交付 |
| `brush.dynamics.basic` | `Dynamic{jitter,control,minimum,curve}` | `paint.stroke` 深合并 | 已交付 |

## P1b 高级笔刷

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `brush.external-abr` | `psd::abr::parse`、`io::abr_map::read_abr` | `brush_library::inspect_abr`／`commit_abr`（预算 + 报告 + 子集发布） | 已交付 |
| `brush.tip-sampled` | `paint::TipShape::Sampled(GrayTile)` | `image_tip`（暗像素作画）＋ `import_tip` | 已交付 |
| `brush.dynamics.shape/scatter/texture/color/transfer` | `paint::brush::{ShapeDynamics,Scattering,Texture,ColorDynamics,Transfer}` | `dynamicsPatch`；固定 `PREVIEW_SEED` | 已交付 |
| `brush.paint-blend-modes` | `paint::BrushSettings::mode` | 开放已验证集合；双重／湿画仍拒绝 | 已交付 |
| `paint.pencil` / `paint.color-replacement` | `engine::brush_cmds` 的一次性像素命令 | `features/painting/tools.rs` 白名单；`tool-modes.ts` 编译（铅笔 hardness=1、颜色替换 mode/tolerance/sampling）；工具轨入口已发布 | 已交付 |
| `paint.gradient` / `paint.bucket` | 同上 | `buildGradient`（5 样式、≤64 色标、`method`/`smoothness`）/`buildBucket`（容差、连续、采样层）；拖动一次提交 | 已交付 |
| `paint.magic-eraser` / `paint.background-eraser` | 同上 | `buildMagicEraser`/`buildBackgroundEraser`（sampling/limits/tolerance/protectForegroundColor） | 已交付 |
| `paint.symmetry` | `DocState.symmetry`（会话状态，不进 format/io） | `paint.setSymmetry`/`symmetryFromPath`/`symmetryDisable` + `symmetry_state`；一笔所有镜像同一事务 | 已交付 |
| `paint.eyedropper` | `document.sampleColor` + `sampleColorOptions` | 点/1/3/5/11/31/51/101 平均、5 种采样层策略；写回经 `FeaturePanelContext.setColor` | 已交付 |
| `paint.swatches` / `paint.gradient-presets` / `paint.tool-presets` | 无内容字段（本机偏好） | `swatches.*`、`gradient.presets.*`、`tool.presets.*` 走 `preferenceCommand`，不推进修订、不进工程字节 | 已交付 |

## P2 跨文档与置入

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `edit.layer-transfer` | `doc::Layer` serde + 工程容器 | `transfer.rs`：签名+版本+摘要+容器；图案/嵌入源身份重映射 | 已交付 |
| `edit.workspace-clipboard` | — | 工作区持有字节（`EditorWorkspaceController.copyLayers`、`dev-workspace.ts`） | 已交付 |
| `edit.paste-in-place` | 图层插入原语 | `transfer::paste`（原位/居中 + 一步历史） | 已交付 |
| `file.place-image` | `engine::file_cmds::place_bytes`、`codecs::decode_with` | `place_asset`／`inspect_place_asset` + `place-file.ts` | 已交付 |

## P3 PSD

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `format.psd-import` | `psd::PsdFile::from_bytes`、`io::psd_to_document` | `psd.rs`：预检 + 候选文档 + 损失报告 + 显式扁平副本 | 已交付 |
| `format.psd-export` | `io::document_to_psd_with`、`PsdFile::to_bytes` | `psd::export_psd`：逐层报告 + 显式栅格化副本 | 已交付 |
| `format.psd-loss-report` | — | `compatibility_matrix()`（代码即声明）+ 报告 JSON | 已交付 |

## P4 嵌入智能对象

| 能力 id | 上游实现 | 本内核已有 | 实现位置 | 状态 |
| --- | --- | --- | --- | --- |
| `layer.smart-object` | `engine::smart_cmds` | `smart_convert.rs` | `convert_to_smart_object` | 已交付 |
| `layer.smart-object.replace` | `smart_cmds::replace_contents_bytes` | `smart_source_edit.rs` | `replace_smart_contents` | 已交付 |
| `layer.smart-object.copy-independent` | `Layer::duplicate` / `smart_cmds` | `smart_copy.rs` | `duplicate_smart_object` | 已交付 |
| `layer.smart-object.child-document` | — | — | `smart_document.rs`：关联、幂等 attemptId 回写、冲突恢复 | 已交付 |
| `layer.smart-object` 的源入口（随 U65 补齐） | `engine::smart_cmds` 的源读取 | `smart_source_io.rs`：按选中层投影可用性/原因、逐字节导出嵌入源 | 面板「替换源 / 导出源」，不要求已打开子会话 | 已交付 |
| `layer.smart-object.child-document` 的还原入口（随 U66 补齐） | `smart_cmds` 的 Convert to Layers | `unpack.rs`：解包源树、应用实例放置、id 重映射、图案资源并入、层数/深度预算 | 面板「转回图层」，一步撤销、其他共享实例不变 | 已交付 |
| 含源工程的保存/重开（随 U66 补齐） | — | `editor.rs` 的 `verify_for_open`（被拒才回退含源核验）；Media 的 `verifyProjectForSave`（仅 `unsupported-object` 且外层含 `smart` 时走 embedded-smart） | 部分转回图层的工程可保存并重开，其余拒绝原因与预算不变 | 已交付 |

## P5 调色与选区

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `adjust.levels` / `adjust.channel-curves` / `adjust.vibrance` / `adjust.black-white` | `doc::adjust`、`engine::adjust_params` | `adjustment_preview` 白名单 + `AdvancedAdjustmentPanel` | 已交付 |
| `analysis.histogram` | `compose::render` | `adjustment_ext::histogram`（代际）+ `HistogramPanel` | 已交付 |
| `selection.magic-wand` / `quick-select` / `color-range` | `engine::selection_cmds`、`smartselect_cmds` | 命令白名单 + 统一 `mode`；`select.*` 测试 | 已交付 |
| `selection.modify` | `engine` 选区修改 | `SelectionDraft`（草稿预览 → 一步确认） | 已交付 |
| `selection.refine-edge` | `engine::smartselect_cmds::refineEdge` | `refine_edge_params`／`refine_brushes` + 输出目标 | 已交付 |

## P6 修饰与滤镜

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `tool.clone` / `tool.healing` | `engine::retouch_cmds`（`LiveRetouch`） | `RetouchBaseline` + `LIVE_RETOUCH` | 已交付 |
| `tool.retouch-brush` | 无 live stroke | `REPLAY_RETOUCH`：基线冻结 + 逐步重放 | 已交付 |
| `filter.blur-gaussian` / `filter.sharpen-usm` | `engine::filters` | `FilterDraft`（隔离草稿） | 已交付 |

命令级清单（`filter.*` 共 121 条 + `filter.lastFilter`）见 `features/filters` 的 `CONTRIBUTION.commands`：
命令白名单由本域贡献接入共享 `allowed_command_ids()`，因此新增的是**命令**而非新的 capability id
（`filter.blur-gaussian` / `filter.sharpen-usm` 两条能力 id 不变，登记仍由集成负责人统一提交）。
参数 schema 不在矩阵里重复：唯一来源是上游 `CommandSpec.params` 记法，经 `filterCatalogueJson()` 暴露。

### U37/U38/U39 修饰能力（change: 2026-10-22-add-photocraft-retouch-workflows）

8 个能力 id 已进入 `feature.capabilities`（order 40–47），与 `tests/fixtures/contract.json`、
两份 `notes/feature-boundary-*.json` 同序同值；`pending_capability_ids_match_the_delivered_contribution`
锁定「声明 == 交付」，`features:check` 与基线逐项一致（196 条命令 / 79 个能力）。

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `retouch.patch` / `retouch.content-aware-move` / `retouch.red-eye` | `engine::retouch_cmds` | `RetouchOpDraft`（隔离会话出候选、确认一次）+ `region-gesture.ts` + 共享画布区域手势 | 已交付 |
| `retouch.remove` | `engine::retouch_cmds::remove` | `RetouchBaseline` 笔迹草稿（闭合环绕、可选新图层） | 已交付 |
| `retouch.pattern-stamp` | `engine::retouch_cmds` | `REPLAY_RETOUCH` + 图案来源/对齐参数表 | 已交付 |
| `retouch.history-brush` | `engine::retouch_cmds` + 历史快照 | `resolve_history_source` / `history_sources`（逐状态标注可用性，非法索引拒绝） | 已交付 |
| `retouch.tool-options` | 各 `*_cmds` 参数 | `tool-parameters.ts`（唯一「选项 → 内核参数」表 + 归一化） | 已交付 |
| `retouch.clone-sources` | `engine::presets::clone_source` | 五槽仿制源 + `clone-overlay.ts` 取样框（与落笔同一映射） | 已交付 |

区域命令的「无变化不新增历史」、取消不补交半笔、历史画笔不动游标等验收证据见该 change 的
`verification.md`；真实浏览器（Chromium + 真实 WASM）两档窗口已走查，真实 GPU 渲染/性能项待人工验证。

## P7 构图、文字与矢量

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `image.crop` / `image.image-size` / `image.canvas-size` / `image.trim` | `engine::image_cmds` | `ComposeDraft` + `ComposePanel`；参数规划见 `composition_workflows::plan` | 已交付 |
| `composition.workflows`（U50–U56 的 41 个入口） | `engine::image_cmds` / `transform_cmds` / `warp_cmds` / `edit_menu_cmds` / `align_cmds` / `photo_cmds` / `artboard_cmds` / `slice_cmds` | `composition_workflows` + `ComposePanel` / `CompositionWorkflowPanel` + `CompositionOverlay`；导出经 `compositionExportPlan` / `compositionExportPng` | 36 个已交付；5 个宿主交付保持 `command:null` |
| `view.guides` / `view.grid-snap` | `doc::Guides`、`engine::snap` | `ViewAids`／`snap_point`；视图状态不进内容 hash | 已交付 |
| `layer.filter-list` | —（纯 UI） | `LayerFilter` + `filterLayers` | 已交付 |
| `type.typography` | `doc::text::CharStyle`、`engine::type_cmds` | `typography_patch` + `TypographyPanel` + 内容身份 | 已交付 |
| `vector.path` / `vector.shape` | `engine::vector_cmds`、`doc::vector` | `features/vectors`：`vector-tools` 归约器（12 个工具、`shape`/`pen`/`path` 三种画布手势）+ `canvas-bridge` 接入共享 `photo-editor-canvas`；`shape.*`/`path.*` 命令与面板；已存/工作/裁切路径进内容身份。真实窗口走查与 PSD 往返矩阵待人工，见 change 验收记录 | 已交付 |
| `vector.mask` | `doc::VectorMask` | `vector_mask` + `document_content::path_hash` + 核验器（`features/vectors/inspect.rs` 已由 `lib.rs` 调用，含解码前矢量预算）+ PSD 矩阵（往返待人工） | 已交付 |
| `selection.from-path` | `engine::vector_cmds::path.toSelection` | `path_to_selection`；面板「路径转选区」 | 已交付 |
| `animation.timeline` | `doc::Timeline`、`engine` 时间轴命令 | `Editor::create_timeline` / `navigate_timeline` / `set_timeline_props`；`identity::canonicalize_animation` 计入 `fps`/`duration`（播放头与工作区不进身份） | 已交付（U77） |
| `animation.video-layers` | `doc::VideoData`、`engine::video_cmds` | `Editor::video_layer_command`（空白视频层、插入/复制/删除/恢复帧、显示修帧、栅格化、解释素材帧率）；逐帧 `surface_hash` 进内容身份 | 已交付（U77） |
| `animation.frame-import` | 无上游命令（内核只收字节） | `Editor::import_frames`：解码前整批预算（帧数/累计像素/解码字节）+ 一步历史 | 已交付（U77） |
| `animation.frame-delivery` | `compose::render` 逐帧渲染 | `plan_delivery` / `render_frame` / `render_animation_gif` + 浏览器 PNG 序列与 ZIP；MP4/WebM 走宿主注入的 `AnimationCodecPort` | 已交付（U77；真实 WebCodecs 编解码待人工验证，端口与协商/取消路径已自动覆盖） |

### 构图工作流（change: 2026-10-22-add-photocraft-composition-workflows）

`composition_workflows` 把 U50–U56 的界面语义编译成上游命令参数，并按「参数先行、能力门最后」的顺序校验。
清单共 **41 个入口**：**36 个已进命令白名单并可执行**，5 个宿主交付入口（`artboardsToFiles` /
`artboardsToPdf` / `slicesToFiles` / `photomergeFromFolder` / `stackStatistics`）保持 `command: null` +
固定原因「需要宿主本地文件夹端口」——`scope.md` 明确排除原生文件夹输出。

真实 WASM 对账（`artifacts/composition-workflow-probe.mjs`）：**0 个 `capability-disabled`、0 个参数错误**；
`entries` 步骤对账 31 个入口：16 项直接执行成功，15 项如实报前置条件（缺选区 / 少图层 / 无上一步 / 无参考线 / 无正在编辑的变形），
并用真实构造验证了成功路径（多选两层的 Auto-Align/Auto-Blend、1×1 变形网格的分割与移除（`at` 用文档坐标）、同源平移的
Photomerge、两块打开文档的 HDR）。余下 5 个基础入口（`crop` / `imageSize` / `canvasSize` / `trim` /
`revealAll`）在 U50–U52 的草稿、撤销与工程往返步骤里逐项取证。

「显示全部」不需要新开能力：上游 `image.revealAll` 的实现就是「算所有图层的并集 + 一次
`deleteCroppedPixels:false` 的 `image.crop`」，而 `image.crop` 已在白名单里。本域把该入口落到
`image.crop`，并集仍取自上游 `extra_cmds::reveal_all_bounds`，逐字节等价由
`reveal_all_matches_upstream_pixel_for_pixel` 守着。

参数编译与界面字段的对应关系：`packages/editor/src/features/composition/workflow-form.ts`
的 `WORKFLOW_FIELDS`（声明式字段表）+ `compileWorkflow()`；透视变形、操控变形两个入口另有专用
表单（`PerspectiveWarpForm` / `PuppetWarpForm`）。裁剪框、整图旋转预览与变形网格的纯几何在
`crop-frame.ts` / `rotation-frame.ts` / `warp-mesh.ts`，画布叠加层组件在 `crop-overlay.tsx` /
`rotation-overlay.tsx` / `warp-overlay.tsx`，经 `overlays.tsx` 的 `CompositionOverlay` 按域状态
分发（`COMPOSITION_OVERLAY_SLOTS` 为 `composition.crop` / `composition.rotate` /
`composition.warp`）。旋转预览的尺寸式直接复用 `rotatedCanvasSize`，与内核
`mode_cmds::rotated_size` 同一份判据。

**叠加层挂载**：`overlay-store.ts` 是域内纯展示状态源（不参与内容身份、不进历史），面板发布
`{active:"crop"|"rotate"|"warp", …}`，共享装配只挂一行
`<MountedCompositionOverlay origin={origin} zoom={zoom} />`（`photo-editor-app.tsx` 的 `renderOverlay`
槽位），组件自订阅，没有第二个开关属性。槽位是**按持有者分槽**的：裁剪面板与工作流面板同属一节、
会同时挂载，各自只覆盖 `composition.crop` / `composition.rotate` 与 `composition.warp` 中自己那一个，
撤回时也只让出自己的，不会静默清掉另一个面板的叠加层；优先级为显式编辑会话（裁剪、变形网格）高于
角度副产物（旋转预览）。

**变形网格的画布会话**：`edit.transform.warp` 直接应用、不回传 warp，因此网格由界面会话持有。
选中「变形…」后**显式**点「在画布上编辑网格」才进入：以目标图层 `transformFrame` 铺单位网格发布到
`composition.warp`，拖动控制点改会话里的 `mesh`，「应用变形」按 `{rect, mesh}` 交给内核；双击画布把该
**文档坐标**连同当前网格当内联 warp 交给 `splitWarpCrosswise`，用返回的新网格继续编辑。`at` 是文档坐标
（上游 `param_at` 反解块内参数），不是归一化参数。

**画板/框架的内容身份与核验**：画板是带裁切矩形的组，与组一样递归子层进入指纹
（`document_content.rs` 走组分支并始终带 `children`），`identity.rs` 接受 `kind:"artboard"` 且只允许容器
使用 `pass-through` 混合；`project-verify` 的图层校验接受画板并把 `artboard` 记进 `object_kinds`；
TS 侧 `features/shared/content.ts` 用同一 `groupLike` 规则。此前画板只写 `kind:"artboard"` 而不计子层，
等于「画板里的改动不改变工程 hash」，`exportBundle` 还会因 `document_content_hash` 返回 `None` 而误报
`没有正在编辑的文档`。

**画板/切片导出**：分两段，边界清楚。范围与命名来自内核
`compositionExportPlanJson(kind)`（切片表用 `photocraft_doc::slices::resolve`，含自动切片与内核已给的最终名；
画板取画板矩形 + 文档名前缀成组；重名按 `_2`/`_3` 去重，路径分隔符被清掉）；编码与落盘由
`compositionExportPng(rect)` 在内核里出 PNG 字节（编码器只在核内），再由 `features/composition/export.ts`
逐项交给宿主 `fileDelivery` 端口。任一产物失败即整体失败并报具体文件名，不静默跳过。
控件是「结构」分组里的「导出切片 / 导出画板」，无宿主端口时禁用并说明原因。

开放后续命令时仍要按顺序改三处：`rust/crates/editor-core/src/features/composition/mod.rs` 与
`packages/protocol/src/features/composition/index.ts`（域内/镜像）、`tests/fixtures/contract.json`
的 `capabilities` 数组，以及 `notes/feature-boundary-baseline.json` 的冻结白名单与 `sharedFiles` 哈希
（不同步会让 `features:check` 报漂移）。

### P7 通道与通道计算（change `2026-10-22-add-photocraft-channel-workflows`）

通道是文档级资源（`photocraft_doc::Document::channels`），不是图层树的一部分。查看态
（目标/显隐）来自上游 `channel_view`，不进内容身份；通道内容（名称/种类/叠层元数据/专色密度/
平面像素）进入 `channelsContentHash`。

| 能力 id | 上游实现 | 本内核包装 | 协议 | React | 核验器 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| `channel.panel` | `engine::channel_cmds`（快照/缩略图） | `features/channels/tools.rs` + `wasm.rs` | `features/channels` | `ChannelPanel`（图像 › 通道…） | `features/channels::inspect_document` | 已交付 |
| `channel.color-target` | `ChannelTarget::Color` + `color_restriction` | 同上（`channel.target` + 视图预览） | 同上 | 面板行 + 主画布单通道视图 | — | 已交付 |
| `channel.alpha` | `doc::AlphaChannel` | `channel.new/duplicate/rename/move/delete/options` | 同上 | 面板表单 | 名称/格式/不透明度/tile 范围 | 已交付 |
| `channel.spot` | `ChannelSpot`（屏幕替代色 + 密度） | `channel.newSpot` / `channel.mergeSpot` | 同上 | 专色表单（标注不承诺印刷分色） | 密度范围 | 已交付 |
| `channel.split-merge` | `engine::channel_cmds::{split,merge}` | `channel.split` / `channel.merge`（**只合成 RGB**） | 同上 | 拆分/合并区块 | 文档预算 | 已交付 |
| `channel.apply-image` | `engine::channel_cmds::apply_image` | `image.applyImage` + 隔离预览 | 同上 | `ApplyImagePanel`（图像 › 应用图像…） | 来源尺寸/索引校验 | 已交付 |
| `channel.calculations` | `engine::channel_cmds::calculations` | `image.calculations` + 隔离预览 | 同上 | `CalculationsPanel`（图像 › 计算…） | 输出目标校验 | 已交付 |
| `channel.luminosity-selection` | `engine::selection_cmds` 亮度通道 | `select.loadLuminosity` | 同上 | 面板按钮 | 选区不作为内容 | 已交付 |

内容身份：Rust `features/channels/content.rs` 与 TS `features/channels/content.ts` 对同一 fixture
得到 `984d1d9a4311a91d`；两侧都遵守「空通道不写字段」（旧工程身份逐字节不变）与「查看态不进身份」。
共享接线：`document_content.rs` 调 `attach`，`identity.rs` 读 `channelsContentHash`，
`packages/protocol/src/features/shared/content.ts` 读同名字段。

范围收窄：`channel.merge` 只接受 `mode:"rgb"`。上游的 CMYK/Lab 分支会产出 CMYK/Lab 模式文档，
属本文件下方「明确不实现」的多色彩管理项，因此内核在参数校验阶段按 `mode` 明确拒绝、面板只显示
「模式 RGB」，而不是靠用户不选来回避。

## P8 文档创建、来源与关闭结算

change: `2026-10-22-add-photocraft-file-workflows`，U01–U04。命令 id 只登记实际导出的六组；
`file.closeAll`/`file.closeOthers` 是**工作区**操作（逐文档串行结算），不是内核命令，
因此不进入 `allowedCommands`，也不作为「命令门已打开」宣称。

| 能力 | 命令 / 入口 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| 新建空白文档 | `file.new`（含尺寸/分辨率/背景预览与上限校验） | `features/files/{tools,wasm}.rs` → `features/files/workspace.ts` → `panels.tsx`；宿主 `openBlankDocument` 落在新标签 | 已交付（域 + 宿主 + dev） |
| 新建尺寸预设 / 最近设置 | `document.presets.list/save/delete`、`document.recent.list/add` | 同上 + `packages/protocol/src/features/files/presets.ts`（版本化本机快照） | 已交付 |
| 从图像 / 剪贴板新建 | `open_image` 复用既有解码；候选实例管线 `createDocumentFromImageBytes` | `features/files/workspace.ts`、`clipboard.ts` | 已交付（独立槽位路径） |
| 整份复制为工程字节 | `duplicateDocumentBytes` | 同上 + `download.ts`（浏览器交付，不宣称写盘） | 已交付 |
| 恢复到已声明保存基线 | `restoreSavedBaseline`（`is_pcraft` + `project_verify` + 一步 `Revert` 历史） | 同上；源不可取得时要求重新选择工程文件 | 已交付（`file.revert` 仍关闭） |
| 关闭全部 / 关闭其他 | 非内核命令：`planCloseAll` / `planCloseOthers` / `runClosePlan` | `packages/protocol/src/features/files/close-plan.ts`；宿主 `closeAllDocuments`/`closeOtherDocuments` | 已交付（工作区语义，首个失败即停止） |
| File Info 已知字段 | `file.fileInfo`（8 个已知字段 + 只读相机块 + 按格式损失矩阵） | `features/files/tools.rs`、`metadata.ts`、`panels.tsx` | 已交付；元数据不进内容 hash |
| 编辑器最近文件 | 本域纯规则 + 宿主字节引用 | `packages/protocol/src/features/files/recent-files.ts`、宿主 `recent-files-index.ts`；逐条回答字节是否仍在 | 已交付；字节释放后显示「需重新选择」 |
| 导出参数预设 | `features.io.exportPresets()` 唯一持有 | 本域 `features/files/export-bridge.ts` 只消费入口；缺失时如实不可用 | 入口已接；实现属 `2026-10-22-add-photocraft-raster-interchange` |
| 写入门禁与请求序号 | 非命令（域会话前置） | `features/files/write-gate.ts`；`planFileWrite` + `RequestSequence`（共享外壳与宿主共用同一份判断） | 已交付 |
| 最近文件重开字节 | 非命令（宿主簿记） | `packages/protocol/src/features/files/recent-files.ts` 的 `planReopenRecent` / `reopenRecentLabel` / `heldBytesAfterSave`；宿主 `recent-files-index.ts` 只负责持久化与字节持有 | 已交付（保存工程后同步新字节；落盘失败如实降级） |

暂缓（本 change 明确非目标）：原生路径保存/还原、持续目录监听、PSB、ICC/CMYK/HDR、未编入
WASM 的解码器；新建仅支持 RGB/U8。

## P7 历史、动作与数据驱动（change: 2026-10-22-add-photocraft-history-automation-workflows）

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `history.snapshots` / `history.new-from-state` / `history.purge` | `engine::history_cmds`、`edit.purge.*` | `features/history/tools.rs`（含清理确认门）；快照/源句柄经 `historyStateJson`；`sources[].live` 标记唯一活文档；`epoch` = 文档身份 + 状态标签 + 重做标签；**取样读取点 `history.sample`** 带 `epoch` 校验，失效句柄被拒而不按旧索引返回新内容，`preview:false` 只校验句柄不合成像素（历史画笔落笔前用）；清理范围说明的 `bytes`/`available` 与实际释放量一致（`all` 另计剪贴板与渲染缓存，并以 `approximate` 自报含无读数缓存的低估值） | 已交付 |
| `actions.recording` / `actions.atn` / `actions.shortcuts` | `engine::actions_cmds`、`atn_cmds` | `features/history/tools.rs` + `automation.rs`；ATN 走字节入口，未知步骤整组回滚并报告；`actions.play` 中途失败如实上报；`actions.save` 默认拒绝非 PS 等价步骤，跳过导出是用户显式动作且逐条显示 `skipped` | 已交付 |
| `data.variables` / `data.data-sets` | `engine::variables_cmds`、`image.applyDataSet` | `features/history/data.rs` + `csv.rs`；`doc.variables` 进内容身份（`document_content`/`identity`/协议 `image-project-content`）与文档级核验；变量/数据集均为**整份替换**语义，面板重发时原样带回其余条目（含数据集的 `kind`/`value`），`active` 按名称重定位（删掉生效项则清空） | 已交付 |
| `automation.batch` / `automation.contact-sheet` / `automation.load-stack` / `automation.scripts` | `engine::automate_cmds`、`actions_cmds` | `features/history/automation.rs` 的有界可取消队列；全部字节入口，不登记要求本机路径的上游命令；面板交出 `steps`/`naming`/联系表 `columns`×`rows`，容量与步骤预检都在开始前 | 已交付 |

历史状态与命名快照是**会话**数据，动作/动作集/快捷键属会话或偏好，批处理队列是前台临时态，
三者都**不**进 `.pcraft` 内容身份。只有 `doc.variables`（变量 + 数据集）会持久化并参与内容
身份与工程核验：

- 内容身份：`variables:[…]` 行与图层行同一份规范文本，Rust `identity::canonicalize_variables`
  与协议 `canonicalizeVariables` 逐字节一致；空变量省略以保持旧工程指纹。
- 工程核验：`project-verify` 的**文档级**钩子（`features/mod.rs::DOCUMENT_INSPECTORS`）检查
  变量绑定、种类相容、数据集引用与预算；逐图层钩子没有对应分支。
- 入口：四个 section 同时挂在共享高级区域与「窗口」（历史/动作/变量）／「文件」（自动处理）菜单。
- 暂缓（非能力）：原生 Droplet、任意脚本事件、后台批处理、MCP 仍关闭，且不登记要求文件夹
  路径的上游命令（`file.automate.batch` 等），浏览器里只提供字节入口。

## P7 图像模式、颜色表与双色调

| 能力 id | 上游实现 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| `image.modes` | `engine::mode_cmds`（`applyMode`） | `ModePanel` + `ModePlan`（草稿/确认）+ `features/modes/gate` 跨域门禁 | 已交付 |
| `image.color-table` | `engine::mode_cmds` 颜色表编辑 | `ColorTablePanel`；颜色表进入 `project_content` 内容身份 | 已交付 |
| `image.duotone` | `engine::mode_cmds` 油墨与曲线 | `InkPanel`（沿用文档油墨，不用面板默认值覆盖用户数据） | 已交付 |

配套事实：

- 模式数据（`mode`/`depthBits`/`colorTable`/`duotone`）折叠进共享内容指纹，缺省 RGB/8 位**不产生
  身份行**，旧工程指纹逐字节不变；改颜色表、改油墨、灰度→双色调都会真正改 hash。
- 索引色与位图由 `features/modes/gate` 拒绝**写像素颜色**的命令（画笔、文字、填充、路径着色、
  滤镜、调整），覆盖 `execute`、`beginStroke`、`beginText`、`beginFilter` 四条入口；掩版、选区、
  图层结构、几何与读取类命令不受限。灰度/双色调实测会把彩色收敛为灰阶，不设限。
- 原生核验器（`project-verify`）在样式校验后执行同一套模式规则；陷印需要 CMYK，本次范围排除，
  入口保持关闭并说明原因。
- 计划的归属判据是「文档代际 → 修订 → 内容指纹」：`owner{documentId,generation}` 由工作区在
  计划生成时盖章，确认时逐层比对，因此关闭后重开同一节点、或切到同尺寸同修订的另一份文档都
  不会被误认；冻结/保存阶段的写入返回 `frozen`。宿主侧切标签/关闭/打开新文档统一用控制器的
  `blockingDraft()`（`pendingDraftFailure()`）与 `isSaving()`，不另列草稿种类。

## 明确不实现（`PHOTOCRAFT_NON_GOALS`）

PSB、CMYK／ICC／HDR、外链智能对象、双重笔刷／湿画／鬃毛、智能滤镜栈、液化、AI 主体／发丝
抠图、路径文字、竖排文字、SVG 全量导入导出、复杂布尔路径、原生磁盘保存、独立应用外壳。

这些在协议里是**非目标**而不是「待交付阶段」；两者都拒绝可写操作，但拒绝理由不同
（`photocraftFeatureDisabledReason` / `capability::disabled_reason`）。
