# 时间轴与浏览器视频工作流设计

## 基线与范围

固定上游 commit `4e7a17cd5d5723313f459753663d0d155f047e19`；已提交实现 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。范围逐项列于 [scope.md](scope.md)，每个 U 组的子能力都需拆成实现时的命令/参数/操作记录，不以一组一个按钮结案。

同级前置：2026-10-22-add-photocraft-raster-interchange。相邻模块只是消费端口的软依赖时，以现有内核能力完成基础流程，新增联动在两边均交付后验证。原 change 的未验收项仍按其证据处理；本计划仅追加缺口，不自动勾选或重写旧任务。

## 操作与布局

窗口 → 时间轴；文件 → 帧导入 / 视频导入 / 导出动画；播放/定位/帧属性就在当前编辑文档下方。

复用固定上游 0.9.0 的生产算法，不修改 vendor。`rust/crates/editor-core` 持有规范内容、命令、预览草稿、身份与历史；`packages/protocol` 持有纯数据和限额契约；`packages/editor` 持有共享工具/面板。`dev` 与 `integrations/woohaa` 只装配公共端口，核心不得 import Woohaa 私有实现或内部工具。

界面沿用既有菜单 → 工具组 → 参数栏 → 原图/属性反馈的结构，菜单和参数栏在文档标签之上。所有状态均需有可见忙碌、失败与恢复反馈；面板仍使用现有浮动/停靠能力，不重新设计外壳。只验收电脑 1440×1000 和 Pad 正常窗口 1024×768；手机/极窄窗口和无障碍专项不在范围。

## 本域实现决策

### D1

先建立帧模型、时间基准、播放状态和有界资源预算，再接帧序列编辑；随后接视频轨道/逐帧编辑和导出。播放位置、计时器为会话态；帧持续时间、顺序、轨道编辑和嵌入媒体引用进入工程身份/核验。播放不推进历史。

### D2

公共 codec 端口提供 supports/decode/encode/cancel，以实际 WebCodecs 和容器 mux/demux 能力协商；浏览器不得运行上游 ffmpeg 子进程。缺少适配时隐藏/禁用对应视频格式并给出具体原因，仍可做经过验证的帧序列。不得静默只取首帧当作动画导入成功。

### D3

新增共享限制应按现有 64 MiB 工程预算反推帧数/累计像素/压缩与解码上限；实施基准为至多 120 帧、累计 16,777,216 像素、解码 128 MiB，最终取与现有预算的更严格交集。WASM/UI/Node/原生核验器同步，不每帧重新给完整预算。

### D4

帧预览结果包含 document generation、frameId 和请求序号；切帧/标签/关闭停止旧播放和解码。编辑明确作用当前帧或所选轨道区段，一次操作统一提交；导出冻结工程快照，有进度/取消/报告，文件下载与工程保存分开。

## 事务和生命周期

内容操作遵守 begin → preview → commit/cancel：固定 documentId/generation、baseRevision、目标及 attemptId；预览不变正式内容 hash/修订/历史，确认最新有效候选一次，取消恢复，无变化不新增历史。非法参数不得确认上一份成功预览。一次笔迹/拖动按既有完成规则提交，不强制所有参数都变成弹窗。

保存、切文档、关闭、只读变化和父子回写复用活动草稿门禁。晚到任务按文档代际和请求序号丢弃，不能写入后来活动文档。只读采样和工具/查看偏好不制造文档 dirty。分组队列若有不同语义必须在具体设计中声明，不虚构跨文档原子事务。

## 内容、协议与核验

逐能力同步参数解码、唯一命令门、WASM、React、内容身份、工程序列化、TS 检查和原生核验器；实际接通后才发布能力，不把整个命令前缀放开。共享限制只在 `rust/project-limits.json` 与两端 fixture 中维护；不整体提升现有 8192 单边、64 图层、64 MiB 工程、16 嵌套深度和 8 文档上限。

新增规范内容缺省/空值保持旧工程身份兼容，工具本机设置/视图不进入内容 hash。涉及新持久字段时必须给出与旧运行时的能力协商、解码前累计预算和资源引用验证；未知内容不能通过通用 JSON/PSD 原始块绕过。PSD 与 LayerTransferBundle 的兼容项逐类型更新，无法表达时报告而非静默压平。

## 取舍与发布条件

优先复用上游算法和现有 UI/草稿，避免复制另一套内容状态。不能编译进 WASM、没有 codec/字体/硬件或缺公共端口的子能力单独记录停止原因，不能因此把整个域标为完成。

依赖原生进程的未移植视频编解码、后台转码、无限时长/超预算媒体保持关闭；有真实端口和验收前不宣称 Render Video 可用。

## 验收主线

导入三帧 → 编辑持续时间/顺序 → 定位绘画 → 保存重开 → 帧序列交付 → 在支持的实际 codec 上导入/导出视频；无 codec 和中途取消均有证据。 具体成功/失败情景和逐项证据见 specs 与 verification；实际像素、结构、历史和工程往返都通过后才开放相应子能力。

## 并行边界

以 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际提交为启动门槛；完整目录、共享文件禁并改清单和完成依赖见 [parallel-work.md](parallel-work.md)。不能在当前集中式代码上直接开启 18 路实施。

## 实施落点（本次已交付）

逐项命令/参数/测试对照见 [matrix.md](matrix.md)，实际结果见 [verification.md](verification.md)。

- **内核**（`rust/.../features/animation/`）：`tools.rs` 的 `Editor` 入口（建立/属性/导航/视频层/导入/交付/写回帧栈）、
  `limits.rs` 的帧预算、`export.rs` 的逐帧合成与动画 GIF、`content.rs` 的纯内容摘要、`wasm.rs` 的 10 个绑定。
  导航只推进修订不记历史；导入整批预算先于写入；交付在文档副本上冻结。
- **协议**（`packages/protocol/src/features/animation/`）：载荷类型、`AnimationCodecPort`（supports/decode/encode/cancel）
  与守卫、帧字节计算、TS 侧内容规范序列。预算不在此重复声明，读内核 `timelineJson().budget`。
- **界面**（`packages/editor/src/features/animation/`）：`TimelinePanel`（时间轴、帧编辑、帧导入、视频导入、交付与取消）、
  `playback.ts`（会话态播放：代际 + 请求序号、幂等 play/stop、导航失败即停）、`frame-decoder.ts` /
  `video-decoder.ts`（浏览器解码与端口解码预检）、`frames-export.ts` + `zip-store.ts`（逐帧 PNG 打包一次下载）、
  `codec.ts`（宿主端口注册点 + 容器协商：MP4→WebM 取端口实际支持的第一个，而不是把 MP4 当唯一容器）。
  入口是 `placement: "advanced"` 的 `timeline` section。
- **内容身份**：`content.rs` / `content.ts` 的摘要按**图层名 + 文档顺序**计身份，不按 `LayerId`——上游
  `format::convert` 只在 `preserve_ids` 时才保留 id，用 id 当键会让同一工程在保存重开后换摘要。
  播放头与工作区范围是会话/视图态，不进摘要。摘要由 `document_content::project_content` 追加为
  `animation` 字段，并由 `identity::canonicalize_animation`（Rust）与 `canonicalizeAnimationContent`
  （TS）写成**同一份长度前缀规范文本**：`animation:<fps>,<duration>:<len>:[<len>:<name>@<fps>,<altered>,<len>:[<hash>,<w>,<h>,<format>;]]`。
  长度前缀而不是嵌套 JSON，避免图层名里的分隔符歧义与深层转义膨胀；`original` 与 `children` 只在
  存在时出现。旧工程没有 `animation` 字段 → 规范文本逐字节不变 → 历史指纹兼容。
- **视频层的显示内容不是独立内容**：上游把播放头处的帧同步成图层显示内容（`video_cmds::sync`），
  它只是帧栈的投影。因此共享指纹对视频层做两个特判：显示内容与播放头处的帧一致时用固定标记
  （否则拖动播放头就会把工程判成「已修改」），不一致时（有尚未写回的绘画编辑）用显示内容摘要
  （否则真实编辑会被漏判、保存时丢掉）；图层平移同样改用恒等变换，不取显示内容的包围盒。
  「不一致就用显示内容」的前提是**这份显示内容真的会被写回**（上游条件 `show_altered || 没有原始素材`）。
  「显示原始素材」模式下写回被跳过（#3060），显示内容只是预览，因此那里一律用固定标记：否则指纹会
  声称一份存不进工程的编辑，保存重开后指纹回退、宿主刚存完就认为工程被外部改过。这类编辑由
  `flushVideoFrames` 返回 `original-view-preview` 如实提示，而不是报成「没有要写回的内容」。
- **没有原始素材时的「恢复原始帧」**：上游是 `original.unwrap_or_else(blank)`，即把帧清成空白。浏览器
  的帧导入不产生原始素材副本，所以域入口先判 `hasOriginal` 再决定拒绝（面板禁用条件同源）；原生应用
  保存的工程带 `original_frames`（随 `.pcraft` 往返），在浏览器里恢复照常生效。
- **核验**（`rust/.../project-verify/features/animation/`）：逐层视频层帧数/帧率/累计像素/原始素材一致性，
  加上文档级 `inspect_document`（时间轴时长/帧率/播放头/工作区范围 + 整棵图层树），供共享
  `verify_container_with` 一行接入。
- **进程内核验对齐**（`packages/project-verifier/src/project-verification.ts`）：未配置原生工具时这里是
  Media 的**默认**接收边界，原先无条件把 `layer.video` 判成 `external-reference`，会让默认部署拒绝自己
  保存的动画工程。现按原生同口径接受内嵌帧栈、按 120 帧 / 16,777,216 累计像素 / 1000 fps 收紧、
  `objectKinds` 记 `video-layer`，并新增文档级 `inspectTimeline`；`video: null`（上游每个图层都会写）
  视为无视频层。只修正本域内容的错误拒绝，未放宽其它对象类型。

依赖原生进程的路径命令（`newVideoLayerFromFile`、`replaceFootage`、`reloadFrame`、
`file.import.videoFramesToLayers`、`file.export.renderVideo`）不登记进命令门，执行被拒。`interpretFootage`
经核对上游实现（只写视频层的 `fps`，不读文件）后**登记**，域包装先校验帧率预算。

- **共享接线（本次已落地）**：`features/mod.rs` 把 `animation::inspect` 排在 `painting` 之前、
  `project-verify/lib.rs::verify_container_with` 调用一次 `animation::inspect_document`；
  `photo-editor-chrome.tsx` 把 `featureMenuSections("窗口")` 合到「窗口」菜单；`psd.rs` 对视频层给出
  `kind:"video"` 损失行（默认导出拒绝，显式栅格化成功）。
- **宿主端口**：`packages/editor/src/index.ts` 导出 `setAnimationCodecPort`/`animationCodecPort` 等注册点；
  Woohaa 插件装配时注册 `animation-codec-port.ts`（WebCodecs 异步探测 `VideoEncoder/VideoDecoder.isConfigSupported`
  + 容器白名单 mp4/webm）与 `animation-media-kit.ts`（`mediabunny` 动态加载做 demux/decode 与 mux/encode），
  卸载时清除。dev 宿主不注册端口（避免改被基线钉住的 `photocraft/pnpm-lock.yaml`），视频入口按缺端口禁用并说明。
  真实视频字节的端到端仍需浏览器 WebCodecs + 显示会话，属人工验收。
