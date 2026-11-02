# 时间轴与浏览器视频工作流任务

状态说明：`[x]` = 实现与可自动化的验证都已完成；`[ ]`（带原因） = 未完成或只有部分证据。
逐子能力的命令 → 包装 → WASM → UI → 内容/核验 → 验收对照见 [matrix.md](matrix.md)，
实际命令与计数见 [verification.md](verification.md)。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  （`b61da631` 已是 HEAD 祖先；四个域目录均已存在并有 `#[path]` 装配槽位；本 change 只改这四个域目录 + 本域测试 + 本 change 目录，未改共享 facade。）

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  （`bdc3c084` 是 HEAD 祖先；vendor 固定为 `4e7a17cd…`/0.9.0，未修改；四个能力 id 已在 4.4 发布，未改写原 change（`2026-10-22-complete-photocraft-webui-editing`）的任何记录。）

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  （见 [matrix.md](matrix.md)：时间轴 6 项、视频层 9 项、帧导入 3 项、交付 6 项，逐项指向测试名；5 个路径/原生命令列暂缓并保持关闭。）

- [x] 1.3 确认同级依赖 2026-10-22-add-photocraft-raster-interchange；先稳定公共端口、预算与数据归属，不导入宿主私有模块。
  （同级 change 目录存在但尚无实施提交；本域只依赖既有内核 API 与自建公共 codec 端口，未 import 宿主私有模块，`boundary:check` 的目录分类部分不因本 change 变化。）

## 2. 逐项贯通

- [x] 2.1 U77：分阶段提供时间轴/帧导航与属性、视频轨道/逐帧编辑、帧导入和浏览器实际支持的动画/视频交付；依赖真实 codec 端口。 成功证据：多帧工程持续时间/顺序/编辑可往返，播放不新增历史；真实支持的 codec 可导入导出而不只取首帧。
  （17 个浏览器可用命令经唯一命令门（含 `layer.videoLayers.interpretFootage`，核对上游后确认只改图层 `fps`、不读文件）；真实 WASM 主线：导入三帧 → 逐帧像素 → 定位 `historyAdded=0` → 绘画写回 → 保存重开保持时长/帧率/顺序/像素 → 交付计划 + 真实多帧 GIF；codec 路径经 `AnimationCodecPort` 整段解码/逐帧编码、容器按端口能力协商（MP4→WebM），缺端口禁用并说明，取消后丢弃晚到结果。Woohaa 宿主已注册真实端口（WebCodecs 异步协商 + `mediabunny` 容器层），真实视频字节的端到端仍待人工验证（本机无 WebCodecs/显示会话）。）

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  （Rust：预算/非法 fps/字节不符/图层满/草稿阻塞/无变化不新增历史/导航与只读不改身份；
  TS：只读禁用写入而交付可用、播放发现历史推进即停、取消后不下载、失败保留原文档、
  草稿未结算时交付（计划/帧/GIF）被拒且不下载、域会话在草稿中不调用内核、超预算的图片帧在解码前被拒。）

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  — **已完成**：域内已交付纯函数内容摘要（Rust `animation_content_json`、TS `animationContentKey`：旧工程无贡献、播放头不进身份、帧顺序/像素改变摘要，且摘要按层名+文档顺序计身份、真实保存重开后稳定）、解码前累计预算、`.pcraft` 往返与**已接线**的核验（`features/mod.rs` 把 `animation::inspect` 排在 `painting` 之前、`lib.rs::verify_container_with` 调用 `animation::inspect_document`；**进程内 TS 核验**同步接受内嵌帧栈/时间轴并把种类记为 `video-layer`，Media 默认部署不再拒绝自己保存的动画工程——原先它无条件按 `external-reference` 拒绝；超帧栈/超长时间轴经两条核验路径都拒绝）、跨文档粘贴实测保留帧栈而时间轴留在源文档、PSD 导出对视频层给出明确损失行（不再静默压平，兼容矩阵新增 `video.frames`）。**内容身份已接线**：`document_content::project_content` 追加 `animation` 字段，`identity::canonicalize` 与 TS `canonicalizeImageProjectContent` 用同一份长度前缀规范文本计入时间轴 `fps`/`duration` 与视频帧栈（`fps`/`showAltered`/帧栈/原帧/子层），因此**改帧率现在会改变 `documentContentHash`**，播放头与工作区范围仍不进身份；旧工程没有 `animation` 字段，规范文本逐字节不变、历史指纹兼容。验收：`document_content::tests::timeline_and_video_frames_join_the_document_content_hash`（普通文档不追加字段 / 建时间轴改变 / 播放头与工作区不变 / 改帧率改变且改回回原值 / 视频层改变 / 真实保存重开指纹不变 / 帧顺序与像素改变 / 清空后回到基线）、`identity::tests::animation_summary_joins_the_shared_canonical_form`（跨语言固定文本、空帧合法、无帧栈组用 `null`、非法结构返回「无法判定」）、TS `content.test.ts` 10 例与 `contract-fixture.test.ts` 的动画规范文本例。共享文件漂移只涉及被基线钉住的 `identity.rs` 与 `contract.json`，登记在 `notes/feature-boundary-additions.json`（`document_content.rs` 不在钉住清单内）。接线时发现并修掉一个真实缺陷：上游把播放头处的帧同步成视频层显示内容，而显示内容原先作为图层像素/平移进入身份，导致**拖动播放头就改变 `documentContentHash`**；现以帧栈为权威内容（已同步时用固定标记、未写回编辑仍计入），`document_content::tests::playhead_does_not_leak_into_content_identity_but_unflushed_edits_do` 与真实 WASM 用例覆盖。

- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  （导航返回并断言 `historyAdded`；播放会话带 generation + requestId，代际变化静默停止、导航失败即停；codec 请求带 requestId，取消/晚到结果丢弃；写入先过共享草稿门禁，`flushVideoFrames` 在共享草稿门禁处即被拒、不调用内核（内核的 `draft-active` 报告保留为纵深防御）。父子回写属 smart 域既有门禁，本域不改。）

- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  （dev 与 Woohaa 复用同一 `packages/editor` 域实现；`setAnimationCodecPort`/`animationCodecPort` 已从 `@woohaa3/photocraft-editor` 公共入口导出，Woohaa 插件在装配时注册真实端口、卸载时清除（`animation-codec-port.ts` + `animation-media-kit.ts`），替身 `EditorInstance` 已补本域 10 个方法，宿主 typecheck 通过；「窗口」菜单已合并 `featureMenuSections("窗口")`，「窗口 ▸ 时间轴…」可打开面板（无显示控件时也渲染）。菜单/标签/面板布局与已有工具交互未改。dev 宿主未注册 codec 端口（该包未声明媒体库依赖，加依赖会改被基线钉住的 `photocraft/pnpm-lock.yaml`），其视频入口按缺端口禁用并说明，帧导入/GIF/帧交付照常可用。）

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  （`check` 通过：protocol **85** / verifier 45 / editor **338**；`rust:test` 通过 **245**+4+13+25+14+1+3+10+15；`wasm`/`verifier` 构建通过；`node --test tests/features/animation/*.test.mjs` **9/9**（含无原始素材时恢复被拒、原始视图作画不进身份，原生核验器用例已断言 `video-layer`）；`features:check` **通过**（冻结基线逐项不变 + 登记增量）；Media `test` 75/75；Woohaa `test` 288/288（含新增端口 10 例 + 媒体层 3 例；既有 `transform-interaction` 并发抖动单文件 20 次失败 5 次，stash 本 change 的 chrome/sections 改动后仍失败 6/20，与本 change 无关）；Woohaa/frontend/contracts typecheck 通过；`codemap:check` 通过。仅 `boundary:check` 因仓库缺顶层 `artifacts`/`logs` 目录失败——既有状态，与本 change 无关。本轮另修掉两个会丢用户数据的真实缺陷：无原始素材时「恢复原始帧」会清空帧、「显示原始素材」下作画不写回却谎报未变——详见 verification 的「本轮修复的两个真实缺陷」。）

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：导入三帧 → 编辑持续时间/顺序 → 定位绘画 → 保存重开 → 帧序列交付 → 在支持的实际 codec 上导入/导出视频；无 codec 和中途取消均有证据。
  — **待人工验证**：本环境是无真实 GPU 渲染节点（`ls /dev/dri | grep '^renderD'` 无输出）且无显示会话（`DISPLAY`/`WAYLAND_DISPLAY` 为空）的容器，不采集渲染与交互视觉证据；真实视频字节的编解码还需浏览器 WebCodecs + 显示会话。已自动覆盖的部分：同一主线在真实 WASM 上的内核侧往返、GIF/PNG 交付、缺端口禁用与取消路径、宿主端口协商/取消/解析失败路径。

- [ ] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  — **已记录可自动化的部分**（见 verification 的主线证据与 matrix 的逐项测试名）；真实设备/显示会话/真实 codec 三项按上文原因保持待人工验证，未勾选。

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  — **已完成**：已新增本 change 的 `matrix.md`，并同步更新 `notes/feature-boundaries.md` 的 animation 行、`docs/code-map/photocraft.md` 的域实现表与 Woohaa 端口行、`web/contracts` 的宿主重导出（`codemap:check` 通过：47 manifest / 11 篇文档 / 1356 链接）。四个能力 id（`animation.timeline`/`video-layers`/`frame-import`/`frame-delivery`）已在三处同序发布（Rust `CONTRIBUTION.capabilities`、`tests/fixtures/contract.json`、协议 `feature.capabilities`，`P7` order 11–14），`capabilityHandshake` 真实 WASM 实测尾部正是这四个 id；协议 `PENDING_CAPABILITIES` 改为已发布的 `CAPABILITIES`/`ANIMATION_CAPABILITIES`，测试断言能力清单与阶段声明一一对应。发布**不**宣称原生编解码可用：`file.export.renderVideo` 等 5 个路径/原生命令仍在关闭清单，MP4/WebM 依赖宿主注入端口。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  （主体改动只落在 `packages/editor/src/features/animation/`、`packages/protocol/src/features/animation/`、`rust/crates/editor-core/src/features/animation/`、`rust/crates/project-verify/src/features/animation/`、`tests/features/animation/` 与本 change 目录。另有逐项列明的**最小接线**：`packages/editor/src/features/boundaries.test.ts`（域装配计数，属本域聚合测试）、`packages/protocol/src/index.ts`（导出本域纯协议）、`packages/editor/src/index.ts`（导出 `setAnimationCodecPort` 等端口注册点）、`packages/editor/src/photo-editor-chrome.tsx`（「窗口」菜单合并 `featureMenuSections("窗口")`，一行 + 测试）、`rust/crates/project-verify/src/features/mod.rs`（把 `animation::inspect` 移到 `painting` 之前）、`rust/crates/project-verify/src/lib.rs`（调用一次 `animation::inspect_document`）、`packages/project-verifier/src/project-verification.ts`（进程内 TS 核验接受内嵌视频帧栈/时间轴、`video: null` 视为无视频层、新增文档级 `inspectTimeline`，使默认部署的接收边界与原生核验一致——属修正既有错误拒绝，未放宽其它对象类型）、`rust/crates/editor-core/src/features/io/psd.rs`（视频层损失行 + 矩阵行，属 B6）、`integrations/woohaa` 的端口实现与插件注册（B5，宿主适配）。共享核心（`identity.rs`/`project-limits.json`/`contract.json`/`models`）与 fixture 未改。）

- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  — **未完成**：`2026-10-22-add-photocraft-raster-interchange` 尚无实施提交；跨域联合验收（新层类型/通道/视图与时间轴交叉）需双方能力可用后人工执行。本域已独立通过自身及共享回归，但跨域联合项未勾选。
