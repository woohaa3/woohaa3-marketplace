# 逐项能力矩阵（U67 / U68 / U69）

审计依据固定在上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，实现基线
`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，域目录由
`2026-10-22-refactor-photocraft-feature-boundaries`（`b61da631`）建立。

链路五段含义：**上游命令 → 域包装/校验 → WASM 绑定 → UI 入口 → 内容身份／核验**。
「验收」列写的是可自动化的实际结果，不含真实设备证据（见 [verification.md](verification.md)）。

「内容身份」列区分两侧，**两侧摘要字段集一致**（任务 3.2 已接通）：宿主侧
`packages/protocol/src/features/type/content.ts::canonicalizeText` 与内核侧
`features/type/content.rs::attach_typography` + `identity.rs::canonicalize_text` 覆盖同一组字段，
并由 `tests/fixtures/contract.json` 的 `contentHashes.typography*` 双向固定。

覆盖范围是**逐字符 run（含全部字符属性）+ 逐段落 run + 图层级 warp/抗锯齿 + 文档级样式表**；
默认值一律不写，旧工程指纹不变。逐 run 摘要只在「一层有多个 run 且至少一个 run 不是默认排版」时
出现（单个 run 的层由平铺字段完整描述），文档级样式表摘要只在样式表非空时出现。
因此下文已经没有「不在身份内」的持久排版字段；唯一例外是明确不在 scope 的能力
（竖排、沿路径排字）与上游 P0 共享命令自带的边界（`type.setStyle` 的 `postscriptName`，
见 [verification.md 已知缺口 5](verification.md#已知缺口)：它能换字面却不换指纹，但本域两条写入
路径都触达不到它）。

## 域入口

所有本域命令只经两个入口，不再逐条扩展共享 facade：

| 入口 | 位置 | 行为 |
| --- | --- | --- |
| `typeCommand(id, params)` | `rust/.../features/type/domain.rs` → `wasm.rs` → `packages/editor/src/features/type/wasm-handle.ts` | 白名单 + 参数校验 → 内核命令 → `{result, changed}`；一步历史 |
| `typeQuery(id, params)` | 同上 | 白名单 + 参数校验 → 内核投影；不改文档／不进历史／不动指纹 |
| `controller.features.type.*` | `packages/editor/src/features/type/workspace.ts` | 写命令先过 `blockingDraft()`，成功后 `afterWrite()`；查询直接转发 |
| 命令清单 | `packages/editor/src/features/type/commands.ts` | `TYPECRAFT_COMMANDS` 与内核两张白名单逐条对齐，界面据此禁用入口 |
| 锁定门 | `domain.rs::refuse_locked_text_target` | 目标文字层「全部锁定」时拒绝抗锯齿/OpenType/变形/转换/删层蒙版/带 `apply` 的样式；缺字体替换作用于全文档文字层，按全文档范围判定锁定。上游这些命令都不查锁定 |

## U67 精确排版、段落/字符样式与 OpenType

| 子能力 | 上游命令 | 域包装 | WASM | UI | 内容身份／核验 | 验收 |
| --- | --- | --- | --- | --- | --- | --- |
| 指定字符对字偶距 | `type.setStyle` 的 `kernPair` | `composition_domain::typography_patch`（`{at, by}`，`by` ±1000） | 既有 `applyTypography` | 「指定字符对」两个输入 + 按钮 | 字偶距策略与手工字偶距**在**身份内；字符对落在第 2 个字符之后时由 `charRuns` 逐 run 摘要覆盖 | 内核返回 `runs`；笔迹/撤销/工程往返通过 |
| 数值字偶距 | `type.setStyle` 的 `kerning` | 同上（`metrics`/`optical`/`off` 或 ±1000 数值） | 同上 | 字偶距下拉 | 在身份内 | 策略切换改变指纹并可撤销 |
| 整层字符属性 | `type.setStyle` 的 `underline`/`strikethrough`/`italic`/`fauxBold`/`fauxItalic`/`weight`/`horizontalScale`/`verticalScale`/`caps`/`ligatures`/`discretionaryLigatures`/`language`/`variations` 与带 `range` 的 `size`/`color`/`font`/`fauxBold`/`fauxItalic` | `params::is_command` 白名单外（P0 共享命令），本域只做身份摘要 | 既有 `type.setStyle` | 字符样式「选项」与样式库属性面板 | **全部在**身份内（整层走平铺键，范围写入走 `charRuns`）；修复前这 15 类写入都不改变指纹，**伪粗体/伪斜体的范围级写入本轮才补进 `charRuns`**（此前只由平铺键覆盖整层写入） | 逐项断言改变指纹并可一步撤销（`every_persisted_typography_field_changes_the_content_identity`），真实 WASM 冒烟同样逐项覆盖（含范围伪粗体/伪斜体改变真实像素且改变指纹） |
| 完整段落选项 | `type.setStyle` 的 `align`/`firstLineIndent`/`startIndent`/`endIndent`/`spaceBefore`/`spaceAfter`/`autoLeading`/`direction`/`hyphenate` | 新增 `PARAGRAPH_PARAMS` + `PARAGRAPH_ALIGNS` + 逐键范围校验 | 同上 | 「段落」分组 9 项 | **在**身份内（对齐/四向缩进/段前后距/自动行距/方向/连字符/样式表引用；多段落时逐段落在 `paragraphRuns`） | 参数接受/拒绝 + 工程往返保留；指纹变化已记录 |
| 点↔段落文字 | `type.convertToPointText` / `type.convertToParagraphText` | `params.rs::only_layer` | `typeCommand` | 「转为段落文字」「转为点文字」 | 形状（`shape` 框）在身份内，`changed: true` | 一步历史、撤销恢复、文字不丢 |
| 字符样式库 | `type.characterStyle.{new,duplicate,delete,rename,set,apply,redefine,clearOverride,list}` | `params.rs::style_command`（按动作分键、名称/ID/attrs 有界） | `typeCommand`／`typeQuery` | 「样式库」面板（列表/新建/复制/选项/应用/重命名/按当前文字重定义/删除/清除覆盖） | **样式表内容在**身份内（文档级 `textStyles` 摘要，改/建/删/重命名都判脏），图层引用的样式 id 也在（`styleSheet`） | 新建→复制出独立 id→选项写回→列表回读→应用→重开保留 |
| 段落样式库 | 同上（`paragraphStyle`） | 同上 | 同上 | 同上（选项栏按类别只给字符或段落属性） | 同上 | 同上 |
| OpenType | `type.openType.{standardLigatures,contextualAlternates,discretionaryLigatures,swash,oldstyle,stylisticAlternates,titlingAlternates,ornaments,ordinals,fractions}` | `params.rs::open_type`（`layer`/`layers`/`on`/`range`） | `typeCommand` + `typeQuery:type.info` | 「OpenType」十个复选框，状态读首个 run | 特性 `features[]` **在**身份内（按 tag 排序写入；`range` 落在首 run 之外时由 `charRuns` 覆盖）；工程往返保留 | 十个特性逐个在真实内核上开关往返：回读、指纹变化、重复写入报 `changed:false`、切回默认后身份复原；工程往返保留 |
| 字体可用性／替换 | `type.fonts`、`type.resolveMissingFonts`、`type.replaceAllMissingFonts` | `check_query`/`font_map`（两侧有界、最多 256 项） | `typeQuery`／`typeCommand` | 「缺失字体」列出 + 映射替换 + 全部替换 + 「可用字体」列出当前字族 | 字族在身份内 | 原文保留、映射生效、替换后不再缺失 |

## U68 抗锯齿、Warp、转路径/形状与栅格化

| 子能力 | 上游命令 | 域包装 | WASM | UI | 内容身份／核验 | 验收 |
| --- | --- | --- | --- | --- | --- | --- |
| 七种抗锯齿 | `type.antiAlias.{none,sharp,crisp,strong,smooth,windows,windowsLcd}` | `layer_targets`（不许额外键） | `typeCommand` | 「抗锯齿方式」下拉 | 抗锯齿字段**在**身份内 | 七种模式逐个在真实内核上执行并回读；`none` 改变真实合成像素并可撤销；其余 5 种写入模型/工程但上游合成走同一覆盖率路径（已记录） |
| Warp Text | `type.warpText` | `warp()`：16 种样式（含 `none`）、弯曲/扭曲 ±100、方向 | `typeCommand` | 样式 + 弯曲/水平扭曲/垂直扭曲 + 应用/取消 | Warp 字段**在**身份内 | 合成像素改变、取消变形、撤销恢复、工程往返保留 |
| 创建 work path | `type.createWorkPath` | `only_layer` | `typeCommand` | 「创建工作路径」 | 工作路径不属工程内容（`changed: false`） | 返回真实子路径数（>0），不建层 |
| 转形状 | `type.convertToShape` | `only_layer` | `typeCommand` | 「转换为形状」 | 形状层进身份，`changed: true` | 一步历史、撤销恢复原文字 |
| 栅格化 | `type.rasterizeTypeLayer` | `only_layer` | `typeCommand` | 「栅格化文字」 | 像素层进身份，`changed: true` | 一步历史、撤销恢复原文字与身份 |

## U69 文字蒙版、查找替换、拼写与缺字体

| 子能力 | 上游命令 | 域包装 | WASM | UI | 内容身份／核验 | 验收 |
| --- | --- | --- | --- | --- | --- | --- |
| 水平文字蒙版 | `type.createSelection` | `type_mask()`：必须有 `layer`（不接受另一套文字创建参数）、四种操作符、抗锯齿 | `typeCommand` | 「用字形建立选区」「建立选区并删除文字层」 | 选区不是工程内容（`changed: false`），但 `hasSelection` 为真、不建层 | 真实字形选区、可一步撤销（含删层变体） |
| 查找／替换 | `edit.findAndReplaceText`（双态） | `find_replace(write)`：`find` 走查询、`change*` 走写入，键集有界 | `typeCommand`／`typeQuery` | 「查找与替换」：查找下一个 / 替换当前（逐处）/ 全部替换 | 文本在身份内，`changed` 由指纹差决定 | 仅改匹配文本、纯查找零历史、逐处替换每次一步撤销、撤销恢复原文 |
| 拼写检查 | `edit.checkSpelling`（双态） | `spelling(write)`：`list`/`suggest` 只读，其余写文档或本机词典 | 同上 | 「检查拼写」+ 逐条改词 | 文本在身份内 | 只报告内置英文词典认识的错词、一步修正 |
| 缺字体发现／替换 | `type.resolveMissingFonts`（双态） | 无 `map` 只列出；带 `map` 才写入 | 同上 | 「缺失字体」分组 | 字族在身份内 | 原文保留、映射生效、`replaceAllMissingFonts` 真实改字族 |

## 明确排除（命令门拒绝，不是"未实现"）

竖排（`type.orientation.vertical`）、路径文字（`type.attachToPath` / `type.detachFromPath`）、
默认样式读写（`type.save/loadDefaultTypeStyles`）、整层重写（`type.updateAllTextLayers`）、
字符插入（`type.insertText`）、光标命中/移动/放大（`type.hitTest` / `type.caret` /
`type.navigate` / `type.increaseSize`）、乱数假文（`type.pasteLoremIpsum`）。

这些 id 既不在 `TYPE_COMMANDS`/`TYPE_QUERIES`，也不在 `TYPECRAFT_COMMANDS`；
`tests/features/type/type-workflows.test.ts` 与 Rust `closed_commands_stay_closed_even_though_the_domain_has_a_dispatch`
双向核对。`type.setStyle` 仍是 P0 共享命令（不在域白名单内），面板经 `applyTypography` 使用它。

**两条写入路径都要过锁定判定**：`typeCommand`（域白名单）在 `domain.rs::refuse_locked_text_target`
里判定；`applyTypography`（面板实际调用，走 `tools.rs`）自己调 `typography_patch` 校验参数后转给
上游 `type.setStyle`，因此在本轮单独补了同一套「全部锁定即拒绝」。上游 `type.setStyle` 本身不看
`effective_locks`，所以只靠参数校验会漏掉锁定语义——`editor.execute("type.setStyle")` 直调仍可绕过，
属 P0 共享面，留给集成负责人统一收口。
