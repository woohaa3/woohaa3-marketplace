# 验收计划与记录

## 本次实施状态

实施基线：结构前置 `b61da631`（feature boundaries）已在分支；产物基线 `bdc3c084`。本 change 在
本域四个归属目录、`tests/features/retouch/`、change 目录与两份本域文档行内实施，并完成此前记为
B1–B4 的**共享外壳接线与能力聚合**；未改 vendor，未提交。

`openspec validate 2026-10-22-add-photocraft-retouch-workflows --strict --no-interactive` 通过；
产品能力已随 `feature.capabilities` 聚合交付（8 个 `retouch.*`，order 40–47）；真实界面主线已在
Chromium + 真实 WASM 的 dev 宿主上按 1440×1000 与 1024×768 执行，各 49 项断言全通过。仅**真实 GPU
硬件上的渲染/性能/摄影级画质**留待人工验证（见「真实 UI 与设备」）。

## 逐项能力矩阵

「命令」都能在唯一命令门内执行（`clone_source_commands_are_gated_by_the_single_command_gate` 与
`allowed_command_ids` 断言）；「包装/WASM」列指 `Editor` 入口与 `wasm.rs` 导出；「UI」指本域面板
（`features/retouch/panels.tsx`，两个入口：上下文栏「修饰」下拉 `RETOUCH_MENU_TOOLS` 与
「滤镜 → 修饰工具…」面板的 `RETOUCH_PANEL_TOOLS`）；
「手势」列指共享画布接线（`regionGestureKind` / `onRegionGesture` / `renderOverlay`）。

| U | 子能力 | 命令 | 包装 / WASM | UI 参数入口 | 手势 | 事务 | 回归 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U37 | 修补 | `paint.patch` | `begin/commit/cancel_retouch_region` + `beginRetouchRegion`… | 区域修饰组：模式/偏移/结构/颜色适应/取样层 | 画布框选后拖动 | 候选预览→一次确认；过期候选拒绝；取消丢弃 | `region_candidate_*`、`stale_region_candidate_*`、`panels.test.tsx`、`canvas-wiring.test.tsx`、WASM 工作流 |
| U37 | 内容识别移动 | `paint.contentAwareMove` | 同上 | 区域修饰组：模式/偏移/结构/颜色适应/缩放 X-Y/旋转 | 同上（偏移须让选区留在画布内） | 同上 | `cancelled_region_candidate_*`、`region_commands_*`、WASM 工作流 |
| U37 | 移除 | `paint.remove` | `begin/append/commit/cancel_retouch` | 修饰下拉：闭合环绕/新图层/取样层 | 笔迹（闭合环圈住目标） | 笔迹草稿一步历史；半笔取消无残留 | `remove_stroke_commits_at_most_one_step_and_cancels_cleanly`、`remove_stroke_without_a_document_*`、WASM 工作流 |
| U37 | 红眼 | `paint.redEye` | 区域入口 | 区域修饰组：逐处标记/瞳孔大小/变暗量 | 画布单击逐处标记（64 处上限） | 区域候选；拒绝时不降级普通画笔 | `red_eye_never_degrades_into_a_plain_brush_submit`、`region-gesture.test.ts`、WASM 工作流 |
| U38 | 图案图章 | `paint.patternStamp` | 笔迹入口（基线+重放） | 图案来源/缩放/角度/对齐源坐标/印象派 | 笔迹 | 一步历史；未知图案拒绝 | `pattern_stamp_requires_a_pattern_and_rejects_out_of_range_transform`、WASM 工作流 |
| U38 | 历史画笔 | `paint.historyBrush` | 笔迹入口 + `retouch_history_sources` | 历史源下拉（禁用不含该图层的状态）+ 刷新 | 笔迹 | 一步历史；不动游标；不可用源开始前拒绝 | `history_brush_restores_the_selected_source_without_moving_the_cursor`、`history_sources_query_is_read_only`、WASM 工作流 |
| U39 | 减淡/加深 | `paint.dodge`/`paint.burn` | 笔迹入口 | 范围（阴影/中间调/高光）/曝光/保护色调 | 笔迹 | 一步历史 | `dodge_burn_and_smudge_reject_parameters_outside_the_kernel_range`、`tool_parameters_are_normalized_*`、WASM 工作流 |
| U39 | 海绵 | `paint.sponge` | 笔迹入口 | 加色/去色 + 自然饱和度 | 笔迹 | 一步历史；`mode` 归一化 | `sponge_sends_saturate_or_desaturate_instead_of_a_blend_mode`、WASM 工作流（含原始 `execute` 拒绝） |
| U39 | 涂抹/模糊/锐化/污点修复 | `paint.smudge`/`blur`/`sharpen`/`spotHealing` | 笔迹入口 | 强度 + 手指绘画/保护细节 + 取样层 | 笔迹 | 一步历史 | 同上 + `tool_parameters_are_normalized_*` |
| U39 | 多仿制源 | `cloneSource.list/select/set/resetTransform/overlay` | `EditorHandle.execute` + 只读 `retouchCloneSourcesJson` | 五槽位/宽高/约束比例/旋转/翻转/重置/叠加 | Alt+单击取样写入当前槽位；叠加框跟随、落笔自动隐藏 | 不改内容指纹、不新增历史；开始一笔冻结 | `clone_source_slots_drive_the_stroke_and_stay_out_of_content`、`clone_source_query_stays_readable_while_stroking`、`workspace.test.ts`、`clone-overlay.test.ts`、`canvas-wiring.test.tsx`、WASM 工作流 |

## 自动检查（实际执行结果）

在本 worktree 的 Linux 容器内运行（非 GPU 环境）：

| 检查 | 结果 |
| --- | --- |
| `pnpm -C photocraft run check`（build + typecheck + test） | 通过：protocol 70、editor **334**（46 文件）、project-verifier 40 |
| `cargo test --manifest-path rust/Cargo.toml --workspace --offline` | 通过：editor-core lib **227**、contract fixture 4、editor 13、interaction 25、verify 8/15、limits_agree、native_binary、smart_source 全绿；全仓 **306** 个通过用例 |
| `node --test tests/features/retouch/wasm-workflow.test.mjs` | 通过：3 个真实 WASM 用例（U37/U38/U39 主线 + 画笔单位换算 + 多仿制源换槽位换源） |
| `pnpm -C photocraft run features:check` | **通过，与基线逐项一致**：命令、能力、错误、8 组状态与内容指纹、撤销/重做/取消、导出摘要与 PNG 字节全部相同（196 条命令 / 79 个能力） |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过：34 文件 / **275** 测试 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `pnpm boundary:check` | 通过：6 测试（需先存在 `artifacts/`、`logs/` 两个被清单列出的内部目录，二者均已 gitignore） |
| `pnpm codemap:check` | 通过：47 manifests、11 篇地图、1360 本地链接、8 模块入口 |
| `openspec validate --strict` | 通过 |

本域新增回归（全部包含在上面的计数里）：

- Rust `retouch.rs` 内 12 个 + `tests_workflows.rs` **17** 个，含 `clone_source_query_stays_readable_while_stroking`、`pending_capability_ids_match_the_delivered_contribution`、历史画笔非法索引断言。
- 前端修饰域 **65** 个：`tool-parameters.test.ts`（8）、`workspace.test.ts`（17，含陈旧取样点在开始前拒绝、红眼位置保留到确认成功）、`panels.test.tsx`（13，含高级面板入口的工具清单、「上下文栏不重复渲染选择器」与「红眼候选进行中锁住位置编辑」）、`region-gesture.test.ts`（5）、`clone-overlay.test.ts`（11，含「活动槽位决定取样源」）、`boundary-regression.test.ts`（5，含 13 项下拉与面板 15 项清单）、`canvas-wiring.test.tsx`（6，含叠加层不吃指针事件）。
- 真实 WASM：`tests/features/retouch/wasm-workflow.test.mjs`（`node --test`），覆盖命令门成员、海绵落笔/原始 `execute` 拒绝、减淡越界拒绝、五槽位冻结变换与 `cloneSource.*` 旁路、修补/内容识别移动/红眼候选与取消、过期候选拒绝、图案图章空 key 与未知图案/缩放 0、移除半笔取消、历史画笔恢复源且不移动游标/不可用源拒绝/非法索引拒绝、落笔期间叠加取景可读而写命令仍被拒绝、缺省目标落在活动层、工程往返 hash 相等、**画笔单位换算**（0–1 小数必须换算成内核的百分比），以及**多仿制源按活动槽位取样**（换槽位必须换源、无源时不静默画一笔）。

### 第一轮修复的两个域内缺陷

1. **缺省目标层取错**（`retouch.rs`）：`prepare_retouch` 原先把「没有 `layer`」退化成 `document.layers.last()`（文档最上层），而内核笔迹/区域命令的语义是**活动层**。现在 `prepare_retouch` 不再猜目标；`prepare_stroke_target`（笔迹）与 `RetouchOpDraft::begin`（区域）在拿得到会话的地方补上 `active_layer`，没有活动层时明确拒绝。
2. **区域候选未固定/未校验目标**（`retouch.rs` / `tools.rs`）：候选开始时就把解析后的目标写进 `params`，信封存**补齐后**的参数，确认时按同一份提交——预览与提交不会落到不同图层，不可写目标在开始前就被拒绝。

### 第二轮修复的两个域内缺陷

3. **非法历史源索引被静默改成状态 0**（`retouch.rs` / `normalize_stroke_params`）：`historyState` 原先 `unwrap_or(0)`，`state: -1`、`1.5`、`"2"` 因此变成「最旧状态」并报成功。现在非法值原样进入 `validate_tool_params`，以「历史源索引必须是非负整数」拒绝。
4. **落笔期间读不到仿制源取景**（`tools.rs` / `wasm.rs` / `workspace.ts`）：`cloneSource.list` 原先只走 `Editor::execute`，落笔后会被草稿门禁拒绝。新增只读入口 `Editor::retouch_clone_sources`（`WasmEditor.retouchCloneSourcesJson`），域会话优先走该端口，旧宿主缺端口时回落并显示真实原因；写命令在落笔期间仍被拒绝。

### 第三轮（真实界面走查）修复的四个缺陷

5. **区域命令在真实界面里选不到**（`photo-editor-app.tsx` / `tool-parameters.ts`）：区域命令原先只存在于面板内的偏移输入，上下文栏下拉仍用 `RETOUCH_TOOLS.slice(2)`，画布的区域分支因此是死代码。现在把工具清单收敛成 `RETOUCH_MENU_TOOLS`（10 笔迹 + 3 区域）作为下拉的**单一来源**，面板不再自带第二套区域选择器。
6. **画布拖动生成的候选无法确认**（`panels.tsx`）：确认按钮的禁用条件只看面板自己的 `active`，画布拖动不知道面板状态，按钮永久禁用。改为 `active = panelActive || session.retouchRegionActive()`。
7. **修饰笔迹实际以约 1% 不透明度作画**（`workspace.ts`）：共享 `buildStroke` 发 0–1 小数，而内核 `stroke_brush` 把 `hardness/opacity/flow` 当百分比（`/100`，opacity/flow 下限 1）。8 个工具因此在真实界面里像「点了没反应」。现在在域入口 `beginStroke` 用 `normalizeBrushUnits` 只把 `<= 1` 的值乘 100，显式 0–100 调用方不受影响；真实 WASM 用例锁定该换算。
8. **仿制源叠加框吞掉落笔与不刷新面板**（`overlay.tsx` / `photo-editor-app.tsx`）：叠加层 SVG 默认接收指针事件，盖在笔尖起点上导致仿制图章/修复画笔落笔静默失败；同时画布 Alt+取样只写 app 本地状态，域会话槽位没写，叠加框永不出现、面板永远显示「尚未设置采样点」。现在叠加层 `pointer-events: none`，画布取样同时写入当前仿制源槽位并让面板重读。

### 第四轮（第二轮真实界面走查）修复的五个缺陷

9. **切换仿制源槽位对落笔无效**（`photo-editor-app.tsx` / `clone-overlay.ts`）：共享画布把 app 本地保存的
   旧取样点显式塞进笔迹参数 `source`，而上游 `clone_source::resolve` 只有在参数**没有** `source` 时才读
   活动槽位。于是面板显示 2 号槽位的源、落笔仍在用 1 号槽位的旧点——U39 的多仿制源等于没生效，叠加框
   与实际取样也会不一致。现在把「这一笔用哪个源」收敛成域内 `cloneStrokeSource()`：槽位有源时不传
   `source`/`anchor`，交给内核按该槽位（含锚点与变换）取样；槽位没有源才回退到本地 Alt+取样点，两者都
   没有时明确提示先取样。真实 WASM 用例断言换槽位得到不同像素，界面走查断言两种窗口下同一笔结果不同。
10. **「滤镜 → 修饰工具…」面板够不到本域新增能力**（`sections.tsx` / `panels.tsx` / `panel-context.ts`）：
    这个第二入口既没有工具选择器（只能停在默认的污点修复），「设置采样点」也只弹一句提示而不布防，
    用户照做会落下一笔并被内核拒绝。现在面板用 `RETOUCH_PANEL_TOOLS`（13 项下拉 + 仿制图章/修复画笔）
    提供选择，选择结果经 `activateRetouchTool` 同时切换 `retouchTool` 与画布工具；取样经 `armRetouchSample`
    真正进入「下一次单击即取样」。上下文栏入口仍只用自己的 13 项下拉，同屏不会出现两个当前工具。
11. **顶部取样点提示与活动槽位不一致**（`panels.tsx`）：切槽位后顶部仍显示 app 本地的旧坐标。现在有仿制源
    端口时该提示改为指向下方以槽位为准的「仿制源」组，旧装配才回退显示本地坐标。

12. **换到更小文档后旧取样点仍会静默落笔**（`workspace.ts`）：取样点是文档坐标，槽位是会话级工具状态，
    因此切到大图取的样（如 400×400 的 (360,360)）在小图（60×60）里必然越界；上游对越界采样点是静默钳制——
    整笔零像素变化却仍新增一条历史，界面没有任何提示，用户会以为仿制生效了。设计 D2 要求「外部来源失效时
    落笔前提示重取样」，现在 `beginStroke` 在开始前解析**这一笔真正会用的源**（参数 `source` 优先，否则取
    活动槽位，与内核 `resolve` 同序），越界即拒绝并说明「可能来自已切换或已关闭的文档；请重新 Alt+单击取样」，
    不产生草稿也不新增历史。

13. **取消区域候选会把用户已标记的红眼位置一起清掉**（`workspace.ts` / `panels.tsx`）：候选开始时就清空本地
    标记（为了确认后不重复带入），于是「取消」之后位置全丢，用户得重新点一遍——与 spec 的「保留原文档及
    可恢复输入」相反。现在位置保留到**确认成功**才清（`redEyeInFlight` 标记），取消只丢弃候选；同时候选
    进行中锁住「加/清位置」与红眼参数，避免面板显示的点集与候选实际用的点集不一致。
    画布侧同样受控：候选进行中再单击画布会被拒绝（「候选进行中：请先确认或取消这一份红眼候选」），
    不再悄悄追加到面板看不到的地方。

另有两处非缺陷的观察，如实记录以免误判：

- **平滑区域上的污点修复/移除可以零像素变化**：内核按周围像素重建，内容一致时结果字节相同。真实走查改为覆盖实际瑕疵后即可见改动（`/data/tmp/focus2.mjs` 与最终脚本一致）。
- **无变化的修饰笔迹仍会新增一条历史**：这是上游 `Session::execute` 的既有语义（与 Photoshop 对「滤镜无可视效果仍记一步」一致），spec 只要求区域候选「无变化不新增历史」且已满足。本 change 不改内核历史语义。

## 真实 UI 与设备

**已执行部分**：Chromium 1243 + 真实 WASM（`packages/editor/dist/wasm`）的 dev 宿主，两档窗口
1440×1000（电脑）与 1024×768（Pad 正常窗口），各 **41 项断言全部通过**、无页面异常。确定性素材
`/data/tmp/retouch-main.png`（400×400，平滑渐变 + 中频棋盘 + 一处人造瑕疵）。

走查脚本 `/data/tmp/main2.mjs`，截图 `/data/tmp/main2-1440x1000.png`、`/data/tmp/main2-1024x768.png`。
覆盖并与 spec 主线逐条对应：

1. 海绵「去色」「加色」各落一笔 → 像素改动 + 一步历史 + 撤销复原。
2. 减淡选「高光」、曝光默认落笔 → 像素改动；模糊/锐化/涂抹/加深/图案图章/污点修复同样断言。
3. 仿制图章 Alt+单击取样 → 面板显示 `源 (x, y)`、叠加框静止可见、落笔中自动隐藏、落笔改像素、撤销复原；
   切到 2 号槽位重新取样后同一笔得到**不同像素**，证明活动槽位真正决定取样源。
4. 画布框选后拖动 → 修补候选预览可见 → 确认 → 一次撤销回到原样；内容识别移动同样。
5. 红眼逐处单击显示「已标记 2 处」且确认前不改文档 → 计算候选 → 确认 → 一步历史。
6. 历史源下拉列出 `Open`/`Rectangular Marquee`/当前状态并禁用不可用项 → 选早期状态落笔恢复该内容且不移动游标。
7. 修饰下拉含 3 条区域命令与 3 条新增笔迹命令（共 13 项）。
8. 第二入口「滤镜 → 修饰工具…」：工具选择器列出 15 项（13 + 仿制图章/修复画笔），选仿制图章后工具名变
   “仿制图章”、点「设置采样点」再单击画布确实写入槽位并显示 `源 (x, y)`，随后落笔改变像素；切到修补/红眼
   时对应的区域修饰组随之出现。
9. 来源失效：在 400×400 上取样后换成 60×60 文档再落笔 → 明确提示「取样点 (x, y) 不在当前文档内（60×60）…
   请重新 Alt+单击取样」，撤销按钮前后都保持禁用（没有多出一条空历史）。
10. 取消路径：落笔中途按 Escape → 像素与撤销栈都不变（不留半笔）；红眼算出候选后点「取消」→ 文档不变、
   不多一条历史、且「已标记 2 处」仍在，可再算一次并确认成功。

**未采集（待人工验证）**：真实 GPU 硬件上的帧率/长尾、GPU 计时与摄影级画质结论。原因：本环境为
Linux 容器，`ls /dev/dri | grep renderD` 无输出（无真实 GPU），且无 `DISPLAY`（无显示会话）。
按仓库规则不在此环境采渲染/性能证据，也**不**用软件渲染（SwiftShader/lavapipe）或估算值替代。
上面的浏览器走查是**功能证据**，不是 GPU/摄影级画质结论。

Photoshop 外部往返不需要（本 change 未改 PSD 兼容项）；数位笔硬件验证不在范围。

## 发布记录格式

每项记录：U 编号 / 子能力 / 实现位置 / 环境 / 操作与参数 / 预期及实际结果 / 通过或待验证 / 暂缓理由。
当前状态：域内自动回归与真实浏览器功能走查全部通过；能力已聚合交付；仅真实 GPU 渲染/性能项
**待人工验证**（容器无 GPU、无显示会话）。两轮真实界面走查共修复 13 处真实缺陷，均已补回归。不扩展云端 AI 移除、后台作业或混合器画笔；历史源不可用
时不静默退化普通画笔。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
