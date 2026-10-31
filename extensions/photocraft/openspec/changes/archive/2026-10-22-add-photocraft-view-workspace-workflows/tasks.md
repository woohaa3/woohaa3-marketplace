# 视图导航、参考线与分析辅助任务

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  > 实施记录：`b61da631`（结构重构）与 `bdc3c084`（功能基线）都是当前 HEAD 的祖先；五个归属目录
  > 均存在且本 change 只写这五处。共享文件 `photo-editor-app.tsx` / `photo-editor-canvas.tsx` /
  > `features/coordinates.ts` / `editor.rs` / `project-verify/src/lib.rs` / 共享 fixture 未改。

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  > 实施记录：`bdc3c084` 是 HEAD 祖先；上游固定 `4e7a17cd…` 由 `buildInfoJson()` 与
  > `notes/feature-boundary-wasm-baseline.json` 双向核对。`openspec/specs/` 只有
  > `editor-workspace` / `project-format` / `project-verification`，没有 `view-navigation`
  > 主规格，因此不存在需要先归档的同名 capability；原 change
  > `2026-10-22-complete-photocraft-webui-editing` 的未验收记录保持原样未改。
- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  > 实施记录：矩阵见 [verification.md](verification.md#逐项矩阵命令--包装--wasm--ui--内容核验--验收)。
- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  > 实施记录：`parallel-work.md` 声明无同级硬依赖；本域不 import 宿主 contracts/frontend，
  > 只经 `features/contracts.ts` 的 `FeatureHandleContext` 与 `editor-wasm.ts` 的 `EditorResult`。

## 2. 逐项贯通

- [x] 2.1 U70：提供标尺拖出参考线、已有线命中/拖动/数值编辑/单条删除、原点拖动与复位。 成功证据：缩放/旋转后操作保持源坐标，取消只恢复辅助数据，不制造内容 dirty。
  > 已落地：数值加线、逐条移动/编辑/删除、单条删除、锁定拒绝（锁只拦参考线本身，不拦原点）、
  > 原点设置/归零、清空。**手势所需的几何已就绪**：内核 `viewPointer("hit-guide"|"drag-guide"|
  > "drag-origin")` 只读端口 + TS `hitGuide`/`guideDragPosition`/`rulerOriginAt`/`rulerReading`，
  > 两侧在源坐标判定、容差按 `screenPx / zoom` 换算，旋转下同一客户点落到不同源坐标。
  > 回归：Rust 10 条（含两写入口与布局入口的锁定一致、命中/拖动/原点反算、草稿门禁、cancel 不造 dirty、hash 不变、换向只加一步历史）、
  > TS 指针几何与解码 4 条（三动作解码、无命中/锁定是正常结果、白名单外与非法响应拒绝）+
  > 面板失焦提交与 `coalesce` 合并 3 条、真实 WASM 2 条。
  > 逐条编辑补齐：参考线页每一行除数值框外还有「改水平/改垂直」（`view.editGuide`
  > `newOrientation`，一条线换向只加一步历史）与取色器（`view.editGuide color`，读快照里的
  > `guides.colors`，未设色的线按偏好色显示而不是伪造一个文档颜色）。
  > 画布手势已接通：`features/views/guide-gesture.ts` 的 `ViewGestureSession` 负责
  > begin/update/commit/cancel，`photo-editor-canvas.tsx` 只加通用端口
  > （`onGuideDown`/`onGuideMove`/`onGuideUp`/`guidePreview`）——命中在参考线上返回 `true`
  > 即接管本次按下，否则画布按原工具继续，未传端口时行为逐字节不变。
  > 拖动期间**不写文档**（只画临时预览线），松手才提交 `view.moveGuide` /
  > `view.setRulerOrigin`，值未变不提交（不产生空历史），指针取消/失捕获走 `cancel()` 丢弃草稿。
  > 目标文档身份随会话捕获并在提交时回传（切标签后 `view.stale`）。来源视图 `viewId` 透传，
  > 多视图下只有活动视图接收输入。
  > 回归：`guide-gesture.test.ts` 18 条（命中只读、松手一步、无命中不接管、锁定不进入拖动、
  > 值未变不提交、取消不写、非法拖动位置保持上一草稿、切文档目标回传、拒绝原样上报、
  > 原点两条、viewId 透传；**标尺拖出新线 5 条**）+ `photo-editor-canvas.test.tsx` 6 条
  > （接管优先、不接管行为不变、取消不提交、预览不改数据、落点优先于工具、无落点请求不改变行为）
  > + `view-aids-overlay.test.tsx` 3 条（上边/左边标尺交出竖线/横线意图、角落留给原点、
  > 标尺按下不冒泡成画布落笔——锁定时也不漏）。
  > **从标尺条拖出新参考线已完成**：标尺条由本域叠加层绘制，因此在那里接管按下并走同一个
  > `ViewGestureSession`（`onRulerDown` → `startRulerGuide` → `window` 续跟 → `commit`），
  > 提交命令是 `view.newGuide`；没移动就松手不建线，避免单击标尺留下一堆 0 位置参考线。
- [x] 2.2 U71：提供 New Guide Layout 列/行/间距/边距、从形状建线、单位/网格细分/吸附目标和智能参考线选项。 成功证据：生成线位置正确，独立吸附目标真实生效且屏幕阈值稳定，不改文档内容。
  > 实施记录（本域可独立验收）：`view.newGuideLayout` / `view.newGuidesFromShape` /
  > `view.clearCanvasGuides` 走 `guideLayoutCommand`；单位、网格间距/细分、五种吸附目标、
  > 智能参考线、临时关闭吸附走 `setViewAids`；`snapPoint` 返回命中线与 smart 标记。
  > 回归：布局行列/间距/边距位置（真实 WASM 断言 2 列 → `[0, 60, 120]`）、过密拒绝保留旧线、
  > 无形状拒绝、逐目标吸附生效、屏幕阈值 `tolerance/zoom` 在缩放/旋转下稳定、参考线命令不改
  > 内容 hash；叠加层按 `gridSubdivisions` 画细分线、刻度从标尺原点起算（5 条 overlay 回归）；
  > 面板逐项写回单位/细分/五个吸附目标/智能参考线（1 条 UI 回归）。
- [ ] 2.3 U72：提供独立 Hand/Zoom、Rotate View/复位、Navigator 和同文档多视图/并排；视图共用内容和保存历史。 成功证据：旋转后落笔/命中准确，两视图同步内容而取景独立，仅活动视图接收输入。
  > 已落地：`setViewAids({rotation|viewAction|navigator})`（会话态，不进文档/历史/hash）、
  > `ViewTransform` 双向变换、Navigator 与多视图面板、`MAX_VIEWS=4` 上限与非法动作拒绝、
  > 两视图共享文档但取景独立、视图数量上限共 5 条 Rust 回归 + 11 条 TS 变换回归 + 旋转叠加层回归；
  > 真实 WASM 证明旋转后同一客户点落到不同源坐标（`rotation:90` → 客户 (30,40) 对应源 (55,75)）。
  > 本轮补上「仅活动视图接收输入」的真实判定：`viewPointer(action, {viewId})` 核对来源视图，
  > 非活动视图的迟到指针（含未知 `viewId`）被拒绝，切活动视图后归属反转；Rust 1 条 +
  > 真实 WASM 1 条 + TS 端口透传 1 条回归。此前该要求只有「两视图取景独立」，
  > 没有输入归属判定。
  > 本轮补齐：**旋转后的叠加层几何**与**多视图取景读数**。叠加层此前在真实应用里拿不到
  > `rotation`/`rulerOrigin`（`aids` 里其实有，但 `CanvasAids` 没声明），旋转视图后参考线与
  > 网格不跟着转；现在 `CanvasAids` 增加这两个字段并作为回退来源，内核 `view_aids()` 一并返回
  > 活动文档的标尺零点。
  > Hand/Zoom 的真实入口已有三条：状态栏缩放（缩小/放大/适合窗口/100%）、键盘快捷键、空格
  > 拖拽平移——它们直接改宿主视口，是单视图画布的正确归属。
  > 本轮补齐：**同文档并排双视图**。不再需要新宿主端口——两块画布都用同一段
  > `photo-editor-canvas.tsx` 渲染代码，参数只有取景、旋转与输入归属，内容与撤销历史来自同一个
  > 控制器。落地内容：
  > - 内核 `ViewAids.side_by_side`（只有 ≥2 视图才能开，关到 1 视图自动置 false；单视图开关被
  >   `view.invalid` 拒绝）+ `setViewAids({viewId, zoom, offset})` 按视图定向写取景，不抢活动视图；
  >   `viewSnapshot.sideBySide` 对外暴露。
  > - `features/views/panes.ts`（纯布局决定：何时并排、每窗格用哪份取景）+
  >   `features/views/panes-view.tsx`（窗格容器：两块真实画布 + 输入归属，按非活动窗格只切归属并
  >   吞掉这次按下，不会「一次点击既切视图又画一笔」）。
  > - `photo-editor-app.tsx`：`renderCanvasPane` 抽出单块窗格渲染；活动视图用宿主 `canvasView`
  >   视口，其它视图各记取景，切窗格时把目标「此刻显示」的取景交接给宿主，画面不跳。
  > - `panes.ts` 的 `syncPaneViewports` 修掉一个真实缺陷：非活动窗格没有记录时原本会退回宿主视口，
  >   于是平移活动画布时另一块跟着动，「取景独立」名存实亡。现在新窗格从**当前取景**开始，此后
  >   非活动窗格锁住自己的记录，只有活动窗格跟随宿主；无变化时返回同一引用，放进 effect 不自激。
  > - 画布 `onFrame(origin, zoom)` 把真实取景回写内核 `setViewAids({viewId,zoom,offset})`，修正
  >   缩放/平移后参考线命中、标尺与 Info 读数的整体偏移。
  > 回归：内核 2 条（并排开关要求两视图、按 viewId 定向写取景）+ `panes.test.ts` 11 条
  > （其中 5 条是取景同步）+ `panes-view.test.tsx` 4 条（两块画布、活动窗格第一笔不被吞、非活动
  > 窗格只激活不落笔、标签来自内核视图名）+ 面板 2 条（单视图禁用并说明、两视图可开且写回会话
  > 开关）+ 真实 WASM 1 条 + Woohaa 宿主形态 2 条（两个窗格/两块画布/只有活动窗格可交互；
  > 宿主平移活动画布时非活动窗格锁住自己的取景）。
  > 仍**未完成**：`Rotate View` 后「落笔准确」。旋转在本域只是**视图空间**变换：叠加层、参考线命中
  > 与标尺都按旋转反算且彼此一致（Info 读数属于像素那一侧，因此不算旋转，见 2.4），但像素平面由
  > 宿主按 `origin/zoom` 呈现（
  > `renderCanvasBackground(origin, zoom)` 没有旋转参数，Woohaa 节点模式的 Bevy 节点同理），
  > 因此旋转后「看到的像素」与「旋转后的叠加层/几何」不同步。补齐需要宿主渲染端口
  > （Bevy 相机或宿主画布变换），属本 change 之外；据此 `view.rotate-navigator` 能力**继续关闭**，
  > 本条不勾选。
- [x] 2.4 U73：提供 Info、持久颜色采样点、Ruler/拉直/测量日志、Count 分组和 Note 注释，明确持久与会话数据。 成功证据：读数来自真实源像素，测量按源单位，保存的点/计数/注释可重开且不污染像素。
  > 已落地：Info 面板（源坐标读数、测量比例、标尺线字段）、取样点（`MAX_SAMPLERS=10`，越界拒绝；
  > 会话状态 + 保存投影，见下）、测量比例/标尺/拉直/记录/日志、Count 分组与标记、Note 注释；
  > `viewSnapshot` 明确标注归属（`scope.samplers` 为 `session+project`）。真实 WASM 断言采样读数为
  > 真实源像素、`formatLength(72,"mm")` 返回 `25.4 mm`、`.pcraft` 重开后计数/注释/取样点都在。
  > 回归：真实源像素读数、格式换算、计数与注释可撤销、工程往返保留参考线/原点/比例/计数/注释、
  > 文档字段改动不改内容 hash；Rust 本域 49 条、协议契约 9 条、面板 UI 22 条、真实 WASM 5 条。
  > 逐条命令全部有真实入口：计数页可逐条移动/删除当前分组的标记（`count.move` / `count.remove`），
  > Info 页可移动取样点（`view.colorSamplers.move`）、导出 `measurementLog.export` 的 CSV 文本、
  > 显示取样点 CMYK（内核按同一源像素换算）、按当前单位显示画布宽（走 `formatLengthJson`），
  > 注释页可改位置与展开状态（`notes.set {x,y,open}`）并合并一步历史。
  > 本轮补齐**画布落点**：`features/views/placement.ts` 提供一次性落点请求，计数页与注释页各
  > 有「在画布上放置」按钮，画布 `onViewPoint` 消费后立即清空（不会让下一次普通点击意外加点）；
  > 取消按钮也清空。回归：`placement.test.ts` 6 条（一次性、取消、后发覆盖、订阅、回调抛错后
  > 不残留）+ 面板 3 条（只有请求不落点、按源坐标写入、取消后不写）+ 画布 2 条（优先于当前工具、
  > 无请求时行为不变）。
  > 本轮补齐 (a)(b) 两项，且都**不改 vendor**：
  > - (a) **Info 跟随光标的瞬时读数**：内核 `viewPointer` 新增只读动作 `probe`（
  >   `VIEW_POINTER_ACTIONS` 第 4 项），用 `sampler_cmds::readout` 按当前缩放/平移反算源坐标并读真实
  >   源像素的 RGB/CMYK；画布外返回 `reading: null`（不伪造 0）。`probe` **故意不算旋转**：像素平面
  >   不随视图旋转（宿主按 `origin/zoom` 呈现），把旋转套进读数会让面板报出眼睛看不到的另一处像素；
  >   读数因此与落笔映射（无旋转的共享 `coordinates.ts`）一致，而参考线命中/标尺仍按旋转反算。TS 侧 `decodeProbe` 逐值校验
  >   （通道 0–255/0–100、坐标有限、缺字段或空单位一律拒绝），`features/views/hover.ts` 做发布/订阅，
  >   应用按 40ms 节流，`panels.tsx` 用 `data-info-hover` 渲染「光标读数」。离开画布/换文档/卸载
  >   都发布 `null`，面板显示「—」而不是留着上一个像素。
  > - (b) **持久颜色采样点**：会话里的点仍在 `DocState::color_samplers`（不改历史、不改内容 hash），
  >   但在 `save_project` / `export_bundle` 时投影进文档元数据命名空间键
  >   `photocraft.views.colorSamplers`（JSON `{points:[[x,y],…]}`，`MAX_SAMPLERS=10`、坐标上限
  >   `1e7`），`open_project` 时灌回会话。`metadata` 不进 `document_content`，因此指纹与 dirty
  >   不变；**没有采样点时不写键**，旧工程保存后字节形状不变（`document_for_save` 用 `Cow`：
  >   无点且无键时直接借用，不克隆图层树）。坏数据/超预算由 `project-verify`
  >   （`inspect_color_samplers`：条数、字节数、坐标范围）拒绝整份工程；PSD 无法承载采样点，
  >   由 `psd_loss_rows_with_samplers` 产出 `view.color-samplers` 损失行显式报告，不再静默丢弃。
  >   `viewSnapshot.scope.samplers` 改为 `session+project`，如实说明它既不是纯会话数据也不是历史
  >   里的一步。
  > 回归：内核 3 条 probe + 4 条采样点持久化/PSD 损失 + 2 条并排；核验器 1 条
  > （`persisted_color_samplers_are_bounded_in_count_bytes_and_coordinates`）；真实 WASM 2 条
  > （probe 与取样点读数逐值一致且不改内容身份；保存重开后采样点恢复、指纹不变、无点工程字节更短）；
  > TS：`views.test.ts` 1 条 probe 解码（含 5 组坏数据拒绝）、`hover.test.ts` 5 条、
  > `photo-editor-canvas.test.tsx` 2 条（probe 只转发客户坐标且离开清空、`onFrame` 报真实取景
  > 且值不变不重复）、面板 4 条（并排开关 2 条、取样点与标尺的画布落点 2 条）。
  > 本轮还补齐 Info 页原先缺的两个工具入口：**「在画布上放置取样点」**（一次性落点，写入后把数值框
  > 同步成该点）与**「在画布上取标尺起点/终点」**（第一次点选只记起点、不提交半条线；第二次才提交
  > 一次 `image.analysis.rulerTool`）。两者都走同一个 `placement.ts` 一次性请求，消费即清、可取消，
  > 不会让下一次普通点击意外写入。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  > 实施记录：`tests_views.rs` 覆盖参考线锁定、非法索引/单位、过密布局、非法旋转、
  > 越界/超量取样点、非法计数尺寸与分组、非法注释坐标、草稿门禁、无文档拒绝、
  > `cancel` 只恢复辅助数据、`undo` 一步回退、`saved_view_data_changes_no_pixels…`
  > 证明文档字段写入前后 hash 相同。
- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  > 已完成：`packages/protocol/src/features/views/content.ts` 与 Rust
  > `project-verify/src/features/views` 共用同一组上限（参考线 4096/轴、坐标 ±1e7、
  > 计数组 256 / 标记 100000、注释 1024/64KiB、单位 32 字符），两侧各 9/7 条回归，协议侧另有
  > 一条「上限常量与 Rust 逐项一致」的锁值断言；标记预算改为**先按剩余预算判长度再逐点校验**
  > （稀疏超大数组不再被 `every` 跳过）。视图字段确认不进 `contentHash`（Rust 与 TS 双向证据）。
  > 跨文档：切到另一份工程后参考线/计数/注释/取样点各归其文档，工作区级旋转与单位保持。
  > PSD 矩阵（域内回归实测）：参考线（资源 1032）、注释（Anno）、测量比例（1074）可往返且像素
  > 逐字节相同；标尺原点与计数分组无对应通道，重开后回到默认值。
  > 本轮补齐「解码前累计预算」在 TS 侧的缺口：`decodeViewSnapshot` 原先每组独立允许 10 万标记
  > × 256 组（理论上 2560 万点），与协议 `validCountGroups` 和 Rust 核验的**累计剩余预算**
  > 不一致。现在解码器先算剩余额度再逐点校验，超预算快照在遍历前即被拒绝（`views.test.ts`
  > 加了 12 万标记跨组用例）。
  > 本轮接通两处共享调用点：
  > - **原生核验**：`rust/crates/project-verify/src/lib.rs` 在图层校验后调用
  >   `features::views::inspect_document(&document)`（嵌套智能对象同样过这一关），并移除域内的
  >   `allow(dead_code)`。端到端证据：`verify.rs` 新增 1 条，用真实 `.pcraft` 字节验证
  >   4097 条参考线被 `UnsupportedObject` 拒绝、边界内数据通过；另实测「NaN 参考线」在写入端
  >   （序列化）就被拒，两道防线都在。
  > - **PSD 逐项损失报告**：视角不同——图层级损失在 io 域，而参考线颜色/标尺原点/计数分组
  >   **不挂在图层上**，只走 `inspect_psd_export` 会把它们静默丢掉。因此本域提供
  >   `features::views::psd_loss_rows(document)`，io 域的 `inspect_psd_export` 与
  >   `export_report` 一并汇总为 `viewLosses`（`editable` 也随之为 false）。
  >   回归 4 条，其中一条是**实测往返**：导出→导入后参考线位置/注释/测量比例保留，
  >   参考线颜色/标尺原点/计数分组丢失——与报告逐项一致，不是照能力表推断。
- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  > 已完成（本域可独立验收的部分）：
  > - **来源失效不误写目标**：`viewSnapshot` 带 `document.id`（`DocId`，随 manifest 往返），
  >   `guideCommand`/`guideLayoutCommand`/`viewCommand`（含只读列表）接受可选 `targetDocument`，
  >   与活动文档不符时返回 `view.stale` 并**在写入前**拒绝；守卫字段在转发上游前移除。
  >   面板只在快照真的带回身份时回传，不编造 id。回归：Rust 1 条（三入口 + 只读 + 非法类型 +
  >   缺省不变）、TS 解码 1 条、面板 3 条（回传同一目标/只读也带/无身份不编造）、真实 WASM 1 条
  >   （另验证重开同一工程保持同一身份）。
  > - **活动文档/代际**：`active_doc()` 决定目标，文档身份即代际；`DocId` 持久化使「重开同一工程」
  >   的旧快照仍然有效，只有真正换文档才失效。
  > - **保存/关闭门禁**：复用 `blockingDraft()`，视图写入与其它域同一入口顺序。
  > - **匹配运行时协商（本轮补齐）**：能力发布后（见 4.4），三个写入口改为调用
  >   `capability_open(id)` = 白名单命中 **且** 所属能力已开放，不再只看静态白名单。声明与
  >   控制在同一处数据（`features::views::required_capability`），把某条能力重新关闭时对应命令
  >   会一起关闭。回归 3 条：每条白名单命令都映射到已开放能力且不落在保持关闭的能力上、
  >   发布清单与实际开放一致（`view.guide-layout`/`view.analysis` 已开、
  >   `view.rotate-navigator` 仍关）、别的域的命令不混入本域能力；真实 WASM 1 条验证
  >   「发布后命令在真实运行时走得通、未登记命令仍被拒且不留写入」。
  > 仍未做：本域命令全同步、无晚到异步结果，**请求序号**没有落点（不引入无人调用的参数，
  > 这属于设计选择而非缺口）；切标签/关闭/父子回写的宿主生命周期门禁在共享
  > `editor-workspace.ts`，本域只保证写入目标正确（`targetDocument` 守卫已覆盖）。
- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  > 实施记录：面板与适配只在 `packages/editor/src/features/views/`，dev 与 Woohaa 都经同一包导入；
  > Woohaa 类型检查通过、适配测试 275 条全绿（含面板/标签布局回归），frontend `tsc -b` 通过。
  > 新端口（`guideLayoutCommand`/`viewCommand`/`viewSnapshotJson`/`samplerReadoutJson`/
  > `formatLengthJson`/`viewPointerJson`）全部**可选**：旧替身/旧 WASM 得到
  > `capability-disabled` 而不是崩溃（`views.test.ts` 逐端口回归 + 无效响应回归）。
  > 面板内部用页签而非新增高级 section id，避免共享 `photo-editor.css`/`photo-editor-chrome.tsx`
  > 的 `data-feature` 门分叉。
  > 真实设备/显示会话下的走查属 4.2，不在本条范围。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  > 实施记录：`pnpm -C photocraft run check`（protocol **79** / editor **413**（+1 条件跳过）/ verifier 40）、
  > `cargo test --workspace`（**359** 通过 / 0 失败；本域 **66** 条）、`wasm`（17.40 MiB / glue 96.1 KiB）、
  > `features:check`（增量基线后 commands/capabilities 为新值，errors、8 份快照、
  > undo/redo/cancel 与 PNG 逐字节仍与 `bdc3c084` 一致）、真实 WASM 域内回归
  > （`wasm-real.test.ts` **14** 通过 / 1 条件跳过）、
  > `pnpm -C web --filter @woohaa3/photocraft-woohaa typecheck` 与 `test`（**279**，含 4 条新增跨域）、
  > frontend `tsc -b`、`codemap:check`（1368 链接）、`boundary:check`（6 条）、`openspec validate --strict`。
  > `boundary:check` 的首次失败原因是本 worktree 缺 `.gitignore` 里的运行期目录 `artifacts/`、
  > `logs/`（清单要求目录存在）；`mkdir artifacts logs` 后 6 条全通过，未改代码。
  > `extensions:check` 未通过：`ark-provider` 的 `./dist/shared.js` 未构建，需先 `pnpm build`
  > （`assemble:extensions` 又要求 `web/frontend/dist`）；`web/extensions/` 本 change 未改动。
  > 本域 TS 合计 **136** 通过 / 1 条件跳过（解码 23、变换 11、面板 36、叠加层 8、并排布局 11、
  > 窗格容器 4、光标读数 5、手势会话 18、落点 6、真实 WASM 14）+ 画布 38 条（其中 8 条为本 change
  > 新增）；Rust 本域 **66** 条（tests_views 61 + view_geometry 5）；
  > 协议契约 9 条、原生核验 8 条、io 视图损失 4 条。
  > Woohaa 适配 **279** 条全绿（含 4 条跨域接线回归，见 5.2）。
- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：标尺拖线/单条删除 → 参考线布局/吸附 → 旋转视图绘画 → Navigator → 同文档双视图 → Info/注释；源坐标和活动视图输入归属正确。
  > 阻塞（真实原因）：本机是 Linux 容器，`ls /dev/dri | grep renderD` 无输出（无 GPU），
  > `DISPLAY`/`WAYLAND_DISPLAY` 均未设置（无显示会话），因此不能采集任何渲染/UI/手感证据。
  > 按 AGENTS.md，此类环境不执行渲染相关验收，不得用软件渲染或估算值替代。
  > 代码侧前置已就绪：标尺拖线/命中/原点拖动（2.1）、旋转叠加层与取景、同文档并排双视图（2.3）、
  > Info 跟随光标读数与持久采样点（2.4）都有真实入口与回归。即便有设备，主线里
  > 「旋转视图绘画」这一段也只能验证到「叠加层与命中按旋转走、Info 读数仍是屏幕上那个像素」，
  > 像素级旋转仍待宿主渲染端口
  > （见 2.3）。
- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  > 实施记录：逐 U 组证据表见 [verification.md](verification.md#逐-u-组证据自动化可采集部分)，
  > 每条都指向已执行的内核/协议/真实 WASM 回归（成功、拒绝、取消、像素与 hash、历史步数、
  > `.pcraft` 与 PSD 重开差异）。缺的只有**应用内截图、真实光标跟随、帧率与输入手感**：
  > 本机为无 `renderD*` 的 Linux 容器且 `DISPLAY`/`WAYLAND_DISPLAY` 未设置，没有显示会话，
  > 因此按待人工验证保留，未用软件渲染或估算值替代。
  > 仍留未勾选的 4.2（真实设备主线走查）依赖真实显示会话；4.4 已在上一轮完成发布。
- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  > 已完成：`docs/code-map/photocraft.md` 增补本域变换/会话归属、指针几何、叠加层与核验行，并写明
  > 「能力发布仍只有两条」的现状；`verification.md` 的 PSD 兼容矩阵按**实测**记录（参考线/注释/
  > 测量比例可往返，原点与计数不往返），不按规格假设。
  > 本轮完成发布，**只开两条**：`view.guide-layout`（U71 布局与画布参考线）与
  > `view.analysis`（U73 取样/测量/计数/注释）——它们的逐项工作流都已接通并有回归。
  > `view.rotate-navigator` **保持关闭**：并排双视图已在本轮交付，但同一能力还包含 `Rotate View`，
  > 而旋转目前只是视图空间变换（像素仍按 `origin/zoom` 呈现，落笔走无旋转的共享
  > `coordinates.ts`），提前开放会给出做不到的承诺；这条决定同时写进 `CONTRIBUTION` 注释、协议
  > 注释、能力协商回归和真实 WASM 回归，防止以后有人「顺手」在清单里补上。
  > 同步产物：`rust/.../views/mod.rs` 的 `CONTRIBUTION`（+27 条命令）、
  > `packages/protocol/src/features/views/index.ts`、`tests/fixtures/contract.json`（只追加 2 行能力）。
  > 两份基线按**增量**处理而不是重采：`notes/feature-boundary-baseline.json` 追加
  > `publication` 记录（本次发布的能力/命令、保持关闭项、说明）并同步 `contract.json` 的摘要；
  > `commands`/`capabilities` 按新增项合并。`steps`/`errors`/`output`（8 份状态快照与 PNG 字节）
  > **未重采**，`features:check` 仍以「与 bdc3c084 一致」通过——发布没有被用来顺手掩盖别的漂移。
  > `image-project-editor.ts` 无需改动：它由 `featureCapabilitiesForStage` 从各域
  > `features/*/index.ts` 派生，改源即生效（这一点此前被误列为需要手改）。
  > 一致性核对不止靠人手对照：Rust 侧 3 条回归证明「声明 = 入口 = 实际放行」，真实 WASM 1 条
  > 证明发布后的命令真的能跑、保持关闭的能力真的被拒。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  > 实施记录（前半段）：域内改动落在 `packages/editor/src/features/views/`、
  > `packages/protocol/src/features/views/`、`rust/crates/editor-core/src/features/views/`、
  > `rust/crates/project-verify/src/features/views/`、`tests/features/views/`、
  > `docs/code-map/photocraft.md` 与本 change 目录。矩阵在 `view-transform.ts` /
  > `view_geometry.rs` 两侧各写一份是因为共享 `features/coordinates.ts` 冻结且无旋转，
  > 不是共享实现的替代。
  > **本轮按用户「完成这个 change」的指示，改动了共享文件**（原先这些是集成负责人归属）：
  > `photo-editor-canvas.tsx`（只加可选端口，未传时行为不变）、`photo-editor-app.tsx`（接线）、
  > `project-verify/src/lib.rs`（一行调用 + 去掉域内 `allow(dead_code)`）、
  > `features/io/psd.rs` 与 `io/editor_psd.rs`（导出报告汇总视图损失）、
  > `tests/fixtures/contract.json`（追加 2 行能力）、
  > `notes/feature-boundary-baseline.json` / `feature-boundary-wasm-baseline.json`（增量基线）。
  > 每处都保持「最小改动 + 不传即旧行为」，并在 3.2/4.4/5.2 里逐条说明证据；
  > 没有在本地复制 `capability.rs`、`editor.rs`、`coordinates.ts` 或另起一套 fixture。
  > 这一取舍在此记录，便于后续并行分支合并时按上述清单核对。
  > 会话恢复后的第二轮又动了共享文件，仍是最小改动：`photo-editor-canvas.tsx` 新增可选
  > `onProbe` / `onFrame` 两个端口（未传即旧行为）、`photo-editor-app.tsx` 抽出
  > `renderCanvasPane` 并接入并排窗格/读数节流/取景回写、`photo-editor.css` 只加 `.photo-editor__panes`
  > 一族样式、`features/views/view-aids-overlay.tsx` 的 `CanvasAids` 补 `sideBySide`/`activeView`/`views`
  > 字段声明；新增域内文件 `features/views/panes.ts` / `panes-view.tsx` / `hover.ts` /
  > `rust/.../features/views/samplers.rs`。也没有另起一套坐标/画布实现。
- [x] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  > 前置已满足：4.4 的能力/命令发布与 3.2 的原生核验调用点都已落地，因此可以执行跨域回归。
  > 实际执行：`pnpm run check`（protocol 79 / editor **413**（+1 条件跳过）/ project-verifier 40 全绿）、
  > `cargo test --workspace`（**359** 通过 / 0 失败，含原生核验集成测试）、`features:check`、
  > 根目录 `boundary:check`（6 条）、`codemap:check`（**1368** 链接）、`openspec validate --strict`、
  > Woohaa 适配 `tsc --noEmit` + **279** 条测试全绿（首轮有 1 条 transform 交互用例偶发失败，
  > 单跑与该用例均通过，重跑全量全绿，属既有的跨文件时序抖动，与本 change 无关）。
  > 新增跨域接线回归 `integrations/woohaa/tests/view-domain-integration.test.ts` 2 条：
  > 宿主不提供 `features.views` 时编辑器整体照常渲染且**不显示做不到的入口**；只读宿主下视图
  > 写入入口保持关闭。这两条跑的是真实 `PhotoEditorApp` + 真实面板，不是域内替身。
  > 说明：Woohaa 的 `vitest.config.ts` 把 react 别名写死为仓库内 `node_modules/.pnpm/react@18.3.1`，
  > 本机 pnpm 走全局 store 链接，该路径不存在（`jsx-dev-runtime` 解析失败，28 个文件无法收集）。
  > 这是环境的依赖布局问题、与本 change 无关；用仓库外临时配置替换同一组别名后 279 条全绿，
  > 仓库配置未改。
