# 验收计划与记录

## 本次规划状态

初次规划仅创建文档；本次为**域内实施记录**（change: 2026-10-22-add-photocraft-file-workflows，U01–U04）。
写入范围严格限于 `packages/editor/src/features/files/`、`packages/protocol/src/features/files/`、
`rust/crates/editor-core/src/features/files/`、`tests/features/files/` 与本 change 目录。

真实设备/渲染主线（4.2）**未执行**；容器内无真实 GPU（`ls /dev/dri` 无 `renderD*`），也无显示会话，
渲染与真机证据标为待人工验证。

上一轮列出的实现阻塞——独立文档槽位、文件菜单槽位、弹窗端口、批量关闭执行、`allowedCommands`
基线、`sharedFiles` 计数、`FEATURE_SECTIONS` 计数、宿主内核替身——本次已全部接通或按实际导出更新，
逐条记在下方「集成阻塞」里（已修复条目保留原位并标注结论）。当前只剩三类未完成项：真实 GPU/
显示会话的人工验证、同级 change `2026-10-22-add-photocraft-raster-interchange` 的导出预设端口、
以及需要外部产品决定的「面板迁入 Dialog」。

## 实施中发现并修复的真实缺陷

域内实施完成后做了「界面 → 域会话 → 包装 → 内核」的端到端复核，发现 25 处单测各自成立、连起来
却不可用的缺陷。它们都在本域或本 change 自己的装配路径里，逐条修复并各补回归：

| 缺陷 | 后果 | 修复 | 回归 |
| --- | --- | --- | --- |
| 预设/最近设置直接复用了新建参数（含 `name`） | 内核 `DocumentSettings` 不接受 `name`，**「保存当前设置」与「最近新建」在真实 WASM 上必然失败**（`未知的参数 \`name\``） | `presetParams` / 新增 `recentSettingsParams` 只发送设置字段 | `ui_shaped_preset_and_recent_settings_are_accepted_by_the_kernel`（Rust）、`model.test.ts`、`workspace.test.ts` |
| 「编写当前设置/使用」两个面板没有共享状态 | `spec` 从未被赋值，「保存当前设置」永远提示「先设置尺寸」，「使用」也填不回新建表单 | 新增 `NewDocumentWorkspace` 组合组件，用递增 `token` 传递外部设置，避免表单→上层→表单回写环 | `新建与预设共用一份设置`（jsdom） |
| `A4 300ppi` 尺寸预设只设像素 | 标签写着 300 ppi，实际建出 72 ppi 文档（打印密度错，属假预设） | `SizePreset.resolution` 可选，打印预设带上 300，应用预设时同步分辨率 | `打印尺寸预设同时设置像素与 DPI`、protocol `打印预设自带 DPI` |
| File Info 损失预览恒为 `.pcraft` | 工程文件永远无损，损失矩阵与提示在界面上**不可达** | 面板增加「损失预览目标」格式选择器，按所选格式真实报告损失 | `损失预览按所选格式报告`（jsdom） |
| 预设/最近设置只存在进程内，版本化存储编解码从未接线 | 设计 D3 要求的「本机索引」是**死代码**：刷新后预设与最近设置全部丢失，界面也不说明「仅本次会话」，等于静默丢用户数据 | 新增 `DocumentPresetStorage` 端口 + `localStorage` 适配；面板挂载回灌内核、保存/删除/新建后落盘；写失败如实降级并显示「关闭后不会保存」 | `保存后写回本机存储并如实报告已持久化`、`存储写入失败时明确降级为仅本次会话`、`启动时把本机快照回灌内核；坏存储明确提示`、`新建成功后把最近设置写回本机存储，重挂载时能恢复`、protocol「本机存储适配读写同一条版本化文本」 |
| 重复提交同一份 File Info 会压入空历史步 | 违反 spec「无变化不新增历史」：上游只要收到任一已知键就无条件 `session.edit("File Info")`，实测连写两次相同值后历史为 `["Open","File Info","File Info"]`，用户要撤销两次才回到初始态 | 包装在写入前用 `write_file_info` 算出结果 XMP 并与当前**可观察字段**比较，完全一致时降级为只读查询；面板同步如实显示「无变化，未新增历史」 | `repeated_file_info_write_without_changes_adds_no_history`（Rust）、`无变化判定按内核语义比较`（model）、`无变化的提交如实说明未新增历史`（jsdom） |
| 「恢复到上次保存」在真实界面里**永久禁用** | `sections.tsx` 从不传 `baseline`，宿主也没有交入「上次保存工程字节」的端口——按钮存在、功能不可达；design 要求的「源已不可取得时要求重新选择并核对来源」根本没有入口 | 面板内新增「重新选择工程文件」入口（用户显式授权读取 `.pcraft`），选择后基线来源成立、恢复可用；空文件明确拒绝 | `没有基线时可直接重新选择工程文件`、`重新选择空工程文件时说明原因`（jsdom） |
| 「复制整份文档」生成字节却无处交付 | `onDuplicate` 是可选回调且真实装配无人提供，副本字节被丢弃——按钮可用、结果不可达，用户拿不到副本 | 按同包既有本地下载约定交付（`downloadBytes`），并保留可选宿主回调；空字节/无 `URL.createObjectURL` 明确拒绝；文件名去路径与控制字符、补齐 `.pcraft` | `把字节交给一次下载，并在之后释放 URL`、`空字节与不支持的环境明确拒绝`、`文件名去掉路径与控制字符`（download）、`复制成功报告字节数并交出字节`（jsdom） |
| U02 缺少剪贴板来源 | spec 明确要求「从工作区剪贴板或用户授权读取的图像建立新文档」，此前只有文件选择入口 | 新增 `readClipboardImage`：把「不支持 / 被拒绝 / 为空 / 读不出」拆成四类原因并各自给出下一步，面板新增「从剪贴板新建」 | 7 条 `clipboard.test.ts` + 2 条面板测试 + Rust `clipboard_mime_types_are_all_decodable` |
| 新建成功后**界面不刷新**，仍显示「未打开文档」 | `createDocument`/`createDocumentFromImage` 在调用内核后直接返回报告，没有走 `afterWrite()`：内核里已经有文档，而 `controller.view` 仍是 `hasDocument:false`，画布/状态栏/标签停在「未打开文档」，要等下一次任意写入才突然出现 | 两条新建路径在成功后同步一次工作区视图；视图同步失败时报失败而不是返回「成功」的样子 | `新建成功返回内核真实尺寸`（断言 `afterWrite` 被调用一次）、`从图像新建同样同步工作区视图`、`视图同步失败时不谎称新建成功` |
| 冷启动时新建**永远失败**：「编辑器尚未加载」 | 内核是按需加载的（只在 `openImage`/`openProject` 里 `ensureEditor()`），而「新建」恰恰总是在没有文档、也就没有句柄的状态下发起，于是真实首启路径上新建必失败 | 三条新建路径（空白/图像文件/剪贴板）在提交前先 `controller.ensureEditor()`；加载失败如实报错且不调用内核 | `冷启动时先加载内核再新建`、`内核在新建前加载失败时如实报错，不调用新建`（jsdom） |
| 新建后「最近」列表**不更新** | `persistRecents()` 只把内核记录写进本机存储，没有通知「预设与最近」面板重新读取：面板停在旧快照，用户以为没记录 | 新建成功后递增 `refreshToken` 让面板重读内核真源（并保留落盘） | `新建后「最近」列表立即反映内核记录，而不是停在旧快照`（jsdom） |
| 副本已生成但交付失败时**谎称成功** | 我自己新增的下载路径忽略了 `downloadBytes` 的返回值：在没有 `URL.createObjectURL` 的宿主要里仍显示「已生成副本字节」，用户其实拿不到文件 | 交付失败时报「副本已生成但不能交付：<原因>」，且不显示成功文案 | `副本生成成功但交付失败时如实报错，不谎称已交付`（jsdom） |
| 本域**复制了共享工作区的标签上限** | `close-plan.ts` 自带 `MAX_OPEN_DOCUMENTS = 8`，与共享 `document-workspace.ts` 构成两套权威值：共享侧一改，本域提示就谎报数字（真正拒绝的理由来自另一处）。这违反 change 自己「不复制另一套规范值」的规定 | 改为**由调用方传入上限**（依赖方向 editor → protocol 无法反向 import），本域不再声明该常量；配一条跨包防漂移回归 | `packages/editor/src/features/files/slot-limit.test.ts`（4 条：本域不再导出该常量、用工作区真值时行为一致、原因里的数字随传入上限变化、非法上限被拒） |
| 没有文档时新建表单**整个被禁用** | 外壳把「只读」与「没有文档」合成一个 `locked` 并以 `readonly={locked}` 挂载面板，于是**唯一允许新建的状态**恰好被禁掉；「高级…」按钮同样在无文档时不可点，新建区根本打不开 | 拆成 `readonly`（真正不可写，不含没有文档）与 `locked = panelReadonly \|\| !documentView`；新建入口用 `readonly`，其余 15 个域与操作当前文档的面板仍用 `locked`（取值不变） | `features/files/panel-context-contract.test.tsx` 4 条 + 宿主「文件菜单的新建…」1 条 |
| 已有文档时再新建，**本域只能拒绝** | 一个会话只有一个文档槽位（`require_no_document`），于是「当前文档保留」这条成功证据在真实宿主里不可达 | 域内 `createDocumentBytes` 在**独立候选实例**上建文档并序列化成自包含 `.pcraft`；宿主 `openBlankDocument` 用既有打开路径落成新标签，当前文档与撤销栈不受影响；`文件 ▸ 新建…` 菜单与面板共用同一条 `onRequestDocumentSlot` | 域 3 条 + 面板 2 条 + 菜单 5 条 + dev 槽位 1 条 + 真 WASM 字节往返（120×80/300ppi/图层 2→3） |
| **打开 `.pcraft` 把工程当位图解码** | 文件文档的 `projectDocument()` 恒为 null，进入判定于是落到 `openImage` → `normalizeEditorImage` → `createImageBitmap` 解 zip 失败：「保存工程 → 重开」整条主链在真实宿主里不可达（同一条路径也被新文档槽位复用） | `EditorDocumentView` 增加可选 `openMode()`；`FileDocumentWorkspace` 按 `kind` 声明 `project`/`image`；进入判定改用 `openMode()`；面板的工程分支对文件文档读它自己的字节，节点文档仍读 `loadProjectBytes` | 宿主 `独立文件的 .pcraft 走 openProject，不经过位图归一化` + `工程文件…` 断言 `openMode()` + `openImage`/`normalize` 均未被调用 |
| **最近文件一条也记不上**（本轮新增） | 打开文件时控制器是异步建好的，`currentView().document` 仍为 null；记录函数按设计拒绝无尺寸记录，于是**每一条最近文件都静默漏掉**，列表恒为空——功能存在、永远不出内容 | `trackDocumentWhenReady` 等第一份带文档的视图再记录；关闭/发布时取消未成立的记录 | 宿主 `trackDocumentWhenReady` 3 条（已就绪立即记录并零订阅、未就绪只记一次并自动退订、取消后不再记录） |
| **关文档就丢字节，重开永远「需重新选择」**（本轮新增） | 字节原本跟随关闭释放，于是「最近项重开真实字节」这条成功证据永远不可达；反过来无条件保留又会无限占内存 | 关闭不立刻释放，改为按「仍打开 ∪ 仍有记录」收敛（`planReleasedBytes`）；发布成节点与用户移除时同步释放 | 宿主 `planReleasedBytes` 4 条 + 工作区快照 2 条 |
| 最近文件「有没有字节」只按「有没有端口」判断 | 刷新后记录仍在（索引落盘）、字节已不在（内存），入口却显示可点，用户点了才发现打不开 | 面板新增 `hasBytes(entry)` 逐条判定，宿主用 `fileBytes.has(id)` 回答 | `宿主逐条回答字节是否还在：刷新后记录仍在时显示需重新选择` |
| **保存/导出进行中仍可写入**（本轮新增） | 新建/复制/恢复/File Info 写入在 `freezing`/`saving` 阶段仍被接受：产物对应的修订与用户看到的画面不一致 | 域会话统一走 `planFileWrite`（导出 → 保存/待重试 → 草稿 → 缺文档），只读查询不受影响 | `write-gate.test.ts` 6 条 + `workspace.test.ts` +5 条 |
| 先发起的打开后完成会抢走呈现（本轮新增） | 打开/重开是异步的（解码 + WASM + 入场）；慢的那次如果无条件提交导航，会把用户刚切的文档挤掉 | `enterDocumentPresentation` 用 `RequestSequence` 发号；被取代时不提交导航，但**文档仍算打开**（tab 保留） | `write-gate.test.ts` 请求序号 4 条 |
| **保存工程后重开仍是旧内容**（本轮新增） | 「最近文件 ▸ 重开」用的是宿主内存里的字节；打开时存的是打开那一刻的内容。用户保存工程后磁盘内容已前进，而 `fileBytes` 没更新——重开成功、名字对、画面却是保存前的，属于静默给错内容 | 保存工程（可信写入与仅发起下载两种结果）后，用**与当前修订一致**的冻结产物替换宿主字节（`heldBytesAfterSave`）；编辑未保存时不替换，避免跳到中间状态 | 协议 `heldBytesAfterSave` 4 条（同修订替换 / 未保存不替换 / 无产物无文档不动 / 空字节不替换） |
| **最近文件落盘失败的提示从未显示**（本轮新增） | 索引写失败只置自己的 `lastError`，工作区快照没有这个字段、面板也没有入口：记录看起来正常，刷新后全部消失，用户以为功能坏了 | 工作区快照增加 `recentFilesError`，经 overlay/pane/App 下传到面板；空列表与非空列表都如实显示「仅本次会话保留」或「记录已损坏」 | 宿主工作区快照 1 条 + 面板 3 条（空/非空显示、正常时不渲染） |
| **文档忙碌时按钮谎称「需重新选择」**（本轮新增） | 重开按钮把「字节不在」与「有草稿/正在保存」都写成「需重新选择」：字节明明还在，用户却以为文件丢了、跑去重新选文件 | 文案下沉为协议纯规则 `reopenRecentLabel`：只有 `bytes-released` 才是「需重新选择」，忙碌仍是「重开」并显示要先结算的原因 | 协议 3 条 + 面板 2 条（忙碌仍是「重开」、字节不在才「需重新选择」） |

复制原先只测到「组」，而 spec 的成功证据点名「含**组/蒙版**文档」。现已在原生测试与真 WASM 冒烟里都加上图层蒙版，并断言副本打开后确实自带蒙版（先加蒙版、再验证前提成立，避免空断言）。

另外补齐两处 U02/U04 的入口缺口：新建面板增加「选择图像文件」（`createDocumentFromImage` 此前只有
会话、没有界面入口），并用真实编码器逐格式验证选择器 `accept` 列表与实际可解码格式一致。

还有一处**验证缺口**（不是代码缺陷）：元数据「保存/导出按格式支持矩阵保留或报告损失」原先只有
对上游 `FormatCaps` 的阅读结论，没有真实编码器证据。已补两条原生回归，用真实导出 + 真实导入确认
`.pcraft`/PNG/JPEG/WebP/TIFF 保留 File Info、OpenRaster 确实丢弃，使界面提示与落盘结果不可能互相矛盾。

## 本轮补充（U04 宿主接线、写入门禁与设备项）

上一轮遗留的三处实现空白（最近文件字节引用、写入门禁/请求序号、能力矩阵与地图）已按授权直接补完：

1. **最近文件真正可重开**（原阻塞 6）。索引规则在协议域（`recent-files.ts`），**字节由宿主持有**：
   Woohaa 用 `RecentFilesIndex`（`localStorage` 持久化、写失败降级为「仅本次会话」）+ `fileBytes`，
   dev 用内存索引 + 内存字节表。关键修正：打开文件时控制器是异步建好的，此刻
   `currentView().document` 仍为 null——**直接记录会静默漏掉每一条**；改为
   `trackDocumentWhenReady` 等第一份带文档的视图出现再记录真实画布尺寸，关闭/发布时取消。
   关闭文档**不**立刻丢字节（否则重开入口永远「需重新选择」），改按「仍打开 ∪ 仍有记录」的
   预算收敛（`planReleasedBytes`）；发布到画布（文件→节点）与用户移除时同步释放。
   面板用 `hasRecentBytes` **逐条**回答「现在还有字节吗」，刷新后记录仍在而字节已不在时不再显示可点。
2. **写入门禁与请求序号**（3.3）。此前保存/导出进行中仍可新建、复制、恢复、写 File Info，
   产物对应的修订与画面不一致；现在统一走 `planFileWrite`（导出 → 保存/待重试产物 → 草稿 →
   缺文档，顺序即提示优先级），只读查询不受影响。宿主 `enterDocumentPresentation` 用
   `RequestSequence` 发号：准备期间被更新请求取代时不提交导航（文档仍算打开，只是不抢呈现）。
3. **导出预设入口**（不越界）。`export-bridge.ts` 只以鸭子类型消费
   `controller.features.io.exportPresets()`；缺失返回 `EXPORT_PRESET_UNAVAILABLE` 并禁用，
   不复制任何导出设置类型或规则——避免形成第二份导出规则。
4. **能力矩阵与地图**。`notes/capability-matrix.md` 新增 P8 段（逐项写明命令/入口与暂缓项），
   `docs/code-map/photocraft.md` 新增本域小节与 `recent-files-index.ts` 行；`codemap:check` 通过
   （11 篇文档、1361 个本地链接）。

### 再一轮：最近文件的三处「看起来能用、实际给错结果」缺陷

上一轮接通链路后复核「保存 → 重开」与失败降级，又发现三处只有连起来才暴露的问题（已修复，各补回归）：

1. **保存工程后重开仍是旧内容**。宿主内存里的 `fileBytes` 是**打开那一刻**的字节；保存后磁盘内容
   已前进但没有回写，于是「最近文件 ▸ 重开」会成功打开、名字也对，画面却是保存前的。现在保存工程
   后（`written` 与 `download-started` 两种结果都算）用**与当前修订一致**的冻结产物替换
   （`heldBytesAfterSave`）；编辑过但未保存时不替换，避免重开跳到中间状态。
2. **落盘失败的提示从未显示**。`RecentFilesIndex.lastError` 只写在自己身上，工作区快照没有这个字段：
   界面看起来一切正常，刷新后记录全消失。现在快照带 `recentFilesError`，经 overlay → pane → App →
   面板下传，空列表与非空列表都如实说明「仅本次会话保留」或「记录已损坏」。
3. **文档忙碌时按钮谎称「需重新选择」**。重开按钮曾把「字节不在」与「有草稿/正在保存」都写成
   「需重新选择」——字节明明还在，用户却以为文件丢了并跑去重新选文件。文案下沉为协议纯规则
   `reopenRecentLabel`：只有 `bytes-released` 才是「需重新选择」，忙碌仍是「重开」并显示先结算的原因。

两处纯规则（`heldBytesAfterSave`、`reopenRecentLabel`）放在协议域而不是宿主，因为 dev 与 Woohaa
都需要同一份判断；宿主只保留「什么时候调用」的时序。

## 实现到验收的逐项矩阵

生产命令/参数 → 包装 → WASM → UI 入口 → 内容/核验 → 验收状态。

| 子能力 | 生产命令与参数 | Rust 包装 | WASM 导出 | UI 入口 | 内容/身份 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| U01 新建空白 | `file.new` `{width,height,resolution,mode,depth,background,name}`；预检单边 ≤8192、像素 ≤67108864、ppi 1–30000、RGB/U8、背景 white/black/transparent/#hex | `Editor::create_document`（先过 `require_no_stroke`/`require_no_tool_draft`/`require_no_document`，再 `execute`，末了簿记 `document.recent.add`） | `WasmEditor.createDocument(paramsJson)`；`createDocumentBytes`（候选实例建文档 + `saveProject`） | 「文件 ▸ 新建…」菜单 → 「图像 › 新建文档、预设与最近…」面板（宽高/分辨率/背景/尺寸预设/名称）；提交后经 `onRequestDocumentSlot` 落成新标签 | 新建即基线（`dirty=false`）；参数预检在提交文档前完成；新标签由既有打开路径建立，当前文档与撤销栈不受影响 | **完成**（域 + 宿主 + dev）；真实界面证据待 4.2 |
| U01 尺寸预设 | 纯数据 `SIZE_PRESETS`（6 条，打印项带 DPI），不写文档 | — | — | 面板「尺寸预设」下拉 | 只改表单，不造内容变化 | 完成 |
| U02 从图片新建 | 图片字节 + 名称；`open_image` 既有解码校验 | `Editor::create_document_from_image` | `WasmEditor.createDocumentFromImage` | 新建面板「选择图像文件」+「从剪贴板新建」（用户显式授权读取；不读 File.name 当路径） | 解码失败不留半成品；名称去空白，空值落「剪贴板图像」 | **域内完成**；png/jpeg/webp/tiff/bmp/gif 与剪贴板 6 个 MIME 均逐格式原生验证 |
| U02 整份复制 | `duplicateDocumentBytes(name?)` → 自包含 `.pcraft` | `Editor::duplicate_document_bytes`（克隆文档 + `save_to_bytes` + 缩略图） | `WasmEditor.duplicateDocumentBytes(name)` | 「图像 › 文档副本与恢复…」，字节经本地下载交付 | 不改原文修订/hash/dirty；副本独立且保留层树**与蒙版** | **域内完成**；打开副本为第 2 个标签需槽位（见阻塞 1） |
| U03 恢复保存基线 | 工程字节 + baseAssetId | `Editor::restore_saved_baseline`（`is_pcraft` → `project_verify::verify` → `load_from_bytes` → `session.edit("Revert")`，保留 id/名称，清 registry，`saved_revision = revision`） | `WasmEditor.restoreSavedBaseline(bytes, baseAssetId)` | 「文档副本与恢复…」面板（工作区基线或用户重新选择 `.pcraft`） | 一步可撤销；恢复后净变化清零；非工程/损坏/空字节拒绝且不改现场 | **内核+会话+面板完成且入口可达**（原为永久禁用，见缺陷表） |
| U03 关闭全部/其他 | 纯规则 `planCloseAll` / `planCloseOthers` / `runClosePlan` | 无（它们**不是**内核命令：上游只有单文档 `file.close`） | 无 | 「文件 ▸ 关闭其他 / 关闭全部」→ 宿主 `closeOtherDocuments`/`closeAllDocuments` | 计划只计算顺序与未保存项；宿主逐文档串行结算，活动项不移动、首个失败即停止并保留其余文档 | **完成**（规则 + 宿主执行 + 菜单入口 + 回归） |
| U03 另存工程副本 | 复用 io 域交付（`file.exportPng`/工程保存） | — | — | — | — | **不在本域**；本域不复制第二份实现 |
| U04 新建预设 | `document.presets.list/save/delete`；save 需 `{name,settings}`，name 去空白 1–255，settings 走同一尺寸/模式/分辨率/背景上限 | `Editor::document_presets` | `WasmEditor.documentPresets(action, paramsJson)` | 新建面板内的「新建预设与最近」 | 本机簿记，不进内容/历史/修订；经 `DocumentPresetStorage` 端口跨会话保留 | 完成（域内，端到端可用且可持久化） |
| U04 最近设置 | `document.recent.list/add`；`settings` 同上限；最新在前、去重、最多 20 | `Editor::recent_documents` / `record_recent_document` | `recentDocuments()` / `recordRecentDocument(settingsJson)` | 同上 | 簿记，不造 dirty；经同一端口跨会话保留 | 完成（设置层面）；「重开真实字节」需宿主字节引用（见阻塞 6） |
| U04 File Info | `file.fileInfo` 已知 8 字段 + 只读 `camera`；单字段 4096、关键字 256×256、累计 64Ki、版权状态枚举；未知键拒绝 | `Editor::file_info` | `WasmEditor.fileInfo(paramsJson)` | 「图像 › 文件信息…」面板 | **元数据不进内容 hash**，但属可保存内容（`dirty` 变 true）；写入一步可撤销；只读查询不增历史；空串真实清空；**工程保存/重开与整份复制均保留** | 完成（域内） |
| U04 导出参数预设 | 由 `features/io/` 唯一持有 | — | — | — | — | **不在本域**；依赖 `2026-10-22-add-photocraft-raster-interchange` |
| U04 元数据损失矩阵 | 纯数据 `FILE_INFO_FORMAT_SUPPORT` + `describeFileInfoLoss` / `fileInfoFormatOf` | — | — | File Info 面板内的「损失预览目标」选择器 | 矩阵逐项核对上游 `FormatCaps`（`codecs/src/format.rs`）与 `fidelity.rs` 警告；只声明真实行为 | 完成 |

命令门：本域启用 `file.new`、`file.close`、`document.presets.list/save/delete`、
`document.recent.list/add`、`file.fileInfo`。**刻意未启用** `file.revert`、`file.closeAll`、
`file.closeOthers`（缺原生保存路径与整会话文档槽位），由 `tests/features/files/domain.rs`
的 `new_commands_are_enabled_and_native_only_ones_stay_closed` 断言。

核验器贡献（`rust/crates/project-verify/src/features/files/`）保持返回 `None` 的直通实现：
本域不新增图层种类、不新增可持久内容字段（File Info 走上游既有 `Document::metadata`，其预算由
共享 `MAX_ENTRY_*`/`MAX_PROJECT_BYTES` 覆盖），因此没有可独立校验的域内结构。为空构造检查而
编造一条「只为有贡献」的规则会制造假覆盖，故不添加。

## 实际执行的检查与结果

全部在本工作树（`photocraft/`，HEAD `b0cd6cbc`，含未提交改动）执行。

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm -C packages/protocol run typecheck` | 通过 | 无输出 |
| `pnpm -C packages/protocol exec vitest run` | **104 passed / 5 files** | 含本域 `document-workflow.test.ts` 15 条 + `recent-files.test.ts` 19 条 |
| `pnpm -C packages/editor run typecheck` | 通过 | 无输出 |
| `pnpm -C packages/editor exec vitest run` | **414 passed / 51 files** | 全绿；本域 136 条（`vitest run src/features/files`）。`src/features/boundaries.test.ts` 的 `FEATURE_SECTIONS` 数量断言已按实际入口更新（12 → 15，本域新增 3 个），断言本身保留为真实不变量 |
| `cargo test --manifest-path rust/Cargo.toml -p photocraft-embed-editor --offline features::files` | **29 passed; 0 failed** | 本域原生回归全绿，无本域 warning |
| `cargo test --manifest-path rust/Cargo.toml --workspace --offline` | **309 passed; 0 failed** | 逐 target：editor-core lib 230、contract_fixture 4、editor 13、interaction_state 25、project-verify lib 8、limits_agree 1、native_binary 3、smart_source 10、verify 15，其余 doc-test 0。剩余 2 条 warning 位于兄弟域（`layers/contour_presets.rs`、`painting/brush_library.rs`），非本域引入 |
| `pnpm run wasm` | 通过 | 产物 `packages/editor/dist/wasm`：wasm 17.38 MiB、glue 97.6 KiB |
| `pnpm run verifier` | 通过 | `dist/bin/photocraft-project-verify` 3.83 MiB |
| `pnpm run features:check` | 通过 | WASM 命令表比基线多 6 条本域命令，已按实际导出追加到 `notes/feature-boundary-baseline.json` 的 `allowedCommands` 与 `notes/feature-boundary-wasm-baseline.json` 的 `commands`（两个文件各 +6，其余字段不变）。其余非命令字段（build、capabilities、8 个内容/状态快照、undo/redo/cancel 结果、错误列表、PNG 字节、工程长度、内容 hash）仍与基线**完全一致** |
| `pnpm boundary:check` | 通过（6 tests） | 首次失败仅因本工作树缺 gitignored 的 `artifacts/`、`logs/` 输出目录；`mkdir -p artifacts logs` 后通过 |
| `pnpm codemap:check` | 通过 | 47 个 manifest、11 篇文档、1361 个本地链接、8 个模块入口清单 |
| 共享文件摘要（`notes/feature-boundary-baseline.json` 的 `sharedFiles`） | **5/5 一致** | `project-limits.json`、`contract.json`、`identity.rs`、`Cargo.lock`、`pnpm-lock.yaml` 的 SHA-256 全部未漂移，证明本 change 未改共享门禁文件 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 | 内核替身已补齐本域 8 个新方法（`createDocument`/`createDocumentFromImage`/`duplicateDocumentBytes`/`restoreSavedBaseline`/`fileInfo`/`documentPresets`/`recentDocuments`/`recordRecentDocument`），无条件转发桩；本轮新增的 `recentFilesError` 端口也已在快照/overlay/pane/App 全链路通过类型检查 |
| 宿主回归（`integrations/woohaa`，35 files） | **299 passed** | 用等价 React 别名配置执行（仓库内 `vitest.config.ts` 把别名硬编码到本工作树不存在的 `node_modules/.pnpm/react@18.3.1/...`，属环境差异）。等价配置只把 React/ReactDOM 两条别名指向 `node_modules/.pnpm/node_modules/react[-dom]`，其余字段逐项相同；该临时配置**未留在工作树**。包含 `tests/photo-editor-app.test.tsx` 55 条、`tests/recent-files-index.test.ts` 20 条、`tests/image-editor-overlay.test.tsx` 6 条。本轮加入最近文件落盘诊断与保存后字节刷新后仍为 **299 passed**（新增用例放在协议与 editor 包，宿主侧只加字段） |
| 独立 dev 宿主（`dev`，1 file） | **9 passed** | `pnpm -C dev run typecheck` 通过；`dev-workspace.test.ts` 覆盖 A/B 槽位与剪贴板 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 无法按仓库脚本执行 | 环境差异，与本 change 无关：仓库内 `vitest.config.ts` 把 React 别名指向本工作树不存在的 `node_modules/.pnpm/react@18.3.1/...`。改用等价的 `node_modules/.pnpm/node_modules/react` 别名后，同一套用例 **299 passed / 35 files** 全绿（见上一行） |
| `node tests/features/files/wasm-smoke.mjs`（**真实 WASM 产物**） | 通过 | 在 Node 里实例化 `packages/editor/dist/wasm` 的**真实**二进制（不渲染、不取帧，因此不需要 GPU 与显示会话），覆盖：7 条启用命令的允许清单 + `file.revert`/`file.closeAll`/`file.closeOthers` 仍关闭、新建真实尺寸/DPI/背景与第二份文档拒绝、File Info 一步历史与**重复提交不新增历史**、预设/最近接受界面参数形状（同名与未知操作被拒）、整份复制不改原文 hash/修订、恢复基线与坏字节拒绝。这条补上了「原生静态库 + jsdom 替身」都覆盖不到的 WASM 边界 JSON 形状 |
| `openspec validate 2026-10-22-add-photocraft-file-workflows --strict` | 通过 | `Change ... is valid` |

渲染、真实 WASM 帧率、真机主线：**未执行**。但本域的命令语义已在**真实 WASM 产物**上验证
（`tests/features/files/wasm-smoke.mjs`，不渲染也不取帧，因此不需要 GPU），见上表。

## 新增回归覆盖（只覆盖本 change 涉及的范围）

| 文件 | 条数 | 覆盖 |
| --- | --- | --- |
| `tests/features/files/domain.rs` | 29 | U01 真实尺寸/DPI/背景、可绘画并保存重开、非法尺寸/模式/位深/额外键、第二个文档拒绝、默认名；U02 图片字节建文档、**6 种可选格式与剪贴板 6 个 MIME 逐一向量解码**、损坏字节不留半成品且可重试、复制自包含且与原文互不影响、**副本保留图层蒙版**、关闭源后副本可用、显式名称与超长拒绝；U03 恢复保留身份/名称、净变化清零、撤销重做、非工程与损坏容器拒绝、无文档拒绝；U04 File Info 往返/一步撤销/只读不增历史/各拒绝条件/元数据不改内容 hash/**空串真实清空**/**无变化不新增历史**/**保存重开与整份复制保留**/**按格式矩阵保留与丢弃经真实编码器验证**、**界面同形的预设与最近设置一次通过内核**、预设保存列出删除与同名/非法设置拒绝、未知操作稳定 code、最近设置去重有序有界与上限拒绝；命令门（启用项 + 刻意关闭项）；四类草稿门禁；稳定错误码 |
| `packages/protocol/src/features/files/document-workflow.test.ts` | 15 | 新建参数校验（整数/越界/超像素/模式/位深/背景/名称/非对象）、尺寸预设合法性与唯一性、**打印预设自带 DPI 而屏幕预设不带**；版本化预设/最近存储的逐条容错、未知版本与损坏 JSON 拒绝、名称唯一与不可变入参、最近去重有界、编码往返、**`localStorage` 适配正常读写/配额失败/无 `localStorage` 三种环境**；关闭其他/全部计划、首个失败停止并保留后续、第 9 个槽位拒绝 |
| `packages/editor/src/features/files/model.test.ts` | 19 | 新建/图片来源/恢复报告解码（含「报告与内核状态不一致」拒绝）、参数→内核键映射（**预设/最近不含 `name`**）、预设/最近逐条容错与上限、File Info 已知字段/单串关键字拆分/超限整体拒绝/表单往返/只提交存在的字段/**无变化按内核语义判定**、候选会话槽位判定 |
| `packages/editor/src/features/files/workspace.test.ts` | 29 | 缺句柄统一 unavailable 且零内核调用；草稿门禁覆盖新建/图片来源/复制/恢复；新建成功透传参数并回读真实尺寸，**且同步一次工作区视图（否则界面停在「未打开文档」）**；**从图像新建同样同步视图**；**视图同步失败不谎称成功**；`invalid-message` 转换；内核失败原样返回 code；空字节/无文档提前拒绝；复制不推进基线；恢复空基线拒绝、成功时 `establishBaseline` 并透传 assetId、坏报告不推进基线；File Info 只读不推进、无文档拒绝、非法表单前置拒绝、合法表单一步写入；预设保存后重新列出而非本地猜测、**保存的 settings 不夹带文档名**、内核拒绝时不追加 list；最近记录只传内核认识的键 |
| `packages/editor/src/features/files/panels.test.tsx` | 37 | 新建面板提交参数与「内核实际结果」文案、非法输入本地拒绝并保留输入、**冷启动先加载内核再新建 / 加载失败如实报错且不调用内核**、内核失败显示原因、最近簿记失败如实提示、**新建后「最近」列表立即重读内核**、缺槽位禁用、**从图像文件新建（成功含警告 / 失败不伪造）**、**从剪贴板新建 / 剪贴板不可用时不调用内核**、**打印预设同步 DPI**；File Info 加载/相机只读块/写入后重读/读取失败提示/精简宿主不渲染/**损失预览按目标格式报告**/**无变化提交如实说明未新增历史**；预设与最近列表、删除失败保留原因与原列表、使用回填、无当前设置时拒绝保存、**保存后落盘并报告已持久化 / 写失败降级为仅本次会话 / 启动回灌与坏存储提示 / 新建后落盘且重挂载可恢复**、**新建与预设共用一份设置**；副本生成报告字节数并**真的交付下载**、**交付失败时如实报错不谎称成功**、无基线禁用恢复、**重新选择工程文件后恢复可用 / 空文件被拒**、有基线恢复失败保留原因；三个入口装配 id、`advanced` 位置、`图像` 菜单归组与 `FEATURE_PANELS` 导出；**精简宿主缺最近簿记时仍可新建且不落盘报错**；已有文档时新建入口直接说明需要独立槽位 |
| `packages/editor/src/features/files/clipboard.test.ts` | 7 | 取到图像返回字节与展示名、跳过文本项、无 API / 权限拒绝 / 其它拒绝 / 只有文本 / 为空 / 读不出 / 空字节续找下一项——每类失败都给出可操作原因 |
| `packages/editor/src/features/files/download.test.ts` | 3 | 字节交给一次下载并释放 URL、空字节与无 `URL.createObjectURL` 明确拒绝、文件名去路径/控制字符并补齐 `.pcraft` |
| `tests/features/files/wasm-smoke.mjs` | 1 个脚本 | 在**真实 WASM 产物**上跑本域生产命令（不需要 GPU）：命令门启用/关闭项、新建与拒绝第二份文档、**独立槽位字节往返（尺寸/DPI/图层完整）**、File Info 一步历史与无变化、预设/最近参数形状与拒绝、**整份复制不改原文且副本保留蒙版**、恢复基线与坏字节拒绝 |
| `packages/editor/src/features/files/slot-limit.test.ts` | 4 | 本域不再导出一份自己的标签上限（防重复回归）、用共享工作区真值时上限前后行为一致、拒绝原因里的数字随传入上限变化（写死 8 会失败）、非法上限被拒 |
| `packages/editor/src/features/files/panel-context-contract.test.tsx` | 4 | 外壳只读信号契约：没有文档且 `locked=true`/`readonly=false` 时新建入口**必须可用**（真实首启组合）、真正只读时禁用、有文档时给出槽位原因、操作当前文档的面板仍按 `locked` 禁用 |
| `packages/editor/src/features/files/write-gate.test.ts` | 10 | 写入门禁：导出冻结 / 保存中 / 待重试产物 / 草稿 / 缺文档各自拒绝、**优先级顺序**（导出与保存先于草稿与缺文档）、精简宿主省略阶段字段时放行；请求序号：旧请求被识别为非最新、不同 key 互不影响、作废后在途请求失效、从 0 计 |
| `packages/editor/src/features/files/workspace.test.ts`（本轮 +5） | 29 | 新增：`freezing`/`saving` 阶段拒绝新建/复制/恢复/元数据且**零内核调用**、待重试产物同样拒绝、拒绝原因不误报「没有文档」、只读查询（File Info 读取、预设列表）不受导出/保存影响 |
| `packages/editor/src/features/files/panels-slots.test.tsx`（本轮 +5） | 15 | 新增：宿主**逐条**回答字节是否还在——记录仍在而字节已释放时按钮显示「需重新选择」且不可点，仍有字节的那条可真正重开；索引落盘失败在空/非空列表都显示「仅本次会话」，落盘正常时不渲染；**文档忙碌时按钮不谎称「需重新选择」**（字节还在，只是要先结算） |
| `packages/protocol/src/features/files/recent-files.test.ts` | 19 | 最近文件纯规则：版本化快照往返、逐条丢坏记录、按 id 去重并刷新时间、条数上限、**累计字节预算从最旧逐出且新条目永远保留**、移除、`planReopenRecent` 的 not-found / bytes-released / document-busy 三种原因、**重开按钮文案**（字节不在才叫「需重新选择」，忙碌仍是「重开」）、`heldBytesAfterSave`（修订一致才替换宿主字节，空字节/无文档/未保存不替换） |
| `packages/editor/src/features/files/export-bridge.test.ts` | 8 | 导出预设端口：提供方缺失时 `available:false` 并给出统一原因、返回非列表拒绝、渲染安全收窄（非对象/空名/超长/同名）、格式读取、保存/删除可选且原因原样上抛、抛错转成原因 |

本域可独立计数的回归合计 **136 条 editor + 34 条 protocol + 29 条 Rust**（`packages/editor/src/features/files`
全量 136：model 19、workspace 29、panels 37、panels-slots 15、clipboard 7、download 3、slot-limit 4、
panel-context 4、write-gate 10、export-bridge 8）；另有宿主 20 条最近文件索引、2 条 overlay 端口贯通、
1 条 `photo-editor-app`、1 条 `project-editor-pane`、`document-session.test.ts` 的 2 条新增断言、
1 条 dev 槽位，以及 1 个真 WASM 冒烟脚本。子项目全量：editor 414、protocol 104、verifier 40；
宿主全量 299（35 files）；dev 9。

本轮新增/扩充的具体回归：

| 位置 | 增量 | 覆盖 |
| --- | --- | --- |
| `features/files/workspace.test.ts` | +3 | `createDocumentBytes`：已有文档时仍能产出字节且**当前会话零写入**（`createDocument` 未被调用、`afterWrite` 未触发）、空字节如实失败、非法设置在校验阶段拒绝且不加载候选实例 |
| `features/files/panels.test.tsx` | +2 | 宿主提供槽位时改走字节交付（不得在本会话再加一份）、槽位交付失败不谎称已打开 |
| `photo-editor-menu.test.ts` | +5 | 「文件」菜单只在有能力时渲染；`新建…` 排在最前且不依赖已有文档；`关闭其他/全部` 在 `关闭` 之后；缺能力不渲染死项 |
| `photo-editor-chrome-menu.test.tsx` | +4 | 菜单栏的「新建」只看**真正只读**信号：无文档（`readonly` 含无文档）时可用、真正只读时禁用、未提供信号时回退到 `readonly`（精简宿主行为不变）、非只读时可用；同时确认 `打开文件…` 沿用既有 `readonly` 语义未被动到 |
| `integrations/woohaa/tests/project-editor-pane.test.tsx` | +1 | 独立文件 `.pcraft` 走 `openProject`，不经过位图归一化（回归「保存工程 → 重开」主链） |
| `integrations/woohaa/tests/document-session.test.ts` | +2 断言 | `openMode()` 对工程/位图分别声明 `project`/`image` |
| `integrations/woohaa/tests/photo-editor-app.test.tsx` | +1 | 真实外壳里「文件 ▸ 新建…」能展开新建表单，且提交按钮在无文档时**可用** |
| `dev/src/dev-workspace.test.ts` | +1 | 占用另一个槽位不改变保留文档的名称/内容指纹/修订 |
| `tests/features/files/wasm-smoke.mjs` | +1 段 | 候选实例 → 自包含字节 → 独立文档：120×80/300ppi/图层 2→3 完整保留、可继续编辑 |
| `features/files/write-gate.test.ts`（新） | +10 | 写入门禁六种判定与优先级；请求序号「只有最新能改变呈现」、不同 key 隔离、作废即失效 |
| `features/files/workspace.test.ts` | +5 | 导出/保存中拒绝写入且零内核调用、待重试产物同样拒绝、原因不误报缺文档、只读查询不受影响 |
| `features/files/panels-slots.test.tsx` | +5 | 逐条字节判断：记录在而字节没了 → 「需重新选择」不可点；仍有字节 → 真正重开；落盘失败在空/非空列表都显示「仅本次会话」，正常时不渲染；**忙碌时按钮仍是「重开」**（不谎称文件丢失） |
| `integrations/woohaa/tests/recent-files-index.test.ts`（新） | +20 | 索引记录/预算/持久化/坏快照/写失败降级；`planReleasedBytes` 4 条；`trackDocumentWhenReady` 3 条（实时/延迟/取消）；工作区快照带最近文件 2 条 |
| `integrations/woohaa/tests/image-editor-overlay.test.tsx` | +2 | 最近文件端口贯通到面板；宿主不提供时不伪造空索引 |
| `packages/protocol/src/features/files/recent-files.test.ts`（新） | +7 | 本轮新增：重开按钮文案 3 条（可直接重开/字节已释放/忙碌仍是「重开」）、`heldBytesAfterSave` 4 条（同修订替换、未保存不替换、无产物或无文档不动、空字节不替换） |
| `features/files/export-bridge.test.ts`（新） | +8 | 导出预设端口缺失/非列表/渲染收窄/可选写操作/抛错转原因 |

## 集成阻塞（本 change 无法自行完成，需集成负责人）

1. **独立文档槽位与标签注册**（影响 2.1/2.2/2.3 的「注册独立文档」「副本成为新文档」「最多 8 文档」验收）——**已接通**。
   `Editor::create_document` 仍要求候选实例（无活动文档），这条内核约束没有放宽；落地方式是
   域内 `createDocumentBytes` 在**独立候选实例**上建文档并 `saveProject()` 成自包含 `.pcraft`，
   由宿主既有打开路径落成新标签，因此不需要给本域开第二份文档状态，也不需要改
   `document-session.ts` 的文档模型。宿主侧新增 `openBlankDocument`（复用 `canOpenDocument`
   的上限 8 与 `enterDocumentPresentation`），`文件 ▸ 新建…` 与面板共用 `onRequestDocumentSlot`。
2. **`file.closeAll` / `file.closeOthers` / `file.revert`**——前两项**已接通执行**，`file.revert` 仍暂缓。
   关键事实（已逐条核对上游 `commands.rs`）：上游只定义单文档 `file.close`，**没有**
   `file.closeAll`/`file.closeOthers` 命令，因此它们不该进入内核命令白名单，也不该按「命令门
   没打开」来描述。批量关闭的真实语义是工作区逐文档串行结算：宿主 `closeAllDocuments` /
   `closeOtherDocuments` 用本域 `planCloseAll`/`planCloseOthers`/`runClosePlan` 执行——活动项不移动、
   有未保存项先确认、首个失败即停止并把其余文档留在原状；「文件」菜单已有入口。
   `file.revert` 仍需 `can_revert` 的原生路径，属本 change 明确非目标，保持关闭。
3. **文件菜单槽位**——**已接通**。`EditorDocumentsMenu` 增加 `onNewDocument`/`onCloseOthers`/`onCloseAll`，
   `editorMenusFor` 只在宿主提供对应能力时渲染，`photo-editor-chrome.tsx` 显式分派到各自动作
   （原先的 `default:` 分支会把未知项当成「关闭」，已改为显式列举 + 无副作用默认）。
   `新建…` 直接展开高级面板里的新建区，复用**同一份**带完整表单的组件，不新增第二套对话框。
   仍不在本 change 内：把面板迁进 Dialog 属宿主产品决定，需要外部输入。
4. **共享测试与基线计数**——**已按实际导出更新**。`features/boundaries.test.ts` 的
   `FEATURE_SECTIONS` 计数 12 → 15；两个 `notes/feature-boundary-*.json` 各追加 6 条命令
   （185 → 191）。`features:check` 通过，`sharedFiles` 的 5 个摘要 5/5 未漂移。
5. **宿主内核替身与 `EditorInstance` 类型**——**已补齐**。新增 8 个方法后，
   `integrations/woohaa/tests/editor-workspace.test.ts` 的替身已补齐同名桩；本轮又为
   `photo-editor-harness.tsx` 补了 `features.files` 与新增 props（`documents`、
   `onRequestDocumentSlot`）。宿主 typecheck 与 299 条测试均通过。
6. **最近文件「重开真实字节」**——**已接通**。索引是协议域纯规则（版本化快照、去重、条数 + 累计
   字节双预算逐出、`planReopenRecent` 三种失败原因），**字节由宿主持有**（Woohaa `fileBytes` /
   dev 内存表），本域不缓存内容、不把 `File.name` 当路径权限。三个真实时序缺口都已修并有回归：
   打开是异步的（视图未就绪直接记录会**静默漏掉每一条**）、关闭即丢字节会让重开永远「需重新选择」、
   只按「有没有端口」判断会让刷新后的旧记录显示可点。宿主持久化与字节释放策略仍由宿主决定
   （浏览器不授予路径权限），界面逐条如实显示「需重新选择」。
7. **新建面板在真实外壳里的只读信号**（**已修复**）。原先共享 `photo-editor-app.tsx` 用
   `locked = … || !documentView` 一个布尔既表示「只读/忙碌」又表示「没有文档」，本域三个面板
   都以 `readonly={locked}` 挂载：

   - 没有文档时（**唯一允许新建的状态**）`locked = true` → 新建按钮与表单全部禁用；
   - 已有文档时 `locked = false`，但本域按「一个会话一个文档槽位」拒绝新建；
   - 于是两态都不可用。

   修复把语义拆开：`FeaturePanelContext` 新增 `readonly`（真正不可写：只读/关闭中/忙碌/
   过渡/导出中/模态，**不含没有文档**），外壳里 `locked = panelReadonly || !documentView`。
   只有新建入口改用 `readonly`，操作当前文档的面板（副本/恢复、文件信息、以及其余 15 个域）
   继续用 `locked`，语义不变。同时「高级…」按钮改用 `panelReadonly`，否则没有文档时连高级区
   都打不开。回归：`features/files/panel-context-contract.test.tsx` 4 条（无文档+locked 可用、
   真只读禁用、有文档给槽位原因、文档相关面板仍用 locked）。
   注意：`locked` 的取值对**其余所有域完全不变**，本次只新增一个字段与 files 域的取用。
8. **「已有文档时新建」已接通**（原阻塞 1）。域内 `createDocumentBytes` 在独立候选实例上建
   文档并序列化成自包含 `.pcraft`；宿主 `openBlankDocument` 复用既有 `canOpenDocument`（上限 8）
   与 `enterDocumentPresentation` 把它落成新标签，当前文档与其撤销栈完全不受影响；
   `文件 ▸ 新建…` 与面板共用同一条 `onRequestDocumentSlot`；dev 宿主落在另一个空槽位，两个
   槽位都占用时如实拒绝。真 WASM 验证字节往返 120×80/300ppi、图层 2→3 完整且可继续编辑。
   仍不在本 change 内：宿主零文档时 `PhotoEditorApp` 不挂载（既有装配架构），首份文档仍由
   「打开文件…」进入。

## 真实 UI 与设备（待人工验证）

独立 dev 与 Woohaa 均需真实匹配 WASM；电脑 1440×1000 和 Pad 正常窗口 1024×768 逐项操作并留
应用内截图，检查菜单/弹层/参数/内容与边界一致性。Pad 窗口走查不代表真实 Pad/数位笔硬件验证。

**本容器不具备条件**：Linux 下 `ls /dev/dri | grep '^renderD'` 无输出（无真实 GPU 渲染设备），
且无图形显示会话，无法运行编辑器界面采集截图或帧率。因此以下项目保持**待人工验证**，
不以软件渲染或估算值代替：

- 4.2 主线：空白新建 → 绘画 → 复制整份 → JPEG/WebP 导出 → 导出工程副本 → 批量关闭，
  含下载取消、损坏文件、第 9 份文档拒绝；
  （注：其中**命令层语义**已由 `wasm-smoke.mjs` 在真实 WASM 上覆盖，缺的是真实界面与设备证据。）
- 新建/恢复/File Info 面板在 1440×1000 与 1024×768 下的布局与可操作性；
- 真实 WASM 下的像素/结构/历史证据与应用内截图。

真机验证时还需外部条件：Photoshop（仅当本 change 影响 PSD 兼容项时需要可编辑往返）与数位笔硬件。
原先列出的「独立文档槽位与文件菜单槽位」已在本次接通，不再构成前置。

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 /
证据路径 / 通过或待验证 / 暂缓理由。原生路径保存/恢复、持续目录监听、PSB、ICC/CMYK/HDR 和
依赖未编入 WASM 的解码器暂缓；不承诺所有上游格式双向可用。

本次记录（实现提交：本工作树未提交改动，基线 `b0cd6cbc`）：

| U | 子能力 | 环境 | 结果 | 判定 |
| --- | --- | --- | --- | --- |
| U01 | 新建空白文档（参数、真实尺寸/DPI/背景、可绘画、保存重开） | Linux 容器，原生 Rust 测试（无浏览器） | 本域原生测试 **29 条**（含 U01 各拒绝条件、可绘画与保存重开）与 19 条 TS 解码/会话测试全部通过 | 域内通过；UI 真机待验证 |
| U01 | 尺寸预设（含 A4 300ppi 同步 DPI） | 原生 Rust + jsdom | 通过 | 域内通过 |
| U01 | 第 9 份文档拒绝 / 独立槽位注册 | TS + 真 WASM | 上限判定（`canOpenDocument`/`requestDocumentSlot`）、候选实例字节生成、宿主新标签落地、dev 另一空槽位均有回归；真 WASM 字节往返保留尺寸/DPI/图层 | 通过 |
| U02 | 图片字节建文档、损坏字节不留半成品 | 原生 Rust | 通过 | 域内通过 |
| U02 | 从图像文件新建入口（选择器 → 会话 → 内核） | 原生 Rust + jsdom | 6 种格式逐一向量解码通过；面板成功/失败路径有测试 | 域内通过；真实设备待验证 |
| U02 | 整份复制自包含、原文 dirty 不变、关闭源后可用 | 原生 Rust | 通过 | 域内通过 |
| U02 | 浏览器剪贴板读取 | jsdom + 原生 Rust | 域内 `readClipboardImage` 接入（6 个候选 MIME 经真实编码器验证可解码），四类失败各有原因 | 通过（域内）；宿主若提供受控剪贴板端口可替换实现 |
| U03 | 恢复到已声明基线、身份保留、一步撤销、净变化清零 | 原生 Rust + TS 会话 + 面板 | 通过 | 域内通过 |
| U03 | 浏览器交付不声称写盘 | TS 面板 | 面板文案与 `download-started` 语义由宿主交付层保证，本域不新增写盘声明 | 通过（域内） |
| U03 | 关闭全部/其他串行结算 | TS 纯规则 + 宿主 | 计划与「首个失败停止、保留后续」通过；宿主 `closeAllDocuments`/`closeOtherDocuments` 真正执行，菜单可达 | 通过 |
| U04 | 预设保存/列出/删除，端到端可用 | 原生 Rust + TS | 修复 `name` 夹带缺陷后通过 | 域内通过 |
| U04 | 最近设置最新在前/去重/有界/上限拒绝 | 原生 Rust + TS | 修复同一缺陷后通过 | 域内通过 |
| U04 | 编辑器最近文件（真实字节重开 / 需重新选择） | TS 纯规则 + jsdom + 宿主 | 索引版本化/容错/双预算逐出通过；宿主在视图就绪时记录真实尺寸、关闭保留字节、发布与移除同步释放、**保存工程后替换为重开用的新字节**；面板逐条判定并显示原因，**落盘失败如实降级**、**忙碌时不谎称文件丢失** | 域内 + 宿主通过；真实刷新后的跨会话行为待人工验证 |
| U04 | 写入门禁与请求序号 | TS 纯规则 + 域会话 | 导出/保存/待重试/草稿各自拒绝且零内核调用；只读查询不受影响；旧呈现请求不抢新呈现 | 通过 |
| U04 | File Info 已知字段往返、一步撤销、只读不增历史、空串清空、元数据不改内容 hash | 原生 Rust + TS | 通过 | 域内通过 |
| U04 | 元数据按格式保留/损失报告 | TS 纯数据 + jsdom | 矩阵与上游 `FormatCaps` 逐项一致；面板按所选目标格式报告 | 域内通过；跨格式落盘待 io 域 |
| U04 | 导出参数预设 | — | 本域只提供消费入口（`export-bridge.ts`，缺失即如实不可用）；实现/校验/存储属 `features/io/` | **待验证**：依赖 `2026-10-22-add-photocraft-raster-interchange` 的真实端口（该工作树尚未提交，本工作树无法导入） |

暂缓（明确非目标，不计为完成）：原生路径保存/恢复、持续目录监听、PSB、ICC/CMYK/HDR、
依赖未编入 WASM 的解码器；新建仅支持 RGB/U8。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
