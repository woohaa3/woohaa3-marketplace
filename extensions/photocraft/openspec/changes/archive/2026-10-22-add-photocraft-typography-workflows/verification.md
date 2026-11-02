# 验收计划与记录

## 状态

本 change 的**域内实现与内容身份/核验接入均已完成**，自动化检查全部通过；**真实设备/渲染画面
验收未采集**，原因见「未采集项」。实施在 `b61da631`（feature-boundary 重构）之上、`b0cd6cbc`（规划提交）之后，
**尚未提交**，所以下表「实现提交」一律写「工作区未提交」。

链路逐项矩阵见 [matrix.md](matrix.md)。实现落在本域目录：
`packages/editor/src/features/type/`、`packages/protocol/src/features/type/`、
`rust/crates/editor-core/src/features/type/`、`rust/crates/project-verify/src/features/type/`、
`tests/features/type/` 与本 change 目录。

任务 3.2 另有三个**共享文件接入点**（用户已授权，实现全部在本域目录内，共享文件只做接入）：

| 共享文件 | 接入内容 |
| --- | --- |
| `rust/crates/editor-core/src/document_content.rs` | 文字分支改为 `type_content::attach_typography(&mut summary, text)`；文档级追加 `text_styles_digest` 写入 `textStyles`（与 `patternContentHash` 同形） |
| `rust/crates/editor-core/src/identity.rs` | `canonicalize_text` 在既有「可选后缀」约定后追加本域键的校验与拼接；`canonicalize` 放行文档级 `textStyles` 行；新增 `canonicalize_runs` 校验逐 run 摘要结构 |
| `rust/crates/project-verify/src/lib.rs` | `inspect_layers` 之后加一行 `features::r#type::inspect_document(&document)?` |
| `tests/fixtures/contract.json` | 新增 `contentHashes.typographyContent/Canonical/Hash` 与 `typographyRunsContent/Canonical/Hash`；**原有基线项一项未动** |
| `packages/protocol/src/contract-fixture.test.ts` | 加两条排版基线的复现断言（其余用例未动） |
| `packages/protocol/src/features/shared/content.ts` | `ImageProjectContent.textStyles` 字段声明与 `textStyles:` 行的格式校验 |
| `rust/crates/editor-core/tests/contract_fixture.rs` | 加两条同名复现断言（其余用例未动） |

`feature-boundary-delta.mjs` 把这两份可读共享文件的**新摘要固定下来**：已授权改动之外
（顺序、空白、别的键）的任何漂移仍然判失败。

## 环境探测（2026-10-23 重测）

```
uname -a                        → Linux zombieyang-... 5.4.241-1-tlinux4-0023.4 #1 SMP ... x86_64
ls /dev/dri | grep '^renderD'   → 无输出（目录不存在或为空）
DISPLAY / WAYLAND_DISPLAY       → 均未设置
```

按仓库规则（Linux 用 `renderD*` 判断真实 GPU；macOS 才用 `system_profiler SPDisplaysDataType`），
本机**既无 GPU 设备节点、也没有显示会话**。因此不采集真实合成帧率、GPU 计时、应用内截图与设备
走查；这些不会用软件渲染或估算替代。

## 非渲染检查（实际执行）

| 检查 | 命令 | 实际结果 |
| --- | --- | --- |
| 子项目 build + typecheck + test | `pnpm -C photocraft run check` | 通过：protocol 72、project-verifier 40、editor 308（44 文件）、dev typecheck |
| Rust 全量非渲染回归 | `pnpm -C photocraft run rust:test` | 通过：12 个测试二进制合计 326 passed / 0 failed |
| 本域 Rust 单测 | `cargo test -p photocraft-embed-editor --lib -- editor::text::type_domain` | 24 passed |
| 本域参数校验单测 | `cargo test -p photocraft-embed-editor --lib -- features::r#type` | 9 passed |
| 本域核验器单测 | `cargo test -p photocraft-project-verify --lib -- features::r#type` | 8 passed |
| 真实 WASM 构建 | `pnpm -C photocraft run wasm` | 通过：`wasm-release` 17.41 MiB，glue 92.6 KiB |
| 原生核验工具 | `pnpm -C photocraft run verifier` | 通过：`photocraft-project-verify` 3.84 MiB |
| 真实 WASM 主线冒烟 | `node photocraft/tests/features/type/typecraft-smoke.mjs` | 通过（含撤销、锁定拒绝与工程重开，见下） |
| PSD 排版字段往返 | `node photocraft/tests/features/type/typography-psd-matrix.mjs` | 通过：行距/字距/基线/OpenType(`frac`)/抗锯齿/`Warp` 样式与弯曲值经 PSD 导出再导入后**原样读回**；导出预检 `blocking:0`、导出报告 `rasterized:false`、`lossy:[]` |
| 旧工程兼容实测 | `node photocraft/tests/features/type/typography-project-compat.mjs` | 通过：删掉本域新增持久字段（`warp`/`antialias`/`features`/`text_styles`）的工程仍能打开、保留文字与正文与原字号、内容身份回到旧值、仍可查询；再去掉字段后继续写 warp 并导出重开，`warp.value/style` 与正文原样回来 |
| 跨域保存/核验实测 | `node photocraft/tests/features/type/typography-cross-domain.mjs` | 通过：Group/Adjustment/Shape/Type/Pixel 在同一工程共存，本域排版写入与兄弟域写入交错执行后互不覆盖；导出字节交给**真实核验器二进制**（stdin）核验 `ok:true`，`layerCount`/画布与内核一致、`objectKinds` 含 `text`/`shape`/`adjustment`/`group`/`raster`；重开后正文/行距/Warp/OpenType 一致且身份可复算 |
| 重构基线增量核对 | `node photocraft/tests/features/type/feature-boundary-delta.mjs` | 通过：共享文件除 3.2 授权的两处外未漂移；构建/能力/8 组状态与 hash/撤销重做取消/拒绝错误/PNG 与基线全等；命令白名单仅 `+48`（185 → 233） |
| 重构基线全等脚本 | `pnpm -C photocraft run features:check` | **失败（预期）**：脚本先做共享文件摘要全等，首个失败项是 `tests/fixtures/contract.json drifted`（本 change 授权新增排版基线）；之后还会因命令白名单 `+48` 失败。基线快照是共享冻结文件，需集成负责人更新。所有差异已由下面的增量脚本逐项拆开核对：除这两处授权改动外仍全等 |
| Woohaa 适配回归 | `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过：34 文件 / 275 用例（本轮全量首跑即全绿；此前的并行运行中 `tests/transform-interaction.test.tsx` 有一条 context-menu 用例偶发失败，该文件单跑 3 次与全量重跑均通过，判定为既有时间敏感用例，与本 change 无关） |
| Woohaa 适配类型 | `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| 宿主前端类型 | `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| 开源／闭源目录边界 | `pnpm boundary:check` | 通过（6 用例） |
| 代码地图 | `pnpm codemap:check` | 通过（47 manifest、11 篇文档、1353 链接） |
| 跨语言身份基线 | `pnpm -C photocraft --filter @woohaa3/photocraft-protocol run test` / `cargo test -p photocraft-embed-editor --test contract_fixture` | 通过：TS 72 例、Rust 6 例；两侧对同一 `typographyContent` 复现 `typographyHash = ba1942c579c84d17`，并对逐 run/字符属性/样式表基线复现 `typographyRunsHash = feeff5a32fa15bcc` |
| OpenSpec 结构 | `openspec validate 2026-10-22-add-photocraft-typography-workflows --strict --no-interactive` | valid |

新增域内回归（本 change 添加）：

- TS：`features/type/type-workflows.test.ts` 11 例（界面命令清单 ↔ 内核两张白名单双向一致、
  只读标记、排除项、OpenType 十特性、参数构造器边界、段落键、
  **清单里每条命令都有真实界面入口**）、
  `features/type/type-panels.test.tsx` 8 例（单 section 渲染五个面板、查询在渲染期后取回、
  按钮发出的命令与参数、只读/非文字层禁用、查询失败显示原因、**图层全部锁定时禁用写入仍允许查询**、
  **样式库复制/选项入口与参数**、**替换当前与字体列表入口**、**锁定时字体替换禁用而只读动作可用**、
  **行距留空表示自动行距且不把 0pt 当输入**）、
  `features/type/type-identity.test.ts` 12 例（排版字段进入 TS 内容身份、显式默认值不改旧指纹、
  **31 个排版/字符字段各自单独改变指纹且互不撞值**、越界值返回 null 而不是折叠、摘要文本逐字含四字段、
  TS 与本域 `features/type/content.rs` + `identity.rs` 覆盖同一组字段、
  **逐 run 摘要 `charRuns`/`paragraphRuns` 也在三段链路上**、**逐 run 字段名两侧同集合**）、
  `features/type/type-session.test.ts` 5 例（草稿门禁、失败不发布、查询不经门禁、无内核未就绪）、
  `features/type/wasm-handle.test.ts` 3 例（旧内核缺入口报明确原因、参数 JSON 转发、拒绝保持失败形态）。
- Rust：`features/type/params.rs` 9 例（白名单/排除项、读写分工、warp 边界、查找替换、拼写、
  蒙版、样式、缺字体）、`features/type/domain.rs` 24 例（关闭命令仍关闭、查询不动身份/历史、
  逐项一步历史与撤销、双态命令 `changed` 按动作判断、转换/栅格化、工作路径/蒙版、
  查找替换、**逐处替换只改一处且 `changed` 由指纹决定**、拼写、缺字体、非法参数不改文档、
  文字草稿门禁、整层排版在身份内、
  **范围级排版（`range` 落在首 run 之后）改变身份且改回默认后复原**（字距/行距/基线/**伪粗体/伪斜体**）、
  **文档级样式表内容改变身份且清空后回到基线**、
  **图层全部锁定拒绝写入**、锁定不影响只读与样式表管理、
  **缺字体替换按全文档范围拒绝锁定层**、
  **面板实际入口 `applyTypography` 也拒绝锁定层且不误伤未锁定层**、
  **每个持久排版/字符属性字段各自改变内容身份并可一步撤销**（含整层下划线/斜体/缩放/字重/大小写/
  连字/语言/可变轴与范围级字号/颜色/字体）、**应用字符样式改变身份**、默认排版不写任何排版键）、
  `project-verify/src/features/type/mod.rs` 8 例（含**样式表超预算拒绝**与**真实工程字节经公开
  `verify` 入口拒绝悬空样式引用**——后者在把 `lib.rs` 钩子注释掉后立即失败，证明钩子真的接通）。
- 跨语言 fixture：`tests/fixtures/contract.json` 新增 `contentHashes.typographyContent/
  typographyCanonical/typographyHash`（首 run 平铺字段）与
  `typographyRunsContent/typographyRunsCanonical/typographyRunsHash`（逐 run + 字符属性 +
  文档级 `textStyles`），
  由 `packages/protocol/src/contract-fixture.test.ts` 与
  `rust/crates/editor-core/tests/contract_fixture.rs` 分别独立复现（两侧任一漏写字段即失败）。
  逐 run 基线的输入故意把 `tracking` 写在 `leading` 之前，要求两侧都按字段名排序后再拼接。
- 真实 WASM 脚本：`tests/features/type/typecraft-smoke.mjs`（主线）、
  `tests/features/type/typography-project-compat.mjs`（旧工程兼容与身份回落）、
  `tests/features/type/typography-psd-matrix.mjs`（PSD 排版字段往返）、
  `tests/features/type/typography-cross-domain.mjs`（跨域共存 + 真实核验器 + 重开）、
  `tests/features/type/feature-boundary-delta.mjs`（基线增量）。
- 命令清单单一来源：`tests/features/type/type-commands.json`（与 `params.rs` 两张白名单一致）
  同时被增量脚本（核对内核白名单只新增这些 id）和主线冒烟（核对每条命令都在真实调用记录里出现过）
  读取；冒烟脚本包裹 `execute`/`typeCommand`/`typeQuery` 记录实际执行的 id，因此
  「48 个命令全部在真实内核上执行过」是被断言出来的，而不是看清单得出的结论。
  反向验证两条：①往清单里加一条不存在的命令 → 覆盖断言与白名单断言同时失败；
  ②删掉抗锯齿那条循环 → 覆盖断言立刻报出 `sharp`/`strong`/`smooth`/`windows`/`windowsLcd`
  五个「登记了但没跑」的 id。本轮正是靠它发现原先只有 `fractions` 一个 OpenType 特性被真正执行过，
  其余 9 个只登记在清单里；现在 10 个特性各自在全新编辑器上做「切换 → 回读 → 指纹变化 →
  重复写入 `changed:false` → 切回默认 → 身份复原」。

## 主线实测（真实 WASM，`typecraft-smoke.mjs`）

400×200 文档、Inter 32pt 文字层，全部断言通过：

| 步骤 | 断言 |
| --- | --- |
| 只读查询 | `type.info`/`type.fonts`/两个样式 `list`/`edit.checkSpelling(list)`/`type.resolveMissingFonts` 均返回对象，内容身份不变 |
| 指定字符对 + 段落 | `type.setStyle` 的 `kernPair` 与 `justifyAll`+缩进+段距+自动行距返回 `runs` |
| OpenType | `type.openType.fractions` 等 10 个特性逐个执行；工程重开后 `features[]` 仍在 |
| 样式库 | 新建字符/段落样式 → 列表可见 → 应用成功；**复制**出新 id 且列表多一条「标题 copy」；**样式选项** `set{size}`/`set{spaceBefore}` 写回后 `list` 的 `resolved` 回读生效；工程重开保留样式表与引用 |
| 字体族 | `type.fonts` 返回已安装字族（含 `Inter`） |
| 点/段落转换 | 两个方向都成功 |
| 抗锯齿 | 7 种命令都成功且逐个回读一致；`none` 改变真实 PNG 字节，撤销恢复原像素；其余模式写入模型但上游合成共用覆盖率路径（如实记录，不宣称 7 种外观各不相同） |
| Warp | `arc` 改变 PNG 字节，撤销恢复；`none` 可取消变形；工程重开保留 warp 字段 |
| 转路径/形状/栅格化 | 工作路径返回 >0 子路径且不建层；转形状/栅格化的 `changed: true`，各一步历史，撤销恢复 `Type` 层 |
| 文字蒙版 | `type.createSelection` 返回 `selected: true`、`changed: false`，`hasSelection` 为真，层数不变 |
| 查找替换 | 纯查找零历史；`changeAll` 只改匹配文本，`changed: true`；`change`（界面「替换当前」）需先建立查找光标，只替换当前那一处并返回 `changed:{layer,start,end}`，剩余匹配保留；撤销恢复原文 |
| 拼写 | 内置英文词典列出 `teh`；`changeAll` 一步修正 |
| 缺字体 | 列出 `Missing Family` → 映射替换后原文保留、不再缺失；`replaceAllMissingFonts` 真实改字族 |
| 排除/非法 | 7 个排除 id 全部拒绝；非法 warp 样式、无目标蒙版、缺 `find`、缺样式名均拒绝且不改身份/状态 |
| 草稿门禁 | 文字草稿打开时写命令与查询都拒绝 |
| 图层全部锁定 | 9 个写命令（抗锯齿/OpenType/变形/转形状/栅格化/删层蒙版/带 apply 的样式/**缺字体全部替换**/**带 map 的缺字体映射**）＋面板实际入口 `applyTypography` 的 4 种排版参数全部拒绝，`contentHash` 与 `stateJson` 不变；`type.info`、样式表新建/重命名与**列出缺字体**仍可用 |
| 排版内容身份 | 10 个持久排版字段（段落段前距/首行缩进/自动行距、手工字偶距、行距/字距、基线偏移、OpenType、抗锯齿、Warp）各自单独改动都改变指纹，且都能一步撤销回原值；反向验证把 10 条断言全部反转后有 10 项同时失败 |
| 范围级、字符属性与样式表身份 | 真实 WASM 补测：`range` 的 `tracking`/`leading`/`baselineShift`/`size`/`color` 改中间字符也改变指纹（改回默认后复原）；整层 `underline`/`horizontalScale`/`weight`/`caps`/`variations` 同样改变指纹；新建/改属性/重命名/应用样式都报 `changed: true`。反向验证：摘掉 `charRuns` 写入后 3 项范围断言同时失败；去掉文档级 `textStyles` 接入后 4 项样式表断言同时失败；去掉整层 `underline` 写入后该断言立即失败 |
| 样式库全动作 | 48 个命令全部在真实内核执行：字符样式 apply/redefine/clearOverride/delete、段落样式 rename/duplicate/apply/redefine/clearOverride/delete 逐个断言可见效果（删除后不在列表、重命名后回读一致、复制得到新 id）；10 个 OpenType 与 7 种抗锯齿同样逐个执行。覆盖不是看清单得出的：冒烟脚本记录真实调用 id 并与 `type-commands.json` 对账 |
| 工程往返 | 导出后重开得到 16 位内容身份，文字层与排版可查询 |

## 内容身份与核验的接入结果（任务 3.2）

### 内核侧：排版进入内容身份

结构上分三层，各管一件事：

| 位置 | 职责 |
| --- | --- |
| `features/type/content.rs::attach_typography`（本域） | 从文档取值、折叠默认值，写进文字层摘要对象 |
| `identity.rs::canonicalize_text`（共享，已授权接入） | 按既有「可选后缀」约定校验范围并拼进规范文本 |
| `document_content.rs` 文字分支（共享，已授权接入） | 调用上面那个本域函数，不再内联摘要 |

覆盖的字段：

- **逐字符 run**（每个 run 一段 `len[=字段:值,…]`，`;` 连接，多 run 时写入 `charRuns`）：
  `leading`、`tracking`、`baselineShift`、`kerning`、`kern`（手工字偶距）、
  OpenType `features`（按 tag 排序后写入，同一组开关不因顺序换指纹）、
  字符样式引用 `charStyle`，以及**与层不同的**字体族/字号/颜色（`family`/`size`/`color`）、
  字重、斜体、伪粗体/伪斜体、上下标之外的字符属性（下划线、删除线、两向缩放、大小写、连字、语言、可变轴）。
- **逐段落 run**（写入 `paragraphRuns`）：对齐、四向缩进、段前/段后距、自动行距、方向、连字符、
  段落样式引用。
- 单 run 的层另有**平铺字段**（`leading`/`tracking`/`baselineShift`/`kerning`/`kern`/`features`、
  `charStyleSheet`、字符属性与段落平铺键），保持上游 P7 既有形状，宿主类型不需要为「只有一个 run」
  支付数组成本。
- **层级**：`warp`（样式/弯曲/两向失真/方向）、`antialias`。
- **文档级**：`textStyles`（字符/段落样式表的定义与顺序，16 位摘要；与 `patternContentHash` 同形）。

**默认值一律折叠不写**，所以从未碰过排版的旧工程得到的规范文本与加这个功能之前逐字节相同
（`typography-project-compat.mjs` 用真实工程复核；空样式表不写 `textStyles` 亦有单测）。

**为什么从「首 run」改成「逐 run」**：只摘要首 run 时，`type.setStyle` 带 `range` 的写入
（只改中间几个字符）既不换指纹也不判脏——用户改完关窗口不会被提示保存。这是实测发现的真实缺陷，
现已由逐 run 摘要覆盖：范围级 `tracking`/`leading`/`baselineShift` 都改变身份，改回默认值后身份复原
（`range_scoped_typography_changes_the_content_identity`，反向验证：摘掉 `charRuns` 写入后该用例立即失败）。

**为什么样式表也要进身份**：`type.characterStyle.set` / `redefine` 改的是样式表本身，引用它的文字层
看起来毫无变化；不摘要样式表就会「改了样式但界面不脏」（`document_style_tables_are_part_of_the_content_identity`，
反向验证：注释掉文档级接入后立即失败）。

**为什么整层字符属性也要进身份**：`type.setStyle` 除排版参数外还能写 `underline`/`strikethrough`/
`italic`/`fauxBold`/`fauxItalic`/`weight`/`horizontalScale`/`verticalScale`/`caps`/`ligatures`/
`discretionaryLigatures`/`language`/`variations`，以及带 `range` 的 `size`/`color`/`font`。
实测修复前这些写入**全部不改变指纹**（`range` 改字号/颜色会重排却不判脏，整层加下划线也不判脏）。
现在整层写入走平铺键、范围写入走逐 run 摘要；`every_persisted_typography_field_changes_the_content_identity`
逐项覆盖并有反向验证（去掉下划线的平铺写入后该组断言立即失败）。

**伪粗体/伪斜体补进逐 run 摘要（本轮修复）**：这两个字段原先只在**平铺键**里，所以整层写入能判脏、
**范围级写入不能**——`type.setStyle` 的 `range` 给中间几个字符加伪粗体时，上游按 `embolden`/`skew`
真的改变了字形（实测 PNG 字节变化），指纹却完全不动。现在 `charRuns` 也写 `fauxBold`/`fauxItalic`，
`range_scoped_typography_changes_the_content_identity` 与冒烟脚本的「范围伪粗体/范围伪斜体」两条
断言都覆盖了它；反向验证：摘掉 `char_parts` 里的这两个分支后 3 条断言同时失败（Rust 单测 + 两条冒烟）。
跨语言基线也随之更新为 `typographyRunsHash = feeff5a32fa15bcc`（输入仍是乱序，要求两侧按字段名排序）。

**应用字符样式为什么算内容**：`type.characterStyle.apply` 会把样式的**解析值**写进 run（例如下划线），
run 自己的字号/颜色可能完全不变。实测修复前该命令返回 `changed: false` 而 `underline` 已变成 `true`。
现在 run 的 `style_sheet` 引用进摘要（`applying_a_character_style_changes_the_content_identity`）。

实测（`typecraft-smoke.mjs`，真实 WASM）：10 个字段各自单独改动都改变指纹，且都一步撤销回原值。
反向验证：把这 10 条断言全部反转后有 10 项同时失败，说明它们不是空转。

### 两侧一致性：跨语言 fixture

`tests/fixtures/contract.json` 有两份排版基线：

1. `contentHashes.typographyContent` 与它的规范文本、指纹
   （`typographyCanonical` / `typographyHash = ba1942c579c84d17`）——首 run 平铺字段；
2. `typographyRunsContent` 与 `typographyRunsCanonical` / `typographyRunsHash = feeff5a32fa15bcc`
   ——逐 run 摘要（`charRuns`/`paragraphRuns`）+ 字符属性（`charStyleSheet`/`caps`/`language`/
   `fontVariations`）+ 文档级 `textStyles`；输入故意把 `tracking`/`fauxBold`/`fauxItalic` 写在
   `leading` 之前，要求两侧都按字段名排序后再拼接。

TS（`contract-fixture.test.ts`）与 Rust（`contract_fixture.rs`）**各自独立复现**这两组值；任一
侧少写一个字段、少折叠一个默认值、少排序一次、或校验范围不同，对应测试立刻失败。宿主与内核因此
不会对「这份工程有没有净变化」得出相反结论。

### 核验器：文档级钩子已接通

`project-verify/src/lib.rs` 的 `inspect_layers` 之后接了一行
`features::r#type::inspect_document(&document)?`。样式表挂在 `Document` 上、逐层 `inspect`
拿不到，所以悬空引用与样式表预算只能在文档级检查：

- 字符/段落样式 id 非零、不重复、有上限（`MAX_STYLE_ID` / 每表 `MAX_STYLES = 256`）；
- 名称非空、≤200 字符、不含 `\0`；
- 每个 run 引用的 `style_sheet` 必须真实存在。

证据是端到端的那条：真实 `.pcraft` 字节经公开 `verify` 入口，合法引用通过、删掉样式后同一份
工程被拒（`VerifyErrorCode::UnsupportedObject`，消息含「不存在的字符样式」）。把 `lib.rs` 那行
钩子注释掉后该用例立即失败——它区分得了「函数写对了」和「真的被调用」。

## 已知缺口

1. **`features:check` 快照断言仍会失败（预期）**。有两处，都属共享冻结范围：
   - `notes/feature-boundary-baseline.json` 的共享文件摘要：`tests/fixtures/contract.json` 与
     `identity.rs` 是本 change 任务 3.2 授权的新摘要（脚本先报 `contract.json drifted`）；
   - `notes/feature-boundary-wasm-baseline.json` 的命令白名单：本 change 有意新增 48 个命令。

   两个快照都不能由本域改。替代证据是 `tests/features/type/feature-boundary-delta.mjs`：它逐项
   证明「除白名单 +48 与两处授权摘要外全部全等、无移除」，其余任何漂移仍判失败。
2. **面板通过域会话取值**。`EditorHandle` 与 `EditorWorkspaceController` 的既有方法清单是冻结
   facade，本域新增入口只经 `controller.features.type.*` / `handle.features.type.*`。
   `typeCommand`/`typeQuery` 在 `FeatureEditorInstance` 上是**可选**的：能力握手无法区分
   「旧 WASM 没有入口」和「新 WASM 有」，缺省时回报「当前内核未提供文字域入口」，不抛 `TypeError`。
3. **上游排版命令不查图层锁定（本域已补）**。`with_text_targets`（抗锯齿/OpenType/变形/样式）、
   `type_mask_cmds::create_selection` 与 `type_extra_cmds::replace_fonts` 都不检查 `effective_locks`，
   所以「全部锁定」的文字层原本仍会被抗锯齿/OpenType/Warp 改写、被 `convertToShape`/`rasterizeTypeLayer`
   转成形状/像素，也会被缺字体替换改掉字体。实测（锁定后逐命令）：`type.warpText`、`type.antiAlias.*`、
   `type.openType.*`、`type.convertToShape`、`type.rasterizeTypeLayer`、带 `removeLayer` 的
   `type.createSelection`、带 `apply` 的 `*.new`、`type.replaceAllMissingFonts`、带 `map` 的
   `type.resolveMissingFonts` 全部 `ALLOWED`，其中转换类与字体替换还改了内容指纹。
   本域在 `domain.rs::refuse_locked_text_target` 按 Photoshop 语义补齐拒绝
   （消息「文字图层已全部锁定，请先解锁再修改文字」），界面也用 `activeLayer.effectiveLocks.all`
   禁用入口并显示原因。只读查询、样式表 `rename`/`delete`/`duplicate`、不带 `removeLayer` 的纯选区
   与不带 `apply` 的 `*.new` 不受影响。上游 `edit.findAndReplaceText`/`edit.checkSpelling` 自身已按
   `locks_at` 排除锁定层，因此锁定后报「the document has no type layers」——这是上游行为，未改。

   **同一缺口还有第二条入口（本轮补上）**：面板不走 `typeCommand`，而是走内核的
   `applyTypography`（`features/type/tools.rs`）。它自己调 `typography_patch` 校验参数后转给上游
   `type.setStyle`——参数校验是通的（`leading:1e9`、`vertical:true`、未知键都被拒），但**没有锁定
   判定**。实测修复前：对「全部锁定」文字层 `applyTypography({leading:44})` 返回成功、`leading`
   从默认变成 44、`contentHash` 改变，即规格里点名要拒的写入被放行。现按同一语义补齐（同一个
   错误文案），并加两条 Rust 回归（`apply_typography_refuses_a_fully_locked_type_layer`、
   `apply_typography_still_writes_an_unlocked_layer_next_to_a_locked_one`）与冒烟脚本里的真实内核
   断言；反向验证：删掉该判定后两条用例立刻失败。
   另注：P0 的 `type.setStyle` **共享命令本身**仍未做锁定检查（`editor.execute` 直调可绕过），
   与本域入口是两条路；它属 P0 共享面，留给集成负责人统一收口。
4. **协议位置调整**。命令清单与参数构造器落在
   `packages/editor/src/features/type/commands.ts` 而不是 `packages/protocol/src/features/type/`：
   协议包公共入口 `src/index.ts` 是冻结文件（值导出必须逐条列举），新增导出需要集成负责人改共享
   facade。`parallel-work.md` 虽把该目录记为本域，但按「共享 facade 单一写入」优先，本域没有
   私自增改协议公共入口。若集成侧同意，可将 `commands.ts` 原样移入协议包并从 `index.ts` 逐条
   导出，界面 import 从 `./commands.js` 改为包名即可（测试同步改一行）。
5. **P0 `type.setStyle` 的 `postscriptName` 不进内容身份（本轮实测确认，非本域可修）**。
   直接调 `editor.execute("type.setStyle", {postscriptName:"Inter-SemiBold"})` 会真的换字面：
   同一编辑器的 PNG 字节改变、`type.info` 的 `postscript_name` 从 `Inter-Regular` 变为
   `Inter-SemiBold`，但 `contentHash` 纹丝不动——用户改了字形却不会被提示保存。
   没有在本域补进身份，原因是**会破坏所有既有指纹**：`type.create` 给每个新文字层都写上
   `postscript_name: "Inter-Regular"`，把它无条件写进摘要会让「加这个功能之前」的工程全部改判为脏，
   违反本 change 的旧工程兼容要求（`typography-project-compat.mjs` 门禁）。正确做法是要么由 P0
   在写 `postscriptName` 时同步派生 `family`/`weight`/`italic`，要么给身份一个「只在 postscript 与
   家族/字重/斜体不一致时才写」的规则——两者都属 P0 共享面。
   可达性已核实：本域两条写入路径都写不出这个字段——`applyTypography` 的白名单
   （`TYPOGRAPHY_PARAMS`/`PARAGRAPH_PARAMS`）不含它；`type.characterStyle.new` 的 `attrs` 虽然收下
   `postscriptName`，但 `type.characterStyle.apply` 落回 run 后运行时字面仍是 `Inter-Regular`
   （实测 PNG 不变），只有 run 的 `style_sheet` 引用进了身份。也就是说本 change 的界面与命令
   都碰不到这个缺口，它留在 P0 共享命令上。

## 未采集项（待人工验证，含真实原因）

| 项 | 状态 | 真实原因 |
| --- | --- | --- |
| 电脑 1440×1000 与 Pad 1024×768 的分组/菜单/参数栏走查、应用内截图 | **待人工验证** | 本机 Linux 无 `renderD*` 设备节点、无 `DISPLAY`/`WAYLAND_DISPLAY`，没有显示会话，无法启动真实界面并截图 |
| 实际合成观感：七种抗锯齿是否肉眼可辨、Warp 手感、转形状边缘质量 | **待人工验证** | 同上；另需真实 GPU。已采集的替代证据是 PNG 字节变化与撤销恢复，只证明"变了/可逆"，不证明"好看" |
| 中文 IME 组合下的样式/查找替换/拼写交互 | **待人工验证** | 无显示会话，无法驱动 IME；域内只验证了"文字草稿打开时拒绝域命令"这条共享门禁 |
| 与 Woohaa 宿主的真实联合流程（打开节点 → 文字工具 → 保存回写） | **待人工验证** | 需要可运行的宿主前端与浏览器/桌面壳；本机只有无显示会话的 Linux，只能跑适配包的单测（275 例通过） |
| Pad 真实设备/触控目标 | **待人工验证** | 无设备 |
| 中文拼写检查 | 明确不在范围 | 上游只带英文词典（SCOWL size 50），不承诺也不模拟"全通过" |
| 竖排、沿路径排字 | 明确不在范围 | 能力门关闭，命令门拒绝 |

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
