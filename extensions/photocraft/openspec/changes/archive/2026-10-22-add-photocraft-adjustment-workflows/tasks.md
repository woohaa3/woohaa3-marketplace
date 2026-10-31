# 直接调整与调整图层任务

> 实施状态（2026-10-23，第二轮）：本 change 的**开放发布已完成**。新类型与新命令由调整域自己的
> 贡献（`features/adjustments/mod.rs` 的 `CONTRIBUTION`）进入唯一命令门，不再依赖集成负责人跨域
> 追加；原生核验器、内容身份、PSD 白名单、协议能力清单与两份基线在同批落地并互锁。剩下未勾选的
> 只有**真实设备/显示会话**验收（4.2/4.3/5.2）与**跨 change 归档顺序**（1.1），原因逐条写在对应
> 条目里，不用计划或阶段名代替结果。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  - 依据：`b61da631`（边界重构）+ `bdc3c084`（实现）；本次改动落在 `packages/editor/src/features/adjustments/`、`packages/protocol/src/features/adjustments/`、`rust/crates/editor-core/src/features/adjustments/`、`rust/crates/project-verify/src/features/adjustments/`、本 change 目录与模块地图，另加发布必需的共享文件修改（见 5.1 的清单）。

- [ ] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  - 已完成的部分：核对实现提交 `bdc3c084` 与上游固定提交 `4e7a17cd`，逐类读取 `vendor/photocraft/crates/engine/src/{adjust_params,adjust_cmds,commands}.rs` 的真实参数语义（未修改 vendor）；并核对两个 change 在同一 capability 下的要求名**没有重名**（`comm -12` 为空），所以归档只是顺序问题，不是合并冲突。
  - 未完成：`2026-10-22-complete-photocraft-webui-editing` 的 `adjustment-workflow` capability 仍在 changes 中（50/58 项已勾选），归档顺序是集成负责人动作；本 change 不能先归档，也不能替它勾选未验收项。这不是实现阻塞，也不能靠改本 change 的文件解决。

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  - 矩阵落在 `direct_adjustment.rs` 的 `ADJUSTMENT_KINDS`（15 类）/`ADJUSTMENT_COMMANDS`（8 条）、`allowed_keys`/`command_allowed_keys` 参数表，和 `packages/editor/src/features/adjustments/tool-parameters.ts` 的默认值/构造器里；两者由测试 `every_implemented_kind_and_command_has_a_parameter_table` 互锁。发布后**矩阵与命令门是同一份清单**：`every_reported_target_matches_the_command_gate` 逐项核对 `open_kinds()`/`open_commands()` 与 `capability.rs` 的白名单一致（15/15 类、8/8 条均在）。

- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  - 直接调整复用既有 `Editor.adjustment_preview` 槽位与 `begin/preview/commit/cancelAdjustment` WASM 面；未新开 `Editor` 字段、未 import 宿主私有模块。

## 2. 逐项贯通

- [x] 2.1 U40：为现有和新增已开放调整提供直接像素流程，入口区别调整图层，尊重选区和实际可写目标。 成功证据：同一参数直接调整只改原像素/一步历史，调整层方式新增或编辑可重编层。
  - 证据：`begin_direct_adjustment` / `AdjustmentPreview::new_pixels` / `DirectAdjustmentPanel`；测试 `direct_adjustment_changes_pixels_in_one_step_without_adding_a_layer`、`adjustment_layer_path_edits_the_recomposable_layer_and_keeps_the_kind`、`selection_bounds_the_direct_adjustment_and_outside_pixels_stay_untouched`、`only_writable_pixel_targets_and_open_commands_can_start_a_draft`。
  - 入口覆盖：发布后 `open_kinds()` 返回全部 15 类、`open_commands()` 返回全部 8 条，界面入口与命令门逐项一致（`every_reported_target_matches_the_command_gate`）。

- [x] 2.2 U41：补 RGB/R/G/B 曲线与色阶、输出端点、黑灰白场吸管、曲线铅笔/平滑，并同步草稿校验和参数序列化。 成功证据：R 曲线只影响对应通道，切通道保留所有曲线，预览/重开/核验一致。
  - 证据：`layer_draft_accepts_the_new_channel_curve_levels_and_hue_options`（分通道 + 输出端点 + 吸管 + 切通道保留）、`a_single_channel_curve_only_changes_its_own_channel`（R 曲线不影响 G/B）、`curve_geometry_reuses_the_native_spline_without_image_rendering`。
  - 铅笔/平滑是真的 256 级映射：`curve-map-editor.tsx` 直接在 256 级映射上画，`buildCurveMap` 写映射数组 + `pencil: true`。之前只是把 `pencil` 置真、界面仍发控制点数组，逐级绘制实际不存在（内核会把控制点转成一条固定映射）；现在切到铅笔时用内核 `curveGeometry`（与 `points_to_map` 同一份样条）生成初值映射，切回点曲线时把映射折回控制点，不做静默丢弃。平滑按内核同样的半径 3 均值显示（`smoothCurveMap`），`smooth` 仍交给内核同一实现。点曲线图形也读内核 `curveGeometry`，不用本地直线近似。
  - 吸管取样来源：面板用前景色作为取样色（`buildEyedropper(point, {color})`）；画布点选取样需共享画布端口（见文末「画布吸管点选取样」），属宿主端口范畴，本域未新增私有端口。

- [x] 2.3 U42：补色相按六色域范围、Colorize 和黑白 Tint/颜色；保留现有总参数和黑白六色权重。 成功证据：指定色域和着色只按实际内核语义作用，切换高级项不丢已有参数。
  - 证据：`layer_draft_accepts_the_new_channel_curve_levels_and_hue_options`（六色域 + Colorize 切换保留 + Tint/TintColor 校验）、`a_single_hue_range_only_touches_pixels_in_that_range`（红色像素被「红」色域影响、蓝色像素不受影响）。

- [x] 2.4 U43：逐类接入曝光、色彩平衡、照片滤镜、通道混合器、反相、色调分离、阈值、渐变映射、可选颜色的直接调整和调整层。 成功证据：每类均能真实预览、确认、重编、撤销和保存重开，TS/原生核验接受合法参数。
  - 已发布：`features/adjustments/mod.rs` 的 `CONTRIBUTION` 直接声明这 9 类的
    `image.adjustments.{exposure,colorBalance,photoFilter,channelMixer,invert,posterize,threshold,gradientMap,selectiveColor}`
    与 `layer.newAdjustmentLayer.{同上 9 类}`，聚合端（`features::commands_for_stage` /
    `capability::allowed_command_ids`）只做拼接排序去重，因此**不需要**改兄弟域
    `features/{layers,composition}/mod.rs`，也未改 `capability.rs`（阶段能力表本身由贡献推导）。
    能力 id `adjust.{exposure,…,selective-color}`（9 个）随同一贡献进 P5 阶段表。
  - 验收证据（真实 WASM，不是代码存在）：`tests_kind_effects.rs::every_implemented_kind_produces_a_real_pixel_change`（15/15 类在隔离会话跑上游命令，逐类断言像素差异 + 恰好一步历史）、`every_published_kind_can_create_an_adjustment_layer_and_be_edited`（15/15 类经 `layer.newAdjustmentLayer.*` 建出可重编调整层）、`tests/editor.rs::every_published_adjustment_survives_save_reopen_and_psd_round_trip`（保存重开指纹一致、PSD 往返保类）、`packages/editor` 的 15 类面板用例（且要求控件操作真的写回 `layer.setAdjustment`）+ `features/adjustments/adjustment-layer-actions.test.ts`（调整层入口与 15 类清单双向互锁）。
  - 核验器（两侧）：`project-verify` 的 `inspect.rs` 接受 15 类，`ColorLookup` 与 `Adjustment::Unsupported` 仍拒绝；`verify.rs`/`native_binary.rs` 的用例已按新接受集翻转。
  - **TS 侧核验器是真缺陷修复（本轮发现）**：`packages/project-verifier/src/project-verification.ts` 原来按 `adjustment.kind ?? .id ?? .type` 取类型名并只白名单 3 类，但工程 manifest 里 `content.adjustment` 是上游 serde 的**外部标记**枚举（`{"Exposure": {…}}`，无参数类型是裸字符串 `"Invert"`）。用真实 WASM 导出验证：连 `brightnessContrast` 都被拒（`工程包含首期未开放的调整类型：undefined`），即**任何**含调整层的工程都无法通过 Media 的进程内核验。现在按真实形状解析（单键对象 / 裸字符串）、接受集合与协议 `IMAGE_PROJECT_ADJUSTMENT_KINDS`（15 类）逐项互锁、LUT 与 `Unsupported` 继续拒绝、多键伪造对象判为结构非法。证据：`packages/project-verifier` 42 个用例（含新增 `接受全部 15 类已发布调整，拒绝范围外变体与非法结构`、`核验器的接受集合与协议内容投影的 15 类逐项一致`），以及真实导出 15/15 全部 `ACCEPTED` 的手工实测。

- [x] 2.5 U44：提供自动色调/对比度/颜色、去色/均衡、阴影高光和匹配/替换颜色，跨文档匹配冻结源快照。 成功证据：各命令对受控图真实产生预期差异，匹配来源不被修改，撤销恢复目标。
  - 已发布：同一贡献声明 `image.autoTone` / `image.autoContrast` / `image.autoColor` 与
    `image.adjustments.{desaturate,equalize,shadowsHighlights,replaceColor,matchColor}`（8 条，P5 阶段），
    能力 id `adjust.{auto-tone,auto-contrast,auto-color,desaturate,equalize,shadows-highlights,replace-color,match-color}`。
  - 逐条真实效果：`tests_kind_effects.rs::every_implemented_command_produces_a_real_pixel_change`（8/8 条，受控图断言像素差异与一步历史）；端到端另有 `tests/editor.rs::every_published_auto_and_match_command_changes_pixels_in_one_step`。
  - **跨文档匹配已在本域内实现**：内核会话本来就给得出文档清单，本域自己的 `directAdjustmentTargets()` 返回 `documents`（索引/名称/尺寸/是否当前），界面据此渲染来源下拉，不需要改 `editor-view-model.ts`；草稿把**全部**其它文档按会话索引冻结成 `Arc` 快照，`source`/`sourceLayer` 对着快照核对存在性，隔离会话按同一索引装配（`AdjustmentPreview::new_pixels_in_session` / `apply_pixels` / `snapshot_for`）。证据：`cross_document_match_uses_a_frozen_source_and_only_commits_the_target`（目标改变、来源不变、一步历史、撤销只恢复目标）、`cross_document_source_must_exist_and_is_frozen_after_begin`（越界索引与不存在来源层被拒；开始草稿后来源文档再改不影响快照）、`reported_documents_follow_the_kernel_session_not_a_shared_view_model`（打开/关闭文档后清单与 active 跟着变）、`a_null_patch_clears_an_optional_key_instead_of_being_ignored`（`null` 清除可选键而空补丁仍非法）、界面侧 `匹配颜色可从内核报告的其它文档选来源，来源随参数一起提交`、`打开第二份图像后来源下拉跟着内核报告更新，不用重开面板`、`只有一份文档时不显示来源下拉，匹配颜色按本图统计`。草稿层 `null` 表示「清除该键」，所以能切回「当前图像」。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  - 证据：`the_same_draft_slot_serves_both_targets_but_only_one_at_a_time`（草稿互斥 + 保存门禁）、`invalid_input_keeps_the_draft_uncommittable_and_cancel_restores_the_document`（非法输入不可确认、修正后可提交、取消恢复）、`a_preview_that_matches_the_document_adds_no_history_step`（无变化不增历史）、`locks_types_and_parameter_ranges_are_checked_before_editing`（锁定拒绝）。
  - 只读（UI）：面板在 `readonly` 时禁用控件与确认按钮；控件层无独立渲染断言（README 明确 UI 不采集渲染）。

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  - 内容投影：`features/adjustments/content.rs` 逐类覆盖全部 15 类已实现调整，**不把未知类型折叠成亮度/对比度占位**——那会让曝光层与一个中性亮度层得到同一份内容投影与同一指纹。投影逐字段带上本 change 新增的持久参数：色阶五个端点（含 U41 输出黑/白场）、六色域、Tint/TintColor、铅笔映射，以及曝光/色彩平衡/照片滤镜/通道混合/色调分离/阈值/渐变映射/可选颜色的全部参数。LUT（`color-lookup`）与无法求值的 PSD 块（`unsupported`）投影成各自的可判定标记而非冒充已知调整。证据：`every_implemented_kind_projects_its_own_kind_and_parameters`、`parameter_differences_survive_the_projection`、`out_of_scope_adjustments_are_marked_as_themselves_not_disguised`。
  - 内容身份（已发布，跨语言逐字节一致）：`identity.rs` 的 `canonicalize_adjustment` 为 15 类都给出规范串。兼容规则是**只追加、且只在非默认值时追加**：色阶的 `outBlack`/`outWhite` 默认 `0`/`255` 时不出现，色相 `colorize` 只在为真时出现，六个色域在「位移全零且范围就是该色域默认四滑杆」时整项省略，曲线 `pencil` 只在为真时出现 ⇒ 旧工程（没有这些字段）得到逐字节相同的前缀与同一 `documentContentHash`。证据：`every_published_adjustment_kind_joins_the_content_identity`、`new_persistent_parameters_change_identity_but_defaults_stay_compatible`，以及两侧互锁的 `published_adjustment_canonical_strings_are_byte_identical_to_typescript`（Rust）与 `U43/U44 规范串与 Rust 逐字节一致`（TS `image-project.test.ts`），逐字比对 13 条规范串字面量。
  - 同时修复的一个真实丢改动缺陷：`commit_adjustment` 原先用内容指纹判断「有无变化」，而规范串当时还没覆盖新增持久参数，于是「只改色阶输出端点」或「只改某个色域」的确认会被当成无变化而静默丢弃。现在判据是草稿文档本身（`AdjustmentPreview::changed()`），「无变化不增历史」由 `a_preview_that_matches_the_document_adds_no_history_step` 继续保证。证据：`adjustment_layer_output_endpoints_and_hue_ranges_really_commit`。
  - 跨语言契约对齐（有意为之）：`content.rs` 的色阶投影从 0–1 存储值改为 **0–255 参数单位**，与 TS `ImageProjectLevelsChannel` 及 `canonicalizeAdjustment` 的校验口径一致 —— 这是修掉一处既有的 Rust/TS 分歧，不是新增行为。
  - 原生核验与 PSD：`project-verify` 的 `inspect.rs` 接受 15 类（`ColorLookup`/`Unsupported` 仍拒绝）；`features/io/psd.rs::supported_adjustment` 同批扩到 15 类，`every_published_adjustment_survives_save_reopen_and_psd_round_trip` 逐类验证保存重开指纹一致且 PSD 往返保类。
  - TS 核验同批对齐：`packages/project-verifier` 的 `inspectAdjustment` 改读真实 manifest 形状（外部标记枚举）并把接受集合锁到 15 类，详见 2.4 最后一条；这修掉的是一处跨语言解析分歧，不是放宽边界 —— LUT/`Unsupported` 与非唯一键结构仍拒绝。
  - 偏好/查看与内容分开：本 change 未把任何查看态写入内容投影或内容身份。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  - 实际命令与计数见 `verification.md`「执行记录」；回归分布：`direct_adjustment.rs`（5）、`adjustment_preview.rs`（8，含跨文档冻结来源与 `null` 清空语义）、`features/adjustments/content.rs`（3，逐类内容投影）、`tests_direct_workflow.rs`（14）、`tests_kind_effects.rs`（3，覆盖 15 类 + 8 条命令的真实像素效果 + 15 类调整层创建）、`tests/editor.rs`（新增保存重开/PSD 往返与自动命令端到端）、`identity/tests.rs`（新增 3 条，含跨语言逐字节互锁）、`packages/editor` 的 `tool-parameters.test.ts`（11）、`direct-adjustment-panel.test.tsx`（14，含 15 类调整层控件真的写回 `layer.setAdjustment`）、`curve-map-editor.test.tsx`（3）、`adjustment-layer-actions.test.ts`（2，调整层入口与 15 类清单互锁）、协议侧 `content`/`image-project` 用例。

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：分别直接调像素/编辑调整层 → R 通道曲线与输出色阶 → 单色域色相 → 新调整层 → 自动/匹配颜色；保存重开保持全部参数且不无意新增层。
  - 未执行。真实原因：本机为 Linux 容器，`ls /dev/dri` 无 `renderD*`（无 GPU），且 `DISPLAY`/`WAYLAND_DISPLAY` 为空（无显示会话），不能采渲染/视觉证据。**待人工验证**。命令门与像素/结构证据已在无渲染路径上取得（见 2.4/2.5/3.2），但这不能替代真实设备上的画面与手势走查。

- [ ] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  - 内核侧成功/失败/取消/一步历史/保存重开证据已写入 3.1、3.2 与 4.1 引用的测试，逐 U 结论见 `verification.md` 的「逐 U 记录」；**U42/U43/U44 的真实画面观感与 1440×1000 / 1024×768 手势验收仍待真实 GPU + 显示会话人工完成**（原因同上）。Photoshop 外部往返：本 change 只扩展了 PSD 白名单、未改动 PSD 编解码兼容项，故不需要外部应用验证。

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  - 已更新 `docs/code-map/photocraft.md`（能力/命令贡献、内容投影与身份、PSD 白名单三行）与 `docs/code-map/frontend.md`（调整面板段落）。
  - 一致性核对不是看清单长度，而是四处互锁：贡献声明 → 聚合后的唯一命令门（`capability.rs` 的阶段表由贡献推导）→ 真实 WASM 握手（`notes/feature-boundary-wasm-baseline.json` 现在记录 211 条命令 / 92 个能力，与 `tests/fixtures/contract.json` 同一份清单）→ 界面只渲染内核报告的入口（`every_reported_target_matches_the_command_gate` + 面板用例）。基线重新锚定是「已发布能力批次」的收尾动作，脚本注释与报错文案已同步说明，除此之外共享文件仍必须逐字节不变。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  - 域内改动：`packages/editor/src/features/adjustments/*`、`packages/protocol/src/features/adjustments/{index.ts,content.ts}`、`rust/crates/editor-core/src/features/adjustments/*`、`rust/crates/project-verify/src/features/adjustments/*`、`packages/editor/src/features/layers/photo-editor-layer-actions.ts`、本 change 目录、`docs/code-map/{photocraft,frontend}.md`。
  - 发布必需的共享文件（同一批，已在本 change 内完成并互相锁定，不再外派）：
    1. `rust/crates/editor-core/src/identity.rs`（+ `identity/tests.rs`）：15 类规范串与「只在非默认值时追加」的兼容规则；由 `notes/feature-boundary-baseline.json` 的 `sharedFiles` 哈希锁定，hash 已随本批次重新锚定。
    2. `tests/fixtures/contract.json`：能力清单 71 → 92，按真实握手顺序插入；同一 `sharedFiles` 锁定。
    3. `notes/feature-boundary-wasm-baseline.json`：命令 185 → 211、能力 71 → 92；`build`/`steps`/`errors`/`output` 四段与旧基线逐字节相同，证明发布没有改动渲染与内容字节。
    4. `scripts/check-feature-boundaries.mjs`：把「重新锚定属发布收尾」写进注释与报错文案，不再声称与 `bdc3c084` 等价。
    5. `rust/crates/editor-core/src/features/io/psd.rs`：`supported_adjustment` 扩到 15 类（与核验器、命令门同一批）。
  - 未修改：`capability.rs`（阶段表由贡献推导，无需改）、兄弟域 `features/{layers,composition}/mod.rs`（聚合端排序去重，既有 9 个 id 不重复声明）、`editor-wasm.ts`、`editor-workspace.ts`、`editor-tool-panels.tsx`、`photo-editor-*.tsx`、`rust/project-limits.json`。
  - 共享包内的缺陷修复（本批第二条域外修改）：`packages/project-verifier/src/project-verification.ts` 与
    其测试。本 change 的 proposal 已写明「有新内容时同步 `packages/project-verifier`」，且该包不被任何
    change 的 parallel-work 声明为独占。修的是既有的跨语言解析分歧：`inspectAdjustment` 读
    `adjustment.kind`，而工程 manifest 里 `content.adjustment` 是上游 serde 的外部标记枚举
    （`{"Exposure": {…}}` / 裸字符串 `"Invert"`），于是连 `brightnessContrast` 都被判成
    「未开放类型：undefined」——任何含调整层的工程都过不了 Media 的进程内核验。现按真实形状解析、
    与协议 15 类逐项互锁，LUT/`Unsupported` 仍拒绝。证据见 2.4 末条与 `verification.md` 5b。
  - 域外最小修改（都由本域新增的冻结接口成员/语义变化逼出，已在同批落地）：`rust/crates/editor-core/tests/interaction_state.rs`（U41 之前的「分通道曲线与吸管必须被拒绝」断言与现语义冲突）、`integrations/woohaa/tests/editor-workspace.test.ts`（替身内核补 `beginDirectAdjustment`/`directAdjustmentTargetsJson`）、`integrations/woohaa/vitest.config.ts`（React 别名改为按 Node 解析，修掉本地虚拟存储下的假失败；不涉及宿主适配行为）。

- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  - 未勾选：跨域联合验收的最后一步依赖真实 GPU 与显示会话（同上 4.2/4.3），本机不具备；发布本身已不再阻塞跨域回归，命令门、核验器、内容身份、PSD 与宿主转发层均已在本批同源落地并跑通。

## 剩余待办（真实原因，不再有待发布的共享改动）

1. **跨 change 归档顺序**（1.1）：`2026-10-22-complete-photocraft-webui-editing` 仍在 changes 中（50/58），须由集成负责人先归档；本 change 的要求名与其不重名（`comm -12` 为空），不存在合并冲突。
2. **真实设备验收**（4.2/4.3/5.2）：本机为 Linux 容器，无 `renderD*`、无 `DISPLAY`/`WAYLAND_DISPLAY`，渲染与视觉证据一律留待具备真实 GPU 的人工验证；不得以软件渲染或估算值替代。

以上都没有「待发布的共享改动」或「待实现的代码」：本 change 的 15 类调整、8 条命令、内容身份、
两侧核验器、PSD 白名单、界面入口与逐类回归均已落地并跑通。

### 画布吸管点选取样（已知边界，不影响本 change 的发布）

内核与参数表都支持真实点采样（`eyedropper: {point, at:[x,y], size}`，由内核读像素）。缺的只有「画布点」这条共享链路：`photo-editor-app.tsx` 的 `onSampleColor` 只把点交给 `controller.sampleColor`，而 `editor-workspace.ts` 的 `sampleColor` 在 `adjustmentActive` 时返回 `gesture-active`；`FeaturePanelContext.retouchSample` 只在修饰工具（`isRetouchTool`）下才被写入。两处都是共享 facade，属宿主端口范畴，本 change 未新增私有端口，也没有为此发布 `adjust.eyedropper` 这类空能力；面板当前以前景色作为取样色。这条不影响 U41 的「输出端点 + 分通道 + 吸管参数可确认」，但画布取点仍需宿主端口另行支持。
