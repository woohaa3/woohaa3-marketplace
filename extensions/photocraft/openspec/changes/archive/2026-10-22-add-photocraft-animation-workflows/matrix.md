# U77 逐项能力矩阵

本页是任务 1.2 的产物：把 scope 中 U77 的每个子能力从**生产命令/参数**一路列到**验收证据**，
并标明本 change 实际接通到哪一步、哪些因平台能力**暂缓且保持关闭**。只写命令字符串或只让菜单
出现不算实现；每一行的「已接通」都必须能指到本 change 的测试或真实 WASM 产物。

列含义：

- **命令 / 参数**：内核命令 id 与接受的参数（缺省值见括号）。
- **包装（Rust）**：`Editor` 上的域入口与预算/草稿校验。
- **WASM**：`WasmEditor` 的绑定名；`—` 表示不经 wasm-bindgen（走通用 `execute`）。
- **UI 手势**：域面板/播放会话中的实际入口。
- **内容 / 核验**：是否进入内容身份、工程往返、核验器规则。
- **验收**：覆盖它的测试（真实 WASM 用 `tests/features/animation/*.test.mjs`）。
- **状态**：已接通 / 暂缓（附真实原因）。

## 1. 时间轴与帧导航

| # | 命令 / 参数 | 包装（Rust） | WASM | UI 手势 | 内容 / 核验 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | `timeline.create` `{duration, fps}` | `Editor::create_timeline`：`duration 1..=120`、`fps 0<x<=1000`、草稿门禁 | `createTimeline` | 面板「建立时间轴」；无时间轴时仅显示该入口 | 时间轴 `fps`/`duration` 进 `animation_content_json` **并已进入共享 `documentContentHash`**（`identity::canonicalize_animation` ↔ TS `canonicalizeAnimationContent`）；`.pcraft` 往返保留；核验器文档级检查时长/帧率/播放头/工作区 | `timeline_budget_rejects_impossible_durations_and_rates`、`timeline_create_navigate_and_delete_round_trip…`、`document_level_timeline_and_frame_budgets_are_enforced`、`timeline_and_video_frames_join_the_document_content_hash`、WASM 主线 | 已接通（能力 `animation.timeline` 已发布） |
| T2 | `timeline.setProps` `{fps, duration, workStart, workEnd}` | `Editor::set_timeline_props`：同预算校验；`work*<=120` | `setTimelineProps` | 面板帧率/时长/工作区起止 + 「应用」 | 只有 `fps`/`duration` 是内容；`workStart/End` 是视图 | `no_op_props_and_flush_report_without_adding_history`、WASM 边界用例 | 已接通 |
| T3 | `timeline.setFrame` `{frame}` | `Editor::navigate_timeline`：只接受导航 id，`frame<=120`，返回 `historyAdded` | `navigateTimeline` | 上一帧/下一帧/定位输入/播放会话 | 播放头不进内容身份（改帧率则**会**改变指纹） | `navigation_and_reads_never_touch_content_identity`、WASM 主线（historyAdded=0） | 已接通 |
| T4 | `timeline.nextFrame` / `timeline.previousFrame` `{}` | 同上 | `navigateTimeline` | 面板「上一帧/下一帧」 | 同上 | 同上 + `playback.test.ts`（回卷/工作区范围） | 已接通 |
| T5 | `timeline.info` `{}` | `Editor::timeline_info` → `{timeline, budget, videoLayers}` | `timelineJson` | 面板每次写后刷新；预算上限取自内核 | 只读，不推进修订 | `navigation_and_reads_never_touch_content_identity` | 已接通 |
| T6 | `timeline.delete` `{}` | 域会话 `deleteTimeline` 转发通用 `execute`（命令门 + 草稿门禁） | — | 面板「删除时间轴」 | 删除后 `timeline` 为空，旧身份恢复 | `timeline_create_navigate_and_delete_round_trip…` | 已接通 |

## 2. 视频图层与逐帧编辑

| # | 命令 / 参数 | 包装（Rust） | WASM | UI 手势 | 内容 / 核验 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V1 | `layer.videoLayers.newBlankVideoLayer` `{}` | `Editor::video_layer_command`：图层名额 + 帧预算 | `videoLayerCommand` | 「新建空白视频层」 | 视频层 `frames/fps/showAltered` + 逐帧 `surface_hash` 进内容摘要；核验域排在 `painting` 之前认领视频层 | `video_layer_commands_stay_inside_the_frame_budget`、WASM 边界用例、核验器 `a_saved_video_project_round_trips_and_an_oversized_one_is_refused` | 已接通 |
| V2 | `layer.videoLayers.insertBlankFrame` `{}` | 插入前算目标帧数，>120 直接拒绝 | 同上 | 「插入空白帧」 | 帧数增长随工程保存 | 同上 | 已接通 |
| V3 | `layer.videoLayers.duplicateFrame` `{}` | 同上；复制当前帧且同步时长 | 同上 | 「复制当前帧」 | 帧顺序即内容（换序改变摘要） | `imported_frame_order_is_editable_and_persists` | 已接通 |
| V4 | `layer.videoLayers.deleteFrame` `{}` | 命令门 | 同上 | 「删除当前帧」 | 帧数减少并随工程保存 | WASM 边界用例（5→4 帧） | 已接通 |
| V5 | `layer.videoLayers.restoreFrame` / `restoreAllFrames` `{}` | 命令门；**无原始素材时域入口拒绝**（上游取不到原始素材会写空白帧，等于清空用户帧），有原始素材时正常恢复 | 同上 | 「恢复原始帧 / 恢复全部原始帧」；无原始素材时按钮禁用并说明 | `original_frames` 只在存在时出现，并随 `.pcraft` 往返（原生应用保存的工程可用） | `restoring_without_original_footage_is_refused_instead_of_blanking_the_frame`、`restoring_with_original_footage_brings_the_frame_back`、WASM 边界用例（两个 id 都被拒且身份不变）、面板「没有原始素材时恢复帧入口禁用并说明」「有原始素材时恢复帧入口可用」 | 已接通 |
| V6 | `layer.videoLayers.showAlteredVideo` `{}` | 命令门；切到原始视图后作画不写回，`flush` 如实报 `original-view-preview` | 同上 | 「显示修帧结果」 | `showAltered` 进内容摘要；原始视图下的显示内容**不进身份**（写回被跳过，存不进工程） | `edits_made_while_showing_the_original_are_reported_and_never_enter_content_identity`、WASM 边界用例（可切到 `false` 再切回）、面板两例 | 已接通 |
| V7 | `layer.videoLayers.rasterize` / `layer.rasterize.video` `{}` | 命令门 | 同上 | 「栅格化视频层」 | 栅格化结果仍是普通像素层 | WASM 边界用例（`rasterized: true` 且此后 `videoLayers` 为空）、面板「没有原始素材时恢复帧入口禁用并说明，栅格化仍可执行」（断言 `rasterize` 确实经域会话发出） | 已接通 |
| V8 | 逐帧绘画（`paint.stroke` + 写回） | `Editor::flush_video_frames`：显示内容写回所在帧；有草稿时 `written:false, draft-active`；不新增历史 | `flushVideoFrames` | 定位到帧后在画布作画；面板「写回当前帧」；保存/交付前写回 | 帧栈像素进内容摘要 | `painting_after_navigating_hits_the_current_frame_only`、`no_op_props_and_flush_report…`、WASM 主线 | 已接通（实测 `save_project` 不显式写回也保留当前帧像素；写回为可选显式步骤） |
| V9 | `layer.videoLayers.interpretFootage` `{fps}` | `Editor::video_layer_command`：先按 `limits::valid_fps` 校验（缺省/0/NaN/>1000 拒绝）再执行；上游固定实现只写该层 `fps`，**不读文件** | `videoLayerCommand` | 活动视频层的「解释素材帧率」输入 + 「应用」 | 视频层 `fps` 进内容摘要，时间轴 `fps` 不变；保存重开保留 | `interpreting_footage_rate_is_validated_and_affects_the_layer_not_the_timeline`、WASM 边界用例（12 → 时间轴仍 24） | 已接通（原先按「依赖原生解复用」暂缓，核对上游后确认可用） |

## 3. 帧导入

| # | 入口 / 参数 | 包装（Rust） | WASM | UI 手势 | 内容 / 核验 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| I1 | 已解码 RGBA8 帧序列 `import_frames(name,width,height,fps,frames)` | 先整批预算（帧数、累计像素、逐帧字节长度）再写入；空序列/非法 fps/尺寸不符整批拒绝 | `importFrames`（`&[u8]`，长度前置校验） | 面板「导入帧…」选择多张图片（浏览器 `createImageBitmap` 按画布等比居中） | 导入即建立/增长时间轴与视频层；一步历史 | `three_imported_frames_keep_order_duration_and_pixels`、`frame_import_rejects_over_budget_input…`、`frame_import_rejects_a_full_layer_tree`、WASM「非法输入整批拒绝」 | 已接通 |
| I2 | 视频文件 → 帧序列 | 内核只收字节（不解码、不接收路径） | 同上 | 面板「导入视频…」：宿主 `AnimationCodecPort.decode` 整段解码 → 预检 → 导入；容器按端口能力协商（MP4→WebM） | 证明不是「只取首帧」：逐帧字节长度与累计像素预检；核验域对帧栈做同样的数量/像素/帧率收紧 | `video-decoder.test.ts`（7 例）+ 面板「视频导入走宿主端口整段解码」「只支持 WebM 的宿主仍可导入/导出」+ `codec.test.ts`（8 例）+ 宿主 `animation-codec-port.test.ts`（10 例）+ 面板「协商未完成时视频入口保持禁用」 | 端口侧已接通（Woohaa 注册真实实现）；**真实 codec 端到端待人工验证**（本机无 WebCodecs/显示会话） |
| I3 | `file.import.videoFramesToLayers`（上游按路径） | — | — | — | — | 断言不在允许表且执行被拒 | **暂缓**：接受文件系统路径，浏览器无等价物 |

## 4. 动画 / 视频交付

| # | 入口 / 参数 | 包装（Rust） | WASM | UI 手势 | 内容 / 核验 | 验收 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | `deliveryPlan` `{}` | `plan_delivery`：帧数≤120、累计像素、交付字节≤128 MiB | `deliveryPlan` | 面板「交付计划」 | 只读；冻结快照 | `delivery_plans_the_timeline_length_not_a_single_frame`、`a_timeline_longer_than_the_frame_budget…` | 已接通 |
| D2 | 单帧渲染 `render_frame(frame)` | `render_frame_rgba`：克隆文档、先写回再换帧，不移动活动播放头 | `renderFrame` | 面板逐帧 PNG 交付 + codec 逐帧回调 | 只读；帧号越界拒绝 | `each_delivered_frame_keeps_its_own_pixels`、`delivery_freezes_a_snapshot…` | 已接通 |
| D3 | 帧序列 PNG | 浏览器 canvas 编码，`encodeFrameSequence` 逐帧、失败带帧号、帧边界取消 | — | 「导出帧序列」→ store-only ZIP 一次下载 | 不需要 codec；半成品不下载；超非 ZIP64 表示范围时明确失败 | `frames-export.test.ts`（6）、`zip-store.test.ts`（5）、面板只读/失败用例 | 已接通（自动验证为域内编码与打包；真实浏览器下载见人工项） |
| D4 | 动画 GIF | `render_animation_gif`：逐帧渲染 + 索引色 + `encode_gif_animated` | `renderAnimationGif` | 「导出动画 GIF」下载 | 真实动画容器（GIF89a，多帧） | `an_animated_gif_encodes_every_frame`、WASM 主线（GIF89a + 尾字节 + 三帧数据） | 已接通 |
| D5 | MP4 / WebM | 内核不编码容器（不跑 ffmpeg）；端口负责 mux | — | 「导出视频」：`AnimationCodecPort.encode`（请求带协商到的 `container`）逐帧取像素；缺端口/仅 WebM 都能正确判定；可取消 | 不宣称可用直到协商真的通过；文件名取端口返回的实际容器 | `编码失败给出端口原因`、`只支持 WebM 的宿主仍可导入/导出，导出使用协商到的容器`、`取消在飞的编码请求后不下载`、`codec.test.ts`、宿主 `animation-codec-port.test.ts` + `animation-media-kit.test.ts` | 端口侧已接通（Woohaa 注册真实实现）；**真实 codec 待人工验证**（本机无 WebCodecs/显示会话） |
| D6 | `file.export.renderVideo`（上游写文件） | — | — | — | — | 断言不在允许表且执行被拒 | **暂缓**：需要写文件系统与原生编解码，且未移植 |

## 5. 平台暂缓清单（保持关闭，不算完成）

| 上游能力 | 暂缓原因 | 关闭方式 |
| --- | --- | --- |
| `layer.videoLayers.newVideoLayerFromFile` | 接收文件路径，浏览器无法等价 | 不登记进 `CONTRIBUTION`；真实 WASM 用例断言执行被拒 |
| `layer.videoLayers.replaceFootage` / `reloadFrame` | 接收文件路径并依赖原生解复用，浏览器无法等价 | 同上 |
| `file.import.videoFramesToLayers` | 路径导入 + 原生解码 | 同上 |
| `file.export.renderVideo` | 原生进程编码 + 写文件；后台转码未移植 | 同上 |
| 无限时长 / 超预算媒体 | 本域 120 帧、16,777,216 累计像素、128 MiB 解码/交付上限 | 预算在导入与交付前拒绝 |
| AI 主体 / 发丝细化等非本域项 | 不属于 U77 | 不在本 change 范围 |

## 6. 状态汇总

- 浏览器可用命令：**17** 个（时间轴 7 + 视频层 9 + `layer.rasterize.video`），全部经唯一命令门；
  相对重构前基线是**纯增量**，且这条增量已登记在 `notes/feature-boundary-additions.json`：
  `tests/features/animation/command-gate.test.mjs` 断言新增集合恰好这 17 个，`pnpm -C photocraft run
  features:check` 断言「冻结基线逐项不变 + 运行时 = 基线 + 登记增量」。
- 已发布能力：**4** 个（`animation.timeline` / `animation.video-layers` / `animation.frame-import` /
  `animation.frame-delivery`，`P7` order 11–14），Rust `CONTRIBUTION.capabilities`、
  `tests/fixtures/contract.json` 与协议 `feature.capabilities` 三处同序；真实 WASM 的
  `capabilityHandshake` 尾部正是这四个 id。
- 内容身份：时间轴 `fps`/`duration` 与视频帧栈（`fps`/`showAltered`/逐帧 `surface_hash`/原帧/子层）
  已进入 `documentContentHash`；**播放头与工作区范围不进身份**，旧工程规范文本逐字节不变。
  「显示原始素材」模式下的画布编辑同样不进身份——它写不回帧栈，算进去就会让指纹声称一份存不进
  工程的编辑；这类编辑由 `flush` 报 `original-view-preview` 提示用户切回修帧结果。
- 接收边界：**两条核验路径同口径**。原生 `project-verify` 与进程内 `verifyPhotocraftProject`
  都接受内嵌视频帧栈、按 120 帧 / 16,777,216 累计像素 / 1000 fps / 时间轴时长-帧率-播放头-工作区收紧，
  并把种类记为 `video-layer`（`layer.video: null` 视为无视频层）。真实 WASM 保存的同一份工程在两条路径上
  给出相同的 `objectKinds`/`layerCount`/`formatVersion`（`verifier-workflow.test.mjs` 断言）。
- 暂缓命令：**5** 个（见上表），未登记、执行被拒。
- 真实 WASM 产物上的验收主线：导入三帧 → 编辑 → 定位绘画 → 保存重开 → 帧交付 → GIF，全部通过。
- 跨文档：实测图层载荷粘贴**保留视频帧栈**，但时间轴是文档级数据、不随图层过去；面板在有视频层
  而当前文档无时间轴时提示「帧栈不可导航」，需要用户先建立时间轴。
- 仍需人工/真实端口：真实 WebCodecs/容器编解码的端到端证据（本机无 WebCodecs、无显示会话，
  端口与媒体层只有解析失败/缺能力路径可自动验证）、电脑与 Pad 正常窗口的实际界面走查
  （本机无显示会话与 GPU 设备节点，见 `verification.md`）。
