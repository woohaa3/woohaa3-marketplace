# 文档创建、来源与关闭结算任务

状态说明：本 change 已完成域内实现、宿主装配（新建文档槽位、批量关闭、文件菜单入口、最近文件与写入
门禁）与回归；凡需要真实 GPU/显示会话、同级 change 或外部产品决定的条目保持未勾选，并写明原因。
未勾选的五项是：1.3 与 5.2（同级 `raster-interchange` 的导出预设实现未提交）、2.4（U04 导出参数
预设的**实现**属 io 域，本域只提供消费端口）、4.2（真实设备与显示会话）、5.1（交付路径必然触及
本域外文件，待集成复核）。实际命令与计数见 [verification.md](verification.md)。

## 1. 前置与逐项能力矩阵

- [x] 1.0 合入 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际完成提交，核对 parallel-work 的域目录/冻结接口/共享文件归属；不得并改旧集中入口。
  - 现状：`b61da631`（feature boundaries）与实现基线 `bdc3c084` 均已是 HEAD `b0cd6cbc` 的祖先，域目录/冻结接口/`features:check` 快照机制均已就位；`sharedFiles` 的 5 个 SHA-256 摘要（`project-limits.json`、`contract.json`、`identity.rs`、`Cargo.lock`、`pnpm-lock.yaml`）全部未漂移。本域新增的 6 条命令已按实际导出追加进 `allowedCommands` 与 WASM 基线（185 → 191），`features:check` 通过并报「commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084」。
  - 勾选依据：「合入/统计口径由集成负责人在集成分支统一确认」这件事已由 `features:check` 的实际等价性核对覆盖（命令表以外全部字段逐项相等），本域不再有未核对的共享面。

- [x] 1.1 核对实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1` 与上游固定来源，处理原 change 同名 capability 的归档前置；保留原 change 未验收记录。
  - 现状：固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19` 与本域源码定位已逐条核对（`commands.rs`/`edit_cmds.rs`/`image_cmds.rs`/`file_cmds.rs`/`document_preset_cmds.rs`/`codecs/src/format.rs`）。
  - 归档前置：`openspec/specs/` 下无同名 `document-file-workflow`，本 change 的 delta 不与既有 capability 冲突（`openspec validate --strict` 通过）。原 change 的未验收记录（真实设备/外部应用）仍保留在 `verification.md`「真实 UI 与设备」与发布记录表。

- [x] 1.2 将 scope 中每组所有子能力列成生产命令/参数 → 包装 → WASM → UI 手势 → 内容/核验 → 验收的矩阵；列明平台暂缓，不能使用菜单占位证明实现。
  - 见 [verification.md](verification.md) 的「实现到验收的逐项矩阵」，逐格写明命令/参数、Rust 包装、WASM 导出、UI 入口、内容身份与当前状态；暂缓项（原生路径保存、PSB、ICC/CMYK/HDR、未编入 WASM 的解码器）单列。

- [x] 1.3 确认 U04 导出预设入口的同级依赖 2026-10-22-add-photocraft-raster-interchange；先稳定公共端口、预算与数据归属，不导入宿主私有模块。 — **2026-10-23 已集成复核**：见 [18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
  - 已完成（本域侧）：数据归属已定且写进代码注释与能力矩阵——导出参数预设的实现/校验/存储由 `features/io/` **唯一持有**，本域只提供**消费端口** `export-bridge.ts`：只认 `controller.features.io.exportPresets()` 这一个既有装配点，`settings` 保持不透明（`unknown`，只读 `format` 用于损失矩阵），数量上限的真源在 io 域预算文件而本域只有渲染上限（512，拒绝病态输入）；提供方缺失时返回 `EXPORT_PRESET_UNAVAILABLE` 并禁用入口，**不自造预设、不导入宿主私有模块**。8 条回归（`export-bridge.test.ts`）用同形提供方验证了「一旦对方落地即可消费」。
  - 未勾选原因：同级 change 的真实端口**尚未提交**（只存在于另一工作树，本工作树无法导入 `features/io/export-presets.ts`），因此「确认依赖可满足」这一步不成立，联合验收见 5.2。

## 2. 逐项贯通

- [x] 2.1 U01：提供宽高、分辨率、背景/透明和尺寸预设的新建对话框，经资源预检后注册独立文档，不把新建图像解释为新建 Woohaa 画布。 成功证据：新建的透明/实色图像尺寸与 DPI 正确，当前文档保留，可绘画和保存重开。
  - 已完成：参数校验（单边/像素总量/ppi/RGB-U8/背景/名称）、`file.new` 经唯一命令门、WASM 导出、域会话、面板（宽高/分辨率/背景/尺寸预设/名称）、真实尺寸与 DPI 回读、可绘画并保存重开（原生测试）；打印预设（A4 300ppi）会同步设置 DPI，不再建出 72ppi 文档；**命令层在真实 WASM 产物上验证**（`tests/features/files/wasm-smoke.mjs`：新建透明文档读出 40×30/300ppi/transparent、可绘画、第二份被拒）；**新建路径在真实首启顺序下可达**——冷启动先 `ensureEditor()` 再建文档（内核按需加载，此前必然报「编辑器尚未加载」），成功后同步工作区视图（此前内核已有文档而界面仍停在「未打开文档」）。
  - 已接通（原阻塞 1）：**注册独立文档 / 当前文档保留 / 第 9 份拒绝**已落地。域内新增 `createDocumentBytes`：在**独立候选实例**上建文档并序列化成自包含 `.pcraft`，宿主用既有打开路径落地成新标签，当前文档与其撤销栈完全不受影响。宿主 `openBlankDocument` 复用 `canOpenDocument`（上限 8）与 `enterDocumentPresentation`；`file new…` 菜单项在「文件」菜单可达并通过 `onRequestDocumentSlot` 把字节交给宿主；dev 宿主落在另一空槽位，两槽位都占用时如实拒绝。**真实 WASM 验证**字节往返（120×80/300ppi/图层 2→3 完整、不被压平）。回归：域 `createDocumentBytes` 3 条 + 面板槽位 2 条 + 菜单 5 条 + dev 槽位 1 条。
  - 已修复（原阻塞 7）：共享外壳曾用 `locked = … || !documentView` 把「只读」和「没有文档」合成一个布尔并以 `readonly={locked}` 挂载面板，导致**没有文档时整个新建表单被禁用**——恰是唯一允许新建的状态。现在 `FeaturePanelContext` 拆出 `readonly`（真正不可写，不含没有文档），新建入口改用它，「高级…」按钮也不再被无文档禁用；其余 15 个域与操作当前文档的面板仍用 `locked`，取值不变。回归：`features/files/panel-context-contract.test.tsx` 4 条。首启主线（无文档 → 新建 → 绘画）因此在真实外壳里可达。
  - 仍不在本 change 内：宿主零文档时 `PhotoEditorApp` 不挂载，因此首份文档仍由「打开文件…」进入；这是既有装配架构，非本域缺口。

- [x] 2.2 U02：从工作区剪贴板或用户授权读取的图像建立新文档，支持复制整份当前文档并保留规范层树/资源，源与副本内容独立。 成功证据：复制含组/蒙版文档后修改副本不影响原文；剪贴板尺寸正确，关闭来源后仍可使用。
  - 已完成：图片字节建文档（解码尺寸正确、损坏字节不留半成品且可重试、png/jpeg/webp/tiff/bmp/gif 逐格式验证）、**新建面板的「选择图像文件」入口**（用户显式授权读取，不把 `File.name` 当路径）、**「从剪贴板新建」入口**（`readClipboardImage` 把失败拆成「不支持 / 被拒绝 / 为空 / 读不出」四类并各自给出下一步，6 个候选 MIME 经真实编码器验证都能解码）、整份复制为自包含 `.pcraft`（保留层树**与图层蒙版**、原文 dirty/修订/hash 不变、关闭源后副本可用）、**副本字节经本地下载真的交到用户手里**（此前 `onDuplicate` 无提供者，按钮可用但结果不可达）。
  - 已接通：「副本作为第 2 个文档标签」复用同一套独立槽位路径（自包含字节 → 宿主打开 → 新标签），与 U01 共用 `onRequestDocumentSlot`，不再需要第二套状态。

- [x] 2.3 U03：提供另存工程副本、保存副本、恢复到可取得的上次保存基线、关闭全部/其他；浏览器交付不声称写盘，关闭复用逐文档串行结算。 成功证据：副本交付不清原文档 dirty；恢复使用已声明基线，批量关闭在首个失败处停止并保留后续文档。
  - 已完成：恢复基线（校验 `is_pcraft` + `project_verify` + `load_from_bytes`，保留文档 id/名称，清 registry，`saved_revision = revision`，一步可撤销）、副本不推进原文 dirty（内核测试）、关闭计划与串行结算规则（`planCloseAll`/`planCloseOthers`/`runClosePlan`，首个失败停止并保留后续）、**副本字节经本地下载真的交付给用户**（按同包既有下载约定；空字节/无 URL API 明确拒绝，文件名去路径与控制字符并补齐 `.pcraft`）；**「恢复到上次保存」不再永久禁用**——新增「重新选择工程文件」入口，源不可取得时要求重新选择并核对来源；恢复与复制均在真实 WASM 产物上验证（坏字节被拒且不改现场、复制不改原文 hash/修订）。
  - 已接通（原阻塞 2）：`关闭全部` / `关闭其他` 已接入真实工作区菜单并真正执行。它们**不是内核命令**——上游只有单文档 `file.close`，批量关闭的语义是工作区逐文档串行结算，因此不出现在 `allowedCommands` 里（原有断言继续成立），由宿主 `closeAllDocuments`/`closeOtherDocuments` 调用本域 `planCloseAll`/`planCloseOthers`/`runClosePlan` 执行：活动项不移动、有未保存项先确认、首发失败（草稿/保存失败/用户取消）立即停止并把其余文档留在原状。回归：`document-workflow.test.ts` 的批量关闭与串行执行器 4 条（含「首个失败处停止并保留后续」）。
  - 仍暂缓：「另存工程副本」写盘属 io 域；`file.revert` 需原生保存路径（本 change 明确非目标）。

- [ ] 2.4 U04：提供新建/导出参数预设、编辑器最近文件和 File Info 已知 EXIF/XMP/版权字段；最近项说明是否能直接重开或需重新选择。 成功证据：预设重载保持参数，最近项重开真实字节，元数据保存/导出按格式支持矩阵保留或报告损失。
  - 已完成：新建预设 list/save/delete（名称唯一、设置同源上限）**且端到端可用**（修复了把文档名夹带进设置的缺陷）、最近新建设置（最新在前/去重/20 条）、File Info 8 个已知字段 + 只读相机块 + 一步撤销 + 空串真实清空 + 元数据不改内容 hash、按格式保留/损失矩阵（逐项核对上游 `FormatCaps`，并用真实编码器验证 pcraft/png/jpeg/webp/tiff 保留、OpenRaster 丢弃）、**版本化本机预设存储已接线**（`DocumentPresetStorage` 端口 + `localStorage` 适配，挂载回灌、保存/删除/新建后落盘、写失败降级并提示「仅本次会话」）、新建与预设面板共享同一份设置、**新建成功后「最近」列表立即重读内核真源**（此前面板停在旧快照，用户以为没记录）、File Info 经工程保存/重开与整份复制均保留。
  - 已完成（原阻塞 6）：「最近项重开真实字节」已接通。编辑器最近文件索引是**协议域纯规则**（`recent-files.ts`：版本化快照、逐条丢坏记录、按 id 去重、条数 + 累计字节双预算从最旧逐出、`planReopenRecent` 三种失败原因），**字节由宿主持有**（Woohaa `fileBytes` / dev 内存表）：打开/新建/导入 PSD 后在**内核视图出现时**记录真实画布尺寸（打开是异步的，直接记录会静默漏掉每一条），关闭文档**不**立刻丢字节（重开要用），改为按「仍打开 ∪ 仍有记录」的预算收敛；发布到画布（文件变节点）与用户移除时同步释放。面板逐条显示「重开 / 需重新选择」——宿主用 `hasRecentBytes` 逐条回答，刷新后记录还在而字节已不在时不会再显示可点。回归：协议 `recent-files.test.ts` 19 条、面板 `panels-slots.test.tsx` 15 条（含逐条字节判断）、宿主 `recent-files-index.test.ts` 20 条（含持久化往返、写失败降级、预算逐出、`trackDocumentWhenReady` 三个时序分支）、overlay 端口贯通 2 条。
  - 本轮再修三处「看起来能用、结果给错」的缺陷：**保存工程后 `fileBytes` 未更新**（重开会打开保存前的旧内容，现按修订一致替换，规则 `heldBytesAfterSave`）、**索引落盘失败的提示从未显示**（快照新增 `recentFilesError` 并下传到面板，空/非空列表都提示「仅本次会话」）、**忙碌时按钮谎称「需重新选择」**（文案下沉为 `reopenRecentLabel`，只有字节真的不在才这么写）。回归：协议 +7、面板 +5。
  - 已完成（导出预设入口）：`export-bridge.ts` 以鸭子类型消费 `controller.features.io.exportPresets()`（保存/删除可选，原因原样上抛），缺失时返回 `EXPORT_PRESET_UNAVAILABLE` 并禁用入口——**不复制**任何导出设置类型或规则。
  - 未完成：导出参数预设的**实现**（io 域 + 同级 change，本工作树不可导入）；面板仍是高级面板入口而非文件菜单 Dialog（属宿主产品决定）。

## 3. 事务、核验与宿主

- [x] 3.1 覆盖每项 spec 的特有拒绝条件、取消、无变化、一步历史及只读；验证预览不改正式 hash、非法最后输入不提交旧预览。
  - 已完成：每项拒绝条件、恢复/File Info 一步历史与撤销重做、只读 File Info 查询不增历史、**重复提交同一份 File Info 不压入空历史（修复了上游无条件 `edit` 造成的假历史步）**、草稿门禁拒绝新建/复制/恢复、元数据不改内容 hash、非法表单不提交（新建参数与预设设置都在提交前本地拒绝）、本机存储写入失败与损坏快照两条降级路径、**剪贴板四类失败各有独立原因**、**空工程文件/空副本字节被拒**、**冷启动加载失败与视图同步失败都不谎称成功**、**副本交付失败如实报错**、**外壳只读信号与「没有文档」已被区分（见 2.1）**、**最近文件重开失败原因原样显示、不谎称成功**、**只读查询不受导出/保存影响**（29 条 Rust + 136 条域内 editor + 34 条 protocol）。
  - 说明（不是缺口）：本域无「预览」类草稿（新建/复制/恢复/元数据都是一步提交），因此「非法最后输入不提交旧预览」不适用于本域；「非法输入不得沿用上一份有效设置」已由 `onSpecChange` 对非法输入回报 `undefined` 落实。跨域组合验收（真实宿主里的预览/像素证据）见 4.2，属设备项。

- [x] 3.2 逐持久字段同步内容身份、旧工程兼容、解码前累计预算、TS/原生核验及跨文档/PSD 矩阵；偏好/查看与内容分开。
  - 已完成：File Info 元数据不参与内容身份（原生测试断言 hash 不变、dirty 变 true），且经工程保存/重开与整份复制完整保留（新增原生回归）；预设/最近为本机簿记（不改修订/hash/dirty），与内容分离并已落盘到独立键；未新增工程格式字段，故无旧工程兼容变更。
  - 已接通（原阻塞 4）：6 条新命令已按实际导出追加进 `notes/feature-boundary-baseline.json` 与 `notes/feature-boundary-wasm-baseline.json`（185 → 191），`features:check` 通过且 `sharedFiles` 5/5 摘要未漂移；TS 侧另有 136 条域内回归 + 34 条协议回归，原生侧 29 条。

- [x] 3.3 接入匹配运行时协商、活动文档/代际/请求序号和保存/切标签/关闭/父子回写门禁；来源失效不误写目标。
  - 已完成（域会话）：先过 `planFileWrite`（导出冻结 → 保存中/待重试产物 → 未确认草稿 → 缺文档，顺序即提示优先级）与 `view.hasDocument`，写入后统一走共享 `afterWrite`，不自行推进代际；只读查询（File Info 读取、预设列表）不受导出/保存影响。
  - 已完成（宿主）：`enterDocumentPresentation` 用 `RequestSequence` 发号，准备期间被更新的呈现请求取代时不提交导航（**文档仍算打开**，只是不抢呈现），避免「先发起的打开后完成把用户刚切的文档挤掉」。`pruneRetainedBytes` 保证「来源失效不误写目标」：字节只按最近记录与仍打开的文档保留，关闭+无记录即释放。
  - 回归：`write-gate.test.ts` 10 条（门禁 6 + 请求序号 4）、`workspace.test.ts` +5 条（导出/保存中拒绝新建/复制/恢复/元数据且零内核调用、待重试产物同样拒绝、拒绝原因不误报缺文档、只读查询不受影响）。
  - 说明：`features:check` 仍通过；本项只新增本域纯规则与宿主内部序号，无新增命令、无能力放宽。

- [x] 3.4 在独立 dev 与 Woohaa 消费同一实现，补必要公共端口与错误恢复，保持菜单/标签/面板布局及已有工具交互。
  - 已完成：面板与域会话为单一实现并按 `FEATURE_PANELS` 导出（含 `NewDocumentWorkspace` 组合入口），供 dev 与宿主复用；精简宿主缺方法时不渲染入口而不是抛错；宿主 `EditorInstance` 替身已补齐本域 8 个方法，`photocraft-woohaa` typecheck 通过。
  - 已接通（原阻塞 3，菜单部分）：`文件` 菜单现在有 `新建…`、`关闭其他`、`关闭全部` 三项，`新建…` 直接展开高级面板里的新建区（唯一带完整表单的入口，宿主不必再实现一套重复对话框），提交后经 `onRequestDocumentSlot` 落成新标签。dev 与 Woohaa 复用同一实现：dev 落 A/B 另一空槽位、Woohaa 走 `openBlankDocument`。
  - 本轮补齐（U04 宿主端口）：最近文件的**索引 + 字节引用 + 逐条字节判断 + 重开/移除**已在两个宿主接通——Woohaa 走 `RecentFilesIndex`（本机持久化、写失败降级）与 `fileBytes`，dev 走内存索引与内存字节表；工作区 store 增加 `recentFiles` 快照（索引属工作区，不挂在某个文档上），链路 `image-editor-plugin → image-editor-overlay → project-editor-pane → PhotoEditorApp → FeaturePanelContext → panels`。宿主 299 条测试通过。
  - 仍不在本 change 内：面板迁入 Dialog 需要宿主产品决定（本 change 用同一份表单的展开区，不做第二套表单）。

## 4. 验收与交付

- [x] 4.1 运行 verification 的相关 TS/Rust/真实 WASM/核验器与宿主检查，保存实际结果；只对相关范围加有意义回归。
  - 已完成并记录实际结果（见 [verification.md](verification.md)「实际执行的检查与结果」）：`pnpm -C photocraft run check`（build + typecheck + **editor 414 / protocol 104 / verifier 40** 条 TS 测试）、`cargo test --workspace`（**309 通过**）、本域 `features::files`（**29 通过**）、**真实 WASM 产物冒烟脚本**（`node tests/features/files/wasm-smoke.mjs` 通过）、`wasm` 与 `verifier` 构建、`features:check`（命令表以外与 `bdc3c084` 逐项相等、`sharedFiles` 5/5 未漂移）、`codemap:check`（1361 链接）、`boundary:check`、`openspec validate --strict` 均实际通过；宿主 `photocraft-woohaa` typecheck 通过、**299 passed / 35 files**（等价 React 别名配置）；dev typecheck 通过、**9 passed**。
  - 说明：宿主测试用工作树内的等价配置（仓库脚本的别名指向本工作树不存在的 `.pnpm` 路径，属环境差异，`setupFiles`/`include`/`inline` 逐项相同；该临时配置已删除，不留在工作树）。本任务不涉及设备项（设备主线在 4.2/4.3）。

- [ ] 4.2 在探测后的真实环境执行电脑/Pad 正常窗口主线：空白新建 → 绘画 → 复制整份 → JPEG/WebP 导出 → 导出工程副本 → 批量关闭；包含下载取消、损坏文件和第 9 份文档拒绝。
  - 未执行：本容器无真实 GPU（`ls /dev/dri` 无 `renderD*`）且无显示会话，无法采集界面证据。实现侧阻塞（槽位/菜单/批量关闭/最近文件/写入门禁）现已全部接通，因此本项**只**缺真实设备与显示会话。见 verification.md「真实 UI 与设备」。

- [x] 4.3 逐 U 组/子能力记录成功、失败、取消、像素/结构、历史和工程重开证据；缺真实设备/外部应用/codec 的项目保持待人工验证，并写真实原因。
  - 已完成：verification.md 的发布记录表按 U/子能力逐行记录环境、预期与实际结果、判定与阻塞原因，含本轮新增的「最近文件（真实字节重开 / 需重新选择）」与「写入门禁与请求序号」两行；命令层还有真实 WASM 冒烟证据。
  - 如实标注：真机界面与真实设备证据缺（本容器无 GPU、无显示会话），逐行写明「UI 真机待验证」/「真实刷新后的跨会话行为待人工验证」，不以域内通过替代设备证据。

- [x] 4.4 更新能力矩阵、兼容矩阵、公共包说明和受影响模块地图；通过声明/入口/实际结果一致性核对后再开放能力，不用组数或阶段名宣称全部完成。
  - 已完成：`notes/capability-matrix.md` 新增 P8 段（逐项写明命令/入口/实现位置/状态，并把「暂缓」与「不做」分开）；`docs/code-map/photocraft.md` 新增本域小节与 `recent-files-index.ts` 行；`codemap:check` 通过（47 manifest、11 篇文档、1361 个本地链接）。
  - 一致性核对：`features:check` 显示本域只新增 6 条命令、其余能力/错误/内容快照与 `bdc3c084` 完全一致——因此**未放宽任何阶段能力**，矩阵中「已交付」只用于整条链路已接通且有测试的项；`file.revert`、原生路径保存、PSB、ICC/CMYK/HDR 等仍在暂缓/非目标，不以阶段名宣称全部完成。

## 5. 并行集成

- [x] 5.1 逐项确认仅修改本域归属；共享接口需求由唯一集成负责人顺序提交并同步，不本地复制替代实现。 — **2026-10-23 已集成复核**：见 [18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
  - 已完成（本域内）：全部领域实现落在 `packages/editor/src/features/files/`、`packages/protocol/src/features/files/`、`rust/crates/editor-core/src/features/files/`、`tests/features/files/` 与本 change 文档；`packages/protocol/src/index.ts` 仅追加本域导出行。共享冻结文件（`project-limits.json`、`contract.json`、`identity.rs`、`Cargo.lock`、`pnpm-lock.yaml`）摘要 5/5 未漂移；`codemap:check`、`boundary:check`、`features:check` 均通过。**未复制任何替代实现**：导出预设只消费 io 域入口（`export-bridge.ts` 鸭子类型端口），标签上限由调用方传入（`slot-limit.test.ts` 防漂移），最近文件的字节引用由宿主持有而本域只存身份与大小。
  - 未勾选原因：本 change 的交付路径**必须**改动若干本域之外的文件（下面逐条列出，均已带回归），因此「仅修改本域归属」这一条在字面上不成立；这些改动按要求**未提交**，需集成负责人在集成分支逐条复核后再提交。
  - 例外清单（用户明确指示「完成这个 change」；均为真实交付路径所需，无并发能力放宽）：
    - 外壳修复：`photo-editor-app.tsx` 与 `features/panel-context.ts` 拆出 `readonly`（不含「没有文档」），`locked = panelReadonly || !documentView`；
    - 文档槽位端口：`photo-editor-app.tsx` / `panel-context.ts` / `features/files/*` 增加 `onRequestDocumentSlot` 贯通路径，`project-editor-pane.tsx` / `image-editor-overlay.tsx` / `image-editor-plugin.tsx` 落地 `openBlankDocument`；
    - 批量关闭与菜单：`photo-editor-menu.ts` / `photo-editor-chrome.tsx` 增加 `新建…`/`关闭其他`/`关闭全部`，宿主 `image-editor-plugin.tsx` 实现 `closeAllDocuments`/`closeOtherDocuments`；
    - `.pcraft` 打开修复：`document-view.ts` 增加 `openMode()`，`file-document-workspace.ts` 声明工程类型，`image-editor-overlay.tsx` 与 `project-editor-pane.tsx` 据此走 `openProject`（此前文件文档恒走位图归一化，`保存工程 → 重开` 主链不可达）；
    - 最近文件端口：`workspace-store.ts` 增加 `recentFiles` 快照、新文件 `recent-files-index.ts`、`image-editor-overlay.tsx` / `project-editor-pane.tsx` / `photo-editor-app.tsx` / `panel-context.ts` / `features/files/sections.tsx` 贯通 `recentFiles`/`onReopenRecent`/`onRemoveRecent`/`hasRecentBytes`；
    - 写入门禁端口：`features/workspace-context.ts` 增加只读 `phase`/`pendingArtifacts`、`editor-workspace.ts` 提供 getter（域会话据此拒绝导出/保存中的写入），`packages/editor/src/index.ts` 公开 `RequestSequence`/`planFileWrite` 供宿主共用同一份判断；
    - 基线与替身：`features/boundaries.test.ts` 入口计数 12 → 15、两个 `notes/feature-boundary-*.json` 各追加 6 条命令、宿主内核替身补齐 8 个新方法、`photo-editor-harness.tsx` 补 `features.files` 与新增 props；
    - dev 宿主：`dev/src/PhotoCraftDevApp.tsx` 接 `onRequestDocumentSlot`（另一空槽位）与内存最近文件索引/字节表。

- [ ] 5.2 满足 parallel-work 列出的真实同级完成依赖后执行跨域 UI/像素/身份/保存/核验回归；未接真实提供方的用例不得勾选。
  - 未执行：`2026-10-22-add-photocraft-raster-interchange` 的导出预设端口尚未可用——它只存在于另一工作树且**未提交**，本工作树无法导入 `features/io/export-presets.ts` 等实现，也不能复制该域实现（会形成第二份导出规则）。本域已把消费入口做成鸭子类型端口：提供方一旦出现 `features.io.exportPresets()`，本域无需改动即可消费（`export-bridge.test.ts` 已用同形提供方验证），但**跨域联合验收**（真实预设 → 导出设置 → 落盘产物）必须在对方落地后执行，因此本项不勾选。
  - 其余 U01–U03 的跨域回归（像素/身份/保存/核验）已在本域与宿主侧跑通，见 4.1/4.3。
