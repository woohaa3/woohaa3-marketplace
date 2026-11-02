# 选区与蒙版完整交互任务

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  - 证据：工作区包含 `b61da631 refactor(photocraft): establish parallel feature boundaries`；本域业务实现落在 `features/selections/` 与 `rust/crates/*/src/features/selections/`。共享文件仅有后续用户逐项授权的这几处改动（Q 键与 `\` 分派所需），清单与理由见 5.1。

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  - 证据：上游固定 `4e7a17cd5d5723313f459753663d0d155f047e19`；未修改 `vendor/photocraft`；原 change 的未验收记录保留。

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  - 证据：[capability-matrix.md](capability-matrix.md) 逐 U 列出命令、包装、导出、UI、内容/核验、实测证据与缺口。

- [x] 1.3 确认同级依赖 2026-10-22-add-photocraft-channel-workflows；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  - 证据：本域只消费既有冻结端口（`WorkspaceFeatureContext`、`FeaturePanelContext`），未新增共享控制器方法，未 import 宿主私有模块。

## 2. 逐项贯通

- [x] 2.1 U17：在选框组增加单行/单列工具，按源像素创建一行/一列并支持既有选择组合模式。 成功证据：缩放后单击形成准确的一源像素行/列，完成后边界持续显示。
  - 证据：`selectLine` 行 `[0,5,24,1]`、列 + `add`；画布外拒绝；边界随回执返回并由视图持续显示（Rust `u17_*` 3 项 + WASM 冒烟 3 项）。
  - **本轮补齐的"缩放后单击"**：spec 写的是「在选框组增加单行/单列**工具**」且「缩放后**单击**形成
    准确的一源像素行/列」，此前只交付了面板里手输行号的路径，画布单击无法建行。共享
    `features/boundaries.test.ts` 冻结了 `FEATURE_TOOLS` 的工具 id 清单，本域不能自行新增
    `singleRow`/`singleColumn`，因此把子工具表达为**一次性待命**（`features/selections/canvas-pick.ts`）：
    面板「单击画布放置单行/单列」布防 → 画布下一次单击落到具体像素行/列 → 自动解除。
    待命按控制器实例用 `WeakMap` 隔离（多标签宿主里 A 布防不影响 B）；**图外单击同样解除**，
    避免点飞一次后下一次无关单击莫名建行；换到画笔/文字等非选区工具也会解除。参数编译、图外拒绝
    与组合模式全在本域（`selectLineParams`），共享外壳只把点位交进来。
    真实 WASM 实测：单击 y=2 → `[0,2,60,1]`、`add` 并集 `[0,2,60,5]`、`replace` 回到 `[0,9,60,1]`，
    说明单击点/方向/组合模式三项都真的被内核采纳。回归：TS `canvas-pick.test.ts` 2 项
    （一次性消费、按控制器隔离）+ 宿主真实画布单击
    `U17 面板布防后画布单击直接落成一像素行/列，不走共享 dispatch` + WASM 冒烟同项。

- [x] 2.2 U18：提供多边形逐点套索与磁性边缘追踪，支持回退锚点、双击/闭合完成和取消，预览使用实际追踪结果。 成功证据：磁性轨迹依据源图边缘，多边形锚点可修正，最终内核边界与预览吻合。
  - 证据：磁性 `[1,6,22,11]`、多边形（`trace:false`）`[2,2,18,13]`、直线闭合 `[4,6,19,11]` 三者在同一场景下互不相同；「回退锚点」「闭合完成」是真实 UI 动作并有面板回归；确认后边界等于最后一次预览。
  - **本轮补齐的"画布多点/增减取样"**：spec 标题是「色彩范围的**画布取样**和高级选项」，要求
    「支持画布多点/增减取样」，此前取样点只能手输 X/Y，画布单击完全没接到取样队列。现在面板给出
    「单击画布加点 +」/「单击画布减点 −」（与 U17 共用 `canvas-pick.ts` 的一次性待命），
    单击点直接进队列并立即重算候选。
    真实 WASM 实测（两块不同色块）：红 `[2,10,20,20]`、蓝 `[35,10,20,35]`、
    两点 `+` 并集 `[2,10,53,20]`（确实覆盖两块，不退化成一侧）、
    `points:[红] + subtractPoints:[蓝]` 回到 `[2,10,20,20]`。
    回归：宿主 `U22 面板布防后画布单击真的加入取样队列并触发预览`（断言送进内核的正是
    `points`/`order` 形状）+ WASM 冒烟「U22 色彩范围取样点改变真实候选」扩充多点与减点。
    **顺带确认的上游语义**（不是缺陷，已写进 verification）：`replace` 模式会把结果与**已有选区**
    取交集（`scope_color_range`），所以"先提交红、再按 replace 取蓝"会被削成空；这是 Photoshop
    同义行为，面板的组合模式选择器就是出口，不额外改语义。
  - **本轮补齐的"预览使用实际追踪结果"**：内核一直算得出真实追踪段（`selectionDraftOutlineJson`），
    但域会话没转发、面板也没画，用户此前只看到一行"候选 x, y, w, h"数字。现在域会话新增只读
    `draftOutline`，磁性套索面板按 `[x0,y0,x1,y1]` 段画成 SVG 预览；取消/确认后立即清空，不留过期候选。
    实测：磁性 70 段、多边形（`trace:false`）42 段，段坐标全部落在候选包围盒内，预览期修订/历史不变。
    回归：TS「磁性套索把内核追踪出的真实轮廓画出来」、WASM 冒烟「U18 draft outline is the real traced candidate」。

- [x] 2.3 U19：提供命名保存/加载选区、覆盖确认及按色彩 Grow/Similar 的参数与真实预览，区别几何 Expand。 成功证据：命名选区重载覆盖一致，Grow/Similar 在受控色块上与几何扩展不同，命名数据可工程往返。
  - 证据：未确认覆盖被拒、覆盖后重载边界一致；Grow `[0,0,21,10]` vs Similar `[0,0,21,9]` vs 几何 Expand `[0,0,8,8]`；Rust 工程往返测试通过。
  - **本轮补齐的拒绝条件**：spec 要求拒绝"存储超限"，但上游 `select.saveSelection` 没有上限，
    实测可连续保存 300 个命名选区（每个都是整画布灰度平面）而无任何拒绝。现在新增通道前复用工程
    权威预算 `MAX_ENTRIES`（`photocraft_project_verify::limits`，与 `project-limits.json` 交叉核对）
    核对"层 + 通道 + 1"；覆盖同名通道不占新条目，因此满了仍能自救。
    实测（真实 WASM）：1×1 画布连续保存到 4095 个后拒绝，文案为"命名选区条目已满（层 1 + 通道 4095 ≥ 上限 4096）"，
    随后 `overwrite: true` 覆盖同名通道成功。回归：Rust `u19_named_selection_rejects_an_unbounded_storage_growth`、
    WASM 冒烟「U19 named selection storage cap」。

- [x] 2.4 U20：提供 Q/鼠标 Quick Mask 切换、覆盖色查看、临时黑白画笔编辑及退出转选区；取消恢复进入选区。 成功证据：快速蒙版笔迹只修改临时选择，退出后边界保留，不污染当前图层/像素蒙版。
  - 证据：绘画期间修订/历史/内容 hash 不变；退出恰好一步；取消后选区回到进入前的 `[1,1,4,4]`。
  - **鼠标路径已接通**：「进入快速蒙版 / 画入临时通道 / 退出并转为选区 / 取消（恢复进入前）」四个按钮
    全部走本域会话。
  - **本轮补齐的"覆盖色查看"**：此前面板把"覆盖色"写在一个实际控制**笔迹颜色**的输入框上，真正的叠色
    （内核临时通道的 `color`/`opacity`/`indicates`）从未暴露——用户看不到正在用哪个颜色、盖的是哪一侧。
    现在内核草稿在 `draft.overlay` 里报出候选文档临时通道的真值（实测 `#ff0000` / `0.5` / `maskedAreas`），
    面板显示"覆盖色 着色遮住的一侧，50%"并附同色块；退出后不残留。
    回归：Rust `u20_quick_mask_reports_the_overlay_colour_for_viewing`、TS「快速蒙版把内核真实的覆盖色…显示出来」、
    WASM 冒烟「U20 quick mask reports the real overlay colour for viewing」。
  - **本轮修正的笔迹语义**：面板此前把"覆盖色"输入框接到**笔迹颜色**（默认红），与 spec 的
    "临时黑白画笔"不符，而且红色会被内核按灰度阈值吸附，让人以为没生效。实测确认白笔加入选区
    （`[2,2,31,14]`）、黑笔遮出（`[2,2,6,6]`），现改为只有黑白两档的下拉并标为"笔迹"。
    回归：TS `快速蒙版只给黑白两档笔迹`、`缺省笔迹是白色`。
  - **Q 键已接通（本轮，原阻塞项已消除）**：`photo-editor-shortcuts.ts` 新增
    `{ kind: "quickMask" }` 动作，**刻意不是** `{kind:"command", id:"select.editInQuickMaskMode"}`——
    共享 `run()` 会直接执行上游命令、绕过本域草稿（实测会得到 `active:false` + `paintQuickMask` 报
    "没有活动的快速蒙版会话" + `saveProject` 却成功，即既画不了也退不出的死状态）。
    `photo-editor-app.tsx` 的 `toggleQuickMask()` 经 `controller.features.selections` 分派：
    草稿未开 → `beginQuickMask()`；已开 → `exitQuickMask(false)`（确认转选区）；其它种类草稿在场时
    提示先结算而不抢按键。
  - **同源保证（begin/画笔/确认/取消/门禁/undo 走同一草稿）**：
    - 画笔改道：草稿在场时画布 `onStrokeStart`/`onStrokeMove`/`onStroke` 改走本域
      `paintQuickMaskStroke`，参数编译与 `target: "quickMask"` 都留在域内；按已画点数去重，
      抬笔不会把整条笔迹重画一遍（半透明笔不会变深）；橡皮按"遮出"强制黑笔；
    - 按动画帧合并落笔：实测单次 `paintQuickMask` ≈ 5.3ms、全量重渲染 ≈ 15.3ms（1200×900、40 笔后），
      逐批提交必然掉帧；现合并到一帧、抬笔同步冲刷，最终掩码与逐批一致（实测差 ≤1px，冒烟里按 2px 容差断言）；
    - 判定按需读内核：从面板进入快速蒙版**不改变修订号**，任何"修订变了再同步"的缓存都会漏掉那条路径，
      导致画布画笔继续写图层像素；现改为按下/抬笔各读一次 `draftState()`；
    - 面板同步：`QuickMaskPanel` 不再只在挂载时读一次草稿，改为每次渲染按内核真值显示，
      Q 进入后立刻从"未进入"变为活跃（不再诱导用户再按一次 Q，而那一次恰好是确认退出）；
    - Esc = 取消：`exitQuickMask(true)` 恢复进入前选区，与面板"取消"同一出口；
    - 兜底改道：`run()` 遇到上游 id `select.editInQuickMaskMode` 一律转到本域（`isQuickMaskCommand()`），
      将来任何菜单/脚本入口都不会绕过草稿；
    - 保存/undo/其它写命令：由 `hasActiveDraft()`（含 `selectionModifyActive`）与内核统一门禁挡住，
      实测草稿期 `saveProject`、`undo`、`select.all`、`file.close` 全部拒绝，取消后立即恢复。
    回归：TS `Q 进快速蒙版走本域草稿动作，不是绕过草稿的上游命令`、
    `快速蒙版笔迹走同一草稿（Q 与画布共用）`（5 项）、
    `Q 快速蒙版与面板共用同一草稿（不是上游命令直通）`（3 项，真控制器）、
    `Q 键（外界）进入快速蒙版后，面板下一次渲染就跟随同一草稿`、
    `快速蒙版只能经本域草稿进入（命令 id 改道判定）`、
    宿主真实按键 `Q 键经本域快速蒙版草稿进入/退出，且不走共享 dispatch 直通` 与 `只读预览下 Q 不进入`（2 项）；
    WASM 冒烟「U20 Q 键路径走真实草稿：进入/绘画/保存门禁/确认/撤销同源」、
    「U20 上游命令直通会产生无草稿的死状态（界面必须改道本域会话）」与
    「U20 画布按帧合并落笔不丢点、不写正式文档」。

- [x] 2.5 U21：接入传统 Object/Subject/Sky/Focus Area 和 Remove Background 的采样区域、参数、候选遮罩/选区及输出，不标记为 AI 模型能力。 成功证据：本地传统分割产生可见可修改的实际 mask，确认按选择/蒙版输出并可撤销。
  - 已完成：Object / Subject / Sky / Focus Area / Remove Background 五项（真实候选、蒙版输出、不改像素、一步撤销）。
  - **外部依赖核查（本轮明确结论，不记为人工验收项）**：五种分割全部是上游**本地传统算法**——
    主体为 SLIC 超像素 + 显著性 + 两次 GrabCut、天空为经典天空分割、焦点为局部拉普拉斯、
    移除背景为主体分割 + 边缘 matting。均不依赖外部模型，也不等待产品决策；本 change 不宣称 AI 能力。
    AI 主体/发丝模型与上游未实现的 `detectFaces` 明确不在本 change 范围内。详见
    [verification.md](verification.md) 的「U21 外部依赖核查」。
  - 已知限制（如实记录，不冒充交付）：上游 `select.*` 没有取消入口，本域也不伪造进度条；
    大画布为同步长计算（实测 4000×3000 主体 658 ms、移除背景 925 ms），等待期间界面无进度反馈。
  - **本轮补齐的候选可见性**：传统分割此前只回报包围盒。现在面板把内核给出的真实候选段画出来（实测 4 段），
    取消后清空——"产生可见可修改的实际 mask"不再只是数字。回归：TS「传统分割把候选轮廓画出来」。
  - **本轮补齐的"确认按选择/蒙版输出"**：此前智能选择只能输出选区，`commitSelectionDraft` 会忽略
    `output` 参数，与 spec 明写的"确认按选择/蒙版输出"不符。现在 `output: "mask"` 会在确认时补一步
    选区→图层蒙版，两条命令带同一 `coalesce` 键合并成**一步**历史（实测 steps=1，一次撤销把蒙版与
    选区一起回滚）；未知输出目标明确拒绝；移除背景本身即蒙版输出，不重复要求。
    回归：Rust `u21_smart_select_can_commit_to_a_layer_mask`、TS `U21 输出目标只在要求蒙版时出现`、
    WASM 冒烟「U21 smart select commits to a layer mask in one step」。
  - **本轮补齐的"采样区域与参数"**（spec 明写"接入…的**采样区域、参数**"，此前只交付了一部分）：
    - 对象选择此前面板只给取样点，缺 `rect` 矩形采样区域。现在两者都在，且实测落在**不同**候选上
      （点 `[92,72,56,56]` vs 矩形 `[72,71,96,80]`）——相同就说明矩形参数被丢掉退化成点选。
    - 焦点区域此前完全没有 `range`/`noise` 控件，等于这两个参数拿不到。实测 `range 0.9 → [0,0,240,180]`
      vs `range 0.1 + noise 0.6 → [0,17,240,135]`，确实改变候选。
    - 采样层（"采样所有可见层"）此前对五种分割都是写死值。现在可切换；实测空活动层默认被拒
      （`the active layer is empty; set "sampleAllLayers": true`），勾选后能找到另一层上的对象。
      移除背景刻意不暴露该选项：上游该命令固定只看活动层。
    - 切换分割种类会收回无意义的采样方式（矩形只属于对象选择），避免切走后残留 `rect`
      导致"点了预览却按旧矩形分割"。
    - 参数在候选在场时仍可编辑，"更新预览"会先丢弃旧候选再重算（上游 `select.*` 无 update 变体，
      不先丢会被统一草稿门禁以"请先确认或取消选区修改"拒绝）。实测确认这条门禁行为。
    回归：TS `U21 采样区域与各类参数真的送到内核（不是只摆控件）`、`U21 切到非对象种类后不再携带矩形采样区域`；
    WASM 冒烟「U21 采样区域与参数真的改变候选（点/矩形/焦点 range/noise/采样层）」。
  - **Subject 子项已接通（原阻塞项 1 已消除）**：本域此前已备好 `compile_smart_select("subject")`、
    `begin_smart_select("subject")`、`beginSmartSelect` WASM 导出与面板选项，缺的只是能力表登记。
    本轮把 `StagedId { stage: "P5", order: 22, id: "select.subject" }` 加进 `features/selections/mod.rs`，
    并把三处"断言它关闭"的守卫测试翻转为"已开放"——它们记的是前置阶段尚未交付的状态，不是产品决策：
    `capability.rs`（`assert!(command_allowed("select.subject"))`）、`tests/editor.rs` 命令表 `allowed`
    与 dispatch 层（改为继续断言未交付的 `edit.preferences.general` 仍被拒）。
    真实 WASM 实测：`allowedCommandIdsJson()` 含 `select.subject`；预览 `[3,11,54,18]` 期间修订/hash/历史
    三者不变；确认后 `hasSelection: true`、边界等于预览、恰好 1 步历史；一次撤销回到无选区。
    回归：Rust `u21_subject_produces_a_real_candidate_and_commits_in_one_step`、WASM 冒烟
    「U21 主体选择：传统分割端到端可用（非 AI 模型）」。面板无需改动——入口跟随运行时命令表，
    门一开自动出现"主体"（"传统分割只列出运行时真正允许的种类"用例同时覆盖了关闭与开放两侧）。
- [x] 2.6 U22：色彩范围支持画布多点/增减取样、局部颜色群组/范围、色调区间和采样层选项，已有单色/反相功能保留。 成功证据：改变取样点和群组范围立即改变真实候选选区，确认与最后预览一致。
  - 证据：增加/减去取样改变候选 `[2,8,20,9] → [0,0,24,18]`；确认边界等于最后预览；局部群组可达；既有单色/反相面板保留；`detectFaces` 仍拒绝。
  - **本轮补齐的"色调区间"**：spec 明确要求色调区间，参数层本已支持 `tonalRange`，但三个面板都没有
    暴露它，等于用户拿不到该选项。现在高光/阴影给单电平、中间调给上下限，切换预设时回到该预设默认值
    （高光 190 / 阴影 65 / 中间调 105–150），且只在三个色调预设下渲染。
    实测（透明背景三块亮度）：高光 230 → `[0,11,20,18]`、高光 120 → `[0,11,40,18]`、
    阴影 40 → `[38,11,22,18]`；非法电平 300 与反向区间 `[200,100]` 均被拒绝。
    回归：TS `色彩范围的色调区间只在高光/中间调/阴影出现`、WASM 冒烟「U22 tonal range levels really change the candidate」。
  - **本轮补齐的候选可见性**：色彩范围此前同样只显示包围盒数字。现在改一个取样点就能看到轮廓形状跟着变
    （实测 22 段真实候选段），取消后立即清空。
  - **本轮补齐的"画布多点/增减取样"**：见 2.1 之后的说明——相同缺口（spec 标题写"画布取样"，实际只能
    手输 X/Y）。现在与 U17 共用 `canvas-pick.ts` 一次性待命，画布单击直接进队列并重算候选。
    实测两块色块：两点 `+` 并集 `[2,10,53,20]` 覆盖两块、`points+subtractPoints` 回到 `[2,10,20,20]`。
    回归：宿主 `U22 面板布防后画布单击真的加入取样队列并触发预览` + WASM 冒烟扩充。

- [x] 2.7 U23：选择并遮住提供真实像素边缘预览、前景/背景修边笔、smartRadius/采样层、净化颜色及选择/蒙版/新层/新文档等输出。 成功证据：修边画笔真实改变候选边缘，所有开放输出各有正确像素和结构，取消恢复基线。
  - 证据：真实边缘预览 + 修边笔迹并入；`newLayer` / `newLayerWithMask` / `layerMask` 实测成功；参数非法、输出未知、无选区均拒绝；取消恢复基线。
  - **本轮补齐的候选可见性**：修边结果此前只回报包围盒。现在「选择并遮住工作区」把真实候选段画出来
    （实测 14 段），改半径/修边笔迹后形状随之更新，取消后清空——"真实像素边缘预览"不再只是数字。
  - **本轮补齐的"净化颜色"真实后果**：净化颜色此前只有控件、从未实测。真实 WASM 确认上游
    `refine_edge` 在 `decontaminate: true` 时会把 `selection` / `layerMask` **静默升级**为
    `newLayerWithMask`（去色要新像素）——实测选"选区"+净化后层数 2→3 且 `hasSelection` 变假，
    不勾净化时同一请求层数不变、选区保留。面板此前直接照抄用户所选，用户会以为"输出设置没生效"。
    现在面板显示真实结论（「净化颜色需要新像素：确认后实际按『新图层（含蒙版）』输出，而不是『选区』」），
    但**不偷偷改下拉框、也不在前端伪造升级**——转发给内核的仍是用户所选 + `decontaminate/amount`，
    升级由内核完成。回归：TS `净化颜色会把选区/像素蒙版输出升级成新图层（含蒙版），面板据此如实提示`、
    面板 `U23 勾选净化颜色时如实提示输出被升级，并把 decontaminate/amount 送进内核`、
    WASM 冒烟「U23 净化颜色把选区输出升级为新图层（含蒙版），面板提示与内核一致」。

- [x] 2.8 U24：提供像素蒙版 density、非破坏 feather 及独立/覆盖显示模式，密度羽化属于内容而查看属于会话。 成功证据：调整密度/羽化不改原蒙版采样值，重开仍可改参数；单独查看不新增内容历史。
  - 证据：`pixelsPreserved: true`；重开工程后仍可改参数（Rust `u24_*` 往返）；gray→overlay→off 期间内容 hash 与历史不变；
    `layer.toggleMaskOverlay`（`\`）两次切换 overlay→off，同样不改内容 hash 与历史。
  - **本轮补齐的 `\` 真按键**：面板按钮一直写着「切换叠加（\）」，但快捷键解析器里**没有反斜杠**——
    按钮可用、按 `\` 毫无反应，文案与实现脱节。现在 `resolveEditorShortcut` 认 `code: "Backslash"`
    或 `key: "\\"`（布局差异），产出 `{kind:"maskOverlay"}`，应用侧经共享 `run()`
    下达 `layer.toggleMaskOverlay`（查看状态是会话级、无内容历史，所以过 `run()` 安全）。
    Shift+`\`（即 `|`）与系统修饰键不抢。回归：解析 `反斜杠走蒙版叠加切换，且 Shift/修饰键不抢`、
    宿主真实按键 `反斜杠键真的切换蒙版叠加查看，与面板按钮同一条命令`（断言 `dispatch` 收到
    `["layer.toggleMaskOverlay", null]`，Shift 组合不触发）。另补真实 WASM 冒烟
    「U24 `\` 走的 layer.toggleMaskOverlay 真的按当前侧取反，且不写内容」：`view` 基线 `null` →
    第一次 `"overlay"` → 第二次 `null`，期间 hash 与历史不变。此前只测过 `viewLayerMask`，
    切换命令本身**从未在真实内核上跑过**。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  - 证据：Rust `tests_workflows.rs` 28 项逐 U 覆盖拒绝/取消/一步历史；面板回归覆盖"非法最后输入禁用确认"；WASM 冒烟逐项断言预览期修订/历史/hash 不变。
  - **本轮补齐的两项拒绝条件**：(1) U19 spec 要求拒绝"存储超限"，但上游 `select.saveSelection`
    无上限（实测连续保存 300 个命名选区零拒绝），现在新增通道前复用工程权威预算 `MAX_ENTRIES` 核对，
    实测在 4095 个通道处拒绝且覆盖同名仍可用；(2) U24 spec 要求"目标已删除"说明具体原因，
    面板此前把读取失败渲染成"当前图层没有像素蒙版"的空状态，现在区分 `readFailure` 并显示内核原因。
  - **本轮补齐的两条已有但未锁定的边界**：U18 "追踪超预算"由上游 `MAX_LENGTH = 200000 px` 拒绝，
    已加回归防止被宽松参数掩盖；U24 "目标已删除"在内核由 `layer.layerMask.edit` 直接报
    "目标图层已不存在"。

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  - 证据：本域新增持久字段仅有像素蒙版 density/feather（既有 `LayerMask` 字段，非新字段），已由
    `project-verify` 新增属性/表面格式检查；查看模式不入内容 hash（实测 hash 不变）；未改全局预算与 fixtures。

- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  - 已完成并实测（域内）：`wasm-handle.ts` 逐导出检查并返回 `capability-unavailable`（匹配运行时协商）；
    域会话复用 `blockingDraft()`/`hasActiveDraft()`；`RefineEdgeWorkspace` 用请求序号丢弃晚到候选。
  - **本轮补齐的域内缺口**：草稿归属此前只在 `draftState()` 里带 `document`/`revision`，面板只比对
    `kind` 就认领，切文档后仍可把 A 的候选确认进 B。现在内核 `selection_draft_state()` 增加
    `stale`，`commit_selection_draft`/`commit_selection_modify` 提交前比对活动 `DocState::doc.id`，
    不一致直接拒绝并丢弃现场；`draftBelongsTo` 视 `stale` 为不可认领，六个认领草稿的面板（磁性套索、按颜色扩大、快速蒙版、传统分割、色彩范围、选择并遮住）对
    `stale` 禁用确认/追踪/修边，只保留取消。
  - 回归：Rust `u18_draft_is_discarded_when_the_active_document_is_swapped`、TS「过期归属的草稿只读可取消」
    「内核标记为过期归属的草稿即使文档号相同也不被认领」。
  - **本轮补齐的内核证据（保存/关闭/换目标）**：真实 WASM 实测——有活动选区草稿时，
    其它写命令、`file.close`、`saveProject` 全部被统一门禁挡住（`请先确认或取消选区修改`）；
    `cancelSelectionDraft()` 之后 `saveProject()` 立刻成功。换活动文档的路径由 Rust
    `u18_draft_is_discarded_when_the_active_document_is_swapped` 覆盖，本轮把它**扩写为完整门禁回归**：
    过期归属被标记 → 确认被拒 → 现场丢弃 → 新文档仍可新建图层/建立自己的选区（`[1,1,4,4]`）→
    切回原文档确认它没有被写入任何选区。即"丢弃后不卡死、不误写"两侧都有断言。
  - **本轮接上的宿主切换/关闭门禁（原阻塞项 4 已消除）**：判定与文案留在本域
    （`SELECTION_DRAFT_SWITCH_REASON` + `unsettledDraftReason()`，只读内核 `selectionDraftState()`），
    宿主 `pendingDraftOf()` 只搬运结果，不复制草稿状态机。因此：
    - 有选区草稿时切标签被拒，提示"请先确认或取消选区草稿"；
    - 同一 `pendingDraft` 也进 `planCloseDocument()` / `planLeave()`，关闭与离开页面同样先要求结算；
    - 内核丢弃草稿后立刻放行——避免 `selectionModifyActive` 残留把用户永久挡住。
    回归：TS `workspace-switch-gate.test.ts` 域函数侧 4 项（有草稿拦、内核没了放行、过期归属仍拦、无文档/无会话/读失败不拦）、
    同文件真实接线侧 3 项（真控制器 + 真域会话 + 替身内核）、woohaa
    `document-session.test.ts` 新增 2 项（切标签门禁、脏状态回执带原因）、WASM 冒烟
    「U18 selection draft state is what the host switch gate reads」。
    另实测内核层：草稿期间 `file.new` / `file.openImage` / `file.openProject` 同样被统一门禁拒绝，
    所以"打开另一个文档"这条路径也不会绕过。真实标签栏点击与保存回执仍需人工走查（见 4.2）。

- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  - 证据：两个消费方都跑通，且都消费本域同一份实现（未复制第二套）：
    - `pnpm -C photocraft/dev test` → 1 文件 / 8 用例通过。
    - `pnpm -C photocraft/integrations/woohaa test` → 34 文件 / 282 用例通过（含
      `tests/selection-interaction.test.tsx`、`tests/editor-workspace.test.ts`、
      `tests/photo-editor-app.test.tsx` 的 Q 键真实按键回归）。
    - `pnpm -C packages/editor run typecheck`、`pnpm -C dev run typecheck`、
      `pnpm -C integrations/woohaa run typecheck` 全部通过。
  - 先前记录的 28/34 失败根因是**安装布局**而非代码：`integrations/woohaa/vitest.config.ts` 把 react
    别名硬编码到 `node_modules/.pnpm/react@18.3.1/...`，而本 checkout 用 pnpm 11 全局虚拟存储
    （`enable-global-virtual-store=true`）不生成该目录。未改仓库任何文件，补齐本地安装布局后仓库
    自带命令即通过；另用临时配置 `/data/tmp/opencode/woohaa.vitest.config.mjs` 独立复现（当时 275 通过），
    排除别名改写的偶然性。
  - 面板仍挂在既有三个分区，未改菜单/标签/面板布局外壳（`workflow-sections.test.tsx` 锁定）。

- [x] 3.5 补 spec「加载旧运行时拒绝相关写入」与蒙版内容身份的可执行证据。
  - 证据：`wasm-handle.ts` 每个 U17–U24 入口都先检查导出是否存在，但此前没有任何回归证明这条
    路径真的返回拒绝而不是抛 `TypeError`（对界面是"面板崩掉"与"给出可读原因"的区别）。
    新增 `wasm-handle.test.ts`：用只实现 P0 契约的旧运行时逐条调用 **22 个**入口，全部得到
    `{ ok: false, code: "capability-unavailable" }` 且文案含"请更新编辑内核"；同一批入口在
    新运行时上正常透传（`exitQuickMask(true)` 的参数确实到达导出），确保门禁不误伤已装能力。
  - 新增 `packages/protocol/src/features/selections/content.test.ts`：`canonicalizeMask` 决定
    蒙版**内容身份**（返回值拼进层身份串），此前无任何回归。实测确认 `linked` 缺省与
    `linked: true` 得到同一串（旧工程不带该字段，必须与新建工程同身份，否则"打开旧工程再保存"
    会凭空产生一次身份变化），只有 `linked: false` 追加 `:unlinked`；并验证蒙版真的进入
    `canonicalizeImageProjectContent` 的指纹——`enabled`/`origin`/`contentHash` 各自都能改变身份，
    非法蒙版让整份内容非法而不是被忽略成"无蒙版"。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  - 证据：[verification.md](verification.md) 记录本轮实跑计数（editor 341、protocol 74、project-verifier 40、
    Rust 共 311：230/4/13/25/10/1/3/10/15、WASM 冒烟 35/35、dev 8、woohaa 282、`features:check` 通过）
    以及两个仍待人工/同级依赖项的真实原因与归属。

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：多边形/磁性套索 → 命名保存重载 → 快速蒙版修补 → 多点色彩范围 → 真实修边预览 → 新层/蒙版输出；保存、切标签和取消均检查。
  - 探明当前环境**无 GPU**（Linux 容器无 `renderD`）且**无显示会话**（`DISPLAY` 未设置），无法执行窗口主线与截图。待人工验证。

- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  - 证据：verification.md 的「逐 U 组记录」表逐 U 列出入口、预览/确认/取消、内容与历史、工程往返、核验器与结论；
    真实设备项标注为待人工验证并写明无 GPU、无显示会话。

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  - 证据：新增 [capability-matrix.md](capability-matrix.md)；能力表 `mod.rs` 只登记已接通命令（`select.subject` 随后随 U21 开放）；
    `pnpm codemap:check` 通过（47 manifest、11 篇地图、1353 链接）。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  - 证据：业务实现仍在 `features/selections/` 与 `rust/crates/*/src/features/selections/`；未改
    `editor-workspace.ts`、`editor-wasm.ts`、`photo-editor-canvas.tsx`、`wasm.rs`、proto 全局文件或任何
    sibling 域；没有复制第二份草稿状态机或命令表。
  - **已获用户授权的共享改动**（本轮全部落地，逐一列出以免误认为越界）：
    1. `integrations/woohaa/src/document-session.ts` 的 `pendingDraftOf()`：只加一处**调用**，判定与文案
       仍在本域 `unsettledDraftReason()`；
    2. `photo-editor-shortcuts.ts`：`EditorShortcut` 增加 `{kind:"quickMask"}` 与 `q` 键解析（快捷键表
       本身是共享资产，无法在域内表达"Q 必须走域会话"）；**以及 `{kind:"maskOverlay"}` 与 `\` 解析**
       （U24 面板文案一直写着「切换叠加（\）」，但此前没有任何键位，属于文案与实现脱节）；
    3. `photo-editor-app.tsx`：Q 分派、画笔改道、Esc 取消、`run()` 兜底改道；`\` 分派到
       `layer.toggleMaskOverlay`（查看是会话级、无内容历史，故可经共享 `run()`）；**另加 U17 的
       `onSelectionClick` 前置一行**（把画布单击先交给本域 `takeCanvasPick`，未被认领才走原来的
       "点空白取消选择"；判定、参数编译与图外拒绝都在本域 `canvas-pick.ts`/`selectLineParams`）；
    4. 三处测试：`photo-editor-shortcuts.test.ts`、宿主 `photo-editor-app.test.tsx`、
       宿主 harness 增加可选 `selections` 注入；本域测试文件自行新增。
  - 上述共享改动都不新增命令 id、不新增分区 id、不改内核能力表语义；`features:check` 仍通过。

- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  - **未完成**：同级依赖 `2026-10-22-add-photocraft-channel-workflows` 的真实联动与跨域回归需两边均交付且
    具备真实宿主/显示环境，当前无法采集。保持未勾选。
