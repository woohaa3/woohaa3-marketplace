# 验收计划与记录

## 本次状态

本域实现、共享改动、能力发布、菜单入口、原生核验与跨域命令门**全部落地并自动验证通过**（2026-10-23）。仍未勾选的只有需要真实显示会话、同级通道域或外部应用的项，原因逐项写在「未完成项与真实原因」。

已完成并可复现：

- Rust：六条 pinned 上游生产命令的模式转换/颜色表包装、有界参数校验、计划→应用、损失报告、只读信息；
- 内容身份：模式数据（`mode`/`depthBits`/`colorTable`/`duotone`）折叠进共享 `project_content` 与 `identity::canonicalize`，协议侧同序同文本；缺省 RGB/8 位不产生行，旧工程指纹逐字节不变；
- 能力与命令：`CONTRIBUTION` 为真实 P7 贡献（3 能力 + 6 命令），协议清单、`contract.json`（71→74）、WASM 基线三处一致；
- 菜单入口：「图像 › 模式与颜色表…」已注册（section 12→13）；
- 原生核验：`verify_container_with` 调用 `features::modes::validate_document`，规则不比编辑器更严；
- 跨域命令门：索引色/位图文档上写像素颜色的命令在 `execute` 与三条草稿入口都被真实拒绝，像素零变化；
- 真实 WASM：22 步冒烟 + 7 步工程往返全部通过。

本轮（含此前累积）复核发现并修复 **21 个真实缺陷**，其中 15–21 是最近两轮复核新增的 7 个：

15. **范围外颜色模型被折成不可判定**（本轮自己引入、自己发现）：`mode_json` 曾把 CMYK/Lab 写成 `{"mode":"other"}`，`canonicalize_mode` 判为不可判定 → 整份内容指纹为 `None` → `modeInfo`/`contentHash` 直接报 `no-document`，CMYK/Lab 文档一打开就失效。现在范围外模型**完全不产生模式行**，新增 `colour_models_outside_the_change_scope_still_have_a_content_hash` 回归（同时断言 `rawMode` 与 targets 可用）。
16. **索引色工具矩阵与内核门禁不一致**：矩阵允许 `clone`/`heal`，但它们是 `paint.*`、门禁会拒绝 → 界面说可用、点了必失败。矩阵已按门禁修正。
17. **双色调工具矩阵声明了不存在的限制**：矩阵关闭 `text`/`pen`，但实测双色调把彩色写入收敛为灰阶（`nonGray=0`），文字完全安全。已放开。
18. **位图矩阵漏掉 `quick` 选择**：选区命令从不写颜色、也不被门禁限制，矩阵却关掉了它。已放开。
19. **跨域门禁可被草稿入口绕过**（本轮发现并修）：`begin_stroke`/`begin_text`/`begin_filter` 走各自的 scratch 会话，不经 `Editor::execute`；只在命令分派处拦，用户会先看到预览、画完调完才在提交时失败。三个入口已各加一道门禁，落笔前就拒绝。
20. **颜色表预览后只点一下别的色块就会作废预览**（真实缺陷，已修）：`tableParams` 的依赖是整个 `tableDraft`，而点色块只改「当前在编辑哪一格」的 `index`，并不是转换参数；重建参数对象触发「参数变了就清空计划」的副作用，已算好的预览消失、「确认颜色表」变灰，用户看到的是一次无原因的失效。依赖已收窄到 `preset`/`colors`/`transparent`，回归同时锁住「点色块不失效、真改颜色必须失效」。
21. **模式信息里的字符串没有上界**（真实缺陷，已修）：`rawMode`、目标 `label`、目标不可用 `reason`、`trap.reason` 与报告里的油墨名都原样渲染进 DOM，解码却只校验了类型。现在短文本 ≤64、说明文本 ≤300、油墨名非空且 ≤64（与 `decodeDuotone`、内核 `parse_inks` 同一上界），与报告备注的上界保持一致；计数按码点而非 UTF-16 单元，避免前端比内核更严（64 个 emoji 在内核合法）。

前 14 个缺陷（此前轮次已修）见下，保留记录以免回归：

1. 双色调不带 `inks` 时把 `null` 传给上游被拒；`normalize()` 现在直接省略该键；
2. 位图文档的 `modeInfo().targets` 声明「位图可用」，实际被上游 `Bitmap needs a Grayscale image` 拒绝；目标矩阵改为用真实内核接受度逐项校验（5 模式 × 5 目标）；
3. 面板打开已有的双色调文档时把油墨重置为界面默认值，点一次确认就会静默替换用户的真实油墨；现在以 `modeInfo().duotone.inks` 载入名称/颜色/曲线；
4. 切到颜色表预设时仍保留旧的透明索引，越界时内核会拒绝该次预览；现在切到预设即清空透明索引；
5. 导出矩阵原先把 PSD 也对灰度/位图/索引色标为可用，实际内核在共享 PSD 预检阶段直接拒绝；
6. 切换文档时若两份文档修订号相同，旧预览仍然存活、可被确认到新文档；现在以「文档名 + 尺寸 + 修订」为重取信息的归属键；
7. 面板对范围外颜色模型（CMYK/Lab）把工具与导出一律报「关闭」，实测那些文档能保存工程、导出 RGB PNG、落笔与文字都能提交；矩阵改为 `assessed=false`；
8. 模式报告解码没有上界，10 万条颜色、10 万条备注、`depth: 1e9` 都会被当成合法报告并直接进 DOM；现在颜色 ≤256、备注 ≤16 条、位深只认 8/16/32；
9. 面板对 `changed=false` 的计划仍提供「确认」按钮，点下去内核返回 `no-change` 错误；按钮现在按 `changed` 禁用；
10. 清空「透明索引」输入框时 `Number("") === 0`，把「无透明索引」静默改成索引 0；空串现在显式映射为 `null`；
11. 双色调曲线删到只剩 1 个点时界面仍显示该点，而内核会静默退回恒等曲线；现在删到不足 2 点显式清空；
12. 原生核验曾把「16 位」与「像素格式必须等于模式展开格式」写成拒绝规则，会拒绝编辑器能存的工程；规则已收窄并加「核验器不得比编辑器更严」回归；
13. 从空曲线点「加点」只补 1 个点，内核同样静默丢弃；现在不足 2 点时一次补成 `[[0,0],[100,100]]`；
14. 打开灰度文档时面板默认目标本身就是不可用的「灰度」，预览一进来就是禁用且无操作能解释；现在只在文档/模式首次变化时纠正为第一个可用目标。

## 必须验证的主线

RGB 转灰度/位图/索引色/双色调 → 调色板编辑 → 保存重开 → 支持的工具和导出拒绝矩阵；不静默降位深或压平。

非 UI 部分全部通过（见「真实 WASM 冒烟」与「工程往返」）；UI 部分需要显示会话，**待人工验证**。

## 非渲染检查（实际执行）

环境：Linux x86_64 容器，无显示会话；Rust 1.97.1；Node 24.14.1；`wasm-bindgen` 与 `wasm-opt` 可用。

| 检查 | 命令 | 实际结果 |
| --- | --- | --- |
| 子项目构建/类型/单元 | `pnpm -C photocraft run check` | **通过**（exit 0）：protocol **85**、project-verifier **40**、editor **330**；四个包 typecheck + build 均 Done |
| Rust 全工作区回归 | `cargo test --manifest-path rust/Cargo.toml --workspace --offline` | **通过**（exit 0）：全部测试二进制 **337 passed，0 failed**（`editor-core` 292 = lib 250 + 集成 4/13/25，`project-verify` 45 = lib 13 + 集成 1/3/3/10/15） |
| 本域 Rust 用例 | `cargo test -p photocraft-embed-editor --offline modes` | **通过**：**49 passed**（转换/计划/矩阵 19、内容身份 6、共享折叠 8、跨域门禁 11、发布断言 5） |
| 本域核验用例 | `cargo test -p photocraft-project-verify --offline` | **通过**：13 + 集成 1/3/3/10/15（含 `modes_pipeline.rs` 3 项） |
| 真实 WASM 构建 | `pnpm -C photocraft run wasm` | **通过**：`wasm-release` 17.41 MiB，glue 95.0 KiB |
| WASM 行为等价 | `pnpm -C photocraft run features:check` | **通过**：commands +6、capabilities +3，其余 8 个快照/错误/PNG 字节逐字节不变（基线有意重设，见下） |
| 原生核验工具 | `pnpm -C photocraft run verifier` | **通过**：3.84 MiB 产物 |
| 代码地图 | `pnpm codemap:check` | **通过**：47 个 manifest、11 篇文档、1354 个链接 |
| OpenSpec 严格校验 | `pnpm -C photocraft exec openspec validate 2026-10-22-add-photocraft-image-mode-workflows --strict` | **通过**：`Change ... is valid` |
| 开源/闭源边界 | `pnpm boundary:check` | **通过**（exit 0，6 项）。此前记录的 `vitest: command not found` 是根 `web/` 工作区未安装依赖所致；本轮已装依赖，另外需要仓库根的 `artifacts/`、`logs/` 两个被忽略的空目录存在（该检查把它们列进开源清单），补齐后 6 项全过 |
| `clippy`（库目标） | `cargo clippy --manifest-path rust/Cargo.toml -p photocraft-embed-editor -p photocraft-project-verify --offline` | **通过**（exit 0，只有既有 warning）。上一轮记录的「工具链未安装 `cargo-clippy`」不再成立——本轮 `clippy 0.1.97` 可用，已实际运行；运行中发现并修掉本域两处：`gate.rs` 的 `Restriction::id` 与测试用 `all()`/`label()` 互相引用导致的 never-used 警告（合并为 `label()`），以及 `project-verify/features/modes/mod.rs` 的测试模块在 crate 级 `deny(clippy::unwrap_used, expect_used, panic)` 下报错（补模块级 `allow`，与仓库其它测试模块同做法） |
| `clippy`（`--all-targets`） | `… --all-targets` | **本 change 范围内通过**：`editor-core` 0 error；`project-verify` 的 `features/modes/*` 0 error。整条命令仍失败在**别人域里既有的** `project-verify/src/features/smart/smart_source/tests.rs`（18 处 `unwrap()`，本 change 未修改该文件），如实记录、未顺手改动 |
| Woohaa 适配（类型 + 全部用例） | `pnpm -C integrations/woohaa run typecheck`、`pnpm -C integrations/woohaa exec vitest run` | **通过**：`tsc --noEmit` exit 0；**34 个文件 / 284 项全部通过**（本轮新增文档归属与门禁回归，见「任务 3.3 的宿主回归」；全量并行跑时 `tests/transform-interaction.test.tsx` 的 context-menu 两组有**既有** flake，见「未完成项与真实原因」末行） |
| 独立 dev 宿主（A/B 切文档门禁） | `pnpm -C photocraft/dev exec tsc --noEmit`、`pnpm -C photocraft/dev exec vitest run` | **通过**：typecheck exit 0，**9 项**通过。dev 宿主原先只看 `hasActiveDraft()`，冻结/保存窗口里切文档会放行，与 Woohaa 宿主不一致；现改为同一份 `pendingDraftFailure()`/`isSaving()` 判据，并加「保存中拒绝切换」回归 |
| 宿主测试基础设施 | `integrations/woohaa/vitest.config.ts` | 修一处**只在特定 pnpm 布局下成立**的写死路径：React 别名原本硬编码 `photocraft/node_modules/.pnpm/react@18.3.1`，当 pnpm 使用全局虚拟 store（本机默认）时该目录不存在，整个宿主套件连 `react` 都解析不到。现改为「本地 `.pnpm` 存在就用它（与 `lucide-react` 等传递依赖拿到同一份副本），否则 `require.resolve` 退回全局 store」。两种布局下都是单份 React |
| 代码地图（仓库根） | `pnpm codemap:check` | **通过**：同上 |
| 命令形式说明 | — | 本工作树先用 `pnpm install --config.enableGlobalVirtualStore=false`（与 `integrations/woohaa/vitest.config.ts` 期望的仓库内 `.pnpm` 布局一致）装好依赖，因此表格里部分 `pnpm -C … exec` 实际以包内二进制（`./node_modules/.bin/tsc`、`./node_modules/.bin/vitest`、`pnpm --config.enableGlobalVirtualStore=false run check`）执行；判定结果相同，命令语义未改 |

### 基线重设说明（有意，不是漂移）

`notes/feature-boundary-wasm-baseline.json` 与 `notes/feature-boundary-baseline.json` 已更新，diff 严格限定为预期变化，逐项核对后才写入：

- `commands`：185 → 191，新增恰好 6 条 `image.mode.*`，无删除、无重排（旧 185 条是新列表的前缀）；
- `capabilities.capabilities`：71 → 74，新增 `image.modes` / `image.color-table` / `image.duotone`，无删除；
- `build` / `steps`（8 个内容与状态快照，含 hash）/ `errors` / `output`（工程长度、PNG sha256）：**逐字节不变**；
- `sharedFiles` 只更新实际变化的两个：`tests/fixtures/contract.json`（能力 71→74）与 `rust/crates/editor-core/src/identity.rs`（模式行）。

重设后 `pnpm run features:check` 通过，输出仍为「commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084」。

## 真实 WASM 冒烟

`node tests/features/modes/wasm-smoke.mjs`（先 `pnpm run wasm`），**22 项全部通过**（`"ok": true` × 22，`false` × 0；本轮在 `gate.rs` 改动后重新构建 WASM 再跑一次）：

- `buildInfo`：`upstreamCommit=4e7a17cd…`、`engineVersion=4e7a17cd…+woohaa-patterns-v1`、`formatVersion=1`；
- `file.new` → `modeInfo`：RGB 文档下 `rgb` 不可用（「当前已是 RGB 颜色」）、`grayscale`/`indexed` 可用、`bitmap`/`duotone` 要求先转灰度；
- `planMode("grayscale")`：`fromMode=rgb`、`toMode=grayscale`、图层 1→1、预览 16×8×512 字节、`changed=true`；
- **预览前后 `revision=1`、`contentHash` 完全一致**（预览不碰正式文档）；
- `applyMode("grayscale")`：`committed=true`，历史 `["Open","Grayscale"]`（一步）；
- 过期基线 `applyMode("rgb", {baseRevision:0})`：拒绝「文档已变化，请重新预览后再确认」；
- 索引色 + 颜色表：`colorCount=2`，颜色表计划报告 19 个字段（与模式报告同形），`applyColorTable` 提交后色表首项为 `#00ff00`；
- RGB 文档上 `planColorTable`：拒绝「颜色表只在索引色模式可用」；
- **`duotone` 不带 `inks`（`type=tritone`）：`committed=true`，油墨 `Black/Warm Brown/Gold`、默认曲线 2 点**；
- **RGB 直接 `planMode("bitmap")`：拒绝「位图模式需要先转换为灰度」**；
- **可用性矩阵一致性**：5 种模式 × 5 个目标共 25 组，`available` 与内核实际是否接受逐项一致，`mismatches=[]`；
- **导出矩阵与真实编码器一致**：RGB → PNG `colorType=2`；灰度/位图 → `0`；索引色 → `3` 且带 `PLTE`；双色调 → `2`。PSD：只有 RGB `exported`，其余四种被拒绝并报「PSD 导出只支持 RGB/U8 文档」；
- **16 位不在范围**：`depth=16` 文档下 5 个目标全部 `available=false` 且原因含「8 位」，位深与模式都保持原值（不静默降位深）；
- **一步历史可撤销**：`indexed` 转换 + 颜色表编辑各占一步；两次 `undo` 后模式回到 `rgb`、颜色表回到 `null`、`contentHash` 与起始值相同；
- **参数枚举与边界**：位图方法/网形、索引色 8 种调板 × 4 种强制 × 4 种仿色、`amount` 0/100、`colors` 2/256、双色调 4 种类型、4 种油墨、64 点曲线、64 字符油墨名、反向曲线端点共 **38 组全部被内核接受**（`rejected=[]`）；
- **跨域门禁（本轮新增，硬断言）**：索引色与位图文档上，`execute("paint.stroke")`、`execute("type.create")`、`beginStroke`、`beginText`、`beginFilter` 五条路径**全部被拒绝**（`rejected=true`），且拒绝前后渲染像素**逐字节相同**（`unchanged=true`）；灰度文档上同一笔画**照常接受**（`grayscaleStroke="ACCEPT"`）。实际错误文本：
  - 索引色：`命令 paint.stroke 被拒绝：当前是索引色文档：paint.stroke 会写入颜色表之外的颜色；请先转换为 RGB 再编辑`
  - 位图：`命令 paint.stroke 被拒绝：当前是位图文档：paint.stroke 会产生非黑白像素；请先转换为灰度或 RGB 再编辑`
  - （此步此前是「known gap: drawing is not yet gated」，已改成正向断言，防止回退成只提示不拦截）；
- **内容身份（本轮改为硬断言）**：`tableMovedHash=true`、`duotoneMovedHash=true`、`duotoneInkMovedHash=true`——改颜色表、灰度→双色调这一步转换、改油墨三者都会改 `contentHash`（此前三者都是 `false`，是未修缺口）；
- **双色调曲线少于 2 点**：真实内核存入 2 点曲线后再送 1 点或空曲线，读回都是恒等曲线（`onePointBecameIdentity=true`、`emptyBecameIdentity=true`），即内核**静默丢弃**；面板据此把删到 ≤1 点显式清空；
- **范围外颜色模型矩阵**：CMYK 与 Lab 文档 `modeInfo().mode=null`、能保存工程、导出 RGB PNG（`colorType=2`）、`paint.stroke` 与 `type.create` 都提交并改 hash，只有 PSD 被拒。面板改为「本域不判定」+ PSD 真实关闭；
- 最终 `modeInfo`：`mode=indexed`、`depth=8`、`colors=["#00ff00","#ffffff"]`、`trap.available=false`；
- 预览 base64 解出 512 字节 = 16×8×4。

## 工程往返（保存 → 原生核验 → 重开）

`node tests/features/modes/project-roundtrip.mjs`（先 `wasm` + `verifier`），**7 项全部通过**（`"ok": true` × 7，`false` × 0；3 条模式主线 + 4 条「核验器不得比编辑器更严」）：

| 主线 | 原生核验器 | 重开结果 |
| --- | --- | --- |
| 索引色 + 改颜色表 `#00ff00` | exit 0，`{"ok":true,…}` | `mode=indexed`，颜色表与保存前逐项相同 |
| 灰度 → 三色调油墨（Black/Warm/Blue，含曲线） | exit 0 | `mode=duotone`，3 种油墨与颜色/曲线相同 |
| 灰度 → 位图（阈值） | exit 0 | `mode=bitmap` |
| CMYK/U8（`file.new mode:cmyk`） | exit 0 | 编辑器能存 → 核验必须接受 |
| Lab/U8（`file.new mode:lab`） | exit 0 | 同上 |
| RGB/U16（`file.new depth:16`） | exit 0 | 同上（16 位不在本域转换范围，但仍是合法工程） |
| 灰度/U16 | exit 0 | 同上 |

后四条是**反向约束**：`validate_document` 若把「只收 8 位」或「像素格式必须等于模式展开格式」写成拒绝规则，接入 `verify_container_with` 后这些工程会从 exit 0 变成假失败。规则已收窄为只校验颜色表/油墨/颜色模型。

核验器摘要里的 `depth: 1` 是**图层树嵌套深度**（`ProjectSummary.depth`），不是通道位深，也与本域报告的 `depth: 8`（每通道采样位深）不是同一含义；本次未改共享摘要格式，引用核验器输出时不把它当位深证据。

## 跨域命令门的实测依据

门禁规则不是拍脑袋定的，每一条都用真实 WASM 量过（构建出的内核 + 渲染像素）。以 `#000000` 填充的文档、转成目标模式后落一笔洋红（`brush.color=[1,0,1,1]`、`hardness=0` 带抗锯齿）：

| 操作 | 索引色 | 位图 | 灰度 | 双色调 |
| --- | --- | --- | --- | --- |
| `paint.stroke` | 14 种表外颜色 | 14 个非黑白像素 | 灰阶（`nonGray=0`） | 灰阶（`nonGray=0`） |
| `type.create`（洋红） | 31 种表外颜色 | 非黑白像素 | 灰阶 | 灰阶 |
| `edit.fillForeground` | 写入表外色 | 非黑白像素 | 灰阶 | 灰阶 |
| `filter.blur.gaussianBlur` | 76 种表外颜色 | 非黑白像素 | 灰阶 | 灰阶 |
| `path.fill` / `path.stroke` | 表外色 | 非黑白像素 | 灰阶 | 灰阶 |
| `image.adjustments.*` | 可出表（另一组样本 `outsideTable=2`） | 可产生灰阶 | — | — |
| `layer.newAdjustmentLayer.*` | 可出表 | 可产生灰阶 | — | — |
| `paint.stroke`（`target:"mask"`） | **不变量** | **不变量** | 不变量 | 不变量 |
| `select.*` / `layer.*` / 几何 | 不变量 | 不变量 | 不变量 | 不变量 |

因此门禁按「写像素颜色」判定，掩版/通道/选区/几何/读取类一律放行；灰度与双色调不设限。索引色与位图跨保存重开后表外像素逐像素保留（此前实测），所以必须在写入前拒绝而不是事后修正。

## U45 逐子能力结果

| 子能力 | 自动验证 | 结果 |
| --- | --- | --- |
| RGB / 灰度 | `grayscale_conversion_reports_layers_and_keeps_them`、`mode_targets_and_rejections_are_reported_per_document_state` | 通过：灰度保留图层、`lossy=false`、模式与深度真实写入，重开保留；导出的 PNG 为灰度 `colorType=0` |
| 位图 | `bitmap_conversion_quantises_to_black_and_white`、往返冒烟 | 通过：需先灰度（RGB 直接转被拒绝并说明）、阈值量化、重开保留；写像素颜色的工具被门禁拒绝 |
| 索引色 | `indexed_conversion_flattens_writes_a_real_palette_and_survives_reopen`、`color_table_and_ink_edits_change_the_identity_contribution` | 通过：拼合与丢弃在报告中，颜色表按实际颜色数生成，重开保留；导出为带 `PLTE` 的 8 位调色板 PNG；改颜色表会改变 `contentHash`；写像素颜色的工具被门禁拒绝 |
| 颜色表 | `color_table_edits_keep_indices_and_change_pixels`、`color_table_accepts_a_transparent_index_and_rejects_out_of_range_entries`、`color_table_plan_reports_the_shared_mode_report_shape` | 通过：改条目不改数量、预设整表替换 256 条（`web` 实测 216 条）、透明索引、越界/空表/非法索引拒绝且不写；报告与模式报告同形 |
| 双色调 | `duotone_inks_are_stored_edited_and_reopened`、`conversions_produce_stable_identity_lines`、WASM 冒烟「默认油墨」 | 通过：三色调/单色调切换、油墨名与颜色重开保留；不带 `inks` 时用内核默认油墨；预览按油墨渲染；油墨数 >4、曲线 >64 点、颜色非 `#rrggbb` 拒绝 |
| 陷印 | `trap_stays_closed_with_a_specific_reason`、面板 `data-trap=closed` | **关闭**：只读返回 `available=false` + CMYK 原因，面板按钮禁用 |
| 拒绝/取消/只读 | `preview_never_touches_the_document_revision_or_history`、`stale_plan_cannot_commit_onto_a_changed_document`、`invalid_last_input_never_commits_the_previous_valid_plan`、`read_only_documents_report_unavailable_targets_and_trap`、`sixteen_bit_documents_stay_out_of_scope_and_do_not_get_silently_downgraded` | 通过：预览不改状态、过期计划拒绝、非法参数不提交旧候选、只读目标全部不可用、16 位整体拒绝且不降位深 |
| 无变化 | `identical_edits_add_no_history_and_keep_the_document_clean` | 通过：同一颜色表/同一组油墨 `committed=false`，修订与历史不变 |
| 目标可用性一致性 | `advertised_targets_match_what_the_kernel_actually_accepts`、WASM 冒烟「advertised targets」 | 通过：5 模式 × 5 目标共 25 组逐项一致 |
| 导出矩阵 | `maps export targets to modes that can express them`、WASM 冒烟「export matrix matches the real encoders」 | 通过：PNG 五种模式颜色类型正确；PSD 只对 RGB 可用 |
| **跨域命令门** | `tests_gate.rs` 11 项、`mode-data.test.ts` 2 项、`panels.test.tsx`、WASM 冒烟门禁步骤 | 通过：索引色/位图拒绝写颜色命令、像素零变化、四条入口都覆盖；灰度/双色调/范围外模型不受影响；掩版与选区不被误挡；`image.mode.*` 本身不被挡（否则文档会被锁死）；界面矩阵与内核判据逐项一致 |
| **内容身份（共享折叠）** | `modes_identity_tests.rs` 8 项、`content-modes.test.ts` 6 项、WASM 冒烟身份步骤 | 通过：缺省 RGB/8 位不产生行（旧指纹不变）、显式 `null` 等价于省略、转换/改表/改油墨/转双色调都改 hash、CMYK/Lab 仍有指纹（回归）、跨语言逐字节一致 |
| **能力与命令发布** | `tests_contribution.rs` 5 项（本轮才真正被编译运行，见下）、`publish.test.ts` 4 项、真实握手 | 通过：3 能力 + 6 命令进 P7，协议/契约/基线三处一致，握手 74 项末尾为三个模式 id |
| **菜单入口** | `registration.test.ts` 2 项、`boundary.test.ts` 3 项、`boundaries.test.ts` | 通过：section 12→13，`modes` 有入口且发布后事实一致 |
| **原生核验接入** | `modes_pipeline.rs` 3 项（走公开 `verify` 入口）、`project-roundtrip.mjs` 7 步 | 通过：模式数据不合法的容器被拒绝，合法工程（含 CMYK/Lab/U16）被接受 |
| TS 解码与矩阵 | `mode-data.test.ts` 8 项 | 通过：非法信息/计划/报告拒绝、解码前长度预算、报告与模式信息里进 DOM 的文本全部有界、工具/导出矩阵、与 `gate-fixtures.json` 逐项一致 |
| 工作区门禁 | `workspace.test.ts` 13 项 | 通过：基线不等于当前修订即 `stale`、同修订号但不同内容指纹即 `stale`、迟到计划（代际前进）即 `stale`、跨宿主文档（另一 `documentId`）即 `stale`、保存/冻结阶段 `frozen`、草稿门禁、无变化不提交 |
| 真实控制器门禁 | `modes-workspace-gate.test.ts` 7 项 | 通过：重开同一份内容（修订与指纹都相同）后旧计划被拒且**内核未被调用**；同修订不同内容被拒；冻结窗口内 plan/apply 均 `frozen`；草稿中的转换被拒；草稿中保存被拒并回报草稿原因；冻结产物结算后恢复可写 |
| 宿主回归（任务 3.3） | `document-session.test.ts` 17 项、`editor-workspace.test.ts` 26 项 | 通过：宿主导入的 `documentId`/`documentGeneration()` 让上一会话的计划失效；草稿期间切标签/关闭/打开新文档/重开已开节点都由会话本身拒绝且活动项不变；保存中拒绝切换与关闭且不释放控制器；重开同一节点得到新代际与新控制器实例 |
| 父子回写门禁 | `editor-workspace-tools.test.ts` 25 项 | 通过：父文档保存中拒绝回写（保留子文档）；子文档有草稿时拒绝用它的工程回写；子文档使用独立归属 id `…​#smart-child` |
| 运行时协商 | `wasm-handle.test.ts` 3 项 | 通过：加载旧内核返回 `runtime-unsupported` 与逐项缺失导出，而不是 `TypeError` |
| 面板接线 | `panels.test.tsx` 22 项 | 通过：只读信息渲染、位图位深说明、预览→确认、改参数即作废预览、被阻止目标可选中并给原因、灰度默认目标纠正、色块与预设、已有油墨不被覆盖、切预设清透明索引、切文档丢弃旧预览、**文档代际变化即丢弃旧预览且确认重新禁用**、导出矩阵提示、**工具矩阵陈述「内核会拒绝」且不再有「尚未接通/建议保持关闭」**、范围外模型不判定、无变化禁用确认、清空透明索引不变 0、曲线 ≤1 点清空/加点补 2 点、失败无残留预览、**预览后只点色块不作废预览（真改颜色才作废）** |
| 入口边界 | `boundary.test.ts`、`boundaries.test.ts`、`tests_contribution.rs` | 通过：TS 不导入兄弟域或 `integrations/`，Rust 只引用 `crate::features::modes` |

### 复核发现：一组发布断言此前从未被编译

`rust/crates/editor-core/src/features/modes/tests_contribution.rs` 写好了 5 条发布断言，但
**`features/modes/mod.rs` 里缺 `#[path = "tests_contribution.rs"] mod tests_contribution;`**，文件从未参与编译。
于是「能力/命令清单与协议域逐项一致」「命令必须真在上游注册表」「陷印仍关闭」这三类约束实际没有任何自动保护——
之前本文件引用的「`tests_contribution.rs` 5 项」是错的，本轮已改正。

补上模块声明后立刻暴露第二个问题：该测试拿 **按发布顺序声明** 的 `COMMANDS` 与 **已排序** 的列表逐位比较，
断言必然失败（`image.mode.rgb…` vs `image.mode.bitmap…`）。已改为比较排序后的内容；文件内 `photocraft_embed_editor::…`
的绝对路径也改为 `crate::…`（crate 内部的测试模块不该依赖自身 crate 名）。5 条现在真实运行并通过。

本域 Rust 用例因此从 43 增到 **49**（19 转换/计划/矩阵 + 6 内容身份 + 8 共享折叠 + 11 跨域门禁 + 5 发布断言），
全工作区从 331 增到 **337**。

## 任务 3.3：来源失效不误写目标

归属判据从「修订 + 内容指纹」升级为**三层：文档代际 → 修订 → 内容指纹**。代际不能省：关闭后重开同一节点可能又是修订 1、内容指纹逐字节相同，前两层都认不出「这是已经销毁的会话里算出来的计划」。

- 宿主端口：控制器新增 `documentId` 与 `documentGeneration()`（`integrations/woohaa` 传入注册表条目 id 与其 `generation`）；控制器在每次成功载入文档（`openImage`/`openProject`/`openPsd`）时自增自己的载入代际。
- 计划盖章：`features/modes/workspace.ts` 的 `own()` 给计划加 `owner{documentId,generation}`；plan/apply 四个入口在调用内核前先比代际，再比修订，再比 `contentHash()`。缺失 `owner` 的旧计划（只有测试会构造）不做代际拦截。
- 请求序号：本域的计划与应用都是**同步**调用内核（没有在途请求可被后到的响应调换顺序），因此不需要额外发号；唯一可能的「迟到」是面板里还留着一份旧计划，而它由代际判据挡住。异步回执（保存/上传）用宿主的 `requestId` 与文档代际，本轮未改动其语义。
- 保存/冻结门禁：`WorkspaceFeatureContext` 新增 `saving`（`isSaving()`：保存 Promise、待确认的冻结产物、`freezing`/`saving` 阶段）。此前模式 plan/apply 绕过了控制器 `dispatch` 的 frozen 检查，能在「已冻结的修订」上继续写，属真实漏洞，现已返回 `frozen`。只读 `modeInfo` 不受影响。
- 宿主门禁：`EditorWorkspaceController.pendingDraftFailure()` 把内部 `blockingDraft()` 作为唯一权威暴露；`pendingDraftOf` 不再自己列一遍草稿种类（旧写法漏掉滤镜/构图/修饰笔迹/笔迹/选区修改与保存阶段）。`DocumentWorkspaceSession.activate` 在每次切换前重算（草稿结算后不留过期拒绝），`close` 同样拒绝；`openNode`/`openFile` 也会先过同一道门禁——「打开新文档」「重开已打开的节点」都会切走活动文档，不能从这条路径绕过去。三者都不依赖 UI 先拦一次，也不依赖状态回调的发布时机。独立 dev 宿主（`dev/src/dev-workspace.ts`）原只看 `hasActiveDraft()`，保存窗口里能切走，现也改用同一判据。注册表的共享 `gate` 只允许**活动**文档写入：后台文档保存结束时改这个位会留下无人清理的拒绝，之后所有切换都会被永久挡住。
- 父子回写：`updateSmartParent` 要求父文档无草稿且不在保存；`updateSmartParentFromChild` 额外要求子文档自己先结算；子文档控制器用独立归属 id（`…​#smart-child`）。
- 面板：`documentOwner()` 的 `documentId#generation` 进入文档键，代际变化即丢弃上一份预览并重新禁用「确认」。

### PSD 兼容矩阵：一处措辞已不准确（归属在 io 域，未越界改动）

`rust/crates/editor-core/src/features/io/psd.rs` 的 `color.cmyk-lab` 行 note 仍是
「CMYK/Lab/索引/灰度文档不在本次范围」。本 change 之后**灰度/位图/索引色/双色调都是真实可编辑模式**，
这句话对项目整体已经不成立——准确的说法是「PSD 的这几种色彩模式导入导出都不支持；编辑器内的这些模式用
`.pcraft` 保存、用 PNG 导出」。行为本身是对的（PSD 预检 `document.mode != Rgb || depth != U8` 就直接拒绝，
面板也据此对四种模式显示 PSD 关闭），只是 note 的措辞过时。该文件属 `features/io/`，不在本 change 的
写入归属内，为避免与 io 域的 worktree 冲突未改，留给其 owner 一并订正。

## 未完成项与真实原因

| 项目 | 状态 | 真实原因 |
| --- | --- | --- |
| 真实 UI 走查（1440×1000 桌面 / 1024×768 Pad） | **待人工验证** | 本机为无显示会话的 Linux 容器，无浏览器/截图能力。面板与接线有 22 项组件回归，但真实布局、拖拽与菜单层级走查必须在有显示环境人工完成，不用组件测试冒充。 |
| 通道域联合验收（索引色/双色调全链路） | **待同级完成** | `2026-10-22-add-photocraft-channel-workflows` 的规范通道端口未在共享代码落地（`packages/editor/src/features/channels/` 仍未注册入口与内容贡献）；本域的门禁判据（`gate-fixtures.json`）与内核已就绪，联合矩阵等该 change 合入后执行。 |
| Photoshop 双色调/索引往返 | **待外部应用** | 无 Photoshop 可用。共享 PSD 导出目前只支持 RGB/U8（灰度/位图/索引色/双色调都在预检阶段被拒绝），面板已明确关闭并给出真实原因。 |
| `cargo clippy --all-targets` 全局绿灯 | **待他人域修复** | 本域与 `editor-core` 已 0 error；整条命令失败在 `project-verify/src/features/smart/smart_source/tests.rs` 的 18 处 `unwrap()`，该文件不在本 change 归属内，未顺手改动以免与其他 worktree 冲突。 |
| `integrations/woohaa` 全量套件的既有 flake | **既有问题，与本 change 无关** | `tests/transform-interaction.test.tsx` 的 `context-menu` 两组用例在**全量并行**跑时偶发 `TypeError: Cannot read properties of undefined (reading 'click')`（菜单项还没挂上就点）。实测本工作树 20 轮 3 次失败，用干净 `HEAD` worktree（同机、同安装布局）跑 18 轮也是 3 次，频率一致；该测试文件本 change 未修改。单文件跑 20 轮 0 失败。判定为既有并行时序脆弱，未在本 change 内改动。 |
| 数位笔/GPU | **不适用** | 本 change 不涉及笔迹手感与渲染效果，未采集也未声称。 |

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。

当前实现**未提交**（工作树改动，`HEAD` 为 detached `b0cd6cbc`），因此「实现提交」一栏留空；上表已按子能力给出实际结果与证据命令。LUT、ICC/CMYK/Lab/HDR、16/32 位与真正 RAW 解码不进入本次范围；陷印需要 CMYK，入口保持关闭并给出原因。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
