# 验收计划与记录

## 当前状态

2026-10-22（实施日，收尾复跑）：U25/U26 的完整链路已接通并验证——内核命令/门禁/有界预览、
WASM 绑定、TS 适配与三个面板、协议能力声明、跨语言通道内容身份并**接入共享指纹**、工程核验器
**接入共享核验入口**、共享能力 fixture 与特性边界基线同步、主画布单通道视图与 Alpha 落笔路由、
真实 WASM 冒烟、以及 headless Chromium 的真实 UI 走查。

曾经列为阻塞的共享项已全部落地（见「共享文件改动」）：

| 原阻塞 | 现状 |
| --- | --- |
| 内容身份未接入共享 `document_content.rs` | 已接线；`Editor::content_hash` 现在覆盖通道，删除通道后回到旧身份 |
| 核验器未调用 `inspect_document` | 已在 `lib.rs` 接线；新增真实工程字节的端到端核验用例 |
| `tests/fixtures/contract.json` 缺 8 个能力 | 已同步（79 项，diff 仅本域 8 行） |
| `notes/feature-boundary-wasm-baseline.json` 未重生成 | 已重生成；`build`/`steps`/`errors`/`output` 逐字节未变，仅 +16 command、+8 capability |
| `boundaries.test.ts` 断言 12 个 section | 已更新为 15，并加断言通道域只有三个「图像」菜单 section |
| 主画布单通道视图与 Alpha 落笔路由 | 已接入 `photo-editor-app.tsx`（`channelTarget` 驱动预览与 `buildStroke`） |
| Woohaa `fakeInstance()` 缺 6 个方法 | 已补齐；Woohaa 类型检查通过 |

仍**未**勾选的是 4.2/4.3、5.1 与 5.2，原因见文末：4.2/4.3 缺「无 GPU 环境不得采渲染/视觉证据」
与真实设备；5.1 是因为本 change 确实改了共享文件，需集成负责人复核后才能声称「仅改本域归属」；
5.2 依赖其他同级 change 全部完成。

## 必须验证的主线

创建 Alpha → 单通道绘画 → 载入选区 → 两源通道计算 → 工程重开；切来源文档、来源关闭、尺寸不匹配与超限分别拒绝。

主线**每一步都有真实产物证据**：

| 步骤 | 证据 |
| --- | --- |
| 创建 Alpha | 真实 WASM 冒烟（选区填充、`indicates` 序列化）+ 真实 UI（面板按钮→通道行出现、无报错） |
| 单通道绘画 | 真实 WASM：`target:{channel:0}` 落笔后通道 96 个亮点、图层 0 个；RGB 分量目标 82/0/0；**真实 UI 的笔迹像素证据见文末限制说明** |
| 载入选区 | 真实 WASM（bounds `[4,4,16,12]`）+ 真实 UI（面板按钮走共享 `dispatch`） |
| 两源通道计算 | 真实 WASM（`multiply(白,黑)=0`、`screen(白,黑)=32` 的精确算术，预览与确认逐字节一致；输出新通道/新文档/选区三路）；真实 UI（预览→确认，历史出现 `Calculations` 且通道行 +1） |
| 工程重开 | 真实 WASM（名称/专色密度/内容指纹一致；旧工程缺字段按默认装载且仍可编辑）+ 核验器端到端（含通道工程通过，非法通道名/越界不透明度/错误平面格式分别拒绝） |
| 切来源文档 | 非活动来源文档自报 `colorNames` 与 `alpha` 行，按名计算成功且编辑目标不变 |
| 来源关闭 | `no open document 5` 拒绝 |
| 尺寸不匹配 | `source document "Untitled" is 32×24; it must match the target size` 拒绝 |
| 超限 | 文档预算：已开 8 个文档时拆分与计算新文档均被拒绝（「不能超过 8 个」），文档数不变、不留半个结果 |

## 非渲染检查

从所属项目/仓库按影响范围运行并记录实际命令与计数。

## 实施记录（2026-10-22，收尾复跑）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| editor 全量用例 | `pnpm -C photocraft/packages/editor run test` | **306 通过 / 0 失败**（43 文件） |
| 本域 editor 用例 | `npx vitest run src/features/channels` | 通过：4 文件 / **37**（model 9、workspace 6、panel 17、stroke-routing 5） |
| protocol 全量用例 | `pnpm -C photocraft/packages/protocol run test` | **80 通过 / 0 失败**（5 文件） |
| 本域 protocol 用例 | `npx vitest run src/features/channels` | 通过：2 文件 / 9（capabilities 3、content 6） |
| project-verifier 用例 | `pnpm -C photocraft/packages/project-verifier run test` | 通过：2 文件 / 40 |
| dev 用例 | `pnpm -C photocraft/dev run test` | 通过：1 文件 / 8 |
| TS 类型 | `pnpm -C photocraft run typecheck`（editor / protocol / project-verifier / dev） | 通过（4 包无 error） |
| Rust 全量回归 | `cargo test --workspace --offline --no-fail-fast` | **全绿**：editor-core lib 225、contract_fixture 4/4、editor 13、interaction_state 25、project-verify lib 15、limits_agree 1、native_binary 3、smart_source 10、verify 16 |
| 本域 Rust（内核） | `cargo test -p photocraft-embed-editor --lib channels --offline` | 通过：24（`channels_feature` 19 + `features::channels::content` 5） |
| 本域 Rust（核验器） | `cargo test -p photocraft-project-verify --lib features::channels --offline` | 通过：7 |
| 核验器端到端 | `cargo test -p photocraft-project-verify --test verify` | 通过：16（含新增 `channels_are_verified_from_real_project_bytes`） |
| 本域 Clippy（lib） | `cargo clippy -p photocraft-embed-editor -p photocraft-project-verify --lib --offline` | 本域 0 条告警 |
| 真实 WASM 构建 | `node scripts/build-wasm.mjs --debug --skip-opt` | 通过：`packages/editor/dist/wasm`（113.77 MiB，gitignore） |
| 真实 WASM 主路径冒烟 | `node tests/features/channels/wasm-smoke.mjs` | 通过：**76/76** |
| 特性边界检查 | `pnpm -C photocraft run features:check` | **通过**（基线已重生成；CLI 输出确认 commands/capabilities/errors/8 个状态快照/undo-redo-cancel/PNG 字节全部等价） |
| 真实 UI 走查 | `node tests/features/channels/ui-walkthrough.mjs` | 通过：**21/21**（headless Chromium，1440×1000 与 1024×768） |
| Woohaa 适配回归 | `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过：34 文件 / 275 用例 |
| Woohaa 适配类型 | `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | **通过**（替身已补 6 个通道方法） |
| 宿主类型 | `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| 代码地图 | `pnpm codemap:check` | 通过：47 个 manifest、11 篇文档、1357 个本地链接、8 个模块入口清单 |
| OpenSpec 严格校验 | `npx openspec validate 2026-10-22-add-photocraft-channel-workflows --strict` | 通过 |
| 开源／闭源边界 | `pnpm boundary:check` | **失败但与本 change 无关**：`open-closed-boundary.test.ts`「清单目录都存在」报缺 `artifacts`/`logs`；这两个是 gitignore 的运行时产物目录（`.gitignore` 第 67 行 `/artifacts/`），本域未新增顶层目录 |

### 真实 WASM 产物冒烟（Node 加载 `dist/wasm`，非浏览器）

76 项断言，覆盖：

| 组 | 实测结果 |
| --- | --- |
| U25 面板与行 | Alpha 由选区创建、目标随创建指向该通道、`indicates` 序列化为 `selectedAreas`、缩略图有界、视图跟随目标 |
| U25 单通道视图 | 主画布视图为**灰度**（`colored:0`，32×24）——合成色不再串进单通道视图 |
| U25 落笔路由 | `target:{channel:0}` → 通道 96 亮点 / 图层 0 亮点（图层缩略图 32×24，非退化的 1×1） |
| U25 RGB 分量 | 干净文档上 Green 目标落笔 → green=82、red=0、blue=0 |
| U25 元数据 | 专色屏幕替代色 + 密度保留；排序改变顺序；显隐是查看态 |
| U25 拆合 | 拆分得同尺寸灰度文档；RGB 合并成功；`cmyk`/`lab` 明确拒绝 |
| U25 无变化 | 同名改名/相同选项 `hist 2 → 2` 且不脏；显隐不新增历史；真改名仍是一步历史 |
| U25 重开/旧工程 | 名称、专色密度、内容指纹保留；缺 `color`/`opacity`/`indicates` 的旧通道按默认装载且仍可编辑 |
| U25 拒绝路径 | 快速蒙版目标、缺通道删除、图层蒙版目标分别有明确理由且不写入 |
| U26 应用图像 | 预览有界且不改正式状态/指纹/历史；确认只产生一步历史（12 → 13）；非法混合模式在写入前拒绝 |
| U26 受控 fixture | 选区造已知 Alpha 源写入另一 Alpha：**预览候选与确认后真实缩略图逐字节一致**（lit=80、差异字节 0） |
| U26 只改目标 | 应用图像写 Alpha 后，图层缩略图像素、来源通道像素、选区 frame 全部不变，仅目标通道 lit=36 |
| U26 计算算术 | `multiply(白,黑)=0`、`screen(白,黑)=32`（逐像素等于源），且预览与确认结果逐字节一致 |
| U26 计算输出 | `newDocument` 新建并切到新文档；8 文档满载时明确拒绝且文档数不变 |
| U25 其余结构 | `channel.list` 只读；专色并入像素是一步历史且改内容；删除低索引后目标仍指向同一通道；删不存在的索引被拒绝；200 中文字符名可建、201 拒绝 |
| U25 拆分语义 | `closeOriginal:true` 关闭原文档（RGB 分量 + 每通道各建灰度文档，全为 Gray）；`false` 保留原文档；超预算整条拒绝不留半成品 |
| U25 选区双向 | 无选区时「存储选区」被拒绝且不新增通道；有选区时新增一行且一步历史 |
| U26 来源图层 | 按名称与按 id 解析来源；未知名称明确拒绝，不静默退化成合并图像 |
| 笔画门禁 | 笔画进行中通道结构命令与预览均被拒绝；取消后指纹/历史/通道行都不变（不补交半笔） |
| U26 亮度选区 | `lit=86 dark=938`，frame `[1,1,13,13]`（不是全选） |
| U26 来源文档 | 非活动来源自报分量/Alpha 行；按名计算成功且编辑目标不变；关闭的索引与尺寸不匹配分别拒绝 |

### 真实 UI 走查（headless Chromium，无 GPU）

`tests/features/channels/ui-walkthrough.mjs` 用 Chromium 的 DevTools 协议驱动本仓独立 dev 宿主
（真实 WASM、真实 React 装配、真实 `photo-editor.css`），21 项：

| 检查 | 实测 |
| --- | --- |
| dev 宿主装配 / 导入图片装载文档 | 真实导入 PNG 后画布出现 |
| 「图像」菜单 | 可打开，条目含 `通道…`、`应用图像…`、`计算…`（真实 `featureMenuSections`） |
| 通道面板可见 | 挂载且尺寸 232×773 —— 证明共享 CSS 的三行可见性规则生效（缺规则会是 0 尺寸） |
| 通道行 | 复合 + Red/Green/Blue 四行，文案来自真实内核快照 |
| 新建 Alpha | 点击面板按钮后出现 `data-channel-kind` 行，无报错 |
| 选中 Alpha 目标 | 行变 `data-selected`，`data-channel-row="alpha:0"` |
| 通道视图 | 切换后出现 192×144 的 `canvas.photo-editor__channel-view` |
| 应用图像预览→确认 | 预览前确认禁用；预览后启用；**预览不写历史**；确认后历史出现 `Apply Image`（一步） |
| 计算面板 | 可见，两源/混合/蒙版字段完整 |
| 计算预览→确认 | 预览前确认禁用、预览后启用且有候选画布；确认后历史出现 `Calculations` 且通道面板多一行 |
| 删除通道 | 点击删除后行数 -1、`data-channel-target` 回到 `composite`、历史出现 `Delete Channel`、无报错 |
| 载入亮度选区 | 按钮可用、无报错，历史出现 `Load Selection` |
| 1024×768 | 面板 232×861，超出窗口但在可滚动容器内（底部按钮可达） |
| 控制台 | 无错误 |

**走查限制（如实记录）**：headless 合成指针事件能到达画布（`pointerdown`/`pointermove` 均被接收），
但笔迹没有登记（历史无 `paint.stroke`、修订不变）。**同一失败发生在复合目标上**，因此这是
headless 输入合成的限制，不是通道目标的问题；画布落笔的像素证据取自真实 WASM 冒烟（见上表）。
无 GPU 环境按仓库规则不采渲染/视觉/性能截图。

### 跨语言通道内容身份与共享接线

- 规范文本：`channels:<n>` + 每行
  `channel:<utf16len>:<name>:<alpha|spot>:<opacity>:<masked|selected>:<color>:<solidity|->:<surfaceHash>`。
- Rust `features/channels/content.rs`（5 用例）与 TS `features/channels/content.ts`（6 用例）对同一
  fixture 都得 `984d1d9a4311a91d`。
- 共享接线已生效：
  - `document_content.rs` 调 `attach`；`identity.rs` 把 `channelsContentHash` 读成 `channels:<hash>` 行；
  - `packages/protocol/src/features/shared/content.ts` 读同名字段，并把「图案在前、通道在后」的
    行序写进 `image-project.test.ts`（新增 1 用例，含非法值拒绝与删除后回到旧身份）；
  - `the_shared_content_hash_covers_channels` 断言 `Editor::content_hash`：建通道变、显隐/目标不变、
    通道像素变、删空回到旧身份。

### 本域回归用例与任务对应

- 1.2 能力矩阵：`capabilities.test.ts` 3 用例（阶段/顺序、无同名非目标、不按命令前缀顺带开放）。
- 2.1 U25：内核 19 用例（门禁、往返、分量隔离、查看态、改名/复制/删除、无变化短路、拆合预算、
  **只合成 RGB**、缩略图/视图有界、每文档自报来源通道）；TS `model.test.ts` 9 +
  `stroke-routing.test.ts` 5（`buildStroke` 的通道目标、视图模型解码、目标编码）+ `panel.test.tsx` 17。
- 2.2 U26：应用图像预览无状态/一步确认、蒙版目标拒绝、计算只改目标、亮度选区非全选；
  TS 侧旧预览失效（参数改动、切文档）与确认前必须重新预览。
- 3.1 事务：`no_document_and_malformed_parameters_never_write`、`unchanged_commands_do_not_add_history_or_dirty_the_document`、
  `a_closed_or_mismatched_source_is_refused_without_touching_the_target`、`workspace.test.ts` 6 用例。
- 3.2 内容身份：Rust 5 + TS 6 + 共享 `image-project.test.ts` 1。
- 3.3 门禁：`blockingDraft()` 统一出口；面板本地守卫（参数改动/切文档使旧预览失效）；
  内核 `require_no_stroke()`/`require_no_tool_draft()` 在通道命令与预览前执行——真实 WASM 断言
  「笔画进行中拒绝通道命令与预览，取消后指纹/历史/通道行均不变」；来源关闭/尺寸不匹配各自拒绝。
- 3.4 dev 与 Woohaa 同一实现：`pnpm -C photocraft run typecheck` 4 包全绿、dev 8 用例、
  Woohaa 275 用例 + 类型检查通过。
- 核验贡献：`features/channels/mod.rs` 7 用例（含 tile 网格按画布真实分块校验的误报修复）
  + `tests/verify.rs` 的端到端 1 用例（真实工程字节）。

## 未完成项与阻塞

| 任务 | 未完成内容 | 真实原因 | 已采集的替代证据 |
| --- | --- | --- | --- |
| 4.2 | 真实环境电脑/Pad 主线**人工**走查（含应用内截图） | 本会话容器 Linux **无真实 GPU**（`ls /dev/dri` 无 `renderD*`）、无显示会话（`DISPLAY`/`WAYLAND_DISPLAY` 未设置）。按 AGENTS.md，无 GPU 环境不得采渲染/视觉证据 | 真实 WASM 76 项冒烟 + headless Chromium 21 项 DOM/交互走查（1440×1000、1024×768），覆盖除「画布落笔像素」与视觉质量外的全部主线步骤 |
| 4.3 | 逐 U 组**应用内截图**与真实设备证据 | 同上；另缺数位笔/Pad/Photoshop 真机 | 76 项冒烟 + 37 条 editor 用例 + 9 条 protocol 用例 + 30 条本域 Rust + 21 项 UI 走查 |
| 5.2 | 跨域 UI/像素/身份/保存/核验**联合**回归 | `parallel-work.md` 要求其他同级 change 全部完成后才做的联合验收；那些 change 尚未全部就绪 | 本域内跨模块（内核/协议/编辑器/核验器/宿主）回归全绿 |

域外、与本 change 无关但会让整体检查红的一项：

- `pnpm boundary:check` 的「清单目录都存在」报缺 `artifacts`/`logs`。两者是 `.gitignore` 的运行时
  产物目录，任何干净检出都会缺；本 change 未新增顶层目录。

## 共享文件改动（需集成负责人复核）

本 change 现在**确实**修改了共享文件。逐项说明理由与最小性：

| 共享文件 | 改动 | 为什么必须在这里改 |
| --- | --- | --- |
| `rust/crates/editor-core/src/document_content.rs` | +2 行：`project_content` 末尾调 `channels::content::attach` | 内容指纹只由该函数产出；在域内无法接入 |
| `rust/crates/editor-core/src/identity.rs` | +5 行：把 `channelsContentHash` 读成 `channels:<hash>` 行 | 规范文本由该函数拼装；行序需与 TS 一致 |
| `packages/protocol/src/features/shared/content.ts` | +1 字段 +6 行 | TS 侧同一指纹；不加则两端指纹分歧 |
| `rust/crates/project-verify/src/lib.rs` | +2 行：图层遍历后调 `channels::inspect_document` | 核验入口唯一 |
| `packages/editor/src/photo-editor-app.tsx` | `channelTarget` 派生、单通道视图预览、笔迹带 `channel` 索引、细节块在非复合目标时清理 | 主画布只有这一处能改视图与落笔目标 |
| `packages/editor/src/editor-view-model.ts` | +`EditorChannelTarget`、`channelTarget` 字段、`channelTargetCode` | 界面需要读查看态；不复制内核状态 |
| `packages/editor/src/features/painting/tool-parameters.ts` | `buildStroke` 增加可选 `channel` | 笔刷是唯一落笔参数构造点 |
| `packages/editor/src/features/boundaries.test.ts` | 12→15 section 断言 + 通道域断言 | 共享测试断言的是真实装配 |
| `packages/editor/src/photo-editor.css` | 追加 3 行可见性 + 12 条 `.photo-editor__channel-*` | 域内无法覆盖共享选择器 |
| `tests/fixtures/contract.json` | +8 个能力 | 单一语义 fixture |
| `notes/feature-boundary-wasm-baseline.json` / `-baseline.json` | 重生成 / 两个 `sharedFiles` 哈希 | 基线必须反映实际产物 |
| `integrations/woohaa/tests/editor-workspace.test.ts` | 替身补 6 个通道方法 | 宿主适配包的测试替身；缺则类型检查红 |
| `notes/capability-matrix.md`、`docs/code-map/photocraft.md` | 新增 P7 通道小节与三处地图行 | 任务 4.4 要求 |

仍**未**改动：`photo-editor-canvas.tsx`、`editor-wasm.ts`、`editor-workspace.ts`、`capability.rs`、
`rust/project-limits.json`、任何 sibling 域目录、`photocraft/vendor/photocraft`。

建议接入时把 `photo-editor.css` 的追加段迁到域样式入口，避免后续域继续堆在同一文件。

### 已知的共享侧瑕疵（未修，避免越界）

笔画进行中调用通道命令时，拒绝理由的**命令标签**取自共享的 `Editor::stroke_error()`，因此消息写成
「命令 paint.stroke 被拒绝：请先结束或取消当前笔迹」，而实际被拒绝的是通道命令。行为正确（确实拒绝、
确实不写入），只是标签误导。该函数归共享核心（`rust/crates/editor-core/src/editor.rs`），
本 change 不改；真实 WASM 断言按「含『笔迹』」匹配，不锁死标签。

## 真实 UI 与设备

独立 dev 和 Woohaa 均使用真实匹配 WASM；电脑 1440×1000 和 Pad 正常窗口 1024×768 逐项操作并留应用内截图，检查菜单/弹层/参数/内容与边界一致性。Pad 窗口走查不代表真实 Pad/数位笔硬件验证。

先按平台探测 GPU：Windows 查询显示适配器，macOS 用 system_profiler，Linux 用 renderD；不得在 Windows/macOS 以 /dev/dri 判定无 GPU。确无 GPU 不采渲染/性能证据，标待人工验证并写原因；有 GPU 但缺显示会话、数位笔、Photoshop 或 codec 时分别记录对应原因，不笼统写“无 GPU”。软件渲染不能替代硬件结论。

### 本次环境探测结果

- 平台：Linux（本会话容器，非仓库主力开发机）。
- GPU：`ls /dev/dri` → `No such file or directory`，**无 `renderD*`**，即本容器无真实 GPU。
- 显示会话：`DISPLAY` 与 `WAYLAND_DISPLAY` 均未设置。
- 浏览器：系统 PATH 无 `chromium`/`google-chrome`，但 Playwright 缓存里有真实 Chromium
  （`~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`），因此**能**做 headless DOM/交互
  走查（已做，见上）；headless 不开 GPU 合成，不能替代视觉验收。
- 数位板/笔：未连接；Photoshop：未安装；Pad：未接入。

结论：无 GPU 环境不采集渲染/性能/视觉截图证据；1440×1000 与 1024×768 的**视觉与真机**验收留待人工。
DOM/交互走查与真实 WASM 像素断言已全部采集，不把自动化结果冒充视觉验收。

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。CMYK/Lab/ICC 多色彩管理、印刷专色保真和任意外部文件路径保持排除；`channel.merge` 已按此在**内核与面板两层**收窄为只合成 RGB。

本次实现尚未提交（工作区改动），实现提交号待集成负责人合入后回填。已采集的自动化证据路径：

- `packages/editor/src/features/channels/{model,workspace,stroke-routing}.test.ts`、`panel.test.tsx`
- `packages/protocol/src/features/channels/{capabilities,content}.test.ts`、`src/image-project.test.ts`
- `rust/crates/editor-core/src/features/channels/{tests.rs,content.rs}`
- `rust/crates/project-verify/src/features/channels/mod.rs`、`tests/verify.rs`
- `tests/features/channels/{wasm-smoke.mjs,ui-walkthrough.mjs}`

## 本次实施校验

- OpenSpec strict validation：`npx openspec validate 2026-10-22-add-photocraft-channel-workflows --strict --no-interactive` → valid。
- 任务勾选口径：只有本域实现的自动化验证完成才勾选；缺真实 GPU/显示会话/真机的 4.2/4.3 与依赖其他
  同级 change 的 5.2 保持未勾选并写明真实原因，不以「阶段完成」或「代码已写」替代整项完成。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
