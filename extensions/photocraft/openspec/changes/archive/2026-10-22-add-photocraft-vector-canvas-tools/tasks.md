# 形状与路径画布工具任务

> 勾选含义：**仅在本次 worktree 内真实完成并有证据**。本轮按用户明确指令「完成这个 change」
> 解除了 `parallel-work.md` 的「共享单写文件不得修改」约束，由本会话**顺序**完成画布手势分派、
> `features/index.ts`、核验器 `lib.rs`、WASM 基线、能力矩阵、工具栏分组，以及后续的
> **内容身份/预算（3.2）**与**运行时协商/文档归属门禁（3.3）**接线，
> 逐条列在 [verification.md](verification.md#本轮共享文件接线清单按用户授权顺序实施) 供集成复核。
> 仍保持未勾选的只有**本环境确实做不到**的项（真实 GPU/窗口走查、PSD 与 Pad/数位笔、真实宿主会话）
> 与**跨域或发布归属**的项（1.1 归档、5.2 的真实保存/跨文档链路），原因逐条写在对应任务里，
> 不写成笼统的“未完成”。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  （已核对：该 change 的 `tasks.md` 11/11 已勾选、实现落在这条基线之上（`b61da631`）。
  **核对当时**的结论是：未改任何旧集中入口（App / Canvas / Chrome / tools / panels / workspace / wasm 全部原样），
  冻结接口（`contract.json`、`project-limits.json`、能力 id）零改动，域目录归属正确。
  **本项判据是「完成了这一步核对」，不表示之后不再改共享文件**：后续按用户授权接线时确实改了
  App / Canvas / Chrome（以及 `features/index.ts` 与核验器 `lib.rs`），逐条列在
  verification.md「本轮共享文件接线清单」，由 5.1 跟踪。两者的区别是：
  1.0 核对的是**基线是否干净、归属是否正确**（是），5.1 记录的是**之后经授权的顺序接线**（已做）。
  冻结接口中的**能力 id 至今零改动**；`contract.json` 与 `project-limits.json` 在核对当时确为未改，
  后续由 3.2 按用户授权引入**仅供本域**的路径身份锚点行与矢量预算键（只新增、不改既有键），
  每项在 `notes/feature-boundary-baseline.json` 的 `sharedFileRevisions` 里留痕；
  `features:check` 的 8 组状态/内容快照与 `bdc3c084` 逐字相同，说明既有键的行为未漂移。
  另有一处域外改动：`packages/protocol/src/index.ts` 的纯 re-export —— 协议包 `exports` 只映射 `.`，
  域解码器必须被编辑器复用，已收敛为「根入口只从 `./features/vectors/index.js` 转出一次」。）
- [ ] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  （来源已核对；**归档顺序属集成/发布职责**，本 change 不改 `openspec/specs/`，故不勾选。）
- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  （见 verification.md 的「逐项能力矩阵」与「逐 U 记录」，逐格标出域内已通项；本轮接线后原先「待接线」的格子已改为实测通过，仍待人工的项在 4.2/3.2 与 verification.md「待人工验证」写明真实原因。）
- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  （未新增同级依赖；未新增能力 id。`contract.json` / `project-limits.json` 当时未改，
  后由 3.2 按用户授权只新增本域键，见 1.0 与 `sharedFileRevisions`。）

## 2. 逐项贯通

> 第 2 组按「用户能否在界面上真的做到」判定：任务描述里含**工具栏入口/画布手势**的项，
> 只要手势还没接进共享画布，就不勾选——不拿“域内函数已写好”冒充交付。

- [x] 2.1 U08：工具栏矩形/椭圆/直线 + 图内拖动实时预览 + Shift/Alt + 单击输入尺寸。
  （**已接线**：12 个矢量工具登记进 `features/vectors/index.ts` 的 `tools`，手势取值 `shape`/`pen`/`path`
  由 `isFeatureVectorTool` 判定；`photo-editor-canvas.tsx` 新增 `onVectorPointer`，在指针分派里**先于**
  平移/笔迹分支把文档坐标转发给域内归约器，拖动期间只更新叠加层、松手才提交一条 `shape.create`。
  工具栏按 `VECTOR_TOOLS.group` 合并为形状/钢笔/路径三个弹出组（`photo-editor-chrome.tsx`），
  12 个工具逐个铺满竖排工具栏会超出可用高度。
  单击（零面积）走 `VectorGestureResult.sizeInput` → `requestShapeSize` → 面板填入起点并聚焦宽度输入，
  不再只是提示。
  回归：`canvas-bridge-hook.test.tsx`（真实 `dist/wasm`，5 项：拖绘一命令/只读不写/默认改图层路径/面板命名路径优先/草稿登记与解除）、
  `canvas-bridge.test.ts`（8 项）、`photo-editor-canvas.test.tsx` 新增 3 项（坐标转发、不落笔迹分支、
  取消与双击标记）、`rail.test.tsx` 新增 2 项（三分组成员与 `VECTOR_TOOLS` 一致、只读组按钮禁用且长按/右键不展开，
  已用变异测试确认把分组分支关掉会立刻失败）。
  真实 WASM 实测出 4 个只有接线才会暴露的缺陷并已修复（详见 verification.md「真实 WASM 反向查出的缺陷」）：
  三角形发出内核不存在的 `kind:"triangle"`、多边形/三角形多发 `starRatio:1` 被自家白名单拒绝、
  零面积矩形与零长度直线被上游照收、`shape.edit` 省略 `kind` 时星形可被 1.0 静默降级为多边形。
  1440×1000 / 1024×768 真实窗口走查仍待人工，见 4.2。）
- [x] 2.2 U09：圆角矩形/三角形/多边形/星形的**拖绘**与 `radii`/`sides`/`star_ratio` 参数。
  （**拖绘已接线**，与 2.1 同一条通路；面板的形状参数经 `shape-options.ts` 域内 store 进入
  `VectorGestureOptions.shapeOptions`，与数值创建共用 `shapeGeometry`/`shapeCreateParams`。
  回归同时覆盖参数与拖绘：10×10 上 `radii:99` 拒绝、改边数轮廓真的变、星形比例进入命令；
  三角形按 `polygon`+`sides:3` 提交并在属性面板回填为「三角形」。）
- [x] 2.3 U10：选中形状时回填尺寸/圆角/填充/描边/线帽/拐角/虚线/对齐，同一草稿提交一步 `shape.edit`，取消零命令。
  （面板内完整可用；`vector-tools-panel.test.tsx` 覆盖回填、编辑、取消、只读。）
- [x] 2.4 U11：贝塞尔拖柄、开放/闭合、续接、自由钢笔、曲率钢笔。
  （**画布交互已接线**：`shape`/`pen`/`path` 三种手势由画布转发，钢笔草稿机与 `PathOverlay` 手柄渲染在
  `canvas-bridge` 里运行；开放路径不强制闭合。续接只在**单击已有开放子路径末端锚点**时触发
  （`continueHit`），不再自动续接——否则只要存在开放路径就再也画不出第二条独立路径。
  自由钢笔用 `getCoalescedEvents` 采样，未提供采样时保持逐点落锚。
  曲率钢笔落**平滑**锚点，结束时先 `path.set` 再发 `path.moveAnchors{curvature:true}`，
  由**内核**重排手柄（前端不重算贝塞尔）；重排用的 `name` 与落点 `pathName` 一致（面板选了已存路径时两条命令写同一名字）。
  回归：`pen-tools.test.ts`（8 项）、`vector-tools.test.ts`（续接/采样/曲率 3 项，均做变异验证）、
  `canvas-bridge.test.ts`「曲率钢笔两步命令按序落地」、`pen-kernel-check.mjs`（真实内核 8 项：续接保持开放、手柄被重排、两步撤销）。）
- [x] 2.5 U12：路径选择/直接选择的**画布命中与拖动**、锚点/线段/手柄增删与平滑尖角转换。
  （**已接线**：`path-select` / `direct-select` 登记为 `path` 手势；命中换算 6px÷zoom 在 `path-edit.ts`，
  读几何走 `handle.execute("path.info")` 而非 `dispatch`（只读命令不触发 `afterWrite`、不制造 dirty），
  写入前按 `pathChoice`/图层自身路径解析目标（`resolvePathTarget`），保证「读到哪条路径就写到哪条」。
  `path-select` 拖锚点移动整条子路径（`moveWholeSubpath`），直接选择只动选中锚点。
  一次拖动一步历史；双击锚点发 `path.convertPoint{curvature:true}` 双向翻转；双击线段在该处插锚。
  回归：`path-edit.test.ts`（7 项）、`path-selection.test.ts`（2 项）、`vector-tools.test.ts`、
  `canvas-bridge.test.ts`（拖动只改一个锚点、整条子路径 vs 单锚点、双击插锚与双向翻转）、
  `mask-kernel-check.mjs`（真实内核 20 项：六个 `path.*` 各改一处、非法索引/`t`/`handle` 被拒）。）
- [x] 2.6 U13：路径变换、裁切路径设置/清除、选区转形状、路径转选区，保留填充/描边/重命名/工作路径。
  （面板按钮组完整；裁切引用重开后一致。
  **核验器已接线**（本轮按用户授权改共享 `project-verify/src/lib.rs`）：`inspect_document` 在
  `inspect_layers(...)` 之后被调用，`verify-wiring-gate.mjs` 现为 **EXIT 0**：
  合法工程 `ok`、裁切路径引用缺失 / 已存路径空名 / 锚点 `1e12` 三种损坏工程全部被拒。）
- [x] 2.7 U14：五种布尔整体提交、一步历史、一步撤销恢复原组件，层序与填充规则明确。
  （面板按选中形状层数启用并说明原因；容差 0.05–10 在进入内核前裁定。）
- [x] 2.8 U15：全显/全隐、栅格化、**直接编辑现有蒙版路径**。
  （全显/全隐/参数/栅格化/删除在面板可用并通过；**「直接编辑蒙版路径」已接线**：
  `pathChoice` 选「当前图层」时 `resolvePathTarget` 解析为 `name:"layer"` + 该图层 id，
  形状层的路径与像素层的矢量蒙版走同一条直接选择通路（形状层同一实现）。
  `editor-view-model.ts` 新增 `hasVectorMask` 解码（`hasMask` 只表示像素蒙版），画布桥据此判断
  「图层自身有路径」，因此选中带矢量蒙版的像素层即可直接拖锚点。
  命令层已用真实内核固定（`mask-kernel-check.mjs`，20 项全通过）：`name:"layer"` + `layer:<id>`
  指向图层自身的矢量蒙版，六个 `path.*` 命令逐个只改一处几何；改蒙版不动密度/羽化、不多出形状层、
  一次撤销一步；非法锚点索引/`t`/`handle` 均被拒；栅格化后蒙版并入像素蒙版而图层仍在。）
- [x] 2.9 U16：Custom Shape 工具、从路径定义形状、预设选择/保存/重命名/分组/删除。
  （库管理**全部可用并通过**：`list/place/new/edit/reset`、`defineCustomShape`；面板补齐了
  **重命名、移动分组、新建/重命名/删除分组**入口。真实内核口径已用 `preset-kernel-check.mjs`（19 项全通过）固定：
  内置预设必须带 `group`、自定形状**不能**带 `group`、自定形状不支持组间移动（按钮禁用并说明原因）。
  删库不伤已应用几何（删分组后已放置形状几何逐字不变）。
  **Custom Shape 拖绘已接线**：`shape-options`/`preset-selection` 域内 store 让面板选中的预设进入
  `VectorGestureOptions.preset`，`custom-shape` 手势在拖出矩形后发 `shape.presets.place`；
  未选预设时明确拒绝而不是静默建一个默认形状（`canvas-bridge.test.ts` 覆盖该负向分支）。）

## 3. 事务、核验与宿主

- [x] 3.1 覆盖拒绝条件、取消、无变化、一步历史与只读；`vectorDrawParams` 实测不改 `contentHash`/`revision`，零面积不提交，非法输入不留历史。
  （上一轮补齐域内适配层的直接回归：`wasm-handle.test.ts` 固定「只读读取零写入 / 一次命令一次写入 / 被拒零写入 /
  无文档与草稿进行中都写在写入前被拦下」，并用变异验证（让只读路径误调 `afterWrite`）确认用例真的会失败；
  `panels.test.tsx` 固定叠加层投影与拖绘/钢笔状态机；`sections.test.tsx` 固定槽位声明与 `shapeLayers` 统计口径。
  本轮把 `wasm-handle` 从 5 项扩到 7 项，补上**门禁顺序**与「只读不经过草稿门禁」（见 3.3）；
  3.3 落地后再扩到 **9 项**，补「冻结窗口拒绝」与「代际令牌不符丢弃」。）
- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验；偏好/查看与内容分开（矩阵中的 PSD 往返拆到 3.2b，因其缺真实资产而无法在本环境验收）。
  （**本轮已把「路径不在内容身份内」的旧口径补上，且只对持久字段生效**：
  ① Rust `features/vectors/content.rs::document_paths_identity` 产出已存命名路径 / 工作路径 / 裁切引用的摘要，
  `document_content.rs::project_content` 把它们作为**顶层可选字段**并入内容描述；`identity.rs` 新增
  `canonicalize_saved_paths` / `canonicalize_work_path` / `canonicalize_clipping_path`，按固定后缀行
  `paths:[<UTF-16 长度>:<名字>:<摘要>…]` → `work:<hash>` → `clip:<长度>:<名字>:<平直度 1e-4>`
  插入，排序按 UTF-16 code unit、平直度按 1e-4 归一，与 TS 逐字节一致。
  **旧工程兼容**：三个字段为空时整体省略，因此 `tests/fixtures/contract.json` 的
  `projectContentHash` 仍是 `42d710c4700e1a13`（未变），空值工程指纹与改前逐字节相同。
  ② TS 侧 `packages/protocol/src/features/vectors/content.ts` 新增 3 个同形规范化函数（含 NUL/长度/范围拒绝）
  与 3 个类型，`features/shared/content.ts` 在 `patterns:` 之后按同一顺序接线。
  ③ **跨语言锚点**：fixture 新增 `vectorPathCanonical` / `vectorPathHash = ef50aab665dcced5`，
  Rust `tests/contract_fixture.rs` 与 TS `contract-fixture.test.ts` 双向断言；实测两端计算同一字符串。
  ④ Rust 回归 `identity/tests.rs::document_paths_canonical_text_matches_typescript`、
  `document_content/tests.rs::document_paths_are_persistent_content_identity`（保存→重开指纹相等、
  路径顺序不影响指纹、改几何/改工作路径/改平直度都改变指纹、清空后回到旧基线）。
  ⑤ **解码前累计预算**：`rust/project-limits.json` 新增 `maxVectorSavedPaths 256` /
  `maxVectorSubpaths 4096` / `maxVectorKnotsPerSubpath 4096` / `maxVectorPathPoints 32768`，
  `rust/.../project-verify/src/limits.rs`、协议 `IMAGE_PROJECT_LIMITS` 与 `VECTOR_LIMITS` 三处同名同值，
  `vectorPathWithinBudget` 与 `composition_domain::validate_path` 共用同一常量；
  `project-verify/src/lib.rs` 在**解码之前**调用 `features::vectors::inspect_manifest_budget`，
  `tests/verify.rs::vector_payload_budgets_are_enforced_before_decoding` 固定「旧工程通过 / 已存路径超量被拒 /
  锚点累计超量被拒」。
  ⑥ **真实内核实测**：`identity-kernel-check.mjs` **13/13 通过**（新增已存路径改变 hash、保存重开后 hash 相等、
  工程字节被核验器接受、改几何改变 hash、写工作路径改变 hash、设/清裁切与改平直度改变 hash、
  清空后 hash 不等于有路径时、裁切引用缺失被拒）。
  ⑦ **偏好/查看与内容分开**：预设库是工具状态、不随 `.pcraft` 持久化（`preset-kernel-check.mjs` 重开后
  `custom` 归零）；参考线/网格/标尺仍走 `view.*` 不进内容身份，由 `features:check` 的 8 组状态/内容快照
  与 `bdc3c084` 逐字相同证明未漂移。
  ⑧ **跨文档**：同一 `.pcraft` 字节重开后 `contentHash` 相等（本项 ④⑥ 均覆盖），
  形状层 `edit.paste` 仍被 layers 域白名单拒绝（跨域，见「参考项说明」），不声称完成真正的跨文档复制动作链。
  ⑨ **仍无生产调用方的一对**：`snapshotWithinBudget`/`restoreSnapshotParams`（Rust `presets::restore`/
  `snapshot_within_budget`）——库是工具状态、不随工程持久化，整库恢复属宿主持久化端口；
  已在 verification.md 如实标注，未假报为已接线，也没有为此新增推测性 UI。
  ⑩ **本轮补上的持久字段缺口**：原实现只把**路径几何**算进内容身份，而形状层的填充/描边/规范参数
  与矢量蒙版的 `density`/`feather` 同样是 `.pcraft` 里逐字段保存、重开后还原的持久内容。
  实测后果是：只改描边宽度、把填充改成「无」、调蒙版浓度时工程字节变了而归一化指纹不变，
  宿主 `isDirty()`（比较 `documentContentHash`）判成「无净变化」→ 丢工作。
  现以**可选后缀**补齐：`shape.appearanceHash`（填充全部字段、描边全部字段、`LiveShape` 规范参数）
  与矢量蒙版的 `:density:` / `:feather:` 后缀；省略时指纹逐字节不变。
  两端同时补 `canonicalizeVectorMask` 的失败传播——TS 侧此前把它的 `null` 直接拼成字面量 `"null"`，
  使非法蒙版也能得到「合法」指纹。
  回归：`appearance-kernel-check.mjs` **27/27**（真实内核，12 处持久外观改动逐个都改变 hash —— 描边 7 个字段、
  填充色与「无填充」、圆角、蒙版密度、羽化；保存重开逐字相等、越界密度/羽化被拒）；
  `document_content/tests.rs::shape_appearance_and_mask_density_are_persistent_content_identity`；
  `image-project.test.ts`；fixture 新增 `shapeAppearanceCanonical/Hash` 与 `maskDensityCanonical/Hash`，
  Rust 与 TS 双向断言同一字符串（`5ecb006223572088` / `1d8ebc300a3a9588`）。）
- [ ] 3.2b PSD 往返矩阵（形状/路径在 PSD 中的表达，无法表达时报告而非静默压平）。
  （**未完成，真实原因：本环境无 Photoshop、也没有 Photoshop 产出的 PSD 资产**，因此「与 Photoshop 互通」
  这一半无法验收。`compatibility_matrix()` 的 `vector.shape-mask` 行是 P7 既有声明，不能用声明代替往返验收。
  **本轮补做了内核侧的 PSD 字节往返**（`.pcraft` → 本仓库 PSD 编码器 → 本仓库 PSD 解码器，不经 Photoshop），
  用的是真实 `dist/wasm` 的 `exportPsd`/`importPsd`，结论是**既有静默丢失**，如实记录而不勾选：
  ① 已存命名路径、工作路径、矢量蒙版几何、形状层填/描边能往返，坐标误差 ≈ 3e-5 px（16.16 定点量化）；
  ② **非 ASCII 路径名变成 `???`**（已存路径名与裁切路径名都是），重开后名字丢失且不报告；
  ③ **裁切路径平直度被重置为 0**（`1.5 → 0`），重开后不报告；
  ④ **填充规则 `EvenOdd` 退化为 `NonZero`**，重开后不报告；
  ⑤ 含形状层的文档 exportPsd 默认**拒绝**并列出 `kind:"shape"` 行（不静默压平，符合 spec）；
  显式栅格化后整份文档变单层（形状消失），报告里 `rasterized: true`。
  ②③④ 位于 `rust/crates/editor-core/src/features/io/psd.rs` 与 vendored `vector_map`，
  该目录属 `2026-10-22-add-photocraft-raster-interchange` 的单一写入范围，本 change 不单方面修改；
  已在此登记供该域复核。与 4.2 同属人工项，不勾选。）
- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  （**本轮全部接线并有回归**：
  ① **运行时协商**：`packages/editor/src/editor-wasm.ts::loadEditor` 在 `new WasmEditor()` 之后立即调用
  `capabilityHandshakeJson()` 并经协议 `verifyPhotocraftHandshake` 逐项核对阶段与能力；结构缺失、畸形、
  多/少能力、顺序不同都拒绝创建可写实例，且失败时 `free()` 释放半初始化对象、按稳定错误码
  `capability-drift` 返回。回归 `editor-wasm.test.ts`「运行时能力协商不符时拒绝可写实例并释放半初始化对象」
  覆盖 7 种漂移 + 一致通过。
  ② **文档代际令牌**：`VectorDocumentToken = { generation, session }`（`features/workspace-context.ts`），
  画布桥在**手势开始时**取 `controller.token()`，每条提交回传；`features/vectors/workspace.ts` 先比对
  再写，不符返回 `code:"stale"` 且**不调用内核**。回归：`wasm-handle.test.ts`「代际令牌不符的晚到命令被丢弃」
  （换代际、只换活动文档两种失效都覆盖）、`editor-workspace-tools.test.ts`（换文档后旧令牌零写入）。
  ③ **草稿门禁**：`EditorWorkspaceController.setVectorDraft(active)` / `hasVectorDraft()` 把域内手势草稿
  （形状拖绘中、钢笔未完成、锚点拖动）登记进 `hasActiveDraft()`；`blockingDraft(skipVectorDraft)` 给出
  `vector-active` 原因，矢量自身提交走 `blockingDraftExceptVector()` 不被自己拦下，其它写入口
  （`dispatch`/保存/新入口/父子回写）照常被拦。画布桥用 `useEffect` 登记 `drafting`（不含纯选择），
  卸载时清除；`dispose()` 直接清零且不写文档。回归：`editor-workspace-tools.test.ts`（草稿期 `layer.delete`
  被拒、矢量自身仍可提交、结算后解除）、`canvas-bridge-hook.test.tsx`、`document-session.test.ts`
  （`pendingDraftOf` 返回「请先完成或取消当前矢量操作」）。
  ④ **保存 / 切标签 / 关闭**：保存走 `performSave()` 的 `blockingDraft()`（已含矢量草稿）；
  切标签与关闭在宿主侧走 `pendingDraftOf(controller)`（Woohaa `document-session.ts` 新增该分支）；
  关闭/释放经 `dispose()` 清登记。回归：`document-session.test.ts` 12 项（含矢量草稿阻止切换/关闭/离开）。
  ⑤ **冻结窗口**：本轮把 `dispatch` 里的冻结判定抽成 `writesFrozen()`，矢量命令在同一次保存/导出窗口内
  也返回 `frozen` 且不调内核、不推进修订——此前矢量入口绕过该判定，能在保存取出产物后继续改文档。
  回归：`wasm-handle.test.ts`「冻结窗口内拒绝矢量写入并在内核之前返回」、
  `editor-workspace-tools.test.ts`「导出冻结期间拒绝矢量写入」。
  ⑥ **父子回写**：`updateSmartParent` 现在先过 `blockingDraft()`（矢量草稿会挡住父文档回写），
  `updateSmartParentFromChild` 额外拒绝**子文档**仍有未结算草稿的导出（否则会用半截工程覆盖父文档）。
  回归：`editor-workspace-tools.test.ts`「父子回写与矢量命令共用草稿门禁」与
  「子文档草稿未结算时拒绝把它导出回写父文档」。
  ⑦ **请求序号**：矢量命令全部是**同步**调用（没有异步命令队列），顺序由「一次手势的提交数组按序执行、
  首个失败即停止」保证，跨文档失效靠 ②的代际令牌而不是序号；这一点在 verification.md 写明，
  不假称有独立的请求序号机制。
  仍属人工的只有「真实宿主会话下的切换/关闭链路」——见 5.2，不在本域单方面宣称。）
- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  （**Woohaa 内核替身已补齐**：`integrations/woohaa/tests/editor-workspace.test.ts` 加了 `vectorPresetsJson`/`vectorDrawParamsJson`，
  typecheck 通过。**上一轮“该包 vitest 跑不起来”的结论本轮已纠正为环境问题并解除**：
  真实原因是本 worktree 的 `photocraft/node_modules/.pnpm` 虚拟存储条目缺失（`pnpm install --offline` 报
  “Already up to date” 也不补），不是 `vitest.config.ts` 写错；补齐 `react@18.3.1` /
  `react-dom@18.3.1_react@18.3.1` 后套件完整跑通 **34 files / 275 passed**（3.3 落地后再补宿主测试替身的
  `setVectorDraft`/`token` 端口，现为 **34 files / 276 passed**）。
  该配置指向标准 pnpm 虚拟存储位置，`pnpm photocraft:setup` 即会建立，属安装前置、非代码改动。
  本项判据为“独立 dev 与 Woohaa 消费同一实现”，域内实现只有一套（`features/vectors/`），无第二份分支实现。）

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  （**本轮（3.2/3.3 落地后）全量重跑**：`pnpm run check` **EXIT 0** —— editor **54 files / 411 passed**、
  protocol 4 files / 84 passed、project-verifier 2 files / 40 passed、`tsc` 0 错误；
  Rust workspace **319 passed / 0 failed**（主目标 234）；本域 TS **15 文件 / 132 项**；
  Woohaa 适配包 **34 files / 276 passed**；`pnpm features:check` 通过（19 条新命令已并入基线，
  8 组快照与 `bdc3c084` 逐字相同）；`verify-wiring-gate.mjs` **EXIT 0**；
  `identity-kernel-check.mjs` **13/13 通过**、`appearance-kernel-check.mjs` **27/27 通过**、
  `pen`/`preset`/`mask-kernel-check.mjs` 与 `constructor-to-kernel.ts`（34 接受 / 1 预期拒绝）同轮重跑为通过；
  `pnpm run wasm` 17.40 MiB + glue 92.0 KiB；
  `pnpm run verifier` 3.84 MiB；`pnpm codemap:check` 通过（47 manifest / 11 篇文档 / 1358 链接）；
  `pnpm openspec validate … --strict` valid。逐项数字与命令见 verification.md。）
- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：U 工具画矩形并改圆角/描边 → 建开放贝塞尔 → 调手柄/布尔组合 → 作为蒙版 → 保存重开和跨文档复制。
  （**未执行，环境限制**：本工作环境是 **Linux 容器**，`ls /dev/dri 2>/dev/null | grep '^renderD'` 无输出，
  即无 GPU；同时**没有显示会话**（无 X11/Wayland）。按 AGENTS.md，此类环境**不采集**渲染/界面证据，
  也**不用软件渲染或估算值替代**。因此 1440×1000 与 1024×768 的真实窗口主线、以及拖绘体感
  留待具备真实 GPU 的机器人工验证。
  同一条主线里还有两项**不依赖 GPU** 但本环境确实缺资产的：PSD 往返（无 Photoshop/PSD 资产）
  与 Pad/数位笔（无硬件）；`edit.paste` 对形状层仍被 layers 域白名单拒绝（跨域，见 verification.md「参考项说明」），
  所以「跨文档复制」这一步本轮只能以「同一 `.pcraft` 字节重开内容身份相等」替代，不声称完成原句的动作链。）
- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  （verification.md 已记录；UI/PSD/Pad 三项标待人工验证并写明真实原因。）
- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  （**四项都已更新，且按实际范围写**：
  ① `notes/capability-matrix.md` 的 `vector.path`/`vector.shape`/`vector.mask`/`selection.from-path`
  三行改为指向 `features/vectors` 的真实实现（归约器 + `canvas-bridge` 接入共享画布 + 核验器已接线），
  并在 `vector.path`/`vector.mask` 行显式标注「真实窗口走查与 PSD 往返矩阵待人工」——不写成无条件已交付。
  ② 兼容矩阵：`compatibility_matrix()` 的 `vector.shape-mask` 行是 P7 既有声明；本 change **未改**该表，
  也没有把声明当验收（PSD 往返未跑，见 3.2）。
  ③ 公共包说明：`packages/editor/README.md` 增加了矢量工具段落，写明「画布只转发指针、
  域内归约器松手才提交、读几何走 `path.info` 不制造 dirty、三个 store 是工具状态、整库恢复无调用方」。
  ④ 模块地图：`docs/code-map/photocraft.md` 的 vectors 条目补了 `canvas-bridge`/三个 store/
  `onVectorPointer`，删去「待接入共享 canvas」；`pnpm codemap:check` 通过（1358 链接）。
  一致性核对方式是「声明 ↔ 入口 ↔ 实测」逐条对：工具 id 在 `features/vectors/index.ts` 的 `tools` 里可查到，
  手势名与画布分派一致，命令 id 与 `feature-boundary-wasm-baseline.json` 一致（`features:check` 通过）。
  没有用「U 编号覆盖数」或阶段名宣称完成。）

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  （**本轮按用户明确指令「完成这个 change」执行**：用户解除了 `parallel-work.md` 的「共享单写文件不得改」
  约束，由本会话充当**唯一集成负责人**，**顺序**（非并行）完成共享文件接线，并把每一处改动
  逐条记入 verification.md 的「本轮共享文件接线清单」供事后复核。
  域内（四个 `features/vectors/` 目录）之外共 **38 个文件**（35 个代码/基线 + 3 篇文档；另有本 change 目录下 7 个可复跑脚本），全部有明确理由，且**没有复制第二套实现**：
  ① `photo-editor-canvas.tsx`：加 `onVectorPointer` 与 `vectorRef`，只做坐标换算与指针转发；
  ② `features/index.ts`：加 `isFeatureVectorTool`（按手势名判定，不含业务语义）；
  ③ `photo-editor-app.tsx`：接指针/叠加层/键盘、矢量工具白名单、上下文栏、三个 store 订阅；
  ④ `photo-editor-chrome.tsx`：按 `VECTOR_TOOLS.group` 把 12 个工具合并成三个弹出组；
  ⑤ `editor-tool-group.tsx`：`ToolOption.Icon` 从 `LucideIcon` 放宽到 `ComponentType<{size?:…}>`
     （否则 `ui/icons` 里的钢笔包装无法进组）；
  ⑥ `editor-view-model.ts`：解码 `hasVectorMask`（`hasMask` 只表示像素蒙版）；
  ⑦ `features/boundaries.test.ts`：随 12 个工具登记更新边界断言；
  ⑧ `photo-editor-canvas.test.tsx`：新增 3 项画布分派回归；
  ⑨ `rust/crates/project-verify/src/lib.rs`：`inspect_document` 调用 + **解码前**的 `inspect_manifest_budget`；
  ⑩ `notes/feature-boundary-wasm-baseline.json`：并入 19 条命令 id（字典序）；
  ⑪ `notes/capability-matrix.md`、`docs/code-map/photocraft.md`、`packages/editor/README.md`：能力/地图/包说明；
  ⑫ `packages/editor/src/editor-wasm.ts`：`loadEditor` 在构造实例后做运行时能力协商（3.3）；
  ⑬ `packages/editor/src/editor-workspace.ts`：`setVectorDraft`/`hasVectorDraft`/`vectorToken`/
      `blockingDraftExceptVector`/`writesFrozen`，`updateSmartParent` 补草稿门禁（3.3）；
  ⑭ `packages/editor/src/features/workspace-context.ts`：`VectorDocumentToken` 与三个端口声明（3.3）；
  ⑮ `packages/editor/src/editor-wasm.test.ts`、`editor-workspace-tools.test.ts`：协商 7 种漂移、草稿门禁、
      代际令牌、冻结窗口、父子回写回归；
  ⑯ `packages/protocol/src/features/vectors/content.ts`、`features/shared/content.ts`、
      `image-project-content.ts`、`image-edit.ts`、`src/index.ts`：路径身份规范化与类型、矢量预算常量、re-export；
  ⑰ `rust/crates/editor-core/src/{identity.rs,document_content.rs}` 与两个 `tests` 子模块：
      路径后缀行与保存重开回归（3.2）；
  ⑱ `rust/crates/project-verify/src/limits.rs`、`tests/verify.rs`、`rust/project-limits.json`、
      `tests/fixtures/contract.json`：矢量预算单源与跨语言身份锚点（3.2）；
  ⑲ `notes/feature-boundary-baseline.json`（`sharedFiles` 三项摘要 + `sharedFileRevisions` 留痕）与
      `integrations/woohaa/src/{document-session.ts,test-support/photo-editor-harness.tsx}` 及适配包测试：
      矢量草稿门禁与宿主测试替身的新端口。
  另有 `packages/protocol/src/index.ts` 的纯 re-export，属本域接口的必要连带。
  清单与逐条理由见 verification.md「本轮共享文件接线清单」与「需要集成方复核的确切清单」。
  没有并发升级全局版本号/资源预算；**能力 id 未改**；`contract.json` / `project-limits.json` 只**新增**
  本域键（不改既有键），并在 `sharedFileRevisions` 留痕。）
- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  （**已执行的部分**：`pnpm run check` 全量通过（editor 54 files / 411 passed，含共享画布与既有全部工具）、
  真实 `dist/wasm` 上的桥层回归（8 + 5 项）、原生核验器接线门禁 EXIT 0、
  Woohaa 适配包 34 files / 276 passed；`parallel-work.md` 本身写明「同级完成前置：无」，无待满足的同级依赖。
  **本轮新补的跨域门禁回归**（不依赖 GPU）：矢量草稿挡住父文档回写、子文档草稿挡住父文档更新、
  冻结窗口挡住矢量写入、文档代际令牌拒绝晚到命令——分别在 `editor-workspace-tools.test.ts`
  与 `wasm-handle.test.ts` 内，且做过变异验证（去掉门禁后相应用例立刻失败）。
  **仍不勾选的原因**：① 跨域 **UI** 回归只在 jsdom 里跑过，真实窗口的像素/取景一致性需 GPU 与显示会话，
  本环境没有（见 4.2）；② **保存**方向的跨域用例没有接真实宿主：Woohaa 适配包的宿主用例用的是内核替身
  （`integrations/woohaa/tests/editor-workspace.test.ts` 的桩），不能据此声称真实保存/回执链路已被本域验证；
  ③ 形状层 `edit.paste` 仍被 layers 域白名单拒绝，跨文档复制这一步无法真正跑通（跨域，本 change 不单方面改）。）
