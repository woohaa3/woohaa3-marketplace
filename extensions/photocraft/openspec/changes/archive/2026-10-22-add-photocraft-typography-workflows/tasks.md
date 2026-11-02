# 精确文字排版与文字工具任务

状态说明：`[x]` = 实现与可自动化的验证都已完成；`[ ]` = 未完成或只有真实设备/共享侧证据缺失，
原因写在行尾与 [verification.md](verification.md)。本 change **尚未提交**，实施在工作区。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。（`b61da631` 已是 HEAD 祖先；域目录由该前置建立，`feature-boundary-delta.mjs` 证明共享文件未漂移。）
- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。（实现基线与上游 `4e7a17cd` 已核对；`composition-type-vector` 仍由 `2026-10-22-complete-photocraft-webui-editing` 持有，该 change 尚有 8 项未勾选，未归档、未改写。）
- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。（[matrix.md](matrix.md) 三段 U67/U68/U69 逐行五段链路 + 明确排除清单；面板测试按真实 DOM 断言入口与参数；48 个命令 id 的单一清单 `tests/features/type/type-commands.json` 同时被增量脚本与真实 WASM 主线冒烟读取，后者用真实调用记录核对每条都执行过。）
- [x] 1.3 确认同级依赖 无新增同级 change 的硬依赖；先稳定公共端口、预算与数据归属，不导入宿主私有模块。（`parallel-work.md` 记为无同级前置；本域只经 `controller.features.type.*` 接入，未 import 宿主目录，`pnpm boundary:check` 通过。）

## 2. 逐项贯通

- [x] 2.1 U67：补指定字符对/数值字偶距、完整已实现段落选项、点/段落转换、字符/段落样式库和真实可用 OpenType。 成功证据：内核排版/光标/选择与保存一致，样式可重用，切换布局不丢文字或 spans。（`type.setStyle` 的 `kernPair` + 9 项段落；16 个样式动作；10 个 OpenType；点↔段落。真实 WASM 冒烟与工程重开验证；**48 个命令全部在真实内核上执行过**——冒烟脚本包裹 `execute`/`typeCommand`/`typeQuery` 记录真实调用 id，与单一来源清单 `tests/features/type/type-commands.json` 对账（本轮据此发现 9 个 OpenType 只登记未执行，已逐条补测开关往返/回读/身份复原，并反向验证断言有区分力）；**行距留空按「自动行距」处理**（此前面板初值 0 会把行高压成 0pt 并把内容判脏）；样式库 9 个动作各接面板入口——补上此前漏接的**复制样式**与**样式选项** `set`，并加「清单里每条命令都必须有真实界面入口」的回归以防再漏；`kernPair` 改投 `type.edit`（`type.setStyle` 会静默忽略它）；排版字段进入内容身份见 3.2。）
- [x] 2.2 U68：提供文字抗锯齿、Warp Text、Create Work Path、Convert to Shape 和现有 rasterize 命令入口。 成功证据：实际合成按抗锯齿/Warp 改变，转换产生可保存几何/像素，原文字可一步撤销恢复。（`none` 改变真实 PNG 字节且可撤销，Warp `arc` 亦改变 PNG；工作路径返回 >0 子路径；转形状/栅格化各一步历史并撤销回 `Type` 层。**其余 5 种抗锯齿**在上游合成共用覆盖率路径，只证明写入模型/工程，不宣称 7 种外观各异。）
- [x] 2.3 U69：提供水平文字蒙版、当前文档查找/替换、可用语言拼写和缺字体发现/替换，不扩竖排。 成功证据：文字蒙版产出真实字形选区，替换只改指定文本，缺字体操作保留原文并明确映射。（蒙版返回 `selected: true` 且不建层；`changeAll` 只改匹配文本；内置英文词典列 `teh` 并一步修正；缺字体映射后原文保留。竖排/路径文字命令门保持关闭。）

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。（内核单测覆盖：非法参数不改文档/不进历史（`invalid_params_are_refused_before_the_kernel_and_keep_the_document`）、逐项一步历史与撤销、双态 `changed` 按动作、查询不动身份/修订/历史、文字草稿门禁、**图层全部锁定拒绝写入**（含界面与内核两条路；缺字体替换按**全文档**范围判定——上游会把每个文字层都改一遍，只查已选图层会漏判；本轮补上**面板真实入口 `applyTypography`**——它绕过 `typeCommand` 走 `tools.rs`，此前对锁定层仍写成功）、**锁定不影响只读与样式表管理**。真实 WASM 冒烟复测同一批拒绝并断言 `contentHash`/`stateJson` 未变。预览路径由共享 `text_preview` 承担，本域未新增第二套草稿。）
- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。 成功证据：每个持久排版字段单独改动都改变内容身份且可一步撤销，旧工程指纹逐字节不变，两侧（内核/宿主）字段集合有跨语言 fixture 对照。（①持久字段随工程往返；②**旧工程兼容**：删掉新字段仍可打开、身份回到旧值、可继续写入；③**PSD 矩阵**：行距/字距/基线/OpenType/抗锯齿/warp 经 PSD 往返原样读回，`blocking:0`、`lossy:[]`；④**解码前有界**：查找/词/名称 4096/200/200 字符、列表与映射 ≤256 项，样式表条目 ≤256，超界在进内核前拒绝；⑤**偏好/查看与内容分开**；⑥**TS/原生核验**：`identity.rs::canonicalize_text` 放行本域按键，`project-verify` 文档级钩子拒绝悬空样式引用；⑦**跨域矩阵**：五类图层共存、真实核验器 `ok:true`、重开后身份可复算。**身份覆盖**：内核对 `features/type/content.rs::attach_typography` 取值、`identity.rs` 校验并拼后缀，覆盖逐字符 run（leading/tracking/baselineShift/kerning/kern/OpenType features/字符样式引用/字体族/字号/颜色/字重/斜体/上下标之外的字符属性；单 run 写平铺字段，多 run 另写 `charRuns`）、逐段落 run（align/四向缩进/段前后距/自动行距/方向/连字符/样式表引用，多段写 `paragraphRuns`）、warp 与抗锯齿，以及文档级样式表内容（`textStyles` 摘要）；默认值与空表一律折叠不写，故旧工程指纹逐字节不变。真实 WASM 冒烟逐项断言 10 个字段各自改变指纹并可一步撤销（反向验证：全部反转后 10 项同时失败），另补 **范围级排版与字符属性**（`type.setStyle` 的 `range` 只改中间字符，含字号/颜色/字体/**伪粗体/伪斜体**）、**整层字符属性**（下划线/删除线/斜体/两向缩放/字重/大小写/连字/语言/可变轴）与**样式表内容**（新建/改属性/重命名/应用字符样式）的身份断言——这三类修复前都「改了但不判脏」（伪粗体/伪斜体的**范围级**写入是最后一处：实测 PNG 变了而指纹没变，现已进 `charRuns`，反向验证摘掉该分支后 Rust 单测与两条冒烟断言同时失败）。**跨语言基线**：`tests/fixtures/contract.json` 的 `contentHashes.typography*`（首 run 平铺，`typographyHash = ba1942c579c84d17`）与 `typographyRuns*`（逐 run + 文档级样式表，`typographyRunsHash = feeff5a32fa15bcc`）由 TS 与 Rust 双双复现。**共享接入的边界**：`document_content.rs` 的 text 分支改调本域函数并追加文档级样式表摘要；`identity.rs` 只在本域白名单处追加校验（含逐 run 结构校验）；`project-verify/src/lib.rs` 只加一行文档级钩子；`shared/content.ts` 只加 `textStyles` 字段与格式校验——四处均由本域实现、共享文件仅做接入，`feature-boundary-delta.mjs` 把这些已授权改动之外的任何漂移判为失败。）
- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。（`typeCommand`/`typeQuery` 在 `FeatureEditorInstance` 上是可选入口：旧内核缺入口时报「当前内核未提供文字域命令入口」而非 `TypeError`；写命令先过共享 `blockingDraft()`，成功后统一 `afterWrite()`。生命周期/代际仍由共享工作区持有，本域不复制。）
- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。（面板经 `controller.features.type.*` 接入同一实现；高级区仍是 12 个 section，文字合并在唯一 `typography` 段。Woohaa 适配 275 例与宿主类型检查通过；**真实联合流程**见 4.2 未勾选项。）

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。（结果记在 [verification.md](verification.md)：`check`（protocol 72 / verifier 40 / editor 308）、`rust:test` 326 例、`wasm`、`verifier`、五个真实 WASM 脚本（主线含范围级与样式表身份/旧工程兼容/PSD 矩阵/跨域核验/基线增量）、Woohaa 34 文件/275 例、boundary、codemap、`openspec validate --strict`。`features/type/` 下 TS 回归共 44 例（6 个文件，含既有的 5 例文字草稿会话），Rust 共 41 例（域 24 + 参数 9 + 核验 8）。）
- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：指定字符对字偶距/OpenType → 段落样式 → Warp/转形状 → 文字蒙版 → 查找替换 → 缺字体替换；中文 IME、撤销、工程往返一起验证。 — **待人工验证**：本机 Linux 无 `/dev/dri`（无 `renderD*` 渲染节点）、`DISPLAY` 与 `WAYLAND_DISPLAY` 均为空，没有显示会话，无法启动界面走查、驱动中文 IME 或采集应用内截图。已采集的替代证据是无渲染的真实 WASM 主线（含撤销与工程重开），不替代真实设备走查。
- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。（[matrix.md](matrix.md) 逐行记录五段链路与验收结果；[verification.md](verification.md) 分「主线实测」「已知缺口」「未采集项」三表，每项写真实原因。）
- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。（新增 [matrix.md](matrix.md) 作为本域能力矩阵；README/verification 写清未完成边界；代码地图 `docs/code-map/photocraft.md` 与 `frontend.md` 已描述 `features/type/` 装配，`pnpm codemap:check` 通过。未新增 capability id，命令挂在此前已交付的 `type.typography` 下。）

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。（`git status` 只含 `features/type/`、本 change 目录、`tests/features/type/`，以及任务 3.2 明确授权的共享接入点：`document_content.rs` 的 text 分支改调本域函数并追加文档级样式表摘要、`identity.rs` 追加本域白名单与逐 run 结构校验、`project-verify/src/lib.rs` 加一行文档级钩子、`shared/content.ts` 加 `textStyles` 字段与格式校验，和跨语言身份基线（`tests/fixtures/contract.json` 新增两组基线 + 两侧 fixture 测试各加两条复现断言，原有基线项与用例一项未动）；实现全部在本域目录内。`feature-boundary-delta.mjs` 把这些已授权改动的**新摘要固定下来**，任何进一步漂移仍判失败。协议 facade 的共享导出顺序仍留给集成负责人，见 verification 已知缺口 4。）
- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。 — **部分采集，仍未勾选**（缺 UI 与像素两项，二者都要真实设备/显示会话）：`parallel-work.md` 记「无同级完成前置」，故跨域回归不依赖未合入的同级工作。本域已用真实内核 + 真实核验器二进制补了**非设备**的那部分（`typography-cross-domain.mjs`）：同文档并发 Group/Adjustment/Shape/Type/Pixel，本域排版写入与兄弟域写入交错后互不覆盖；导出字节经真实核验器 `ok:true`、图层数与画布与内核一致、`objectKinds` 含 `text`/`shape`/`adjustment`/`group`/`raster`；重开后正文/行距/Warp/OpenType 一致且内容身份可复算。**未采集**：跨域 **UI** 联合走查（需真实宿主提供方在真机上操作面板与画布）与跨域 **像素** 对比（需 GPU 与显示会话，和 4.2 同一原因）。本域不把接口替身或纯模型断言算作这两项。
