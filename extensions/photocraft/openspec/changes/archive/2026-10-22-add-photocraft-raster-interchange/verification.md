# 验收计划与记录

## 本次状态

本 change 的实施任务（U05 / U06 / U07，含 3.4 的宿主接线与 5.2 的跨域回归）已全部完成，
并在本机可执行范围内跑完全部自动化检查与**真实 Chromium 界面走查**。
仍**不**据此得出的结论列在文末「待人工验证 / 阻塞」：实体 Pad 触控/硬件差异、全局能力登记、
与尚未实现的 sibling 能力交叉验收。原因均为真实原因，不是「无 GPU」的笼统说法。

宿主接线（`dev` 与 `integrations/woohaa`）经用户明确授权越过 `parallel-work.md` 的归属约定，
触及的共享/宿主文件清单见 [tasks.md](tasks.md) 文末，供集成负责人合并前逐项复核。

收尾轮（2026-10-23）按「宿主源码逐项核对」又补了四处**菜单/端口真实不可用**的缺口：
dev 宿主缺 `fileDelivery` 端口（导出 PNG 恒失败且无声）、保存失败变成未处理 rejection、
导出/保存文件名不正确（`sample.png.png`、固定 `photocraft-A.*`）；同时把「置入图片…」的
accept 从硬编码 3 个 MIME 改为与「打开」同源。四处均补了可失败回归并做过反向验证
（见下文「收尾轮：宿主端口缺口」）。

## 必须验证的主线

在真实 WASM 逐格式打开 → JPEG/WebP/TIFF 真实编码预览 → 逐层/按名称资产交付；缺 codec、伪扩展名、包超限和取消分别验证。

每个 U 编号及其子能力分别记录：实际入口/参数、预览、确认/取消、内容 hash/修订/历史、工程往返、核验器结果，以及 spec 中特有的失败条件。只验证菜单存在或只检查命令字符串不算完成。

## 执行记录（2026-10-23，最终轮）

环境：Linux 容器，96 核 / 246 GB，无显示会话；`/dev/dri` 无 `renderD*`（无 GPU）。
界面走查改用 Playwright + 真实 Chromium（headless）：只作证布局与交互主线，**不**作 GPU 结论。

| 命令 | 实际结果 |
| --- | --- |
| `pnpm -C photocraft run check`（build + typecheck + test） | 通过：protocol 81、project-verifier 40、editor **341**（47 文件） |
| `npx vitest run`（`photocraft/dev`，dev 宿主用例不在 `check` 的 test 过滤内） | 通过：**22 用例**（2 文件；含新增 `dev-export.test.ts` 14 项：端口注入、导出不推进基线、保存才推进、失败原因带回、文件名推导、结果→提示映射、端口语义、菜单能力装配（保存返回 Promise / 导出落端口并报结果 / 取消与失败有提示 / 只列已打开文档且切换走门禁）） |
| `npx vitest run src/features/io`（editor 域内） | 通过：8 文件 / **72** 用例（含 `wasm-integration.test.ts` 12 项直接加载真实 `dist/wasm` 的端到端用例，产物缺失时显式 skip；`panel-interaction.test.tsx` 18 项，本轮 +2） |
| `pnpm -C photocraft run rust:test`（`cargo test --workspace --offline`） | 通过：**322 passed**，0 failed |
| `cargo test -p photocraft-embed-editor features::io` | 40 passed（含新增 `save_for_web_reports_the_losses_it_actually_performs`） |
| `cargo test -p photocraft-project-verify features::io` | 2 passed（不主张对象类型；预算不抬高工程上限） |
| `pnpm -C photocraft run wasm` | 通过：`packages/editor/dist/wasm`；13 个新导出出现在 `.d.ts` |
| `pnpm -C photocraft run verifier` | 通过：`dist/bin/photocraft-project-verify` |
| `pnpm -C photocraft run features:check` | 通过：commands / capabilities / errors / 8 组状态与 hash / undo-redo-cancel / PNG 字节与 `bdc3c084` 一致 |
| `pnpm boundary:check`（仓库根） | 通过：`open-closed-boundary.test.ts` 6 passed |
| `pnpm codemap:check` | 通过：47 个 manifest、11 篇文档、**1364** 个本地链接 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过：**35 文件 / 287 用例**（原 275；+8 属宿主接线断言，本轮再 +4：`interchange-menu.test.tsx` 3 项 + `place-file.test.ts` 置入 accept 与打开同源 1 项） |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `npx openspec validate 2026-10-22-add-photocraft-raster-interchange --strict` | valid（从 `photocraft/` 运行） |

真实 WASM 直接驱动脚本（不经 UI，只验证内核与绑定逐项行为，可重跑）：

```sh
pnpm -C photocraft run wasm   # 产物
node photocraft/openspec/changes/2026-10-22-add-photocraft-raster-interchange/evidence/check-interchange-wasm.mjs
```

实测输出（摘，本轮原样复跑）：`hostAcceptParity {kernelExtensions:27, protocolExtensions:27,
extensionsEqual:true, mimesEqual:true, acceptHasTiff:true, acceptHasPcraft:false,
deferredExcluded:true, acceptHasNoProject:true}`；
`matrix.rows {rows:20, open:10, readOnly:3, deferred:7, openable:27}`；
7 组导出 `previewEqualsDelivery: true`、`documentChanged: false`、`contentHashUnchangedByExports: true`；
`export as 99 字节 PNG`；`asset plan ["图标.png"]`；`hasDocumentBeforeOpen false` →
`hasDocumentAfterOpen true`；损坏/空字节被拒。
逐格式打开：`openResults` 13 项全部 `status`/`depth=u8`/尺寸正确（10 项来自自身编码产物、
3 项只读来自手工签名字节）；工程往返 `projectRoundTrip {reencodedEqualsSource: true,
canvasEqual: true, layersEqual: true, nameEqual: true, hashStableAfterReopen: true}`。

> 环境备注（如实记录，不冒充产品结论）：本机宿主测试首次失败的原因是
> `photocraft/integrations/woohaa/vitest.config.ts` 里的 React alias 指向
> `photocraft/node_modules/.pnpm/react@18.3.1/...`，而 pnpm v11 的安装布局未创建该目录；
> 补齐这两个符号链接后测试原样通过。该文件与被测代码都不属本 change，未修改。

> 工程往返的指纹口径（如实记录）：`openRaster` 只做「解码 + 建文档」，**不设置**来源身份
> `baseAssetId` —— 按 D1，来源/保存基线由共享打开链（`EditorWorkspaceController.openImage`）
> 持有。因此「打开后」与「重开工程后」的 `contentHash` 首次不同（重开时宿主回填了来源身份），
> 而一旦在同一 `baseAssetId` 下重开，指纹逐次稳定，像素与结构全程一致。真实 UI 打开已改为主机
> 预检后把原始字节交给内核（见下文「宿主接线」），该落差的成因与宿主路径无关。

## 复核轮次新增（2026-10-23，真实产物复跑）

本轮在复核中**发现并修复**三个真实问题：打开绕过位深准入、宿主把「浏览器不会解码」误报成
「图片无法读取」、Save for Web 谎报「无损失」；同时补齐多处「报告有数据但界面不说」的反馈缺口，
并完成宿主接线与真实浏览器走查。全部结果来自真实产物（`dist/wasm` 重新构建后重跑）。

### 缺陷：打开绕过位深准入

| 项 | 内容 |
| --- | --- |
| 现象 | `openRaster("deep.png", <16 位 PNG 字节>)` **成功**建文档，而同一字节的 `inspectRaster` 明确拒绝（「PNG 的真实位深是 u16；本 change 只开放 RGB/U8，不自动降位深」） |
| 后果 | 预检说不行、打开却收，等于绕过 D2 的「不自动降位深」；用户会拿到一份被共享导入链悄悄转换过的文档 |
| 根因 | `open_raster` 只用 `formats::inspect_raster`（签名级判定）过准入，随后交给 `Editor::open_image` 重新解码 |
| 修复 | 改为 `formats::inspect_raster_decoded`（与预检同一套真实解码准入，共用同一份预算）后再建文档 |
| 反向验证 | 临时回退修复后 `opening_refuses_to_downconvert_what_the_preflight_refuses` 立即失败（`预检拒绝的字节不能被 open_raster 接受`）；恢复后通过 |
| 代价 | 打开多一次解码（准入 + 建文档）。`Editor::open_image` 属共享 core，本 change 不能改签名复用解码结果，已在 tasks 3.0 如实记录 |

真实产物实测（`node` 直驱 `dist/wasm`）：

```
u16 inspect REJECTED: {"code":"import-failed","message":"无法导入图片：PNG 的真实位深是 u16；本 change 只开放 RGB/U8，不自动降位深"}
u16 open    REJECTED: {"code":"import-failed","message":"无法导入图片：PNG 的真实位深是 u16；本 change 只开放 RGB/U8，不自动降位深"}
truncated inspect REJECTED: … Png: malformed data: unexpected end of file
huge inspect REJECTED: … limit exceeded: dimensions 100000x100000 exceed max 8192x8192
```

证据脚本输出（`failureMatrix`，三项 `consistent` 均为 true —— 预检与打开结论一致）：

```
truncated  {inspectRejected:true, openRejected:true, consistent:true}
oversized  {inspectRejected:true, openRejected:true, consistent:true}
16-bit     {inspectRejected:true, openRejected:true, consistent:true}
```

### 补齐：界面不显示内核已给出的信息

| 缺口 | 内核实际数据 | 补齐后 |
| --- | --- | --- |
| 矩阵只显示读写/位深两项 | 行内还有布局、Alpha、扩展名、ICC/EXIF/XMP/DPI/文本/动画/有损 | 全部显示，并带 `data-io-matrix-row` 便于断言 |
| `warnings` 从不显示 | GIF 量化、DPI 被丢弃等**不可逆**损失 | 预览区逐条列出（`data-io-warnings`）；交付提示同样带出损失摘要 |
| 逐层/资产计划的 `rejected` 从不显示 | 超预算、目标层失效的真实拒绝原因 | 与失败项并列显示 |
| 逐层/资产计划的 `renames` 从不显示 | 重名追加序号、非法字符替换、Windows 保留名前缀 | 显示「原名 → 交付名 + 原因」 |

真实数据样例（`node` 直驱内核，图层名 `同名/同名/../escape/a b/CON`）：

```
plan files: _CON.png | a_b.png | _escape.png | 同名.png | 同名-2.png | Background.png
renames:    Windows 保留设备名已加前缀 / 非法文件名字符已替换为 _ / 开头的点已移除 / 重名已追加序号
unsafe(..,/ ,CON): 无
```

### 修正：界面数字与实际交付数字不一致

| 项 | 修正前 | 修正后 |
| --- | --- | --- |
| Save for Web JPEG 质量默认值 | 面板显示 90，内核按 60 编码 | `DEFAULT_WEB_SETTINGS.quality = 60`，与 `WebSettings::default()` 对齐；实测显式传 60 与不传**字节完全相同**（312 字节） |
| `pngCompression` 在 web 模式 | 下拉可见，但 Save for Web 走自己的优化器、该参数被忽略（实测 `none` 与 `best` 均为 99 字节） | web 模式下隐藏该控件，避免给出无效开关 |
| 参数控件与格式能力 | 硬编码「哪些格式有哪些参数」，给 JPEG 显示必然失败的「保留透明」 | 由内核 `exportMatrix.options` 驱动（`supports()`），只显示真正能编码的参数 |

### 补齐：宿主打开端口（U05 的「必要公共端口」）

新增 `controller.features.io.openAccept()`，从**同一份内核矩阵**派生文件选择器需要的 `accept`：

```
accept 扩展名: 27 项（png,apng,jpg,jpeg,jpe,jfif,tif,tiff,webp,gif,bmp,dib,tga,icb,vda,vst,ico,qoi,pnm,pbm,pgm,ppm,pam,pfm,pcx,xpm,dds）
MIME:        13 项
与 matrix().openable 逐项一致: true
```

暂缓格式（EXR/HDR/Cineon/FITS/DPX/AVIF/HEIF）**不入列**——放进 accept 只会让用户选中后立刻被拒绝。
宿主此前硬编码 `image/png,image/jpeg,image/webp`，这正是 U05 新格式在宿主里选不中的原因。
`workspace.test.ts` 覆盖 3 条：只列可打开项、矩阵无可打开行时明确失败、旧内核沿用
`capability-disabled`。

### 补齐：宿主接线（dev 与 Woohaa 共用同一份清单）

`<input accept>` 在首帧就要有值，而 `openAccept()` 依赖已实例化的内核；若只留端口，
用户可能在异步空窗期点开对话框拿到空清单。因此清单以**静态值**落在协议域一处：

```ts
packages/protocol/src/features/io/index.ts
  OPEN_RASTER_EXTENSIONS // 27 项
  OPEN_RASTER_MIMES      // 13 项
  OPEN_RASTER_ACCEPT     // 由两者拼成的 accept 字符串
```

一致性不靠人工维护，由两条真实产物断言钉住：

| 断言 | 内容 | 实测 |
| --- | --- | --- |
| `wasm-integration.test.ts`「协议域的宿主格式清单与内核可打开行逐项一致」 | 协议清单 == `matrix().openable` 的扩展名与 MIME 集合，暂缓 7 项全部不在列 | 27/27、13/13 |
| 证据脚本 `hostAcceptParity` | 同上，独立于测试框架直接读 `dist/wasm` | `{extensionsEqual:true, mimesEqual:true, deferredExcluded:true}` |

宿主侧接线（均为读同一份协议清单，不再各建一份）：

| 宿主 | 接线前 | 接线后 |
| --- | --- | --- |
| `dev` | `accept="image/png,image/jpeg,image/webp"` | `accept={OPEN_RASTER_ACCEPT}`；`importImage` 在 `ensureEditor()` 后先跑 `io.inspectOpenRaster()`，内核给原因 |
| Woohaa | `OPEN_FILE_ACCEPT` 自维护 MIME/扩展名表 | 由 `OPEN_RASTER_ACCEPT` 派生；`classifyOpenFile` 直接读协议清单 |

### 修复：宿主把「浏览器不会解码」误报成「图片无法读取」

| 项 | 内容 |
| --- | --- |
| 现象 | 经 Woohaa 宿主打开 TIFF/QOI/TGA/PNM/PCX/XPM/DDS 一律提示「图片无法读取」，而这些格式内核都能打开 |
| 根因 | `FileDocumentWorkspace.start()` 用 `createImageBitmap` 取尺寸，失败即判定文件不可读。实测 Chromium 只解码 png/jpg/webp/gif/bmp/ico |
| 修复 | 浏览器解码失败改为「尺寸未知，交给内核」：先进「打开中」，尺寸与像素由内核首帧预览补齐；真正打不开时由内核给出原因 |
| 另一处 | `project-editor-pane.tsx` 的独立文件打开改为先跑 `io.inspectOpenRaster()`，通过则把**原始字节**交给内核（保留真实位深/布局/损失报告）；旧内核无此端口时退回原浏览器归一化路径 |
| 回归 | `document-close.test.ts` 按新范围改写（`.tiff` 由「必须拒绝」改为「可打开」，暂缓格式仍拒绝，accept 与内核同源）；`document-session.test.ts` 新增内核延迟接管用例 |

### 修复：Save for Web 谎报「无损失」

| 项 | 内容 |
| --- | --- |
| 现象 | `warnings` 恒为空数组，预览与交付提示都写「无损失」；但 GIF/PNG-8 确实量化、JPEG 确实有损 |
| 根因 | 内核 `web_cmds::optimize()` 只返回字节与调色板，**从不返回警告**；面板误以为「没有 warnings 就是无损」 |
| 修复 | 从真实编码结果推导：报告里的 `colors` 即真实调色板色数，索引格式（gif/png8）如实声明量化，alpha 转单索引时声明透明退化，jpeg 声明有损 |
| 反向验证 | 把实现还原为 `Vec::<String>::new()` 后 `save_for_web_reports_the_losses_it_actually_performs` 立即失败；恢复后通过 |
| 真实界面复验 | 渐变图 GIF 显示「colours will be quantized to a 64-colour palette」；纯色图显示「1-colour palette」（不再固定写成 256） |

### 收尾轮：宿主端口缺口（dev 保存/导出端口、置入 accept、导出文件名）

本轮按「宿主源码逐项核对」补完 3.4 剩下的宿主集成，各处都是**菜单看起来可用但实际不可用**的
形态，各自补了可失败的回归，并做过反向验证。

| 项 | 现象 | 根因 | 修复与回归 |
| --- | --- | --- | --- |
| dev 宿主导出 PNG | 「文件 ▸ 导出 PNG…」点了没有任何反应 | `EditorWorkspaceController.deliverFile()` 只在注入了 `fileDelivery` 时工作，dev 只配了节点保存端口 `save`，因此恒返回「当前宿主不支持本地文件保存」；`onExportPng` 又用 `void deliverFile(...)` 丢掉了结果，界面连失败都不显示 | 端口装配从 JSX 抽到 `dev/src/dev-controller.ts`；新增 `dev/src/dev-delivery.ts`（浏览器下载端口，只报 `download-started`）；`exportOutcomeMessage()` 把四种结果翻译成提示；菜单能力整体抽到 `dev/src/dev-documents.ts`。回归 `dev/src/dev-export.test.ts` |
| 「保存」失败不可见 | 保存失败时界面空白，控制台出现未处理 rejection | `documents.onSave` 写成 `() => { void apply(); }`，返回 `undefined`，`applySave` 的 `await save()` 立刻完成，抛出的错误无人接 | `devDocumentsMenu()` 把 `save` 原样作为 `onSave`（返回 Promise），由共享层 `await` 并提示；回归断言 `menu.onSave()` 的 rejection 能被拿到 |
| 导出/保存文件名 | 导出下载得到 `sample.png.png`；保存固定叫 `photocraft-A.pcraft` | dev 用 `document.name`（已含扩展名）直接拼 `.png`；保存路径干脆写死槽位名。Woohaa 一直按文档名先剥扩展名 | 统一走 `exportFileName(name, ext)`；保存与导出共用同一套推导（`sample.png` → `sample.pcraft` / `sample.png`）；覆盖 `a.v2.tif → a.v2.png`、路径分隔符不当作扩展名分隔、空名回退 `photocraft.png` |
| 「置入图片…」格式范围 | 新开放的 TIFF/GIF/BMP/TGA/QOI/PNM/PCX/XPM/DDS 在置入对话框里选不中 | `PLACE_IMAGE_ACCEPT` 硬编码 `image/png,image/jpeg,image/webp`，而内核 `place_asset` 用同一套 codecs 解码——同一个域给出两份能力清单 | 改为由 `OPEN_RASTER_ACCEPT` 派生；`place-file.test.ts` 增「置入 accept 与打开同源」 |
| 菜单 → 面板整条链无宿主侧断言 | 只有面板级替身断言与编辑器包内的菜单构造断言，缺「共享菜单真的把点击送到本域面板」 | 宿主 harness 不能传 `documents` / `features` | harness 增加两个可选参数；新增 `interchange-menu.test.tsx`（条目顺序、旧内核不出现死菜单项、点击落 `export` / `web` 且面板真的展开） |

| 切换文档后旧的逐层/资产计划残留 | 对 5 层工程取完逐层+资产计划后打开另一张 48×32 单层图，面板仍列出 `_escape.png 64 × 48` / `图标.png` / `../escape → _escape.png`；此时「逐层打包下载」打的是**新**文档，界面清单与实际交付不一致 | 面板把计划、预览、目标尺寸当成跨文档有效：没有任何「这是哪一份文档的快照」判定，换文档也不清理 | 面板按「活动标签 + 名字 + 尺寸 + 修订号 + 所选层」判定快照归属，失效即清空预览（释放 blob URL）、两张计划与目标尺寸；换文档连提示一起清。回归 `panel-interaction.test.tsx` 两条（切换文档 / 同一文档编辑），反向验证时 2 项失败。真实浏览器复验：同样操作后 `layerPlan`/`assetPlan`/`renames` 全为空 |

真实 WASM 复验「置入范围放宽是诚实的」（`inspect_place_asset` + `place_asset`，逐格式真实字节）：

```
sample.tif  预检 Tiff/48x32 → 置入成功 layer=5
sample.gif  预检 Gif/48x32  → 置入成功 layer=8
sample.jpg  预检 Jpeg/48x32 → 置入成功 layer=11
sample.webp 预检 WebP/48x32 → 置入成功 layer=14
sample.bmp  预检 Bmp/48x32  → 置入成功 layer=17
sample.tga  预检 Tga/48x32  → 置入成功 layer=20
sample.ico  预检 Ico/48x32  → 置入成功 layer=23
sample.qoi  预检 Qoi/48x32  → 置入成功 layer=26
sample.pnm  预检 Pnm/48x32  → 置入成功 layer=29
sample.pcx  预检 Pcx/2x1    → 置入成功 layer=32
sample.xpm  预检 Xpm/2x2    → 置入成功 layer=35
sample.dds  预检 Dds/2x2    → 置入成功 layer=38
sample.exr  inspect 失败：无法解码素材：OpenExr: malformed data…（预检即拒绝，不入列）
```

真浏览器复验（本 worktree 的 dev 宿主 `vite --port 4488` + 真实 WASM，1440×1000，真实 Chromium）：

| 操作 | 结果 |
| --- | --- |
| 文件菜单 | `["打开文件…","保存","导出 PNG…","导出为…","Save for Web…"]` |
| 文件 ▸ 导出 PNG… | 真实下载 `sample.png`（不再 `sample.png.png`），状态区提示「已发起下载：sample.png（下载不等于已保存工程）」 |
| 文件 ▸ 保存 | 成对下载 `sample.pcraft` + `sample.png`（按文档名，与 Woohaa 一致），无失败提示 |
| 文件 ▸ 导出为… | 落 `export` 模式；无横向溢出 |
| 文件 ▸ Save for Web… | 落 `web` 模式 |
| 运行期错误 | `pageerror` 为空 |

复跑脚本（把 `<repo>` / `<fixtures>` 换成本机路径后直接 `node`）：

- `evidence/check-dev-filemenu.cjs`：dev 宿主「文件」菜单条目、导出 PNG 真实下载与提示、Save for Web 落点
- `evidence/check-dev-save.cjs`：dev 宿主「保存」成对下载（按文档名）与失败提示、导出为落点、横向溢出
- `evidence/check-place-formats.mjs`：真实 WASM 逐格式置入（含暂缓格式被内核拒绝）

反向验证（逐个还原缺陷，确认对应用例会失败）：

| 还原的缺陷 | 失败的用例 |
| --- | --- |
| 从 `devControllerOptions()` 删掉 `fileDelivery` | `dev-export.test.ts` 3 项（装配断言 + 两条交付路径） |
| `onSave` 改回 `() => { void save(); }` | `dev-export.test.ts`「「保存」把 Promise 交回共享层，失败能被 await 捕获」 |
| 把 `coversInterchange` 强制为 `false` | `interchange-menu.test.tsx` 2 项 |
| 去掉点击后的 `setAdvancedSection` / `setAdvancedOpen` | `interchange-menu.test.tsx` 「点击…并真的展开本域面板」 |
| `PLACE_IMAGE_ACCEPT` 还原为 3 个 MIME | `place-file.test.ts` 「接受全部可打开栅格」 |
| `onExportPng` 改回丢弃结果（不调 `report`） | `dev-export.test.ts` 两项（导出报结果、取消/失败提示） |

### 真实浏览器界面走查（任务 4.2）

环境：Playwright 1.63 + 真实 Chromium（headless），加载**本 worktree** 的 dev 宿主
（`vite --port 4488`）+ 真实 WASM 产物；视口 1440×1000 与 1024×768 各跑一遍完整主线。

| 项 | 实测结果 |
| --- | --- |
| 逐格式打开（真实文件选择器） | 13 种全部打开成功：png/jpg/tif/webp/gif/bmp/tga/ico/qoi/pnm/pcx/xpm/dds（收尾轮按当前代码复跑，两视口相同） |
| 面板挂载 | 20 行矩阵（`[data-io-matrix-row]` 计数），横向无溢出：1440 视口 `1440/1440`、1024 视口 `1024/1024` |
| 「文件」菜单 | `["打开文件…","保存","导出 PNG…","导出为…","Save for Web…"]`（顺序与文案逐项断言） |
| 文件 ▸ 保存 / 导出 PNG | 保存成对下载 `sample.pcraft` + `sample.png`；导出 PNG 下载 `sample.png` 并提示「已发起下载：sample.png（下载不等于已保存工程）」；两者都不清除未保存状态 |
| 三处入口落点 | 图像 ▸ 格式与导出… → `export`；文件 ▸ 导出为… → `export`；文件 ▸ Save for Web… → `web`。三处都按当前代码重取过下拉项：`export` = `png/jpg/tif/webp/gif/bmp/tga/ico/qoi/pnm`（10 个），`web` = `png24/png8/gif/jpeg`（4 个） |
| 预览 == 交付 | 两套夹具均实测「预览提示字节 == 下载文件字节」：单层 48×32 → JPEG 654 B / WebP 90 B / TIFF 4818 B（旧记录数值原样复现）；多图层 64×48 → 678 / 98 / 9426 B；渐变图 256×256 → JPEG 8982 B、TIFF 196818 B |
| 逐层/资产交付 | 单层 48×32 文档 `Background.png` → 逐层 ZIP 980 B（旧记录数值原样复现）；多图层工程 64×48 → 逐层 ZIP 982 B、改名行 `../escape → _escape.png 开头的点已移除`、资产计划 `图标.png 64 × 48`、资产 ZIP 886 B（两视口一致） |
| 失败场景 | EXR → 「无法导入图片：OpenEXR 暂不支持打开：HDR/浮点位深（F16/F32）；本 change 不自动降位深」（收尾轮按当前代码复跑，两视口相同）；伪扩展名仍按签名成功；损坏字节 → `Png: malformed data: unexpected end of file`；改参数撤下旧预览；超预算不产出预览 |
| 运行期错误 | 两个视口均无 `pageerror`，保存/导出路径无未处理 rejection |

截图（本 change `evidence/` 目录，均为真实 Chromium 渲染）：

- [walkthrough-1440x1000.png](evidence/walkthrough-1440x1000.png)：1440×1000，逐层交付完成后的面板
- [walkthrough-1024x768.png](evidence/walkthrough-1024x768.png)：1024×768，同一主线（Pad 尺寸）
- [walkthrough-export-mode.png](evidence/walkthrough-export-mode.png)：文件 ▸ 导出为… 落 `export` 模式

> 限制说明（如实记录）：Chromium 为 headless 运行，画布像素由 CPU/软件光栅合成；本机
> `/dev/dri` 无 `renderD*`。因此本轮只作证 **UI 布局与交互主线**，**不**据此得出任何 GPU
> 帧率、渲染质量或长尾结论；实体 Pad 的触控与硬件差异仍属人工验收。

### 勾选前逐项核实（2026-10-23，收尾）

上一轮改了 dev 宿主的导出/保存路径，所以 4.2 的界面结论不能直接沿用。本节按**当前代码**
把 4.2 的每一项与 4.1 的每一条命令都重跑一遍，记录实际输出；结果是旧数值在对应夹具上
**可以原样复现**，因此只补测、不改数。

| 复核项 | 结论 | 依据 |
| --- | --- | --- |
| 逐格式打开 13 种 | 一致 | 两个视口逐个 `setInputFiles`，每个都出现编辑器且状态栏尺寸正确 |
| 20 行矩阵 | 一致 | `[data-io-matrix-row]` 计数 = 20（1440 与 1024 两个视口） |
| 横向溢出 | 一致 | `scrollWidth == clientWidth`：1440/1440、1024/1024 |
| 三处入口落点 | 一致 | 三处都重新读取了下拉项：`export` 10 个、`web` 4 个 |
| 预览 == 交付 | 一致（原数值可复现） | 旧记录「JPEG 654 B / WebP 90 B / TIFF 4818 B」在 48×32 单层图上**逐字节复现**；另用多图层 64×48 工程补测 678 / 98 / 9426 B，两套夹具的预览提示字节与下载字节都逐项相等 |
| 逐层 ZIP | 一致（原数值可复现） | 旧记录 980 B 在单层 48×32 文档上复现；多图层 64×48 工程为 982 B（图层尺寸不同，非回归） |
| 资产计划/ZIP | 一致 | `图标.png 64 × 48`，ZIP 886 B |
| EXR 拒绝文案 | 一致 | 「无法导入图片：OpenEXR 暂不支持打开：HDR/浮点位深（F16/F32）；本 change 不自动降位深」 |
| 伪扩展名 | 一致 | PNG 字节命名为 `.tif` 仍成功打开（`documentShown: true`，无错误） |
| 损坏字节 | 一致 | `无法导入图片：Png: malformed data: unexpected end of file` |
| 改参数撤预览 | 一致 | 预览 1 → 0（格式改成 webp 后旧预览撤下） |
| 超预算 | 一致 | 宽度 20000：目标尺寸不显示、预览不产出 |
| 保存 / 导出 PNG | 一致 | `sample.pcraft` + `sample.png` 成对下载；导出 PNG 下载 `sample.png` 并提示「已发起下载…（下载不等于已保存工程）」 |

本节同时重跑了 `verification.md`「执行记录」里的每一条命令（同一容器、同一提交状态）：

| 命令 | 本轮实际输出 |
| --- | --- |
| `pnpm -C photocraft run check` | protocol 81 / project-verifier 40 / editor **341**（47 文件），typecheck 与 build 全通过 |
| `npx vitest run`（`photocraft/dev`） | 2 文件 / **22** 用例 |
| `npx vitest run src/features/io` | 8 文件 / **72** 用例 |
| `cargo test --workspace --offline` | **322 passed**，0 failed（逐行累加 `test result` 得 322） |
| `cargo test -p photocraft-embed-editor features::io` | **40 passed** |
| `cargo test -p photocraft-project-verify features::io` | **2 passed**（过滤器按子串匹配；在 `photocraft/rust/` 或加 `--manifest-path` 均可复现，在 `photocraft/` 无 `--manifest-path` 会报「找不到 Cargo.toml」） |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | **35 文件 / 287 用例** |
| `pnpm -C photocraft run features:check` | 「commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084」 |
| `pnpm boundary:check` | 6 passed |
| `pnpm codemap:check` | 47 个 manifest、11 篇文档、1364 个本地链接 |
| `npx openspec validate … --strict` | `is valid` |

复跑脚本（`<repo>` / `<fixtures>` 换成本机路径，两个脚本都在本轮实跑过并通过）：

- `evidence/check-walkthrough-main.cjs`：逐格式打开、矩阵行数、溢出、三处入口落点、预览==交付、逐层/资产 ZIP、EXR 拒绝、保存与导出 PNG（1440×1000 与 1024×768 各一遍）；本轮输出：两视口都是 `total 13 / failed []`、`matrixRows 20`、三种格式 `equal true`、`zip 982`（逐层）与 `zip 886`（资产）、`scrollWidth == clientWidth`、`pageerrors []`
- `evidence/check-walkthrough-failures.cjs`：伪扩展名、损坏字节、改参数撤预览、超预算；本轮输出：`documentShown true` + 无错误、`Png: malformed data: unexpected end of file`、`previewBefore 1 → previewAfterFormatChange 0`、超预算不显示目标尺寸也不出预览、`pageerrors []`

### 本轮新增/补充的回归

| 文件 | 用例 | 覆盖 |
| --- | --- | --- |
| `rust/.../tests_editor.rs` | `opening_refuses_to_downconvert_what_the_preflight_refuses` | 预检拒绝的字节，打开必须同样拒绝，原因含真实位深，且不留文档 |
| `rust/.../tests_editor.rs` | `truncated_and_oversized_inputs_are_rejected_before_replacing_the_document` | 截断与超预算：拒绝且当前文档 state 前后相等 |
| `rust/.../tests_export.rs` | `save_for_web_quality_settings_reach_the_encoder` | 颜色数/抖动方式/抖动强度**真的改变编码字节**（用真实渐变夹具，不用单色替身） |
| `rust/.../tests_export.rs` | `format_option_table_is_the_single_authority_for_the_panel` | 面板控件来源即内核 `options`；声明了参数就必须真能编码 |
| `editor/.../wasm-integration.test.ts` | 「截断、超预算与 16 位输入在预检和打开处给出同一结论」 | 真实 WASM 上三者的 `consistent`、原因文本、文档与 `contentHash` 不变；伪扩展名（PNG 字节命名为 `.tif`）按签名识别为 `png` |
| `editor/.../workspace.test.ts` | 3 条 `openAccept` 用例 | 端口与矩阵同源、暂缓不入列、旧内核协商 |
| `editor/.../wasm-integration.test.ts` | 「宿主 accept 端口与内核矩阵同源，暂缓格式不入列」 | 真实产物上逐项比对 `openAccept().extensions` 与 `matrix().openable`，7 个暂缓格式不在列、`.pcraft` 不混入 |
| `editor/.../panel-interaction.test.tsx` | 「把内核的编码损失与计划拒绝项显示出来，不只报成功」 | warnings / rejected / renames 在界面上真实可见 |
| `editor/.../panel-interaction.test.tsx` | 「参数控件由内核的格式能力驱动，不显示必然失败的开关」 | JPEG 无「保留透明」、PNG 有「交错」 |
| `editor/.../panel-interaction.test.tsx` | 「菜单意图决定面板落在哪个模式」「同一菜单意图只应用一次」 | Save for Web 直接落 web 模式；重复渲染不重复应用；用户后续切换不被覆盖 |
| `editor/.../panel-interaction.test.tsx` | 矩阵断言扩充 | 位深/布局/Alpha/扩展名/ICC/EXIF/XMP/DPI/动画/有损 逐项可见 |
| `editor/.../panel-interaction.test.tsx` | 「Save for Web 显示的质量就是内核实际用的那个」 | web 模式 JPEG 质量显示 60（与 `WebSettings::default()` 一致）；PNG 不出现无效的「PNG 压缩」 |
| `rust/.../tests_export.rs` | `save_for_web_reports_the_losses_it_actually_performs` | 量化/有损/透明退化必须出现在 `warnings` 里，数字与报告 `colors` 一致（反向验证可失败） |
| `editor/.../wasm-integration.test.ts` | 「协议域的宿主格式清单与内核可打开行逐项一致」 | 27 扩展名 / 13 MIME 与 `matrix().openable` 逐项相同，暂缓 7 项不在列 |
| `editor/.../wasm-integration.test.ts` | 「每个可打开扩展名都能以别名打开」 | 27 个扩展名别名逐个真实打开（不含暂缓） |
| `editor/.../boundary-regression.test.ts` | 「「文件」菜单能挂出通用导出与 Save for Web 两个入口，且顺序在导出 PNG 之后」 | 条目顺序/文案，且仅在宿主提供回调时出现 |
| `editor/.../cross-domain.test.ts` | 4 项跨域用例 | 跨域写入改变导出字节；导出不推进指纹；跨域写入后存/重开结构一致；原生核验器 `{"ok":true}` |
| `integrations/woohaa/tests/document-close.test.ts` | 改写 + 新增 | `.tiff` 可打开；暂缓格式仍拒绝；accept 与内核同源 |
| `integrations/woohaa/tests/document-session.test.ts` | 新增 1 项 | 浏览器解码失败时交给内核，不再误报「图片无法读取」 |
| `dev/src/dev-export.test.ts`（新增） | 14 项 | 宿主装配真的注入 `fileDelivery`；导出 PNG 只报 `download-started` 且不推进基线；保存才推进；失败原因原样带回；`exportFileName` 推导；交付结果→界面提示；空名/空字节/无环境/触发失败的端口语义；`devDocumentsMenu` 的「保存返回 Promise」「导出落交付端口并报结果」「取消/失败都有提示」「只列已打开文档且切换走门禁」 |
| `integrations/woohaa/tests/interchange-menu.test.tsx`（新增） | 3 项 | 「文件」菜单出现「导出为…」「Save for Web…」且顺序在「导出 PNG…」之后；旧内核不出现死菜单项；点击真的展开本域面板并落 `export` / `web`（nonce 递增） |
| `integrations/woohaa/tests/place-file.test.ts` | 新增 1 项 | 置入 accept 与打开同源（含 `.tif`、不含 `.pcraft`） |

> 夹具口径说明：`save_for_web_quality_settings_reach_the_encoder` 第一版用单色图层做夹具，
> 调色板被压到 1 色导致「抖动无差异」的假失败。已改为 `tests_support::gradient_document()`
> （逐像素真实渐变），不靠调断言迁就替身。

> 环境备注：`photocraft/integrations/woohaa` 的 `tests/transform-interaction.test.tsx` 偶发
> 一次超时失败，单独重跑与连续全量重跑均通过（本轮全量为 35 文件 / 287 用例），与本 change 无关。

## U05/U06/U07 逐项结果

| U / 子能力 | 入口与参数 | 实际结果 | 失败与取消 | 内容/历史 | 结论 |
| --- | --- | --- | --- | --- | --- |
| U05 逐格式矩阵 | `interchangeMatrixJson()` | 20 个格式行：10 open / 3 read-only / 7 deferred；27 个可打开扩展名（png/apng/jpg/jpeg/jpe/jfif/tif/tiff/webp/gif/bmp/dib/tga/icb/vda/vst/ico/qoi/pnm/pbm/pgm/ppm/pam/pfm/pcx/xpm/dds） | 暂缓项带原因，面板显示 | 只读，不建文档 | 通过 |
| U05 预检 | `inspectRaster(bytes)` | PNG 32×24 → `status=open`、`documentChanged=false`、`hasDocument()=false` | `b""` → `import-failed`「空文件」；`b"not an image"` → 「无法识别的栅格签名（扩展名不作为依据）」；16 位 PNG → 「真实位深是 u16…不自动降位深」 | 不创建文档、不改 hash | 通过 |
| U05 逐格式打开 | `inspectOpenRaster` + `openRaster`（真实 WASM） | 10 个可写格式用**自身真实编码产物**、3 个只读格式用手工签名字节，全部 `status`/`openable`/`depth=u8`/尺寸正确并能打开建文档（`png/jpg/tif/webp/gif/bmp/tga/ico/qoi/pnm/pcx/xpm/dds`） | 暂缓格式（EXR 等）预检即拒绝并带原因；损坏/空字节/截断/超预算/**16 位**一律拒绝且文档不变；**预检与打开同一套解码准入**（见「复核轮次新增」的缺陷修复） | 预检不建文档、不改 hash | 通过 |
| U05/U06 工程往返 | `openRaster` → `saveProject` → `openProject`（真实 WASM） | 打开 32×24 PNG 后重新编码的字节与源文件**逐字节相同**；存工程再重开，画布尺寸/图层数/文档名一致；「重开 → 再存 → 再重开」内容指纹稳定 | 打开未成功时不建文档；工程字节为 0 拒绝 | 导出前后 `contentHash` 不变 | 通过（指纹的首次口径见下条备注） |
| U05 可编辑打开 | `openRaster(name, bytes)` | 打开后 `hasDocument()=true`、文档名取文件名 | 损坏字节被拒且当前文档不变（Rust 断言 state 前后相等） | 成功打开才替换文档 | 通过 |
| U06 通用导出 | `exportRaster({format,quality,…})` | jpg `FFD8FFE0`、webp `RIFF`、tif `II*\0`（LZW）、png 签名；尺寸与设置一致 | `exr` 暂缓、`percent`+`width` 互斥、`quality:0`、未知格式 → 全部拒绝并说明原因 | 报告 `documentChanged:false`，导出前后 `contentHash` 不变 | 通过 |
| U06 真实预览 | `previewExport(同参数)` | 与交付**逐字节相同**（jpg/webp/tif/png/png24/png8/jpeg 共 7 组） | 草稿未结算 → `gesture-active`，不调用内核 | 只读 | 通过 |
| U06 Save for Web | `{mode:"web",format:"png24"\|"png8"\|"gif"\|"jpeg"}` | png8 报告 `colors=1`（真实调色板）；jpeg 走 web 编码器 | 与 `preset` 格式冲突、`mode:"web"` 配扩展名 `format` → 拒绝 | 只读 | 通过 |
| U06 尺寸 | `{width:16}` | 报告 16×12、字节可解码 | 超 `maxExportDimension` / `maxExportPixels` → 拒绝，不降采样 | 只读 | 通过 |
| U06 导出预检 | `inspectExport(settings)` | 面板随设置变化显示「目标尺寸 W × H」，数值来自内核 `parse_settings`（不编码） | 参数非法 → 不显示尺寸；草稿期间 → `gesture-active` 且不调内核 | 只读，不改 hash | 通过 |
| U06 预设 | `ExportPresetStore` | 内置 + 用户预设；同名覆盖、上限 32 拒绝新增、内置不可删 | 坏 JSON / 非法设置 → 整体丢弃并回退内置；存储不可用 → 仅内存 | 本机偏好，不进工程/hash | 通过（域内单测） |
| U06 面板反馈 | 面板交互（jsdom） | 预览显示真实编码尺寸/字节数；导出提示「已发起下载」并声明下载 ≠ 已保存工程；内核 `warnings`（量化/DPI 丢弃）逐条显示；参数控件由内核 `options` 驱动（JPEG 不再出现「保留透明」）；web 模式隐藏无效的 `pngCompression`、JPEG 默认质量按内核对齐到 60 | 改任一参数或预览失败都撤下旧预览并释放对象 URL | 只读时不显示预览 | 通过 |
| U07 逐层计划 | `inspectLayerExport({format,layers?})` | 计划 = 所选层；`背景2.png 32x24`；空层标「跳过：无可见像素」；面板可选逐层格式；`rejected`（超预算/目标层失效）与 `renames`（重名/非法字符/保留名）在界面逐条显示 | 目标层失效 / 未选层 → 拒绝；>64 层 → 拒绝 | 不写文档 | 通过 |
| U07 Layers to Files | `exportLayerBundle(...)` | 内存 ZIP（`PK\x03\x04`）+ `report.json`；`okCount`/`failedCount` 与文件列表一致 | 计数不一致 → 拒收；非 ZIP/超限 → `inspectIoBundle` 拒绝 | 报告定位失败项，无后台生成器 | 通过 |
| U07 Export As | `exportLayerAs({format:"png"})` | 99 字节 PNG，命名 `art-前景.png`（报告图层名） | 无活动层 → 拒绝 | 只读 | 通过 |
| U07 Image Assets | `inspectImageAssets()` / `exportImageAssets()` | 仅资产语法图层（`图标.png` 32×24）；包内含 `report.json` | 无资产名图层 → 带原因拒绝；重名/非法名改写后记录 | 只读 | 通过 |
| U07 包复核 | `inspectIoBundle(bytes)` | 返回条目 + 解析后的 `report.json` | 空包 / 条目形状不对 → `invalid-bundle` | 只读 | 通过 |
| 宿主入口（3.4） | `OPEN_RASTER_ACCEPT` → `input[accept]`；`inspectOpenRaster` → `openRaster`/内核建文档 | dev 与 Woohaa 两宿主均接同一清单（27 扩展名 / 13 MIME）；「文件」菜单出现「导出为…」「Save for Web…」，分别落到 `export` / `web` 模式；「导出 PNG…」真实发起下载并提示「下载不等于已保存」；「保存」成对交付工程 + PNG | 暂缓格式不在 accept 内；浏览器不认的 TIFF/QOI/TGA 等不再误报「图片无法读取」，改由内核给原因；导出失败/取消有可读提示（不再静默） | 打开走内核，导出不改保存基线 | 通过（真实 Chromium + 域内/宿主回归） |

## 待人工验证 / 阻塞（未验收）

| 项目 | 状态 | 真实原因 | 归属 |
| --- | --- | --- | --- |
| 实体 Pad 触控/硬件差异验收 | 待人工验证 | 电脑 1440×1000 与 Pad 尺寸 1024×768 的界面主线**已**在真实 Chromium 上跑完（见上文走查表）；但本机为无显示会话容器，`/dev/dri` 无 `renderD*`，Chromium 为 headless，画布像素由 CPU 光栅合成。因此触控手势、实体 Pad 的 DPR/触控笔/硬件差异，以及任何 GPU 帧率与渲染质量结论都必须留待真实设备 | 人工（真实设备） |
| 全局能力登记（`INTERCHANGE_CAPABILITIES` → 阶段清单 / fixture / WASM 基线） | 阻塞 | 需同时改集成方拥有的 `tests/fixtures/contract.json` 与 `notes/feature-boundary-wasm-baseline.json`；本域只声明。登记后阶段产物与基线字节会变化，属集成负责人一次聚合 | 集成负责人 |
| 与尚未实现的 sibling 能力交叉验收 | 阻塞 | 目标模式 / 通道 / 旋转视图 / 新层类型等组合，`parallel-work.md` 要求在**双方能力均可用后**补真实联合验收；当前分支不存在这些提供方，故不作断言 | 双方交付后 |

已不再阻塞（本轮完成）：宿主「文件 ▸ 导出为… / Save for Web…」菜单项与宿主保存端口（3.4 宿主部分，
经用户授权接线，清单见 [tasks.md](tasks.md) 文末）；跨域联合验收（5.2，已与当前分支真实存在的
提供方跑通 4 项，见「本轮新增/补充的回归」）。

不属于本 change 的缺口：Photoshop 外部可编辑往返（本 change 未改 PSD 兼容项，沿用原 change
的未验收记录）。

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。原生路径保存/恢复、持续目录监听、PSB、ICC/CMYK/HDR 和依赖未编入 WASM 的解码器暂缓；不承诺所有上游格式双向可用。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
