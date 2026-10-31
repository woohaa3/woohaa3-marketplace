# 验收计划与记录

## 本次实施状态

实施基线：结构前置 `b61da631`（feature boundaries）已在分支；产物基线
`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；本 worktree 的 HEAD 是 `b0cd6cbc`（规划提交）。
改动落在 parallel-work 列出的本域归属目录与 change 目录，外加**经显式授权的共享文件**
（逐条列在「共享文件改动清单」），**未**改 vendor、未改 lockfile、未升级全局版本号、未提交。

已落地的实现：

| 位置 | 内容 |
| --- | --- |
| `rust/crates/editor-core/src/features/history/` | `mod.rs`（命令登记 + 12 个能力 id 在 `P7` 发布）、`tools.rs`（U74/U75 `Editor` 入口，含清理计划与取样读取点）、`data.rs`（U76 变量/数据集）、`automation.rs`（批处理/联系表/堆栈/受限脚本）、`preflight.rs`（逐步骤预检 + 进程内队列表）、`csv.rs`（CSV 编解码）、`wasm.rs`（32 个 wasm-bindgen 导出，含 `sampleHistory`）、`tests_workflows.rs`（**34** 个回归） |
| `packages/editor/src/features/history/` | `workspace.ts`（域会话，34 个方法，含 `setDataSets`）、`wasm-instance.ts` / `wasm-handle.ts`（JSON/base64 直传）、`model.ts`（14 个解码器，含变量/数据集预算、取样像素与只校验句柄的源检查）、`bytes.ts`（base64/文件名）、`panels.tsx`（4 个面板 + 脚本组 + 变量定义器 + 取样区）、`sections.tsx`（4 个 `advanced`/菜单入口）、`index.ts`，以及 5 个测试文件（**117** 个回归） |
| `packages/protocol/src/features/history/index.ts` | `HISTORY_CAPABILITIES`（12 个 id）进入 `feature.capabilities`，与 Rust 同序同值 |
| `rust/crates/project-verify/src/features/history/mod.rs` | `inspect` 逐图层返回 `None`（本域无逐图层内容）；`inspect_document` 做**文档级** `doc.variables` 检查，经共享 `DOCUMENT_INSPECTORS` 调用 |
| `tests/features/history/wasm-workflow.test.mjs` | 4 条真实 WASM 主线回归 |

**产品能力已开放**：33 条命令进唯一命令门（`P7`），12 个能力 id 同时在 Rust
`CONTRIBUTION.capabilities` 与协议 `feature.capabilities` 发布，`features:check` 通过
（见「自动检查」）。

### 共享文件改动清单

这些文件在 parallel-work 里属于「共享核心、单一写入」，本次在**用户明确授权**（「必要时可改共享
文件，不要复制粘贴实现」）下顺序修改，没有并存第二份实现。除下列文件外，本 change 未触碰其它
共享路径。

| 共享文件 | 改动 | 对应任务 |
| --- | --- | --- |
| `packages/editor/src/photo-editor-chrome.tsx`（+ `photo-editor-chrome.test.tsx`） | 「窗口」菜单插入 `featureMenuSections("窗口")`（显示开关之后、文档清单之前）；「文件」下拉追加 `featureMenuSections("文件")` | 3.4 / 4.4 |
| `packages/editor/src/photo-editor-app.tsx` | 「高级…」title 补上本域四个面板 | 4.4 |
| `packages/protocol/src/features/shared/content.ts`（+ `image-project.test.ts`） | `ImageProjectVariablesContent` 与 `canonicalizeVariables`，与 Rust 规范文本逐字节一致 | 3.2 |
| `rust/crates/editor-core/src/document_content.rs` | `project_content` 增 `variables` 分支（`variables_content`） | 3.2 |
| `rust/crates/editor-core/src/identity.rs`（+ `identity/tests.rs`） | `canonicalize_variables` 与变量/数据集预算常量 | 3.2 |
| `rust/crates/project-verify/src/features/mod.rs`、`src/lib.rs`（+ `tests/verify.rs`） | 文档级核验钩子 `DOCUMENT_INSPECTORS` 与调用点 | 3.2 |
| `packages/editor/src/features/boundaries.test.ts` | 聚合 section 计数 12 → 16，追加两条 history 断言 | 3.4 |
| `integrations/woohaa/tests/editor-workspace.test.ts` | 假 `EditorInstance` 补齐本域 32 个方法（含 `sampleHistory`） | 3.4 |
| `tests/fixtures/contract.json`、`notes/feature-boundary-baseline.json`、`notes/feature-boundary-wasm-baseline.json` | 发布 12 个能力 id 并重新采集基线（**仅新增**，见下） | 4.4 |
| `notes/capability-matrix.md`、`docs/code-map/photocraft.md` | 能力矩阵行、模块地图行 | 4.4 |

## 逐项能力矩阵

「命令」都能在唯一命令门内执行（`domain_entry_points_are_bounded_to_the_commands_this_domain_registers`
与 `wasm-workflow.test.mjs` 的 `allowedCommandIdsJson()` 断言）；「包装 / WASM」列指 `Editor`
入口与 `wasm.rs` 导出；「UI 参数入口」指本域面板（`features/history/panels.tsx`），菜单入口经
共享 `photo-editor-chrome.tsx` 的「窗口」「文件」下拉接出（见「共享文件改动清单」）。

| U | 子能力 | 命令 / 字节入口 | 包装 / WASM | UI 参数入口 | 事务 | 回归 |
| --- | --- | --- | --- | --- | --- | --- |
| U74 | 命名快照 | `history.newSnapshot` | `Editor::history_new_snapshot` → `newSnapshot` | 历史面板：快照名称 + **快照内容**下拉（整份文档 / 合并图层 / 当前图层） | 快照固定真实规范内容，本身不进撤销栈；三种来源分别固定不同内容（合并=压平一层，当前图层=只剩活动层）。视图里的 `activeLayer` 是快照记的**活动图层 id**，不是图层数 | `snapshots_hold_real_content_and_returning_to_one_is_an_undoable_step`、`snapshots_from_each_source_hold_the_content_that_source_describes`、`panels.test.tsx`「快照内容是可选三种，默认整份文档」、wasm 主线 U74 |
| U74 | 回到快照 | `history.selectSnapshot` | `history_select_snapshot` → `selectSnapshot` | 快照行「回到」 | 一次可撤销步骤（撤销后回到原内容 hash） | 同上 |
| U74 | 重命名 / 删除快照 | `history.renameSnapshot`、`history.deleteSnapshot` | 同名包装 | 重命名输入框（回车）、快照行「删除」 | 会话状态，不改内容；删掉选中项后回落到首个 | `panels.test.tsx`「重命名作用于当前选中的快照」 |
| U74 | 删除历史状态 | `history.deleteState` | `history_delete_state` → `deleteState` | 「删除当前状态…」→ 后果说明 → 确认 / 取消（最旧状态禁用） | 上游语义是**先退回该状态之前再清空其后所有状态**：内容会回退且不可重做，因此和清理一样先说明后果再确认，不做一键删除 | `panels.test.tsx`「删除状态不是说删一行：先说明会退回并丢重做，确认前不发请求」、wasm 主线 U74 第 5 步（清理后的旧快照 id 不可用） |
| U74 | 自历史新建 | `history.newDocument` | `history_new_document` → `newDocumentFromHistory` | 「自历史状态」下拉 + 「新文档名称」+「自历史新建文档」→ 交付 `.pcraft` 文件 | 可指定 0 基状态与名称，不给则用当前状态与历史标签；新文档独立、历史从一步开始。内核会切到新文档，域会话取走派生字节后**总是关闭**它，因此源文档的 hash/修订与宿主标签不变（否则下次保存会把派生内容写回源节点）；交付失败如实报错，不宣称已保存 | `new_document_from_history_is_independent_of_the_source_document`、`variables_keep_identity_across_documents_and_psd_export`（派生文档变量重绑定）、`workspace.test.ts`「自历史新建交出独立工程字节并关掉内核文档，不把活动文档留给宿主标签」、`panels.test.tsx`「自历史新建可以指定状态与名称，不给就用当前状态」「自历史新建把派生工程作为文件交付，并说明当前文档未受影响」「自历史新建失败时如实显示原因，不交付空文件」、wasm 主线 U74（源 hash 不变） |
| U74 | 按范围 Purge | `edit.purge.undo`、`edit.purge.clipboard`、`edit.purge.histories`、`edit.purge.videoCache`、`edit.purge.all` | `history_purge_plan` / `history_purge` → `purgePlanJson` / `purge` | **五个**清理按钮 → 范围说明 → 确认 / 取消 | 必须显式 `{"confirm": true}`；清理不改内容 hash、不改修订、不改保存基线，只换历史源 `epoch`（供历史画笔判定旧源失效）。范围说明的 `bytes` 等于**实际释放量**（`videoCache` 恒 0、`undo` 只算一步、`all` 另计剪贴板与渲染缓存），`available`/`reason` 直接取内核前置条件；含无公开读数的缓存时 `all` 以 `approximate: true` 自报低估值；`available === false` 时面板不给「确认清理」，可用但 0 字节时不说「当前为空」 | `purge_requires_an_explicit_confirmation_and_never_touches_the_pixels`、`purge_changes_the_history_source_epoch_so_stale_sources_are_visible`、`purge_plans_report_what_that_range_actually_frees`、`purge_undo_plan_shrinks_to_zero_when_only_one_state_is_left`、`panels.test.tsx` 六条（先取说明、取消不发请求、失败显示原因、视频缓存有入口、空范围确认前就说不可用、可清理但 0 字节不说「当前为空」）、wasm 主线（计划字节 == 实际 freed；`all` 只低报且自报近似） |
| U74 | 历史源句柄 | `history.state`（只读） | `history_state` → `historyStateJson` | 历史面板 epoch 行显示状态数与「当前为活文档」 | `sources[].live` 精确标记唯一活文档：消费者取样当前状态用活文档、取过去状态用归档快照（原先恒真的 `available` 是恒定真值，不是信息）。`epoch` = 文档身份 + 状态标签 + 重做标签（不含修订号）：普通编辑不误判失效，也不会跨文档命中 | `history_sources_mark_exactly_one_live_state_for_consumers`、`history_source_epoch_identifies_the_document_and_survives_edits_that_do_not_touch_the_states`、`model.test.ts` 两条（缺 `sources` 时按位置推导、给了就以内核为准） |
| U74 | 历史源取样（读取点） | `history.sample`（**不进命令门**：读取点，不注册 capability） | `history_sample` → `sampleHistory`（第 32 个端口；`preview:false` 只校验） | 历史面板「取样状态」下拉 + 「取样历史源」/「检查源可用」/「重新取源」，取样结果画成 canvas 预览 | 必须带取源 `epoch`，与当前摘要不一致即拒绝并说明「不会按旧索引返回新内容」；缺 `epoch`/越界 `state` 直接拒；归档状态取 `history.state(i)`，活状态用当前文档；返回 RGBA8 base64 + 尺寸 + `live`，`maxSide` 限 1..=2048；`preview:false` 走同一套校验但不合成像素（历史画笔落笔前的廉价判定）。面板清理后**保留**旧 `epoch`（再取样/再检查都如实报失效），换源要显式重新取源；预览绘制前核对像素长度 | `sampling_a_history_source_refuses_a_stale_epoch_instead_of_reading_the_new_state`、`a_history_source_survives_edits_that_add_no_step_but_not_a_deleted_state`、`a_source_check_validates_the_handle_without_compositing_pixels`、`domain_entry_points_are_bounded_to_the_commands_this_domain_registers`（断言不在命令门）、`workspace.test.ts` 三条、`panels.test.tsx` 四条、`model.test.ts` 两条、wasm 主线 U74 第 7/7b 段 |
| U75 | 录制 / 停止 | `actions.record`、`actions.stop` | `actions_record` → `recordAction` | 动作面板：名称 + 录制 / 停止 | 只收成功提交的规范命令；查询与动作编辑不入录 | `recording_keeps_only_committed_replayable_commands_and_playback_matches_manual_work` |
| U75 | 播放 | `actions.play` | `actions_play` → `playAction` | 「播放」+「从第几步播放」（空=从头，填数字传 `from`） | 先逐步骤预检；一步一个既有命令事务，失败停在明确步骤、保留已成功结果，不宣称整组原子 | `playback_refuses_steps_that_left_the_command_gate`、`panels.test.tsx`「不可播放的步骤在预检里标出并阻止整组播放」「从指定步骤播放只在填了数字时传 from」、wasm 主线 U75 |
| U75 | 步骤 / 条件编辑 | `actions.toggle`、`actions.dialog`、`actions.delete`、`actions.insert`、`actions.conditional`、`actions.move`、`actions.rename` | `actions_command` → `actionCommand` | 步骤行：启停 / 加对话框 / 删除 / **上移 / 下移**；「插入步骤」（命令 + 参数 JSON）；「测试条件」（条件下拉 + then 分支）；动作「重命名」 | 会话状态，不写文档内容；非法参数 JSON 在本地就拒绝（不当 `{}` 提交）；首尾步骤的越界移动按钮直接禁用，不发必被拒绝的请求 | `step_editing_covers_insert_dialog_toggle_conditional_and_action_sets`、`panels.test.tsx` 四条（停止/对话框逐条标出并可启停、插入与条件、上下移动边界、重命名）、wasm 主线 U75 |
| U75 | 动作集 / 快捷键 | `actions.assignSet`、`actions.setColor`、快捷键读取 | `actions_shortcuts` → `actionShortcuts` | 动作行显示所属动作集；「归入动作集」输入框；**按钮颜色下拉**；快捷键只读清单 | 会话/偏好，不进内容身份；快捷键只显示不在这里改绑（改绑属共享快捷键宿主） | `action_sets_and_shortcuts_are_visible_to_the_panel`、`panels.test.tsx`「动作集与条件走同一动作编辑入口，快捷键只读显示」「重命名与按钮颜色都作用于当前动作」、`model.test.ts`「动作详情解码按钮颜色」、wasm 主线 U75 |
| U75 | 受限 ATN 导入 | `actions.load` | `actions_load` → `loadActions` | 「导入 .atn…」+「保留无等价命令的 Photoshop 步骤」；解析警告逐条列出 | 未知步骤默认**整组回滚**并给出逐个事件明细；显式 `acceptUnsupported` 才保留（播放会在该步失败，不静默跳过）；`path` 参数一律拒绝；上游泳的 `warnings`（如「N 个尾部字节被忽略」）不再被丢掉——导入成功不等于文件完整；导入后重读快捷键（`.atn` 会写 F 键绑定） | `unsupported_atn_steps_are_reported_and_rolled_back_unless_accepted`、`decodeWarnings` + `workspace.test.ts`「ATN 解析警告往上传」、`panels.test.tsx` 五条 |
| U75 | ATN 导出 | `actions.save` | `actions_save` → `saveActions` | 「导出 .atn…」→ 下载 base64 字节 | 只给字节，写文件由宿主交付端口负责；非法 base64 不当作成功 | `atn_round_trip_preserves_the_recorded_steps`、`panels.test.tsx`「导出把内核返回的 base64 交给下载，且不伪造成功」 |
| U76 | 前台批处理 | 域字节入口 `beginBatch` / `stepBatch` / `cancelBatch` / `finishBatch` / `takeBatchFile` / `batchState` | `batch_begin`/`batch_step`/`batch_cancel`/`batch_finish`/`batch_take`/`batch_state` → 同名 wasm 导出 | 自动处理面板：模式、交付格式、**处理步骤**、**命名模板**、适应边长、选择文件、开始、取消、收尾、逐项「领取」 | 有界队列（64 文件 / 单文件 64 MiB / 总输入与交付各自受限额约束）；每项一次 `step`，逐文件报告；取消在**当前项之后**生效，剩余项不再启动；队列在收尾或卸载前保留，**有未领取字节时收尾先说明会丢掉它们并要求确认** | `batch_queue_reports_each_file_and_stops_after_cancel`、`batch_rejects_over_budget_and_unknown_steps_before_anything_runs`、`panels.test.tsx` 八条、wasm 主线 U76 第一段 |
| U76 | 图像处理器 | 同上（`mode: "imageProcessor"`） | 同上 | 模式下拉「图像处理器」 | 与批处理同一条队列语义，不并发 | `batch_rejects_over_budget_and_unknown_steps_before_anything_runs` |
| U76 | 联系表 II / 载入堆栈 | 同上（`mode: "contactSheet"` / `"loadStack"`） | 同上 | 模式下拉两项；联系表给出**列/行**并显示总格数 | 多输入 → 一份合成输出；失败项逐条报告；装不下时在本地先拦下并说明该调大哪一项；这两种模式内核会清空步骤，界面明说「不套用处理步骤」 | `contact_sheet_and_load_stack_deliver_one_composite_from_many_inputs`、wasm 主线（联系表按网格排布、堆栈画布取最大输入） |
| U76 | 变量定义 | `variables.list`、`image.variables.define` | `variables_state` / `variables_define` → `variablesStateJson` / `defineVariables` | 变量与数据集面板：变量定义器（名称 / 图层下拉 / 种类 / 像素方式·对齐·裁切）+ 逐条删除 | **`define` 是整份替换语义**：面板每次提交「现有定义 + 本次改动」的完整列表，且像素变量的 `method`/`align`/`clip` 原样带回（丢了就等于把用户选项重置为内核默认）；只读查询不推进修订；`doc.variables` 进**内容身份**（空变量省略以保持旧工程指纹）与**文档级**核验 | `variables_define_replaces_the_whole_list_so_panels_must_resend_every_def`、`variables_state_is_read_only_and_reports_definitions`、`variables_and_data_sets_enter_the_canonical_text`、`pnpm -C photocraft run check` 里的 `image-project.test.ts` 同形断言、`verify.rs::variables_are_checked_at_document_level_not_per_layer`、`panels.test.tsx` 五条（整份提交、像素选项、重名/缺图层本地拒绝、删除提交剩余、删除时保留其余像素选项）、`model.test.ts`「像素变量保留方式/对齐/裁切」、wasm 主线 U76 第二段 |
| U76 | 数据集 CSV 往返 | `image.variables.dataSets` | `data_sets_set` / `data_sets_import` / `data_sets_export_csv` → `setDataSets` / `importDataSets` / `exportDataSetsCsv` | 「导入 CSV…」「导出 CSV…」；跳过列的原因逐条显示；正向回执走提示槽而不是错误槽 | 导入是一次内容写入后刷新视图；导出只给文本，宿主写文件 | `data_set_csv_round_trips_and_reports_unknown_columns`、`panels.test.tsx` 三条（跳过原因+成功不进错误槽、导入失败原因、超预算先拒） |
| U76 | 数据集删除 / 当前生效 | `image.variables.dataSets`（整份替换，无单项删除） | `data_sets_set` + `remap_active_data_set` → `setDataSets` | 每个数据集行「删除」（整份重发其余条目）+「（当前生效）」标记 | **按名称**重定位 `active`：删掉排在前面的组不改变生效项指向，删掉生效项则清空并说明画布像素仍保留；拿不到原始取值时不给删除按钮（只给条数会被内核当作空取值静默清空） | `deleting_one_data_set_resends_the_others_verbatim`、`removing_a_data_set_keeps_the_active_one_pointing_at_the_same_set`、`model.test.ts`「数据集数组形态保留原始取值」、`workspace.test.ts`「删除数据集走整份替换…」、`panels.test.tsx` 六条（含删除失败不留「已删除」说明、缺端口与缺取值的原因分开说）、真实 WASM 主线 U76 第三段 |
| U76 | 数据集替换 | `image.applyDataSet` | `data_sets_apply` → `applyDataSet` | 数据集行「应用」+「替换图片…」（像素变量交 base64 字节） | 一步历史；缺字节 / 解码失败整次拒绝、不保留旧像素冒充成功；重复应用同一组幂等 | `applying_a_data_set_replaces_pixels_from_host_bytes_in_one_history_step`、`panels.test.tsx`「应用数据集只交出调用方选中的图片资源键」、wasm 主线 |
| U76 | 数据集导出为文件 | `file.export.dataSetsAsFiles`（本域字节入口，命令本身不登记） | `data_sets_export_files` → `exportDataSetsAsFiles` | 「导出数据集为文件…」+ 交付格式（PNG/JPEG/TIFF）+ 命名模板 | 只给编码字节，编码与撞名预检都在内核；文件名冲突在任何编码开始前拒绝；交付 MIME 跟随所选格式 | `data_sets_export_as_bytes_with_collision_checks`、`panels.test.tsx`「导出数据集把格式与命名模板交给内核，而不是写死 png」 |
| U76 | 受限声明式脚本 | `file.scripts.browse`（命令不登记，域字节入口） | `script_run` → `runScript` | 自动处理面板「受限脚本」组：文本 + 运行脚本 | 任一未知 / 未开放步骤在**执行前**整组拒绝；中途失败保留已成功步骤并如实报告；拒绝 ExtendScript 与任意代码 | `declarative_scripts_preflight_every_step_before_running_any`、`panels.test.tsx` 四条（端口分离、空脚本、逐步骤报告、整组被拒） |

命令门里**故意不登记**、由本域字节入口承担的上游命令（要求文件夹/路径，浏览器里必然失败，登记
只会造出假入口）：`file.automate.batch`、`file.scripts.imageProcessor`、`file.scripts.browse`、
`file.scripts.loadFilesIntoStack`、`file.automate.contactSheetII`、`file.import.variableDataSets`、
`file.export.dataSetsAsFiles`。平台暂缓项保持关闭：`file.automate.createDroplet`、
`file.automate.runDroplet`、`file.scripts.scriptEventsManager`、`automation.mcp`、
`batch.background`——`wasm-workflow.test.mjs` 逐个断言它们仍在 `allowedCommandIdsJson()` 之外
且 `execute` 被拒绝。

## 自动检查（实际执行结果）

在本 worktree 的 Linux 容器内运行；均在本轮最后一批改动后重跑：

| 检查 | 结果 |
| --- | --- |
| `pnpm -C photocraft run check`（build + typecheck + test） | 通过：protocol **71**（3 文件）、editor **388**（44 文件）、project-verifier 40（2 文件） |
| `cargo test --workspace --offline` | 通过：editor-core lib **236**（含本域 34）、contract_fixture 4、editor 13、interaction_state 25、project-verify lib 8、limits_agree 1、native_binary 3、smart_source 10、verify **16** |
| `pnpm -C photocraft run wasm` | 通过：release + wasm-bindgen + wasm-opt，wasm **17.47 MiB**、glue **116.1 KiB**；`packages/editor/dist/wasm/photocraft_editor.d.ts` 已含本域全部 **32** 个导出（`historyStateJson`…`runScript`、`sampleHistory`），逐名比对 `wasm-instance.ts` 声明的 32 个端口无缺失 |
| `node --test tests/features/history/wasm-workflow.test.mjs` | 通过：**6/6** 真实 WASM 主线（U74 快照三种来源/清理门/清理计划字节=实际释放/自历史新建派生字节独立且源文档 hash 不变/`epoch` 身份/**取样拒绝过期 epoch 且无步骤编辑后仍有效**、U75 录制播放与中途失败/ATN 往返、U76 批处理与取消、U76 变量与数据集像素替换/绑定校验/预算；`all` 范围说明字节=实际释放且需要自报近似） |
| `pnpm -C photocraft run verifier` | 通过：原生核验器 3.84 MiB |
| `pnpm -C photocraft run features:check` | **通过**：`commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084`（基线为已提交快照，本 change 的追加已并入其中） |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run test` | 通过：34 文件 / **275** 测试。**复跑 24 次里 3 次失败**，失败点恒为 `tests/transform-interaction.test.tsx`「2 个所选图层从 context-menu 进入变换」：`document.querySelector("[data-cursor-menu]")` 取到 `null` 后 `dispatchEvent` 抛错。该文件本 change **未改动**（HEAD 起就是 `c5ffeace` 的版本），失败是右键菜单挂载与断言之间的竞态；21 次全过时同一条也跑过 21 遍。如实记录：这是**既有**的偶发失败，不是本域引入，也没有被本 change 修掉 |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `pnpm boundary:check` | 通过：6 测试 |
| `pnpm extensions:check` | 通过：扩展 17 个、错误 0 条、告警 14 条（站点扩展前端产物未构建，与本 change 无关） |
| `pnpm codemap:check` | 通过：47 manifests、11 篇地图、**1358** 本地链接、8 模块入口 |
| `openspec validate … --strict` | 通过 |

### 基线重新采集（有意为之，仅新增）

`features:check` 的差异来源只有本 change 的交付物：**+33 条命令、+12 个能力 id、0 删除**。
按发布流程把 12 个能力 id 登记进 `P7` 后，两个共享快照必须同步，否则 `features:check`
会永久失败：

- `tests/fixtures/contract.json`：`capabilities` 追加 12 个本域 id（`HISTORY_CAPABILITIES` 顺序）。
- `notes/feature-boundary-baseline.json`：`stages.P7` 追加同 12 个 id；`sharedFiles` 中
  `tests/fixtures/contract.json` 与 `identity.rs` 的哈希随之刷新（这两个文件本轮确实改了）。
- `notes/feature-boundary-wasm-baseline.json`：`commands` 追加 33 条、`capabilities` 追加 12 条。

重新采集后逐项核对：33 条命令全部是 `+ actual`、无 `- expected`；能力握手、8 组状态/内容指纹、
三条拒绝错误、导出摘要与 PNG 字节与 `bdc3c084` **完全相同**。也就是说这次不是内容/身份漂移，
只是把本域已交付的命令与能力补进快照。

`features:check` 新增的 33 条命令：

```
actions.assignSet actions.conditional actions.delete actions.dialog actions.get actions.insert
actions.list actions.load actions.move actions.photoshopStep actions.play actions.record
actions.rename actions.save actions.setColor actions.stop actions.stopMessage actions.toggle
edit.purge.all edit.purge.clipboard edit.purge.histories edit.purge.undo edit.purge.videoCache
history.deleteSnapshot history.deleteState history.newDocument history.newSnapshot
history.renameSnapshot history.selectSnapshot image.applyDataSet image.variables.dataSets
image.variables.define variables.list
```

## 本域新增回归

全部包含在上面的计数里：

- Rust `rust/crates/editor-core/src/features/history/tests_workflows.rs`：**34** 个
  （清理确认门与像素不变、清理换 `epoch`、**清理计划报告的字节等于实际释放量**、
  **单状态时 undo 清理计划为 0**、**历史源句柄只有一个活文档**、
  **`epoch` 含文档身份且不被无步骤编辑误换**、**取样读取点拒绝过期 `epoch`**、
  **取样在有新步骤前仍有效、删除状态后失效**、快照真实内容与可撤销、
  **三种 `from` 来源固定不同内容**、自历史新建独立、
  **变量进内容身份且跨文档/PSD 矩阵**、录制只收规范命令且播放与手动一致、预检拦下越过命令门的步骤、
  ATN 未知步骤回滚 vs 显式保留、
  ATN 往返、动作集与快捷键、**步骤插入/对话框/启停/条件/动作集编辑**、**变量定义整份替换语义**、
  **变量只能绑到相容图层**、**变量/数据集/CSV 的解析前预算**、**变量随工程保存重开且老工程指纹不变**、
  CSV 往返与未知列报告、像素替换一步历史、数据集导出与撞名、
  批处理逐文件与取消、超预算/未知步骤在 `begin` 拒绝、联系表与堆栈、脚本整组预检、
  变量只读、域入口不越权转发且 `history.sample` 不在命令门内、
  **删除一个数据集时其余数据集按原始取值原样重发**、
  **删除数据集后 `active` 仍指向同一组（删掉生效项则清空）**）。
- 前端 `packages/editor/src/features/history/`：**117** 个
  （`model.test.ts` 21、`bytes.test.ts` 6、`workspace.test.ts` 21、`sections.test.ts` 3、
  `panels.test.tsx` 66）。
- 协议 `packages/protocol/src/image-project.test.ts`：规范文本与 Rust 逐字节一致（含旧工程省略变量
  行的兼容形状）。
- 核验器 `rust/crates/project-verify/tests/verify.rs`：**16** 个（新增
  `variables_are_checked_at_document_level_not_per_layer`：变量数量/空名/重名/悬空图层引用/
  种类与图层值不相容都在**文档级**报出，说明逐图层钩子表达不了 `doc.variables`）。
- 真实 WASM `tests/features/history/wasm-workflow.test.mjs`：**6** 个（在两段主线里补了
  快照三种来源、历史源 `live` 标记、`activeLayer` 是图层 id、步骤移动/重命名/按钮颜色/从第 N 步播放、
  **中途失败报告**、**变量绑错被拒**、**预算随视图下发**、**`epoch` 含文档身份（两份历史相同的文档
  不共用）且不被无步骤编辑误换**、**自历史新建交付派生字节后源文档 hash 与修订不变**、
  **只校验句柄（`preview:false`）不返回像素且同样拒绝过期句柄**、**`all` 范围说明字节=实际释放**、
  **`all` 自报近似且形状描边缓存只会导致低报**、**只给条数重发数据集会被当成空取值**、
  **删掉排在前面的数据集后 `active` 跟着走、删掉生效项则清空、重定位结果保存重开后仍一致**、
  **ATN 解析警告如实返回**的断言）。

## 本轮补齐的域内缺口

以下二十九条都是**本域**代码里的真实缺陷，由逐项复核（对照上游引擎的 `journal`/返回语义、参数语义与
真实 WASM 行为）发现并修复，每条都有回归：

1. **`actions.play` 的中途失败被当成成功**（Rust + TS）。上游 `actions.play` 在某步失败时**仍返回成功**，
   把失败放在 `{failed:{step,id,error}}` 里并保留已跑完的步骤——这是刻意的事务语义。面板原先只检查
   `result.ok`，会显示「播放成功」，用户看不到停在第几步。现在域会话读到 `failed` 后先刷新视图、再
   如实报错（「播放停在第 N 步 `id`：原因（已完成的步骤已保留）」）。回归：
   `workspace.test.ts`「播放中途失败仍然刷新，但如实上报失败步骤」、真实 WASM 主线「会失败」动作
   （断言 `ran:1`、`failed.id:"layer.select"`、`failed.step:1`）。
2. **「测试条件」把会写文档的命令当只读会话状态**（Rust + TS）。`actions.conditional` 的 `journal` 是
   `true`——它会**播放命中的分支**，因此会写内容。面板原先走 `actionCommand`（不刷新视图、不过草稿
   门禁），用户看到的是旧文档。现在有独立的 `testCondition`：过 `blockingDraft()`、写后 `afterWrite()`，
   并把 `holds`/`played` 显示成提示行（原来 `holds`/`played` 被丢掉，用户不知道走了哪一支）。
   回归：`panels.test.tsx`「动作集与条件走同一动作编辑入口…」重写为**否定** `actions.conditional`
   走 `actionCommand`、并断言提示行；`workspace.test.ts` 两条（命中分支、分支失败要报错、
   活动草稿阻止条件测试）。
3. **变量定义允许绑定到不相容的图层**（Rust）。上游 `image.variables.define` 只检查图层存在：把
   文字替换变量绑到像素层能「定义成功」，但应用数据集时 `apply_to_doc` 静默跳过——用户建了一个
   永不生效的变量。现在定义前核对种类与图层内容（显隐可绑任意层、文字替换须文字层、像素替换须
   像素/智能对象），错误信息指出变量名、种类与图层类型。回归：
   `variables_must_bind_to_a_layer_of_a_compatible_kind`、真实 WASM 主线（绑错被拒且先前的变量仍在）。
4. **`doc.variables` 与 CSV 没有「解析前」预算**（Rust + TS）。数据集会随工程持久化，原先只在导出侧
   有字节上限，导入侧无界：`csv::parse` 之前不判大小，`append` 也能无界累加。现在：
   `MAX_CSV_BYTES`（8 MiB，**解析前**按文本字节判定）、`MAX_DATA_SETS`（1024，按设置/导入后的**总量**）、
   `MAX_VALUES_PER_SET`（512）、`MAX_VARIABLES`（256），并由 `variables_state().budget` 下发；面板在
   `file.text()` **之前**按 `file.size` 拒绝，避免先读进内存再失败。回归：
   `variables_and_data_sets_stay_within_their_declared_budget`、`model.test.ts`「解码变量/数据集预算」、
   `panels.test.tsx`「CSV 超预算在读文件之前就拒绝」。
5. **逐步骤预检有两份实现**（Rust）。`actions_preflight` 与 `preflight::preflight` 各自写了一遍「先看
   注册表、再看命令门」的规则，且检查顺序相反——两处会给出互相矛盾的拒绝原因。现在只保留
   `preflight::preflight` 一份，`actions_preflight` 只补动作特有的「启停」标记。
6. **旧工程兼容与持久化往返缺回归**（Rust）。新增
   `variables_survive_save_and_reopen_and_do_not_change_the_identity_of_old_projects`：证明老工程（无变量）
   照常打开、**指纹与改动前逐字节相同**（空变量省略 `variables` 行），有变量的工程保存重开后数据一致
   且应用仍可用，且同一份变量内容在重开后指纹**稳定不变**；另加
   `variables_keep_identity_across_documents_and_psd_export` 覆盖「只有变量顺序不同 → 身份不同」、
   「派生文档的变量跟着图层 id 重新绑定并通过核验」、「PSD 导出不改源文档身份」。
7. **删除历史状态被当成「删一行记录」**（面板）。上游 `history.deleteState` 是**先退回该状态之前，
   再清空其后所有状态**：内容会回退且不可重做。面板却把它做成标题为「删除当前状态」的一键按钮，
   中间没有任何说明——用户以为只是从列表里去掉一行，实际会丢掉此后的内容历史。这与本面板自己
   写的「不可恢复的操作不能一键完成」自相矛盾。现在按钮改为「删除当前状态…」，先显示「会退回上一个
   状态、丢掉其后的历史与重做、不可撤销，改动过图层后通常该用撤销」，确认后才发请求。回归：
   `panels.test.tsx`「删除状态不是说删一行」。
8. **`epoch` 的两处语义缺陷**（Rust）。原实现把 `revision` 算进摘要，而 `revision` 在**任何**内容
   编辑时都会变，包括不产生历史步骤的 `image.variables.define`（上游 `set_vars` 只
   `revision += 1`）——归档状态本身没变，历史画笔却能缓存的源被判失效；同时摘要里**没有文档身份**，
   两份历史列表相同的文档会算出同一个 `epoch`，缓存跨文档命中，「取样 A 的归档状态」可能落到 B 上
   （正是 3.3「来源失效不误写目标」要防的）。现在 `epoch` = 文档身份 + 状态标签 + 重做标签。
   回归：`history_source_epoch_identifies_the_document_and_survives_edits_that_do_not_touch_the_states`，
   真实 WASM 主线 U74 也补了「改变量不换 epoch」与「两份相同历史的文档 epoch 不同」两条断言。
9. **「收尾」会静默丢掉未领取的交付字节**（面板）。内核 `batch_finish` 直接移除队列，未 `take` 的
   字节随之消失，之后领取必然失败；而「收尾」原先是一键按钮，用户会以为只是整理列表。现在有未领取
   项时先弹说明（「还有 N 项结果没有领取，收尾会连同队列一起丢掉」）并要求确认，确认框的回退按钮
   叫「继续领取」而不是「取消」——同一面板里「取消」是取消队列，同名会让用户点错。回归：
   `panels.test.tsx`「还有未领取的交付字节时，收尾先说明会丢掉它们」，真实 WASM 主线 U76 也断言
   「收尾后未领取项取不到了」（`takeBatchFile` 抛「不存在或已收尾」），把这条语义钉在内核上。
10. **未知变量种类被猜成显隐，再被整份替换写坏**（TS）。解码器原先把不认识的 `type` 一律
   落成 `visibility`；而 `image.variables.define` 是**整份替换**——用户只要删掉另一个变量（一个
   看似无关的操作），那个未来版本的变量就会被静默改写成显隐变量，工程被写坏且没有任何提示。
   现在不认识的种类解码成 `null` 并保留原始字符串，面板如实显示「未知种类（…）」、禁用「添加/
    删除变量」并说明原因，而不是猜一个值写回去。回归：`model.test.ts`「解码变量种类…」（期望
    `null` + `rawKind`）、`panels.test.tsx`「有不认识的变量种类时拒绝重发整份定义」。
11. **「自历史新建」会把派生内容写回源文档**（TS）。内核 `history.newDocument` 成功后会**把活动
    文档切到新文档**，而宿主标签、保存目标仍指向源文档——域会话原先只把内核返回的索引和名称转给
    面板，于是下一次「保存」会把派生工程写回源节点（用户的源文件被悄悄换成别的文档）。
    现在域会话用 `saveProject()` 取走派生工程字节后**无条件** `closeDocument()` 回到源文档
    （取字节失败也关，避免留下顶包的活动文档），再 `afterWrite()`，把 `{name, bytes}` 交给面板
    作为 `.pcraft` 下载；面板成功时提示「当前文档未受影响」，交付失败如实报错而不宣称已保存。
    回归：`workspace.test.ts`「自历史新建交出独立工程字节并关掉内核文档，不把活动文档留给宿主
    标签」、`panels.test.tsx` 两条（交付成功说明当前文档未受影响、失败不交付空文件）、真实 WASM
    主线 U74（派生后源文档 hash 与修订不变）。

12. **独立 dev 宿主里「文件」菜单整体不渲染，「自动处理…」没有入口**（共享 chrome）。「文件」
    下拉原先只在宿主注入了文档动作（打开/保存/关闭）时才存在，域声明的 feature 项是追加在它里面的；
    dev 宿主只注入 `documents.transfer`，于是「文件」菜单根本不出现——面板还挂在高级区，但用户没有
    任何线索知道有「自动处理」。现在「文件」菜单由域入口独立成立：没有文档动作时也渲染一个只含
    「自动处理…」的「文件」菜单，有文档动作时用分隔线分组。回归：`photo-editor-chrome.test.tsx`
    「宿主没有文档动作时『文件』仍渲染域入口」。
13. **停止录制后不选中刚录的动作，播放/步骤编辑全部禁用**（面板）。录制中的 `recording` 字段就是
    动作名，但「停止」原先只刷新列表，`selected` 仍为空——用户看到「录了 2 步」，而「播放」「删除
    动作」「重命名」和步骤列表都是灰的，必须先点一次动作名才恢复，看起来像没录上。现在停止时用
    录制中的名字去选中并读取明细。回归：`panels.test.tsx`「停止录制后自动选中刚录的动作」。
14. **含非 Photoshop 等价步骤的动作永远无法导出 .atn**（面板）。内核 `actions.save` 对这类步骤
    默认报错，只有传 `skipUnsupported: true` 才省略它们；面板原先没有这个参数的入口，用户录一条
    `edit.fillForeground` 就再也导不出（错误信息让人「pass skipUnsupported」却无处可传）。现在提供
    独立的「跳过无等价步骤导出…」入口（不与普通导出共用按钮，避免在不知情时拿到缺步骤的文件），
    并把内核返回的 `skipped` 逐条列出来（「X 第 N 步：id 没有等价命令，已从导出的 .atn 中省略」）。
    域会话的 `saveActions` 相应把 `skipped` 透传出来，不再丢弃。回归：`panels.test.tsx`「含非
    Photoshop 步骤的动作：默认导出如实失败，跳过导出是显式第二步」、`workspace.test.ts`「ATN 导入
    必须有未知步骤报告，导出必须有字节与被跳过步骤」。
15. **空清理范围被写成「约 1 KiB」**（面板）。确认框原先对 `bytes === 0` 也套
    `Math.max(1, …)`，于是「所有历史（当前为空）」也显示「约 1 KiB」，让用户以为仍有数据可清
    （确认后内核以 `nothing to purge` 拒绝）。现在空范围显示「（当前为空）」。回归：真实 Chromium
    走查（清理确认框文案）。
16. **清理计划报的字节不是实际释放量**（Rust，两处）。范围说明存在的意义是「清掉能省多少」，
    数字错了比没有更糟：
    - `videoCache` 原先按整份历史字节求和。本内核没有视频图层缓存，这个范围**恒为 0**——原实现
      让用户以为清视频缓存能腾出几 MB，确认后什么也没变。现在固定 0。
    - `undo` 原先同样按整份历史求和，但 `undo` 只丢**一步**。现在克隆 `History`（只复制 `Arc`
      指针，不复制像素）、真丢一次、再相减，得到这一步的净释放量；历史只有一步时为 0（内核会
      以 `nothing to purge` 拒绝，面板据此收起确认按钮）。回归：
      `purge_plans_report_what_that_range_actually_frees`、
      `purge_undo_plan_shrinks_to_zero_when_only_one_state_is_left`，真实 WASM 主线断言
      「计划字节 == 实际 freed」（400×300 三次笔迹：`undo` 1572864、`histories` 2359296）。
17. **不可清理的范围在确认前不说不可用**（Rust + TS）。空剪贴板、空历史的范围说明原先照样给出
    「可清理」，用户点确认后才收到 `nothing to purge` / `the clipboard is empty`——先骗一次点击再
    报错。现在范围说明里带 `available` 与 `reason`，值**直接来自内核**的
    `disabled_reason_with`（不另写一套与执行路径不一致的规则）；面板只在 `available === false`
    时收起「确认清理」并显示原因，缺字段按可用处理（不凭空禁用）。回归：
    `panels.test.tsx`「空范围在确认前就说明没有可清理的内容，不给「确认清理」」。
18. **清理会让「取样」按旧索引读到新内容**（Rust + TS + 面板）。清理只换 `epoch`，若消费方拿着
    旧句柄按索引取样，清理后**同一个索引指向别的内容**，画出来「看起来对、其实不对」——
    这正是 3.3「来源失效不误写目标」要防的，但本域原先只把 `epoch` 显示出来，让消费方自觉比对。
    现在新增取样读取点 `history_sample`（wasm `sampleHistory`，第 32 个端口）：
    - **必须**带取源时的 `epoch`，与当前摘要不一致即拒绝，错误里写明「取源时为 X，当前为 Y」
      与「不会按旧索引返回新内容」；缺 `epoch` 直接拒绝（没有身份就无法判定失效）。
    - `state` 越界拒绝，不静默退化成「最后一个状态」；`maxSide` 限 1..=2048（默认 256）。
    - 归档状态取 `history.state(i)` 那份文档，活状态才用当前文档；返回 RGBA8 base64 + 尺寸 +
      `live` + 源身份。
    - 面板**清理后刻意保留**取源 `epoch`（再取样如实报失效），换源必须显式点「重新取源」，
      否则下一次取样会悄悄改绑到新状态。回归：
      `sampling_a_history_source_refuses_a_stale_epoch_instead_of_reading_the_new_state`、
      `a_history_source_survives_edits_that_add_no_step_but_not_a_deleted_state`、
      `domain_entry_points_are_bounded_to_the_commands_this_domain_registers` 里断言
      `history.sample` **不在**命令门（它是读取点，不进 `HISTORY_COMMANDS`、不注册 capability，
      `features:check` 基线因此无需重采）、`workspace.test.ts` 两条、`panels.test.tsx` 两条
      （取样/清理后失效/重新取源恢复；缺端口只停用取样）、真实 WASM 主线 U74 第 7 段。
19. **缺取样端口时整块历史面板消失**（面板）。取样是可选能力（历史画笔属 sibling change），
    但 `historySession` 的端口探测原先与其它面板共用同一条「缺端口就不渲染」规则，精简宿主会因为
    没有 `sampleHistory` 而看不到快照与清理。现在只停用取样区，其余照常可用。回归：
    `panels.test.tsx`「宿主没有取样端口时只停用取样，历史面板其余部分照常可用」。
20. **确认清理成功后没有任何回执**（面板，浏览器走查发现）。点「确认清理」后确认框消失，成功路径
    不写任何提示，失败路径才有红字——用户无法区分「清掉了」和「点了没反应」。视频缓存（恒 0 字节）
    与空历史这类清理后列表完全不变的范围尤其明显。现在成功写 `data-history-notice`（「已清理「范围
    名」」），与失败槽分开。回归：`panels.test.tsx`「清理必须先取范围说明…」补断言成功提示存在且
    错误槽为空。

21. **`edit.purge.all` 的范围说明只算历史，漏掉剪贴板与渲染缓存**（Rust，本轮由
    「计划字节=实际释放」这条不变式查出）。`all` 与 `histories` 原先共用同一个求和，于是
    「全部」的确认框只报历史字节；真实 WASM 实测 `plan 3932160` 而 `freed 4194304`，差的正是
    剪贴板那 262144 字节（渲染缓存还会再叠加）。用户看到的是「清完怎么少了这么多」。现在 `all`
    单独累计：各文档历史 + 剪贴板 + 效果图缓存 + 合并蒙版缓存 + 智能滤镜阶段缓存。形状描边缓存
    没有公开的字节读数（探测本身会清空它），因此 `all` 是「可测部分之和」，只会低报不会高报，
    界面按「约」呈现，这一点写在 `history_purge_plan` 的文档注释里。回归：
    `purge_plans_report_what_that_range_actually_frees`（已复制内容时 `all ≥ histories + clipboard`）、
    真实 WASM 主线「`all` 的范围说明覆盖剪贴板与渲染缓存，且等于实际释放量」（`plan.bytes === freed.freed`，
    且清空后 `available:false`）。
22. **取样结果只显示尺寸，返回的像素被丢掉**（面板）。取样端口返回 RGBA8 base64，面板原先只把
    「128×128」写进一行文字——用户无法判断这一份源到底是归档的那一刻还是当前画面，也就看不出
    「取错源」。现在画到 canvas 上，并在绘制前核对 `width × height × 4`：长度对不上就报
    「取样像素长度不符」而不是把半张图当整张（旧实现根本不解码，所以这类损伤完全不可见）。回归：
    `panels.test.tsx`「取样结果画出真实像素，长度不符时如实报错而不是画半张图」；浏览器走查同时
    断言预览画布里有非零 alpha 像素（确认不是空白画布）。
23. **历史画笔落笔前没有便宜的「源还能用吗」入口**（Rust + TS + 面板）。取样是唯一的校验路径，
    但它会合成并 base64 一整张缩略图；历史画笔每次落笔都问一遍就变成每笔分配一次 RGBA 缓冲。
    现在 `history.sample` 支持 `preview: false`：走**同一套** `epoch`/索引校验，只返回身份、标签、
    源尺寸与 `live`，不含 `pixels`。TS 侧是独立的 `checkHistorySource` 与独立解码器
    `decodeHistorySourceCheck`，两种答案不能互相冒充（带 `pixels` 的答案被校验解码器判为非法，
    反过来的取样解码器也拒绝）。回归：
    `a_source_check_validates_the_handle_without_compositing_pixels`（含过期句柄/越界索引/缺 `epoch`
    三条拒绝与「不返回 pixels」）、真实 WASM 主线 U74 第 7b 段、`workspace.test.ts`
    「检查源可用只送 preview:false…」、`model.test.ts`「只校验句柄的答案不带像素…」、
    `panels.test.tsx`「检查源可用走内核校验但不合成像素，过期句柄同样被拒」。

24. **`all` 会释放读不到字节的缓存，界面却把低估值当精确值、把可清理说成「当前为空」**（Rust + TS +
    面板，本轮在真实 WASM 里造出描边缓存后发现）。两个连在一起的错误：
    (a) `all` 的范围说明是「已可测部分之和」，形状描边缓存没有公开读数，但确认框照旧只说「约 X KiB」，
    用户无从知道这个数字偏低；
    (b) 更糟的是一批**共用 tile** 的状态：`available: true`（确认后确实会丢掉整个撤销栈）而 `bytes: 0`，
    界面顺着「0 字节」说「（当前为空）」——用户以为点确认什么都不会发生，实际历史被清空。
    现在内核在范围说明里下发 `approximate`（只有 `all` 为 `true`，其余是精确值），界面按它说「正好」或
    「约」；`available && bytes === 0` 一律改说「不会腾出空间：这些状态与更早的状态共用像素」
    （视频缓存单独说明「本工程没有视频图层」），`all` 报 0 时则说「部分缓存没有公开大小，实际上仍可能
    腾出空间」——三种情况不再共用一句话。回归：`purge_plans_report_what_that_range_actually_frees`
    （`histories`/`clipboard` 的 `approximate` 为 `false`、`all` 为 `true`）、真实 WASM 主线
    「形状描边缓存读不到字节，`all` 只会低报且必须自报近似」（造出裁剪形状 + 渲染后清理，断言
    `freed > plan.bytes` 且 `purged` 含 `shape stroke cache`）、`panels.test.tsx`「可清理但释放 0 字节时
    不说「当前为空」，仍给「确认清理」」、`model.test.ts`「`all` 的范围说明标成近似…」、浏览器走查
    断言确认框含「正好/约」且不含「当前为空」。

25. **数据集只能导入、不能删，`setDataSets` 端口是死代码**（Rust + TS + 面板）。`image.variables.dataSets`
    是**整份替换**语义，没有单项删除命令，所以「删掉一组」只能重发其余全部条目；而解码器只保留了
    「有几个值」（`values: number`），重发时还原不出 `{variable, kind, value}`。于是：面板没有删除入口，
    导入进来的数据集一旦多了就永远删不掉；同时 `setDataSets` 在 `wasm-handle.ts` 里声明为必需端口、
    却没有任何调用方——一个死端口。现在解码器保留内核原始取值 `entries`，面板每行给出「删除」，
    整份重发其余数据集；拿不到原始取值（精简宿主把 `values` 给成数字）时按钮禁用并说明原因，绝不
    用编造的取值覆盖别人的数据集。实测确认「只给条数」不会被内核拒绝，而是被当成空取值静默清空
    （`values: 2` → `values: []`），这正是必须在界面层挡住的原因。回归：
    `deleting_one_data_set_resends_the_others_verbatim`（原样重发幂等、删一条其余一字不改、删空合法）、
    `model.test.ts`「数据集数组形态保留原始取值用于整份重发」、`workspace.test.ts`「删除数据集走整份
    替换…」、`panels.test.tsx` 三条（重发其余原始取值 / 拿不到取值时禁用 / 删最后一个提交空数组）、
    真实 WASM 主线（原样重发幂等 + 只给条数被静默清空）。

26. **删掉数据集后「当前生效」错位到别的组**（Rust + TS + 面板）。上游只存一个下标 `active`，整份替换
    后下标不变、含义却变了：`[A,B,C]` 里生效 B（1），删掉排在前面的 A 之后 `active` 仍是 1，现在指的是 C；
    删掉生效的 B 之后 `active` 停在越界下标，而界面会照它标「当前生效」。`doc.variables.active` 还会随
    工程持久化（实测保存重开后仍是那个错位值）。现在 `data_sets_set` 按**名称**把生效项重新定位，
    生效的那组被删掉就清空；追加语义不动它。界面每行标出「当前生效」，删掉生效项时明说
    「画布保留它最后一次应用的像素，但此后没有生效的数据集」——删除不会把画布还原，这句不说用户会以为
    画布会退回去。回归：`removing_a_data_set_keeps_the_active_one_pointing_at_the_same_set`（删前面的、
    删生效的、追加三种情形）、真实 WASM 主线（`active` 1→0，删生效项→`null`）、`panels.test.tsx`
    「标出当前生效的数据集；删掉它时说明画布像素仍留着」、浏览器走查（删 A 后仍标 B；删 B 后有说明）。

27. **ATN 解析警告被丢掉，导入却宣称完整**（TS + 面板）。`.atn` 有尾部多余字节时上游把它当**警告**而不是
    失败：动作照常导入，但内容可能少了东西——`actions.load` 一直返回 `warnings`，域会话只取
    `unsupported` 与 `actions`，面板就只会说「已导入」。这跟「未知步骤必须有报告」是同一条原则的另一半。
    现在 `loadActions` 带回 `warnings`，面板逐条列出并给一条「已导入，但解析时有 N 条警告（文件可能
    不完整）」的回执；没有警告时不显示清单、也不谎称有警告。顺带修掉同一处的一处陈旧：
    `actions.load` 会把 `.atn` 里的 F 键绑定写进偏好，面板原先导入后只刷新动作列表，快捷键一栏仍显示
    导入前的旧绑定。回归：`decodeWarnings` + `workspace.test.ts`「ATN 解析警告往上传…」（含缺字段按
    空数组）、`panels.test.tsx` 三条（警告逐条显示且不算错误 / 无警告不显示 / 导入后重读快捷键）、
    真实 WASM 主线（尾部补 4 字节 → `warnings: ["4 trailing bytes ignored"]`）。

28. **批处理面板发不出 `steps` 与 `naming`，联系表的网格也改不了**（面板）。内核 `beginBatch` 收
    `steps`（逐文件执行的命令）、`naming`（`{name}`/`{index}` 模板）与联系表的 `columns`/`rows`，但面板
    只发了模式、格式与适应边长：于是「批处理」只会打开每个文件再导出，做不了 Photoshop 批处理真正的
    用途——把同一串动作套到一批文件上；联系表则永远用默认 5×6=30 格，超过 30 张就得到一句
    「输入 N 张图片超过网格容量 30」而面板里无从调整。现在补出这三组参数：处理步骤按 JSON 数组本地
    解析（写错给可读原因、非数组不静默当空），联系表给出列/行并显示总格数，装不下时在本地先拦下并
    说明该调大哪一项。回归：`panels.test.tsx` 四条（步骤与命名模板透传 / 非法 JSON 本地拒绝 /
    联系表列行透传且容量先拦 / 堆栈模式说明步骤套用在合成结果上）、真实 WASM 主线（默认网格拒 31 张、
    8×6 收下）。这里顺手纠正了一处口径：内核只对 `contactSheet` 清空步骤，`loadStack` 是「先合成成
    一份文档、再把步骤跑在这份结果上」——把两者说成一样会让用户以为堆栈模式下步骤被忽略。

29. **CSV 导入成功的回执照旧渲染在错误槽里**（面板，浏览器走查当场发现）。`导入 3 个数据集` 被塞进
    `data-data-sets-error`，于是成功提示套上了错误样式——用户看到红色一行会以为导入失败；导出 CSV、
    导出为文件的正向回执同病。现在正向回执走 `data-data-sets-notice`，失败才进错误槽，二者互斥
    （失败时清掉上一次的成功提示，不留两条自相矛盾的话）。回归：`panels.test.tsx`「CSV 导入把跳过列的
    原因显示出来」追加「成功不进错误槽」断言；浏览器走查断言导入后 `[data-data-sets-error]` 为 0 条。

### 本轮补齐的验证盲区

复核时另发现三处「代码没问题、但结论没有证据」的地方，一并补上：

- **`active` 的重定位结果是否随工程持久化**：已用真实 WASM 直接验证（`[A,B,C]` 生效 C=2 → 删 A →
  读 `1` 指向 C → 保存重开仍是 `1` 且只剩 `B,C`），并把这段断言并入真实 WASM 主线。只验证内存里的
  返回值是不够的：`doc.variables.active` 会被序列化，错值会在重开后才暴露。
- **载入堆栈与联系表对 `steps` 的处理不同**：内核只对 `contactSheet` 清空步骤，`loadStack` 是
  「先合成一份文档、再把步骤跑在结果上」。第二轮文案把两者写成同一句「不套用处理步骤」，属于**文档
  说错**（不是代码错），已改正并加断言。
- **`pnpm -C integrations/woohaa test` 的偶发失败**：复跑 24 次里 3 次挂在
  `tests/transform-interaction.test.tsx` 的右键菜单上。该文件在本 change 未被改动，失败与历史/动作/
  数据驱动域无关；如实记为**既有偶发项**，未擅自修改他人测试来掩盖。

## 剩余阻塞（真实外部依赖）

本轮已把先前记录的五项集成阻塞在域内或经授权的共享文件里解决（B1 能力 id 与快照、B2 `doc.variables`
内容身份与文档级核验、B3 「窗口/文件」菜单入口、B4 自历史新建把源文档写坏、B6 宿主测试替身），
逐条证据见上面「自动检查」与「共享文件改动清单」。**剩下两项不是本 change 能自行关闭的**：

- **B5 历史源失效的消费方（sibling change 范围）** — 本域在 `historyState().epoch`
  （**文档身份 + 状态标签序列 + 重做标签**）上给出稳定源身份，并在清理/删除状态/切快照时更新它；
  不含修订号，因此不产生历史步骤的编辑（如改变量）不会误让有效源失效；文档身份入摘要，因此两份
  历史列表相同的文档不会跨文档命中缓存。本轮进一步把「失效」做成**可执行的读取点**
  `history.sample`：消费方带取源 `epoch` 取样，过期即被拒绝并说明原因，因此不会出现「自觉比对」
  失败时按旧索引画出新内容。消费方是 sibling
  `2026-10-22-add-photocraft-retouch-workflows` 的历史画笔（`paint.historyBrush` 的源可用性判定），
  该 change 的任务 2.2（U38）明确拥有「图案图章/历史画笔的来源选择、取样与绘画」，且本 change 未
  登记 `paint.historyBrush`——它属于那边的命令与工具接线。在那一边接上之前，「正确失效历史画笔源」
  有内核侧证据（`sampling_a_history_source_refuses_a_stale_epoch_instead_of_reading_the_new_state`、
  `a_history_source_survives_edits_that_add_no_step_but_not_a_deleted_state`、
  `purge_changes_the_history_source_epoch_so_stale_sources_are_visible`、
  `history_sources_mark_exactly_one_live_state_for_consumers`）与面板侧证据（取样→清理→再取样被拒→
  重新取源恢复），但**没有**历史画笔那一侧接到本读取点后的界面联合验收。因此任务 2.1 仅按本域
  交付范围勾选（命令、清理门、取样读取点与失效证据齐备），跨域联合验收的 5.2 保持未勾选。
- **B4 余项：宿主标签注册（外部产品决策）** — 内核 `history.newDocument` 会切换到新文档，而宿主
  标签仍指向源文档。本域已把这条路径改成**不改动当前文档**：域会话取走派生工程的字节后立即
  `closeDocument()` 回到源文档（hash/修订不变，真实 WASM 主线有断言），面板把字节作为 `.pcraft`
  交付并明确提示「当前文档未受影响」。要让派生文档以**活动标签**的形式留在工作区，需要
  `document.activate`（当前 capability 禁用）与「未命名文档的保存目标」两条产品语义；这不是实现
  缺口，是尚未作出的产品决策，因此不在本 change 内自行决定。

## 真实 UI 与设备

### 已执行的浏览器交互走查（无 GPU，功能级）

当前环境是 Linux 容器：`ls /dev/dri | grep '^renderD'` 无输出（无真实 GPU），`DISPLAY` /
`WAYLAND_DISPLAY` 为空（无显示会话），会话也未连接桌面浏览器。按仓库规则**不采渲染/像素/性能
结论，不把软件渲染冒充硬件验收**。但本编辑器的预览走 Canvas 2D + WASM 的 CPU 合成（不依赖
GPU），面板本身是 DOM，因此用 Playwright + 本地 Chromium（WebGL renderer 实测为
`ANGLE (…SwiftShader…)`，即软件渲染）把 dev 宿主的**交互主线**真跑了一遍——这是功能证据，
**不是** 4.2 要求的电脑/Pad 真实设备验收：

- 入口：`窗口` 菜单出现「历史记录…/动作…/变量与数据集…」（排在两个显示开关之后），`文件` 菜单
  出现「自动处理…」；点菜单项与点「高级…」打开的是同一批面板。
- U74：建「基线」（整份）与「合并」（合并图层）两份快照 → 点「所有历史」先出现范围说明 →
  「取消」不做任何事 → 确认后历史只剩 1 个状态、**两份快照仍在**、当前文档基线 hash 不变 →
  「自历史新建文档」下载到 `派生工程.pcraft`，提示「当前文档未受影响」，源文档基线 hash 不变。
- U74 取样/失效（本轮补跑）：拉开「取样状态」选第 1 步 → 「取样历史源」显示「已取样第 1 步
  「Open」（归档状态），源身份 22961a18，128×128」→ 点「所有历史」读到「正好 128 KiB」
  （精确范围不用约数；只有 `all` 才是「约」，见第 24 条）→ 确认后
  出现回执「已清理「所有打开文档的历史状态（含重做）」」→ **「重新取源」按钮仍在**（旧 `epoch`
  被刻意保留）→ 直接再点「取样历史源」得到「历史源已失效（取源时为 22961a18…，当前为 b1adfdfc…）：
  状态序列或文档已经变化。请重新取源后再取样；不会按旧索引返回新内容」，且不显示任何取样图 →
  点「重新取源」再取样恢复为「已取样第 1 步「变换选区」（活文档）」。这是 B5 在本域侧的界面证据。
- U74 取样预览与来源校验（本轮补跑，18 项全过、0 console 错误）：导入图片后画两笔 → 选第 1 步 →
  「取样历史源」得到「已取样第 1 步「Open」（归档状态）…128×128」且**画出 128×128 预览**，
  画布内有 16384 个 alpha 非零像素（不是空白 canvas），无长度校验报错 → 「检查源可用」得到
  「第 1 步「Open」可用（400×400）」（报的是**源文档**尺寸，且不产生新预览）→ 清理「所有历史」
  得回执 → 取样预览与「可用」提示同时消失 → 再点「取样历史源」与「检查源可用」**两者都**报
  「历史源已失效…不会按旧索引返回新内容」→「重新取源」后取样与校验都恢复 → 确认框文案按
  `approximate` 区分「正好/约」且不说「当前为空」→ 1024×768 下
  `scrollWidth === clientWidth`（含预览图仍无横向溢出）。
- U75：录制两步（填充前景色、清除）→ 停止后自动选中并列出 `edit.fillForeground`/`edit.clear`
  两步 → 播放可用；普通「导出 .atn…」对含非等价步骤的动作如实报错 → 「跳过无等价步骤导出…」
  成功下载 `.atn` 并逐条列出被省略的步骤。
- U76：变量定义（`titleShow · 图层 2 · visibility`）→ 导入 CSV 得到 3 个数据集、未知列
  `extra` 有跳过说明 → 批处理两文件逐项 `✓` 并可「领取」；12 个大图批处理**中途取消**后
  状态为 `cancelled`（进度 1/1）、剩余项未启动；脚本含未知命令时整组预检拒绝并指出第 2 步。
- 窗口尺寸：1024×768 下 `documentElement.scrollWidth === clientWidth === 1024`，无横向溢出，
  历史面板可见。

本轮走查当场发现并修掉四处真实缺陷（「文件」菜单在无文档动作的宿主里整体不渲染、停止录制后
不选中刚录的动作、含非等价步骤的动作无法导出 .atn、清理成功后没有任何回执），见「本轮补齐的
域内缺口」第 12–14、20 条；取样失效与范围字节是补跑时验证的（第 16–19 条）。

### 补跑走查（数据集删除 / ATN 警告 / 批处理参数）

在最后一轮补齐后重跑一遍功能走查（同一软件渲染 Chromium，1440×1000 与 1024×768），**28 项全过、
0 console 错误、0 pageerror**。这轮新增的证据：

- U76 数据集：定义 `showTitle`（绑图层）→ 导入 3 行 CSV 得 3 个数据集、**无错误槽**（成功没套错误样式）
  → 应用 B 后 B 行标 `data-active="true"` 且文字含「当前生效」→ 「删除 A」按钮**可用**（说明解码拿到了
  原始取值）→ 删 A 后剩 `["B","C"]` 且**生效项仍指向 B**（下标 1→0 跟着走，没滑到 C）→ 删生效的 B 后
  提示「已删除当前生效的数据集「B」：画布保留它最后一次应用的像素，但此后没有生效的数据集」且**不再有
  生效标记**。
- U75 ATN：导入尾部多 4 字节的 `.atn` 得到逐条警告「4 trailing bytes ignored」+ 回执「已导入，但解析
  时有 1 条警告（文件可能不完整）」，**不算错误**；换干净文件后警告清单消失。
- U76 批处理：面板有「处理步骤」「命名模板」两个输入；批处理模式**不显示**联系表网格，切到联系表才
  出现列/行并显示「共 30 格」，且说明「这两种模式不套用处理步骤」；非法步骤 JSON 在本地拒绝
  （「处理步骤不是合法 JSON：…」）不发队列请求；填 `[["image.imageSize",{...}]]` + `out-{name}` 后跑完，
  逐项 `✓ retouch-main.png → out-retouch-main.png`（命名模板生效）。
- 1024×768 下 `scrollWidth === clientWidth`（打开变量与自动处理面板后仍无横向溢出）。

### 仍待人工验证（真实设备）

屏幕渲染质量、帧率/长尾、Pad 触摸与真实 GPU 下的视觉一致性**未采集**，也不用软件渲染替身。
真实 WASM 的**非界面**主线已在 `tests/features/history/wasm-workflow.test.mjs` 用构建产物跑通
（产出真实 PNG 字节并逐像素尺寸校验）。

需要人工在具备真实 GPU 的电脑（1440×1000）与 Pad 正常窗口（1024×768）上执行的主线：

1. 历史面板：新建快照「基线」→ 把「快照内容」切到「合并图层」再建一份、切到「当前图层」再建一份
   → 分别「回到」三者，确认图层数不同（整份=全部、合并=一层、当前=活动层）→ 落一笔 → 撤销/重做
   各一次（内容与 hash 回到原值）。再从菜单「窗口」与「高级…」各进入一次，确认两条入口都指向同一
   面板（菜单项在显示开关之后、文档清单之前）。
2. 历史面板：点「所有历史」→ 读到范围说明 → 点「取消」（文档不变）→ 再点确认（像素与保存基线不变、
   历史源身份变化、出现「已清理…」回执）。再确认「视频缓存」也有按钮并能取到范围说明（当前无视频图层
   时应为 0 且文案为「（当前为空）」——因为空范围在确认前就会说明不可清理）。
2a. 历史面板取样：「取样状态」选一个较早状态 → 「取样历史源」（应显示归档状态、源身份前 8 位与
   尺寸，并画出预览图）→ 「检查源可用」（应给「第 N 步「标签」可用（宽×高）」，且**不产生**预览图）→
   清理历史 → 再点「取样历史源」与「检查源可用」（两者都应报「源已失效…不会按旧索引返回新内容」，
   且不显示图、不显示「可用」）→ 点「重新取源」再取样（应恢复）。这是历史画笔源失效的界面侧主线。
3. 「自历史状态」下拉选一个较早状态（或保持「当前状态」）→ 填「新文档名称」→「自历史新建文档」
   → 浏览器应下载一份 `.pcraft` → 打开它确认内容等于所选状态、且**源文档的标签与内容完全没变**
   （未出现新标签、未变脏、保存仍写回源文件）。
4. 动作面板：录制「两步」（两次图层操作）→ 停止 → 在干净文档播放 → 与手动执行结果对照 →
   导入一个含未知步骤的 `.atn`（默认整组回滚、显示逐个事件）→ 勾选保留后重试 → 导出再导入。
   再验证步骤编辑：停用第 1 步（应标注「播放时跳过」且播放跳过）→ 加对话框 → 用「上移/下移」
   调整顺序（首尾步骤对应按钮应禁用）→ 插入一条 `layer.new.layer` → 「测试条件」选 `always`
   （应走 then 分支）→ 「归入动作集」填入「常用」→ 「按钮颜色」选绿色 → 「重命名」改名 →
   「从第几步播放」填 1（应只跑剩余步骤）。
5. 自动处理：选两个文件 → 开始 → 逐文件结果出现 → 「领取」交付一张 → 再跑三个文件并中途「取消」
   （剩余项不启动）→ 不领取直接点「收尾」应弹出「还有 1 项没有领取」的说明（点「继续领取」回到
   列表，点「确认收尾」才释放）→ 领取后再「收尾」，确认「领取」入口消失。再从「文件」菜单进入
   「自动处理」确认入口存在。
6. 变量与数据集：在变量定义器里绑定显隐变量（选图层 → 种类「显隐」→ 添加）→ 再添加一个像素变量
   （方式 `fit`、对齐 `center`、裁切）→ 确认**第一个变量仍在**（整份替换语义）→「导入 CSV…」
   （含一个未定义列，确认列出跳过原因）→「应用」→ 撤销一步回到应用前 →「替换图片…」后应用
   像素变量 → 保存并重开工程（确认数据集仍在，且「未修改」判定把变量算进内容）→ 删掉一个变量确认
   另一个仍在且像素选项未被重置 →「导出数据集为文件…」把格式切到 JPEG、命名填
   `{document}-{name}`（交付文件应是 `.jpg`）。
7. 受限脚本：写 `layer.new.layer {"name":"脚本层"}` 一行并运行（成功后一步可撤销）→ 追加
   `filter.liquify` 一行并运行（执行前整组拒绝，图层数不变）。
8. 历史画笔（跨域，需 sibling `retouch` change 先完成）：取一个归档状态的源 → 清理历史 → 历史画笔
   应报该源已失效而不是画出旧内容（B5 的界面侧证据）。本域侧已可用「取样历史源」独立验证同一判定
   （见第 2a 步），联合验收仍需那一边接线。

变量定义器的图层下拉取自工作区视图（`controller.currentView().document.layers`）。精简宿主若没有
`currentView`，下拉退化为「没有图层」并把「添加变量」置灰，而不是渲染一个指向不存在图层的
定义——这条降级路径由 `panels.test.tsx` 覆盖，不需要真实设备。

Photoshop 外部往返不需要（本 change 未改 PSD 兼容项）；数位笔硬件验证不在范围。

## 发布记录格式

每项记录：U 编号 / 子能力 / 实现位置 / 环境 / 操作与参数 / 预期及实际结果 / 通过或待验证 /
暂缓理由。当前状态：域内自动回归、真实 WASM 主线、`features:check`、宿主与地图门禁全部通过；
能力已在 `P7` 发布。真实界面项**待人工验证**（该容器无 GPU、无显示会话）；U74 的「失效历史画笔源」
**待 sibling retouch change 接线**（B5）；派生文档登记为活动标签**待产品决策**（B4 余项）。
不扩展原生 Droplet、任意脚本事件、后台批处理与 MCP；未知 ATN 步骤与未知脚本步骤都不静默跳过。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
