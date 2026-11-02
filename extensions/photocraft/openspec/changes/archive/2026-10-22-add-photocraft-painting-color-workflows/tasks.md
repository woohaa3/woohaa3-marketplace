# 绘画、笔刷动态与颜色任务

勾选口径（读之前请先看这三行）：

1. **`[x]` 的含义是「本域归属的那部分已落地，并用真实 WASM／真实命令验证过」**，不是「整条 U 在产品
   里已可用」。每条已勾选条目末尾都显式写了自己的剩余缺口。
2. **共享文件已在用户明确授权下由本 change 直接修改**（外壳、画布手势、可写颜色端口、能力表、
   契约 fixture、基线快照），因此不再因为「需要改共享文件」而保持未勾选；判据改为「声明/入口/
   实际结果三处一致 + 真实 WASM 验证」。共享层仍只保留唯一实现，本域不复制替代实现（清单见 5.1）。
3. 需要真实 GPU 渲染会话或人工/真笔硬件的条目一律 `[ ]`，原因按真实情况写，不用「无 GPU」笼统
   概括本机以外的环境问题。

实际命令与计数见 [verification.md](verification.md)。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  已核对（本轮实测）：
  - 重构 change 的 tasks **11 项全部勾选、0 项未完成**，`openspec validate … --strict` 通过，
    其验收记录写明「本次没有启动后续 18 个 change」，即本域按预期从该提交独立开工；
  - 实际完成提交 `b61da631`（`refactor(photocraft): establish parallel feature boundaries`）
    **是当前 HEAD 的祖先**（`git merge-base --is-ancestor` 为真）；
  - parallel-work 列的四个域目录全部存在且已进入唯一装配：
    `packages/editor/src/features/painting/`、`packages/protocol/src/features/painting/`、
    `rust/crates/editor-core/src/features/painting/`、`rust/crates/project-verify/src/features/painting/`；
    `features/mod.rs` 的 `FEATURES` 里是本域的 `painting::CONTRIBUTION` 一项；
  - 冻结接口按 `notes/feature-boundaries.md` 使用：Rust 侧经 `FeatureContribution`/`StagedId`，
    前端经 `WorkspaceFeatureContext`；
  - **未并改旧集中入口**：`git diff b61da631 -- rust/crates/editor-core/src/editor/tools.rs
    packages/editor/src/photo-editor-app.tsx` 为空，本域代码没有写进旧文件。

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  三项均已实测核对：
  1. **实现提交**：`bdc3c0847` 存在且是当前 HEAD（`b0cd6cbc`）的祖先；按该提交与上游
     `4e7a17cd` 逐一核对参数形态（`paint.pencil`、`paint.bucket` 容差 0–255 且无 `mode`、
     `paint.colorReplacement` 的 `mode/sampling/limits/antiAlias`、`symmetryFromPath` 的 `{name}`、
     `SymmetryMode` 为 `vertical|horizontal|dual|diagonal`）。上游固定来源在
     `tests/fixtures/contract.json`（`upstreamCommit`/`engineVersion`/5 个 variant）与
     `packages/protocol/src/image-edit.ts` 的 `PHOTOCRAFT_ENGINE_VERSION` 中一致，且原生核验器对
     本域产出的工程回报同一 `upstreamCommit 4e7a17cd…`。
  2. **同名 capability 的归档前置——实测无冲突，不需要先行处理**。在临时副本
     （`openspec` 全量拷贝到 `/tmp` 沙箱，未触碰真实 change 目录）里按**两种顺序**各执行一次归档：
     先本 change（added 12）后原 change（added 35 / modified 1）→ 成功；
     先原 change 后本 change → 同样成功。归档后 `openspec/specs/brush-workflow/spec.md` 共
     **16 条需求**，正好等于原 change 的 4 条 + 本 change 的 12 条，**无一条重名**（已用需求标题
     集合求交集验证为空）。两个 change 都是 `## ADDED Requirements` 向同一 capability 追加不重名
     的需求，因此归档是纯增量合并，不构成阻塞条件。
  3. **原 change 的未验收记录保留**：`2026-10-22-complete-photocraft-webui-editing` 仍有
     **8 项未勾选**（数位笔手感、批量导入响应、Photoshop 兼容与嵌入子集、真实 GPU 数位笔效果、
     PSD 可编辑往返、综合交互走查、真笔/外部兼容记录），与本 change 的待人工验证项一致；
     该文件在本工作区**未被修改**（`git status` 只列出本 change 的 tasks/verification）。
  注意：本任务核对的是「归档前置不冲突」，**不等于**本 change 现在已归档——归档动作本身属发布
  流程，由集成负责人在全部 change 收敛后统一执行。

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  矩阵落在逐 U 的实现与验收记录里：命令/参数在 `rust/crates/editor-core/src/features/painting/tools.rs`
  + `packages/editor/src/features/painting/tool-modes.ts`，WASM 绑定在
  `features/painting/wasm.rs`，UI 在 `panels.tsx`/`brush-panels.tsx`，落笔手势的接线契约在
  `tool-manifest.ts` 的 `PAINTING_TOOL_WIRING`（7 个工具的 gesture/command/所需画布分支）。
  上游未开放项（双重笔刷、湿边/混合器）以真实 WASM 拒绝验证。

- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  本域只经 `controller.features.painting`（`WorkspaceFeatureContext` + `FeaturePanelContext`）
  访问宿主；未 import 任何宿主私有模块。

## 2. 逐项贯通

- [x] 2.1 U27：提供铅笔和颜色替换工具及各自模式/容差/采样参数，逐工具冻结笔迹设置。 成功证据：铅笔硬边和颜色替换区域与普通软画笔有真实差异，一笔可撤销。
  域内完成：`buildPencil`/`buildColorReplacement` 编译参数（铅笔强制 hardness=1、无平滑、
  支持 autoErase 与混合模式；颜色替换支持 mode/tolerance/sampling/limits/antiAlias），
  面板提供逐工具参数且互不污染。真实 WASM：铅笔落黑且一步撤销；颜色替换把 `#808080` 改为
  `#ff4a4a`（`mode:"color"` 保留亮度）、跳过不匹配的白色、未触碰的蓝色笔迹保持 `#0000ff`，
  一步撤销回到原内容。**本轮修了铅笔颜色写死的缺陷**：铅笔的 `color` 原先固定取
  `DEFAULT_PENCIL.color`（`#000000`），改了前景色仍画黑，与油漆桶/颜色替换不一致；
  现在面板用 `{...pencil, color: colors.foreground}` 编译（`PencilSettings.color` 只作兜底）。
  证据：真实 WASM `u27-tools.mjs` 的铅笔段 **6/6** —— 传 `#00ff00` 落笔得 `#00ff00`、
  同路径换色得 `#000000`、硬边笔尖中心与边缘同为纯色、每笔一步撤销回基线；
  回归 `workflow-state.test.ts`「铅笔颜色跟随当前前景色」+ `panels.test.tsx` 预览用例。
  **同轮修了逐工具设置相互污染**：颜色替换没有自己的尺寸字段，面板把它的「笔头尺寸」绑在
  `backgroundEraser.size` 上——在颜色替换里改笔头，背景橡皮的笔头也跟着变，违反「逐工具
  冻结笔迹设置」。现在 `ColorReplacementSettings.size` 独立（省略时仍回落旧行为，不破坏
  其它调用方）。证据 `u27-tools.mjs` 的逐工具尺寸段 **7/7**：同一路径 `size 4` 着色
  6 行、`size 20` 着色 24 行；背景橡皮 `size 4` 擦 2 行、`size 20` 擦 18 行；两工具连续两笔
  可分别撤销且逐步回基线。该文件整体 **15/15**（另 2 条为颜色替换的匹配/跳断断言）。
  回归 `workflow-state.test.ts`「颜色替换用自己的笔头尺寸」。
  **工具轨入口已发布**（本轮接线）：铅笔与颜色替换进入 `features/painting/index.ts` 的工具清单，
  共享外壳 `photo-editor-app.tsx` 的 `canvasTool` 白名单与 `beginStroke` 分支按
  `tool-manifest.ts` 的契约接线，拖动期间按整笔冻结参数、抬笔提交一次。回归
  `boundary-regression.test.ts` 断言这两个工具在 `feature.tools` 中且 `canRun` 正常。

- [x] 2.2 U28：提供 Gradient 拖动方向、类型、色标/透明度与 Paint Bucket 的容差/连续/采样控制，区别整层前背景填充。 成功证据：渐变端点/色标作用于真实源坐标，桶填充尊重连通域、选区和采样策略。
  域内完成：`buildGradient`（5 种样式、≤64 色标与透明度色标、reverse/dither/opacity、
  以及本轮补齐的**插值方式 `method` 与 `smoothness`**、端点重合即拒绝）与 `buildBucket`
  （容差 0–255、contiguous/antiAlias/sampleAllLayers、图案内容）。
  面板可直接提交真实命令，插值方式与平滑度都有真实控件（此前 `method` 能编进命令却没有入口，
  本轮补上；清回「直线色标」时连平滑度一起清，不留半套无效设置）。
  真实 WASM：渐变两端像素随色标变化（`#080808`→`#fcfcfc`）；选区外不被填充；整幅分割线下
  contiguous 只填左半、discontiguous 两侧都填；`reverse` 真正翻转色带方向。插值证据
  （`u28-gradient-bucket.mjs` 整体 **14/14**）：
  直线色标与 `classic` 在 x=16 得 `#111111` vs `#0a0a0a`，`classic` 与 `perceptual` 得
  `#0a0a0a` vs `#000000`，`linear` 在 x=16 得 `#373737`；`smoothness` 0→100 对
  classic/perceptual/linear **有**影响，对 `smooth` **无**影响（内核 `eval` 的 Smooth 分支不读
  该参数，属内核语义，断言按方式区分）；未知 `method` 内核会静默退回直线，**拒绝由域校验器负责**
  （`buildGradient` 返回 null）。
  **拖动/单点手势已接线**（本轮）：渐变按 `stroke` 手势取首末点、抬笔提交一次；油漆桶按
  `point` 手势单击提交。接线表在 `tool-manifest.ts`，共享外壳只调用 `compileGradient`/`compilePoint`。
  真实 WASM 的选区裁剪与连通域证据见 `u28-gradient-bucket.mjs`（14/14）与 `cross-domain.mjs`
  「渐变被选区裁剪」。

- [x] 2.3 U29：提供背景橡皮的采样/边界/保护颜色与魔术橡皮容差/连续等工具参数。 成功证据：背景擦除按取样色工作，魔术擦除按区域工作，保留无关前景并支持撤销。
  域内完成：`buildBackgroundEraser`（sampling/limits/tolerance/size/hardness/protectForegroundColor）
  与 `buildMagicEraser`（容差/连续/抗锯齿/取样层）。真实 WASM：魔术橡皮擦掉灰区（采样返回
  `null` = 透明）并保留蓝色前景，一步撤销恢复原内容。**两者手势也已接线**（本轮）：背景橡皮走
  `stroke` 手势整笔提交，魔术橡皮走 `point` 手势单击提交；`u29-erasers.mjs` 8/8 覆盖取样模式差异
  与保护前景色，`cross-domain.mjs` 覆盖「蒙版笔迹只改蒙版、撤销回笔迹前合成值」。

- [x] 2.4 U30：让绘画混合模式、纹理/模式、颜色/角度/圆度动态、压力曲线与双轴散布/数量抖动真实进入内核笔迹及预览。 成功证据：固定轨迹/seed 下预览和落笔一致，切模式改变实际像素而非只改变控件值。
  域内完成：混合模式白名单与归一化移入协议（`PAINT_BLEND_MODE_IDS`/`normalizeBlendModeId`），
  `dissolve` 合法、`passThrough`/`clear` 非法；`buildStroke` 拒绝未知模式而非静默用 `normal`；
  `mode` 是 `paint.stroke` 顶层参数。`brush-library-state.ts` 增加纹理（样式/缩放/反相/模式/深度）、
  颜色动态（前背景/逐笔尖/色相/饱和/亮度/纯度）、角度与圆度动态、双轴散布与数量抖动、每条动态
  的响应曲线；`dynamicsPatch`/`dynamicsFromBrush` 往返安全。真实 WASM `u30-dynamics.mjs` **13/13**：
  `#808080` 背景上 5 种混合模式内容 hash 互不相同、纹理、颜色动态、角度/圆度、双轴散布与数量
  抖动、压力曲线改变落笔尺寸（需 points 带 pressure）、同 seed 重复落笔像素相同而换 seed 不同、
  预览不写文档、非法模式预览与越界散布被拒绝、文档回到基线。

- [ ] 2.5 U31：贯通真实 coalesced pen 的倾斜/旋转输入；在共享限额和真实性能证据下开放超过 512 的有界笔刷，鼠标/缺传感器明确回退。 成功证据：真笔记录显示 tilt/twist 到达内核并影响支持动态，大笔刷可取消/撤销且不突破文档预算。
  **域内一半已完成并验证**：`stroke-points.ts` 现在按内核 `parse_points` 的槽位
  `[x, y, pressure?, tiltX?, tiltY?, rotation?, timeMs?, wheel?]` 编码倾斜/旋转，含三条硬约束——
  写了姿态必须先写压力（否则姿态整体前移一个槽位）、缺传感器保持短编码不补占位、越界硬件读数
  收敛而不断笔。`buildStroke`/`buildPencil`/`buildColorReplacement`/`buildBackgroundEraser` 的
  点参数已放宽到该类型，姿态随命令进入内核。回归 `stroke-points.test.ts`（9 项）；真实 WASM
  `u31-pen-pose.mjs` 6/6：PenTilt 控制下倾斜改变笔尖、Brush Projection + 圆度 < 1 时
  旋转改变角度、倾斜误写压力槽可被压力动态读到、带姿态笔迹一步撤销、越界收敛后仍可落笔。
  复查中发现并修正的一个测量错误：内容 hash 含文档/图层身份，**两个新文档的 hash 天生不同**，
  跨会话比 hash 会假通过；该脚本改为单会话「落笔→取 hash→撤销回基线」。
  仍**未勾选**，剩余缺口是硬件与共享预算，不是域内代码：
  1. **tilt/twist 采集已接线**（本轮）：共享 `photo-editor-canvas.tsx` 新增 `pointerPose()`，
     `pointerType === "pen"` 时读真实的 `pressure`/`tiltX`/`tiltY`/`twist`（映射到旋转槽），
     coalesced 采样逐个带姿态、抬笔沿用最后一个真实姿态而不补 0。**没有真实读数可采**：
     本机无任何数位笔设备，`PointerEvent` 的 tilt/twist 只有在真实笔上才有非零值，因此
     「真笔记录显示 tilt/twist 到达内核并影响支持动态」这条**验收**仍待人工，不用合成事件冒充；
  2. **>512 笔刷**卡在 `rust/project-limits.json` 的 `maxBrushSizeSourcePixels`（当前 512）。
     该文件是共享预算，本域未改；`clampBrushSize` 已按该上限收敛，面板不假装能超；
  3. 大笔刷的真实性能证据同属渲染/硬件项（本机 Linux 无 `renderD*`）。

- [x] 2.6 U32：从当前选区定义静态笔尖，提供笔刷移动组、分组改名/排序/删除及库持久化错误反馈。 成功证据：定义笔尖与所选区域一致，组管理重载保持，已冻结笔迹不受随后库删除影响。
  域内完成：`define_from_selection`（把上游 `brush.defineFromSelection` 的结果收进本机库、
  记 `origin: user`）、`rename_brush_group`/`move_brush_group`/`delete_brush_group`（默认组受保护、
  `keepPresets` 保留条目）、库快照/恢复绑定，以及面板的分组列表与失败提示。真实 WASM：选区
  10×6 定义出的笔尖 width=10/height=6 且出现在分组表；改名 1 条、置顶 index=0、删除后条目回到
  `general`；删除库项与删预设都不改变已提交像素；`general` 删除被拒绝并有原因。
  **剩余缺口（本轮复核后补记，非硬件项）**：控制器侧的「重载保持」链路是完整的——
  `ensureEditor()` 成功后调用 `brushes.restore()`，改库后 `persist()` 经
  `EditorWorkspaceOptions.brushStorage` 落盘，并自带 `createIndexedDbBrushStorage` 适配器；
  但**两个宿主都没有注入该端口**（`dev/src/PhotoCraftDevApp.tsx` 明确声明「不写入任何持久状态」，
  `integrations/woohaa/src/image-editor-plugin.tsx` 未传 `brushStorage`）。因此当前应用内重载
  落回 `persistence:"unsaved"`，面板如实显示「本机库只在本次会话内」，**没有**假装已保存。
  未在本域擅自注入的原因不是偷懒：每个文档一个内核实例即一份独立库，共享同一存储键时
  后保存的文档会用「不含另一文档新增预设」的快照覆盖前者（last-writer-wins），
  要正确合并需要库的单一归属者，属宿主/集成负责人的共享设计决定，本 change 无此授权。
  证据与原因同见 [verification.md](verification.md) 的 U32 与「阻塞与待人工验证」。

- [x] 2.7 U33：提供水平/垂直/径向等对称及从路径定义/编辑对称轴，所有复制笔迹同一事务。 成功证据：旋转/缩放视图后对称仍绕源坐标轴，撤销一次移除整笔所有镜像。
  域内完成：`buildSymmetry`/`buildSymmetryFromPath`/`buildSymmetryDisable` 与
  `symmetry_state`（`{enabled:false}` 或内核 inspect 结果）。中心与旋转用源坐标。真实 WASM：
  vertical 对称下单笔在 x=11 与镜像 x=37 同时出现，`edit.undo` 一次同时移除，内容 hash 回到基线；
  `paint.symmetryDisable` 回到 `enabled:false`。视图旋转后的表现无法在本机以真实 GPU 采（见
  verification 的待人工验证项）。

- [x] 2.8 U34：增加独立吸管、平均采样尺寸、当前/全部/下方图层和前/背景色取样，保留 Alt 临时取色。 成功证据：实际颜色来自所选源策略而非显示缩略图，取色不改文档历史。
  域内完成：`sample_color_options`（点/1/3/5/11/31/51/101 平均、5 种采样层策略、越界与透明返回
  `null`）与 `buildSampleColor`/`decodeSampledColor`，面板提供只读采样入口。真实 WASM：源像素
  `#123456` 在点采样与 5×5 平均下都取到，图外返回 `null`，透明文档返回 `null`，采样前后内容
  指纹不变。**写回前景/背景色已接**（本轮）：`FeaturePanelContext` 新增可选 `setColor` 端口，
  `photo-editor-app.tsx` 把它接到工具轨同一个 `setColor`/`setBackground`；面板在端口存在时恢复
  「取色目标」下拉并写回，不存在时如实退回只读报告。吸管手势走 `gesture:"sample"`（单击即取，
  不改文档历史），Alt 临时取色仍走共享画布。

- [x] 2.9 U35：提供颜色/色板的分组、导入导出/常用色，以及共享渐变预设/色标编辑，应用后的资源与库独立。 成功证据：色板/渐变往返后数值一致，渐变可用于实际绘画和已有样式控件。
  域内完成：色板增删改/分组/ACO·ASE 导入导出/恢复默认（`preferenceCommand`，不造 dirty）、
  渐变预设列表与选择（`applyToLayer:false` 不新建填充层）、预设色标可套进渐变工具参数
  （修掉了「选预设拿不到色标」的解码缺陷，并加了回归）。真实 WASM：`#123456` 增入→列表可查→
  ACO 导出/导入往返同值→`swatches.use` 返回同值且内容指纹不变；预设色标实际画出左右不同颜色。

- [x] 2.10 U36：提供保存/选择工具预设以及当前/全部工具恢复默认，明确重置的参数范围而不删除文档和工作区。 成功证据：切换工具恢复各自参数，重置只改变声明的偏好，不产生文档 dirty。
  域内完成：`tool.presets.list/new/select/edit/reset`、快照/恢复、`tool.reset`（`["brush","toolOptions"]`）
  与 `tool.resetAll`（再加 `presetSelection`），笔迹未结算时拒绝重置。真实 WASM：存 size=33 预设→
  改成 9→套用回到 33；`tool.reset` 后回到内核默认 20；`resetAll` 返回 all；删除预设；全程内容
  指纹不变。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  域内：Rust 单测覆盖空选区、未知分组、默认组删除、非法对称模式/中心、损坏预设快照、
  未结算笔迹时重置、越界采样；真实 WASM 覆盖每项的一步撤销与内容指纹不变、透明/图外采样返回
  空、未开放能力拒绝、非法画笔预览不写文档。TS 侧覆盖参数编译拒绝（端点重合、未知模式/尺寸/
  采样层、非法曲线）与面板在非法输入时不发命令。

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  **本轮补齐了此前记为阻塞的两处对照，并已实测通过**：
  - **与共享 fixture 对照（此前标为「属集成负责人」）其实可由本域执行并已通过**：
    `cargo test --test contract_fixture` **4/4** —— `capability_stages_and_non_goals_match_the_shared_fixture`
    把 `capabilities`/`nonGoals`/`DELIVERED_STAGES` 与 `tests/fixtures/contract.json` 逐项比对，
    `build_info_reports_the_fixture_values_on_the_wire` 比对 engine/upstream/format 版本。
    本轮发布 11 个 P1b 能力后，共享 fixture 也同步为 82 项（属 4.4），本次复跑仍 **4/4**。
  - **原生核验入口**同样由本域实际执行：对套件打印的 `painted-project.pcraft` 运行
    `packages/project-verifier/dist/bin/photocraft-project-verify`，返回 `{"ok":true}`
    （96×64、1 层 raster、4 条目、18215 解压字节）；decoder 侧预算/深度/条目上限
    在 `cargo test -p photocraft-project-verify`（15+3+1+10 项）中对同一份字节生效。
  - **没有新增持久内容字段**：色板、渐变预设、工具预设与笔刷库都是本机偏好，`preferenceCommand`
    不打 dirty，内核也不推进修订/历史/内容指纹。对称是会话状态（上游 `DocState.symmetry`，
    不进 format/io），也不是持久字段。
  - **内容身份** `content-roundtrip.mjs` 的往返段 **6/6**：用 7 类真实像素命令（铅笔、颜色替换、
    油漆桶、渐变、魔术橡皮、背景橡皮、带纹理/颜色动态/双轴散布/数量抖动的 `paint.stroke`）
    画满后保存，新实例重开的内容指纹、逐像素（96×64 全量采样）与修订号一致，二次保存字节稳定。
  - **偏好与内容分开** 同上脚本（**2/2**）：16 条偏好命令（色板增删改/导出/使用、渐变预设、笔刷预设与
    分组、工具预设与重置、对称）全部被接受，**没有一条**改变内容指纹或修订；改完偏好再保存，
    工程字节与改之前逐字节相同。
  - **旧工程兼容** 同上脚本的旧工程段 **4/4**：旧字节重开指纹/修订不变，可在旧工程上用
    新命令绘画并一步撤销，加偏好后内容仍不变，再保存仍可重开且内容一致。
  - **PSD 矩阵** `psd-cross-format.mjs` 5/5：矩阵声明 raster 可导出，绘制后工程
    `inspectPsdExport` 为 `editable:true, blocking:0`，导出 19132 字节、报告 0 警告 0 有损，
    再导入画布尺寸仍为 96×64。
  - **跨文档**：本域不新增跨文档载荷（剪贴板是文档内会话剪贴板，`edit.copy/paste` 无跨文档
    load），没有虚构跨文档原子事务，因此该子项无新增项。
  - **基线一致性**：与 `notes/feature-boundary-wasm-baseline.json` 逐段比较，`build`、
    `capabilities`、8 段内容/状态快照、错误集与导出 PNG 字节全部 `SAME`；命令表 +27 与能力表
    +11 是本 change 的声明增量，已在 4.4 重取快照并复跑 `pnpm run features:check` 通过。

- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  **本轮把实测发现的共享门禁旁路修掉了**，并用真实共享控制器验证：
  - `WorkspaceFeatureContext` 新增 `frozen(): EditorFailure | null` 与 `documentGeneration(): number`；
    `EditorWorkspaceController` 把原先内联在 `dispatch()` 里的冻结判断抽成 `frozenGate()` 并对外暴露
    （`dispatch()` 改为调用同一个方法，因此共享入口与域入口不会再有两份真相）。
  - 域会话 `paintCommand`、以及 `type`/`vectors`/`views` 三个同样直连内核的写入口，现在都先查
    `frozen()`；`documentGeneration()` 用于异步结果落地前的代际比较。
  - 证据 `workspace-gate.test.ts`（**9 项**，真 `EditorWorkspaceController` + 内核替身）：
    像素命令正常提交并同步视图；滤镜草稿挡住像素命令且内核零调用；偏好命令不被草稿门挡且不推进
    修订；**保存进行中（真 `save()` + 延迟保存端口）像素命令返回 `frozen` 且内核修订/调用计数不变**；
    `dispose()` 后四入口统一 `no-document`；内核错误原样冒泡；两条通道互拒对方 id；
    未加载句柄全部 `no-document`；**`dispose()` 后 `documentGeneration()` 与写入口一致失效**。
    `workflow-state.test.ts`（**25 项**）另有一条冻结门用例。
  **仍如实保留的边界**：请求序号、父子回写与切标签/关闭结算的**实现**在共享
  `editor-workspace.ts`/`editor-wasm.ts` 与 Woohaa `document-session.ts`；本条证明的是「本域写入口
  与共享门禁逐条一致、且实测同一拒绝码」，不重复实现那套生命周期。

- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  **三处都已实测**：
  - **独立 dev**：`dev/src/PhotoCraftDevApp.tsx` 渲染 `PhotoEditorApp`，后者装配 `FEATURE_SECTIONS`
    的「绘画工具与颜色…」分区；`pnpm -C dev test` **8/8** 通过，说明 A/B 双文档装配未被破坏。
  - **Woohaa 消费同一实现**：`integrations/woohaa` 的 34 个文件 / **275 项**全部通过，其中
    `paint-interaction.test.tsx`（6 项）从真实 `PhotoEditorApp` 走指针 → 控制器 → 预览发布，
    证明适配包与 dev 用的是同一个 `PhotoEditorApp` 与同一份域贡献。给
    `editor-workspace.test.ts` 的内核替身补了本域新增的 14 个绑定桩（`EditorInstance` 放宽后的
    必需项），`pnpm --filter @woohaa3/photocraft-woohaa run typecheck` 通过。
  - **公共端口与错误恢复**：新增可写颜色端口 `FeaturePanelContext.setColor`（可选），吸管与色板
    写回前景/背景色；宿主不提供该端口时面板如实降级为只读报告。吸管对图外/透明返回 `null` 时
    给出提示而不是写入 `undefined`；非法采样结构给出「采样结果结构非法」。
  **复跑注意（环境问题，不是代码问题）**：本 worktree 的 `integrations/woohaa/vitest.config.ts`
  把 React 别名写死为 `../../node_modules/.pnpm/react@18.3.1/...`，该路径在当前安装布局下不存在
  （仓库既有写法依赖某次安装的物理布局）。本轮用 `/data/tmp/pc-woohaa/vitest.config.ts`
  （`createRequire` 解析同一份 React，其它配置逐项一致）跑出的 275 项通过；仓库配置文件本身未改，
  留给依赖安装方式的所有者按实际布局修正。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  已运行并记录实际计数（本轮全部复跑）：`pnpm run typecheck`（4 包全绿）、`pnpm run test`
  （protocol **86** / project-verifier **40** / editor **339** / dev **8**）、
  `cargo test --manifest-path rust/Cargo.toml --workspace --offline`（214+4+13+25+8+0+1+3+10+15，0 失败）、
  native 与 wasm32 `cargo check`、`pnpm codemap:check`（47 manifest / 11 篇 / **1362** 链接）、
  `pnpm run features:check`（**通过**，见 4.4）、Woohaa 34 文件 / **275** 项；
  **真实 WASM 验收套件 `tests/features/painting/run.mjs` 14 个文件 / 164 条断言全部通过**
  （本轮新增 `cross-domain.mjs` 25 条），套件产出的工程字节再经原生核验器
  `/packages/project-verifier/dist/bin/photocraft-project-verify` 复核为 `{"ok":true}`
  （`layerCount` 与状态一致、`upstreamCommit 4e7a17cd…`）。新增回归：
  `panels.test.tsx`(11)、`advanced-dynamics.test.ts`(10)、`brush-settings-dynamics.test.tsx`(2)、
  `workflow-state.test.ts`(**25**)、**`stroke-points.test.ts`(9)**、**`workspace-gate.test.ts`(9)**、
  共享画布 `photo-editor-canvas.test.tsx` 新增 3 项（单击类工具一次事务、吸管免 Alt 连续取色、
  真笔姿态随 coalesced 采样进入点位且鼠标保持短编码）、协议 `workflow.test.ts`(16)、
  绘画域 `boundary-regression.test.ts`。
  `boundaries.test.ts` 的改动只有 3 行（工具清单、9 个 stroke 工具、分区总数 12→13），
  都是「共享装配事实变了」的必然同步；绘画域自己的装配形状断言在 `boundary-regression.test.ts`。

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：选择不同笔刷不重载编辑器 → 非 normal 笔迹/纹理动态 → 渐变拖动与桶填充 → 对称 → 分组选区笔尖 → 色板/工具预设；真笔另录倾斜旋转证据。
  未勾选：本机是 Linux 且 `/dev/dri` 下没有 `renderD*`，没有真实 GPU 渲染会话，无法采应用内
  截图/帧率；「真笔倾斜旋转」依赖真实数位笔硬件（采集代码已接线，但没有设备就没有真实读数，
  不合成事件冒充）。主线其余环节（不同笔刷、非 normal 笔迹/纹理动态、渐变拖动与桶填充、对称、
  分组选区笔尖、色板/工具预设）现在**都已有可点的界面入口**，缺的只是应用内 GPU 走查本身。

- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  逐 U 记录已写入 [verification.md](verification.md)，每条给出命令/脚本、实际像素值与通过情况；
  GPU/真实设备项按真实原因标待人工验证。

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  **本轮把能力真正发布了**（此前是域内实现完成、能力未登记）：
  - **能力声明**：`rust/crates/editor-core/src/features/painting/mod.rs` 与
    `packages/protocol/src/features/painting/index.ts` 同步新增 11 个 P1b id（order 8–18）：
    `paint.pencil`、`paint.color-replacement`、`paint.gradient`、`paint.bucket`、
    `paint.magic-eraser`、`paint.background-eraser`、`paint.symmetry`、`paint.eyedropper`、
    `paint.swatches`、`paint.gradient-presets`、`paint.tool-presets`。每个 id 都有真实的工具轨
    或面板入口 + 真实 WASM 验收 + 可撤销的像素结果；**没有**为「真笔姿态」或「>512 笔刷」
    发明 id，因为那两项的条件尚未满足。
  - **声明/入口/实际结果一致性**：`tests/fixtures/contract.json` 的 `capabilities` 同步到 **82** 项，
    `notes/feature-boundary-baseline.json` 的 `stages.P1b` 同步到 19 项；
    `cargo test --test contract_fixture` **4/4** 通过（Rust 能力表 ↔ 共享 fixture 逐项比对）；
    协议 `contract-fixture.test.ts` 通过；`pnpm run features:check` **通过**——
    重建后的真实 WASM 握手为 **82 capabilities / 212 commands**，`build`/`steps`/`errors`/`output`
    四段与 `bdc3c084` 基线逐段相等，命令表 +27 / -0（全部是本 change 新增 id），
    已重取 `notes/feature-boundary-wasm-baseline.json` 与基线文件的 `allowedCommands`、
    `tests/fixtures/contract.json` 的 SHA-256。
  - **能力矩阵**：`notes/capability-matrix.md` 的 P1b 增加 6 行（铅笔/颜色替换、渐变/油漆桶、
    两种橡皮、对称、吸管、色板与两类预设），写明各自的实现位置与「已交付」依据；
    `README.md` 的 P1b 阶段表同步。
  - **兼容矩阵**：本 change **未新增任何持久内容字段**（色板/渐变预设/工具预设/笔刷库都是本机
    偏好，对称是会话状态，都不进 format/io），因此 `psd.rs` 的兼容矩阵无需新增行；
    `psd-cross-format.mjs` **5/5** 与 `cross-domain.mjs` 中的 PSD 段证明绘画产出仍被声明为可编辑。
  - **公共包说明**：`packages/editor/README.md` 的「绘画域」小节更新为「9 个工具已发布」、
    可写颜色端口与 14 文件验收套件。
  - **受影响模块地图**：`docs/code-map/photocraft.md` 增加 `gesture-settings.ts`、更新
    `tool-manifest.ts`（由「待发布清单」改为「唯一接线表」）与 `tests/features/painting/`
    （14 文件 / 164 断言）；`pnpm codemap:check` 通过（47 manifest / 11 篇 / 1362 链接）。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  **本轮经用户明确授权直接修改共享文件**（此前只能提需求、留在 `[ ]`），因此这条从「待集成
  负责人复核」改为「已完成并逐项登记」。原则未变：共享层只放**唯一的实现**，本域不复制替代
  实现，也不留第二份真相。逐项清单：
  - **门禁与代际（3.3）**：`packages/editor/src/features/workspace-context.ts` 加
    `frozen()`/`documentGeneration()`；`packages/editor/src/editor-workspace.ts` 把内联冻结判断
    抽成 `frozenGate()` 并让 `dispatch()` 与域入口共用，新增 `documentGeneration()`。
    消费方：`features/painting/workspace.ts` 与 `type`/`vectors`/`views` 的 `workspace.ts`
    各加两行（先查 `frozen()`），不复制门禁逻辑。
  - **手势与外壳（3.4）**：`photo-editor-canvas.tsx` 加 `pointerPose()` 真实笔姿态采样、
    单击类工具分支、吸管采样分支；`photo-editor-app.tsx` 加 `canvasTool` 白名单、
    `beginPaintStroke`/`committedPaintStroke`/`commitPaintPoint`、吸管写回与
    `featurePanelContext.setColor`；`photo-editor-shortcuts.ts` 只加 `pencil:"N"`、`eyedropper:"I"`
    （不用 `G`，裸 `g` 必须保持未占用）；`features/index.ts` 加 `featureGesture`/`isFeaturePointTool`；
    `features/shared/tool-parameters.ts` 的 `DocumentPoint` 加真实姿态字段；
    `features/panel-context.ts` 加可选 `setColor` 端口。
  - **共享 barrel**：`packages/protocol/src/index.ts` 一行再导出域内 `workflow.js`（真源仍唯一）。
  - **共享装配断言**：`packages/editor/src/features/boundaries.test.ts` 更新工具清单、9 个
    stroke 工具与分区总数 13；绘画域自己的装配形状断言放在域内 `boundary-regression.test.ts`。
  - **共享画布测试**：`packages/editor/src/photo-editor-canvas.test.tsx` 新增 3 项（单击类工具
    一次事务、吸管免 Alt 连续取色、真笔姿态随 coalesced 采样进入点位且鼠标保持短编码），
    只为覆盖本次接线新增的分支，不改既有用例语义。
  - **共享契约与基线（4.4）**：`tests/fixtures/contract.json`（capabilities 82）、
    `notes/feature-boundary-baseline.json`（`stages.P1b` 19 项、`allowedCommands` +27、contract
    文件 SHA-256）、`notes/feature-boundary-wasm-baseline.json`（重取真实 WASM 快照）。
    这三份是「声明/入口/实际结果」一致性的唯一来源，没有在域内另存副本。
  - **共享说明与地图**：`packages/editor/README.md`、`notes/capability-matrix.md`、
    `photocraft/README.md`、`docs/code-map/photocraft.md`。
  - **宿主测试替身**：`integrations/woohaa/tests/editor-workspace.test.ts` 的 fake 内核补 14 个
    本域绑定桩（`EditorInstance` 放宽后的必需项）；只是替身补齐，不改宿主实现。
  **未变**：`rust/project-limits.json`、`identity.rs`、`Cargo.lock`、`pnpm-lock.yaml` 的 SHA-256
  与基线一致（`pnpm run features:check` 逐份校验通过）；未改 `photo-editor-chrome.tsx`、
  `editor-tool-panels.tsx`、`photo-editor-tools.ts`、`editor-wasm.ts`、`image-project-*.ts`、
  `editor.rs`、`editor/tools.rs`、`wasm.rs`、`capability.rs`、`document_content.rs`、
  `project-verify/src/lib.rs`。`workspace-gate.test.ts` 只**消费**共享控制器公开接口；
  `tests/features/painting/` 只**消费**真实内核 WASM 的公开绑定。

- [x] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  **跨域自动化回归已落地**：新增 `tests/features/painting/cross-domain.mjs`（**25/25**，真实 WASM，
  纳入 `run.mjs` 后套件共 **14 文件 / 164 断言**），覆盖：
  - **绘画 × 选区**：选区由 selections 域建立，渐变被选区裁剪（选区内 `#ff5c00`、选区外仍是
    背景层 `#3366cc`），取消选区不改已提交像素；
  - **绘画 × 图层**：混合模式（Multiply）与不透明度只改合成、不改图层像素；图层蒙版上的笔迹
    把合成还原成下层，一步撤销回到笔迹前合成值（证明没删图层像素）；`channel.target.composite`
    切回后像素绘画写到图层而非蒙版；绘画层可被 `layer.groupLayers` 分组，组不透明度真实影响合成；
  - **绘画 × 历史**：对称笔迹与镜像同一事务、一次撤销同时移除且内容指纹回基线；
    跨域链逐步撤销到空历史、再全部重做回到撤销前指纹；
  - **保存/身份/核验**：`saveProject` 字节 → 重开指纹一致、合成像素与（含组内层的）图层结构一致、
    修订号来自工程；原生核验器 `{"ok":true}`（`upstreamCommit 4e7a17cd…`）；
  - **PSD**：`inspectPsdExport` 仍 `editable:true, blocking:0`，导出字节与报告一致，再导入
    画布尺寸 96×64 一致。
  **UI 层的跨域走查仍未勾选**：本机 Linux 无 `renderD*`（无真实 GPU 渲染会话），工具轨/画布
  拖动的应用内操作与截图属 4.2，继续待具备真实 GPU 的人工验证；本条不拿 WASM 断言冒充 UI 验收。
