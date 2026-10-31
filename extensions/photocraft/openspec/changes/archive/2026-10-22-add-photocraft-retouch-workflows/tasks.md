# 修饰工具与仿制源任务

实施基线：结构前置 `b61da631`（`2026-10-22-refactor-photocraft-feature-boundaries`）已在当前
分支；产物基线 `bdc3c084`。本轮由本 change 完成域内实现**与共享外壳接线**（此前列为 B1–B4 的
阻塞已在本 worktree 内解除），未改 vendor，未提交。

勾选标准：只勾「代码 + 可执行检查都已完成」的项。需要**真实 GPU 硬件**才能采集的渲染/性能证据
保持未勾选，并在 `verification.md`「真实 UI 与设备」写明真实原因。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  - 已确认 `b61da631` 是当前 HEAD 的祖先。本域改动落在 parallel-work 列出的四个归属目录与本 change 目录；共享单写文件的改动**只做接线**（转发既有域内端口、传 `regionGestureKind`/`onRegionGesture`、渲染域内叠加层），未复制规则、未改旧集中入口，`packages/editor/src/editor-tool-panels.tsx` 仍为 facade。

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  - `notes/feature-boundary-wasm-baseline.json` 由 `b61da631` 采集；本轮在补齐能力聚合后已重新采集基线（196 条命令 / 79 个能力）。`features:check` 现与基线**逐项一致**（命令、能力、错误、8 组状态/内容指纹、撤销/重做/取消、PNG 字节）。原 change 未验收项未被改写或勾选。

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  - 矩阵见 `verification.md`「逐项能力矩阵」。**没有**用菜单占位：每条命令都在 Rust 侧有入口与回归，UI 参数面板逐项对应，手势已接到共享画布并在真实浏览器（Chromium + 真实 WASM）逐项走查。

- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  - 域内不 import `integrations/woohaa` 或 `server/`；新增命令只走既有 `Session`/`Editor`，未新增预算或版本号。

## 2. 逐项贯通

- [x] 2.1 U37：接入 Patch、Content-Aware Move、Remove、Red Eye 的工具、区域/拖动/笔迹手势与专用参数。 成功证据：实际像素结果可预览，确认统一一步；红眼不变普通画笔，取消不留下半次修补。
  - 区域命令走 `RetouchOpDraft`（隔离会话算候选、`baseRevision` 过期拒绝、确认一次提交、无变化不新增历史）；`paint.remove` 走笔迹草稿（一步历史、半笔取消无残留）。`validate_region_params` 校验选区/偏移/模式/结构/颜色适应/红眼点集；前端 `regionParams`、`validateRegionGesture` 同源复核并拒绝零偏移。
  - **手势已接通**：工具清单统一到 `tool-parameters.ts` 的 `RETOUCH_MENU_TOOLS`（10 条笔迹 + 3 条区域 = 13 项）作为上下文栏下拉的**单一来源**，区域命令因此真实可选；共享画布新增 `regionGestureKind`/`onRegionGesture` 通用属性，`photo-editor-app.tsx` 的 `retouchGesture()` 决定 `stroke` / `region-drag` / `region-click`，拖动与红眼单击都不再落成普通笔迹。
  - 回归：Rust `region_candidate_*`、`cancelled_region_candidate_*`、`stale_region_candidate_*`、`region_commands_reject_missing_selection_and_out_of_range_parameters`、`red_eye_never_degrades_into_a_plain_brush_submit`、`remove_stroke_*`、`region_candidate_targets_the_active_layer_even_without_an_explicit_layer`；前端 `region-gesture.test.ts`、`panels.test.tsx`、`canvas-wiring.test.tsx`（区域手势不吃成笔迹、红眼是单击）；真实 WASM `tests/features/retouch/wasm-workflow.test.mjs`。
  - 真实浏览器走查（1440×1000 与 1024×768 各一遍）：画布框选后拖动 → 候选预览 → 确认 → **一次撤销回到原样**；内容识别移动同样；红眼逐处单击显示「已标记 2 处」且确认前不改文档，确认后一步历史。
  - **取消路径已验证**：落笔中途按 Escape 不留半笔、不新增历史；红眼候选点「取消」后文档不变、无半次修补、不新增历史，且已标记位置仍在（spec 的「保留可恢复输入」），可再算一次并确认成功。

- [x] 2.2 U38：接入图案图章的来源/对齐和历史画笔的稳定历史源选择、取样与绘画。 成功证据：图案按源坐标对齐，历史画笔恢复所选源内容，不移动当前历史游标或静默普通画笔替代。
  - `paint.patternStamp` 在 `validate_session_params` 解析图案（空 key 用图案面板当前图案，显式未知 key 拒绝而不换图案）；`paint.historyBrush` 由 `resolve_history_source` 取状态快照，重放会话植入同一源，`history_sources` 逐状态标注 `available`，不可用源在开始一笔时就拒绝并说明「所选历史状态里没有这个图层」。
  - 三项新增笔迹工具已进入上下文栏下拉（`RETOUCH_MENU_TOOLS`），不再只能从高级面板选到。
  - 回归：Rust `pattern_stamp_requires_a_pattern_and_rejects_out_of_range_transform`、`history_brush_restores_the_selected_source_without_moving_the_cursor`、`history_sources_query_is_read_only`、`history_sources_lists_every_retained_state`、`history_brush_restores_the_chosen_state_and_refuses_a_cleared_source`；真实 WASM 覆盖图案空 key/未知图案/缩放 0、历史画笔恢复源且不移动游标、不可用源拒绝、非法历史源索引（-1 / 1.5 / "2"）拒绝。
  - 真实浏览器走查：图案图章落笔改像素 + 一步历史 + 撤销复原；历史源下拉列出 `Open` / `Rectangular Marquee` / 当前状态并禁用不可用项，选择早期状态落笔恢复该内容且不移动游标。
  - 另：命名快照扩展依赖 history change 集成后再接（scope 已声明），当前只消费现有有效历史快照。

- [x] 2.3 U39：按工具提供减淡/加深范围/曝光、海绵增减饱和、涂抹强度等，增加多仿制源的缩放/旋转/翻转和叠加预览。 成功证据：海绵实际发送 saturate/desaturate 且不崩编辑器，仿制变换可见并冻结于一笔。
  - `normalize_stroke_params` 是唯一入口，把通用笔迹的 `mode:"normal"` 换成海绵的 `desaturate`/`saturate`，并映射 `toneRange→range`、`patternId→pattern` 等别名；`validate_tool_params` 逐命令校验取值。`RetouchBaseline` 冻结 `presets`（含仿制源槽位），重放预览与提交使用同一取样来源与变换。前端 `retouchOptionParams` 是「工具选项 → 内核参数」唯一表。
  - **叠加预览已接通**：共享画布 `renderOverlay` 里渲染域内 `CloneSourceOverlay`，几何/不透明度/可见性全部来自 `workspace.cloneOverlayFrame` + `clone-overlay.ts`（与落笔同一份映射）。画布 Alt+单击取样会同时写进域会话的当前仿制源槽位，面板与叠加框因此显示同一个源。
  - 回归：Rust `sponge_sends_saturate_or_desaturate_instead_of_a_blend_mode`、`dodge_burn_and_smudge_reject_parameters_outside_the_kernel_range`、`tool_parameters_are_normalized_instead_of_breaking_the_editor`、`clone_source_slots_drive_the_stroke_and_stay_out_of_content`、`clone_source_commands_are_gated_by_the_single_command_gate`、`clone_source_query_stays_readable_while_stroking`；前端 `workspace.test.ts`、`clone-overlay.test.ts`、`canvas-wiring.test.tsx`（叠加层不吞指针事件）。
  - **多仿制源真的按活动槽位取样**（第二轮真实走查修复）：原先共享画布把 app 本地的旧取样点显式塞进笔迹 `source`，上游 `clone_source::resolve` 就不再读活动槽位——面板显示 2 号槽位的源、落笔仍在用 1 号槽位的旧点。现在该决策收敛到域内 `cloneStrokeSource()`：槽位有源时不传 `source`/`anchor`，交给内核按该槽位（含锚点与变换）取样；槽位无源才回退本地 Alt+取样点，都没有时提示先取样。回归 `clone-overlay.test.ts`「落笔取样源以活动槽位为准」+ 真实 WASM「多仿制源：落笔按活动槽位取样，换槽位必须换源」。
  - 真实浏览器走查：海绵增/减饱和、减淡高光、模糊、锐化、涂抹、加深、图案图章、污点修复（覆盖真实瑕疵）各自「改动像素 + 一步历史 + 撤销复原」；仿制图章 Alt+取样后面板显示 `源 (x, y)`、叠加框静止可见、落笔中自动隐藏、落笔改像素；切到 2 号槽位重新取样后同一笔得到不同像素。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  - 已覆盖：非法参数在开始前拒绝（不产生草稿）；区域候选预览不改 `state()`/内容指纹；晚到候选（修订已变）拒绝且不改内容；取消后无残留；历史源查询不推进修订；`cloneSource.*` 不改指纹。
  - 「非法最后输入不提交旧预览」在滤镜草稿侧已有等价回归（`filter_draft_previews_commits_one_step_and_rejects_bad_params`）；修饰域的做法是**开始前**校验，因此不存在「旧预览被最后一条非法输入确认」的路径。

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  - 本 change **不新增持久字段**：区域命令与修饰笔迹只改写既有像素层；图案资源沿用 layers 域唯一表示；历史栈不进工程；工具选项与仿制源槽位是会话状态（回归证明不改指纹）。
  - 因此无需新增内容身份分支/预算/PSD 矩阵项；`project-verify/src/features/retouch/mod.rs` 明确返回 `None`（不认领内容），避免放行未知对象。
  - 目标层归属已补全：不带 `layer` 的笔迹与区域命令都解析为**活动层**（`prepare_stroke_target` / `RetouchOpDraft::begin`），不是文档最上层；区域候选把解析后的目标冻结进信封，确认按同一份提交。回归 `missing_layer_defaults_to_the_active_layer_not_the_topmost_one`、`region_candidate_targets_the_active_layer_even_without_an_explicit_layer` 与 WASM 主线的活动层断言。

- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  - 域会话持有 `FeatureOwner`（documentId + attemptId），文档切换后晚到追加/确认一律丢弃；内核侧另有 `baseRevision`/`documentId` 复核。保存/关闭门禁沿用 `WorkspaceFeatureContext.hasActiveDraft()` 与 `cancelRetouch()`。
  - 运行时协商：新 glue 端口在 `wasm-instance.ts` 声明为可选，缺失时 `wasm-handle.ts` 返回 `missing-port` 明确失败（不伪造成功、不退化为普通画笔）。
  - **来源失效不误写目标**：`beginStroke` 在开始前解析这一笔真正会用的取样源（参数 `source` 优先，否则取活动槽位，与内核 `resolve` 同序），落在当前文档外就拒绝并提示「可能来自已切换或已关闭的文档；请重新 Alt+单击取样」。上游对越界采样点是静默钳制（零像素变化仍记一步历史、界面无提示），因此必须在入口拦。回归 `workspace.test.ts`「取样点落在当前文档外时开始前拒绝」「切到更小的文档后槽位里的旧取样点会阻止落笔」+ 真实界面在 60×60 文档上验证拒绝且不新增历史。

- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  - 两个宿主读同一份 `feature` manifest 与同一组域会话；共享 `EditorHandle` 已转发 `beginRetouchRegion/commitRetouchRegion/cancelRetouchRegion/retouchHistorySources` 与仿制源只读端口，域内不需要各自实现一份。
  - 本轮补齐的公共端口与错误恢复：只读 glue 端口 `retouchCloneSourcesJson`（落笔期可读，旧宿主缺失时回落 `execute` 并显示真实原因）；仿制源命令失败在面板可见（原先静默 `reload()`）；未知叠加混合模式显式拒绝；红眼标记退回面板本地时不再误用只读域点集的 `beginRedEye`；修饰下拉切换工具时清除上一条提示。
  - **两条入口都可用**（第二轮真实走查修复）：上下文栏下拉（`RETOUCH_MENU_TOOLS`，13 项）之外，「滤镜 → 修饰工具…」面板原先没有工具选择器、只能停在默认的污点修复，「设置采样点」也只弹提示不布防。现在面板用 `RETOUCH_PANEL_TOOLS`（13 项 + 仿制图章/修复画笔）选择，经 `FeaturePanelContext.activateRetouchTool` 同时切换 `retouchTool` 与画布工具，取样经 `armRetouchSample` 真正布防；上下文栏入口不传 `onTool`，同屏只有一个当前工具。
  - `pnpm -C web --filter @woohaa3/photocraft-woohaa test`（34 文件 / 275）与 `typecheck`、`@woohaa3/frontend` typecheck 均通过，独立 dev 宿主在真实浏览器里按同一实现走查通过。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  - 实际结果见 `verification.md`「自动检查」：protocol 70、editor **334**（46 文件）、project-verifier 40、Rust workspace 全绿（editor-core lib 227 / 全仓 306 个 `ok` 用例）、真实 WASM 修饰工作流 **3** 个用例通过、`features:check` 与基线逐项一致、Woohaa adapter 275 + typecheck 通过、frontend typecheck 通过、boundary:check 6、codemap:check（1360 链接）通过、`openspec validate --strict` 通过。

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：海绵增/减饱和实际落笔 → 减淡高光范围 → 多仿制源旋转采样 → 修补移动 → 红眼 → 历史画笔；每笔可取消/撤销。
  - **功能走查已完成，硬件验收未做**。已在 Chromium 1243 + 真实 WASM 的 dev 宿主上以 1440×1000 与 1024×768 各跑一遍，**各 49 项断言全部通过**：主线每一步都有像素改动与一步历史，撤销回到原样；换仿制源槽位后同一笔结果不同；落笔中途 Escape 不留半笔；区域候选取消后文档不变、无半次修补、不新增历史且已标记位置仍在。截图见 `/data/tmp/main2-1440x1000.png`、`/data/tmp/main2-1024x768.png`。
  - 第二入口「滤镜 → 修饰工具…」另以独立脚本走查：能选到 15 项、取样真正写入槽位、落笔改像素，切修补/红眼时区域修饰组随之出现。
  - **未勾选原因**：任务要求在「探测后的真实环境」执行，而本条还包含真实 GPU 硬件上的帧率/长尾、GPU 计时与色彩/摄影级画质结论。本环境为 Linux 容器，`ls /dev/dri | grep renderD` 无输出（无真实 GPU）、无 `DISPLAY`（无显示会话），按仓库规则不采集渲染/性能证据，也不以软件渲染或估算值替代。上面的浏览器走查是**功能证据**，不能代替该硬件结论。
  - **仍待人工验证的部分**：真实 GPU 硬件上的帧率/长尾、GPU 计时与色彩/摄影级画质结论。本环境 `ls /dev/dri | grep renderD` 无输出、无 `DISPLAY`，按仓库规则不采渲染/性能证据，也不以软件渲染或估算值替代。

- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  - 已按 U37/U38/U39 记录命令、参数、回归用例与结果（`verification.md` 矩阵），并记录两轮真实界面走查发现并修复的 **13** 个真实缺陷（画笔单位换算、区域候选门禁、叠加层吞指针事件、多仿制源切槽位失效、第二入口够不到新能力、换小文档后旧取样点静默落笔、取消候选丢掉已标记位置等），每项都补了回归；仅真实 GPU 渲染/性能项标「待人工验证」并写真实原因。

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  - 能力已**聚合交付**：8 个 `retouch.*` id 进入 `packages/protocol/src/features/retouch/index.ts` 的 `feature.capabilities`（order 40–47）与 Rust `CONTRIBUTION.capabilities`，并同步 `tests/fixtures/contract.json`（79 个能力）、`notes/feature-boundary-wasm-baseline.json`（196 条命令 / 79 个能力）与 `notes/feature-boundary-baseline.json` 的 contract hash；`features:check` 逐项一致，`pending_capability_ids_match_the_delivered_contribution` 断言声明 == 交付。
  - 文档：`notes/capability-matrix.md` 的 P6 小节由「待聚合」改为已交付并列出 8 个 id 的实现位置与回归；`docs/code-map/photocraft.md` 扩写 `retouch.rs` 行并新增 `workspace.ts`/`panels.tsx`/`sections.tsx`、`region-gesture.ts`/`clone-overlay.ts` 两行；`pnpm codemap:check` 通过（47 manifests、11 篇地图、1360 本地链接、8 模块入口）。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  - 本 worktree 内无并行集成会话，共享接线由本 change 直接完成且只做转发：`photo-editor-app.tsx` 传入区域手势与叠加层、`photo-editor-canvas.tsx` 新增通用手势属性、`editor-wasm.ts` 转发既有域端口、`editor-workspace.ts` 的 `takeStrokeDamage` 接受修饰笔迹。没有复制域内规则，几何/参数/事务仍只有一份实现。

- [x] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  - 无同级 change 硬依赖（见 parallel-work「同级完成前置：无」）。跨域回归已执行：Woohaa adapter 275 测试 + typecheck、frontend typecheck、`features:check`（命令/能力/指纹/PNG 字节）、`boundary:check`、真实 WASM 工程往返 hash 相等，以及真实浏览器按 U37/U38/U39 主线的 UI + 像素 + 撤销走查。
