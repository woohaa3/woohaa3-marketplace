# U65 / U66 子能力贯通矩阵

逐项记录「生产命令/参数 → Rust 包装 → WASM 绑定 → TS 适配 → UI 手势 → 内容/核验 → 自动化证据」。
本页描述**当前实现状态**；真实设备走查（4.2）与 Photoshop 外部验证（4.3）、跨域联合回归（5.2）仍待人工。

## U65 源替换/导出入口与子文档界面

| 子能力 | 生产命令 / 参数 | Rust 包装 | WASM 绑定 | TS 适配 | UI 手势 | 内容/核验 | 自动化证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 可用性投影（按选中层） | 只读；输入 `layer` | `Editor::smart_layer_state` → `smart_source_io::layer_state` | `smartLayerStateJson(layer)` | `features/smart/wasm-handle.ts#smartLayerState` → `workspace.ts#smartLayerState` | 面板每次渲染读取；不可用入口显示 `reason`/`exportReason`/`replaceReason`/`convertReason`/`editReason` | 不改文档/历史/会话；非智能层返回 `smart:false` + 原因 | `unpack/tests.rs::layer_state_reports_availability_and_reasons_per_layer`；`layer-state.test.ts`（8）；`workspace.test.ts` |
| 导出源 | `layer.smartObjects.exportContents`（错误 id）；输入 `layer` | `Editor::export_smart_source` → `export_source`（仅嵌入源，逐字节） | `exportSmartSource(layer)` → `SmartSourceExport{name,bytes}` | `wasm-handle.ts#exportSmartSource`（显式 `free`） | 选中智能层即可点「导出源」，下载 `name`（不可交付名退回 `smart-object.pcraft`） | 只读，不产生历史；外链源拒绝（NON_GOAL） | `export_source_does_not_require_a_child_session`、`export_source_returns_exactly_the_embedded_bytes`；`wasm-handle.test.ts`；`smart-object-panel.test.tsx` |
| 替换源 | 复用既有 `replaceSmartContents(layer, bytes)` | `Editor::replace_smart_contents`（预算 + 核验 + 事务） | 既有 `replaceSmartContents` | 既有 | 「替换源」不再受 `state.active` 限制，按 `canReplace` 决定；读文件期间换选图层则放弃本次替换并提示 | 一步历史；实例变换与共享关系保留；无净变化不增历史；来源变化不误写目标 | `replace_source_does_not_require_a_child_session`；`smart-object-panel.test.tsx` |
| 子文档界面不裁切 | —（纯样式作用域） | — | — | `features/smart/smart-child.css` | 弹层内编辑器恢复正常流；菜单/参数栏横向滚动，工具列/侧栏/状态条回位 | 不改宿主外壳样式；外层编辑器不受影响 | `child-editor-scoping.test.ts`（5）：逐条对应宿主 `position:absolute` 规则并要求还原 |
| 编辑内容 / 回写 / 冲突恢复 | 既有 `beginSmartChild` / `updateSmartParent` / `reloadSmartChild` / `detachSmartChild` | `smart_document.rs`（幂等 `attemptId` 按子会话代号生效） | 既有 | 既有 | 「编辑内容」按 `canEditContents` + `editReason` 显示；子会话操作仅在 `active` 时出现 | 父修订/内容变化即冲突，保留子文档；回执只在产生它的那次会话内重放 | `smart_document::tests::*`（10，含 `writeback_receipts_belong_to_their_own_child_session`、`rasterizing_one_object_keeps_another_objects_child_session`、`detached_copy_can_still_be_written_back`）；`smart-object-panel.test.tsx` |

## U66 智能对象转回图层

| 子能力 | 生产命令 / 参数 | Rust 包装 | WASM 绑定 | TS 适配 | UI 手势 | 内容/核验 | 自动化证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Convert to Layers | `layer.smartObjects.convertToLayers`；输入 `layer` | `Editor::convert_smart_to_layers` → `unpack::convert`：源树核验 → 解包 → 应用实例放置 → id 重映射 → 图案资源转移 → 预算检查 → 一步历史 | `convertSmartToLayers(layer)` | `wasm-handle.ts` → `workspace.ts#convertSmartToLayers`（`blockingDraft` 门禁 + `afterWrite`） | 「转回图层」→ 显式确认「确认转回」才提交；失败显示原因 | 只替换当前实例；其他共享实例保持智能对象；嵌套时保留父组；层数/深度不超 `project-limits.json` | `multi_layer_source_becomes_an_editable_group_in_one_history_step`、`single_foldable_layer_replaces_the_smart_layer_directly`、`converting_a_nested_smart_layer_keeps_the_group_around_it`、`converting_one_instance_leaves_shared_instances_smart`、`unpacked_layers_survive_a_project_round_trip`；`workspace.test.ts` |
| 样式与资源保真 | 源文档图层的效果/填充图案 | `unpack::carry_patterns`：按 id+内容并入父文档，冲突 id 重映射，受图案预算与引用可解析约束；溢出即拒绝且不写文档 | 同上 | 同上 | 同上 | 不静默丢样式，也不产生悬空图案引用；智能层自身蒙版/效果改为建组而非丢弃 | `unpacked_layer_styles_keep_their_pattern_resources`、`pattern_budget_overflow_rejects_without_writing`、`smart_layer_mask_and_style_force_a_group_instead_of_dropping_them` |
| 嵌套智能对象保持可编辑 | `layer.smartObjects.beginChild` | 解包保留内层 `SmartObject` 引用，不做二次展平 | 同上 | 同上 | 同「编辑内容」 | 内层智能对象转换后仍可打开子文档继续编辑 | `nested_smart_objects_stay_live_after_conversion` |
| 内容身份稳定 | `project.save` / `project.open` | 转换不改 `canonicalizeSmart` 的内容哈希 | 同上 | 同上 | 同上 | 保存→重开后 `contentHash` 与转换前一致 | `conversion_keeps_content_identity_consistent_across_serialization` |
| 工程重开 | `project.save` / `project.open` | `Editor::open_project` 的 `verify_for_open`：先普通 `verify()`，被拒才回退 `smart_source::verify_project()` | 既有 | 既有 | 重开 tab | 部分转回（仍有智能对象）的工程可重开；其他拒绝原因与源树累计预算不放宽 | `partially_converted_project_reopens_with_remaining_instances`、`open_project_still_rejects_unrelated_verification_failures`、`open_project_keeps_layer_budget_for_embedded_sources` |
| 保存到 Woohaa（含源工程） | `POST /api/media-projects` | —（Media 政策） | — | 既有 `media-remote` 按 MIME 选工程入口 | 保存按钮 → 等待上传 | 仅 `unsupported-object` 且外层确认含 `smart` 时走 embedded-smart 通道；无原生工具则 fail closed | `project-ingest.test.ts` 4 个新用例（未配置工具拒绝 / 原生通过则写入 / 原生拒绝不回退 / 外链仍拒） |
| 旧工程兼容 | `project.save` / `project.open` | 本次**未新增持久字段**；旧格式工程重存逐字节一致 | 同上 | 同上 | 无需迁移步骤 | 只有既有 `LayerContent::Smart` 字段的工程可直接用三个新入口 | `projects_without_any_new_persistent_field_stay_usable` |
| 解包结果可再导出 | `file.export` PSD | 结果层为普通 `Pixel`/组，不含 `SoLd`/`PlLd`/`SoLE` | 既有 | 既有 | 导出 PSD 后在外部应用可编辑 | PSD 不含智能对象块 | `unpacked_result_exports_to_an_editable_psd_without_smart_blocks` |
| 保留实例布局 | `SmartObject::transform` | 整像素平移 → `resample::translate_surface`；非整像素 → 临时会话 `edit.transform` | 同上 | 同上 | 同上 | 不栅格化；蒙版/文字/形状随变换 | `whole_pixel_placement_moves_the_unpacked_layers`、`unpack_keeps_the_composited_pixels_identical`、`fractional_placement_uses_the_engine_transform_and_stays_visually_equal` |
| 拒绝条件 | 同上 | `unpack::convert_reason` | 同上 | 面板 `title` + 原因行 | 不可用入口给出确切原因 | 锁定/子文档打开/外链/变形/透视/智能滤镜/滤镜蒙版/堆栈模式/缺缓存，一律拒绝而不栅格化 | `unrepresentable_effects_are_rejected_without_history`、`rejections_cover_missing_layer_plain_layer_and_open_child_draft`、`every_disabled_entry_reports_its_own_reason`、`linked_source_is_refused_with_a_reason_instead_of_reading_the_file` |
| 一步撤销 | `edit.undo` | `preview_history::commit_selected` | 既有 | 既有 | 撤销面板 | 撤销整棵放回，活动层恢复 | 同组测试断言 `history + 1` 与 `layers` 快照 |
| 层数/层级预算 | —（解码前预算） | `unpack::check_budget`：总层数减旧树加新树；最深层 = 目标层父层级 + 解包树高度（与核验器「根层 depth 从 1 起」一致） | 同上 | 同上 | 超限给出原因并禁用 | 不因一次解包突破 `MAX_LAYERS=64` / `MAX_DOCUMENT_DEPTH=16` | `unpacked_depth_budget_uses_the_verifier_depth_semantics`（14 层外层组放行 / 15 层拒绝且不写文档） |

## 明确未做（保持 NON_GOALS）

| 项 | 处置 |
| --- | --- |
| 外链智能对象与任意重链接 | 状态投影返回 `kind:"linked"` + 各入口 `false` + 原因；`export_smart_source` / `convert` 直接拒绝 |
| 智能滤镜栈 | `convert_reason` 拒绝，改用栅格化 |
| 变形/透视放置的解包 | 明确拒绝并提示改用栅格化，绝不静默压平 |

## 待集成负责人复核（本域无法单独裁决）

1. 智能层状态投影的解码目前只在 `packages/editor/src/features/smart/layer-state.ts`（消费侧校验）。若要成为协议公共契约
   （`packages/protocol/src/features/smart/` + `image-project-content.ts` / `src/index.ts` 的 re-export），需集成负责人统一提交
   共享门面与契约 fixture；本 change 不改 `packages/protocol` 任何文件，避免复制第二套内容契约。
2. 若要新增 `layer.smart-object.convert-to-layers` 能力 id，需改 `capability.rs` / `image-project-editor.ts` / `tests/fixtures/contract.json`
   共享能力表，并同步 `notes/capability-matrix.md`；本 change 未新增能力 id，入口由既有 `layer.smart-object.*` 与运行时状态决定。
3. `notes/capability-matrix.md` 的 P4 表已在 4.4 补 U65/U66 与含源保存/重开三行（共享文档，本次按 change 范围授权同步）。
4. 含智能对象父工程的保存重开已在本轮补齐（`open_project` 的 `verify_for_open` 回退 + Media ingest 的含源通道），
   两条通道都以原生全树核验成功为前置，且不放宽其他拒绝原因；详见 verification.md「本轮补齐的两处集成边界」。
5. 根 OpenSpec 的 `openspec/specs/canvas-media-storage/spec.md` 与 `canvas-runtime` 里仍写着「智能对象/工程未开放对象类型必须关闭」，
   这是 P4 交付之前的措辞滞后，需在根项目归档时随对应 capability 一并写回；本 change 不改根 delta。
