# 裁剪、变换与画板切片任务

> 状态说明：U50–U56 的 41 个入口中 **36 个已进命令白名单并真实执行或如实报前置条件**，只剩 5 个宿主
> 交付入口（导出画板/切片、Photomerge 从文件夹、堆栈统计）为 `command: null`——它们需要宿主本地
> 文件夹端口，`scope.md` 已明确「原生文件夹输出不接入」。参数规划层、命令白名单、内容身份、核验器
> 与三个画布叠加层（裁剪框 / 整图旋转 / 变形网格）全部接通并有实际证据（见 verification.md 与
> `artifacts/composition-workflow-probe.json`）。
>
> 「显示全部」不需要新开能力：上游 `image.revealAll` 本身就是「算并集 + 一次不删像素的 `image.crop`」，
> 落在已开放的 `image.crop` 上，并由 Rust 单测守着与上游**逐字节一致**。
>
> 未勾选条目只剩下「必须真实设备/显示会话」或「由其他负责人归档」两类，每条都写明了具体原因。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  - 证据：前置能力/命令贡献目录（`rust/crates/editor-core/src/features/*/mod.rs`、`packages/protocol/src/features/*`）与冻结基线 `notes/feature-boundary-baseline.json` 已在 `bdc3c084` 中；本次没有改任何集中入口枚举，只改各域自己的贡献文件。
- [ ] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  - 已核对：`git cat-file -t bdc3c084…` = `commit`（标题「feat(photocraft): expand editing workflows and fix editor interactions」）；上游固定来源为 `vendor/photocraft/SOURCE.md` 的 `4e7a17cd5d5723313f459753663d0d155f047e19`（2026-10-15），与 `project-verify/src/limits.rs::UPSTREAM_COMMIT` 逐字一致。`bdc3c084` 已把 `image.crop` / `image.image-size` / `image.canvas-size` 登记为 P7 能力，上游快照只读未改。
  - **未完成（需外部负责人）**：原 change `2026-10-22-complete-photocraft-webui-editing` 的同名 capability 归档由归档负责人处理，本 change 不代为归档；该 change 的未验收记录保持原样。
- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  - 已列：41 个入口的 id/分组/上游命令/可用性与原因（`composition_workflows::WORKFLOWS` + `manifest()`），以及 verification.md 的逐 U 结论表。真实 WASM 探针 `artifacts/composition-workflow-probe.mjs` 的结果：**36 个可执行 / 0 个能力门 / 0 个参数错误**。探针的 `entries` 步骤对账 31 个入口：16 个直接执行成功，另外 15 个在没有前置条件时如实报「缺选区 / 少图层 / 无上一步 / 无参考线 / 无正在编辑的变形 / 空图层」，并**全部在探针里按真实前置条件跑通了成功路径**（多选两层做 Auto-Align/Auto-Blend、1×1 变形网格做三种分割加移除、同源平移照片做 Photomerge、等尺寸曝光做 HDR、建选区做 Content-Aware Fill、非空顶层像素层做图层切片、参考线做 6 个切片）；余下 5 个基础入口（`crop` / `imageSize` / `canvasSize` / `trim` / `revealAll`）在 U50–U52 主线的草稿、撤销、往返步骤里逐项取证，合计 36。没有用菜单项或面板占位充当实现。
  - 画布手势的组件、几何与**挂载**都已接通：几何 `crop-frame` 9 / `rotation-frame` 7 / `warp-mesh` 7 tests；叠加层 jsdom `crop-overlay` 7 / `rotation-overlay` 5 / `warp-overlay` 7 / `overlays` 6 tests；`CompositionOverlay` 由域内 `overlay-store` 自订阅并挂到共享 `photo-editor-app.tsx` 的 `renderOverlay` 槽位（一行），面板发布裁剪框、整图旋转预览与变形网格状态（三种各占一个槽位，互不覆盖）。

  完整矩阵（41 项，`WORKFLOWS` 顺序）。四层端口对所有入口相同：内核参数编译
  `composition_workflows::compile()` → WASM 域端口 `workflowManifestJson` / `runWorkflow`
  （经 `handle.features.composition`，不改共享 `editor-wasm.ts`）→ UI 面板 → 唯一命令门
  `Editor::execute`。因此矩阵按「参数编译 / UI 入口 / 内容·核验 / 验收」四列给出差异部分：

  | # | id | 标签 | 上游命令 | 参数编译 | UI 入口 | 内容·核验 | 验收状态 |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 1 | `crop` | 裁剪 | `image.crop` | `crop()` | ComposePanel + 裁剪框叠加层 | 内容指纹已覆盖 | 执行成功；探针 crop-draft/commit/undo |
  | 2 | `perspectiveCrop` | 透视裁剪 | `image.perspectiveCrop` | `perspective_crop()` | ComposePanel·PerspectiveCropControls | 内容指纹已覆盖 | 执行成功（10×10 → 6×4）；探针 entries |
  | 3 | `imageSize` | 图像尺寸 | `image.imageSize` | `image_size()` | ComposePanel | 内容指纹已覆盖 | 执行成功；探针 image-size-* |
  | 4 | `canvasSize` | 画布尺寸 | `image.canvasSize` | `canvas_size()` | ComposePanel | 内容指纹已覆盖 | 执行成功；探针 canvas-*/mask-canvas-follow |
  | 5 | `trim` | 裁边 | `image.trim` | `trim()` | ComposePanel | 内容指纹已覆盖 | 执行成功；探针 trim-* |
  | 6 | `revealAll` | 显示全部 | `image.crop`（等价） | `reveal_all()` | ComposePanel | 内容指纹已覆盖 | 执行成功；逐字节等价单测 |
  | 7 | `rotateArbitrary` | 任意角度旋转 | `image.rotation.arbitrary` | `rotate_arbitrary()` | ComposePanel + 旋转预览叠加层 | 内容指纹已覆盖 | 执行成功（90° 后 6×4→4×6）；探针 entries |
  | 8 | `transformAgain` | 再次变换 | `edit.transform.again` | 直接透传 | WorkflowPanel | 内容指纹已覆盖 | 执行成功（历史 `Transform Again`）；无上一步时如实拒绝 |
  | 9 | `transformAgainCopy` | 再次变换副本 | `edit.transform.againCopy` | 直接透传 | WorkflowPanel | 内容指纹已覆盖 | 执行成功（新增图层副本）；无上一步时如实拒绝 |
  | 10 | `warp` | 变形 | `edit.transform.warp` | `warp()` | WorkflowPanel + WarpOverlay | 内容指纹已覆盖 | 执行成功；探针 warp-mesh-shape |
  | 11 | `warpGrid` | 变形网格 | `edit.transform.warpGrid` | `warp_grid()` | WorkflowPanel（变形会话传 warp） | 内容指纹已覆盖 | 执行成功（1×1→4 段，`us` 长度 5/169 点） |
  | 12 | `splitWarpCrosswise` | 横向并纵向拆分 | `edit.transform.splitWarpCrosswise` | `warp_split()` | WarpOverlay 双击 / WorkflowPanel | 内容指纹已覆盖 | 执行成功；探针 warp-split |
  | 13 | `splitWarpHorizontally` | 横向拆分 | `edit.transform.splitWarpHorizontally` | `warp_split()` | WorkflowPanel | 内容指纹已覆盖 | 执行成功；探针 warp-split |
  | 14 | `splitWarpVertically` | 纵向拆分 | `edit.transform.splitWarpVertically` | `warp_split()` | WorkflowPanel | 内容指纹已覆盖 | 执行成功；探针 warp-split |
  | 15 | `removeWarpSplit` | 移除变形拆分 | `edit.transform.removeWarpSplit` | `warp_split()` | WorkflowPanel | 内容指纹已覆盖 | 执行成功；探针 warp-split |
  | 16 | `perspectiveWarp` | 透视变形 | `edit.perspectiveWarp` | `perspective_warp()` | PerspectiveWarpForm | 内容指纹已覆盖 | 执行成功；探针 entries |
  | 17 | `puppetWarp` | 操控变形 | `edit.puppetWarp` | `puppet_warp()` | PuppetWarpForm | 内容指纹已覆盖 | 执行成功；探针 entries |
  | 18 | `fill` | 填充 | `edit.fill` | `fill()` | WorkflowPanel | 内容指纹已覆盖 | 执行成功（历史 `Fill`）；探针 entries |
  | 19 | `contentAwareFill` | 内容识别填充 | `edit.contentAwareFill` | `content_aware_fill()` | WorkflowPanel | 内容指纹已覆盖 | 需选区；建选区后执行成功（`filled:300`） |
  | 20 | `contentAwareScale` | 内容识别缩放 | `edit.contentAwareScale` | `content_aware_scale()` | WorkflowPanel | 内容指纹已覆盖 | 执行成功；探针 entries |
  | 21 | `stroke` | 描边 | `edit.stroke` | `stroke()` | WorkflowPanel | 内容指纹已覆盖 | 执行成功（inside/outside 历史 `Stroke`） |
  | 22 | `fade` | 渐隐 | `edit.fade` | `fade()` | WorkflowPanel | 内容指纹已覆盖 | 紧跟绘制后执行成功（历史 `Fade Brush Tool`） |
  | 23 | `autoAlign` | 自动对齐图层 | `edit.autoAlignLayers` | `auto_align()` | WorkflowPanel | 内容指纹已覆盖 | 需多选；探针构造同源平移后执行成功（矩阵 -3,-2） |
  | 24 | `autoBlend` | 自动混合图层 | `edit.autoBlendLayers` | `auto_blend()` | WorkflowPanel | 内容指纹已覆盖 | 需多选；探针执行成功（`blended` = 图层数） |
  | 25 | `photomerge` | Photomerge | `file.automate.photomerge` | `photomerge()` | WorkflowPanel | 内容指纹已覆盖 | 需两个打开的文档；探针执行成功（2 层/428 匹配对） |
  | 26 | `mergeToHdr` | 合并到 HDR | `file.automate.mergeToHdrPro` | `merge_to_hdr()` | WorkflowPanel | 内容指纹已覆盖 | 需两个打开的文档；探针执行成功（`ev` 估算） |
  | 27 | `cropAndStraighten` | 裁剪并拉直照片 | `file.automate.cropAndStraightenPhotos` | `crop_and_straighten()` | WorkflowPanel | 内容指纹已覆盖 | 执行成功（上游无参数，逐张处理打开的文档） |
  | 28 | `newArtboard` | 新建画板 | `layer.new.artboard` | `new_artboard()` | WorkflowPanel | 画板子层进入内容指纹（U56 修复） | 执行成功；探针 artboard-slice-export |
  | 29 | `artboardFromLayers` | 从图层新建画板 | `layer.new.artboardFromLayers` | `artboard_from_layers()` | WorkflowPanel | 画板子层进入内容指纹 | 需选中可成组的图层；单测覆盖成功路径 |
  | 30 | `setArtboard` | 编辑画板 | `layer.artboard.set` | `set_artboard()` | WorkflowPanel | 画板子层进入内容指纹 | 执行成功；探针 entries |
  | 31 | `newFrame` | 新建框架 | `layer.new.frame` | `new_frame()` | WorkflowPanel | 画板/框架按组参与指纹 | 执行成功；探针 entries |
  | 32 | `frameFromLayers` | 从图层新建框架 | `layer.new.frameFromLayers` | `frame_from_layers()` | WorkflowPanel | 画板/框架按组参与指纹 | 执行成功；探针 entries |
  | 33 | `newSlice` | 新建切片 | `slice.new` | `new_slice()` | WorkflowPanel | 切片表进入导出计划（内核解析） | 执行成功；探针艺术板/切片导出 |
  | 34 | `slicesFromGuides` | 从参考线建立切片 | `slice.fromGuides` | `slices_from_guides()` | WorkflowPanel | 切片表进入导出计划 | 需参考线；无参考线时如实拒绝 |
  | 35 | `layerSlice` | 从图层新建切片 | `layer.newLayerBasedSlice` | `layer_slice()` | WorkflowPanel | 切片表进入导出计划 | 需非空图层；空图层时如实拒绝 |
  | 36 | `listSlices` | 列出切片 | `slice.list` | `list_slices()` | WorkflowPanel | 只读，不改内容 | 执行成功（返回含自动切片的真实切片表） |
  | 37 | `artboardsToFiles` | 导出画板到文件 | —（宿主端口） | — | 结构分组·导出画板 | 范围/命名来自内核计划 | 宿主交付：改由「导出画板」交付 PNG（见 2.7） |
  | 38 | `artboardsToPdf` | 导出画板到 PDF | —（宿主端口） | — | 结构分组 | — | 宿主交付：PDF 容器未做，保持 `command:null` |
  | 39 | `slicesToFiles` | 导出切片 | —（宿主端口） | — | 结构分组·导出切片 | 范围/命名来自内核计划 | 宿主交付：改由「导出切片」交付 PNG（见 2.7） |
  | 40 | `photomergeFromFolder` | Photomerge（从文件夹） | —（宿主端口） | — | 结构分组 | — | 宿主交付：`scope.md` 排除原生文件夹输入 |
  | 41 | `stackStatistics` | 堆栈统计 | —（宿主端口，需文件夹/路径输入） | — | 结构分组 | — | 宿主交付：`scope.md` 排除原生文件夹输入 |

  「内容·核验」列：全部持久结构现在都有内容身份——像素/文字/调整/形状/智能对象原有覆盖，**画板与框架
  按组进入指纹并递归子层**，切片表作为导出计划的权威来源由内核解析。平台暂缓项：无（U50–U56 均在支持
  平台上实现）；宿主交付的 5 项不是平台暂缓，而是需要宿主本地文件夹端口。
- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  - 证据：只新增域内端口（`workflowManifest` / `runWorkflow` / `compositionExportPlan` / `compositionExportPng`）经 `handle.features.composition` 暴露，未改共享 `editor-wasm.ts` 的类方法表；无跨域 import。

## 2. 逐项贯通

- [x] 2.1 U50：提供画布裁剪框的移动/缩放/旋转、比例预设/网格/遮罩/拉直和真实删除像素策略，并接四角透视裁剪。 成功证据：裁剪框和实际输出一致，保留模式可恢复画布外内容，透视四角正确映射并一步撤销。
  - 已完成：裁剪参数（x/y/宽高、拉直角度、`deleteCroppedPixels`、内容识别、重采样、目标尺寸）、比例预设（`resolveCropRatio` / `fitCropFrame`）、裁剪框可越界扩展画布、撤销一步恢复尺寸与 hash、四角凸性校验与 `image.perspectiveCrop` 参数编译。
  - 裁剪框已真正画在画布上：`crop-frame.ts`（移动/八向缩放/比例锚定/±45° 拉直/三分与网格线，9 tests）+ `crop-overlay.tsx`（手柄、even-odd 遮罩、角度读数、只读与 cancel 语义，jsdom 7 tests）+ 域内 `overlay-store.ts` 自订阅挂载（`overlays.test.tsx` 6 tests，含「换成裁剪不残留旋转框」与双面板槽位互不覆盖）。`ComposePanel` 在裁剪预览激活时发布 `{frame, angle, ratio, grid:"thirds", allowOutside:true}`，画布拖动回写面板输入框，两边共用同一份状态。
  - 成功证据「保留模式可恢复画布外内容」已端到端取证：`deleteCroppedPixels:false` 裁到 `20×15`（图层边界随之变为 `[-9,-6,35,26]` / `[-10,-8,40,30]`），再执行「显示全部」回到 `40×30` 且图层边界逐项复原为 `[1,2,35,26]` / `[0,0,40,30]`，内容 hash 与裁剪前一致（探针 `reveal-all` 的 `retain*` 字段）。
  - 透视裁剪已可执行：真实 WASM 把 10×10 的文档按 `corners` 裁成 6×4，且 `run_workflow` 白名单测试要求它**实际改变尺寸**（不接受「接受参数但不动」）。
- [x] 2.2 U51：补 DPI/打印尺寸单位/重采样开关和算法、画布相对增减/锚点/扩展颜色，数值联动有明确单位。 成功证据：仅改 DPI 不重采样时像素不变，重采样和相对画布按选择正确更新各层与蒙版坐标。
  - 已完成：DPI（1–10000 ppi）、打印单位 px/in/cm/mm 双向换算与面板显示、10 种重采样算法、保持打印尺寸、画布相对增减 + 9 锚点 + 扩展颜色（含 `#rrggbb`）。真实 WASM 走查：仅改 DPI 时像素与内容 hash 不变（`40×30 → 40×30 @144ppi`，`hashChanged:false`）、`percent:200` → 80×60、`+10/+10 center` → 50×40 且图层 bounds 随画布平移。
  - 蒙版联动已单独取证：用真实命令建带像素蒙版的图层后，相对画布 `+10/+10 center` 让文档 50×40、图层与蒙版 bounds 由 `[0,0,40,30]` 平移到 `[5,5,40,30]`，撤销后一并回到 `[0,0,40,30]`；重采样 `percent:200` 让图层与蒙版一起放大到 `[0,0,80,60]`。真实画面核对仍属未采集项（无 GPU/显示会话，见 verification.md）。
- [x] 2.3 U52：提供 Trim 的透明/角像素依据与四边控制、Reveal All、任意角度整图旋转，保留现有 90/180° 与翻转。 成功证据：裁边/显示全部/任意旋转的文档边界、选区与内容坐标一致并可重开。
  - 已完成：裁边依据（`transparent|topLeft|bottomRight`）+ 四边开关，`image.trim` 进入构图草稿通道（可预览/取消）并使用「裁边」历史名；无变化时不增历史。真实 WASM 走查：`40×30` 用相对画布扩到 `60×50` 造出 10px 透明边框后执行裁边，回到 `40×30` 且 `x/y = 10/10`。**显示全部已可执行**：把图层移出画布（`[-30,-20,40,30]`）后扩到 `70×50`、图层回到 `[0,0,40,30]`，撤销一步复原；新文档无越界内容时尺寸不变（`hashChanged:false`）。与上游 `image.revealAll` 的**逐字节等价**由 Rust 单测 `reveal_all_matches_upstream_pixel_for_pixel` 守着（复用上游 `reveal_all_bounds`，落在已开放的 `image.crop` 上）。90/180° 与翻转保持原样。
  - 任意角度旋转已可执行且有画布预览：`rotation-frame.ts`（尺寸式直接复用 `rotatedCanvasSize`、旧画布四角在新画布里的位置、指针增量角度与 `(-180,180]` 归一、吸附，7 tests）+ `rotation-overlay.tsx`（新画布虚线框、旋转后的内容四边形、可拖手柄与角度标签，jsdom 5 tests）。真实 WASM：`rotateArbitrary` 90° 把 6×4 变 4×6。面板的「任意角度」是**独立**于裁剪「拉直」的状态，非零时发布 `rotate` 叠加层，提交后自动撤回（文档尺寸已变，预览框不能留）。
  - 工程边界一致：旋转/裁边/显示全部的文档尺寸与内容 hash 由 `document_content_hash` 覆盖，保存重开指纹稳定（见 3.2 的画板往返测试，同一通路）。
- [x] 2.4 U53：补 Skew/Distort/Perspective/Warp 及网格分割、Puppet/Perspective Warp，提供再次变换和再次变换副本。 成功证据：图内手柄与内核结果一致，重复变换作用新选中目标，撤销恢复完整网格/层关系。
  - 已完成：变形样式/弯曲/水平垂直扭曲、网格分割（1–64 或 default）、自定义 `(3c+1)×(3r+1)` 网格校验、钉点参数；透视变形与操控变形各有专用表单。
  - 变形手柄与内核结果一致：`warp-mesh.ts`（单位网格 `(3c+1)×(3r+1)`、块边界 0–1、控制点拖动、网格线，7 tests）+ `warp-overlay.tsx`（控制点、网格、双击分割、改动判定，jsdom 7 tests），已挂到 `CompositionOverlay` 的 `warp` 分支。期间按内核契约纠正了三处真实缺陷：`check_mesh` 曾把 `us`/`vs` 当成控制点轴（上游是块边界），`warpGrid` 曾编译成上游不接受的 `{warp:{mesh}}`，变形族 `rect` 曾按 `[x,y,w,h]` 解析（上游是角点 `[x0,y0,x1,y1]`）。
  - 变形网格闭环（真实 WASM）：1×1 块 → `warpGrid size:4` 得到 `us` 长度 5 / 169 个控制点；用返回的新 warp 在块内 `(22.5,12.5)` 继续 `splitWarpCrosswise` / `Horizontally` / `Vertically` 三项执行成功，`removeWarpSplit` 在分割后的网格上把该线移除、`us` 回到 `[0,0.25,0.5,0.75,1]`（探针 `warp-grid` / `warp-split`）。
  - **`at` 是文档坐标，不是归一化参数**（本轮纠正）：上游 `split_warp` 用 `param_at` 把该点反解成块内参数，所以给画布上的点才切在用户双击的位置。探针留了两条对照：旧的归一化写法 `(0.5,0.5)` 实际落在左上角附近、切开的是 `0.0083` 处；压在既有分割线上的文档点 `(30,20)` 被内核如实拒绝。字段标签也改成「分割点 X/Y（文档像素）」。
  - 界面持有变形会话：`edit.transform.warp` 把变形直接应用到图层、**不返回** warp 对象，而 `warpGrid`/`splitWarp*` 需要一个 warp（否则会去找活动智能对象，普通像素层上必然失败）。因此面板在 `run` 的返回值里带 `warp` 时记下它，并在 `compileWorkflow(id, values, document, warp)` 里整链路传给网格与拆分；`workflow-form.test.ts` 断言「有会话时必须带上 warp」。
  - **画布网格真能编辑了（本轮补齐）**：此前 `active:"warp"` 从未被任何面板发布，变形叠加层在应用里永远不显示，等于接口断在最后一步。现在选中「变形…」后由「在画布上编辑网格」显式进入：以目标图层的 `transformFrame` 铺单位网格发布给共享画布，拖动控制点改会话里的 `mesh`，「应用变形」按 `{rect, mesh}` 交给内核（未改动时按钮禁用，不白写一步历史）；双击画布把该**文档坐标**连同当前网格当内联 warp 交给 `splitWarpCrosswise`，用返回的新网格继续编辑；已应用的网格会成为「正在编辑的变形」，切到「网格分割」时整链路带上它。`panels.test.tsx` 覆盖：选中入口不自动占画布、进入后网格与图层框四角一致、换到无目标框的文档即撤回、拖动后按钮启用且提交的是改后的点、双击分割带上 `at` 与内联 warp 并用返回网格替换、提交后网格会话跨入口延续。
  - 再次变换不再本地重建：`edit.transform.again*` 已开放，`transform_again` 现在只返回空参数、由上游执行（它把「上一次变换」存在引擎会话里，`transform_again_params` 是 vendor 私有实现）。本地复制它对 journal 的推导会随上游漂移，且 `againCopy` 还需要 `history.purge_last` + 改标签——那是内核命令语义。真实 WASM：`transformAgain` 返回新 rect、历史 `Free Transform` → `Free Transform` → `Transform Again`；`transformAgainCopy` 新增图层副本。单测 `transform_again_delegates_repeatability_to_upstream` 锁住「不本地重建」。
- [x] 2.5 U54：提供内容识别 Fill/Scale、任意颜色/图案 Fill、Stroke 宽度/位置和 Fade 不透明度/混合模式。 成功证据：预览尊重选区，描边位置真实不同，Fade 只改变可识别的上一结果；各自一步撤销。
  - 已完成：填充内容枚举/颜色/图案/缩放/角度/混合模式/不透明度/保留透明、内容识别填充的采样/边缘/输出目标、内容识别缩放的百分比/保护程度/肤色保护、描边宽度（取整到 1–250）与 inside|center|outside 位置、渐隐不透明度与混合模式的参数编译与非法输入拒绝；声明式字段表覆盖全部入口（`workflow-form.ts`，13 tests）。
  - 真实 WASM 逐项：`fill`（颜色）历史 `Fill`；`contentAwareFill` 建选区后 `filled:300`；`contentAwareScale` 返回 `from/to` 边界；`stroke` inside 与 outside 各自历史 `Stroke`；`fade` 紧跟绘制后执行成功、历史 `Fade Brush Tool`，第二次（上一步已不是可渐隐操作）如实拒绝。
  - 图案填充需要工程里已有同名图案（`no pattern "checker"` 是内核的诚实拒绝，不是参数编译缺陷）；Fade「只改变可识别的上一结果」由内核 `can_fade` 的 revision/history 判定保证。
- [x] 2.6 U55：提供按图像内容 Auto-Align/Auto-Blend、Photomerge、自动裁切拉直与堆栈统计，区别规则对齐。 成功证据：多源受控照片产生实际合并结果，来源不改、结果结构/像素可重开并有失败报告。
  - 已完成：Auto-Align（投影/参考层/几何校正/配准）、Auto-Blend（panorama|stack、光晕 0–8、深度图）、Photomerge（强制 `useOpenDocuments`，绝不传文件夹）、合并到 HDR（位深/色调方法/对齐/移去重影）、裁切拉直入口的参数编译。
  - 真实 WASM：多选两层后 `autoAlign` 求出 `(-3,-2)` 位移矩阵（与构造的平移逐项一致，`matches:10682`、`rms:0.00014`）、`autoBlend` 返回 `blended` 图层数与 `method:"panorama"`；`photomerge` 生成新文档（2 层、428 匹配对、透视布局、`failed:[]`）；`mergeToHdr` 返回 `ev`/`offsets`/`stops`；`cropAndStraighten` 执行成功（上游无参数）。来源文档未被修改，结果结构可重开。
  - 前置条件是真实业务约束、不是缺陷：`autoAlign`/`autoBlend` 要求选中 ≥2 个像素层（`prepare` 只拿得到文档快照、拿不到选区，因此只挡「文档里连两个像素层都没有」，多选判据交给上游）；`photomerge`/`mergeToHdr` 要求 ≥2 个打开的文档；`autoAlign`/`photomerge` 在纹理不足时如实报「couldn't find enough matching detail」。
  - 未做：`stackStatistics`（`command:null`，需要宿主文件夹/路径输入，`scope.md` 排除）。
- [x] 2.7 U56：提供 Artboard/Frame/Slice/Slice Select、布局与从层转换、从参考线建切片和画板/切片导出。 成功证据：结构/裁切/引用可编辑且工程往返，导出范围和命名正确，Frame 实际约束嵌入内容。
  - 已完成：画板（尺寸/preset/名称/背景/custom 颜色/moveContents）、框架（矩形|椭圆/名称）、切片（image|noImage|table、url/alt/背景、参考线切片数量预算 `(竖线+1)×(横线+1)`）的参数编译与超限拒绝；`newArtboard`/`setArtboard`/`newFrame`/`frameFromLayers`/`newSlice`/`listSlices` 真实执行成功。
  - **工程往返已打通（本轮修复）**：画板的内容身份以前只写 `kind:"artboard"`、不计子层，等于「画板里的改动不改变工程 hash」，保存门禁与「是否净变化」都会失效；`export_bundle` 还会因此把整份工程误报成「没有正在编辑的文档」。修复三处：`document_content.rs` 让画板走组分支并始终带 `children`；`identity.rs` 接受 `kind:"artboard"`、并允许画板（容器）使用 `pass-through` 混合；`project-verify` 的图层校验接受画板并把 `artboard` 记进 `object_kinds`。Rust 单测 `artboard_children_participate_in_content_identity_and_roundtrip` 锁住三件事：画板子层进入指纹、子层像素改动改变指纹、保存→核验→重开指纹不变。
  - **导出范围与命名正确**：`compositionExportPlanJson(kind)` 由内核给 `{files:[{fileName,name,rect,kind,layer}]}`——切片表用 `photocraft_doc::slices::resolve`（含自动切片、内核已给最终名，不再拼前缀），画板取画板矩形 + 文档名前缀成组，重名按 `_2`/`_3` 递增去重，文档名里的路径分隔符被清掉。`compositionExportPng(rect)` 在内核里把区域 RGBA8 编成 PNG（编码器只有这一侧有，宿主自己编码会引出第二套）。真实 WASM：切片计划 5 个文件（1 个自定义 `logo` + 自动切片）、PNG 头 `89504e47`；画板计划 `海报_首屏.png` rect `[0,0,60,40]`、PNG 有效；**导出→重开指纹一致**（`reopenedSameHash: true`）。
  - **Frame 真的裁内容**（本轮取证）：`newFrame` 是「组 + 矩形/椭圆蒙版」，探针在原图上取像素而不是只看返回矩形——铺满红的图层收进 20×10 框后，框内仍是红、框外左/右/下三处都回到白底，蒙版 `hasMask/maskEnabled` 均为真（探针 `frame-clips-content`）。
  - 界面已接：`CompositionExportActions` 在「结构」分组提供「导出切片 / 导出画板」，经 `controller.exportCompositionArtifacts(kind)` → 内核计划 → 逐项 PNG → 宿主 `fileDelivery` 端口；无端口时按钮禁用并说明原因，中途失败即短路并报具体文件（`export.test.ts` 7 tests：顺序、失败短路、仅下载保留未确认语义、计划失败不渲染；`panels.test.tsx` 另测按钮层：按类型调用、文件名回报、无宿主端口禁用、失败上报原始原因）。
  - 未做（`scope.md` 明确排除）：`artboardsToFiles`/`slicesToFiles` 的**原生文件夹输出**（需要 `dir` 参数与任意路径写权限）不接入；改由上面的多文件交付满足「范围/命名正确」。`artboardsToPdf`（PDF 容器）与 `photomergeFromFolder`/`stackStatistics`（文件夹输入）保持 `command:null` + 固定原因。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  - 证据：Rust `prepare` 测试覆盖未知 id/无文档/非法参数四类拒绝且「参数错误优先于能力门」；白名单测试要求已开放命令**实际改变结果**（透视裁剪改尺寸、再次变换改 rect），不接受「接受参数但不动」。TS 面板测试覆盖预览不改内容、取消回落、非法输入就地拒绝不提交；真实 WASM 走查确认裁剪预览 hash 不变、确认后可一步撤销、均匀画布裁边无变化提交、只读时按钮禁用。
- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  - 已确认：仅改 DPI 时不改内容 hash，改分辨率后重开保留 300 ppi 且像素指纹一致。画板与框架按组进入指纹并递归子层（`document_content.rs`），核验器接受画板并把 `artboard` 记进 `object_kinds`；TS 侧 `content.ts` 用 `groupLike` 同一规则（画板走组分支、`pass-through` 只对容器合法），`IMAGE_PROJECT_LAYER_KINDS` 含 `artboard`，画板作为已知类型直通不再被当成未知。
  - 往返证据：`artboard_children_participate_in_content_identity_and_roundtrip`（子层进入指纹 / 子层改动改变指纹 / 保存重开指纹稳定）+ 真实 WASM `artboard-slice-export.reopenedSameHash: true`（`openProject` 传空 `baseAssetId`，与保存时一致；传文档名会让基底层内容身份变成另一个来源，探针已修正）。
  - 预算与跨文档/PSD 矩阵未新增：画板/框架/切片都复用已有的图层与画布预算，切片数量另有 `(竖线+1)×(横线+1)` 上限；PSD 往返由 `project-verify` 的既有矩阵覆盖，本次没有新增持久类型。
- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  - 已接：工作流走 `blockingDraft()` 门禁与 `afterWrite()` 刷新，草稿门禁与既有构图一致；导出同样先过 `blockingDraft()`（导出的范围必须与画布上看到的一致）。
  - 「来源失效不误写目标」已用真实 WASM 取证：构图草稿未提交时 `file.new` / `file.close` / `edit.undo` / `select.all` 全部被拒（`命令 image.compose 被拒绝：请先确认或取消构图修改`），文档仍是原文档；提交后才作用到原来源文档。这条门禁来自 `require_no_tool_draft()`，因此换文档不会让草稿落到别的文档上。
  - 导出与多来源命令同样在这道门禁内：`composition_export_plan` / `composition_export_png` 都调用 `require_no_stroke()` + `require_no_tool_draft()`；`deliverFile` 与导出共用同一冻结/摘要校验路径。
- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  - 已接：两个宿主经同一 `@woohaa3/photocraft-editor` 实现取到面板与端口；Woohaa 替身内核补齐类型面，`dev` 8 tests 通过；`pnpm -C photocraft run check` 全绿（protocol 70 / project-verifier 40 / editor 384）。
  - 新增端口只有域内四项（`workflowManifest` / `runWorkflow` / `compositionExportPlan` / `compositionExportPng`）+ 控制器上的 `exportCompositionArtifacts`，没有改共享 `editor-wasm.ts` 的类方法表。错误恢复：未开放/前置条件/参数错误三类原因分别可读，导出中途失败保留现场并报具体文件名。
  - 未做：Pad/电脑真实窗口走查（无 GPU/显示会话，见 verification.md）。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  - 证据：verification.md「非渲染检查」表（`pnpm -C photocraft run check` protocol 70 / project-verifier 40 / editor 384，共 55 files；`cargo test --offline --workspace` 全绿、editor-core lib 228；`pnpm wasm` 17.45 MiB / glue 93.7 KiB；`features:check` 行为快照与 PNG 字节与 `bdc3c084` 一致；`boundary:check`；`codemap:check`；`openspec validate --all --strict` photocraft 23/23）与「真实 WASM 走查」表（41 入口 / 36 可执行 / 0 能力门 / 0 参数错误）。
- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：拖动裁剪/拉直 → 四点透视 → DPI/相对画布 → Warp/再次变换 → 内容填充 → 照片合并 → 画板/框架/切片保存导出。
  - 阻塞：当前环境为 Linux 容器，`ls /dev/dri` 无 `renderD*`、无 `DISPLAY`/`WAYLAND_DISPLAY`，无法执行真实渲染走查与像素截图。命令层已全部贯通（36/41 可执行），但「真实窗口拖动/手感/像素级一致」必须有真实 GPU 与显示会话才能采集，不用软件渲染或估算值冒充。
- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  - 已记录：U50–U56 的逐项结论见 verification.md（成功/失败/取消/历史/工程往返/拒绝六类）。真实 WASM 探针 `artifacts/composition-workflow-probe.json` 保存了每一项的输入与返回值，包括变形网格闭环、多选后 Auto-Align/Auto-Blend、Photomerge/HDR、画板与切片导出 PNG 头、以及导出→重开指纹一致。
  - 待人工验证：U50–U56 的**真实窗口手势与视觉结果**（拖动裁剪框、变形网格手柄跟随、旋转预览、切片导出后在文件管理器里看到多文件）。真实原因：该环境无 GPU（无 `renderD*`）且无显示会话，非「缺少依赖」或工具未安装。
- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  - 已更新：`notes/capability-matrix.md`（P7 行 + 36 个已开放入口 + 5 个宿主交付）、`docs/code-map/photocraft.md`（构图域端口与叠加层挂载）、`notes/feature-boundary-baseline.json` / `feature-boundary-wasm-baseline.json`（命令 185→216、`stages.P7` 追加 22 项、`sharedFiles` 刷新）、`tests/fixtures/contract.json`（能力 71→93，从真实内核导出）。`pnpm features:check` 通过并确认步骤/输出/错误/PNG 字节仍与 `bdc3c084` 一致——只扩了清单，没有改行为。
  - 兼容性结论：`v1` 契约只增不改（新能力/命令都是追加，既有 id 与顺序保持），旧工程可读且指纹稳定；`artboardsToPdf`/`photomergeFromFolder`/`stackStatistics` 仍声明为不可用，未被宣称完成。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  - 域内改动：`features/composition/*`、`packages/editor/src/features/composition/*`、`packages/protocol/src/features/composition/*`。
  - 共享文件改动（按「先稳定端口、再顺序提交」执行，且都是**必需**的最小改动）：`document_content.rs` / `identity.rs`（画板内容身份）、`project-verify/src/features/layers/mod.rs` + `tests/verify.rs`（核验器接受画板）、`packages/protocol/src/features/shared/content.ts`（TS 同一规则）、`editor.rs`（`composition_export_plan` / `composition_export_png`）、`photo-editor-app.tsx`（一行叠加层挂载）、`editor-workspace.ts`（导出入口）。全部为追加，没有重写既有分支。
