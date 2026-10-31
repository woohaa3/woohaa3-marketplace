# 填充层、高级混合与图层复合任务

> 勾选标准：只勾「已真实完成并有回归证据」的项。本 change 已不再依赖任何未落地的共享单写改动：
> 能力登记、装配、`editor-workspace.ts` 签名、内容身份与核验器接线**都已在本 worktree 内完成**，
> 并与 `features:check` 的实测基线一致。仍保持未勾的只有需要**真实 GPU 与人工操作**的项，
> 原因见 [verification.md](verification.md)。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  已核对前置提交 `b61da631b52cb44c453789be1bd9ef52a893291c` 建立的四棵树域目录；改动落在
  `packages/editor/src/features/layers/`、`packages/protocol/src/features/layers/`、
  `rust/crates/editor-core/src/features/layers/`、`rust/crates/project-verify/src/features/layers/`
  与就近测试/文档；共享装配按「只增不改既有前缀」的方式登记，见 5.1。

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  上游固定为 `photocraft/vendor/photocraft` `4e7a17cd5d5723313f459753663d0d155f047e19`（0.9.0），只作只读语义参考，未改动。原 change 未验收记录保留在本次 verification.md。

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  已按 U57–U64 逐组建立：上游命令 → 域内校验/包装（`layer_fill.rs`、`layer_workflows.rs`、
  `layer_filter_domain.rs`）→ WASM 导出（`features/layers/wasm.rs`，6 个 `js_name`）→ TS 适配
  （`workspace.ts`/`wasm-handle.ts`/`wasm-instance.ts`）→ 面板（`panels.tsx` + `sections.tsx` 5 个菜单项）
  → 核验（`project-verify/src/features/layers/` + TS `inspectFill`）。菜单项全部对应已登记且可执行的命令，
  没有占位项。

- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  无新增同级硬依赖；上限沿用 `MAX_LAYERS`=64、`MAX_LAYER_COMPS`=64，未导入宿主私有模块。

## 2. 逐项贯通

> 2.x 共同状态：实现、装配、能力登记、内容身份与核验器**均已接通**；下文的「实测」均指在真实匹配
> WASM（`packages/editor/dist/wasm`，即 `pnpm run wasm` 产物）上执行得到的证据，逐组脚本为
> [evidence/per-unit-real-wasm.mjs](evidence/per-unit-real-wasm.mjs)（**126** 项全绿）。
> 2.1–2.8 的**实现与自动化证据已全部完成，故已勾选**；仍保持未勾的只有 4.2/4.3/5.2——它们要求
> **真实 GPU 下的视觉结论**与**人工逐项操作+截图**，属验收动作而非实现缺口，原因见 verification。
> 本轮（第三轮）又补齐了四处「内核有、界面没有」的真实缺口：填充层矢量蒙版路径、Blend If 分离滑块、
> 效果转层到指定层与效果默认值、图层复合快照导出；逐项证据见下文 2.1/2.4/2.5/2.8 与
> [parallel-work 第三轮共享触点](parallel-work.md)。

- [x] 2.1 U57：接纯色/渐变/图案可重编填充层及其参数、蒙版和资源快照，不能只烘成普通像素层。 成功证据：重开后仍能改填充参数，修改库项不改变已应用快照，合成/核验正确。
  已接通：三类填充可重编、参数往返、锁/容量拒绝、预览只读、提交一步历史、选区生成蒙版且改参数不丢蒙版、
  `path` 建立矢量蒙版（编辑期拒绝）、用户图案库图案可直接用且改库项不改已应用快照（`layer_fill.rs` 8 测 +
  库交互 2 测）；能力 `layers.fill` 已登记，菜单「图层 ▸ 填充层…」可达。
  **实测**：新建径向渐变填充层 → 读回 `kind=gradient` → 预览返回 1024×711 候选像素且正式指纹不变 →
  提交后指纹 `6ab6e8f3…`→`19c2ee5e…` 变化 → 撤销回到 `6ab6e8f3…`；非法端点（只给 1 个 stop）被拒；
  导出工程后以空 `baseAssetId` 重开，`contentHash()` 与 `bundle.documentContentHash` 一致且 `fillLayerInfo`
  仍返回 `gradient`。核验器两端都接受合法填充层并拒绝越界 alpha。
  **逐组脚本另测**（`per-unit-real-wasm`）：纯色/渐变创建成功；空图案库时 `layer.newFillLayer.pattern`
  被明确拒绝（「找不到图案」）且不留下半成品层；面板参数（stops/透明度百分比/缩放/反相/仿色/对齐/偏移）
  全部读回；预览返回正尺寸像素且指纹不变；提交改指纹、一步撤销复原、蒙版在改参数后仍在；
  单端点与透明度 >100 被拒；`saveProject` 后以空 `baseAssetId` 重开指纹与 stops 一致。
  **本轮补齐**：面板新增「蒙版路径（仅新建）」下拉（路径来自 `vectorSnapshot()` 的工作路径与已保存路径），
  使上游 `mask_new_layer` 的矢量蒙版分支在界面可达；实测由选区建立工作路径并改名后，用 `path` 新建填充层
  得到 `vectorMask`，编辑同一层再带 `path` 被明确拒绝且不改层数。
  **缺**：真实 GPU 下的视觉外观（实现与像素取用均已完成，见 verification「待人工验证」）。

- [x] 2.2 U58：提供图层链接/取消链接、颜色标签、剪切/复制建层和盖印，链接移动尊重锁定规则。 成功证据：链接层协同变换，盖印保留来源，剪切建层与选区统一一步撤销。
  已接通：链接/标签/盖印/剪切建层/背景互转的前置条件校验；链接移动尊重锁定由
  `linked_layers_move_together_and_position_locks_are_respected` 覆盖（走 Move 工具同一链路 `move_targets`+`moved`）。
  **实测**：多选后用 `layer.linkLayers` 链接，两层 `linkGroup` 同为 1；`setLabelColor` 后读回 `blue`；
  `selectLinkedLayers` 选中所属链接组；`stampDown` 使图层数 4→5 且合成保留来源像素；位置锁定的背景层
  被移动命令拒绝。
  **逐组脚本另测**：`linkLayers` 后两层 `linkGroup` 同值；`setLabelColor` 读回 `blue`；
  `selectLinkedLayers` 选中 2 层且不改内容（`changed:false`）；`stampVisible`/`stampDown` 各 +1 层；
  `arrange.reverse` 生效；`layerViaCut` 恰好一步撤销；`layerFromBackground`/`backgroundFromLayer` 互转成功
  （已有背景层时后者被拒，符合上游语义）。图层面板现在显示标签色块与链接指示。
  **缺**：真实设备上的协同变换手感与视觉确认。

- [x] 2.3 U59：接 Paste Into/Paste Outside 的选择区域与蒙版语义，使用现有有界剪贴板和资源重映射。 成功证据：粘贴内容与内/外蒙版正确，原剪贴板不变，撤销一次恢复进入状态。
  已接通：`edit.pasteSpecial.pasteInto`/`pasteOutside` 已登记并在菜单可达。
  **实测**：复制 400×300 真实像素后重置选区 → `pasteInto`/`pasteOutside` 各新增 1 层（5→6→7），
  两份结果都改变内容指纹；`pasteRegion()` 的剪贴板摘要前后完全一致（不被消耗）；取消选区后同一命令
  被明确拒绝（「粘贴入/外需要先建立选区」）。
  **逐组脚本另测**（两命令各起新文档，避免选区历史混淆计数）：`pasteInto` 与 `pasteOutside` 各 +1 层、
  改指纹、生成蒙版（`hasMask`）、剪贴板不变，且**一次撤销**即回到进入状态（层数与指纹都复原）；
  无有效选区时明确拒绝。菜单「编辑 ▸ 选择性粘贴」已有粘贴入/外两项。
  **缺**：真实像素在内外蒙版下的视觉确认。

- [x] 2.4 U60：提供 Blend If 分离端点、按通道混合、Knockout 及内部效果/剪贴层成组和蒙版隐藏效果选项。 成功证据：分离滑块产生真实平滑过渡，组/剪贴合成按规则变化，保存重开一致。
  已接通：`layers.advanced-blending` 已登记，菜单「图层 ▸ 混合选项…」可达。
  **实测**：预览返回 1024×711 真实合成像素且指纹不变；提交后读回 `blendIf[0].thisLayer=[30,60,200,235]`、
  `channels=[true,true,false,true]`、`advancedBlending.knockout=shallow`、`blend=Multiply`；
  交叉端点（`[200,100]`）被拒。
  **逐组脚本另测**：预览返回 `w*h*4` 的真实合成像素且正式指纹不变；提交后 `advancedBlending`
  （knockout / blendInterior / blendClipped / layerMaskHidesEffects / vectorMaskHidesEffects）、
  `channels`、`blendIf.thisLayer` 全部**真实读回**（此前读回拿到的是默认值，见 verification 缺陷 6）；
  一步撤销复原；通道数与文档不一致被拒。面板新增「矢量蒙版隐藏效果」，并把读回依赖改为值签名，
  拖动中不被刷新覆盖。混合预览现已在面板画布上画出真实像素。
  **本轮补齐**：「分离滑块」不再只是手输数字——`BlendIfSliders` 为每个端点画真实滑块（合并 2 个手柄、
  分离 4 个手柄，中间两个即过渡宽度），拖动时在相邻端点之间夹住后立即用**最新**状态预览；
  另加「本图层/下层分离端点」两个开关，负责在 2 端点与 4 端点之间切换（合回时取最外两点）。
  **缺**：分离滑块的平滑过渡必须看真实合成像素，需 GPU 环境人工验证。

- [x] 2.5 U61：提供 Copy/Paste Style、样式预设管理、Scale Effects、效果转层和样式栅格化，保持图案/等高线/全局光源语义。 成功证据：跨层应用后效果资源完整，转层结果可独立编辑，一步撤销恢复原样式。
  已接通：`layers.style-presets` 已登记；`style.presets.list/new/edit/reset` 与
  `layer.layerStyle.defaultFor/makeDefault` 作为会话偏好执行（不推进修订、不写历史、不改内容指纹）；
  菜单「图层 ▸ 样式预设…」可达。
  **实测**：应用内置 `Gold` 预设取得真实效果 → `copyLayerStyle` 置入样式剪贴板 → 建目标层后
  `pasteLayerStyle` 使目标层获得效果 → `scaleEffects(150)` → `transferEffects(copy)` →
  `createLayer` 使层数 8→11 → `rasterize.layerStyle` 成功；预设四动作返回 `presetsRevision` 1→2→3→4，
  文档 `revision` 全程保持 29 不变。
  **逐组脚本另测**：样式经真实属性草稿落到图层 → `copyLayerStyle` 只动会话（`changed:false` +
  `hasStyleClipboard:true`，指纹不变）→ `pasteLayerStyle` 使目标层效果项数与源层相同 →
  `scaleEffects` 缺省 `scale` 是**无变化**（`changed:false`，与上游默认 100 一致）、显式 `null` 被拒、
  `scale:150` 生效 → `transferEffects(copy)` 让目标层拿到效果且源层保留 → `createLayer` 增层 →
  `rasterize.layerStyle` 生效 → `style.presets.apply` 改指纹且一步撤销复原；`style.presets.list`
  前后指纹不变。面板已补拷贝/粘贴/清除样式、缩放效果、效果转层、样式栅格化与应用预设。
  **本轮补齐**：面板新增「复制/移动效果到目标层」（`transferEffects`，目标层来自视图模型而不是手输 id）
  与「效果默认值」读写（`defaultFor` 读回出厂/用户默认，`makeDefault` 写回；非法 JSON 在面板拦下不发内核）。
  内核侧同时补上 `transferEffects` 的前置校验：源/目标不存在、源层无效果、`effect` 越界、同层、
  目标层锁定、移动时源层锁定都提前给出中文原因且不写历史；`defaultFor`/`makeDefault` 实测只推进
  `presetsRevision`，内容指纹不变，未知效果种类被拒。
  **缺**：转层后各效果的视觉独立性需 GPU 环境人工确认。

- [x] 2.6 U62：提供 Defringe、Remove Black/White Matte 和 Color Decontaminate 的实际像素预览与参数。 成功证据：边缘用例实际去除对应杂边而保留主体，撤销恢复原像素。
  已接通：`layers.matting` 已登记，菜单「图层 ▸ 去边与净化…」可达；仅接受像素层、参数有界。
  **实测**：羽化（radius 3）边缘层上，去边/净化预览返回 1024×711 且指纹不变；
  `removeWhiteMatte`/`removeBlackMatte` 在真实半透明边缘上 `changed=true`、内容指纹变化、撤销后指纹复原；
  宽高越界（`width:0`）被拒；调整层与填充层被拒（「只能用于像素层」）；锁定层被拒。
  **逐组脚本另测**（真实羽化软边层）：四条命令各自返回正尺寸预览像素且预览不改正式指纹；
  `removeWhiteMatte`/`removeBlackMatte` 实测 `changed=true`、指纹变化、一步撤销复原；
  `defringe` 与 `colorDecontaminate` 在该用例上 `changed=false`（无对应杂边/颜色差，属正确的「无变化」）；
  `width:0`、`amount:140`、非像素层三种拒绝都逐条命中。面板「预览」现已把真实像素画到画布，
  「应用」后清空预览。
  **缺**：「去杂边而保留主体」的像素级**视觉**结论必须看真实图像，待 GPU 环境人工验证。

- [x] 2.7 U63：补 only_selected、shape 类型和上游已实现属性筛选，保留当前名称/类型筛选并说明组合条件。 成功证据：只改变图层列表，不改内容、选择或可见合成，过滤隐藏选中层时状态仍一致。
  已接通：`filterLayers` 的公共签名已在 `editor-workspace.ts` 加宽为
  `{ name?; kinds?; by?: "kind"|"name"|"mode"; mode?; onlySelected? }`，面板不再需要非字面量对象绕类型。
  **实测**：`by:"mode"` + `multiply` 得 `visible=3/12`；`by:"kind"` + `kinds:["raster"]` + `name:"像素"`
  + `onlySelected` 得 `visible=1`；`kinds:["raster","shape"]` 得 `visible=11`；三种调用后内容指纹与
  选中层都不变；非法主条件被拒。
  **逐组脚本另测**：`by:"mode"`、`kind+name+onlySelected`、`raster+shape` 三种组合都返回数值 `visible`；
  指纹与选中层不变；未知 `by` 被拒。面板已有主条件/名称/种类/混合模式/只显示选中层五个入口与组合说明。
  **缺**：列表行在真实 UI 中的滚动/选中一致性走查。

- [x] 2.8 U64：提供 Layer Comps 创建/更新/切换/恢复及导出，按可见性/位置/外观保存规范快照。 成功证据：切复合只恢复声明字段，缺失层给报告，复合保存重开有效并能交付快照。
  已接通：`layers.layer-comps` 已登记，12 条命令全部可执行；菜单「图层 ▸ 图层复合…」可达；
  `layerComps()` 的每个复合带按选项裁剪的 `snapshot`（未声明字段为 `null`）。
  **实测**：建 A（三字段）/B（仅可见性）两个复合；B 的快照逐层为
  `{visible:true, position:null, appearance:null}`，A 的快照 `position:[0,0]` 且 `appearance` 为
  规范小写混合名；隐藏一层后切 A 恢复可见、切 B 不改位置与外观；`previous`/`next`/`update`/
  `duplicate`/`rename`/`setComment`/`setOptions`/`delete` 全部成功；不存在的复合名被拒；
  导出工程重开后 `layerComps()` 仍返回 `A,B`。
  **逐组脚本另测**：`new/rename/setComment/setOptions` 后选项真实读回（`position=false`、`appearance=false`
  时快照对应字段为 `null`）；`updateWarnings` 的空报告是 `[]` 而不是缺字段（此前被统一入口吞掉，
  见 verification 缺陷 5），删层后**点名缺失层 id**，且报告本身 `changed:false` 不写历史；
  `apply` 记录 `lastApplied` 与 `lastDocumentState`，`restoreLastDocumentState` 生效。
  面板已补改名/注释/选项/恢复/缺失层检查，并显示裁剪后的快照。
  **本轮补齐「导出」**：上游 `file.export.layerCompsToFiles` 需要写目录，浏览器宿主没有该权限，
  因此导出走宿主已有的下载通道：面板「导出快照 JSON」把 `layerComps()` 的**权威快照**（名称/注释/
  三个选项/缺失层/逐层 `snapshot`）序列化为 `photocraft-layer-comps` v1 JSON 交给浏览器下载。
  导出不重算、不写文档；没有复合时按钮禁用，下载通道不可用时报告「导出失败：…」而不是假装已保存。
  实测交付物可 `JSON.stringify` 往返且逐字段与内核快照一致（声明字段保留、未声明字段仍为 `null`、
  缺失层 id 不变）。
  **缺**：真实 UI 中复合切换的视觉对比。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  域内测试与真实 WASM 实测均覆盖：非法参数不落地（端点/宽度/半径/交叉端点/未知复合）、
  锁与容量拒绝（锁定层、64 层上限、64 复合上限）、预览只读（不推进正式内容）、提交恰为一步历史、
  粘贴不消耗剪贴板、复合缺失层报告、无变化不写历史（净化在纯色区返回 `changed:false`）。

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  已三处同源接通：`features/layers/content.rs::fill_content`（三种填充的规范描述）→
  `document_content.rs`（`LayerContent::Fill` 输出 `fillLayer`，仅在存在时输出以保持旧指纹不变）→
  `identity.rs`（`"fill"` 进入 kind 白名单 + `canonicalize_fill` 带全部边界）。TS 侧镜像在
  `packages/protocol/src/features/layers/fill-content.ts`（与 Rust 逐字节同格式）+
  `features/shared/content.ts` 的 kind 白名单、`fillLayer` 字段与 present 计数。
  `IMAGE_PROJECT_LAYER_KINDS` 现包含 `fill`。
  **实测**：改填充参数后 `contentHash()` 从 `6ab6e8f3…` 变为 `19c2ee5e…`（此前不变），撤销后复原；
  导出工程以空 `baseAssetId` 重开，指纹与 `bundle.documentContentHash` 一致；偏好类命令
  （`style.presets.*`、`layer.layerStyle.defaultFor/makeDefault`）返回 `changed:false` + `presetsRevision`，
  不推进文档 `revision`、不写历史、不改内容指纹。核验器两侧一致：原生 `fill_support` + 文档级
  `fill_support::supported_document`（含图案引用查表），TS 侧 `fill` 已从 `REJECTED_OBJECT_KINDS`
  移入 `ALLOWED_OBJECT_KINDS` 并有 `inspectFill` 结构检查。

- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  本域采用**无状态**设计（纯预览 + 一步原子提交，不在 `Editor` 上存草稿），因此不存在「晚到预览覆盖正式
  状态」的路径：预览响应只含 `preview` + `revision`，宿主按代际丢弃。宿主侧门禁由既有多文档工作区承担，
  本 change 未改动其逻辑；本轮只加宽了 `filterLayers` 类型面。

- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  `@woohaa3/photocraft-woohaa` typecheck 通过、34 文件 275 测全绿；宿主替身已补本域 8 个端口。
  菜单/标签/面板布局未改动既有项：5 个新菜单项 `menuOrder` 2–6 追加在「图层」菜单 `vector`(0)、
  `smartObject`(1) 之后，`FEATURE_SECTIONS` 的 `order` 12–16 追加在既有域之后（`boundaries.test.ts`
  同时断言顺序与 section 总数 17）。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  实际结果与计数已记入 [verification.md](verification.md)：`check`（protocol 91 / project-verifier 40 /
  editor 304）、`cargo test --workspace`（233 + 4/13/25/10/0/1/3/10/15）、`wasm`、`verifier`、
  `features:check`、宿主 typecheck + 275 测、`boundary:check` 6/6、`codemap:check`、
  `openspec validate --strict`；真实 WASM 两套脚本 146 + **126** 项全绿。
  本轮共修 7 个真实缺陷，并补齐 U61 预设管理、U64 复合快照与缺失层报告、U58 链接/锁定实测、
  三处「实际像素预览」画布、能力登记与内容身份；回归净增 24（editor 280→299→304、rust 232→233、
  protocol 未减）。

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：可编辑渐变填充 → 链接多层 → 粘贴入选区 → 分离 Blend If → 样式跨层复制/转层 → 去边 → 两个图层复合往返。
  **同一主线已在真实 WASM 上以脚本逐项执行并全部成立**（见 verification「主线实测」表，146 项检查、
  无失败；逐组另有 **126** 项全绿），但「真实环境」按仓库定义要求真实 GPU + 人工点击 + 应用内截图。
  本机探测结果为 `ls /dev/dri | grep '^renderD'` 无输出（Linux 容器，无真实 GPU），故该项保持未勾，
  待 macOS 主力机人工验证。这是**验收动作未做**，不是实现缺口：入口、参数、预览像素、历史、
  身份与重开均已可用脚本复跑。

- [ ] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  已记录每 U 组的成功/拒绝/取消/结构/历史/工程重开证据：verification「主线实测」表（146 项）+
  [evidence/per-unit-real-wasm.txt](evidence/per-unit-real-wasm.txt)（**126** 项，逐 U 组独立文档）。
  仅「像素外观/视觉一致性」与「人工操作截图」两类需真实 GPU，未勾。

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  已更新 [能力矩阵](../../../notes/capability-matrix.md)（新增 8 条能力行，逐条标注实现位置与核验器，并把
  3 项像素外观明确标为待人工验证）与[模块地图](../../../../../docs/code-map/photocraft.md)（三条真实入口 +
  身份接线现状）。`codemap:check`、`features:check`、`openspec validate --strict` 均通过后才开放菜单项。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  本 change 已完成原先留给集成侧的授权改动（用户明确要求「完成这个 change」），做法是**只增不改既有前缀**，
  并全部用实测基线证明等价：

  | 位置 | 改动 | 等价证据 |
  | --- | --- | --- |
  | `features/layers/mod.rs` 的 `CONTRIBUTION` | 8 个能力 id 用 `order` 21–28、48 个命令用 `order` 101–148 | 既有 `0–20` / `0–100` 前缀逐字节不变 |
  | `packages/protocol/src/features/layers/index.ts` | 同序镜像能力 | `packages/protocol` 91 测（含 fixture 对照）全绿 |
  | `tests/fixtures/contract.json` | 追加 8 个能力（插在 `adjust.curves` 之后） | `contract_fixture.rs` 4 测断言等于 `delivered_capabilities()` |
  | `notes/feature-boundary-baseline.json` | 重算 5 个 `sharedFiles` 哈希 | `features:check` 实测通过 |
  | `notes/feature-boundary-wasm-baseline.json` | 只增 `commands`（+48）与 `capabilities.capabilities`（+8） | 逐键比对：`build`/`steps`/`errors`/`output`/`nonGoals`/`stages`/`allStages` 全等 |
  | `document_content.rs` / `identity.rs` | 填充参数进入内容身份 | 改参数指纹变化、撤销复原、重开一致 |
  | `project-verify/src/lib.rs` | 文档级 `fill_support::supported_document` 调用 | 缺失图案的工程被拒 |
  | `project-verifier/src/project-verification.ts` | `fill` 移入允许类型 + `inspectFill` | 40 测全绿，与原生 `objectKinds` 一致 |
  | `editor-workspace.ts` | `filterLayers` 加宽 `by`/`mode` | 面板去掉绕类型的非字面量对象 |
  | `features/layers/sections.tsx` + `boundaries.test.ts` | 5 个菜单项 + 断言次数 12→17 并断言顺序 | 5 个菜单项都能分派到面板 |

  只增不删的域外例外与上一轮相同：`packages/protocol/src/index.ts` 的再导出、宿主替身的 8 个假端口。

- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  身份、保存往返、核验器两端与跨域装配已实测通过；**跨域 UI 与像素回归**需要真实 GPU 与同时合并的兄弟
  change（17 个），未勾。本 change 自身的 UI 回归已由 `photo-editor-chrome.test.tsx`（6 个，含 21 个新
  菜单命令的可达性与分派）、`layer-workflow-panels.test.tsx`（22 个面板交互，含分离滑块、填充路径、
  效果转层/默认值与复合快照导出）、`layer-panel-interaction.test.tsx`（9 个，含标签/链接行）、
  `editor-view-model.test.ts`（+2 个读回解码）覆盖，但那只证明「本域能正确调用」，不等于兄弟域合并后的
  联合验收。
