# 图像模式与调色板任务

状态说明：`[x]` = 本域实现与可自动化验证都已完成；`[ ]` = 仍需真实环境/同级依赖才能验证，括号内写明实际卡点与已就绪的部分。所有证据见 [verification.md](verification.md)。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  （18 域装配已在 `b61da631` 落地，本工作树基于其后的 `b0cd6cbc`；本 change 只写 `packages/editor/src/features/modes/`、`packages/protocol/src/features/modes/`、`rust/crates/editor-core/src/features/modes/`、`rust/crates/project-verify/src/features/modes/` 与本 change 文档。）

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  （`check-feature-boundaries.mjs` 仍以 `bdc3c084` 为等价基线并通过；上游固定 `4e7a17cd5d5723313f459753663d0d155f047e19` 由 `buildInfoJson` 实测确认；`image.modes`/`image.color-table`/`image.duotone` 三个能力 id 此前未发布，不存在同名旧 capability 需要归档。）

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  （矩阵见下节「U45 能力矩阵」。）

- [x] 1.3 确认同级依赖 2026-10-22-add-photocraft-channel-workflows；先稳定公共端口、预算与数据归属，不导入宿主私有模块。 — **2026-10-23 已集成复核**：见 [18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
  本域部分已自动核对：`boundary.test.ts` 断言本域 TS 不导入任何兄弟域或 `integrations/`、Rust 侧 `crate::features::*` 只指向 `modes`，协议清单只发布本域自己的三个能力（不引用兄弟域端口）。卡点：通道域的规范通道端口尚未在共享代码里落地（`packages/editor/src/features/channels/` 仍未注册入口与内容贡献）。索引色/双色调的最终验收按 design D2 留待通道域就绪后补。

## 2. 逐项贯通

- [x] 2.1 U45：提供真实灰度/位图/索引色/双色调模式、颜色表与陷印的转换和编辑，先完成模式数据/工具矩阵/身份核验。 成功证据：模式及调色板在工程重开仍保留，转换报告层结构损失，不能用黑白层假装模式转换。
  （走 pinned 上游 `image.mode.rgb|grayscale|indexedColor|bitmap|duotone|colorTable` 生产命令；模式/颜色表/油墨保存在 `Document` 并由 `.pcraft` 往返，实测重开保留；报告含 `layersBefore/layersAfter/flattened/dropped`；身份核验见 3.2 的实测缺口。陷印入口保持关闭并给出 CMYK 原因。）

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  （Rust 模式/计划用例 19 项 + TS 域内 51 项（工作区 13 / 面板 22 / 数据 8 / 边界 3 / 注册 2 / 运行时协商 3）+ 真实控制器门禁 7 项；实测预览前后 `revision` 与 `contentHash` 不变、应用只加一步历史、无变化不提交、只读目标不可用、过期基线拒绝、非法参数不提交上一份候选。新增回归：`duotone` 不带 `inks` 时曾把 `null` 传给上游被拒（真实缺陷，已修）；**面板声明的目标可用性与内核实际接受逐项核对**（5 模式 × 5 目标，位图→位图曾声明可用却被上游拒绝，真实缺陷，已修）；**打开已有双色调文档时曾用界面默认油墨覆盖真实油墨**（真实缺陷，已修，改为以 `modeInfo().duotone.inks` 载入并按油墨数推导类型）；**切颜色表预设时曾保留会越界的旧透明索引**（真实缺陷，已修）；**导出矩阵曾对灰度/位图/索引色也标 PSD 可用**（真实缺陷，已修）；**范围外 CMYK/Lab 曾被一律报「工具/导出全部关闭」而实测都可用**（真实缺陷，已修，改为 `assessed=false` 不判定）；**报告解码没有上界**（10 万条颜色/备注、`depth:1e9` 都被接受，真实缺陷，已修）；**模式信息里直接进 DOM 的文本没有上界**（`rawMode`/目标名/不可用原因/陷印原因/报告油墨名，真实缺陷，已修，短文本 ≤64、说明 ≤300、油墨名非空且 ≤64，按码点计数以免比内核更严）；**原生核验曾把 16 位与像素格式写成拒绝规则，会拒绝编辑器能存的工程**（真实缺陷，已修，规则收窄并加「不得比编辑器更严」回归）；**无变化计划仍提供「确认」按钮，点下去只会得到 `no-change` 错误，而报告同时写着「确认不会新增历史」**（真实缺陷，已修，按钮按 `changed` 禁用）；**清空透明索引输入框会因 `Number("") === 0` 把索引 0 静默设为透明**（真实缺陷，已修，空串映射为 `null`）；**双色调曲线删到 1 点时界面仍显示该点，而内核会静默丢弃并退回恒等曲线**（真实缺陷，已修，不足 2 点显式清空）；**从空曲线点「加点」同样只补 1 点，内核同样静默丢弃**（真实缺陷，已修，不足 2 点时一次补成 `[[0,0],[100,100]]`）；**打开灰度文档时默认目标本身不可用，面板一进来预览就是禁用且无操作能解释**（真实缺陷，已修，按文档/模式首次变化纠正为第一个可用目标，不反复顶掉用户选择）；**颜色表预览后只是点一下别的色块（只改「正在编辑哪一格」，不改任何转换参数）就会作废预览、把「确认颜色表」变灰**（真实缺陷，已修，`tableParams` 的依赖收窄到 `preset`/`colors`/`transparent`，并加回归锁住「点色块不失效、真改颜色才失效」）；同修订号切文档的过期判定；预览 base64 解码前长度预算；16 位文档整体拒绝且不降位深；模式/颜色表各一步撤销后指纹回到原值；兄弟域导入边界。）

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  （已接入共享折叠入口：`document_content.rs` 写入 `mode`、`identity.rs` 在 `patterns:` 后追加模式行、协议 `shared/content.ts` 同序同文本。`features/modes/content.rs` + `packages/protocol/src/features/modes/content.ts` 提供 `mode`/`depth`/`colorTable`/`duotone` 的确定性身份文本，两端共读 `content-fixtures.json`（9 用例 + 13 拒绝），**缺省 RGB/8 位不产生任何行**，旧工程指纹逐字节不变（`default_rgb_documents_keep_their_historical_identity_byte_for_byte` 锁定）。真实 WASM 实测：改颜色表、改油墨、灰度→双色调三者都会改 `contentHash`（原缺口已闭合，`wasm-smoke.mjs` 对应步骤已从「known gap」改为硬断言）。**复核中发现并修复一处自己引入的回归**：范围外颜色模型（CMYK/Lab/多通道）曾被折成 `{"mode":"other"}`，`canonicalize_mode` 判为不可判定 → 整份指纹 `None` → `modeInfo`/`contentHash` 报 `no-document`；现改为完全不产生模式行，并有 `colour_models_outside_the_change_scope_still_have_a_content_hash` 回归。预览解码预算前移、报告各字段上界、原生核验文档级规则与「核验器不得比编辑器更严」回归均已就绪。）

- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  （**运行时协商**：适配层调用前核对本域 5 个内核导出，旧内核返回 `runtime-unsupported` 与逐项缺失导出，不再是 `TypeError`；`wasm-handle.test.ts` 3 项。**文档归属改为三层判据「代际 → 修订 → 内容指纹」**：控制器新增宿主端口 `documentId` / `documentGeneration()`，并在每次成功载入文档（`openImage`/`openProject`/`openPsd`）时自增自己的载入代际；计划由 `features/modes/workspace.ts` 盖上 `owner{documentId,generation}`，确认时逐层比对。关闭后重开同一节点、以及同尺寸同修订的另一份文档都能被识别——只有 `revision`+`contentHash` 时这两类会漏判（回归：`modes-workspace-gate.test.ts` 7 项、`workspace.test.ts` 13 项、宿主 `editor-workspace.test.ts` 3 项）。**保存/草稿门禁**：模式 plan/apply 在冻结与保存阶段返回 `frozen`（此前绕过控制器 `dispatch` 的 frozen 检查，真实漏洞，已修）；`pendingDraftFailure()` 把控制器内部的 `blockingDraft()` 作为唯一权威交给宿主，`pendingDraftOf` 不再自己列一遍草稿种类；`DocumentWorkspaceSession.activate/close/openNode/openFile` 在会话层直接拒绝（不依赖 UI 先拦一次，也不依赖状态回调的发布时机），并在每次切换前重算，草稿结算后不会留下过期拒绝；「打开新文档」「重开已打开的节点」这两条也会切走活动文档，同样被挡住（`document-session.test.ts` 7 项）。**父子回写**：`updateSmartParent` 在父文档有草稿或保存中时拒绝，`updateSmartParentFromChild` 额外要求子文档自己先结算；子文档控制器使用独立归属 id `…​#smart-child`，不冒用父文档 id（`editor-workspace-tools.test.ts` 3 项）。**面板归属键**：`documentOwner()` 的 `documentId#generation` 参与文档键，代际变化即丢弃旧预览（`panels.test.tsx` 22 项）。**独立 dev 宿主**：A/B 切文档原只看 `hasActiveDraft()`，保存窗口会放行，现与正式宿主共用同一判据（`dev-workspace.test.ts` 9 项）。**未在本环境执行**：1440×1000/1024×768 真实界面走查仍待人工；通道域 `2026-10-22-add-photocraft-channel-workflows` 的规范通道端口未落地，联合矩阵待同级合入。）

- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  （入口已注册：`sections.tsx` 的「图像 › 模式与颜色表…」，共享断言 `boundaries.test.ts` 的 section 总数 12→13 并断言 `modes` 有 section，`registration.test.ts` / `boundary.test.ts` 覆盖注册与发布后事实。独立 dev 与 Woohaa 都从同一 `features/modes` 装配。**真实布局走查仍未做**：本环境无显示会话，1440×1000 桌面与 1024×768 Pad 的界面走查留待人工，见 4.2。）

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  （`pnpm run check`、`rust:test`、`wasm`、`features:check`、`verifier`、`boundary:check`、`codemap:check`、`openspec validate --strict`、两个真实 WASM 冒烟脚本（22 步 + 7 条往返），以及 **Woohaa 适配包 typecheck + 284 项用例**均已运行，命令与计数见 verification.md（全量并行跑时 `transform-interaction.test.tsx` 有既有 flake，已用干净 `HEAD` worktree 对照确认与本 change 无关，记录在 verification.md）；`clippy` 本轮首次真正跑通（工具链 1.97.1 的 `clippy 0.1.97` 可用，上一轮记录的「未安装」已不成立）：库目标 exit 0，并修掉本域两处告警/报错（`gate.rs` 的 never-used、`project-verify` 模式测试模块在 crate 级 `deny(unwrap/expect/panic)` 下失败）；`--all-targets` 的剩余失败在别人域的 `smart_source/tests.rs`，如实记录未越界改动。）

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：RGB 转灰度/位图/索引色/双色调 → 调色板编辑 → 保存重开 → 支持的工具和导出拒绝矩阵；不静默降位深或压平。
  卡点：本环境为无显示会话的 Linux 容器，无浏览器/截图能力，UI 主线无法执行，**待人工验证**。非 UI 部分已全部通过：转换 → 保存 → 原生核验 → 重开由 `project-roundtrip.mjs` 的 7 步覆盖（含 CMYK-U8/Lab-U8/RGB-U16/灰度-U16 的「编辑器能存、核验接受」），工具拒绝矩阵由 `wasm-smoke.mjs` 的门禁步骤与 Rust `tests_gate.rs` 覆盖。

- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  （逐项记录见 verification.md 的「U45 逐子能力结果」；UI/真实设备项标「待人工验证」并写明原因。）

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  （`notes/capability-matrix.md` 新增「P7 图像模式、颜色表与双色调」三行并记录门禁与身份事实；`pnpm codemap:check` 以 47 个 manifest / 11 篇文档 / 1354 个链接通过。能力已随 `CONTRIBUTION` 发布到 P7：协议清单、`tests/fixtures/contract.json`（71→74）、WASM 基线与真实握手三处逐项一致，「声明 = 入口 = 实际结果」由 `tests_contribution.rs` 与 `publish.test.ts` 锁定。**复核发现该 Rust 断言文件此前从未被编译**（`features/modes/mod.rs` 缺 `#[path = "tests_contribution.rs"] mod tests_contribution;`），已补声明并修掉其中「拿有序清单跟已排序清单逐位比」的比较错误；5 条现在真实运行并通过。）

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。
  （用户已明确授权本 change 修改必要共享文件，因此这些改动不再以「交接」形式挂起，而是在本 change 内完成并验证：`document_content.rs`（写 `mode`）、`identity.rs`（追加模式行）、协议 `shared/content.ts`、`editor.rs`（一行门禁调用）、`features/modes/mod.rs`（真实 P7 `CONTRIBUTION` + 能力/命令清单）、`tests/fixtures/contract.json`（能力 71→74）、`project-verify/src/lib.rs`（`validate_document` 调用）、`sections.tsx`（菜单入口）、`boundaries.test.ts`（section 12→13），以及两份 WASM/行为基线。**没有在本地复制任何其他域的实现**：门禁只做「按模式拒绝」的判定，不复制画笔/滤镜/文字算法；`features/painting/editor_stroke.rs`、`features/type/editor_text.rs`、`features/filters/tools.rs` 各加一处门禁调用，是让既有写入口不可绕过所必需的最小改动。基线重设只允许预期 diff：commands +6、capabilities +3，其余（8 个内容快照、错误、PNG 字节）逐字节不变，已逐项核对。）

- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  卡点：通道域端口仍未落地（1.3），索引色/双色调与通道的联合验收按 design D2 留待其就绪。**已完成的跨域部分**：跨域命令门（其他域写字节命令按模式拒绝）已验证并覆盖四条写入口；内容身份、保存重开、原生核验是跨域真实回归，分别由 `wasm-smoke.mjs`、`project-roundtrip.mjs`、`modes_pipeline.rs` 覆盖。跨域 **UI** 联合回归需要显示会话，与 4.2 一起留待人工。

## U45 能力矩阵

| 子能力 | 生产命令/参数 | 本域包装 | WASM | UI | 内容/核验 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| RGB 颜色 | `image.mode.rgb`，无参数 | `Editor::plan_mode("rgb")` / `apply_mode` | `planMode`/`applyMode` | 面板目标下拉（离开索引色/双色调有丢弃说明） | 模式进 `Document`；`mode:rgb` 归入缺省不产生身份行（旧工程指纹不变）；导出 PNG `colorType=2`、PSD 可用 | 已交付（P7，菜单「图像 › 模式与颜色表…」） |
| 灰度 | `image.mode.grayscale`，无参数 | 同上 | 同上 | 同上 | 同上；报告 `flattened=false`、保留图层；导出灰度 PNG，PSD 关闭（共享预检只收 RGB/U8）；彩色写入由上游收敛为灰阶，不受门禁限制 | 同上 |
| 位图 | `image.mode.bitmap`，`method=diffusion|threshold|pattern|halftone`、`frequency=1..999`、`angle=-180..180`、`shape=round|ellipse|line|square|diamond|cross` | 同上（需先灰度；已是位图报告不可用） | 同上 | 方法/网频/角度/网形 | 同上；报告拼合与丢弃；四种方法与六种网形逐一被真实内核接受；写像素颜色的命令被门禁拒绝 | 同上 |
| 索引色 | `image.mode.indexedColor`，`palette`、`colors=2..256`、`forced`、`dither`、`amount=0..100`、`transparency` | 同上 | 同上 | 调板/颜色数/强制/仿色/仿色量/透明度 | 同上；颜色表存 `Document`，往返保留并进入内容身份；导出 8 位调色板 PNG（`colorType=3` + `PLTE`）；写像素颜色的命令被门禁拒绝 | 同上 |
| 颜色表 | `image.mode.colorTable`，`table=custom|blackBody|grayscale|spectrum|systemMac|systemWindows|web`、`colors`、`entries{idx:#rrggbb}`、`transparent` | `plan_color_table`/`apply_color_table` | `planColorTable`/`applyColorTable` | 色块网格、预设、单条改色、透明索引 | 索引保持；改表会改 `contentHash`（实测已闭合） | 已交付 |
| 双色调 | `image.mode.duotone`，`type=monotone|duotone|tritone|quadtone`、`inks[]`（`name`≤64、`color=#rrggbb`、`curve`≤64 点，各 0..100） | 同上 | 同上 | 类型 + 每种油墨名称/颜色/曲线编辑 | 油墨存 `Document`，往返保留并进入内容身份（含改名）；导出按油墨渲染为 RGB PNG，PSD 关闭；彩色写入收敛为灰阶，不受门禁限制 | 已交付 |
| 陷印 | `trap_cmds.rs`（需 CMYK） | `mode::trap_status()` 只读 | `modeInfo().trap` | 入口禁用 + 原因 | — | **明确关闭**：本次范围排除 ICC/CMYK |
| 工具矩阵 | — | — | — | 面板显示当前模式不可用的工具，并说明「内核会拒绝」 | 纯函数 `modeToolAvailability` + 跨域门禁 `features::modes::gate` | 已交付：命令门在 `execute`/`beginStroke`/`beginText`/`beginFilter` 四条入口真实拒绝且像素零变化；界面矩阵与内核判据共读 `gate-fixtures.json` |
| 导出矩阵 | — | — | — | 面板展示矩阵与关闭原因（`data-mode-export`） | 纯函数 `modeExportAvailability` | 完成：PNG 五种模式均已核对真实颜色类型；PSD 仅 RGB（灰度/位图/索引色/双色调在共享预检阶段被拒绝） |
| 范围外颜色模型（CMYK/Lab） | — | `mode_id` 返回 `null`，`unavailable_reason` 保持拒绝 | `modeInfo` 报 `mode=null` | 只读读数「不在本次范围」；工具与 PNG/工程导出**不做判定**，PSD 仍报真实关闭 | 两个矩阵的 `assessed=false` | 完成：实测 CMYK/Lab 可保存工程、导出 RGB PNG、落笔与文字都能提交（只有 PSD 被共享预检拒绝），因此不能报「全部关闭」；由 `wasm-smoke.mjs` 的 out-of-scope 一步锁定 |

## 共享改动落地记录（原「交接给集成方」）

用户已授权本 change 修改必要共享文件，下面五项都已在本次改动内完成并有验证，不再作为待办交接：

1. **内容身份** — 已完成：`document_content.rs` 写入 `mode`；`identity.rs` 在 `canvas:`/`patterns:` 之后、图层之前追加模式行；协议 `shared/content.ts` 同序同文本折叠。缺省 RGB/8 位不产生行，旧工程指纹逐字节不变。证据：`modes_identity_tests.rs`（8 项，含 CMYK/Lab 回归）、`content-modes.test.ts`（6 项）、`wasm-smoke.mjs`「color table, ink and duotone-mode edits move the shared content hash」。
2. **能力与命令发布** — 已完成：`features/modes/mod.rs::CONTRIBUTION` 为真实 P7 贡献（`image.modes`/`image.color-table`/`image.duotone`，order 40/41/42）与六条 `image.mode.*`（order 40–45）；协议清单、`tests/fixtures/contract.json`（能力 71→74）、WASM 基线三处同步。证据：`tests_contribution.rs`（5 项）、`publish.test.ts`（4 项）、真实握手 74 项。
3. **菜单入口** — 已完成：`sections.tsx` 注册「图像 › 模式与颜色表…」，`boundaries.test.ts` 的 section 总数 12→13 并断言 `modes` 有 section。证据：`registration.test.ts`（2 项）、`boundary.test.ts`（3 项）。
4. **原生核验接入** — 已完成：`verify_container_with` 在样式校验后调用 `features::modes::validate_document`，4 处 `#[cfg_attr(not(test), allow(dead_code))]` 已移除。规则**刻意不比编辑器更严**（不校验位深/像素格式，接受 CMYK/Lab/U16）。证据：`modes_pipeline.rs`（3 项，走公开 `verify` 入口）、`project-roundtrip.mjs`（7 步）。
5. **跨域命令门** — 已完成：新增 `features/modes/gate.rs`，在 `Editor::execute` 的唯一命令门之后、任何草稿/预览分支之前判定，并在 `begin_stroke`、`begin_text`、`begin_filter` 三个草稿入口各加一道，确保快捷键/命令面板/宿主脚本都绕不过去。证据：`tests_gate.rs`（11 项，第 11 条把 fixture 的 `closedByMode` 键与 `RESTRICTED_MODES`/`Restriction::all()` 逐项对齐）、`wasm-smoke.mjs` 门禁步骤（两条模式 × 五条路径，全部拒绝且像素零变化）。

**基线重设说明**：`notes/feature-boundary-wasm-baseline.json` 与 `notes/feature-boundary-baseline.json` 的 `sharedFiles` 哈希已按预期 diff 更新——commands +6（`image.mode.*`）、capabilities +3（`image.modes`/`image.color-table`/`image.duotone`），其余 8 个内容/状态快照、错误文本与 PNG 字节**逐字节不变**（已逐项比对确认后才写入）；`sharedFiles` 只更新实际变化的 `contract.json` 与 `identity.rs`。`pnpm run features:check` 通过。

## 仍未完成（不勾选，原因如实）

| 项 | 原因 |
| --- | --- |
| 真实 UI 走查（1440×1000 桌面 / 1024×768 Pad） | 本机为无显示会话的 Linux 容器，无浏览器/截图能力；需人工在有显示环境验证 |
| 通道域联合验收（1.3 / 5.2） | 同级依赖 `2026-10-22-add-photocraft-channel-workflows` 的规范通道端口未落地 |
| Photoshop 双色调往返 | 需要外部应用，属人工验证项 |
| `cargo clippy --all-targets` 全局绿灯 | 本域与 `editor-core` 0 error；整条命令只剩别人域 `smart_source/tests.rs` 的 18 处 `unwrap()`（不在本 change 归属，未改动） |
