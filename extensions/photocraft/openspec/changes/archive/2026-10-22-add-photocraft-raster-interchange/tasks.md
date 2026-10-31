# 栅格格式与导出交付任务

实现基线 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；本 change 全部改动未提交。
勾选口径：只有**本机真实执行并通过**的检查才勾选；需要真实 GPU、真机、外部应用或仍缺真实提供方
的条目保持未勾选，并在文末「未勾选原因」逐条写明。3.4 的宿主接线经用户明确授权越过
`parallel-work.md` 的归属约定实施，触及的共享/宿主文件在文末单列，交集成负责人复核。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  - 前置已在 `b61da631` 合入（18 域目录 + 静态装配 + `features:check` 基线）。本域只用既定扩展点：
    新 `#[wasm_bindgen]` 方法与 `impl Editor` 落在 `features/io/`，由既有 `features/io/wasm.rs`、
    `features/io/mod.rs` 声明，未改 `editor.rs` / `wasm.rs` / `lib.rs`。
  - **两处共享文件被增量追加**，需集成负责人复核（不改既有行，仅追加导出/计数）：
    `packages/protocol/src/index.ts`（本包唯一公共入口，值/类型逐条再导出 io 域；
    不加则 editor 无法引用协议域实现，只能跨包深导入并复制预算数据）、
    `packages/editor/src/features/boundaries.test.ts`（`FEATURE_SECTIONS` 唯一 id 断言 12 → 13）。
- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  - 本域新增能力 id 只在本域声明（`INTERCHANGE_CAPABILITIES`），未改
    `tests/fixtures/contract.json`、`notes/feature-boundary-wasm-baseline.json`、
    `rust/project-limits.json`；`pnpm features:check` 仍与 `bdc3c084` 快照逐字节一致。
  - 原 change 的真实设备/外部应用验收保持原状，未改写其记录。
- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  - 逐格式矩阵与暂缓原因：[evidence/interchange-matrix.md](evidence/interchange-matrix.md)（实测值取自真实
    WASM 构建，不是前端常量）。
- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  - 预算唯一权威 `packages/protocol/src/features/io/interchange-budgets.json`（TS import + Rust
    `include_str!`）；本域不 import 宿主 store / Cordis / Y.Doc / `StoredAsset`。

## 2. 逐项贯通

- [x] 2.1 U05：维护逐格式读写/位深/metadata/feature 的真实矩阵，接入可用 RGB/U8 解码路径并明确只读项；HDR 和缺 codec 项列为暂缓。 成功证据：每个开放扩展名以实际签名字节完成 WASM 解码、预检与可编辑打开，损坏/伪扩展名不误接受。
  - `formats.rs` 由真实构建推导矩阵；`open_status` 在解码后复核位深/布局/尺寸。
  - 真实 WASM 逐格式打开：`wasm-integration.test.ts` 用每个可写格式**自己的真实编码产物**
    （png/jpg/tif/webp/gif/bmp/tga/ico/qoi/pnm）走预检 + 打开，只读项（pcx/xpm/dds）用手工构造的
    真实签名字节；13 个格式的 `status`/`openable`/`depth=u8`/尺寸逐项断言，暂缓项预检即拒绝并带原因。
  - 真实 WASM 验证（`evidence/check-interchange-wasm.mjs`）：矩阵 20 行（10 open / 3 read-only /
    7 deferred）、27 个可打开扩展名；`inspectRaster` 不建文档；`openRaster` 真正替换文档；
    伪扩展名按签名仍打开；`b"not an image"` 与空字节被拒且当前文档不变。Rust 侧
    `tests_editor::open_raster_*`、`formats` 内联测试覆盖同类断言。
- [x] 2.2 U06：提供通用导出/Save for Web 的格式、质量、压缩、尺寸、透明及元数据设置、真实编码预览和预设；至少完成 JPEG/WebP 及矩阵内可写 TIFF。 成功证据：预览和交付使用同一设置与快照，真实输出可解码且尺寸正确；导出不覆盖工程保存基线。
  - 真实 WASM 逐格式实测：jpg `FFD8FFE0` / webp `RIFF` / tif `II*\0`(LZW) / png 签名正确，
    预览与交付**逐字节相同**，`documentContentHash` 在 7 组导出前后不变；
    `width:16` 缩放导出报告 16×12。
  - 拒绝路径实测：`exr`（暂缓）、`percent`+`width` 互斥、`quality:0`、Save for Web 与预设格式冲突。
  - Rust `tests_export::*`（含 `preview_and_delivery_share_one_encoder_and_are_byte_identical`、
    `required_formats_encode_real_decodable_bytes_at_the_requested_size`）。
- [x] 2.3 U07：提供逐层/所选层 Export As、Layers to Files 和按图层名称生成 Image Assets 的用户触发交付，处理重名、非法文件名和资源包预算。 成功证据：包中逐层像素/边界/命名与选择一致，导出报告能定位失败项，不启动后台磁盘生成器。
  - 真实 WASM 实测：逐层计划 = 所选层的真实隔离边界；包为 ZIP（`PK\x03\x04`）且含
    `report.json`，`inspectIoBundle` 可复核条目；单层 Export As 用报告里的图层名与格式命名；
    按名称资产只取资产语法图层（`图标.png`）。全部一次触发、内存组装，无后台生成器。
  - 面板的逐层格式可选（与通用导出共用同一份可写格式列表），计划/打包/单层导出使用同一格式；
    切换格式会作废旧计划，避免计划与交付格式不一致。
  - 导出设置旁显示内核预检给出的「目标尺寸」（`inspectExport`，不编码），参数非法时不显示；
    界面不复制格式/尺寸规则，避免与内核判定漂移。
  - Rust `tests_layers::*` / `tests_assets::*`（含空层逐项失败、重名改写、非法名逃逸、预算拒绝）。

## 3. 事务、核验与宿主

- [x] 3.0 复核中修复：`openRaster` 只按签名过预检、随后走共享导入链，导致 16 位 PNG「预检拒绝、
  打开却成功」（等于绕过 D2「不自动降位深」）。现改为与 `inspectRaster` 同一套真实解码准入
  （`inspect_raster_decoded`）后再建文档。
  - 回归：`tests_editor.rs` 新增 `opening_refuses_to_downconvert_what_the_preflight_refuses`（先失败后
    通过，已反向验证能抓到该缺陷）与 `truncated_and_oversized_inputs_are_rejected_before_replacing_the_document`；
    真实 WASM 侧 `wasm-integration.test.ts` 新增「截断/超预算/16 位在预检和打开处给出同一结论」
    （断言 `consistent`、拒绝原因含 `malformed`/`limit exceeded`/`u16`，且文档与 `contentHash` 不变）。
  - 代价如实记录：打开多解码一次（准入解码 + 共享链建文档解码）；因 `Editor::open_image` 属共享 core、
    本 change 不能改其签名以复用已解码结果。
- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  - 只读/预览/交付/计划都不写文档：Rust 用 `(state, content_hash)` 前后比对（
    `export_and_preview_share_one_snapshot_and_never_touch_the_document`），TS 侧
    `workspace.test.ts` 拒绝 `documentChanged !== false` 的报告。
  - 草稿门禁：`hasActiveDraft()` 时预览/交付/计划一律 `<draft>-active` 且不调用内核（替换内核断言）。
  - 非法参数在编码前拒绝，不会把上一次成功预览当成新设置提交（`parse_settings` 无状态）。
  - 界面侧同样不保留旧候选：改任一参数或预览失败都会撤下预览图并释放对象 URL
    （`panel-interaction.test.tsx` 覆盖「改格式撤图」「失败撤图」两个路径）。
  - **本轮补修的跨快照缺陷**：切换文档（或同一文档被编辑、所选层变化）后，面板仍显示上一份
    文档的逐层计划、资产计划与改名行，而「逐层打包下载」却按**当前**文档打包——
    界面清单与实际交付不一致。现以「活动标签 + 名字 + 尺寸 + 修订号 + 所选层」判定快照归属，
    失效时清空预览（并释放 blob URL）、两张计划与目标尺寸；换文档时连提示一起清掉。
    回归：`panel-interaction.test.tsx` 新增「切换文档后不再显示上一份计划」「同一文档编辑后
    旧计划与旧预览失效」（改前 2 项失败，恢复后 18 项通过）。真实浏览器复验：对 5 层工程
    取计划后打开 48×32 单层图，`layerPlan`/`assetPlan`/`renames` 由旧值变空。
- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  - 本域**不新增持久字段**：工程 wire/hash 不变（`features:check` 与 `bdc3c084` 快照一致）。
  - 导出预设是本机偏好（`ExportPresetStore` + `localStorage`），不进 `.pcraft`、不进内容指纹。
  - 原生核验域改写为「不主张任何对象类型」的有界 no-op + 2 项预算/上限测试
    （`cd photocraft/rust && cargo test -p photocraft-project-verify features::io` → 2 passed）。
- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  - 运行时协商：13 个新增绑定在 `wasm-instance.ts` 声明为**可选**，`wasm-handle.ts` 的
    `interchangeBindings` 一次性核对，缺失时返回
    `capability-disabled` +「请更新 WASM 产物」，不是 `TypeError`（`workspace.test.ts` 覆盖）。
  - 保存/切换/关闭门禁沿用 `WorkspaceFeatureContext` 的共享草稿门禁；本域不持有文档生命周期，
    不替换文档（打开只给预检，实际打开走 `EditorWorkspaceController.openImage`）。
  - 「来源失效不误写目标」在本域表现为：导出不推进保存基线，交付只报 `download-started`。
- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  - 「消费同一实现」已用真实产物验证：`features/io/wasm-integration.test.ts` 直接加载
    `packages/editor/dist/wasm`，经 `EditorHandle.features.io` → 域会话跑通矩阵、预览/交付同源、
    逐层/资产 ZIP、单层 Export As、逐格式真实打开、工程往返、打开预检、失败场景一致性与
    草稿门禁（12 项，产物缺失时 `skipIf` 明示跳过）。
  - dev 与 Woohaa 都经 `PhotoEditorApp` → `FEATURE_SECTIONS` / `FEATURE_PANELS` 自动加载本域
    面板，无需改装配；`boundary-regression.test.ts` 直接断言共享装配读到「图像 ▸ 格式与导出…」
    且指向 `InterchangePanel`。dev 用例本轮收尾后 22 项（原 8 项 + 新增 14 项宿主端口/菜单能力）、Woohaa 35 文件 287 用例与适配包 typecheck 均通过。
  - 错误恢复：旧内核缺导出 → `capability-disabled`；预览失败/改参数 → 撤下旧预览并释放对象 URL；
    报告形状不可信 → `invalid-report` / `invalid-export-report`；预检拒绝 → 带内核原因。
  - 发现并记录一条宿主接入须知：`openRaster` 只解码建文档、不设来源身份 `baseAssetId`，
    真实打开必须走 `EditorWorkspaceController.openImage`（含来源与保存基线）；否则「打开后」
    与「重开工程后」的内容指纹首次不同（像素/结构不受影响，已在 `wasm-integration.test.ts`
    与 verification 备注里写明）。
  - 补齐「必要公共端口」：新增 `controller.features.io.openAccept()`，从**同一份内核矩阵**派生
    可打开扩展名与 MIME（实测 27 个扩展名 / 13 个 MIME，与 `matrix().openable` 逐项一致），
    暂缓格式不入列。宿主只要把文件选择器的 `accept` 换成该端口返回值，就不必各自硬编码
    `image/png,image/jpeg,image/webp`——这正是此前 U05 新格式在宿主里选不中的原因
    （`workspace.test.ts` 3 项替身用例 + `wasm-integration.test.ts` 1 项真实产物用例：
    与 `matrix().openable` 逐项一致、暂缓格式不入列、`.pcraft` 不混入、无可打开行时明确失败、
    旧内核沿用 `capability-disabled`）。
  - 补齐 U05/U06/U07 的真实反馈面：矩阵行不再只显示两项，位深/布局/Alpha/扩展名/
    ICC·EXIF·XMP·DPI·文本·动画·有损全部来自内核（`panel-interaction.test.tsx` 断言）；
    内核 `warnings`（量化、DPI 丢弃等不可逆损失）在预览与交付提示里逐条显示；
    逐层/资产计划的 `rejected`（超预算/目标层失效）与 `renames`（重名、非法字符、保留名）
    不再静默丢弃。
  - 修正「界面显示的数字不是实际交付的数字」：Save for Web 的 JPEG 默认质量按内核
    `WebSettings::default()` 对齐到 60（原面板显示 90 却按 60 编码，实测显式传 60 与不传字节
    完全一致）；`pngCompression` 在 web 模式下隐藏，因为 Save for Web 走自己的优化器、
    该参数会被忽略（实测 `none` 与 `best` 都是 99 字节）。两者都有面板断言
    （`panel-interaction.test.tsx`「Save for Web 显示的质量就是内核实际用的那个」）。
  - 宿主接线已完成（经用户授权后越过 `parallel-work.md` 的宿主端口归属；触及的共享文件见文末
    「本轮触及的共享/宿主文件」）：
    - **格式清单单一权威**：`packages/protocol/src/features/io/index.ts` 新增
      `OPEN_RASTER_EXTENSIONS` / `OPEN_RASTER_MIMES` / `OPEN_RASTER_ACCEPT`。为什么用静态清单
      而不是只调 `openAccept()`：`<input accept>` 在首帧就要有值，端口依赖内核实例，异步会让
      用户可能在空窗期点开对话框。清单与内核矩阵的一致性由两条真实产物断言钉住：
      `wasm-integration.test.ts`「协议域的宿主格式清单与内核可打开行逐项一致」与证据脚本
      `hostAcceptParity`（27/27 扩展名、13/13 MIME、暂缓 7 项全部排除）。
    - **dev 宿主**：`accept` 由硬编码 3 个 MIME 换成 `OPEN_RASTER_ACCEPT`；`importImage` 在
      `ensureEditor()` 之后先跑 `io.inspectOpenRaster()`，暂缓/超预算/损坏字节显示内核原因
      （实测 EXR 由「codec: OpenExr: malformed data…」变为「OpenEXR 暂不支持打开：HDR/浮点位深」）；
      补齐 `documents` 的 `saveLabel/onSave/onOpenFile/onExportPng/list/onActivateDocument`，
      「文件」菜单才真正渲染。
    - **Woohaa 宿主**：`OPEN_FILE_ACCEPT` 改由 `OPEN_RASTER_ACCEPT` 派生；
      `classifyOpenFile` 的 MIME/扩展名集合改读协议域清单（不再自维护第二份）；
      `document-close.test.ts` 原「`.tiff` 必须拒绝」的断言按新范围改写为「可打开」，
      并新增暂缓格式仍拒绝、accept 与内核同源的断言。
    - **真实缺口修复（浏览器解码 ≠ 内核能力）**：`FileDocumentWorkspace.start()` 原先在
      `createImageBitmap` 失败时就报「图片无法读取」，而 TIFF/QOI/TGA/PNM/PCX/XPM/DDS 浏览器
      一律不认（已在真实 Chromium 逐个实测）。现改为交给内核：先进「打开中」，尺寸与像素由内核
      首帧预览补上；真正打不开时由内核给原因。`project-editor-pane.tsx` 的独立文件打开路径改为
      先跑 `io.inspectOpenRaster()`，通过则把**原始字节**交给内核（保留真实位深/布局与失真报告），
      旧内核无端口时退回原浏览器归一。
    - **共享「文件」菜单**：`EditorDocumentsMenu` 增加 `onExportRaster` / `onExportWeb`；
      `editorMenusFor` 在 `导出 PNG…` 之后追加「导出为…」与「Save for Web…」；`chrome` 分发这两个
      条目；`PhotoEditorApp` 在内核提供导出端口时把它们接到本域面板并落在对应模式。
      落点经本域 `features/io/menu-request.ts` 传递（共享层只负责说「打开本域面板」，
      页签/模式语义仍归本域），并有 4 项断言：菜单条目顺序与文案、Save for Web 落 web 模式
      （格式词变为 png24/png8/gif/jpeg）、同一意图只应用一次、用户后续切换不被覆盖。
    - **真实界面走查**（Playwright + 真实 Chromium + 真实 WASM 产物，1440×1000 与 1024×768）：
      「图像 ▸ 格式与导出…」「文件 ▸ 导出为…」「文件 ▸ Save for Web…」三个入口都打开同一面板且
      落点正确；13 种格式经文件选择器逐格式打开成功；JPEG/WebP/TIFF 预览字节 == 下载字节
      （654/90/4818 B）；逐层 ZIP 980 B；两个视口均无横向溢出、无 pageerror。
  - **收尾轮补齐的宿主端口（3 处真实缺陷 / 缺口，均有可失败回归）**：
    - **dev 宿主缺 `fileDelivery` 端口**：「文件 ▸ 导出 PNG…」一直返回「当前宿主不支持本地文件
      保存」，界面却没有任何提示（`onExportPng` 里 `void deliverFile(...)` 丢掉了结果）。
      端口装配已从 JSX 抽到 `dev/src/dev-controller.ts`（`devControllerOptions()`），
      下载语义在 `dev/src/dev-delivery.ts`（只报 `download-started`，空名/空字节明确失败，
      失败释放对象 URL），并把交付结果映射成界面提示（`exportOutcomeMessage()`）。
      真实 Chromium 复验：点击后真实下载 `sample.png`，状态区显示
      「已发起下载：sample.png（下载不等于已保存工程）」，`pageerror` 为空。
    - **导出/保存文件名重复扩展名**：dev 宿主用 `document.name`（已是 `sample.png`）直接拼 `.png`，
      下载得到 `sample.png.png`；保存更是写死 `photocraft-A.pcraft`，而 Woohaa 一直按文档名先剥扩展名。
      现统一走
      `exportFileName(name, ext)`（保留 `a.v2.tif → a.v2.png`、不把路径分隔符当扩展名分隔、
      空名回退 `photocraft.png`），保存与导出共用同一套推导（`sample.pcraft` / `sample.png`）。
    - **「保存」失败无人接**：dev 的 `documents.onSave` 写成 `() => { void apply(); }`，
      返回 `undefined`，共享层 `await save()` 立刻完成，保存失败变成未处理的 rejection，
      界面一片空白。现改为返回 Promise，并把整段菜单能力装配抽到 `dev/src/dev-documents.ts`，
      让「保存返回 Promise」「导出落交付端口并报结果」「取消/失败都有提示」「只列已打开文档且
      切换走门禁」四件事都能在 node 下断言。
    - **「置入图片…」仍硬编码 3 个 MIME**：`PLACE_IMAGE_ACCEPT` 原为
      `image/png,image/jpeg,image/webp`，而内核 `place_asset` 用同一套 codecs 解码。
      本 change 新开放的 TIFF/GIF/BMP/TGA/QOI/PNM/PCX/XPM/DDS 因此选不中——同一个域在
      「打开」与「置入」给出两份能力清单。现改为 `OPEN_RASTER_ACCEPT` 派生；
      真实 WASM 逐格式实测 12 种全部置入成功（含 pcx/xpm/dds），EXR 仍在内核预检处被拒并给原因。
    - **回归**：新增 `dev/src/dev-export.test.ts`（收尾后 14 项：装配里真的有 `fileDelivery`、导出不推进
      基线、保存才推进、失败原因带回、文件名推导、结果→提示映射、端口语义、菜单能力装配）与
      `integrations/woohaa/tests/interchange-menu.test.tsx`（3 项：菜单条目与顺序、旧内核不出现
      死菜单项、点击真的展开本域面板并落 `export` / `web`）；`place-file.test.ts` 增 1 项
      「置入 accept 与打开同源」。三处均做过反向验证（删端口 / 关掉 `coversInterchange` /
      还原硬编码，对应用例分别失败）。
    - **走查结论修正**：`tasks.md` 3.4 里「落点经本域 `menu-request` 并有 4 项断言」中的
      「Save for Web 落 web 模式、同一意图只应用一次」原为面板级替身断言；本轮补上了**经共享
      菜单真实渲染**的断言（`interchange-menu.test.tsx`），两者叠加才覆盖「菜单 → 面板」整条链。
  - **修复本域一处真实缺陷：Save for Web 谎报「无损失」**。`optimize()` 只返回字节与调色板、
    不产出损失清单，原实现因此硬编码空 `warnings`；实测 GIF/PNG-8 确实量化、JPEG 确实有损，
    但预览与交付提示都说「无」。现从真实编码结果推导（调色板真实颜色数、索引格式的有损、
    alpha 转单索引、JPEG 有损），报告里的 `colors` 与提示里的数字一致。
    真实浏览器复验：渐变图 GIF 显示「colours will be quantized to a 64-colour palette」，
    纯色图显示「1-colour palette」（不再固定写 256）。反向验证：还原为 `Vec::new()` 时
    新增用例 `save_for_web_reports_the_losses_it_actually_performs` 失败。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  - 实际命令与计数见 [verification.md](verification.md)「执行记录」。
- [x] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：在真实 WASM 逐格式打开 → JPEG/WebP/TIFF 真实编码预览 → 逐层/按名称资产交付；缺 codec、伪扩展名、包超限和取消分别验证。
  - 执行环境：Playwright 1.63 + 真实 Chromium（`~/.cache/ms-playwright/chromium-1243`），
    加载本 worktree 的 dev 宿主（`vite --port 4488`）+ 真实 WASM 产物，
    视口固定 1440×1000 与 1024×768，两个视口各跑一遍完整主线。
  - **逐格式打开**（经真实文件选择器，走 `File` → `openImage`）：png/jpg/tif/webp/gif/bmp/
    tga/ico/qoi/pnm/pcx/xpm/dds 共 13 种全部打开成功（12 种 48×32，pcx 2×1、xpm/dds 2×2，
    尺寸来自各自夹具的真实签名）；面板挂载、20 行矩阵、无横向溢出、无 pageerror。
  - **真实编码预览 → 交付**：三处入口（图像菜单 / 文件 ▸ 导出为… / 文件 ▸ Save for Web…）
    打开同一面板且落点正确（export / export / web）。单层 48×32 夹具：JPEG 654 B、
    WebP 90 B、TIFF 4818 B；多图层 64×48 工程：678 / 98 / 9426 B。两套夹具的预览提示
    字节数都与下载文件字节逐项相等（同一 `encode_export`）。
  - **逐层与资产**：单层文档 `Background.png 48×32`，ZIP 980 B；多图层工程
    （`图标.png`/两个`同名`/`../escape`）逐层计划只含当前选择层，改名行显示
    `../escape → _escape.png 开头的点已移除`，逐层 ZIP 982 B，资产计划
    `图标.png 64×48`、资产 ZIP 886 B。
  - **失败场景**：缺 codec → 「OpenEXR 暂不支持打开：HDR/浮点位深（F16/F32）；本 change
    不自动降位深」（修复前是 `codec: OpenExr: malformed data…`）；伪扩展名 → PNG 字节命名为
    `.tif` 仍按签名识别为 png 并成功打开；损坏字节 → `Png: malformed data: unexpected end of file`；
    改参数 → 旧预览被撤下（预览 1 → 0）；超预算（宽度 20000）→ 目标尺寸不显示、预览不产出。
  - **限制说明（如实记录）**：Chromium 为 headless 运行，画布像素由 CPU/软件光栅合成。
    因此本项只作证 **UI 布局与交互主线**（菜单、面板、参数、预览尺寸、下载字节、溢出），
    本机 `/dev/dri` 无 `renderD*`，**不**据此得出任何 GPU 帧率、渲染质量或长尾结论；
    实体 Pad 的触控与硬件差异仍属人工验收范围。
  - 截图存于本 change `evidence/`：`walkthrough-1440x1000.png`、`walkthrough-1024x768.png`、
    `walkthrough-export-mode.png`（均由真实 Chromium 渲染）。
- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  - 记录在 [verification.md](verification.md)「U05/U06/U07 逐项结果」；缺 codec 项（EXR/HDR/
    Cineon/FITS/DPX/AVIF/HEIF）按暂缓记录原因并保持关闭。
  - 工程往返已在真实 WASM 上验证：打开 PNG 后重新编码与源文件逐字节相同，存 `.pcraft` 再重开
    画布/图层/文档名一致，「重开 → 再存 → 再重开」内容指纹稳定。首次打开与重开的指纹差值来自
    `baseAssetId` 归属（共享打开链回填），已写入 verification 的备注与 3.4 的复核项。
  - Photoshop 外部可编辑往返：本 change 未改 PSD 兼容项，无需外部应用验收（沿用原 change 状态）。
- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  - 新增 [evidence/interchange-matrix.md](evidence/interchange-matrix.md)（逐格式矩阵 + 暂缓清单 +
    预算归属 + 与宿主菜单的关系）。
  - 未把 `INTERCHANGE_CAPABILITIES` 写进共享阶段清单/fixture：入口由本域面板真实调用，
    不宣称已开放为全局能力。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  - 改动范围：`packages/editor/src/features/io/`、`packages/protocol/src/features/io/`、
    `rust/crates/editor-core/src/features/io/`、`rust/crates/project-verify/src/features/io/`、
    本 change 目录。
  - 域内部分见 1.0（protocol 公共入口追加导出、boundaries 计数），均为**纯增量且未复制实现**。
  - **本轮追加（经用户明确授权越过 `parallel-work.md` 的宿主端口归属，为完成 3.4 的宿主接线）**：
    共改动 19 个共享/宿主文件：4 个共享包/共享 UI（protocol 公共入口 + editor 的菜单 / chrome / app）、
    6 个 dev 宿主文件（`PhotoCraftDevApp.tsx`、`dev-controller.ts`、`dev-delivery.ts`、
    `dev-documents.ts`、`dev-workspace.ts`、`dev-export.test.ts`）、9 个 Woohaa 宿主文件
    （`open-file` / `place-file` / `file-document-workspace` / `project-editor-pane` / harness
    + 4 个测试），外加 `boundaries.test.ts` 的注册计数断言（合计 20 个路径）；全部为
    **纯增量或按新范围改写**，未复制第二套实现；清单与理由见文末「本轮触及的共享/宿主文件」，
    供集成负责人逐项复核。
- [x] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  - 前置核对：`parallel-work.md` 写明「**同级完成前置：无**」，因此不存在「等 18 个 change
    合入」这个门槛（此前记的「未勾选」理由与该文件矛盾，已纠正）。本项执行的是「与**当前分支
    真实存在的提供方**的联合回归」，不 mock 任何一侧。
  - 新增 `packages/editor/src/features/io/cross-domain.test.ts`（真实 WASM，4 项）：
    1. **像素**：其他域（`select.rect` 选区 + 带真实参数的亮度/对比度调整层）改过文档后，
       本域导出的 PNG 字节必须变化（否则「导出」等于绕过其他域）；默认参数调整层不改像素，
       原断言因此误判，改用真实参数而不是放宽断言。
    2. **身份**：连续导出 4 种格式 + 预览都不改变内容指纹；跨域写入才推进指纹。
    3. **保存**：跨域写入后存 `.pcraft` 再重开，图层名序列/宽高一致，本域导出仍可用且尺寸一致。
    4. **核验**：导出的工程交给**原生** `photocraft-project-verify` 二进制（与服务端/CI 同一实现，
       不在此重写一份 ZIP 校验自证）→ `{"ok":true}`。
  - **UI 跨域**：真实浏览器里「文件 ▸ 导出为…」与「Save for Web…」经共享菜单进本域面板、
    面板消费真实内核、交付写盘由宿主端口完成，已随 4.2 一并走通。
  - **仍不勾选的子项**（无真实提供方，按任务要求不得勾选）：与目标模式/通道/旋转视图/
    新层类型交叉的联合验收依赖 sibling change 的未实现能力；`parallel-work.md`「交叉验证」
    明确要求「在双方能力均可用后补真实联合验收」，本分支上这些能力不存在，故不作断言。

## 未勾选原因（汇总）

本 change 的实施任务（1.x–5.2）已全部勾选。以下三类**不属于本 change 的实现任务**，仍在别处跟踪：

| 项目 | 原因 | 归属 |
| --- | --- | --- |
| 实体 Pad 触控/硬件差异验收 | 4.2 的界面主线已在真实 Chromium 的 1440×1000 与 1024×768 两个视口跑完；headless Chromium 的像素由 CPU 光栅合成，本机 `/dev/dri` 无 `renderD*`，因此**不**据此得出 GPU 帧率/渲染质量/长尾结论 | 待人工验证（真实设备） |
| 全局能力登记（`INTERCHANGE_CAPABILITIES` → 契约 fixture / 阶段清单 / WASM 基线） | 本域能力目前只由本域面板真实调用；登记进共享阶段清单会让阶段产物与基线字节变化，属集成负责人顺序落地 | 集成负责人 |
| 与未实现 sibling 能力的交叉验收 | 目标模式 / 通道 / 旋转视图 / 新层类型等组合，`parallel-work.md` 要求在**双方能力均可用后**补真实联合验收；当前分支不存在这些提供方 | 双方交付后 |

## 本轮触及的共享/宿主文件（供集成负责人复核）

本轮为完成 3.4 的宿主接线，经用户明确授权越过了 `parallel-work.md`「宿主端口由集成负责人顺序落地」
的归属约定。以下清单须在合并时由集成负责人确认，避免与其它并行分支的同名改动冲突：

| 文件 | 改动性质 | 内容 |
| --- | --- | --- |
| `packages/protocol/src/index.ts` | 纯增量再导出 | io 域的 `OPEN_RASTER_EXTENSIONS` / `OPEN_RASTER_MIMES` / `OPEN_RASTER_ACCEPT`（含 1.0 原有的 14 值 + 16 类型） |
| `packages/editor/src/photo-editor-menu.ts` | 纯增量 | `EditorDocumentsMenu` 增加可选 `onExportRaster` / `onExportWeb`；`editorMenusFor` 在 `导出 PNG…` 后按需追加两个条目 |
| `packages/editor/src/photo-editor-chrome.tsx` | 纯增量 | 「文件」菜单分发 `file.exportRaster` / `file.exportWeb` 到对应回调 |
| `packages/editor/src/photo-editor-app.tsx` | 纯增量 | 内核提供导出端口时，把两个菜单回调接到本域面板并落在对应模式（`documentsForBar` / `openInterchange`） |
| `dev/src/PhotoCraftDevApp.tsx`（宿主） | 按新范围改写 | `accept` 改用 `OPEN_RASTER_ACCEPT`；打开前跑本域预检；补齐 `documents` 的保存/打开/导出/清单回调；`onSave` 改为返回 Promise（原来 `void apply()` 把保存失败变成未处理 rejection）；导出提示与文件名改由 `dev-delivery.ts` 提供；保存与导出统一按文档名推导文件名；菜单能力整体改由 `dev-documents.ts` 组装 |
| `dev/src/dev-controller.ts`（宿主，新增） | 新增 | dev 控制器端口装配（`session` / `fileDelivery` / `save` / `assetUrl` / `dialogOwner` / `documentName`）；把装配从 JSX 抽出，使「端口真的注入」可断言；保存文件名按文档名推导 |
| `dev/src/dev-delivery.ts`（宿主，新增） | 新增 | 浏览器下载交付端口（只报 `download-started`，空名/空字节明确失败，失败释放对象 URL）、`exportFileName()`、`exportOutcomeMessage()` |
| `dev/src/dev-workspace.ts`（宿主） | 纯增量 | 新增 `documentName(slot)` 读法，供保存/导出按文档名推导交付文件名（`names` 原为私有） |
| `dev/src/dev-documents.ts`（宿主，新增） | 新增 | dev「文件」菜单能力装配：保存返回 Promise、导出落交付端口并报告结果、文档清单只列已打开的槽位、切换走门禁 |
| `dev/src/dev-export.test.ts`（宿主测试，新增） | 新增 14 项 | 端口注入、导出不推进保存基线、保存才推进、失败原因带回、文件名推导、结果→提示映射、菜单能力装配（4 项） |
| `integrations/woohaa/src/place-file.ts`（宿主） | 按新范围改写 | `PLACE_IMAGE_ACCEPT` 改由 `OPEN_RASTER_ACCEPT` 派生（置入与打开共用一份清单，内核 `place_asset` 本就同源解码） |
| `integrations/woohaa/src/test-support/photo-editor-harness.tsx`（宿主测试支撑） | 纯增量 | `setup()` 增加可选 `documents` / `features`，使共享菜单接线可在宿主侧被真实断言；替身补 `currentView()`（真实控制器一直提供） |
| `integrations/woohaa/tests/interchange-menu.test.tsx`（宿主测试，新增） | 新增 3 项 | 菜单条目与顺序、旧内核不出现死菜单项、点击真的展开本域面板并落 `export` / `web` |
| `integrations/woohaa/src/open-file.ts`（宿主） | 按新范围改写 | `OPEN_FILE_ACCEPT` 与 `classifyOpenFile` 改读协议域清单，不再自维护第二份 |
| `integrations/woohaa/src/file-document-workspace.ts`（宿主） | 行为修复 | `start()` 在浏览器解码失败时交给内核，不再直接报「图片无法读取」 |
| `integrations/woohaa/src/project-editor-pane.tsx`（宿主） | 行为修复 | 独立文件打开先跑 `io.inspectOpenRaster()`，通过则把原始字节交给内核 |
| `integrations/woohaa/tests/document-close.test.ts`（宿主测试） | 按新范围改写 | 原「`.tiff` 必须拒绝」改为「可打开」；新增暂缓格式仍拒绝、accept 与内核同源断言 |
| `integrations/woohaa/tests/document-session.test.ts`（宿主测试） | 纯增量 | 新增「浏览器解码失败时交给内核」用例（改写前该场景会被误判为不可读） |
| `integrations/woohaa/tests/place-file.test.ts`（宿主测试） | 纯增量 | 新增「置入 accept 与打开同源」用例：`PLACE_IMAGE_ACCEPT === OPEN_RASTER_ACCEPT`，防止两处能力清单再次分叉 |

文档同步（非代码行为）：`docs/code-map/photocraft.md`（io 域与宿主条目）、
`photocraft/notes/feature-boundaries.md`（io 职责）、`photocraft/packages/editor/README.md`（域会话契约）。

另有 `packages/editor/src/features/boundaries.test.ts`：`FEATURE_SECTIONS` 唯一 id 断言 12 → 13
（本域新增 `interchange` 面板）。断言值随注册数变化，不是新的行为约定。

**未改动**：`editor-workspace.ts`、`editor-wasm.ts`、`photo-editor-canvas.tsx`、
`photo-editor-tools.ts`、`editor-tool-panels.tsx`、protocol 的
`image-project-content.ts` / `image-project-editor.ts`、Rust 的
`editor.rs` / `editor/tools.rs` / `wasm.rs` / `capability.rs` / `document_content.rs` / `identity.rs`、
`project-verify` 的 `lib.rs` / `limits.rs`、全局版本/预算/fixture/锁文件、通用 UI primitives、
`vendor/photocraft`。

`INTERCHANGE_CAPABILITIES` 尚未进 `tests/fixtures/contract.json` / 阶段清单 /
`notes/feature-boundary-wasm-baseline.json`；开放为全局能力须由集成负责人一次聚合（见上方
「未勾选原因」表中「全局能力登记」一行）。
