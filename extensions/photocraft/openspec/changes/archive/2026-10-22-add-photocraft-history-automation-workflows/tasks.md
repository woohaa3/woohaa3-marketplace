# 历史快照、动作与数据驱动编辑任务

实施基线：结构前置 `b61da631`（`2026-10-22-refactor-photocraft-feature-boundaries`）已在当前
分支；产物基线 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；本 worktree HEAD 为 `b0cd6cbc`（规划提交）。
改动落在本域归属目录、change 目录，以及经用户授权顺序修改的少量共享文件（清单见
`verification.md`「共享文件改动清单」）；未改 vendor、未升级全局版本号、未提交。

勾选标准：只勾「代码 + 可执行检查都已完成」的项。本轮在用户明确授权下顺序修改了少量共享文件
（`photo-editor-chrome.tsx`、`photo-editor-app.tsx`、`identity.rs`、`document_content.rs`、
`packages/protocol/src/features/shared/content.ts`、`project-verify` 的文档级钩子、宿主测试替身、
共享 fixture），每次都只补本域需要的那一处、没有复制第二套实现；逐条清单见
`verification.md`「共享文件改动清单」。仍需真实 GPU/人工走查、或属于 sibling change 与产品决策的
条目保持未勾选，并在 `verification.md`「剩余阻塞」写明原因。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  - 已确认 `b61da631` 是当前 HEAD 的祖先；主要改动落在 parallel-work 列出的本域目录
    （`packages/editor/src/features/history/`、`packages/protocol/src/features/history/`、
    `rust/crates/editor-core/src/features/history/`、`rust/crates/project-verify/src/features/history/`、
    `tests/features/history/`）、`docs/code-map/` 与本 change 目录。Rust 侧用 `#[path]` 挂载
    （`editor/tools.rs`、`src/wasm.rs`），没有在共享父文件里塞本域逻辑；TS 侧经既有
    `createFeatureHandles`/`FeaturePanelContext` 装配，未改 `editor-workspace.ts`、`editor-wasm.ts`、
    `features/index.ts|sessions.ts|handles.ts|contracts.ts`。旧集中入口
    （`editor-tool-panels.tsx` 等 facade）未动。
  - 另在用户授权下改了 `photo-editor-chrome.tsx`（菜单接线）、`photo-editor-app.tsx`（title 文案）、
    内容身份/核验钩子与共享 fixture；逐条见 `verification.md`「共享文件改动清单」，无第二套实现。

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  - `notes/feature-boundary-wasm-baseline.json` 由 `b61da631` 采集；本轮 `features:check` 的差异
    只有本 change 新增的 33 条命令与 **12 个能力 id**、**无删除**，能力握手、8 组状态/内容指纹、
    三条拒绝错误、导出摘要与 PNG 字节与快照逐项相同（详见 verification「自动检查」）。
  - 同名 capability 的归档前置已处理：12 个能力 id 在 Rust `P7` 与协议 `feature.capabilities` 同序
    同值发布，两个共享快照（`tests/fixtures/contract.json`、**两个** `feature-boundary*.json`）
    同步重新采集，`features:check` **通过**。原 change 的未验收项未被改写。

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  - 矩阵见 `verification.md`「逐项能力矩阵」：U74 6 项、U75 6 项、U76 10 项，每项给出命令/字节
    入口、`Editor` 包装与 `wasm.rs` 导出、面板入口、事务语义与回归用例名。**没有**用菜单占位：
    每条路径在 Rust 有入口与回归，在真实 WASM 有主线断言，菜单入口已由共享 chrome 的「窗口」
    「文件」下拉接出（`photo-editor-chrome.test.tsx` 断言）。平台暂缓项（原生 Droplet/任意脚本事件/
    后台批处理/MCP）单列并在 `wasm-workflow.test.mjs` 逐个断言仍被命令门拒绝。

- [x] 1.3 确认同级依赖 2026-10-22-add-photocraft-file-workflows, 2026-10-22-add-photocraft-raster-interchange；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  - 本域不 import `integrations/woohaa` 或 `server/`；未新增公共端口、未改 `rust/project-limits.json`
    或任何全局版本/预算；限额只引用既有 `photocraft_project_verify::limits`（`MAX_QUEUE_FILES`、
    `MAX_INPUT_BYTES` 等是本域自己的常量，取自共享 limits 的公开值）。
  - 与两个同级前置的关系是**软依赖**：批处理输入/输出走字节（不依赖 files 域的文件选择实现），
    PSD/图像编解码走既有内核命令（不依赖 raster-interchange 的新编解码）。真实联合验收见 5.2。

## 2. 逐项贯通

- [x] 2.1 U74：提供命名历史快照、从状态建新文档、删除快照/状态和按范围 Purge；清理前说明不可恢复范围并确认。 成功证据：快照指向真实内容，自历史新建独立，清理不改变当前像素/保存基线且正确失效历史画笔源。
  - **域内已完成**：6 条 `history.*` 命令 + 5 条 `edit.purge.*` 进唯一命令门；另外 1 条
    `history.sample`（读取点，命令门外的域入口，见下）让「失效」可被真实执行到；`history_state()`
    暴露状态/重做/快照/源列表与稳定 `epoch`；清理有第二道确认门（缺 `confirm: true` 时返回带范围
    说明的错误、不执行），并在清理后用 `content_hash` 与 `revision` 自查「清理不应改变内容」。
    本轮修正了 `epoch` 的两处语义缺陷：原实现把 `revision` 算进摘要（**任何**内容编辑都会换 epoch，
    包括不产生历史步骤的 `set_vars`，会让可用的源被误判失效），又缺文档身份（两份历史列表相同的
    文档会算出同一个 epoch，缓存跨文档命中，取样 A 的归档状态可能落到 B 上）。现在摘要 = 文档身份
    + 状态标签 + 重做标签；回归把两条都钉住。
    面板「清理」先取范围说明再让用户确认，取消不发请求。
  - 本轮补齐的域内缺口（面板原先只覆盖了一部分参数）：
    - 快照「内容」原先只有 `fullDocument`，`mergedLayers`/`currentLayer` 虽在内核里却无入口；
      现在三选一，并由内核回归与 WASM 主线证明三种来源固定的是**不同**内容（合并=压平一层、
      当前图层=只剩活动层）。
    - 「自历史新建」原先固定传空参数，无法选状态或命名；现在有 0 基状态下拉与名称输入
      （留空用当前状态与历史标签）。
    - 清理按钮原先是 4 个，漏了 `videoCache`；命令已进命令门却无入口，用户会以为没有这个范围。
      现在五个范围都有按钮。
    - **清理范围说明的字节与实际释放量不一致**：`videoCache`（本内核无视频缓存，恒 0）与 `undo`
      （只丢一步）原先都按整份历史求和，让用户以为能腾出几 MB，确认后什么也没变。现在 `undo` 克隆
      `History`（只复制 `Arc` 指针）真丢一次再相减，只有一步时为 0。范围说明另带 `available` /
      `reason`（直接取内核 `disabled_reason_with`），空范围在**确认前**就说明不可清理，而不是先骗
      一次点击再报 `nothing to purge`。回归：
      `purge_plans_report_what_that_range_actually_frees`、
      `purge_undo_plan_shrinks_to_zero_when_only_one_state_is_left`、真实 WASM 主线断言计划字节
      等于实际 freed、`panels.test.tsx`「空范围在确认前就说明没有可清理的内容」。
    - **本轮又查出一处同类缺陷，范围是 `all`**：`all` 与 `histories` 原先共用同一个求和，可 `all`
      还会丢剪贴板和四类渲染缓存。真实 WASM 实测计划 3932160、实际释放 4194304，差的正是剪贴板
      262144 字节（渲染缓存再叠加）——用户看到「清完怎么少了这么多」。现在 `all` 单独累计
      （各文档历史 + 剪贴板 + 效果图 + 合并蒙版 + 智能滤镜阶段缓存）；形状描边缓存无公开字节读数
      且探测会清空它，故 `all` 只是「可测部分之和」，只会低报不会高报，界面按「约」呈现，注释里
      写明。回归：`purge_plans_report_what_that_range_actually_frees` 新增
      `all ≥ histories + clipboard` 断言、真实 WASM 主线「`all` 的范围说明覆盖剪贴板与渲染缓存，
      且等于实际释放量」（`plan.bytes === freed.freed`，清空后 `available:false`）。
    - **紧接着又查出同一个不变式的第二面**：形状描边缓存没有公开字节读数（上游 `purge_cache` 只
      「清空并返回释放量」），所以 `all` 报的必然是低估值；而一批共用 tile 的状态会出现
      `available: true` 但 `bytes: 0`，界面顺着 0 说「（当前为空）」，用户以为点确认什么都不会发生，
      实际撤销栈被清空。现在内核下发 `approximate`（只有 `all` 为 `true`），界面按它说「正好」或「约」；
      `available && bytes === 0` 改说「不会腾出空间：这些状态与更早的状态共用像素」（视频缓存单独说明），
      而 `all` 报 0 时说「部分缓存没有公开大小，实际上仍可能腾出空间」。回归：
      `purge_plans_report_what_that_range_actually_frees` 断言三个范围的 `approximate`、真实 WASM 主线
      「形状描边缓存读不到字节，`all` 只会低报且必须自报近似」（造裁剪形状 + 渲染后清理，断言
      `freed > plan.bytes` 且 `purged` 含 `shape stroke cache`）、`panels.test.tsx`「可清理但释放 0 字节时
      不说「当前为空」，仍给「确认清理」」、`model.test.ts`「`all` 的范围说明标成近似，其余范围是精确值」。
    - `sources[].available` 原先恒为 `true`——那是恒定真值而不是信息。改为 `live`，精确标记唯一
      活文档，供历史画笔这类消费者区分「取样活文档」与「取样归档快照」。
  - 回归：`snapshots_hold_real_content_and_returning_to_one_is_an_undoable_step`、
    `snapshots_from_each_source_hold_the_content_that_source_describes`、
    `history_sources_mark_exactly_one_live_state_for_consumers`、
    `new_document_from_history_is_independent_of_the_source_document`、
    `purge_requires_an_explicit_confirmation_and_never_touches_the_pixels`、
    `purge_changes_the_history_source_epoch_so_stale_sources_are_visible`、
    `history_source_epoch_identifies_the_document_and_survives_edits_that_do_not_touch_the_states`、
    `panels.test.tsx` 十四条（列表/身份、先说明后确认、取消、失败原因、重命名回落、端口缺失不渲染、
    快照三种来源、自历史状态与名称、**自历史新建交付派生文件且当前文档未受影响**、
    **交付失败如实报错、不交付空文件**、视频缓存入口、**删除状态先说明后果再确认**、
    **空范围在确认前就说不可清理**、**清理成功有回执**）、
    `model.test.ts` 两条历史源解码、
    真实 WASM 主线 U74。
  - 另一处（复核「删除状态」时发现）：**删除历史状态被当成「删一行记录」**。上游
    `history.deleteState` 是**先退回该状态之前再清空其后所有状态**，内容会回退且不可重做；面板
    原先是一键按钮「删除当前状态」。现在改为「删除当前状态…」→ 说明后果 → 确认/取消，与清理
    同一个原则。
  - **本轮补齐「正确失效历史画笔源」的本域那一半（读取点校验）**。原先本域只把 `epoch` 显示出来，
    「失效」完全靠消费方自觉比对：消费方若拿着旧句柄按索引直接取样，清理后**同一个索引指向别的内容**，
    就会画出「看起来对、其实不对」的像素。现在新增 `Editor::history_sample`（wasm `sampleHistory`）
    作为**取样读取点**：
    - 必须带取源时的 `epoch`；与当前摘要不一致就拒绝，错误里写明「取源时为 X，当前为 Y」与
      「不会按旧索引返回新内容」。缺 `epoch` 直接拒绝——没有身份就无法判定失效，不能默认当前状态。
    - `state` 越界被拒绝，不会静默退化成「最后一个状态」。
    - 归档状态取的是**历史里那份文档**（`history.state(i)`），活状态才用当前文档，因此取样旧状态
      不会把现在的像素当成过去的像素；返回 RGBA8 预览（base64）+ 尺寸 + `live` + 源身份，
      `maxSide` 限制在 1..=2048（默认 256）。
    - 两种命运分开：不产生历史步骤的编辑（改变量）旧句柄**仍然有效**；新增步骤 / 删除状态 /
      回到快照 / 清理之后**失效**。
    - 回归：`sampling_a_history_source_refuses_a_stale_epoch_instead_of_reading_the_new_state`、
      `a_history_source_survives_edits_that_add_no_step_but_not_a_deleted_state`、真实 WASM 主线
      U74 第 7 段（活文档 `live:true`、`maxSide` 生效、RGBA8 长度自洽、改变量后仍有效、加一步后
      拒绝、清理后再拒绝、缺 `epoch` 拒绝）、`workspace.test.ts` 三条、
      `panels.test.tsx` 四条（取样/清理后失效/重新取源恢复；缺端口只停用取样；**取样像素画出预览且
      长度不符时报错**；**检查源可用不产生预览、过期句柄被拒**）、`model.test.ts` 两条。
    - **本轮补了「落笔前只需问源还能用吗」的廉价入口**：取样是唯一校验路径却要合成并 base64 一整张
      缩略图，历史画笔每笔都问就会每笔分配一次 RGBA 缓冲。现在 `history.sample` 支持
      `preview: false`，走**同一套** `epoch`/索引校验，只回身份、标签、源尺寸与 `live`，不含
      `pixels`；TS 侧独立为 `checkHistorySource` + `decodeHistorySourceCheck`，两种答案不能互相冒充
      （校验解码器拒绝带 `pixels` 的取样答案，取样解码器也拒绝不含像素的校验答案）。回归：
      `a_source_check_validates_the_handle_without_compositing_pixels`（过期句柄/越界索引/缺
      `epoch` 三条拒绝 + 不出像素）、真实 WASM 主线 U74 第 7b 段（含清理后同样拒绝）、
      `workspace.test.ts`「检查源可用只送 preview:false…」、
      `model.test.ts`「只校验句柄的答案不带像素，两种解码器不能互相冒充」。
    - 面板：历史面板新增「取样状态」下拉 + 「取样历史源」+「检查源可用」。取样结果**画到 canvas**
      （原先只显示「128×128」，返回的像素被直接丢掉，用户看不出取到的是归档那一刻还是当前画面），
      绘制前核对 `width × height × 4`，不符就报「取样像素长度不符」而不是画半张图。
      **清理后刻意保留**取源时的 `epoch`，
      所以再取样会如实报「源已失效」；要换源必须显式点「重新取源」——否则一次清理后下一次取样会
      悄悄改绑到新状态，用户以为还在看原来那份归档。
    - 浏览器补跑又发现一处：**确认清理成功后没有任何回执**（成功路径不写提示、只有失败有红字），
      用户在视频缓存这类清理后列表不变的范围上无法区分「清掉了」和「点了没反应」。现在成功写
      `data-history-notice`（「已清理「范围名」」），与失败槽分开；`panels.test.tsx`
      「清理必须先取范围说明…」补了断言。
  - 本域与消费方的边界：`paint.historyBrush` 的来源选择、取样与绘画仍属 sibling
    `2026-10-22-add-photocraft-retouch-workflows`（任务 2.2 / U38），本 change 不登记该命令。本域
    现在提供的是**可执行的失效证据**（读取点拒绝，而非只发一个数字），消费方接线后即可直接复用；
    跨域界面联合验收仍记在 5.2，等那一边接上。
  - **自历史新建的落点已改为不改动当前文档**：内核 `history.newDocument` 会把活动文档切到新文档，
    而宿主标签仍指向源文档，直接留着会让下一次保存把派生内容写回源节点。域会话现在取走派生工程的
    字节后**总是** `closeDocument()` 回到源文档，面板交付 `.pcraft` 并说明「当前文档未受影响」；
    真实 WASM 主线断言源文档 hash 与修订不变。要让派生文档作为**活动标签**留在工作区，需要
    `document.activate`（当前 capability 禁用）与「未命名文档的保存目标」两条产品语义，属外部产品
    决策，未在本 change 自行决定（见 verification「剩余阻塞」B4 余项）。

- [x] 2.2 U75：提供动作录制/停止/播放、步骤/条件编辑、动作集/快捷键和受限 ATN 导入导出，逐步骤能力预检。 成功证据：录制只含成功规范命令，播放逐步结果与手动一致，未知 ATN 步骤有报告而非静默跳过。
  - 已完成：18 条 `actions.*` 进命令门；`actions_state()` 一次给出清单/录制状态/选中动作的步骤
    与**逐步骤预检**（每个步骤是否仍在命令门内、运行时可识别，`blocked` 列表阻止整组播放）；
    录制走上游 `journal` 语义只收成功提交的规范命令；播放先预检再一步一个既有命令事务，失败停在
    明确步骤并保留已成功结果。ATN 走**字节入口**（`data` 为 base64，`path` 一律拒绝），未知步骤
    默认整组回滚并给出逐个事件明细，显式 `acceptUnsupported` 才保留（播放在该步失败，不静默跳过），
    导出只返回字节并拒绝空/非法 base64。
  - 本轮补齐的域内缺口：面板原先只有「切换」一个步骤按钮，条件/对话框/插入/动作集虽在域会话里
    却没有入口。现在步骤行有「启用/停用」「加/取消对话框」「删除」「上移/下移」（首尾直接禁用，
    不发必被拒绝的越界请求），并逐条标注「播放时跳过」「显示对话框」；新增「插入步骤」（命令 +
    参数 JSON，非法 JSON 在本地拒绝而不是当 `{}` 提交）、「测试条件」（条件下拉 + then 分支）、
    「归入动作集」、「按钮颜色」下拉、「重命名」、以及「从第几步播放」（空=从头，传 `undefined`
    而不是 0）；快捷键以只读清单显示（改绑属共享快捷键宿主，不在本域）。
  - 本轮补齐的**真实缺陷**（复核上游 `journal`/返回语义时发现，均有回归）：
    - `actions.play` 在**中途某步失败**时仍返回成功（失败放在 `{failed:{step,id,error}}`、已跑完的
      步骤保留，这是上游刻意的事务语义），域会话原先只看 `result.ok`，面板会显示「播放成功」。
      现在读到 `failed` 后先 `afterWrite()` 刷新视图、再如实报错（「播放停在第 N 步 `id`：原因
      （已完成的步骤已保留）」）。
    - `actions.conditional` 的 `journal` 是 `true`——它会**播放命中的分支**，因此会写文档内容。面板
      原先走 `actionCommand`（不过草稿门禁、不刷新视图），用户看到的是旧文档；`holds`/`played`
      也被丢掉。现在有独立的 `testCondition`：过 `blockingDraft()`、写后 `afterWrite()`，并把
      `holds`/`played` 显示成提示行。
  - 回归：`recording_keeps_only_committed_replayable_commands_and_playback_matches_manual_work`、
    `playback_refuses_steps_that_left_the_command_gate`、
    `step_editing_covers_insert_dialog_toggle_conditional_and_action_sets`、
    `unsupported_atn_steps_are_reported_and_rolled_back_unless_accepted`、
    `atn_round_trip_preserves_the_recorded_steps`、`action_sets_and_shortcuts_are_visible_to_the_panel`、
    `panels.test.tsx` 十条（ATN 默认拒绝并显示报告、接受时逐条列出、预检阻止播放、导出不伪造成功、
    停止/对话框逐条标出并可启停、插入步骤与非法 JSON、动作集与条件/快捷键、上下移动边界、
    重命名与按钮颜色、从指定步骤播放的 `from`、**条件不再走 `actionCommand` 且显示命中分支**）、
    `workspace.test.ts` 三条（**播放中途失败仍刷新但如实上报**、**条件走写入路径**、
    **活动草稿阻止条件测试**）、`model.test.ts`「动作详情解码按钮颜色」、
    真实 WASM 主线 U75（含**中途失败报告**：`ran:1`、`failed.id:"layer.select"`、`failed.step:1`）。

- [x] 2.3 U76：提供前台 Batch/Image Processor/Contact Sheet/Load Stack、受限声明式脚本、文本/像素/显隐变量与数据集导入替换导出；原生 Droplet/任意脚本事件暂缓。 成功证据：有界队列逐文件报告，数据集替换可重复，取消后不启动下一项，不调用原生路径/进程。
  - 已完成：批处理/图像处理器/联系表/载入堆栈共用一个**有界可取消队列**（64 文件、
    单文件与总输入受共享 limits、交付总字节上限、2048 步防御上限），每项一次 `step`、逐文件报告，
    取消在当前项之后生效、剩余项不再启动，队列在收尾或面板卸载前保留以便逐项「领取」交付字节
    （收尾会连同未领取的字节一起丢掉，因此有未领取项时先说明并确认，不把「收尾」做成静默一键）；
    失败项保留逐条报告，不伪造成功。变量/数据集覆盖文本、像素替换与显隐三类，CSV 导入对未定义列
    逐列报告原因，像素变量应用缺字节即整次拒绝（不保留旧像素）、重复应用同一组幂等且只记一步历史，
    导出为 CSV 文本与图片字节、文件名冲突在编码前拒绝；导出格式（PNG/JPEG/TIFF）与命名模板交给
    内核编码，交付 MIME 跟随所选格式。受限脚本只接受「已开放命令的声明式列表」
    （`[id, params]`、`{command, params}` 或每行一条），执行前整组预检，明确拒绝 ExtendScript /
    `app.activeDocument`。
  - **不调用原生路径/进程**：要求文件夹/路径的上游命令（`file.automate.batch`、
    `file.scripts.imageProcessor`、`file.scripts.browse`、`file.scripts.loadFilesIntoStack`、
    `file.automate.contactSheetII`、`file.import.variableDataSets`、`file.export.dataSetsAsFiles`）
    **故意不登记**，全部改由本域字节入口实现；`createDroplet`/`runDroplet`/`scriptEventsManager`/
    `automation.mcp` 逐个断言仍在允许清单之外且 `execute` 被拒。
  - 回归：`data_set_csv_round_trips_and_reports_unknown_columns`、
    `variables_define_replaces_the_whole_list_so_panels_must_resend_every_def`、
    `applying_a_data_set_replaces_pixels_from_host_bytes_in_one_history_step`、
    `data_sets_export_as_bytes_with_collision_checks`、`batch_queue_reports_each_file_and_stops_after_cancel`、
    `batch_rejects_over_budget_and_unknown_steps_before_anything_runs`、
    `contact_sheet_and_load_stack_deliver_one_composite_from_many_inputs`、
    `declarative_scripts_preflight_every_step_before_running_any`、`variables_state_is_read_only_and_reports_definitions`；
    前端 `panels.test.tsx` 六十六条（数据集八条含 **CSV 超预算在读文件前拒绝**、**删除重发其余原始取值**、
    **拿不到取值时禁用删除**、**当前生效标记与删除说明**、变量定义七条含 **未知种类拒绝重发整份定义**、
    批处理十一条含 **收尾丢弃未领取字节前先确认**、**步骤/命名模板透传**、**非法步骤 JSON 本地拒绝**、
    **联系表列行与容量先拦**、**堆栈模式说明步骤套用在合成结果上**、脚本四条、动作面板十五条含 **ATN 警告与快捷键重读**）+
    `model.test.ts`（含**预算解码**与**未知种类解码成 `null`**）；另加 Rust
    `variables_must_bind_to_a_layer_of_a_compatible_kind`、
    `variables_and_data_sets_stay_within_their_declared_budget`；
    真实 WASM 主线 U76 两段（含**绑错被拒且先前变量仍在**、**预算随视图下发**、**原样重发幂等且只给条数
    会被静默清空**、**删前面的数据集后 `active` 跟着走、删生效项则清空**、**默认联系表网格拒 31 张、
    8×6 收下**）。
  - 本轮补齐的域内缺口：面板原先只**列出**变量，没有定义入口，因此「绑定文本/像素/显隐变量」在实际
    界面上走不通（用户无法创建变量，CSV 导入也必然报「请先绑定图层」）。现在有变量定义器：
    名称 / 图层下拉（取自工作区视图）/ 种类（显隐·文字替换·像素替换）/ 像素变量的方式·对齐·裁切，
    以及逐条「删除变量」。关键点是**内核 `image.variables.define` 是整份替换**，所以面板每次都提交
    「现有定义 + 本次改动」的完整列表——只发新增那一条会把先前的变量静默丢掉。修复过程中还发现
    解码器原本丢掉了像素变量的 `method`/`align`/`clip`（真实内核把它们展平在 def 上，已用 WASM 实测
    确认），重发时会静默重置成 `fit`/`center`/无裁切，现已一并在解码与重发两侧补齐。这三条语义由
    Rust、`model.test.ts`、`panels.test.tsx` 与真实 WASM 四处共同固定。另修一处会写坏工程的缺陷：
    解码器原先**把不认识的种类猜成 `visibility`**，而 `define` 是整份替换——删掉另一个变量就会把
    那个变量静默改写。现在未知种类解码成 `null` 并保留原始字符串，面板如实显示并停用整份重发。
  - 本轮补齐数据集与批处理面板的四处缺口（详见 `verification.md` 第 25–29 条）：
    - **数据集只能导入不能删**：`image.variables.dataSets` 是整份替换、没有单项删除命令，而解码器只留了
      「有几个值」，重发时还原不出 `{variable, kind, value}`；`setDataSets` 端口因此成了死代码。现在
      解码保留内核原始取值 `entries`，每行给出「删除」并整份重发其余条目；拿不到原始取值时按钮禁用
      并说明（实测「只给条数」不会被内核拒绝，而是被当成空取值**静默清空**，所以这里必须在界面挡住）。
    - **删掉数据集后「当前生效」错位**：上游只存下标，整份替换后下标不变、含义变了（`[A,B,C]` 生效 B，
      删 A 后仍是 1 → 指 C；删生效项后停在越界值，还会随工程持久化）。现在 `data_sets_set` 按**名称**
      重定位 `active`，生效项被删则清空；界面标出「当前生效」，删掉生效项时说明画布仍保留它最后
      应用的像素。追加语义不动它。
    - **批处理发不出 `steps`/`naming`、联系表改不了网格**：原先面板只发模式/格式/边长，于是「批处理」
      只会打开文件再导出，做不了把一串动作套到一批文件；联系表永远 5×6=30 格，超过 30 张就得到一句
      面板里无从自救的拒绝。现在补出处理步骤（JSON 数组本地解析，写错给可读原因）、命名模板、
      联系表列/行（显示总格数，装不下先在本地拦下），并说明联系表/堆栈模式不套用步骤。
  - **ATN 解析警告与快捷键刷新（本轮修复）**：`actions.load` 一直返回 `warnings`（例如「N 个尾部字节
    被忽略」——文件能导入但可能不完整），域会话原先把它丢掉，面板只会说「已导入」。现在逐条列出并给
    「已导入，但解析时有 N 条警告」的回执；同一处还补上导入后重读快捷键——`.atn` 会把 F 键绑定写进
    偏好，只刷新动作列表会让「快捷键」一栏继续显示导入前的旧绑定。
  - **成功回执不再套错误样式（走查当场发现）**：CSV 导入、导出 CSV、导出数据集为文件的正向回执原先都写进
    `data-data-sets-error`，用户看到红色一行会以为失败。现在正向回执走 `data-data-sets-notice`，
    失败才进错误槽，且失败时清掉上一次的成功提示。
  - 本轮又补齐两处（复核上游 `define`/`dataSets` 只做存在性检查时发现）：
    - **变量绑错图层会静默失效**：上游 `image.variables.define` 只检查图层存在，把文字替换变量绑到
      像素层能「定义成功」，但内核应用数据集时按图层内容跳过——用户建了一个永不生效的变量。现在
      定义前核对种类与图层内容（显隐可绑任意层、文字替换须文字层、像素替换须像素/智能对象），
      错误信息指出变量名、种类与图层类型；被拒绝时不写入一半。
    - **持久化内容缺「解析前」预算**：数据集会随工程持久化，原先只有导出侧有字节上限，
      `csv::parse` 之前不判大小、`append` 也无界累加。现在有 `MAX_CSV_BYTES`（8 MiB，**解析前**按
      文本字节判定）、`MAX_DATA_SETS`（1024，按设置/导入后的**总量**）、`MAX_VALUES_PER_SET`（512）、
      `MAX_VARIABLES`（256），并由 `variables_state().budget` 下发；面板在 `file.text()` **之前**
      按 `file.size` 拒绝，避免先读进内存再失败。
  - **自历史新建的落点（本轮修复）**：内核 `history.newDocument` 会切到新文档，而宿主标签仍指向
    源文档——若把派生文档留在会话里，下一次保存会把派生内容**写回源节点**。域会话现在用
    `saveProject()` 取走派生字节后**总是** `closeDocument()` 回到源文档（hash/修订不变，真实 WASM
    主线断言），面板交付 `.pcraft` 并提示「当前文档未受影响」；交付失败也如实说，不宣称已保存。
    派生文档作为活动标签留在工作区需要 `document.activate` 与未命名文档保存目标，属产品决策
    （见 verification「剩余阻塞」B4 余项）。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  - 已覆盖：清理不确认即拒绝；超预算/未知队列步骤/未知模式/空输入在 `begin` 就拒绝（不留半批）；
    取消后不再启动下一项；缺像素字节或解码失败整次拒绝且 `contentHash` 不变；重复应用幂等；
    未知/未开放脚本步骤在执行前整组拒绝且图层数不变；脚本中途失败保留已成功步骤并如实返回失败；
    ATN 未知步骤默认整组回滚（未接受时图层/内容不变）；插入步骤的参数 JSON 非法时不提交；
    重复变量名与不存在的图层由内核拒绝且不会只写一半；只读查询（历史视图、清理范围、变量状态、
    队列状态、快捷键）不产生写操作、不推进修订（`workspace.test.ts` 的
    「只读查询不产生写操作」「活动草稿阻止一切内容写入，但不阻止只读查询」）。
  - **本轮新增覆盖**：变量种类与图层内容不相容时在定义前拒绝且不写入一半；CSV/数据集/变量超预算
    时在解析前拒绝（`append` 按设置后的总量判定）；`actions.play` 中途失败与 `actions.conditional`
    分支失败都先刷新视图再如实报错，不把「跑了一半」当成功；条件测试本身是内容写入，受
    `blockingDraft()` 门禁。
  - 「非法最后输入不提交旧预览」在本域没有对应路径：本域没有预览草稿，所有参数都在**执行前**
    校验（清理范围、队列规划、脚本预检、像素字节），因此不存在「用最后一条非法输入确认上一份
    预览」。内容写入统一走 `blockingDraft()` 门禁 + 一次内核编辑 + `afterWrite()`。

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  - **内容身份（本轮补齐，B2 已解决）**：历史状态、命名快照、动作/动作集/快捷键、批处理队列都
    **不是**持久字段（会话数据），偏好/视图/工具设置不进内容身份；唯一持久的新内容是
    `doc.variables`（变量 + 数据集），现已进入共享内容身份：
    - Rust：`document_content::project_content` 增 `variables_content`（只取参与语义的字段），
      `identity::canonicalize_variables` 生成 `variables:[…][…]` 规范行；空变量**省略该行**，
      因此老工程指纹逐字节不变（`projectContentHash = 42d710c4700e1a13` 未变）。
    - 协议：`packages/protocol/src/features/shared/content.ts` 的 `ImageProjectVariablesContent` /
      `canonicalizeVariables` 与 Rust 逐字节一致，由**同一段字面规范文本**在
      `identity/tests.rs::variables_and_data_sets_enter_the_canonical_text` 与
      `image-project.test.ts` 两侧钉住。
    - 语义选择：定义与数据集**顺序敏感**（`define` 是整份替换，重排就是内容变化）；`active`
      指针不算内容（配置而非内容），因此不进身份。
  - **文档级核验（本轮补齐）**：`project-verify` 的 `INSPECTORS` 是逐图层
    `fn(&Layer, …)`，表达不了文档级的 `doc.variables`。新增 `DOCUMENT_INSPECTORS`（与
    `smart_source` 的 `scope.inspect_document` 同一形状），由 `lib.rs` 在整份文档上调用；
    `features/history` 的实现检查变量数量/空名/重名、悬空图层引用、种类与图层内容值相容。
    回归 `verify.rs::variables_are_checked_at_document_level_not_per_layer`。
  - **旧工程兼容 + 保存重开**：`variables_survive_save_and_reopen_and_do_not_change_the_identity_of_old_projects`
    证明 (a) 老工程（无变量）保存后照常打开、指纹与改动前相同；(b) 有变量的工程保存重开后
    定义/数据集一致、指纹稳定，重开后应用数据集仍可用（像素值仍来自宿主字节，不读磁盘路径）。
  - **跨文档 / PSD 矩阵**：`variables_keep_identity_across_documents_and_psd_export` 证明
    「只有变量顺序不同 → 身份不同」、「自历史新建的派生文档把变量重新绑定到新图层并通过核验」、
    「PSD 导出是另一条产物，不改源文档身份」。
  - **解码前累计预算**：见 2.3——CSV 在 `csv::parse` 之前按字节、数据集按设置后的总量、变量按
    条数判定，预算随 `variables_state().budget` 下发给面板做读文件前的拒绝。

- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  - 运行时协商：本域 32 个 glue 端口在 `wasm-instance.ts` 声明为**必需**字段，`wasm-handle.ts`
    统一走 `FeatureHandleContext.call`（缺端口时返回可读失败，不伪造成功）；域会话对外是 34 个方法
    （「只校验源」复用 `sampleHistory` 的 `preview:false`，不新增内核导出，因此端口数仍是 32、`.d.ts`
    导出仍是 32）；面板逐个探测自己要用的
    方法（`historySession(controller, "historyState" | "actionsState" | "variablesState" | "beginBatch" | "runScript")`），
    精简宿主只停用受影响的面板，而不是调用时抛错（`panels.test.tsx`「端口缺失时不渲染面板」）。
  - 门禁：内容写入统一走既有 `blockingDraft()` / `afterWrite()` / `unavailable()`，因此保存、切标签、
    关闭与只读变化沿用共享工作区既有规则；批量队列运行在内核独立草稿会话里，**不**经 `afterWrite`，
    所以不会把临时批处理算进当前文档的脏标记。
  - **活动文档不误写（本轮修正）**：「自历史新建」原先把内核切走的活动文档留在会话里，而宿主标签
    仍指向源文档，下一次保存就会把派生内容写回源节点。现在域会话取走派生字节后**无条件**关闭内核
    派生文档，源文档的 hash/修订/保存目标不变（真实 WASM 主线断言）；这正是「晚到/越界结果不写入
    其他文档」的具体应用。
  - 来源失效：本域不发同步请求、不做跨文档异步计算（所有调用都是同步域会话），因此不存在「晚到
    结果写进后来的活动文档」路径；历史源身份以 `epoch` 暴露（**含文档身份**，因此不会跨文档命中；
    不含修订号，因此无步骤编辑不会误让有效源失效），清理/删除状态/切快照都会更新它，
    消费方（历史画笔）据此判定旧源失效——消费方接线见 B5，本项只对本域可负责的部分勾选。

- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  - **同一实现**：面板只依赖既有 `FeaturePanelContext` 字段与控制器 `features.history`，未新增
    共享上下文字段；`dev` 与 `integrations/woohaa` 走同一 `createFeatureHandles` 装配，不需要各自
    分支实现。
  - **菜单入口（B3 已解决）**：共享 `photo-editor-chrome.tsx` 的「窗口」下拉在显示开关之后、文档
    清单之前插入 `featureMenuSections("窗口")`（历史记录/动作/变量与数据集），「文件」下拉追加
    `featureMenuSections("文件")`（自动处理）；`photo-editor-chrome.test.tsx` 断言两条入口都会
    回调 `onOpenFeature`，且「窗口」里看不到文档清单被挤下去。「高级…」title 补上了本域四个面板名。
  - **宿主测试替身（B6 已解决）**：`integrations/woohaa/tests/editor-workspace.test.ts` 的假
    `EditorInstance` 补齐本域 32 个方法，`@woohaa3/photocraft-woohaa` 的 typecheck 与 275 个测试
    全部通过。替身的 `sampleHistory` 也照 `preview: false` 的形状回（不带 `pixels`），否则「只校验
    句柄」会在宿主侧被解码器判成结构非法——替身必须与内核对同一参数给同一种答案。
  - **错误恢复**：所有失败都落到面板的可读错误行（`data-history-error` / `data-actions-error` /
    `data-data-sets-error` / `data-automation-error` / `data-script-error`），成功另走
    `data-history-notice` 等提示槽，不吞错、不假装成功、不把失败写成成功。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  - 实际结果见 `verification.md`「自动检查」：`pnpm -C photocraft run check` 通过（protocol **71**、
    editor **388**、project-verifier 40）、`cargo test --workspace --offline` 全绿（editor-core lib
    **236**，含本域 **34**）、`run wasm` 通过（**17.47 MiB**，`.d.ts` 含全部 32 个导出且与
    `wasm-instance.ts` 逐名一致）、
    真实 WASM 主线 **6/6**、`run verifier` 通过、`features:check` **通过**（33 条命令 + 12 个能力
    仅新增，握手/内容指纹/PNG 字节不变）、Woohaa typecheck 与 test **275** 通过、frontend
    typecheck 通过、`boundary:check` 6、`extensions:check` 通过、`codemap:check`
    （47 manifests / 11 篇地图 / 1358 链接）通过、`openspec validate --strict` 通过。
  - 未采集项只有真实界面/设备走查（见 4.2）与 sibling change 的历史画笔联合验收（见 2.1 / 5.2）。

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：命名快照 → 自历史新建 → 录制两步动作 → ATN 往返/未知步骤报告 → 两个文件前台批处理 → 数据集替换；中途取消不继续交付。
  - **真实设备部分未执行**。当前环境是 Linux 容器：`ls /dev/dri | grep '^renderD'` 无输出（无真实
    GPU），`DISPLAY` / `WAYLAND_DISPLAY` 均为空（无显示会话），会话也没有连接桌面浏览器。按仓库
    规则不采渲染/像素/性能结论，也不用软件渲染替代。
  - **交互主线已在本地 Chromium（软件渲染，功能级）实跑**：`窗口`/`文件` 菜单入口、两份快照与
    删除快照、清理确认门（取消/确认）、自历史新建下载 `.pcraft` 且源文档 hash 不变、录制两步后
    播放可用、ATN 普通导出被拒 + 跳过导出并列出被省略步骤、变量/CSV 数据集、两文件批处理逐项
    `✓`+领取、12 文件批处理中途取消后剩余项未启动、脚本未知命令整组预检拒绝、1024×768 无横向
    溢出。结果记在 `verification.md`「真实 UI 与设备」。这**不替代**真实 GPU/Pad 的视觉与性能
    验收（截图与帧率未采集），因此本项保持未勾选。
  - 该走查当场发现并修掉三处真实缺陷（无文档动作的宿主里「文件」菜单整体不渲染、停止录制后不
    选中刚录的动作、含非等价步骤的动作无法导出 `.atn`），回归见 `verification.md` 第 12–14 条；
    后续补齐取样读取点时补跑同一主线，又发现「确认清理成功后没有任何回执」并修掉（第 20 条），
    同时验证了「取样 → 清理 → 再取样被拒 → 重新取源恢复」（第 16–19 条）。
  - **最后一轮又补跑一次功能走查（28 项全过、0 console 错误）**，覆盖本轮新增的数据集删除/生效标记、
    ATN 解析警告、批处理步骤与命名模板、联系表网格、1024×768 无横向溢出；当场发现「CSV 导入成功的
    回执被塞进错误槽」并修掉（第 29 条）。这些仍是软件渲染下的功能证据，**不**构成 4.2 的真实设备验收。

- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  - 已按 U74/U75/U76 记录命令、参数、事务与回归用例名（`verification.md` 矩阵）；工程重开证据：
    用真实 WASM 保存并重开，确认数据集仍在且指纹稳定（`doc.variables` 已进内容身份），另有 Rust
    回归 `variables_survive_save_and_reopen_and_do_not_change_the_identity_of_old_projects` 覆盖
    「老工程无变量照常打开且指纹不变」与「重开后应用数据集仍可用」；`active` 的**重定位结果也会随工程
    持久化**（真实 WASM 实测：`[A,B,C]` 生效 C=2，删 A 后读 `1` 指向 C，保存重开仍是 `1` 且 `B,C`——
    若仍沿用旧下标，重开后界面会把 C 标成别组）；真实界面/设备项标「待人工验证」并写明原因
    （该容器无 `renderD*` 且无显示会话）。

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  - `notes/capability-matrix.md` 补了 P7 的六行能力（历史快照/动作/变量与数据集/前台自动化）以及
    「哪些是会话数据、哪些进内容身份与文档级核验、哪些平台暂缓」的说明；
    `docs/code-map/photocraft.md` 补了本域在 Rust 与 TS 两侧的模块行；`pnpm codemap:check` 通过。
  - **能力已按一致性核对开放**：12 个 id 在 Rust `P7`（orders 73–84）与协议
    `feature.capabilities` 同序同值发布，同时满足命令门、真实 WASM 主线、React 入口、内容身份
    （`doc.variables`）与文档级核验四项前置；`features:check` 通过，差异只有本域新增项。
    没有用组数或阶段名宣称完成——矩阵逐行给出命令/入口/回归。
  - 兼容矩阵：本域不新增工程格式版本（变量本就在 `.pcraft` manifest 里），空变量省略规范行以
    保证旧工程指纹不变；PSD 导出路径未改，矩阵里写明「不携带变量」。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。 — **2026-10-23 已集成复核**：见 [18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
  - **没有复制替代实现**：Rust 经 `#[path]` 挂载进既有 `Editor`（`features/history/tools.rs` 挂到
    `editor/tools.rs`、`features/history/wasm.rs` 挂到 `src/wasm.rs`），TS 经既有
    `createFeatureHandles`/`FEATURE_PANELS` 装配，没有第二套文档/历史/命令表。
  - **但本项字面条件不成立，因此保持未勾选**：本轮按用户明确授权
    （「必要时可改共享文件，不要复制粘贴实现」）顺序修改了下列共享文件，每条只补本域需要的那一处：
    `photo-editor-chrome.tsx`/`photo-editor-chrome.test.tsx`（窗口/文件菜单）、
    `photo-editor-app.tsx`（高级 title）、`features/boundaries.test.ts`（聚合计数 12→16）、
    `packages/protocol/src/features/shared/content.ts`/`image-project.test.ts`（变量规范文本）、
    `rust/crates/editor-core/src/{document_content.rs,identity.rs,identity/tests.rs}`（内容身份）、
    `rust/crates/project-verify/src/{lib.rs,features/mod.rs}`/`tests/verify.rs`（文档级核验钩子）、
    `integrations/woohaa/tests/editor-workspace.test.ts`（宿主替身）、
    `tests/fixtures/contract.json` 与两个 `notes/feature-boundary*baseline.json`（发布能力并重新
    采集基线）。逐条改动内容与对应任务见 `verification.md`「共享文件改动清单」。
  - 并行分支合入时仍需集成负责人复核：`boundaries.test.ts` 的 section 计数是**聚合**事实（每个分支
    都会改它），两个 `feature-boundary*` 快照也必须按最终合并结果再采集一次。

- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  - **未完成**：跨域联合验收需要 B5 的历史画笔消费方（sibling
    `2026-10-22-add-photocraft-retouch-workflows` 任务 2.2 / U38）接上，并在具备真实 GPU 的环境
    执行界面走查。当前只在域内、真实 WASM（无界面）与宿主替身上回归：`doc.variables` 的**身份与
    核验**已跨文档（含自历史新建的派生文档）与 PSD 导出矩阵验证，但不等于跨域 UI 联调。
    本域这一侧已把「失效」做成可执行的取样读取点（`history_sample`，过期 `epoch` 即拒绝），并在
    浏览器里验证「取样 → 清理 → 再取样被拒 → 重新取源恢复」；历史画笔只需复用同一入口，接线后
    即可做联合验收。
  - 另一侧的依赖（`file-workflows`、`raster-interchange`）属**软依赖**：批处理输入/输出全走字节，
    PSD/图像编解码走既有内核命令，联合验收同样只在真实环境执行。
