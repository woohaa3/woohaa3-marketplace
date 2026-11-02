# 验收计划与记录

## 本次实施状态

U50–U56 已**整体贯通**：参数规划（Rust `composition_workflows` + TS `workflows.ts` / `workflow-form.ts`）、
命令白名单（41 个入口中 36 个可执行、5 个宿主交付保持 `command:null`）、内容身份与核验器（画板/框架按组
递归、切片表由内核解析）、三个画布叠加层（裁剪框 / 整图旋转预览 / 变形网格，含共享槽位挂载）、
WASM/工作区端口、画板与切片导出（内核给计划与 PNG 字节，宿主交付端口落盘）以及全量回归与真实 WASM 走查。

剩下未勾选的两项是**必须有真实 GPU 与显示会话**的窗口走查（4.2），以及**由其他负责人归档**的原 change
前置（1.1）；具体原因写在各自条目里，不用「已覆盖组数」或阶段名宣称完成。

实施任务见 [tasks.md](tasks.md)。

## 必须验证的主线

拖动裁剪/拉直 → 四点透视 → DPI/相对画布 → Warp/再次变换 → 内容填充 → 照片合并 → 画板/框架/切片保存导出。

每个 U 编号及其子能力分别记录：实际入口/参数、预览、确认/取消、内容 hash/修订/历史、工程往返、核验器结果，以及 spec 中特有的失败条件。只验证菜单存在或只检查命令字符串不算完成。

## 非渲染检查（本次实际执行）

在 Linux 工作副本 `/data/workspace/woohaa3-openspec-2026-10-22-add-photocraft-composition-workflows` 执行：

| 命令 | 实际结果 |
| --- | --- |
| `pnpm -C photocraft run check`（build + typecheck + test） | 通过。`packages/protocol` 70 tests / 3 files，`packages/project-verifier` 40 tests / 2 files，`packages/editor` **384 tests / 50 files**（其中构图域 14 files / 130 tests） |
| `cargo test --offline --workspace`（photocraft/rust） | 通过，**307 passed / 0 failed**（editor-core lib **228**、contract_fixture 4、editor 13、interaction_state 25、project-verify lib 8、limits_agree 1、native_binary 3、smart_source 10、verify 15，其余为 0 项的空测试二进制） |
| `pnpm -C photocraft run wasm` | 通过，产物 `packages/editor/dist/wasm`：wasm **17.45 MiB**、glue **93.7 KiB**（重新构建后走查脚本读到 41 个入口） |
| `pnpm -C photocraft run verifier` | 通过，原生核验工具 3.84 MiB |
| `pnpm -C photocraft features:check` | 通过：「Feature boundary equivalence: commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match `bdc3c084`」——命令 185→216、能力 71→93 **只是追加**，步骤/输出/错误/PNG 字节与基线一致 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过，**275 tests / 34 files** |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过（替身内核带 `workflowManifestJson` / `runWorkflow` 端口） |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `pnpm boundary:check` | 通过（6 tests） |
| `pnpm codemap:check` | 通过：47 个 manifest、11 篇文档、1363 个本地链接、8 个模块入口清单 |
| `pnpm -C photocraft/dev` `npx vitest run` | 通过，8 tests（A/B 工作区协调） |
| `npx openspec validate --all --strict`（在 `photocraft/`） | 通过，**23 passed / 0 failed**（仓库根跑会连带校验与本 change 无关的 spec，其告警不属本次范围） |

域内回归：构图域共 14 个测试文件 / 130 tests。

- `workflows.test.ts`（25 tests）：清单解析拒绝半截入口、比例与框内合比例、裁剪角度归一/目标尺寸/重采样、
  透视四角凸性、打印单位互换、DPI 与保持打印尺寸、相对画布与扩展颜色、裁边四边、旋转后画布尺寸、
  变形样式/网格/钉点（`src`/`dst`）/透视平面（`quad`+`rect`）/分割点，填充/描边/渐隐、自动对齐/混合/
  Photomerge/合并到 HDR、画板/框架/切片命名与超限。
- `workflow-form.test.ts`（13 tests）：字段表完整性、能力门只认 `allowed === true`、每个入口的参数字段与
  拒绝路径、图像尺寸三分支、钉点行 → `src`/`dst`、变形框角点 `[x0,y0,x1,y1]` 与裁剪 `[x,y,w,h]` 分开校验；
  **变形网格/拆分在有变形会话时必须整链路带上 `warp`**（`{size:4,warp}` / `{at:[5,6],warp}` / `{warp}`），
  只传 `size` 会让上游去找活动智能对象、普通像素层上必然失败。
- `crop-frame.test.ts`（9）/ `crop-overlay.test.tsx`（7，jsdom）：九个手柄、移动/八向缩放、最小尺寸与比例
  锚定夹取、±45° 拉直、三分/网格线；遮罩 even-odd 双路径、拖角只在松手提交一次、只读与 cancel。
- `warp-mesh.test.ts`（7）/ `warp-overlay.test.tsx`（7，jsdom）：单位网格 `(3c+1)×(3r+1)`、块边界 0–1、
  单点拖动不动其余点；16 控制点 + 24 网格线、双击分割、无位移不提交、只读与 cancel。
- `rotation-frame.test.ts`（7）/ `rotation-overlay.test.tsx`（5，jsdom）：预览尺寸复用 `rotatedCanvasSize`、
  旧画布四角绕新画布中心旋转、`(-180,180]` 归一、15° 吸附；拖动只预览并回报角度、松手才 `onApply`。
- `overlays.test.tsx`（6）：裁剪/旋转/变形状态互斥分发、`active:null` 不渲染、只读透传；
  **自订阅挂载**：无状态不渲染 → 发布旋转显示旋转框 → 换成裁剪不残留旋转框 → 撤回后清空；
  **槽位互不覆盖**：裁剪面板与工作流面板同时挂载时各自发布自己那一个，显式编辑会话压过角度副产物，
  让出一个槽位后回落到另一个；同一槽位重复发布同一份状态不重复通知。
- `export.test.ts`（7）：计划解析严格性（空计划/缺文件名/缺名称/范围非法/范围为空各自报具体原因）、
  按计划顺序逐项导出并把每个 `rect` 交给内核、无宿主端口时明确拒绝、中途失败短路不继续交付、
  仅下载保留「未确认写入」语义、内核计划失败时不渲染任何产物。
- `panels.test.tsx`（22）：裁剪预览→确认→取消、比例预设与拉直、非法输入就地拒绝、图像尺寸单位显示、
  相对画布锚点与取消后回绝对模式、裁边四边、清单门控的「显示全部/透视裁剪」、分组与禁用原因、
  声明式字段表单、透视变形/操控变形专用表单、只读禁用；**变形网格会话**：选中「变形」不自动占画布、
  「在画布上编辑网格」后发布的网格四角等于目标图层框、换到无目标框的文档即撤回、拖动控制点后「应用变形」
  提交改后的点并重置网格、双击分割带上文档坐标与内联 warp 并用返回网格替换；**导出按钮**：按类型调用
  `exportCompositionArtifacts` 并报文件名、「仅下载」如实标注未确认写入、宿主无端口时禁用并说明原因、
  失败时上报原始原因且不宣称已导出；**网格会话跨入口延续**：画布网格提交后成为「正在编辑的变形」，
  切到「网格分割」再执行时参数里带的就是刚提交的那份 `mesh`（而不是退回「去找活动智能对象」）。
- `layer-transform-ui.test.tsx`（4）/ `transform-layer.test.ts`（7）/ `transform-session.test.ts`（4）：
  已有的变换手柄与矩阵会话回归，未改动。
- Rust `composition/workflows.rs` 单元测试：命令注册唯一性、清单承诺与实际能力一致、参数边界（含网格块
  边界语义）、各 U 组编译结果、`prepare` 的未知 id/无文档/非法参数三类拒绝、「参数错误优先于能力门」、
  「显示全部」与上游 `image.revealAll` 的逐字节等价、变形网格/拆分的前置条件（无 warp 时报可读原因）、
  `transformAgain` **不本地重建**上游可重复性判定（只编译成空参数、由内核执行）、
  `export_plan` 的范围/命名/去重/非法字符清理。
- Rust `composition/tools.rs` 4 个 `Editor` 级测试：无变化构图不增历史不改修订、真实裁剪只增一步「裁剪」
  历史且可一步撤销、**已开放命令必须实际改变结果**（`perspectiveCrop` 把 10×10 裁成 6×4、`rotateArbitrary`
  90° 把 4×6 变 6×4）、相对画布增量只被上游加一次。
- Rust `document_content/tests.rs` 新增 `artboard_children_participate_in_content_identity_and_roundtrip`：
  画板子层进入内容指纹、子层像素改动改变指纹、保存→核验→重开指纹不变。

## 真实 WASM 走查（无浏览器、无截图）

`node artifacts/composition-workflow-probe.mjs`（脚本与 JSON 结果在仓库根的 `artifacts/`）直接实例化
`packages/editor/dist/wasm`：

| 项 | 实际结果 |
| --- | --- |
| 清单 | **41 个入口**，`allowed` **36 个**，5 个宿主交付入口 `command:null` + 固定原因（全部带原因，无空原因项） |
| 入口对账 | **0 个 `capability-disabled`、0 个参数错误**：`entries` 步骤对账 31 个入口，其中 16 项直接执行成功；另外 15 项在没有前置条件时如实报原因（缺选区/少图层/无上一步/无参考线/无正在编辑的变形/空图层），**且这 15 项全部又在探针里按真实前置条件跑通了成功路径**（见 `transform-again` / `warp-grid` / `warp-split` / `content-aware-fill` / `photo-multiselect` / `photomerge` / `merge-to-hdr` / `artboard-from-layers` / `layer-slice` / `slices-from-guides` 步骤）。余下 5 个基础入口（`crop` / `imageSize` / `canvasSize` / `trim` / `revealAll`）在 U50–U52 的草稿、撤销与往返步骤里逐项取证，因此 36 个已开放入口全部有「执行成功」或「执行成功 + 无前置时如实拒绝」两种证据之一 |
| U50 裁剪草稿 | 预览后内容 hash 不变；确认后尺寸变化且 hash 变化；撤销后 hash 与尺寸都恢复 |
| U50 拉直 + 保留像素 | `angle:7, deleteCroppedPixels:false` 落到 `image.crop`，文档仍为旋转后画布 |
| U50 透视裁剪 | `corners` 把 10×10 裁成 **6×4**（真实改尺寸，不是接受参数后不动） |
| U50 保留模式往返 | `deleteCroppedPixels:false` 裁到 `20×15`（图层边界 `[1,2,35,26]` / `[0,0,40,30]` → `[-9,-6,35,26]` / `[-10,-8,40,30]`），再「显示全部」回到 `40×30` 且边界逐项复原、内容 hash 与裁剪前相同 |
| U51 仅改 DPI | `resolution:144` 后像素与内容 hash **不变**，只有 `resolution` 元数据变化 |
| U51 百分比 / 保持打印尺寸 | `percent:200` → `80×60`；`resolution:144 + keepPrintSize` → `80×60 @144ppi` |
| U51 相对画布 | `+10/+10 center` → `50×40`（offset 5/5）；绝对 `60×50` → offset 10/10 |
| U51 蒙版联动 | 带像素蒙版的图层：相对画布后图层与蒙版 bounds `[0,0,40,30]` → `[5,5,40,30]`，撤销一并回退；`percent:200` 时一起放大到 `[0,0,80,60]` |
| U52 裁边 | 均匀画布上无变化（`hashChanged:false`，不增历史）；透明边框画布（`40×30` 扩到 `60×50`）裁边后回到 `40×30`、偏移 `x/y = 10/10` |
| U52 显示全部 | 图层移出画布（`[-30,-20,40,30]`）后扩到 `70×50`、图层回到 `[0,0,40,30]`，撤销一步复原；无越界内容时返回 `{"changed":false}` 且尺寸/hash/历史/修订都不变 |
| U52 任意角度旋转 | 90° 把 **6×4 变 4×6**；面板的「任意角度」是独立于裁剪「拉直」的状态，非零时发布旋转预览、提交后撤回 |
| U53 再次变换 | 先做一次带矩阵的变换，`transformAgain` 返回新 rect `[6,6,59,38]`，历史 `Free Transform` → `Free Transform` → `Transform Again`；`transformAgainCopy` 返回 `[7,7,65,41]` 且图层数 **2 → 3**（真实新增副本）；无上一步时内核如实拒绝 `there is no transform to repeat` |
| U53 变形网格闭环 | 1×1 块（16 控制点）→ `warpGrid size:4` 得到 `us` 长度 **5**、**169** 个控制点；用返回的 warp 在块内文档坐标 `(22.5,12.5)` 继续 `splitWarpCrosswise` / `Horizontally` / `Vertically` 三项执行成功，`removeWarpSplit` 在分割后的网格上移除该线、`us` 回到 `[0,0.25,0.5,0.75,1]`。**`at` 是文档坐标**：旧的归一化写法 `(0.5,0.5)` 实际切在 `0.0083` 处（近左上角），压在既有分割线上的 `(30,20)` 被内核如实拒绝——两条对照都在探针里 |
| U53 变形/透视/操控 | `warp` 样式、`perspectiveWarp`（`quad`+`straighten`）、`puppetWarp`（`pins` 的 `src`/`dst`）均执行成功并进历史 |
| U54 填充 | `fill`（颜色）历史 `Fill`；图案填充在工程没有该图案时内核如实拒绝 `no pattern "checker"`（不是参数编译缺陷） |
| U54 内容识别 | `contentAwareFill` 建 `20×15` 选区后 `filled:300`、`window:[0,0,80,60]`；`contentAwareScale` 返回 `from`/`to` 边界并进历史 |
| U54 描边 / 渐隐 | `stroke` inside 与 outside 各自历史 `Stroke`（位置参数真实不同）；`fade` 紧跟绘制后 `{"faded":"Brush Tool","opacity":40}`、历史 `Fade Brush Tool`，第二次（上一步已不是可渐隐操作）如实拒绝 |
| U55 自动对齐/混合 | 多选两层后 `autoAlign` 求出 `(-3,-2)` 位移矩阵（`matches:10682`、`rms:0.00014`、`model:"collage"`），与构造的平移逐项一致；`autoBlend` 返回 `blended` 图层数、`method:"panorama"` |
| U55 Photomerge / HDR | `photomerge` 生成新文档（2 层、428 匹配对、透视布局、`failed:[]`、`placed:["p1","p2"]`、`rms:0.116`）；`mergeToHdr` 在两张**等尺寸**曝光上返回 `ev:[0,1.588]`、`stops:2.83`、`mode:"32"`、`offsets:[[0,0],[0,0]]`；来源文档未被修改（不等尺寸时内核如实拒绝 `the exposures must have the same pixel dimensions`） |
| U55 裁切拉直 | `cropAndStraighten` 执行成功（上游无参数，逐张处理打开的文档） |
| U56 框架真实裁切 | `layer.new.frame` 把铺满红的图层收进 20×10 的框（`layer:63`、蒙版 `hasMask:true`、`maskEnabled:true`）：框内 `(25,25)` 仍是 `255,0,0,255`，框外左 `(5,5)`、右 `(60,25)`、下 `(25,35)` 全部回到白底 `255,255,255,255`——**Frame 实际约束嵌入内容**，不是只回一个矩形 |
| U56 结构 | `newArtboard` / `setArtboard` / `newFrame` / `frameFromLayers` / `newSlice` / `listSlices` 执行成功；三个前置条件项也都在探针里跑通：`artboardFromLayers` 把选中的内容层收进画板（`{layer:50,rect:[5,5,60,40]}`）、`layerSlice` 在非空顶层像素层上建切片（`{slice:1,rect:[5,5,60,40]}`）、`slicesFromGuides` 用两条竖线一条横线建出 **6 个**切片；没有前置时三者分别如实拒绝（无可成组图层 / Background 不能切 / 无参考线） |
| U56 导出计划与 PNG | 切片计划 **5 个文件**（1 个自定义 `logo` + 自动切片，文件名用内核给的最终名不重复拼前缀）；画板计划 `海报_首屏.png` rect `[0,0,60,40]`；两者 `compositionExportPng` 都返回合法 PNG（头 `89504e47`） |
| U56 工程往返 | 含画板的工程可 `exportBundle`，且**导出→重开指纹一致**（`reopenedSameHash: true`）；`openProject` 传空 `baseAssetId`，与保存时一致 |
| 非法参数 | `crop width:0` 被拒（`width 必须在 1–1000000 之间`），内容 hash 不变；`warp style:"spiral"` 报参数错误而非 `capability-disabled`（参数错误优先于能力门） |
| 未登记 id | `crop.toArtboard` 被拒为「不是已登记的构图工作流」 |
| 文档归属 | 新开文档后入口清单不变，草稿不串档 |
| 草稿期间的文档切换门禁 | 草稿未提交时 `file.new` / `file.close` / `edit.undo` / `select.all` 全部被拒（`请先确认或取消构图修改`），文档保持原状；提交后才作用于原来源文档 |
| 工程往返（U51/U52） | 300 ppi + 相对画布 + 裁剪后导出，重开文档尺寸/DPI 一致，128px 预览像素指纹逐字节相同 |

### 对账中修掉的真实缺陷

1. `check_mesh` 曾把 `us`/`vs` 当成控制点轴（上游是**块边界**），合法网格会被拒。
2. `warpGrid` 曾编译成上游不接受的 `{warp:{mesh}}`；上游 `Warp` 需要顶层 `style`+`bounds`+`mesh`。
3. 变形族的 `rect` 在上游是**角点 `[x0,y0,x1,y1]`**，曾按 `[x,y,w,h]` 解析，会把源框放大一倍。
4. 相对画布曾把增量在编译器里先加到文档尺寸上、上游又加一遍，`+10/+10` 变成 90×70（正确 50×40）。
5. `warpGrid`/`splitWarp*` 曾只传 `size`/`at`，普通像素层上必然失败；现在由界面变形会话整链路带上 `warp`。
6. 画板的内容身份曾只写 `kind:"artboard"` 而不计子层，导致「画板里的改动不改变工程 hash」，`exportBundle`
   还会把整份工程误报成 `没有正在编辑的文档`（`document_content_hash` 返回 `None` → `EditorError::NoDocument`）。
   修复：`document_content.rs` 让画板走组分支并始终带 `children`；`identity.rs` 接受 `kind:"artboard"` 并要求
   容器才允许 `pass-through`；`project-verify` 的图层校验接受画板并把 `artboard` 记进 `object_kinds`；
   TS `content.ts` 用同一 `groupLike` 规则。
7. `transformAgain` 曾本地重建上游「上一次变换」的私有推导（`transform_again_params`）；命令开放后改为直接
   透传，`againCopy` 的 `history.purge_last` 与改标签交还内核。
8. `autoAlign`/`autoBlend` 的前置条件曾按「文档里有两个图层」判断，与上游「选中 ≥2 个像素层」不一致；
   改为只挡必然失败的输入，多选判据交给上游。

## 未采集项与真实原因

- **电脑 1440×1000 / Pad 1024×768 的应用内截图与鼠标走查**：待人工验证。当前验证环境是 Linux 容器，
  `ls /dev/dri | grep renderD` 无输出且无 `DISPLAY`/`WAYLAND_DISPLAY`，即真实原因是**该容器没有 GPU 与显示
  会话**，无法启动真实渲染走查。这不是「不改 UI」的借口：接口、面板与叠加层行为已由 jsdom 事件测试覆盖
  （几何、投影、拖动回报、只读、取消），未采集的只是真实像素与手感。
- **U50–U56 的真实窗口手势与视觉结果**（拖动裁剪框、变形网格手柄跟随、旋转预览、导出后在文件管理器里
  看到多个 PNG）：待人工验证，原因同上（无 GPU / 无显示会话）。命令层已全部贯通，探针给了每一项的输入与
  内核返回值，剩的是「画到屏幕上是否一致」。
- **`artboardsToPdf`、`photomergeFromFolder`、`stackStatistics` 的原生文件夹/PDF 输出**：不接入。
  `scope.md` 明确排除原生文件夹输出；浏览器没有任意路径读写权限。画板与切片的**多文件交付**已由
  `compositionExportPlan` + `compositionExportPng` + 宿主 `fileDelivery` 完成（范围与命名来自内核），
  这三个 `command:null` 入口仍在界面里显示固定原因，不伪造命令 id。
- **GPU 帧率/长尾、GPU 计时、播放/编辑/拾取画面一致性**：不在本 change 采集范围（不改渲染管线），
  且当前环境无 GPU。

## 逐 U 结论

| U | 本次完成 | 未完成 |
| --- | --- | --- |
| U50 | 裁剪框参数（x/y/宽高/拉直角度/删除像素/内容识别/重采样/目标尺寸）、比例预设与框内合比例、越界扩展画布、历史名「裁剪」、**保留模式往返**（保留后「显示全部」复原像素与边界）、**透视裁剪真实改尺寸**（10×10 → 6×4）、裁剪框叠加层（移动/八向缩放/拉直手柄、比例锚定、三分/网格线、even-odd 遮罩、角度读数）**并已挂到画布** | 真实窗口拖动与像素截图（无 GPU/显示会话） |
| U51 | DPI、打印单位双向换算、10 种重采样、保持打印尺寸、画布相对增减/9 锚点/扩展颜色；仅改 DPI 时像素与 hash 不变；蒙版与图层坐标联动、撤销一并回退 | 真实画面核对（同上） |
| U52 | 裁边依据与四边开关、`image.trim` 草稿通道与历史名「裁边」；**显示全部**（与上游 `image.revealAll` 逐字节等价、`changed:false` 不写历史）；**任意角度旋转**（90° 改画布为 4×6）+ 旋转预览叠加层（新画布框、内容四边形、可拖手柄与 15° 吸附）**并已挂到画布** | 真实窗口手势与视觉结果（同上） |
| U53 | 变形样式/弯曲/扭曲、网格分割、自定义网格（块边界语义按内核纠正）、钉点、透视平面、**透视/操控变形真实执行**；**变形网格闭环**（1×1 → 4 段 → 169 点，三种拆分与移除在文档坐标上执行）；**再次变换与副本由内核执行**（历史 `Transform Again`，副本新增图层）；变形网格叠加层（控制点拖动、网格线、双击分割）**并已挂到画布**，且由「在画布上编辑网格」显式进入、提交后成为下一次分割的会话；界面持有变形会话并把 `warp` 整链路传给网格与拆分 | 真实手柄跟手与像素一致性（同上） |
| U54 | 填充内容/颜色/图案/混合模式/不透明度、内容识别填充与缩放、描边宽度与内外位置（inside/outside 结果与历史不同）、渐隐不透明度与混合模式；**四项真实执行**，`fade` 只在紧跟滤镜/调整/绘制后可用 | 图案填充只有在工程已有该图案时可用（内核语义，非缺陷）；真实选区预览视觉（同上） |
| U55 | Auto-Align/Auto-Blend/Photomerge/合并到 HDR/裁切拉直的参数编译与**真实执行**：`autoAlign` 求出 `(-3,-2)` 矩阵、`autoBlend` 返回混合图层数、`photomerge` 生成 2 层透视合成、`mergeToHdr` 返回 `ev`/`offsets`；多选/多文档前置条件如实报错 | `stackStatistics`（需宿主文件夹输入，`scope.md` 排除） |
| U56 | 画板/框架/切片参数编译与 `newArtboard`/`setArtboard`/`newFrame`/`frameFromLayers`/`newSlice`/`listSlices` 真实执行；**画板内容身份**（子层进入指纹、改动改变指纹、保存重开指纹稳定）与核验器接受画板；**Frame 实际裁切内容**（框内保留原色、框外三处回到白底）；**导出计划与 PNG**（切片 5 个文件含自动切片、画板 `海报_首屏.png` 范围 `[0,0,60,40]`、重名去重、非法字符清理）；界面「导出切片 / 导出画板」经宿主端口交付 | `artboardsToPdf` / 原生文件夹输出 / `photomergeFromFolder`（`scope.md` 排除，保持 `command:null`） |

## 开放后续能力时的注意事项

1. 新增入口必须同时在 `photocraft/rust/crates/editor-core/src/features/composition/mod.rs`（域内贡献）与
   `packages/protocol/src/features/composition/index.ts`（TS 镜像）声明，再按 `pnpm -C api run gen` 式流程
   重生成 `tests/fixtures/contract.json`，最后同步 `notes/feature-boundary-baseline.json` 的
   `sharedFiles` 哈希——三处不同步会让 `features:check` 报漂移。
2. 命令 id 在域内是 kebab-case、上游是 camelCase，这是既有约定，不要「统一」成一种。
3. 需要宿主本地文件夹/PDF 容器/外部目录输入的能力继续保留 `command: null` + 固定原因，不伪造命令 id，
   也不把「多文件交付」写成「写入某目录」。
4. 画布叠加层只需在 `photo-editor-app.tsx` 的 `renderOverlay` 槽位挂 `<MountedCompositionOverlay>` 一行；
   域状态经 `features/composition/overlay-store.ts` 自订阅，不需要第二个开关属性。

## 真实 UI 与设备

独立 dev 和 Woohaa 均使用真实匹配 WASM；电脑 1440×1000 和 Pad 正常窗口 1024×768 逐项操作并留应用内截图，检查菜单/弹层/参数/内容与边界一致性。Pad 窗口走查不代表真实 Pad/数位笔硬件验证。

先按平台探测 GPU：Windows 查询显示适配器，macOS 用 `system_profiler`，Linux 用 `renderD`；不得在 Windows/macOS 以 `/dev/dri` 判定无 GPU。确无 GPU 不采渲染/性能证据，标待人工验证并写原因；有 GPU 但缺显示会话、数位笔、Photoshop 或 codec 时分别记录对应原因，不笼统写「无 GPU」。软件渲染不能替代硬件结论。Photoshop 仅在本 change 修改 PSD 兼容项时需要外部可编辑往返验证。

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。打印、原生文件夹输出和被明确排除的智能滤镜/液化不接入；新增结构接通前不批量开放命令。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
