# 智能对象子文档与还原图层任务

状态标记说明：`[x]` 表示该项在**本域写入边界内**完成并有可复现证据（见 [matrix.md](matrix.md) 与
[verification.md](verification.md)）；`[ ]` 保留给尚未满足的项，行尾注明缺什么。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。证据：`b61da631` 已在基线 `bcd6cbc` 内，`pnpm run features:check` 通过（共享文件 hash 未漂移）。
- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。证据：本次所有改动仅落在 `features/smart/` 与本 change 目录；`2026-10-22-complete-photocraft-webui-editing` 未改动、未勾选。
- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。证据：[matrix.md](matrix.md)（含 U65 5 项、U66 4 项、NON_GOALS 3 项）。
- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。证据：`package-boundary.test.ts` 通过；未 import 宿主包。

## 2. 逐项贯通

- [x] 2.1 U65：按选中智能层提供替换源/导出，不要求已打开子会话；修正嵌套编辑器裁切，让菜单/工具和回写/返回完整可用。成功证据：未开子文档也能替换/导出，桌面/Pad 子菜单不裁切，回写仍幂等并保留冲突恢复。
  - 实现：`rust/.../smart_source_io.rs`（`layer_state` 逐入口原因 + `export_source` 逐字节）、`wasm.rs`（`smartLayerStateJson` / `exportSmartSource`）、`features/smart/wasm-handle.ts` + `workspace.ts`、`smart-object-panel.tsx`（替换/导出按 `canReplace`/`canExport`，不再看 `childState.active`）、`smart-child.css` + `child-editor.tsx`（作用域还原宿主定位规则）。
  - 自动化证据：`unpack/tests.rs` 中 `layer_state_reports_availability_and_reasons_per_layer`、`export_source_does_not_require_a_child_session`、`export_source_returns_exactly_the_embedded_bytes`、`replace_source_does_not_require_a_child_session`、`every_disabled_entry_reports_its_own_reason`；`layer-state.test.ts`（8）、`smart-object-panel.test.tsx`（11）、`child-editor-scoping.test.ts`（5）、`wasm-handle.test.ts`（3）、`workspace.test.ts`（5），本域 TS 共 32 项。
  - **仍待 4.2**：1440×1000 / 1024×768 真实窗口的视觉确认（本机无 GPU、无桌面浏览器）。
- [x] 2.2 U66：提供 Convert to Layers，解包嵌入源为规范可编辑层/组并保留实例布局/适用样式蒙版，不等同栅格化。成功证据：单实例转回图层后可编辑原内部层，其他共享实例不变，工程重开和一次撤销正确。
  - 实现：`rust/.../unpack.rs`（源树核验 → 解包 → 实例放置 → id 重映射 → 图案资源转移 → 预算 → 一步历史）、`wasm.rs`（`convertSmartToLayers`）、`workspace.ts`（`blockingDraft` 门禁 + `afterWrite`）、面板「转回图层 → 确认转回」。
  - 自动化证据：`unpack/tests.rs` 共 27 项（`cargo test -p photocraft-embed-editor --lib features::smart`，加上 `smart_document` 11 项共 38 项域内 Rust 测试），其中转换/预算/拒绝/重开相关 18 项：`multi_layer_source_becomes_an_editable_group_in_one_history_step`、`single_foldable_layer_replaces_the_smart_layer_directly`、`converting_a_nested_smart_layer_keeps_the_group_around_it`、`whole_pixel_placement_moves_the_unpacked_layers`、`unpack_keeps_the_composited_pixels_identical`、`fractional_placement_uses_the_engine_transform_and_stays_visually_equal`、`converting_one_instance_leaves_shared_instances_smart`、`unpacked_layers_survive_a_project_round_trip`、`unpacked_layer_styles_keep_their_pattern_resources`、`unpacked_result_exports_to_an_editable_psd_without_smart_blocks`、`unpacked_depth_budget_uses_the_verifier_depth_semantics`、`unrepresentable_effects_are_rejected_without_history`、`smart_layer_mask_and_style_force_a_group_instead_of_dropping_them`、`nested_smart_objects_stay_live_after_conversion`、`projects_without_any_new_persistent_field_stay_usable`、`partially_converted_project_reopens_with_remaining_instances`、`open_project_still_rejects_unrelated_verification_failures`、`open_project_keeps_layer_budget_for_embedded_sources`；另有 `pattern_budget_overflow_rejects_without_writing`、`conversion_keeps_content_identity_consistent_across_serialization`，以及 TS 侧的 `workspace.test.ts`、`smart-object-panel.test.tsx`。
  - 拒绝面：透视/变形/智能滤镜/滤镜蒙版/堆栈模式五类不可表示效果各自返回原因且不写历史（同一测试同时核对 `state()` 与 `smart_layer_state`）；图案预算溢出在写文档前拒绝；智能层自身蒙版/效果改为建组而非丢弃。
  - 样式保真：样式的图案资源按 id/内容并入父文档（冲突改 id、受图案预算约束），不静默丢样式；结果层经 PSD 导出后仍可编辑且不含 `SoLd`/`PlLd`/`SoLE`。
  - 工程重开的边界（本轮已补齐）：`Editor::open_project` 先按普通口径 `verify()`，仅当它拒绝时才回退到已有的 `smart_source::verify_project()`（该通道把根容器与整棵嵌入源树纳入同一预算，并继续拒绝外链/未开放效果/坏名称/不可逆仿射）。因此「只转回部分实例、其余仍是智能对象」的工程现在能保存并重开，普通上传与 CLI 的收紧口径不变。回归：`partially_converted_project_reopens_with_remaining_instances`（重开后剩余实例仍是智能对象且可 `beginSmartChild`，`contentHash` 与保存前一致，同一用例还断言 `verify()` 仍拒绝）、`open_project_still_rejects_unrelated_verification_failures`（外链源仍被拒）、`open_project_keeps_layer_budget_for_embedded_sources`（源树累计超 64 层仍被拒）。真实 WASM 冒烟同步确认：40×30 工程转回一个实例后 `openProject` 成功，重开结果 `Pixel, Smart Object, Pixel`。
  - 宿主保存入口（集成侧必要改动）：`web/services/media-service` 的工程 ingest 原先对含智能对象工程整体拒绝，会让 U66「其他共享实例不变」的编辑结果在 Woohaa 里存不下来。现在仅在「拒绝原因确实是 `unsupported-object` 且外层结构确认含 `smart`」时改走 `verifyEmbeddedForIngest`；其余拒绝原因原样返回，未配置原生核验工具时 fail closed。回归见 `web/services/media-service/src/project-ingest.test.ts` 的 4 个新用例。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。证据：拒绝矩阵 4 项测试（含五类不可表示效果的独立用例 `unrepresentable_effects_are_rejected_without_history`、`pattern_budget_overflow_rejects_without_writing`）均断言 `state()` 与历史快照未变；无净变化替换不增历史且 `contentHash` 不变；面板取消不发命令、只读全禁用；`contentHash` 在导出前后与保存→重开前后一致（`conversion_keeps_content_identity_consistent_across_serialization`）。
- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  - 已完成：本次**未新增持久字段**，内容身份不变（`canonicalizeSmart` 未改）；旧工程兼容有专门回归 `projects_without_any_new_persistent_field_stay_usable`（旧格式工程重存逐字节一致、通过含源核验、三个新入口可直接作用于它、一次撤销回到智能对象）；解包复用 `inspect_document_sources` + `limits::MAX_LAYERS` / `MAX_DOCUMENT_DEPTH` 做解码前预算；解包后的工程经 `openProject` 往返验证；解包结果导出 PSD 后不含智能对象块且可编辑（`unpacked_result_exports_to_an_editable_psd_without_smart_blocks`）；样式图案资源随解包并入父文档并保持可解析（`unpacked_layer_styles_keep_their_pattern_resources`）。
  - TS/原生核验：`packages/project-verifier` 的 `--embedded-smart` 通道与原生核验器同一判定（`native-project-verifier`、`project-verification` 既有用例 40 项全绿）；本域不新增第二套核验。
  - 缺：PSD 往返的 Photoshop 外部可编辑验证属外部应用人工验证（4.3）；`tests/fixtures/contract.json` 属 hash 锁定的共享契约，本次**无需**新增行（没有新增持久字段或能力 id）。
- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  - 已完成：本域入口全部经既有控制器门禁（`blockingDraft` / `afterWrite` / `unavailable`）与既有 `smart_document` 冲突判定；未新增第二套会话或写入通道，因此活动文档/代际/请求序号仍由共享控制器（`editor-workspace.ts` 的 `generation` 与 `document-workspace.ts` 的 `isCurrent`）唯一裁决。异步替换在写回前复核选中层未变（`smart-object-panel.test.tsx`「读文件期间换选图层则放弃这次替换」），来源失效不会误写目标层；确认框在入口变得不可用时自动收起（「转回确认期间内核变得不可用则不发命令」）；文档关闭后域会话统一返回 `no-document` 且不写（`workspace.test.ts`）。
  - 本轮修掉三个回写态缺陷：① 幂等回执原先全局缓存，关闭重开／重载父源后子修订号会回到同一个数，旧回执会把用户第二次修改静默丢掉——现在回执按子会话代号失效（`writeback_receipts_belong_to_their_own_child_session`，真实 WASM 冒烟同步确认）；② 栅格化任意对象都会清空无关的子文档会话——现在只结束被栅格化那一层的会话（`rasterizing_one_object_keeps_another_objects_child_session`）；③ `detachSmartChild` 把会话改绑到新副本却没更新 `contents_id`，导致文档承诺的恢复路径「在父文档建立独立副本后继续编辑」每次回写都被「共享源已更换」拒绝——现在改绑到副本自己的 `contents_id`（`detached_copy_can_still_be_written_back`，真实 WASM 冒烟确认分离后回写 `committed:true, instances:[16]`）。
  - 跨域联合走查（同一次会话内切文档/切标签+UI 手势）属 5.2 / 4.2，不在此项冒充通过。
- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  - 已完成：`dev` 用同一 `features/smart` 实现构建与 `tsc --noEmit` 均通过（`npx vite build`，CSS 43.79 kB / JS 620.89 kB）；Woohaa 宿主包 `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` 通过，测试 34 文件 / 275 用例全绿。
  - 本轮补齐的宿主侧两处：① 宿主自有测试替身 `photocraft/integrations/woohaa/tests/editor-workspace.test.ts` 的 `fakeInstance()` 补上 `smartLayerStateJson` / `exportSmartSource` / `convertSmartToLayers` 三个成员（三个成员在 `features/smart/wasm-instance.ts` 里保持 **required**：真实内核一定导出它们，改 optional 会让缺绑定的宿主编译期静默通过、运行时才炸）；② `web/services/media-service` 的工程 ingest 增加 `verifyProjectForSave`，让含嵌入智能对象的工程能保存（见 2.2 的边界说明与 `project-ingest.test.ts` 4 个新用例）。
  - 宿主集成文件属共享写入归属，本次按 change 范围授权直接修改，已在 5.1 记录。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  - 已运行并通过：`pnpm run check`（editor 301 / protocol 70 / verifier 40）、`cargo test --workspace --offline`（editor-core lib 232，其中 `features::smart` 27 + `smart_document` 11；全工作区 232+4+13+25+8+0+1+3+10+15 全绿）、`pnpm run wasm`（17.38 MiB）、`pnpm run verifier`（3.84 MiB）、`pnpm run features:check`（与 `bdc3c084` 基线等价）、`node scripts/check-code-map.mjs`、`dev` 的 `vite build`、真实 WASM 的 Node 主线冒烟 + 本轮 reopen/ingest 专项冒烟、宿主 `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` 与 test（34 文件 / 275 用例）、`pnpm -C web --filter @woohaa3/media-service run typecheck` 与 test（6 文件 / 79 用例）。`cargo clippy -p photocraft-embed-editor --all-targets` 无 error，新增代码零新告警；`unpack.rs`、`unpack/tests.rs`、`smart_source_io.rs` 通过 `rustfmt --check`。
  - 本轮新增回归 8 项：`projects_without_any_new_persistent_field_stay_usable`、`writeback_receipts_belong_to_their_own_child_session`、`rasterizing_one_object_keeps_another_objects_child_session`、`detached_copy_can_still_be_written_back`、`partially_converted_project_reopens_with_remaining_instances`、`open_project_still_rejects_unrelated_verification_failures`、`open_project_keeps_layer_budget_for_embedded_sources`，以及面板 `转回确认期间内核变得不可用则不发命令`；另有 media-service 的 4 个 ingest 用例。其中前四项各锁定一个本轮修掉的真实缺陷：旧工程没有专门的回归、幂等回执用全局键会在关闭重开/重载后把新编辑当旧回执丢掉、栅格化任一对象会关掉无关对象的子会话、分离副本后会话没有改绑 `contents_id` 导致恢复路径永远被「共享源已更换」拒绝；后三项锁定「部分转回后无法重开」及其两条不能放宽的边界。
  - 面板侧再补 2 项（失败语义与下载名安全）：`导出失败时显示原因且不下载、不刷新视图`、`内核给的名字不可交付时退回固定下载名，绝不写出路径`；Rust 侧补 1 项：`different_attempt_keys_do_not_commit_the_same_content_twice`（两个「更新父文档」入口键不同，同一内容换键不得再提交）。三条都在撤掉实现后确认会失败，属于真实锁定而不是复述实现。
  - 仓库级 `cargo fmt --check` 不可用作门禁（基线 HEAD 已有未格式化文件，见 verification.md）。
- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：不打开子文档直接替换/导出源 → 子界面完整编辑回写 → 共享实例中只对一个转回层 → 重开并验证撤销/冲突恢复。
  - 原因：Linux 容器无 GPU（`ls /dev/dri | grep renderD` 无输出）且无桌面浏览器/显示会话。已用真实 WASM 在 Node 下逐步验证同一主线（见 verification.md），但不用它冒充 UI 走查。
- [ ] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  - 已完成（域内可独立完成的部分）：U65/U66 逐子能力的成功、失败、取消、像素/结构、历史、工程重开证据全部记入 verification.md 与 matrix.md，含本轮独立重跑的 20 项主线断言与真实原生 CLI 的接收边界对照。
  - 缺（真实环境类，不能代替）：① 真实设备上的 UI 操作与截图（见 4.2）；② 外部应用 Photoshop 打开转回结果 PSD 的可编辑性验证——本容器无 Photoshop，也未交换外部 PSD fixture，不用本引擎自导自读冒充；③ 真实同级提供方的跨域联合回归（见 5.2）。
- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  - 已完成：`notes/capability-matrix.md` 的 P4 表补三行实现位置（`smart_source_io.rs` 的按层投影/逐字节导出、`unpack.rs` 的解包与预算、`editor.rs` `verify_for_open` 与 Media `verifyProjectForSave` 的含源保存/重开），**不新增能力 id**——U65/U66 的入口落在既有 `layer.smart-object` / `layer.smart-object.replace` / `layer.smart-object.child-document` 之内；`photocraft/README.md` 的 P4 阶段摘要补上转回图层与含源工程可重开；`packages/editor/README.md` 补上三个新绑定与「回执按子会话失效」的语义；`docs/code-map/photocraft.md` 已同步受影响模块（smart 域新增 `smart_source_io` / `unpack`、面板入口、`open_project` 的核验回退），`docs/code-map/execution.md` 补记含源工程的 Media 接收边界；本 change 内的 [matrix.md](matrix.md) 逐子能力记录。
  - 兼容矩阵不需要新行：U65 替换/导出与 U66 转回图层都不新增 PSD 能力，既有 `smart-object.embedded` 行（可编辑导入/导出）仍准确，转回结果本身就是普通层。
  - 一致性核对：`pnpm features:check` 仍与 `bdc3c084` 基线等价（commands / capabilities / errors / 8 个 content 快照 / undo-redo-cancel / PNG 全部一致），说明文档改动没有偷偷改变对外声明。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。证据：本域改动落在 `packages/editor/src/features/smart/`、`rust/crates/editor-core/src/features/smart/`、本 change 目录，以及 4.4 要求同步的文档（`docs/code-map/photocraft.md`、`notes/capability-matrix.md` 的 P4 三行、`packages/editor/README.md` 的公共入口说明，均不含契约/能力 id 变更）；域内调用走既有域会话装配（`features/smart/workspace.ts` + `handle.features.smart`），未新增共享接口。
  - 本轮经授权改动的三处共享文件（均属 change 交付必需，非本域私有）：`rust/crates/editor-core/src/editor.rs` 的 `open_project` 增加 `verify_for_open` 回退（普通上传/CLI 口径不变，有 `open_project_still_rejects_unrelated_verification_failures` 锁定）；`web/services/media-service/src/application/ingest.ts` 增加 `verifyProjectForSave`（仅对 `unsupported-object` 且外层确认含 `smart` 时放行，其余原样拒绝）；`photocraft/integrations/woohaa/tests/editor-workspace.test.ts` 的替身补 3 个成员。三处都有对应回归，且没有放宽 `capability.rs` / 协议门面 / `tests/fixtures/contract.json` / `notes/capability-matrix.md` 的能力声明。
- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  - 已完成（域内可独立完成的部分）：跨域**接口层**回归已跑通——Media 工程 ingest（`web/services/media-service`）按真实原生 CLI 通道接收/拒绝含源工程，6 文件 / 79 用例；宿主包 typecheck 与 34 文件 / 275 用例；`features:check` 与基线等价。
  - 缺（真实同级提供方与设备）：同一画布中与 layers / io / selections 等域的真实联合操作（含目标模式/通道/旋转视图/新层类型交叉）需要各域提供方均已交付并接真实 WASM，本 worktree 内无该环境；因此跨域 UI/像素联合验收保持未勾选。
