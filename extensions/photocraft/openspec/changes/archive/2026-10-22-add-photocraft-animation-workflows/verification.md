# 验收计划与记录

## 本次状态

实施已完成**全部可自动化验证**的部分（时间轴、视频图层/逐帧编辑、帧导入、浏览器帧/GIF 交付、
域内事务与预算、TS/Rust/真实 WASM/核验器/宿主检查），逐项执行结果见下文。上一轮的 B3/B4/B5/B6
已修好（核验器分派与文档级调用、「窗口 ▸ 时间轴」菜单、Woohaa 替身与真实 codec 端口、PSD 视频层
损失行），并修复了默认部署接收边界的缺口。**本轮把原 B1/B2 真正落地**：

- **B1 能力发布**：`animation.timeline` / `video-layers` / `frame-import` / `frame-delivery`
  已进入 Rust `CONTRIBUTION.capabilities`、`tests/fixtures/contract.json` 与协议
  `feature.capabilities`（`P7` order 11–14 三处同序）。`capabilityHandshake` 现在真的声明它们。
- **B2 内容身份接线**：`document_content::project_content` 追加 `animation` 字段，
  `identity::canonicalize` 与 TS `canonicalizeImageProjectContent` 用同一份长度前缀规范文本
  计入时间轴 `fps`/`duration` 与视频帧栈。**改帧率现在会改变 `documentContentHash`**；旧工程没有
  `animation` 字段，规范文本逐字节不变，历史指纹兼容。
- **接线时发现并修掉一个真实缺陷**：上游把播放头处的帧同步成视频层的「显示内容」
  （`video_cmds::sync`），而显示内容原先直接作为图层像素 + 图层平移进入内容身份。接线后一测就暴露：
  **只是拖动播放头，`documentContentHash` 就变了**，宿主会把工程误报成「已修改」，保存后还可能把
  播放位置当成一次内容改动。现在视频层以**帧栈**为权威内容：显示内容与播放头处的帧一致时用固定
  标记（播放头不进身份），不一致时（有尚未写回的绘画编辑）仍用显示内容摘要、**不吞掉真实编辑**；
  视频层的像素平移改用恒等变换，避免显示内容包围盒把播放头带进身份。
- **本轮又发现并修掉两个真实缺陷**（详见下文「本轮修复的两个真实缺陷」）：没有原始素材时
  「恢复原始帧」会把用户的帧**静默清空**；「显示原始素材」模式下的作画写不回去，却被报成「没有
  需要写回的内容」，指纹还会声称一份存不进工程的编辑。

两份重构前基线因此**保持冻结、不作改写**：新增项登记在
`notes/feature-boundary-additions.json`（17 个命令 + 4 个能力 + 2 个必须改动的共享文件及理由），
`features:check` 断言「冻结证据逐项不变 + 运行时 = 基线 + 登记增量」。仍需真实设备与真实 codec
端到端验证的项目保持未勾选，原因逐条写明。

逐子能力的命令 → 包装 → WASM → UI → 内容/核验 → 验收对照见 [matrix.md](matrix.md)。

## 必须验证的主线

导入三帧 → 编辑持续时间/顺序 → 定位绘画 → 保存重开 → 帧序列交付 → 在支持的实际 codec 上导入/导出视频；无 codec 和中途取消均有证据。

每个 U 编号及其子能力分别记录：实际入口/参数、预览、确认/取消、内容 hash/修订/历史、工程往返、核验器结果，以及 spec 中特有的失败条件。只验证菜单存在或只检查命令字符串不算完成。

## 本轮修复的两个真实缺陷

这两处都不是「补测试」发现的风格问题，而是核对上游实现时发现的**会丢用户数据**的行为，且都在
本 change 的交付范围内（视频图层与逐帧编辑）。

### 1. 没有原始素材时「恢复原始帧」会把帧清空

上游 `video_cmds::restore_frame` / `restore_all` 的实现是
`original.unwrap_or_else(|| blank_of(fmt))`：取不到原始素材就写一张**空白帧**。浏览器里的帧导入
（`import_frames`）不产生原始素材副本——上游只有路径命令 `newVideoLayerFromFile` /
`replaceFootage` / `reloadFrame` 才会写 `original_frames`，而这三条都在关闭清单里。因此用户导入
两帧、点「恢复原始帧」，两帧会被静默清成空白，且这一步还进历史。

修法：域入口先判定 `hasOriginal`，没有原始素材时**拒绝**并说明「恢复不会清空当前帧」，文档保持
原样。面板本来就按同一个 `hasOriginal` 禁用按钮（界面与内核条件同源）。

**这不是把命令一律关掉**：`VideoDataM.original_frames` 随 `.pcraft` 往返（`format/src/convert.rs`），
所以原生应用保存的工程在浏览器里打开后这两个命令真实可用。正向用例
`restoring_with_original_footage_brings_the_frame_back` 证明恢复真的把帧取回来了。

### 2. 「显示原始素材」模式下的作画：不写回、却被报成「没有要写的内容」，指纹还会算上它

上游 `store` 在 `show_altered == false` 且存在原始素材时**跳过写回**（#3060：原始视图是预览）。
接线内容身份时 `video_display_hash` 只在「显示内容 == 播放头处的帧」时用固定标记，否则一律用显示
内容摘要——于是原始视图下的作画会让 `documentContentHash` 变化，但这份内容**存不进工程**（写回被
跳过）：
- 保存后重开，指纹退回原值 → 宿主刚存完就认为工程被外部改过；
- `flushVideoFrames` 返回 `unchanged` → 界面说「当前帧没有需要写回的修改」，用户以为已保存。

修法（三处同源，判定条件与上游 `store` 完全一致，即 `show_altered || 没有原始素材`）：
- `content::video_display_hash` 在没有写回通路时直接返回固定标记——**预览不进内容身份**；
- `content::original_view_edits_pending` 报告「哪些层在原始视图下有未生效的编辑」；
- `flush_video_frames` 在这种情况下返回 `{written:false, reason:"original-view-preview", message}`，
  面板照内核给的原因提示「请先切回『显示修帧结果』再作画或保存」，不再谎报 `unchanged`。

用例：`edits_made_while_showing_the_original_are_reported_and_never_enter_content_identity`
（原始视图下作画 → 指纹不变、写回如实报原因、帧栈保留原像素；切回修帧结果后同样的作画 → 指纹变化、
保存重开一致）、`panels.test.tsx` 的「原始视图下的编辑不写回时给出内核原因，不谎报『没有要写回的内容』」。

## 已执行的检查与真实结果

执行环境：Linux 容器；`ls /dev/dri | grep '^renderD'` 无输出（无真实 GPU 渲染节点）、无显示会话
（`DISPLAY`/`WAYLAND_DISPLAY` 均为空），因此**不采集**渲染、帧率、视觉截图与交互式 UI 证据
（见「真实 UI 与设备」）。

| 命令 | 实际结果 |
| --- | --- |
| `pnpm -C photocraft run check` | 通过：build + typecheck（protocol / editor / project-verifier / dev）+ 测试。protocol 5 文件 **85** 测试、project-verifier 2 文件 **45** 测试、editor 46 文件 **338** 测试全通过 |
| `pnpm -C photocraft run rust:test`（`CARGO_INCREMENTAL=0`，offline） | 通过：embed-editor lib **245**、contract_fixture **4**、editor **13**、interaction_state **25**、project-verify lib **14**、limits_agree **1**、native_binary **3**、smart_source **10**、verify **15**，0 失败 |
| `pnpm -C photocraft run wasm` | 通过：wasm 17.39 MiB、glue 98.5 KiB（真实产物用于下两项） |
| `pnpm -C photocraft run verifier` | 通过：`dist/bin/photocraft-project-verify` 3.84 MiB |
| `node --test "tests/features/animation/"*.test.mjs` | 通过：**9/9**（真实 WASM 主线 5 + 命令门/基线等价 2 + 原生核验器 1 + 其它边界 1；WASM 用例含「拖播放头不改指纹、改帧率改指纹、未写回编辑仍算内容」与「无原始素材时恢复被拒、显示原始素材可切换、栅格化后不再是视频层」，原生核验器用例另断言进程内 TS 核验对同一份工程给出相同摘要） |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | **288/288 通过**（36 文件；`vitest run` 直跑，新增 `animation-codec-port.test.ts` 10 例 + `animation-media-kit.test.ts` 3 例）。**既有并发抖动**：`tests/transform-interaction.test.tsx` 的「2 个所选图层从 context-menu 进入变换」偶发失败（`Cannot read properties of undefined (reading 'click')`——右键菜单项尚未挂载完就被点击）。实测：全量直跑 12 次中 3 次出现该例、单文件连跑 20 次失败 5 次；把本 change 对 `photo-editor-chrome.tsx`/`animation/sections.tsx` 的改动 `git stash` 后单文件连跑 20 次仍失败 6 次，故与本 change 无关 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过：替身 `EditorInstance` 已补本域 10 个方法，宿主真实 codec 端口与其媒体层已实现 |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `pnpm -C web --filter @woohaa3/contracts run typecheck` | 通过：`web/contracts` 的 `ImageProjectContent` 重导出兼容新增的可选 `animation` 字段 |
| `pnpm codemap:check` | 通过：47 个 manifest、11 篇文档、1356 个本地链接、8 个模块入口清单 |
| `pnpm -C web --filter @woohaa3/media-service run test` | 通过：**75/75**（6 文件）——Media 的接收政策与 ingest 在核验边界收紧后仍全部通过 |
| `pnpm -C photocraft run features:check` | **通过**：buildInfo、错误文案、8 组内容/状态快照、撤销/重做/取消与 PNG 字节仍与重构前基线 `bdc3c084` 逐项相同；运行时命令表 = 基线 185 + 登记的 17、能力握手 = 基线 71 + 登记的 4（既有前缀与相对顺序不变）；共享文件只在 `notes/feature-boundary-additions.json` 登记的两处换哈希。`command-gate.test.mjs` / `baseline-snapshot.test.mjs` 独立复核同一事实 |
| `pnpm boundary:check` | 失败：缺顶层 `artifacts`/`logs` 目录（仓库状态问题，与本 change 无关） |
| 真实 WASM 能力握手（手工一次性核对） | `capabilityHandshakeJson()` 报 **75** 个能力、尾部恰为 `animation.timeline`/`video-layers`/`frame-import`/`frame-delivery`；`allowedCommandIdsJson()` 报 **202** 个命令、相对基线只多这 17 个且保持排序 |

### 真实 WASM 主线证据（`tests/features/animation/wasm-workflow.test.mjs`）

1. `importFrames` 导入 3 帧（8×8，10 fps，纯红/绿/蓝）→ `timeline.duration=3`、`fps=10`、
   `videoLayers[0].frames=3`、`budget.maxFrames=120`。
2. `renderFrame(0..2)` 中心像素分别为红/绿/蓝——**逐帧保留，不是只取首帧**。
3. `navigateTimeline("timeline.setFrame",{frame:2})` 返回 `historyAdded=0`，播放头到 2。
4. 定位到 1 → `paint.stroke` → `flushVideoFrames()` 返回 `written:true`；第 1 帧中心变红，第 0/2 帧不变。
5. `saveProject()` → 新实例 `openProject` 后 `duration=3`、`fps=10`、帧数 3，第 0/2 帧像素不变
   （持续时间、帧率、顺序与像素随工程往返）。
6. `deliveryPlan()` = 3 帧 / 8×8 / 每帧 256 字节；`renderAnimationGif()` 是真实 `GIF89a`、以 `0x3b`
   结尾且长度 > 3×64（多帧动画，不是单帧）。
7. 121 帧导入被拒且 `contentHash` 不变；5 个路径/原生命令（`newVideoLayerFromFile`/`replaceFootage`/
   `reloadFrame`/`file.import.videoFramesToLayers`/`file.export.renderVideo`）不在允许表且执行被拒；
   `layer.videoLayers.interpretFootage` 已开放：`fps=12` 只改视频层（时间轴仍 24），0/-1/1e9 被拒且不写入。
   无原始素材时 `restoreFrame`/`restoreAllFrames` 被拒且 `contentHash` 不变（不是把帧清成空白）；
   `showAlteredVideo` 可切到 `false` 再切回，`rasterize` 返回 `{rasterized:true}` 且此后 `videoLayers` 为空。
8. 一次导入只记一步历史：在 0/1/2 间来回定位后一次撤销回到导入前，重做恢复 3 帧。
9. 非法输入整批拒绝：字节长度不符、fps 0/-5/NaN、空帧序列、零尺寸、越界帧号、非法属性；
   失败后 `contentHash` 与 `timelineJson` 都不变。

### 域内 Rust 测试（`features/animation/*`）
- `limits.rs`：5 例（帧数、累计像素、解码/交付字节、fps、错误文案含实际值与上限）。
- `content.rs`：6 例（旧文档无贡献、播放头/工作区不进身份、帧顺序与像素改变摘要、空帧栈、嵌套/原始素材、
  真实容器保存→重开后的摘要稳定——层按**名字 + 文档顺序**而不是 `LayerId` 计身份）。
- 内容身份接线（共享层）：`document_content::tests::timeline_and_video_frames_join_the_document_content_hash`
  覆盖「普通文档不追加字段 / 建时间轴改变指纹 / 播放头与工作区不改变 / 改帧率改变且改回回原值 /
  视频层改变 / 真实保存重开指纹不变 / 帧顺序与帧像素改变 / 清空后回到基线」；
  `identity::tests::animation_summary_joins_the_shared_canonical_form` 固定跨语言规范文本、
  空帧（宽高 0）合法、无帧栈的组用 `null` 而空对象/非法值返回「无法判定」。
- `export.rs`：9 例（交付按时间轴长度、逐帧像素独立、快照冻结、GIF 多帧、透明保留、越界/空交付拒绝、
  超预算先拒绝、嵌套视频层报告、无时间轴单帧）。
- `tools.rs`（`tests_timeline.rs`）：19 例（命令门 17 开放/5 关闭、建立/导航/删除、预算、三帧顺序/像素、
  导入预算拒绝、往返、顺序可编辑、定位后绘画只影响当前帧、无变化不新增历史与 `flush` 原因、
  导航/只读不改身份、视频层预算、交付计划+GIF、草稿阻塞写入但不阻塞导航、图层满拒绝、
  `interpretFootage` 只改图层帧率且非法值拒绝、跨文档粘贴保留帧栈但时间轴留在源文档、
  **无原始素材时恢复被拒且不清空帧**、**有原始素材时恢复真的取回原像素**、
  **原始视图下的作画不进身份且写回如实报原因**）。
- 合计 `features::animation` **21** + `editor::tools::animation_feature` **19** = 40 例全通过。

### 域内 TS 测试

- `panels.test.tsx`（**29**）：渲染当前帧/帧率、无时间轴只给建立入口、草稿门禁（写入被拒/导航放行）、
  播放发现历史推进立即停止、缺 codec 时视频入口禁用并说明且 GIF 可下载、注册端口后编码失败给端口原因、
  只读时写入禁用而交付可用、视频导入走端口整段解码、帧序列交付在无 codec 时也能尝试且失败不下载、
  取消在飞请求后晚到结果不下载、无端口时视频导入禁用、帧解码非法输入、section 声明；
  新增：修订号推进时播放不中断（代际按文档身份）、帧编辑按活动视频层门禁 + 点选视频层 +
  `interpretFootage` 参数、删除时间轴/工作区范围输入、写回报告、草稿未结算时交付被拒且不下载、
  只支持 WebM 的宿主仍可导入/导出且 encode 收到协商到的容器、
  超过帧数/累计像素/解码字节的图片帧在选择后**解码前**被拒、
  协商未完成时视频入口保持禁用（不乐观宣称可用）；
  有视频层但没有时间轴时提示帧栈不可导航（跨文档粘贴后的恢复路径），有时间轴时不提示；
  **没有原始素材时恢复入口禁用并说明、有原始素材时可用**、栅格化与显示修帧结果确实经域会话发出、
  **原始视图下不写回时照内核原因提示而不谎报 `unchanged`**。
- `workspace.test.ts`（8）：域会话自己的门禁——写入（建/改属性/删/视频层命令/帧导入/写回帧栈）在草稿未结算时
  不调用内核（内核另有 `draft-active` 报告作纵深防御）；导航在草稿中照常放行且 `historyAdded=0`；交付（计划/帧/GIF）被草稿拒绝；
  写入成功才刷新视图；`deleteTimeline` 走 `timeline.delete`；`flushVideoFrames` 仅在真的写回时刷新；
  非法帧号不进入内核；无 handle 时统一返回不可用。
- `codec.test.ts`（8）：端口守卫、按方向协商、仅 WebM 可用、两容器都支持时取偏好第一个、
  全不支持时回传端口原因、能解码不等于能编码、协商结果异步结算（pending→ready/unavailable）、
  真实探测为 Promise 时不被当成同步答案。
- `playback.test.ts`（5）：按 fps 排帧/回卷、重复 play 不叠加与 stop 幂等、无时间轴或非法 fps 拒绝、
  导航失败停止且代际变化静默停止、工作区范围决定回卷点。
- `video-decoder.test.ts`（7）：容器识别、缺端口/不支持原因、未知容器不解码、整段返回、错误与异常归一、
  预算/字节/放大/空帧预检、非法 fps 回退。
- `frames-export.test.ts`（6）+ `zip-store.test.ts`（5）：逐帧独立 PNG 与命名、失败带帧号、编码器空输出/
  异常、帧边界取消与已交付数、非法帧数尺寸、文件名消毒；ZIP local header/中央目录/EOCD、CRC、可复现性、
  超出非 ZIP64 表示范围（条目数/条目名/累计偏移）时明确失败而不是写出截断字段的坏包。
- protocol：`animation-contract.test.ts`（4）+ `content.test.ts`（**10**：6 例域内摘要 + 4 例跨语言规范文本：固定格式、无帧栈组 vs 空帧栈、原帧、非法结构返回 `null`）。
- `boundaries.test.ts` 更新为 13 个 section，并断言 animation 无工具、只有 `timeline` section。

### 共享接线测试（最小接线各自的回归）

- `photo-editor-chrome.test.tsx`（6，含新增例）：「窗口菜单承载域面板入口，没有显示控件时仍可按名称打开时间轴」——
  断言「窗口」菜单在有文档项/无显示控件时都渲染，点「时间轴…」触发域面板打开；原有菜单项顺序与行为不变。
- `features/io/psd.rs`：`export_reports_video_layers_instead_of_silently_flattening_them`（默认拒绝 →
  显式栅格化成功 → 兼容矩阵 `video.frames` 行为 `raster-only`）。
- `verifier-workflow.test.mjs`：子进程核验 `objectKinds` 含 `video-layer` 与 `raster`，并断言**进程内
  TS 核验对同一份真实工程**给出相同的 `objectKinds`/`layerCount`/`formatVersion`（两条接收边界一致）。
- `editor-workspace.test.ts`（Woohaa 替身）：断言本域 10 个绑定被真实转发（导入/导航/写回/交付各路径）。

### 核验器

- `photocraft-project-verify`（原生）域内 **6** 例：正常视频层通过、空/超帧栈拒绝、非法 fps 拒绝、
  `original_frames` 长度一致、端到端保存+核验往返（断言 `object_kinds` 含 `video-layer`，超帧栈与
  超长时间轴都被共享 `verify` 拒绝）、文档级 `inspect_document` 规则（时间轴时长/帧率/播放头/
  工作区范围 + 嵌套图层帧预算，旧工程无贡献）。
- 接线：`features/mod.rs` 把 `animation::inspect` 排在 `painting` **之前**（视频层内容类型仍是
  `Raster`，后置会被 painting 抢先认领）；`lib.rs::verify_container_with` 调用一次
  `animation::inspect_document`。`painting` 对非视频栅格层的认领不变。
- **进程内 TS 核验同步收紧（本轮修复的接收边界缺口）**：`project-verification.ts` 原先无条件把任何
  `layer.video` 判成 `external-reference`，而未配置 `WOOHAA3_PROJECT_VERIFIER_PATH` 时它正是 Media
  的**默认**接收边界——后果是自己保存的动画工程在默认部署下**无法发布**，配置了原生工具的部署却能
  接收。现改为与原生同口径：接受内嵌帧栈（`source` 只作溯源，不读路径）、拒绝空/超 120 帧/超累计
  像素/非法 fps/原始帧数不一致/超 1000 fps、`objectKinds` 记 `video-layer`、新增文档级 `inspectTimeline`
  （时长/帧率/播放头/工作区）。用例 **5** 例（`project-verification.test.ts`「视频图层与时间轴的进程内
  核验」），`Tests` 40 → **45**。两处核验器从此给出一致的接收边界（嵌入式核验的摘要逐项比对也因此可用）。
  另有一个真实工程细节：上游 `LayerM.video` 没有 `skip_serializing_if`，所以**每个**图层都会写
  `video: null`——`null` 必须等价于「没有视频层」，否则默认部署会拒绝所有普通工程（用例已固定这一点）。
- 子进程实测（`verifier-workflow.test.mjs`）：WASM 保存的带时间轴/视频层工程被原生核验器接受，
  `layerCount=2`、`objectKinds` 含 `video-layer` 与 `raster`（用例断言两种种类都出现，不再容忍静默降级），
  并且同一份字节交给进程内 TS 核验给出相同的 `objectKinds`/`layerCount`/`formatVersion`。另用真实 WASM
  产物核对：普通工程仍只报 `raster`，动画工程报 `raster` + `video-layer`。

### PSD 导出（跨域事实，现已有明确损失行）

- `features/io/psd.rs::inspect_psd_export` 对带 `layer.video` 的栅格层追加 `kind:"video"` 的损失行
  （含实际帧数、`rasterizable:true`），默认导出因此拒绝而不是静默只留当前帧；显式栅格化后仍可导出。
  兼容矩阵新增 `video.frames`（`raster-only` / `raster-only`）。
- 用例：`export_reports_video_layers_instead_of_silently_flattening_them`（默认拒绝 + 显式栅格化成功 +
  矩阵行判定）。

### Woohaa 宿主 codec 端口

- `animation-codec-port.ts`（10 例）：真实异步协商（只支持 H.264 时不宣称 WebM 可用）、容器白名单、
  缺 WebCodecs 的固定原因、按文件名识别 mp4/mov/webm、预算透传、媒体库拒绝原因原样上抛、
  媒体库加载失败、取消后不产出结果且标记随请求释放、容器缺省按 MP4、取消时取帧回调抛错。
- `animation-media-kit.ts`（3 例）：损坏 MP4/WebM 的解析失败原因不泄漏库内部异常、缺 WebCodecs 时
  编码给出 H.264/VP9 的具体原因。真实编解码（真实视频字节）需浏览器 WebCodecs + 显示会话，属人工项。

## 原集成阻塞：本轮已落地（B1/B2）

上一轮把 B1/B2 记成「需要集成负责人一次写入」的阻塞。本轮按用户「完成这个 change」的要求把它们
真正实现，并且**没有把冻结基线改成当前状态**——那样等于自证等价。做法是把「重构前必须证明没变」
与「后续 change 有意新增」分成两份文件：

| 编号 | 原阻塞 | 本轮落地 | 验证 |
| --- | --- | --- | --- |
| B1 | 四个能力 id 未发布，`capabilityHandshake` 不声明本域 | Rust `features/animation/mod.rs::CONTRIBUTION.capabilities`、`tests/fixtures/contract.json`、协议 `features/animation/index.ts::feature.capabilities` 三处同序登记 `P7` order 11–14；`PENDING_CAPABILITIES` 改为已发布的 `CAPABILITIES`/`ANIMATION_CAPABILITIES` | `contract_fixture.rs` 4/4、`contract-fixture.test.ts` 10/10 双向核对；`features:check` 断言握手 = 基线 71 + 登记 4；真实 WASM 握手尾部正是这四个 id |
| B2 | 时间轴/帧摘要未进内容身份，改帧率不改变 `documentContentHash` | `document_content::project_content` 追加 `animation`；`identity::canonicalize_animation` 与 TS `canonicalizeAnimationContent` 用同一份长度前缀规范文本（时间轴 `fps`/`duration` + 每个视频层的 `fps`/`showAltered`/帧栈/原帧/子层）；`ImageProjectContent.animation` 与宿主重导出同步 | Rust `document_content::tests::timeline_and_video_frames_join_the_document_content_hash`（含真实保存→重开指纹不变、播放头不进身份、帧顺序/像素改变指纹）、`identity::tests::animation_summary_joins_the_shared_canonical_form`（跨语言固定文本 + 非法结构返回不可判定）、TS `content.test.ts` 10/10 与 `contract-fixture.test.ts`「动画内容进入共享规范文本」；另有 `document_content::tests::playhead_does_not_leak_into_content_identity_but_unflushed_edits_do`（拖播放头不改指纹、未写回编辑仍算内容）与真实 WASM 用例「时间轴与帧进入内容身份」 |
| — | 两份重构前基线被 sha256 钉住，改共享文件就等于改基线 | 基线**保持冻结不改**；新增项登记到 `notes/feature-boundary-additions.json`（命令 17、能力 4、两个共享文件的新哈希 + 理由），`scripts/check-feature-boundaries.mjs` 改为「冻结证据逐项相等 + 运行时 = 基线 + 登记增量」 | `features:check` 通过；未登记的共享文件漂移、多/少一个命令或能力、既有顺序变化都会失败 |

共享文件只漂移了两处，且都写明了理由：`tests/fixtures/contract.json`（能力清单）与
`rust/crates/editor-core/src/identity.rs`（动画规范文本）。`project-limits.json`、`Cargo.lock`、
`pnpm-lock.yaml` 的哈希仍与重构前基线相同；`document_content.rs` 不在基线钉住的清单内。

**仍然不是「全部完成」的部分**：真实设备 UI 走查与真实 WebCodecs 编解码端到端无法在本环境采集
（原因见下节），因此相关任务保持未勾选。

已在本轮修复（原 B3/B4/B5/B6）：核验器域检查接线（分派顺序 + 文档级调用）、「窗口 ▸ 时间轴」菜单、
Woohaa 替身 10 方法与真实 `AnimationCodecPort` 实现、PSD 视频层损失行；另修复了**默认部署的接收边界**——
进程内 TS 核验原先把视频层判成外部引用，会拒绝自己保存的动画工程（现与原生核验同口径）。

## 本轮核对到的跨域事实（不是本域缺陷，供集成负责人决策）

| 事实 | 证据 | 归属 |
| --- | --- | --- |
| PSD 导出对视频层**已不再静默压平** | `export_reports_video_layers_instead_of_silently_flattening_them`：`inspect_psd_export` 返回 `kind:"video"` 损失行（含实际帧数），默认导出拒绝，显式栅格化后成功；矩阵新增 `video.frames` = `raster-only` | io 域（本轮已修） |
| 核验器视频层检查**已生效**，且两个核验器口径一致 | 原生域内往返用例断言 `object_kinds` 含 `video-layer`；进程内 TS 核验同样接受内嵌帧栈并把种类记为 `video-layer`（新增 5 例）。Media 默认（未配置原生工具）不再拒绝自己保存的动画工程；Media `test` 75/75 通过。注意 `LayerM.video` 无 `skip_serializing_if`，普通图层也会写 `video: null`，`null` 必须视为「无视频层」 | project-verify（本轮已修） |
| 跨文档图层粘贴**保留帧栈**，时间轴留在源文档 | `cross_document_paste_keeps_the_frame_stack_while_the_timeline_stays_with_the_source`：粘贴后 `videoLayers[0].frames=2`、`timeline=null`；建好时间轴后帧可导航 | layers 域数据模型边界；面板已提示「有视频层但没有时间轴」 |
| `save_project` **不**显式 `flush_video_frames` 也保留当前帧像素 | 同一文档「改当前帧 → 直接保存」与「改当前帧 → 写回 → 保存」两份工程重开后逐帧像素相同；字节因元数据不同而不同 | `render_frame`/交付走 `frame_document`（先 `store_display_content`）；面板因此把「写回当前帧」保留为可选显式步骤而非保存前提 |

## 真实 UI 与设备（未执行，保持未勾选）

探测结果：Linux 容器 `ls /dev/dri | grep '^renderD'` 无输出（无真实 GPU 渲染节点），且无显示会话
（`DISPLAY`、`WAYLAND_DISPLAY` 均为空）。按仓库规则不采集渲染/帧率/视觉证据，也**不**用软件渲染或估算值
冒充硬件结论。

因此以下均**待人工验证**，真实原因分别是：

- 电脑 1440×1000 与 Pad 1024×768 的正常窗口主线走查、应用内截图：无显示会话与 GPU 设备。
- 真实 WebCodecs/容器 codec 的视频导入/导出（MP4/WebM）：本环境没有 WebCodecs（Node/jsdom），
  也没有显示会话，所以只能验证「协商失败/解析失败/取消」路径；端口实现、容器封装、UI 协商与
  禁用路径已自动覆盖（`animation-codec-port.test.ts`、`animation-media-kit.test.ts`、`panels.test.tsx`）。
  这不是「无 GPU」，也不代表功能未实现。
- 「无 codec」与「中途取消」的界面证据：缺端口的禁用与原因、取消后丢弃晚到结果已由
  `panels.test.tsx` 自动覆盖；真实浏览器里的视觉证据需人工采。

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。依赖原生进程的未移植视频编解码、后台转码、无限时长/超预算媒体保持关闭；有真实端口和验收前不宣称 Render Video 可用。

本次实现未提交（工作区改动）。逐项状态与证据见 [matrix.md](matrix.md) 与上文自动检查表。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
