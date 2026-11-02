# 视图导航、参考线与分析辅助设计

## 基线与范围

固定上游 commit `4e7a17cd5d5723313f459753663d0d155f047e19`；已提交实现 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。范围逐项列于 [scope.md](scope.md)，每个 U 组的子能力都需拆成实现时的命令/参数/操作记录，不以一组一个按钮结案。

同级前置：无新增同级 change 的硬依赖。相邻模块只是消费端口的软依赖时，以现有内核能力完成基础流程，新增联动在两边均交付后验证。原 change 的未验收项仍按其证据处理；本计划仅追加缺口，不自动勾选或重写旧任务。

## 操作与布局

视图菜单、Hand/Zoom/Rotate View 工具，Navigator/Info 面板、标尺及参考线图内手势；窗口菜单管理工作区，命令搜索只列已接通动作。

复用固定上游 0.9.0 的生产算法，不修改 vendor。`rust/crates/editor-core` 持有规范内容、命令、预览草稿、身份与历史；`packages/protocol` 持有纯数据和限额契约；`packages/editor` 持有共享工具/面板。`dev` 与 `integrations/woohaa` 只装配公共端口，核心不得 import Woohaa 私有实现或内部工具。

界面沿用既有菜单 → 工具组 → 参数栏 → 原图/属性反馈的结构，菜单和参数栏在文档标签之上。所有状态均需有可见忙碌、失败与恢复反馈；面板仍使用现有浮动/停靠能力，不重新设计外壳。只验收电脑 1440×1000 和 Pad 正常窗口 1024×768；手机/极窄窗口和无障碍专项不在范围。

## 本域实现决策

### D1

源坐标/屏幕坐标统一经一个含缩放、平移和旋转的可逆矩阵转换。新增旋转后选区、文字、笔迹、变换、参考线、吸附及节点预览须全部使用此矩阵，不能只旋转图片 CSS。阈值按屏幕像素换算。

### D2

多视图共享同一 document session/history/save baseline，但 viewId/取景独立；仅活动视图接收输入和发布对应呈现。需逐视图资源端口兼容旧宿主单视图能力，未提供时解释缺失原因。不开第二个会相互覆盖内容的内核副本。

### D3

参考线/原点/网格/吸附与导航器属于会话/本机偏好，不改内容 hash。持久采样点、计数、注释等用户明确保存的数据使用有界文档扩展参与身份/核验；Info 瞬时读数和测量日志交付不冒充像素编辑。

## 事务和生命周期

内容操作遵守 begin → preview → commit/cancel：固定 documentId/generation、baseRevision、目标及 attemptId；预览不变正式内容 hash/修订/历史，确认最新有效候选一次，取消恢复，无变化不新增历史。非法参数不得确认上一份成功预览。一次笔迹/拖动按既有完成规则提交，不强制所有参数都变成弹窗。

保存、切文档、关闭、只读变化和父子回写复用活动草稿门禁。晚到任务按文档代际和请求序号丢弃，不能写入后来活动文档。只读采样和工具/查看偏好不制造文档 dirty。分组队列若有不同语义必须在具体设计中声明，不虚构跨文档原子事务。

## 内容、协议与核验

逐能力同步参数解码、唯一命令门、WASM、React、内容身份、工程序列化、TS 检查和原生核验器；实际接通后才发布能力，不把整个命令前缀放开。共享限制只在 `rust/project-limits.json` 与两端 fixture 中维护；不整体提升现有 8192 单边、64 图层、64 MiB 工程、16 嵌套深度和 8 文档上限。

新增规范内容缺省/空值保持旧工程身份兼容，工具本机设置/视图不进入内容 hash。涉及新持久字段时必须给出与旧运行时的能力协商、解码前累计预算和资源引用验证；未知内容不能通过通用 JSON/PSD 原始块绕过。PSD 与 LayerTransferBundle 的兼容项逐类型更新，无法表达时报告而非静默压平。

## 取舍与发布条件

优先复用上游算法和现有 UI/草稿，避免复制另一套内容状态。不能编译进 WASM、没有 codec/字体/硬件或缺公共端口的子能力单独记录停止原因，不能因此把整个域标为完成。

不重做已经交付的标签位置、面板浮动、鼠标滚轮语义；手机布局及无障碍专项不在范围。

## 验收主线

标尺拖线/单条删除 → 参考线布局/吸附 → 旋转视图绘画 → Navigator → 同文档双视图 → Info/注释；源坐标和活动视图输入归属正确。 具体成功/失败情景和逐项证据见 specs 与 verification；实际像素、结构、历史和工程往返都通过后才开放相应子能力。

## 并行边界

以 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际提交为启动门槛；完整目录、共享文件禁并改清单和完成依赖见 [parallel-work.md](parallel-work.md)。不能在当前集中式代码上直接开启 18 路实施。

## 实施偏差与实际决策

实施后核对，以下十三点与上面的计划不同，均已按单一写入规则处理并在 tasks/verification 记录：

1. **D1 的矩阵没有收编进 `features/coordinates.ts`。** 该文件是 `parallel-work.md` 列出的共享文件，且其
   `DOCUMENT_COORDINATES` 只覆盖无旋转的缩放/平移。本域因此在
   `packages/editor/src/features/views/view-transform.ts` 与
   `rust/crates/editor-core/src/features/views/view_geometry.rs` 各写一份**同公式**的可逆变换
   （绕文档中心、顺时针为正、`offset` 为文档左上角的客户坐标）。收编成唯一映射需要改
   `coordinates.ts` 与 `photo-editor-canvas.tsx`，属集成阻塞；在那之前两份实现必须同步修改，
   两侧都有回归防止漂移。

2. **旋转与多视图没有写进文档。** `ViewAids`（`grid_subdivisions` / `smart_guides` / `units` /
   `rotation_degrees` / `navigator` / `views`）是 `Editor` 的会话状态，不进 `.pcraft`、不进历史、
   不进内容 hash；D3 里「参考线/原点/网格/吸附与导航器属于会话或本机偏好」细化后只有
   **参考线与原点实际是文档字段**（走上游命令与历史，但内容 hash 不变），计数/测量/注释同样是
   文档字段。这个区分由 `viewSnapshot.scope` 对外声明，并被回归锁定。

3. **能力发布只开两条，`view.rotate-navigator` 保持关闭。** 逐项工作流接通后开放
   `view.guide-layout`（U71）与 `view.analysis`（U73），它们各自的命令都有真实入口与回归。
   `view.rotate-navigator` 不开放：**并排双视图**已在本轮交付（见 D22），但 `Rotate View` 只是
   视图空间变换——叠加层、参考线命中与标尺按同一公式反算且彼此一致，像素平面却由宿主按
   `origin/zoom` 呈现（`renderCanvasBackground(origin, zoom)` 无旋转参数，Woohaa 节点模式的
   Bevy 节点同理），画布落笔映射走冻结的共享 `coordinates.ts`（无旋转）。即「旋转后看到的
   像素」与「旋转后的叠加层/命中」不同步，把该能力算作已交付就是谎报。因此让能力保持关闭，并让
   `CONTRIBUTION` 注释、能力协商回归和真实 WASM 回归三处都断言它不在已开放清单里。
   **Info 读数属于像素这一侧，因此 probe 特意不算旋转**（见 D23）：把旋转套进读数会让面板报出
   「眼睛看到的像素之外」的另一处像素，那是假读数。
   这取代原先「发布整体推迟」的记录：推迟的理由（缺发布权限）已解除；现在的理由是**旋转的像素级
   呈现仍缺宿主渲染端口**，不是并排。

4. **新 wasm 端口全部可选。** 为兼容尚未重建的 `.wasm` 与精简宿主/测试替身，`guideLayoutCommand`、
   `viewCommand`、`viewSnapshotJson`、`samplerReadoutJson`、`formatLengthJson`、`viewPointerJson`
   在类型上是可选的，缺失时按「能力关闭」返回 `capability-disabled`，不抛
   `undefined is not a function`，也不伪造成功。界面据此在缺端口时隐藏对应页签/控件，而不是渲染
   只能看的假入口。

5. **指针几何做成只读内核端口，而不是在界面里写第二套坐标数学。** 标尺拖线、参考线命中/拖动、
   原点拖动都需要「客户坐标 → 源坐标」的反算；画布文件冻结，本域因此新增只读
   `Editor::view_pointer(action, params)`（wasm `viewPointerJson`），动作白名单
   `hit-guide`/`drag-guide`/`drag-origin`。它不写文档、不造历史、不过草稿门禁（正在落笔时也要能
   查询命中），提交仍走 `guideCommand`。同一语义在 TS 侧也有纯函数
   （`hitGuide`/`guideDragPosition`/`rulerOriginAt`/`rulerReading`），供尚未接入的界面预览用；
   两份公式一致且有对照回归。**这是给集成方的唯一调用点**，画布接入时不需要再算一遍几何。

6. **参考线锁定只管参考线本身。** 两个写入口（`viewCommand` 与面板用的 `guideCommand`）共用
   `guide_lock_blocks`：锁定拦下加/移/改/删与布局生成，但**不拦** `view.setRulerOrigin` /
   `view.resetRulerOrigin`（原点是另一个字段），也不拦「清除参考线」（用户明确要移除）。此前
   `viewCommand` 只对统一入口做锁定检查，会让面板绕过锁定，已修正并加了回归。

7. **只读分析命令不过草稿门禁。** `notes.list`、`measurementLog.list`、
   `view.colorSamplers.list`、`image.analysis.info` 等只读命令在 `view_command` 里先于草稿检查
   返回，否则落笔期间 Info 与日志会停更。写入命令的门禁顺序不变。

8. **连续编辑用上游 `coalesce` 参数合并历史。** 面板的参考线位置、标记尺寸、注释作者/文本改为
   「本地草稿 + 失焦/回车提交」，并带 `coalesce` 键（例如 `view.moveGuide:vertical:0`）。
   逐键直接写文档会一个字符一步历史，和界面提示「文本修改产生一步历史」矛盾；`coalesce` 是上游
   `Session::execute` 为「连续打字/拖动滑杆」准备的既有机制，没有新增私有约定。
   值未变化时不提交，避免多造一步空历史。

9. **PSD 能力按实测记录，不按规格假设。** 域内回归实测：参考线（资源 1032）、注释（Anno）与
   测量比例（1074）能往返，像素逐字节相同；标尺原点与计数分组没有对应通道，重开回到默认值。
   因此「保存的点/计数/注释可重开」对**取样点**不成立（上游 `view.colorSamplers.*` 是会话状态），
   任务 2.4 保持未勾选并写明原因；逐项损失报告要改 `features/io`，属同级域。
10. **命令白名单里的每一条都有真实入口，不留「声明了但点不到」。** 补齐逐条编辑后，面板覆盖
    `view.editGuide`（换向 + 改色）、`count.move` / `count.remove`（当前分组逐条标记）、
    `view.colorSamplers.move`、`measurementLog.delete {all}` / `measurementLog.export`（只取 CSV
    文本，落盘留给宿主 io 端口）、`notes.set {x,y,open}`。读数类展示同样走内核端口而不是界面自算：
    取样点 CMYK 取 `view.colorSamplers.list` 的原样字段，画布宽按当前单位取
    `formatLengthJson`。这样「白名单里有、界面点不到」的假覆盖不会被算成已实现。
11. **参考线颜色只显示文档里真的存过的值。** 上游 `Guides::colors` 只为显式设过色的线保存条目，
    没设色的沿用偏好色。面板因此对没有条目的线显示中性默认色，并不把它当作文档颜色写回；
    取色器只写 `view.editGuide color`，不批量改其它线。
12. **「来源失效不误写目标」做成内核侧的文档身份守卫，而不是界面自觉。** 面板按索引写
    （参考线 `index`、注释 `index`、计数分组 `activeGroup`）时，快照与提交之间可能已经切了标签或
    换了工程：旧索引落到新文档上就是写错目标。`viewSnapshot` 因此带
    `document.id`（`Document.id` 的 `DocId`，随 manifest 往返，重开同一工程保持不变），
    三个写入口（`guideCommand` / `guideLayoutCommand` / `viewCommand`，含只读列表）接受可选
    `targetDocument`，与会话里**活动文档**不一致就返回 `view.stale` 且**在写入之前**拒绝。
    参数缺省表示调用方不参与守卫（旧宿主/精简替身行为不变）；参与时该字段在转发上游命令前被移除，
    不污染上游参数。面板只在快照真的带回身份时才回传，绝不编造一个 id。同理，多视图的
    `viewPointer` 接受来源 `viewId`，非活动视图的迟到指针被拒绝（「仅活动视图接收输入」）。

13. **3.2 的「解码前累计预算」在 TS 解码侧补齐到与协议/原生同一顺序。** 此前
    `decodeViewSnapshot` 每组允许 10 万标记、最多 256 组，理论上可解 2560 万点，而协议
    `validCountGroups` 与 Rust `project-verify` 都按**累计剩余预算**先判长度。解码器现在同样
    先算剩余额度再逐点校验：超预算的快照在遍历前即被拒绝，两侧上限不再分叉。

14. **画布手势的仲裁留在视图域，共享画布只加通用端口。** `photo-editor-canvas.tsx` 新增
    `onGuideDown` / `onGuideMove` / `onGuideUp` / `guidePreview` / `onViewPoint` 五个**可选**端口，
    以及 `data-view-guide-drag` / 预览线的绘制；命中、反算、草稿、提交、取消全在
    `features/views/guide-gesture.ts` 的 `ViewGestureSession` 里。`onGuideDown` 返回 `true`
    表示这次按下被视图域接管，否则画布按原工具继续——未传端口时行为逐字节不变，由
    `photo-editor-canvas.test.tsx` 的「不接管行为不变」用例锁住。拖动期间**不写文档**，只画
    临时预览线；松手才提交，值未变不提交（不产生空历史）。
15. **从标尺拖出参考线放在叠加层，而不是画布。** 标尺条本来就是 `view-aids-overlay.tsx`
    画的，于是同文件加 `onRulerDown(vertical, pointerId)`：上边标尺出竖线、左边标尺出横线，
    24×20 的角落不建线（留给原点拖动）。因为覆盖层在画布容器之上、事件不冒泡，应用侧用
    `window` 的 pointermove/pointerup/pointercancel 按 `pointerId` 续跟，最终仍走同一个
    `ViewGestureSession.commit()`。这样「新建」和「移动」共用一条路径，只是提交命令从
    `view.moveGuide` 换成 `view.newGuide`。
16. **计数/注释落点用一次性请求，而不是全局「工具模式」。** 面板与画布分属不同组件，中间隔着
    共享的 `photo-editor-app.tsx`，而新增工具要改 `FEATURE_TOOLS` 与共享的
    `features/boundaries.test.ts` 精确 tool id 列表。因此改为 `features/views/placement.ts` 的
    订阅式一次性请求：面板发起、画布 `onViewPoint` 消费即清、取消也清。落点优先于当前工具
    （用户明确要求「点画布放一个」），但**没有请求时返回 `false`**，画布照常落笔。
    这也避免了一个真实 bug：最初写成「非笔迹/非手势工具才判定」，而实际每个工具都属于某类手势，
    那个条件永远不成立、入口等于死代码。
17. **多视图取景在面板里仍是只读，不放「点了不动」的按钮。** 内核 `views[]` 的 `zoom`/`offset`
    在并排时由各窗格自己的画布驱动（见 D22），而单视图画布的缩放/平移属于宿主 `canvasView`
    视口，二者不同源。面板若放「放大/缩小/取景归位」按钮，改的是内核会话、画面不动——属于假入口。
    因此面板只显示读数（活动视图百分比与平移量），真实入口是状态栏缩放、快捷键与空格拖拽，
    并排时则是各窗格自己的画布手势。
18. **PSD 视图损失由视图域判定，io 域只做汇总。** 参考线位置、注释、测量比例有对应 PSD 资源，
    往返保留；参考线的**单条颜色**、**标尺原点**、**计数分组**没有可写回的字段。这些数据不挂在
    图层上，只走 `inspect_psd_export` 的图层遍历会被静默丢掉。因此本域提供
    `features::views::psd_loss_rows(document)` 返回 `(feature, reason)`，io 域的
    `inspect_psd_export` 与 `export_report` 汇成 `viewLosses`，`editable` 也随之为 false
    （视图损失是**显式报告**，不是拒绝导出的 blocking 理由——`blocking` 仍只算不可栅格化的图层）。
    有一条回归是导出→导入实测：保留参考线位置/注释/测量比例，丢失颜色/原点/计数，与报告逐项一致。
19. **能力声明与入口放行是同一份数据。** `features/views/mod.rs` 的 `required_capability(id)` 把
    白名单命令映射到所属能力，`tools.rs` 的 `capability_open(id)` = 白名单命中 **且** 该能力
    `is_enabled`。未登记能力的白名单命令返回 `false`，于是立刻以 `CapabilityDisabled` 拒绝——
    新增命令忘了登记能力会暴露，而不是悄悄生效。这样「声明关了、命令还能跑」不可能发生。
20. **基线按增量更新，不重采。** 发布必然改变 `commands`/`capabilities` 与
    `tests/fixtures/contract.json` 的摘要，但 `steps`/`errors`/`output`（8 组状态快照与 PNG 字节）
    仍是 `bdc3c084` 的采集值，`features:check` 依旧以「与 bdc3c084 一致」通过——发布没有被用来
    顺手掩盖别的行为漂移。变更内容记在 `notes/feature-boundary-baseline.json` 的 `publication`
    字段（该文件只被读取 `sharedFiles`，可以带说明）；`feature-boundary-wasm-baseline.json` 必须
    与快照**全等**，不能加说明字段，因此那里只有同步后的真实值。
21. **共享文件的最小改动在本轮是授权的。** 用户明确要求「完成这个 change」，因此除域内文件外，
    还改了 `photo-editor-canvas.tsx`（新增可选端口 `onProbe`/`onFrame`）、`photo-editor-app.tsx`
    （抽出 `renderCanvasPane`、并排窗格、读数节流与取景回写）、`photo-editor.css`（并排窗格样式）、
    `project-verify/src/lib.rs`（一行调用 + 删域内 `allow(dead_code)`）、
    `features/io/psd.rs` 与 `io/editor_psd.rs`（报告汇总）、`tests/fixtures/contract.json`
    （追加 2 行）与两份基线。每处都保持「不传即旧行为」，并在 tasks 的 3.2/4.4/5.1/5.2 逐条留证。

22. **并排双视图复用同一段画布代码，不新增宿主视图端口（D2 的修正）。** 原先判断「并排需要宿主
    视图端口」，实际不需要：`photo-editor-app.tsx` 把单块窗格的渲染抽成 `renderCanvasPane`，并排
    时由 `features/views/panes-view.tsx` 为每个视图渲染一块同参数的 `PhotoCanvas`——内容、撤销历史、
    图层状态都来自同一个控制器，差别只在「用哪份取景、是否活动」。因此：
    - 内核只加 `ViewAids.side_by_side`（≥2 视图才能开，关到 1 视图自动置 false）与
      `setViewAids({viewId, zoom, offset})` 的定向写取景——不必为了改第二个视图的取景去抢活动视图；
      `viewSnapshot.sideBySide` 对外暴露。
    - 活动视图用宿主 `canvasView` 视口（状态栏缩放、快捷键、空格拖拽仍然生效），其它视图各记一份
      取景；切窗格时把**目标窗格此刻显示的那份**取景交接给宿主，画面不跳。
    - 非活动窗格的取景必须**锁住**（`syncPaneViewports`）。最初的实现是「没有记录就退回宿主视口」，
      结果平移活动画布时另一块也跟着动——「取景独立」形同虚设。现在的规则：新窗格从当前取景开始
      （与内核「新视图沿用当前视图」一致），此后只有活动窗格继续跟随宿主；窗格关掉就丢记录；
      无变化时返回**同一引用**，可以直接放进 effect 而不自激重渲染。
    - 输入归属：按非活动窗格先切归属，并且**吞掉这次按下**（`stopPropagation`），否则一次点击会
      既切视图又画一笔。活动窗格不拦截，第一笔不会被吞。
    - 画布新增可选 `onFrame(origin, zoom)` 把真实取景回写内核 `setViewAids({viewId,zoom,offset})`，
      修掉一个真实缺陷：此前内核只知道缩放、不知道画布平移到了哪，画布一平移参考线命中、标尺与
      Info 读数就整体偏。按值去重，值不变不写，不会形成「写内核→重渲染→再写」的循环。

23. **Info 读数用内核只读 `probe`，画布外返回 `null` 而不是 0；读数按像素平面取，不算旋转。**
    `viewPointer` 新增第 4 个动作 `probe`，复用颜色取样的同一份源像素读取
    （`sampler_cmds::readout`），把客户坐标反算成源坐标与像素。画布外不是「读第 0 个像素」而是
    `reading: null`，界面显示「—」；TS 侧 `decodeProbe` 只接受通道 0–255 / 0–100、有限坐标与
    非空单位，坏数据整份拒绝。读数不进文档、不进历史，应用按 40ms 节流，离开画布/换文档/卸载
    都发布 `null`（旧文档的像素不会留在面板上）。
    `probe` 用**去旋转**的变换（`rotation_degrees: 0`）：像素平面由宿主按 `origin/zoom` 呈现、
    不随视图旋转，若把旋转套进读数，屏幕上看到的是未旋转的像素而面板报另一处的像素——那是假读数。
    读数与落笔映射（共享无旋转的 `coordinates.ts`）因此保持一致；参考线命中/标尺属于几何那一侧，
    仍按旋转反算。这条边界由内核回归与真实 WASM 各 1 条锁住（同一客户点在旋转前后读数相同、
    几何动作仍可用）。

24. **持久采样点用文档元数据命名空间键，不改 vendor、不改内容身份。** 上游
    `view.colorSamplers.*` 是会话状态且注释明确「never saved to `.pcraft` or PSD」。本域不改上游，
    而是在**保存副本**上把会话点投影进 `Document::metadata.text` 的
    `photocraft.views.colorSamplers`（JSON `{points:[[x,y],…]}`，`MAX_SAMPLERS=10`、坐标上限
    `1e7`），`open_project` 时灌回 `color_samplers`。取舍与边界：
    - 只在 `save_project` / `export_bundle` 写入，**不在命令里写文档**：采样点若进文档就会被
      撤销快照连带回退（用户删点后 Ctrl+Z 又回来），而它本来就不是内容编辑。
    - 用 `Cow` 借用保存副本：没有采样点、元数据里也没有本域键时**不克隆**整棵图层树，字节形状
      与旧版本完全一致（真实 WASM 断言无点工程保存后更短）。
    - `metadata` 不参与 `document_content`，因此内容指纹、dirty 与撤销历史都不受影响；PNG 导出
      走原文档，采样点不会泄漏进导出的像素文件。
    - 坏数据不静默吞：`project-verify` 的 `inspect_color_samplers` 按条数/字节/坐标三项检查，
      越界拒绝整份工程；未知/坏形状的键在读取时静默忽略（与其它元数据一致）。
    - PSD 没有承载位置，`psd_loss_rows_with_samplers` 产出 `view.color-samplers` 损失行，
      与其它文档级视图损失一起进 `viewLosses`，不静默丢弃。
    - `viewSnapshot.scope.samplers` 由 `session` 改为 `session+project`，如实说明它既不是纯会话
      数据、也不是历史里的一步。
