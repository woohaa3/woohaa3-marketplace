# 验收计划与记录

## 本次实施状态

域内实现已完成（`packages/editor/src/features/smart/`、`rust/crates/editor-core/src/features/smart/`），自动化证据见下表。
本轮补齐了两处会让 U66 成果存不下来/打不开的集成边界（`Editor::open_project` 的含源核验回退、Media 工程 ingest 的含源保存），
宿主 `typecheck` 也已恢复通过。

仍未执行/未采集的只剩真实环境类：真实设备 UI 走查（4.2）、Photoshop 外部 PSD 验证（4.3）、跨域联合回归（5.2）。
它们全部按「待人工验证」记录，不用 Node 下的 WASM 冒烟或估算值代替。

规划期验证命令：`openspec validate 2026-10-22-complete-photocraft-smart-object-workflows --strict --no-interactive`（在 `photocraft/` 下执行，通过）。

## 必须验证的主线

不打开子文档直接替换/导出源 → 子界面完整编辑回写 → 共享实例中只对一个转回层 → 重开并验证撤销/冲突恢复。

逐项证据矩阵见 [matrix.md](matrix.md)。真实 WASM 冒烟（原生 Node 加载 `packages/editor/dist/wasm`，非替身）确认：

| 步骤 | 实际结果 |
| --- | --- |
| 替换源（子文档编辑期间） | 换个源的字节替换成功（`instances:[6]`，历史 +1），随后旧子文档回写被明确判为冲突（`historyDelta:0`，父层保留新源 5523 字节）；再走「建立独立副本」后同一份子编辑可提交到副本（`instances:[29]`） |
| 未开子文档读状态/导出 | 40×30 新工程、单层智能对象：`smartLayerStateJson` 返回 `smart:true, childOpen:false, canExport/canReplace/canConvertToLayers:true, source.kind:"embedded", source.bytes:3575`；`exportSmartSource` 返回 `contents.pcraft`（3575 字节），`contentHash` 不变 |
| 替换源 | `replaceSmartContents(同字节)` → `instances:[]`，历史条数与 `contentHash` 均不变（无净变化不增历史） |
| 子文档打开期间 | 状态 `childOpen:true, canExport:true, canReplace:true, canConvertToLayers:false`，`convertReason:"子文档仍在编辑中，请先回写或关闭子文档"`；`convertSmartToLayers` 抛 `command-failed` 且 `smartChildStateJson().active` 仍为 true |
| 转回图层（单层源） | 返回 `{group:false, layer:19, layers:1}`，历史 +1，结果 `kind:"Pixel"`；`undo` 后该层回到 `Smart Object` |
| 共享实例 | 复制实例（`layer.duplicate`）后只转回复制件：顶层变 `Pixel,Pixel,Smart Object`，另一实例仍是 `Smart Object`，仍可 `beginSmartChild` |
| 工程重开 | 只转回一个、另一个仍是智能对象：`saveProject` → `openProject` **成功**，重开结果 `[Pixel, Smart Object, Pixel]`（本轮修复前这里会被共享核验器拒绝）；重开后剩余实例 `smartLayerStateJson(...).canEditContents` 仍为 true、可继续 `beginSmartChild`；两个实例都转回后的工程同样能重开，图层均为 `Pixel`、历史 1。内容身份：Rust 回归用 `open_project(&saved, None)` 断言 `contentHash` 与保存前完全一致；WASM 冒烟带 base asset id 传入时 hash 不同是既有语义（基底资产 id 参与身份），同一 base id 重开两次结果一致（`b25c52d01d65fa47`） |
| 合成像素 | 整像素放置（`[1,0,0,1,6,4]`）解包前后整幅 64×48 RGBA 逐字节一致；非整像素放置（`3.5,2.5`）同样一致；撤销后仍一致 |
| 回写与冲突恢复 | 子文档内实际改动 → `updateSmartParent` 提交成功、父历史 +1；同一 `attemptId` 重试返回 `replayed:true` 且不再增历史；父文档被子文档编辑期间改动后回写返回冲突（`invalidated:"父文档在子文档编辑期间已修改"`），父文档保持原样；`reloadSmartChild` 之后可重新编辑并提交（`sourceHash` 更新、`historyDelta:1`） |
| 回执按会话失效 | 同一 `attemptId`（UI 用子修订号 `ui-child-3`）在同一会话内重试仍返回 `replayed:true`；**关闭重开**与**重载父源**后再用同一个键提交，返回结果不含 `replayed` 且父文档真的改变（以前会回放旧回执把新编辑丢掉） |
| 栅格化不误关别的会话 | 在独立副本上打开子文档后栅格化另一个智能层：`smartChildStateJson().active` 仍为 true 且 `layer` 仍是该副本；栅格化子会话自己那一层才结束会话 |
| 子文档导出/分离恢复 | `exportSmartChild` 返回当前子文档字节；`detachSmartChild` 建立独立副本后**继续编辑并回写**会落到新副本（`instances:[16], committed:true`，历史 +1，`invalidated:null`），不再被“共享源已更换”拒绝；分离后 `reloadSmartChild` 仍可用；换源冲突与父改动冲突都走同一条恢复路径成功（`instances:[17]` / `instances:[29]`）；父层恢复为普通层；两步均不改动其他实例 |
| 转回图层后再编辑 | 转回得到的层可直接改不透明度/变换并提交；一次 `undo` 整棵回到 `Smart Object`，无中间态 |
| 拒绝不写文档 | 透视放置、锁定、普通层、缺层、外链源的拒绝均不改 `state()`（文档与历史快照相同） |
| 含源工程的接收边界 | 同一份「部分转回」工程（9967 字节，3 层含 1 个智能对象）：TS 普通核验 `verifyPhotocraftProject` 仍拒绝（`unsupported-object`：工程包含首期未开放的对象类型：smart）；`inspectEmbeddedPhotocraftProject` 外层结构通过（`layerCount:3, objectKinds:[raster, smart]`）；原生工具 `--embedded-smart` 经适配器核验通过（摘要逐项一致）。即「放行只发生在原生全树核验成功之后」 |

冒烟脚本是临时 ESM 文件（`node` 直接运行，不入库）：`initSync({module})` 加载 `packages/editor/dist/wasm/photocraft_editor_bg.wasm`，再用 `WasmEditor` 的 `execute` / `smartLayerStateJson` / `exportSmartSource` / `replaceSmartContents` / `convertSmartToLayers` / `beginSmartChild` / `updateSmartParent` / `reloadSmartChild` / `rasterizeSmartObject` / `saveProject` / `openProject` 走完上表。子工程字节以 base64 解码后用第二个 `WasmEditor` 改一笔再 `saveProject`，因此回写内容是真实的另一份工程而不是同一份字节。

「含源工程的接收边界」一行另用同一份真实 WASM 产出的 `partial-e2e.pcraft` 喂给真实 `packages/project-verifier/dist`（TS 核验 + `inspectEmbeddedPhotocraftProject`）与真实原生工具 `packages/project-verifier/dist/bin/photocraft-project-verify --embedded-smart`，不经替身。

### 主线复验（本轮独立重跑，脚本 `/data/tmp/smart-mainline.mjs`，不入库）

在**当前** `packages/editor/dist/wasm`（17.38 MiB，`editor.rs` 的 `verify_for_open` 已进产物）上重跑上表主线，20 项断言全部 `PASS`：

| 段 | 断言 |
| --- | --- |
| 1 未开子文档 | 四个入口可用且 `childOpen:false`；源为 `embedded`（3575 字节）；导出 `contents.pcraft` 逐字节；替换同字节 `instances:[]` 且历史不变；导出前后 `contentHash` 不变 |
| 2 子文档 | 打开后 `canConvertToLayers:false` 且原因为「子文档仍在编辑中…」；此时 `convertSmartToLayers` 抛 `command-failed` 且会话仍 `active`；改一笔回写 `committed:true`、父历史 +1；同 `attemptId` 重试 `replayed:true` 且不增历史 |
| 3 共享实例 | 只转回复制件后它是 `Pixel`（`{group:false,layers:1}`），另一实例仍 `smart:true` 且可 `beginSmartChild` |
| 4 撤销 | `Smart Object,Pixel → Pixel,Pixel → Smart Object,Pixel`，一次撤销整棵还原 |
| 5 重开 | 部分转回工程能重开（`kinds=Pixel,Smart Object,Pixel`），`contentHash` 一致，剩余实例可继续编辑内容 |
| 6 拒绝 | 缺层/普通层各自返回自身原因，且文档与历史快照未变 |

同一产物另外确认普通口径没有放宽（真实原生 CLI，非替身）：

```
$ photocraft-project-verify plain.pcraft            -> {"ok":true, objectKinds:["raster"]}
$ photocraft-project-verify smart.pcraft            -> {"ok":false,"code":"unsupported-object","message":"工程包含智能对象"}
$ photocraft-project-verify --embedded-smart smart.pcraft -> {"ok":true, objectKinds:["raster","smart"]}
```


## 非渲染检查（实际执行结果）

在 `photocraft/` 下执行（最后 5 行命令在仓库根目录执行）：

| 命令 | 实际结果 |
| --- | --- |
| `pnpm run check`（build + typecheck + test） | 通过：protocol 70 tests / project-verifier 40 tests / editor 301 tests（44 文件），全绿 |
| `pnpm run rust:test`（`cargo test --workspace --offline`） | 通过：232 + 4 + 13 + 25 + 8 + 0 + 1 + 3 + 10 + 15 passed，0 failed（editor-core lib 232，其中 smart 域 `features::smart` 27 项 + `smart_document` 11 项） |
| `pnpm run wasm` | 通过：`wasm 17.38 MiB，glue 94.1 KiB`；生成的 `.d.ts` 含 `smartLayerStateJson` / `exportSmartSource` / `convertSmartToLayers` |
| `pnpm run verifier` | 通过：原生核验器 3.84 MiB 产出 |
| `pnpm run features:check` | 通过：命令/能力/错误/8 个内容快照/撤销重做/PNG 字节与 `bdc3c084` 基线一致；共享文件 hash 未漂移 |
| `node scripts/check-code-map.mjs`（根目录 `pnpm codemap:check` 的脚本） | 通过：47 个 manifest、11 篇文档、1359 个本地链接、8 个模块入口清单 |
| `npx vite build`（`dev/`） | 通过：CSS 43.79 kB（含子文档作用域样式），JS 620.89 kB，wasm 18.2 MB（`dev/dist` 构建产物为 gitignore，验证后删除以回收磁盘） |
| `cargo clippy -p photocraft-embed-editor --offline --all-targets` | 无 error；新增 `unpack.rs` / `smart_source_io.rs` / `unpack/tests.rs` 零告警，`smart_document.rs` 只有基线既有的两处测试风格告警（`bool_assert_comparison`、`len_zero`），本轮新增代码未引入新告警。其余告警均在既有文件 |
| `rustfmt --edition 2024 --check`（本次新增的 `unpack.rs` / `unpack/tests.rs` / `smart_source_io.rs`） | 通过 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过：34 文件 / 275 用例（连续两次；`transform-interaction.test.tsx` 曾在并行满载下偶发 1 次 `dispatchEvent` 空指针，单跑 3 次与全量重跑 2 次均全绿，属既有用例的时序抖动，与本域改动无关联） |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过（`tsc --noEmit` 无输出）：替身不足的问题已在本轮修掉 |
| `pnpm -C web --filter @woohaa3/media-service run typecheck` | 通过（`tsc --noEmit` 无输出） |
| `pnpm -C web --filter @woohaa3/media-service test` | 通过：6 文件 / 79 用例，其中 `project-ingest.test.ts` 11 项（含本轮新增的 4 个含智能对象保存用例） |
| `pnpm boundary:check`（根目录） | 通过：6 项 |
| `pnpm codemap:check`（根目录） | 通过：47 个 manifest、11 篇文档、1359 个本地链接、8 个模块入口清单 |

未执行 / 未通过：

| 命令 | 原因 |
| --- | --- |
| `pnpm extensions:check`（根目录） | 失败：`ark-provider` 扩展的 `./shared`（解析到 `./dist/shared.js`）不存在，需先构建该扩展；属本机缺少扩展构建产物，与本 change 无关 |
| 仓库级 `cargo fmt --check` | 不可用作门禁：基线 HEAD 已有大量未格式化文件（`editor.rs` 29 处、`smart_document.rs` 21 处、`wasm.rs` 5 处、`mod.rs` 1 处，以及 `capability.rs`、`document_content/tests.rs`、`features/painting/*`、`features/selections/*` 等）。本次新增的 `unpack.rs`、`unpack/tests.rs`、`smart_source_io.rs` 通过 `--check`；`editor.rs`（29 处）与 `wasm.rs`（5 处）的差异数与基线完全相同，说明新增段落已格式化；`smart_document.rs` 由 21 处增至 28 处，新增段落沿用该文件既有紧凑风格，单独格式化它会把 21 处基线代码一并重排，故未做 |
| canvas-service 全量测试 | 95 文件 / 919 项通过、1 项跳过；3 个文件在加载期失败，原因是缺少 `@woohaa3/extension-film-set/backend` 构建产物（`src/model-mcp/*`、与照片编辑链无关），与本 change 无关 |

## 本次新增回归

| 位置 | 覆盖 |
| --- | --- |
| `rust/crates/editor-core/src/features/smart/unpack/tests.rs`（27 个） | 多层解包成组 + 一步撤销、单层折叠、嵌套智能层保留父组、整像素平移边界、合成像素逐字节一致（整像素/非整像素/撤销）、共享实例不变、工程重开、导出逐字节、替换无净变化、拒绝矩阵、逐入口原因、外链 NON_GOAL、样式图案资源随解包并入且可解析、解包结果导出为不含智能对象块的 PSD、层级预算与核验器 depth 语义一致（14 层外层组放行 / 15 层拒绝且不写文档）、五类不可表示效果（透视/变形/智能滤镜/滤镜蒙版/堆栈模式）逐一拒绝且两条投影一致、智能层自身蒙版与效果改为建组、图案预算溢出在写文档前拒绝、嵌套智能对象转换后仍是可编辑智能对象、转换后内容身份跨序列化一致、**旧工程（无任何新持久字段）重存逐字节一致且三个新入口可直接作用**、**部分转回后的工程可保存并重开（剩余实例仍可开子文档、`contentHash` 一致）**、**重开回退不放宽其他拒绝原因（外链源仍拒）**、**重开回退不放宽源树累计层数预算** |
| `rust/crates/editor-core/src/features/smart/smart_document.rs`（11 个） | 子文档关联与复用、无变化回写不增历史、改动回写重算全部共享实例且一步历史、冲突保留子文档、非法字节/无会话拒绝、重载与栅格化显式、替换保留实例变换、**幂等回执按子会话失效（关闭重开/重载后同一键必须真的提交）**、**栅格化无关对象不关闭别的子会话**、**「建立独立副本」之后继续编辑仍能回写到新副本（改绑 contents_id）**、**两个「更新父文档」入口用不同键重放同一内容不得重复提交历史** |
| `packages/editor/src/features/smart/layer-state.test.ts`（8） | 状态解码：不可用必须带原因、`childOpen` 与父层入口解耦、路径名/越界拒绝、非智能层结构化原因 |
| `packages/editor/src/features/smart/smart-object-panel.test.tsx`（11） | 未开子文档可替换/导出、禁用显示内核原因、确认才转回、确认绑定到具体图层（换选后需重新确认）、确认期间入口变不可用则自动收起且不发命令、读文件期间换选图层则放弃替换、取消不发命令、失败不刷新、**导出失败不下载也不刷新**、**内核名字不可交付时退回固定下载名而不写路径**、只读全禁用、非智能层无入口 |
| `packages/editor/src/features/smart/wasm-handle.test.ts`（3） | 三个新绑定的解码/`free`（成功与失败都释放）/错误归一化 |
| `packages/editor/src/features/smart/workspace.test.ts`（5） | 读操作不刷新、转回只走一次 `afterWrite`、活动草稿先拒绝、内核拒绝交 `fail`、无句柄返回 unavailable |
| `packages/editor/src/features/smart/child-editor-scoping.test.ts`（5） | 宿主每条外置部件规则都有作用域还原；聚焦面板隐藏侧栏时子文档侧栏仍显示；本域样式不含宿主选择器；组件带作用域属性并引入样式 |
| `web/services/media-service/src/project-ingest.test.ts`（4 个新增，文件共 11 项） | 含智能对象工程：未配置原生核验工具时 fail closed 且不落对象；原生全树通过后按内容寻址写入（调用序列必须是先普通口径、再 `--embedded-smart`）；原生明确拒绝源树时不回退成外层结构通过；外链智能对象仍被拒 |

## 真实 UI、设备与外部应用（未执行）

计划：独立 dev 与 Woohaa 均用真实匹配 WASM；电脑 1440×1000 与 Pad 窗口 1024×768 逐项操作并留应用内截图；PSD 往返在 Photoshop 中打开确认层可编辑。

未执行原因（按平台探测，非笼统「无 GPU」）：

- 环境为 Linux 容器，`ls /dev/dri | grep '^renderD'` 无输出 → 确无 GPU；
- 本会话没有桌面浏览器连接（`browser.tabs.open` 返回未连接），也没有显示会话，无法进行真实 UI 走查与截图；
- 因此 4.2 的窗口尺寸走查、HUD/弹层视觉确认，以及性能/帧率结论一律标「待人工验证」，不用软件渲染或估算值代替。

有 GPU 的真实 macOS/Windows 机器上须补：1440×1000 与 1024×768 下「替换源/导出源 → 子文档完整编辑回写 → 只对一个共享实例转回 → 重开 + 撤销 + 冲突恢复」。

## 环境与未执行项的真实原因

| 项 | 原因 |
| --- | --- |
| 4.2 真实设备走查 / 截图 | Linux 容器无 GPU（无 `renderD*`）且无桌面浏览器/显示会话；这是唯一阻止该项勾选的原因 |
| 4.3 Photoshop 外部 PSD 可编辑验证 | 环境未安装 Photoshop 或其他外部应用，无法采集；自动化只能证明「解包结果导出 PSD 后不含 `SoLd`/`PlLd`/`SoLE` 且层可读」 |
| 5.2 跨域联合回归 | 需要真实同级提供方与宿主运行环境，本机只有单元/WASM 级证据 |
| 协议公共入口导出 `decodeSmartLayerState` | 需改 `packages/protocol/src/image-project-content.ts` / `src/index.ts` 两个共享门面，单写者归集成负责人；本 change 未改 `packages/protocol` |
| 新增 `layer.smart-object.convert-to-layers` 能力 id | **非必需**：U65/U66 的入口都落在既有 `layer.smart-object.*` 能力内，已在 `notes/capability-matrix.md` 的 P4 表补三行实现位置说明。若产品要求独立 id，则需改 `capability.rs` / `image-project-editor.ts` / `tests/fixtures/contract.json`（hash 锁定的共享契约）等共享能力表 |

### 本轮补齐的两处集成边界

| 边界 | 原问题 | 现在的做法 | 为什么没有放宽核验 |
| --- | --- | --- | --- |
| `Editor::open_project`（`rust/crates/editor-core/src/editor.rs`） | 只用 `verify()`（`embedded_smart=false`），任何含智能对象的工程都「工程包含智能对象」拒绝；U66 只转回一个实例时就打不开 | 先 `verify()`，**仅当它失败**再试 `smart_source::verify_project()`——该通道把根容器和整棵嵌入源树放进同一套层数/深度/条目/解压预算 | 两条通道除「是否允许嵌入智能对象」外判定相同；`open_project_still_rejects_unrelated_verification_failures`（外链源）与 `open_project_keeps_layer_budget_for_embedded_sources`（累计 64 层）证明没有连带放宽别的拒绝原因。普通上传/CLI 仍只走 `verify()` |
| Media 工程 ingest（`web/services/media-service/src/application/ingest.ts`） | 工程入口对含智能对象的工程整体拒绝，导致 Woohaa 里「只转回一个实例」的结果存不下来 | `verifyProjectForSave`：先按普通口径 `verifyForIngest`；**只有拒绝原因是 `unsupported-object` 且外层 `inspectEmbeddedPhotocraftProject` 确认 `objectKinds` 含 `smart`** 时才改走 `verifyEmbeddedForIngest`（外层结构 + 原生 `--embedded-smart` 摘要逐项一致） | 其他拒绝原因原样返回；外链智能对象、填充/形状/画板/智能滤镜、坏名称、不可逆仿射仍在任一条通道前被拒；未配置原生核验工具时 `native-verifier-unavailable` → 保存失败（fail closed），不会只凭外层结构通过 |

关于主仓 `openspec/specs/canvas-media-storage/spec.md` 的口径：其中「组内智能对象、外链、缺失资源或画板不得绕过核验」
**仍然成立**——放行不是绕过，智能对象只有在原生工具对整棵源树核验成功（且摘要与外层结构逐项一致）后才被接收，
未配置原生工具即拒绝。「工程包含首期未开放的对象类型」的措辞则随 P4 嵌入智能对象交付而不再精确：智能对象已不是
「未开放的对象类型」，而是「经 embedded-smart 通道核验后接收」。该条属于根 OpenSpec 的 `canvas-media-storage`
capability，与根 `canvas-runtime` 里「智能对象 MUST 关闭」同属**归档时写回**的滞后措辞（P4 在本 change 之前已交付，
不是本轮引入）；根 specs 在 PhotoCraft 父级 change 归档时统一同步，本 change 不改根 delta，也不据此放宽任何拒绝边界。

## 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。
外链智能对象、任意路径重链接和智能滤镜栈保持 NON_GOALS。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
