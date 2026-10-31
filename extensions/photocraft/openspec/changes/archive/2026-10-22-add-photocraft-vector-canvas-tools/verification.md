# 验收计划与记录

## 本次状态

域内（`features/vectors/` 四处目录：editor / protocol / editor-core / project-verify）已实现并跑通可离线判定的全部检查；
**画布手势接线、核验器 `lib.rs` 接线、WASM 基线刷新、能力矩阵与工具栏分组**原为共享单写文件，
本轮按用户明确指令「完成这个 change」解除约束，由本会话作为唯一集成负责人**顺序**完成，
逐条列在[本轮共享文件接线清单](#本轮共享文件接线清单按用户授权顺序实施)。
Woohaa 适配包本轮已真正跑通（34 files / 276 passed，见下文对上一轮结论的纠正）。
本轮把域内 TS 构造器直接接到真实 `dist/wasm` 内核（不手写参数），确认 7 种形状、5 种布尔、
19 条新命令的参数契约一致（**34 项接受 / 1 项预期拒绝**）；同时补上 U11 的**续接**、**自由钢笔采样**与**曲率钢笔**
（此前 `continueFrom`/`freehandDraft`/曲率钢笔均为死代码，`pen-freeform`/`pen-curvature` 与普通点钢笔行为完全相同），
三项回归都用变异测试确认真会失败。
本轮另补 U16 库管理：面板此前**只有选择/保存/删除，缺「重命名」与「分组」**（U16 明确要求的五项中的两项），
现已补齐「重命名所选预设 / 移动到分组 / 新建分组 / 重命名分组 / 删除分组」，
并按真实内核口径区分 `group` 参数（真实分组必须带、自定形状不能带、自定形状不可移动），
由 `preset-kernel-check.mjs`（真实内核 19 项）与 4 项新 UI 回归双向固定。
本轮还补了两条「门禁顺序」回归：无文档 → 草稿门禁 → 冻结窗口 → 内核 → `afterWrite`，只读读取不经过草稿门禁。
本轮**用真实内核改掉了一个域内真缺陷**：直接选择的「双击平滑/尖角转换」原先发 `path.convertPoint`
且不带 `out`，而该形态在上游是**单向转尖角**（`convert_point(path, knot, None)` = `Knot::corner`），
所以第二下双击毫无效果；现改发 `curvature: true`（`toggle_curvature_point`），已在真实内核上验证
「第一下转平滑、第二下转尖角」（`mask-kernel-check.mjs`）。
上一轮已修复 4 个只有真实内核才暴露的缺陷（见[真实 WASM 反向查出的缺陷](#真实-wasm-反向查出的缺陷上一轮与本轮修复)）；
上一轮还为域内适配层（`wasm-handle` / `panels` / `sections`）补了 20 项此前缺失的直接回归。

**本轮（3.2 / 3.3）新增的两块实质实现**：

- **内容身份与预算（3.2）**：已存命名路径 / 工作路径 / 裁切引用现在**进入 `contentHash`**，
  以「顶层可选字段 + 规范后缀行」折叠，空值整体省略 → 旧工程指纹逐字节不变
  （fixture 的 `projectContentHash` 仍是 `42d710c4700e1a13`，未变）；
  TS/Rust 两端同一规范文本，跨语言锚点 `vectorPathHash = ef50aab665dcced5`；
  4 个矢量预算字段进 `rust/project-limits.json` 单源，并由核验器在**解码前**累计裁定。
- **运行时会话门禁（3.3）**：`loadEditor` 做能力协商、画布手势携带文档代际令牌、
  矢量草稿进入统一 `hasActiveDraft()`/`blockingDraft()`、矢量命令复用保存/导出的冻结窗口，
  父子回写补上草稿门禁。

⚠️ 本轮**纠正了上一轮两处过度结论**：Woohaa “无法运行”实为安装不完整（非配置错误）；
原生核验器那条 `{"ok":true}` 只证明合法工程不被误拒，**不证明损坏路径会被拒**（后者是可复现缺口，本轮已接线并转为 EXIT 0）。
真实 UI 与渲染证据**未采集**，原因见[环境探测](#环境探测)与[待人工验证](#待人工验证)，不冒充已验收。

## 本轮共享文件接线清单（按用户授权顺序实施）

用户在本次会话明确要求「完成这个 change」，因此 `parallel-work.md` 里「共享核心保持单一写入、功能作者不得修改」
的**并行**约束被解除：本会话是唯一写入方，按顺序一次改完并逐条留痕，供集成负责人事后复核。
`parallel-work.md` 已同步记录该授权。**没有复制第二套实现**——所有共享文件只增加“路由/装配”代码，
几何、命中、命令参数、叠加层仍在 `features/vectors/` 内。

| # | 文件（相对 PhotoCraft） | 改了什么 | 为什么必须动共享文件 |
| --- | --- | --- | --- |
| 1 | `packages/editor/src/photo-editor-canvas.tsx` | 新增 `onVectorPointer` 属性与 `vectorRef`；在指针分派里**先于**平移/笔迹分支把文档坐标转发给归约器；`pointerup` 带 `doubleClick`/`moved`；取消手势时发 `cancel` | 只有画布知道客户坐标→文档坐标的换算与 pointer capture；域内不能自持捕获 |
| 2 | `packages/editor/src/features/index.ts` | 新增 `isFeatureVectorTool`（判 `shape`/`pen`/`path` 三种手势） | 工具手势的唯一注册表在共享 `features` 装配里 |
| 3 | `packages/editor/src/photo-editor-app.tsx` | 接 `useVectorGesture`、`onVectorPointer`、叠加层、键盘（Enter/Esc/Backspace/Delete）、矢量工具白名单、上下文栏、`presetChoice`/`pathChoice` 订阅 | 应用层是工具/面板/画布的装配点，域内无法自挂 |
| 4 | `packages/editor/src/photo-editor-chrome.tsx` | 按 `VECTOR_TOOLS.group` 把 12 个矢量工具合并成形状/钢笔/路径三个弹出组，成员与图标仍取自 `FEATURE_TOOLS`；组按钮的禁用仍走共享 `canRun`，不因分组放宽 | 工具栏渲染在共享 chrome 里；12 个工具逐个平铺会超出竖排高度 |
| 5 | `packages/editor/src/editor-tool-group.tsx` | `ToolOption.Icon` 由 `LucideIcon` 放宽为 `ComponentType<{ size?: number \| string }>` | `ui/icons` 的 `withDefaults` 包装不是 `ForwardRefExoticComponent`，不放宽则钢笔类图标进不了工具组 |
| 6 | `packages/editor/src/editor-view-model.ts` | 解码 `hasVectorMask`（`hasMask` 仍只表示像素蒙版） | 视图模型是图层行的唯一解码处；矢量蒙版可编辑性判断依赖它 |
| 7 | `packages/editor/src/features/boundaries.test.ts` | 随 12 个工具登记更新边界断言 | 该文件属共享边界测试，登记工具后不同步即失败 |
| 8 | `packages/editor/src/photo-editor-canvas.test.tsx` | 新增 3 项：坐标转发、拖动不落笔迹、取消与双击标记 | 共享画布的既有测试文件，新分派分支须在此固定 |
| 9 | `rust/crates/project-verify/src/lib.rs` | 在 `inspect_layers(...)` 之后调用 `features::vectors::inspect_document` | 核验器公开入口是共享文件；不接则该判据永不执行（上一轮 EXIT 1 的可执行证据） |
| 10 | `notes/feature-boundary-wasm-baseline.json` | `commands` 并入 19 条新命令 id（字典序） | 行为基线是共享单写；不刷新 `features:check` 必失败 |
| 11 | `packages/protocol/src/index.ts` | 纯 re-export 本域解码器与类型（`VECTOR_LIMITS`、`VECTOR_SHAPE_KINDS`、`decodeVectorShapeParams` 等） | 协议包 `exports` 只映射 `.`，而域解码器必须被编辑器复用；已收敛为根入口只从 `./features/vectors/index.js` 转出一次 |
| 12 | `integrations/woohaa/tests/editor-workspace.test.ts` | 内核替身补 `vectorPresetsJson` / `vectorDrawParamsJson` 两行 | 本域新增的实例方法是必填契约，不补则该包 typecheck 直接失败 |
| 13 | `notes/capability-matrix.md`、`docs/code-map/photocraft.md`、`packages/editor/README.md` | 能力矩阵 `vector.*` 行、模块地图 vectors 段、公共包说明 | 任务 4.4 与 AGENTS.md 要求；能力矩阵属共享单写 |
| 14 | `packages/editor/src/editor-wasm.ts` | `loadEditor` 在 `new WasmEditor()` 后调用 `capabilityHandshakeJson()` 并经协议 `verifyPhotocraftHandshake` 核对；漂移则 `free()` 后按 `capability-drift` 拒绝 | 运行时协商（任务 3.3）是**装配入口**的职责，域内没有实例构造权；不接则「新界面 + 旧 WASM」会渲染出没有实现的入口 |
| 15 | `packages/editor/src/editor-workspace.ts` | 新增 `setVectorDraft`/`hasVectorDraft`/`vectorToken`/`blockingDraftExceptVector`/`writesFrozen`；`hasActiveDraft`/`blockingDraft` 纳入矢量草稿；`updateSmartParent` 补草稿门禁、`updateSmartParentFromChild` 拒绝子文档草稿；`dispose` 清登记 | 保存/切标签/关闭/父子回写门禁的**唯一仲裁处**就在控制器；域内只能登记「有/没有草稿」，不能自己判门禁 |
| 16 | `packages/editor/src/features/workspace-context.ts` | `VectorDocumentToken` 类型 + `blockingDraftExceptVector`/`vectorToken`/`writesFrozen` 三个端口声明 | 域会话与控制器之间的端口契约；缺声明时域内无法在不 import 控制器的情况下判门禁 |
| 17 | `packages/editor/src/editor-wasm.test.ts`、`editor-workspace-tools.test.ts` | 新增「协商 7 种漂移全部拒绝 + free 调用 + 一致通过」「矢量草稿门禁/自身提交」「代际令牌不符丢弃」「冻结窗口拒绝」「父文档回写门禁」「子文档草稿拒绝导出」共 6 项 | 这些是共享文件的既有测试；新门禁必须在这里固定，否则日后重构会静默移除 |
| 18 | `packages/protocol/src/features/vectors/content.ts`、`features/shared/content.ts`、`image-project-content.ts`、`image-edit.ts`、`src/index.ts` | 路径与矢量外观的规范化函数与类型（含 `shape.appearanceHash`、蒙版 `density`/`feather`）、`ImageProjectContent` 的可选字段、`canonicalizeImageProjectContent` 的后缀接线、4 个矢量预算常量、根入口 re-export；并修正 `canonicalizeVectorMask` 的失败传播 | 内容身份（任务 3.2）的权威实现在协议包；`exports` 只映射 `.`，域解码器与常量必须由根入口转出 |
| 19 | `rust/crates/editor-core/src/identity.rs` + `identity/tests.rs` | 新增 `canonicalize_saved_paths`/`canonicalize_work_path`/`canonicalize_clipping_path` 与后缀行插入；形状 `appearanceHash` 与蒙版 `density`/`feather` 可选后缀；UTF-16 排序与 `js_rounded` 平直度（并把它开放给本域复用，避免第二套取整） | 规范文本的单一定义处；TS 端必须与它逐字节一致，否则同一工程在两端得到不同 `contentHash` |
| 20 | `rust/crates/editor-core/src/document_content.rs` + `document_content/tests.rs`、`features/vectors/content.rs` | `document_paths_identity` 产出路径摘要并在 `project_content` 顶层合并；形状外观摘要与蒙版密度/羽化并入层内容；保存重开回归 | 内容身份的**取样点**是共享的 `project_content`；本域只提供贡献函数，不复制取样逻辑 |
| 21 | `rust/crates/project-verify/src/lib.rs`、`limits.rs`、`tests/verify.rs`、`rust/project-limits.json`、`tests/fixtures/contract.json` | 解码前 `inspect_manifest_budget`；4 个预算常量；解码前预算回归；跨语言身份锚点 `vectorPathCanonical`/`vectorPathHash` 与 `shapeAppearance*`/`maskDensity*` | 预算单源与核验入口都是共享文件；不在这里加，预算只能靠渲染期夹取 |
| 22 | `notes/feature-boundary-baseline.json`、`integrations/woohaa/src/document-session.ts`、`integrations/woohaa/src/test-support/photo-editor-harness.tsx` 与适配包测试 | `sharedFiles` 三项摘要刷新 + `sharedFileRevisions` 记录；`pendingDraftOf` 的矢量草稿分支；宿主替身补 `setVectorDraft`/`token` 端口 | 行为基线是共享单写；宿主门禁与测试替身属共享装配，域内无法自挂 |

（第 11、12 项在上一轮就存在，本轮一并在表里登记，避免「域外文件」清单只覆盖新增项。
共享文件新增的回归 `features/vectors/rail.test.tsx`（工具栏三分组与只读禁用）位于域内，不在上表。）

本轮**未**触碰：`photo-editor-tools.ts`、`editor-tool-panels.tsx`、`rust/crates/editor-core/src/editor.rs` /
`editor/tools.rs` / `wasm.rs` / `capability.rs`、能力 id 与 vendored `vendor/photocraft`。
`contract.json` / `project-limits.json` / `identity.rs` / `document_content.rs` 属第 19–21 项**只新增本域键**，
既有键的规范文本与 8 组状态/内容快照仍与 `bdc3c084` 逐字相同（`pnpm features:check` 实测）。


## 环境探测

按 AGENTS.md 的平台分支探测（禁止用 `/dev/dri` 判断 macOS）：

```sh
ls /dev/dri 2>/dev/null | grep '^renderD'   # 本机：无输出（exit 1）
echo "$DISPLAY / $WAYLAND_DISPLAY"          # 本机：均为空
uname -s                                    # 本机：Linux
```

结论：本工作环境是 **Linux 容器，无 `renderD*` 设备、`DISPLAY` 与 `WAYLAND_DISPLAY` 皆为空**，
因此没有真实 GPU、也没有显示会话。按仓库规则，帧率/渲染截图/1440×1000 与 1024×768 走查
**不在本环境采集**，一律留在「待人工验证」，原因写真实项（无 GPU + 无显示会话），
不写成“工具未安装”或“缺依赖”，也不用软件渲染替代。

## 已执行的非渲染检查（真实结果，接线后全量重跑）

| 命令 | 结果 |
| --- | --- |
| `pnpm run check`（PhotoCraft：build + typecheck + test） | **EXIT 0**；protocol 4 files / **84 passed**，project-verifier 2 files / 40 passed，editor 54 files / **411 passed**，`tsc` 0 错误 |
| `cargo test --manifest-path rust/Cargo.toml --workspace --offline` | **319 passed / 0 failed**（主目标 **234** + 其余目标 6/13/25/11/1/3/10/16，另有 3 个 0 用例的 doc-test 目标） |
| `cargo test --manifest-path rust/Cargo.toml -p photocraft-embed-editor --offline vectors` | **29 passed**（本域回归：拖绘一步历史、圆角/边数裁定、三角形归一、零面积/零长度拒绝、星形降级防护、布尔、蒙版、锚点、预设） |
| `cargo test --manifest-path rust/Cargo.toml -p photocraft-embed-editor --offline document_paths` | **3 passed**（路径身份规范文本与 TS 一致、空值保持旧指纹、保存→重开后指纹相等） |
| `cargo test --manifest-path rust/Cargo.toml -p photocraft-embed-editor --offline shape_appearance_and_mask_density` | **1 passed**（形状外观与蒙版密度/羽化逐个改都改变指纹、保存→重开相等、非法范围拒绝） |
| `cargo test --manifest-path rust/Cargo.toml -p photocraft-project-verify --offline vector` | **共 4 passed，分布在两个目标**：lib 单元目标 **3 passed**（`vectors_inspect` 边界用例）+ `tests/verify.rs` 集成目标 **1 passed**（`vector_payload_budgets_are_enforced_before_decoding`）；其余目标 0 passed（被过滤） |
| `cargo check --target wasm32-unknown-unknown` | 无错误、无本域警告 |
| `pnpm run wasm` | `✓ 编辑内核就绪 → packages/editor/dist/wasm（wasm 17.40 MiB，glue 92.0 KiB）` |
| `pnpm run verifier` | `✓ 工程核验工具就绪 → packages/project-verifier/dist/bin/photocraft-project-verify（3.84 MiB）` |
| `pnpm codemap:check` | 通过：47 个 manifest、11 篇文档、**1358** 个本地链接、8 个模块入口清单 |
| `pnpm openspec validate 2026-10-22-add-photocraft-vector-canvas-tools --strict` | `Change '…' is valid` |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `pnpm features:check` | **通过**：`commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084`（19 条新命令已并入基线，其余字段逐字相同） |
| `pnpm boundary:check` | **失败，与本次改动无关**：`expected [ 'artifacts', 'logs' ] to deeply equal []`（本 worktree 缺这两个顶层目录，属仓库布局而非本域代码） |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | **通过** |
| Woohaa 适配包 `vitest`（`integrations/woohaa`，34 files） | **34 files / 276 passed** |
| `node openspec/changes/…/verify-wiring-gate.mjs` | **EXIT 0**：合法工程 `ok`，3/3 损坏工程全部被拒 —— `inspect_document` 已接线 |
| `node openspec/changes/…/identity-kernel-check.mjs` | **EXIT 0**：**13/13** 通过（路径进身份、保存重开相等、清空恢复旧指纹、裁切缺失被拒） |
| `node openspec/changes/…/appearance-kernel-check.mjs` | **EXIT 0**：**27/27** 通过（描边 7 个字段、填充色与改成「无」、圆角、蒙版密度/羽化逐个改都改变 hash、保存重开逐字相等、越界被拒、空矢量工程不漂移） |
| `node openspec/changes/…/pen-kernel-check.mjs` | **EXIT 0**：U11 续接/曲率钢笔/两步撤销 8 项全通过（真实 `dist/wasm`） |
| `node openspec/changes/…/preset-kernel-check.mjs` | **EXIT 0**：U16 库管理（重命名/分组/移动/删除）19 项全通过，含 4 项「必须被拒」的负向断言 |
| `node openspec/changes/…/mask-kernel-check.mjs` | **EXIT 0**：U15 蒙版几何命令链 20 项全通过（六个 `path.*` 逐个改一处、非法参数被拒、只改蒙版、栅格化保留图层） |
| `constructor-to-kernel.ts`（esbuild 打包后运行） | **34 项接受 / 1 项拒绝**；唯一拒绝是 `select.convertToShape` 在无选区时被拒（预期前置条件） |

### 门禁缺口已转为通过（上一轮 EXIT 1 → 本轮 EXIT 0）

上一轮 `verify-wiring-gate.mjs` 以 EXIT 1 证明「`inspect_document` 已实现但未被公开入口调用」，
当时三个损坏工程全部被放行。本轮在共享 `project-verify/src/lib.rs` 的 `inspect_layers(...)` 之后
加了一行调用，重跑同一脚本：

```
基线工程：ok（应 ok）
tampered/clipping_path_missing: rejected（正确）
tampered/saved_path_empty_name: rejected（正确）
tampered/saved_path_huge_coord: rejected（正确）
全部 3 个损坏工程被拒：路径核验已接线。
EXIT 0
```

这条门禁的价值就在于它**只认公开入口的行为**：单测能过而入口没接时，脚本仍然报错。

### 对上一轮“Woohaa 无法运行”结论的纠正

上一轮把 `photocraft-woohaa` 的 vitest 失败判为「配置指向不存在的 React 路径」，并据此把任务 3.4 挂起。
本轮实测发现**结论错了**：`vitest.config.ts` 指向的是标准 pnpm 虚拟存储位置
（`photocraft/node_modules/.pnpm/react@18.3.1/node_modules/react`，与 lockfile 里 `react@18.3.1` 同名同版本），
失败的真实原因是本 worktree 的 `photocraft/node_modules/.pnpm` **只有 `lock.yaml`、虚拟存储条目缺失**
（`pnpm install --offline` 报 “Already up to date” 也不会补），不是配置写错、也不是本改动引入。

补齐该 gitignore 目录下的两条链接后，适配包套件可以真正跑完：

```
Test Files  34 passed (34)
     Tests  275 passed (275)
```

（3.3 落地后又补了宿主测试替身的 `setVectorDraft`/`token` 端口，现为 **34 files / 276 passed**。）

因此任务 3.4 的阻塞原因由「配置错误、不可修」改为「本机安装不完整、`pnpm photocraft:setup` 标准流程即可修复」，
并已按真实结果重判。首次全量并发跑时有 1 例 `transform-interaction` 因共享上下文时序偶发失败，
单跑与复跑均 8/8 通过，属测试自身并发敏感，与本改动无关（本域未触及该用例路径）。

## 域内适配层与接线回归（不在共享文件里的部分）

集成方接线前，域内适配层此前**没有直接测试**。上一轮补 3 个文件共 **20 项**；上一轮末再补 **8 项**
（`wasm-handle` 5→7 的门禁顺序与只读旁路、`vector-tools-panel` 12→16 的 U16 库管理、`presets` 11→13 的组名裁定），
并逐项做变异验证：把只读路径改成误调 `afterWrite`、把 `shapeLayers` 改成统计全部形状层、
把内置预设的 `group` 去掉或给自定形状加上 `group` → 相应用例立即失败，恢复后回到全绿。

本轮接线后新增 4 个测试文件、域内共 **15 个文件 / 132 项**（`npx vitest run src/features/vectors`）：

| 文件 | 覆盖 | 为什么重要 |
| --- | --- | --- |
| `wasm-handle.test.ts`（9） | 命令/快照/预设库/拖绘参数按 JSON 往返不改形态；内核抛错转 `EditorResult` 失败；只读读取零写入；一次命令一次写入；被拒零写入；无文档与草稿进行中都在写入前拦下；**门禁顺序**（无文档 → 草稿 → 冻结 → 内核 → `afterWrite`）与只读不经过草稿门禁；**冻结窗口拒绝且零写入**；**代际令牌不符（换代际 / 只换活动文档）都不调内核** | 3.1/3.3「拒绝/取消/只读/一步历史/门禁顺序/晚到命令丢弃」在**适配层**的落点 |
| `panels.test.tsx`（11） | 形状预览的缩放/原点投影与翻转尺寸；零面积只出提示不画形状；直线画线段；锚点/手柄渲染与收起手柄不画线；选中/悬停 data 属性与命中圈换算；开/闭合路径；拖绘 hook 的 begin/update/cancel；钢笔 hook 的追加/撤销/结束/重置与单锚点不可提交 | 叠加层投影，必须能在**不依赖共享画布**时验 |
| `sections.test.tsx`（4） | 槽位/菜单/顺序/唯一性；容器 `data-advanced-section`；只读锁透传；`shapeLayers` 只统计「已选中形状层」 | `shapeLayers` 是 U14 布尔运算的启用前置，口径错了会让单层也被允许合并 |
| `vector-tools-panel.test.tsx`（17） | 数值创建与拖绘同一份几何且过协议解码器；7 种形状全部被协议接受；三角形归一与回填；属性回填/编辑/取消；布尔启用与层序；蒙版密度换算；路径变换/裁切/选区；U16 库管理（内置带 `group`、自定形状不带、重命名/移动/分组增删）；路径目标选择；只读全禁用 | 面板与画布共享同一批 store，参数错了画布也会错 |
| `canvas-bridge.test.ts`（8） | **本轮新增**：面板形状参数进入拖绘（圆角/边数/星形比例/描边）、拖动零命令松手恰一条、自定形状未选预设有明确拒绝、曲率钢笔两步命令经真实内核按序落地、直接选择拖动只改一个锚点、路径选择移整条子路径 vs 直接选择移单锚点、双击线段插锚与双重双击 `curvature` 翻转、只读不提交 | 归约器 → 真实内核的接线语义，全部跑 `dist/wasm` |
| `canvas-bridge-hook.test.tsx`（5） | **本轮新增**：拖绘松手只提交一条 `shape.create` 且提交后叠加层清空、只读时零命令但叠加层仍工作、路径编辑默认改图层自身路径（形状层）、面板选命名路径时不被图层覆盖、**未结算拖绘登记为草稿并在松手/卸载时解除** | 这是 `useVectorGesture` hook 本身（挂 React 树、真实内核），不是纯函数 |
| `rail.test.tsx`（2） | **本轮新增**：12 个矢量工具在共享 `EditorToolRail` 里合并成三个组、组内成员与 `VECTOR_TOOLS` 一致、非组头不单独出现、展开后点最后一个成员回调拿到正确 id；只读时主按钮禁用且长按/右键都不展开 | 工具栏是共享文件里唯一「用户能否点到工具」的地方，分组写错会导致工具不可达 |
| `path-selection.test.ts`（2） | **本轮新增**：目标解析的显式优先与「默认落到图层自身路径」、空名归为工作路径 | 面板与画布必须看同一条路径，错位只有接线后才会暴露 |

其余纯逻辑文件：`shape-tools`(12)、`pen-tools`(8)、`path-edit`(7)、`boolean-ops`(6)、`mask-edit`(5)、
`presets`(13)、`vector-tools`(23)，合计 74 项。`vector-tools` 是**共享画布唯一的接入点**
（12 个工具 id/顺序、7 种形状拖绘、钢笔开放/闭合/续接/自由/曲率、U12 命中与双击转换、U16 自定形状拖绘、
单击尺寸输入），画布只做路由，语义全在这里。

共享画布自身新增 3 项（`photo-editor-canvas.test.tsx` 33 项）：
文档坐标转发（含 Shift）、拖动期间**不**产生笔迹/钢笔点也不平移、
`cancelGesture` 通知归约器丢弃草稿且不补交抬笔、`pointerup` 带 `detail>=2` 的双击标记。

## 真实 WASM 反向查出的缺陷（上一轮与本轮修复）

把「拖绘参数 → `shape.create`」整条链放到真实 `dist/wasm` 上跑，查出 4 个单元测试看不到的缺陷。
它们都属于**只有接线才会暴露**的那一类，已全部修复并加正/反向回归：

| 缺陷 | 根因 | 修复 | 回归 |
| --- | --- | --- | --- |
| 三角形无法创建（真实内核报 `unknown kind`） | 界面把 `triangle` 当成 wire 种类，但上游只有 `polygon`/`star` | `shape-tools.ts` 与 `gestures.rs` 把界面种类归一为 `polygon` + `sides: 3`；wire 枚举移除 `triangle`；面板回填时再换回「三角形」 | `shape-tools.test.ts`、`vector-tools-panel.test.tsx`、`tests.rs::triangle_is_accepted_as_a_three_sided_polygon…` |
| 多边形/三角形创建被自家白名单拒绝 | 非星形也发 `starRatio: 1`，而白名单要求 `< 1` | 只有星形才发 `starRatio`；白名单按种类区分（多边形允许上游的 `1.0` 正多边形哨兵值） | 同上 + `params.test.ts` |
| 零面积矩形与零长度直线被上游照收，留下看不见的图层 | 域内只校验了拖绘几何，没校验直接提交的 `rect`/`from,to` | `validate_shape_params` 增加矩形宽高为正、直线长度非零的前置裁定 | `tests.rs::zero_area_shapes_are_rejected_before_the_kernel` |
| 双击锚点转换平滑/尖角（初版只单向） | `path.convertPoint` 不带 `out` 在上游是 `Knot::corner`，只会转尖角，双击无法切回平滑 | 改发 `curvature: true`（`toggle_curvature_point`），按锚点当前状态双向翻转 | `vector-tools.test.ts`、`path-edit.test.ts`、`mask-kernel-check.mjs`（双向实测） |
| 星形可被一次编辑静默降级成多边形 | `shape.edit` 省略 `kind` 时，`starRatio: 1.0` 被判为合法多边形比例 | 校验器在缺 `kind` 时按图层实际种类裁定（`previous_live_kind`） | `tests.rs::editing_only_star_ratio_uses_the_layer_kind…` |
| **只改形状填充/描边或蒙版浓度被判成「无净变化」** | 内容身份只算了**路径几何**：`shape.contentHash` = `path_hash`，矢量蒙版只带 `enabled/linked/contentHash`。而填充/描边/规范参数与蒙版 `density/feather` 都是 `.pcraft` 里逐字段保存的持久内容 | 形状外观并入 `shape.appearanceHash`（填充、描边全部字段、`LiveShape` 规范参数），蒙版并入 `density`/`feather`；两端都是**可选后缀**，省略时指纹逐字节不变 | `appearance-kernel-check.mjs`（27 项，真实内核）、`document_content/tests.rs::shape_appearance_and_mask_density_are_persistent_content_identity`、`image-project.test.ts`、`contract-fixture.test.ts` + Rust `contract_fixture.rs` 双向锚点 |
| **TS 侧非法矢量蒙版得到合法指纹** | `canonicalizeLayer` 把 `canonicalizeVectorMask()` 的 `null` 直接拼进规范文本，得到字面量 `"null"` 而不是整层判为不可判定 | 改为与其它 `canonicalize*` 一致：`null` 直接让 `canonicalizeLayer` 返回 `null` | `image-project.test.ts`「越界密度/羽化 → `null`」；Rust 侧同口径断言 |

同时消除了域内一处「协议解码器只有测试在调用」的缺口：`decodeVectorShapeParams` 现在是
`shapeCreateParams` 的提交前关口，`decodeVectorShapePresetLibrary` 是面板 `decodeLibrary` 的唯一结构裁定者
（预设专属的 256 子路径上限与通用 4096 区分开，且在协议拒绝时给出具体文案）。这两条都有生产调用链。

**仍无生产调用链、本轮不假报为已接线**的一对：`snapshotWithinBudget` / `restoreSnapshotParams`
（对应 Rust `presets::snapshot_within_budget` / `presets::restore`）。它们只用域内常量与
`vectorPathWithinBudget` / `vectorPresetSnapshotWithinBudget` 做有界校验与整批替换，测试覆盖完整
（`presets.test.ts` 13 项 + Rust `restore_is_atomic_and_rejects_duplicates_names_and_illegal_geometry`），
但**当前没有调用方**：UI 侧库操作走 `shape.presets.*` 与 `vectorPresetsJson` 回读，库按 design D3
是工具状态、不随 `.pcraft` 持久化，因此没有「导入/恢复整库」的入口。其中「库重载可复现」由面板每次从
`vectorPresetsJson` 重读快照满足；整库快照恢复属宿主持久化端口，需产品决定是否开口（见文末清单第 7 条）。
本轮**没有**为了「消灭无调用方」而新增推测性 UI —— 那会造出一个没人要求、也无法验收的导入/导出入口。

### `features:check` 的基线刷新（本轮已完成）

用同一脚本逻辑逐字段比对（`/data/tmp/features-probe.mjs`）：

- `sharedFiles` 摘要漂移：**0 个**（limits / contract fixture / identity.rs / Cargo.lock / pnpm-lock 未动）。
- `build`、`capabilities`、8 组 `state`+`contentHash`、`errors`、`output.png` 字节：**与 `bdc3c084` 基线逐字相同**。
- 命令差异：新增 19 条、删除 0 条：
  `edit.defineCustomShape`、`layer.combineShapes.{unite,subtractFrontShape,intersectShapeAreas,excludeOverlappingShapes,mergeShapeComponents}`、
  `layer.vectorMask.{edit,currentPath}`、`path.{addAnchor,bendSegment,convertPoint,deleteAnchor,moveAnchors,moveHandle}`、
  `shape.presets.{list,place,new,edit,reset}`。

即：**除“本域确实多开放了 19 条命令”外没有任何行为漂移**。本轮已按用户授权把这 19 个 id
并入共享 `notes/feature-boundary-wasm-baseline.json` 的 `commands`（字典序），
`pnpm features:check` 现为**通过**：
`Feature boundary equivalence: commands, capabilities, errors, 8 content/state snapshots, undo/redo/cancel and PNG bytes match bdc3c084.`

## 逐项能力矩阵（生产命令 → 包装 → WASM → UI → 内容/核验 → 结果）

| U | 生产命令/参数 | 包装（Rust） | WASM | UI 入口 | 内容/核验 | 结果 |
| --- | --- | --- | --- | --- | --- | --- |
| U08 | `shape.create` + `vectorDrawParams`（`kind/rect/from/to/weight`，Shift/Alt 已换算） | `gestures.rs` → `composition_domain::shape` | `vectorDrawParamsJson`、`vectorCommand` | 面板数值创建 ✅；**画布拖绘 ✅**（`shape` 手势） | `path_hash` 进层身份；核验 `live_bounded` | **通过**（拖绘一条命令、一条历史；单击零面积转尺寸输入；真实窗口走查待人工） |
| U09 | `shape.create`/`shape.edit`（`radii`、`sides`、`star_ratio`） | `validate_shape_params(params, rect)` | 同上 | 面板圆角/边数/内外比例 ✅；拖绘 ✅ | 同 U08 | **通过**（含“改边数轮廓真的变”、三角形归一） |
| U10 | `shape.edit`（`rect/radii/fill/stroke{width,color,opacity,align,cap,join,dashes,dashOffset}`） | `composition_domain::shape` | `vectorCommand` | 面板「编辑形状属性」✅ | 同 U08 | **通过**（改一层不新增层、取消丢弃） |
| U11 | `path.set`（`{subpaths:[{closed,knots:[{anchor,in,out,smooth}]}]}`）+ `path.moveAnchors{curvature:true}` | `pen-tools.ts`（`continueFrom`/`freehandDraft`/`curvatureParams`）+ `parse_path` | `vectorCommand` | 面板钢笔草稿 ✅；**画布钢笔 ✅**（`pen` 手势，含拖柄/开放/续接/自由/曲率） | 路径 `path_hash` | **通过**（续接只在点末端锚点时触发；曲率靠内核重排手柄、两步历史） |
| U12 | `path.{moveAnchors,moveHandle,bendSegment,convertPoint,addAnchor,deleteAnchor}` | `path_edit::validate` | `vectorCommand` | 面板无锚点入口；**画布直接选择/路径选择 ✅** | 一次拖动一步历史 | **通过**（命中 6px÷zoom；只改预期节点；双击 `curvature` 双向翻转；真实内核 20 项） |
| U13 | `path.transform`、`path.clippingPath.set/clear`、`select.convertToShape`、`path.toSelection` | `boolean-ops.ts` | `vectorCommand` | 面板按钮组 ✅ | **核验器已接线**：`inspect_document` 覆盖路径/裁切引用 | **通过**（含工程字节重开后引用一致；损坏引用被核验器拒绝，EXIT 0） |
| U14 | `layer.combineShapes.{unite,subtractFrontShape,intersectShapeAreas,excludeOverlappingShapes,mergeShapeComponents}` | `combine_shapes` + 容差裁定 | `vectorCommand` | 面板布尔组 ✅ | 结果写回普通路径 | **通过**（一步历史 + 一步撤销恢复原组件） |
| U15 | `layer.vectorMask.{revealAll,hideAll,edit,add,fromPath,enabled,linked,delete}` + `layer.rasterize.vectorMask` | `vector_mask` | `vectorCommand` | 面板蒙版区 ✅；**蒙版路径直接编辑 ✅** | `vectorMask.contentHash` 进身份 | **通过**（只改几何、图像保留、重开一致） |
| U15 | 直接编辑现有蒙版路径（画布手势） | `name:"layer"` + `layer:<id>`；`path.{moveAnchors,addAnchor,deleteAnchor,bendSegment,moveHandle,convertPoint}` | `path_edit::validate` | 路径目标选「当前图层」后直接拖锚点 ✅ | 一次编辑一步历史 | **通过**（`hasVectorMask` 解码 + `resolvePathTarget` 落到图层；命令层真实内核 20 项） |
| U16 | `shape.presets.{list,place,new,edit,reset}`、`edit.defineCustomShape` | `presets.rs`（有界快照/摘要） | `vectorPresetsJson` + `vectorCommand` | 面板预设区 ✅（含重命名/分组管理）；**Custom Shape 拖绘 ✅** | 库是工具状态，不进内容身份 | **通过**（删库/删分组不伤已应用形状；未选预设有明确拒绝） |

## 真实 WASM 冒烟（`dist/wasm` 真实产物，非替身）

脚本：早期的 `/data/tmp/vec-*.cjs`（一次性探针，未入库）。
**随 change 入库、可复跑**的共七个：`constructor-to-kernel.ts`（域内构造器 → 真实内核）、
`pen-kernel-check.mjs`（U11 钢笔三项）、`preset-kernel-check.mjs`（U16 库管理）、
`mask-kernel-check.mjs`（U15 蒙版几何命令链）、`identity-kernel-check.mjs`（3.2 内容身份与旧工程兼容）、
`appearance-kernel-check.mjs`（3.2 形状外观与蒙版密度/羽化的内容身份），
以及缺口门禁 `verify-wiring-gate.mjs`（**上一轮故意 EXIT 1 以固化缺口，本轮接线后为 EXIT 0**）。
七个脚本都要求先 `pnpm wasm`；`constructor-to-kernel.ts` 还需先 esbuild 打包（命令见下文）。

- **形状**：`shape.create` 圆角矩形 `radii:[10,10,10,10]`、星形 `sides:6,star_ratio:0.4` 均成功；`radii:[99,…]`（10×10 矩形）与 `sides:2`、`starRatio:1.5` 被拒；新建/编辑各一步历史；撤销恢复上一份有效半径。
- **拖绘参数纯度**：连续 5 次 `vectorDrawParamsJson` 后 `contentHash` 与 `document.revision` **完全不变**；零面积输入抛
  `命令 vector.shape.gesture 被拒绝：形状面积为零…`，文档仍不变。
- **路径/锚点**：`path.set` → `moveAnchors` 只动第 2 个锚点（`[100,240]→[100,230]`）；`addAnchor(t=0.5)` 插入 `[55,215]`；
  `convertPoint`（带 `out`）后该点 `smooth:true` 且带 `in/out` 手柄；`bendSegment`/`moveHandle`/`deleteAnchor` 均按预期变化；开放路径始终 `closed:false`。
- **布尔**：两矩形 `unite` → 2 子路径、包围盒 `[20,20,140,100]`、历史 +1；`undo` 恢复 2 个形状层；
  `subtractFrontShape` 包围盒 `[20,20,40,100]`、`exclude`/`intersect` 各 2 子路径、填充规则 `nonzero`。
- **裁切路径**：`path.clippingPath.set` 后快照为 `{name:"剪裁",flatness:2}`；`clear` 后移除；指向缺失名字被拒（`no saved path named "work"`）。
- **矢量蒙版**：像素层 `layer.vectorMask.add` + `edit(density:70,feather:3)` 成功；形状层加蒙版被内核拒（`a shape layer's path is already its vector mask`，符合上游语义）；
  `revealAll/hideAll` 参数为 `{layer,hide}`；`layer.rasterize.vectorMask` 后快照不再有该蒙版、图层仍在。
- **预设**：`shape.presets.list` 返回 5 个内置组；`place` 生成独立路径形状；`edit{action:"delete"}` 后库为空但**已应用形状仍在**（`shape.info` 几何逐字相同）；
  `reset` 恢复 5 组；名称空/超长、`rect` 零宽高被拒。
  **库管理（本轮补做，`preset-kernel-check.mjs` 19 项）**：`newGroup` 建组、重名自动改名为 `Mine 1`；
  重命名内置预设**必须带 `group`**（组名不符内核报 `no preset`）；`move` 可跨组且目标不存在时自动建组；
  `renameGroup`/`deleteGroup` 生效，删除后已放置的形状几何逐字不变；`deleteGroup` 对缺失组报错。
  **自定形状的特殊口径**：`edit.defineCustomShape` 产出的条目重命名/删除时**不能带 `group`**
  （带组名内核报 `no preset`），且**不支持 `move`** —— 面板据此分别处理，并把「移动到分组」按钮对自定形状禁用且写明原因。
- **工程往返**：`exportBundle().project` 重开（`openProject`）后 `contentHash` **相等**，
  形状 `live.radii`/`live.sides`/`live.star_ratio`、已存路径名、裁切路径引用全部一致；
  蒙版 `density 0.7 / feather 3 / 4 锚点` 重开后一致，图层构成仍为 `Pixel,Pixel`。
  含工作路径 / 已存路径 / 裁切引用的工程往返由 `identity-kernel-check.mjs` 固定为
  「重开后 hash 相等」（13/13 中的两项），路径这些持久字段现在也确实进入指纹。
- **原生核验器（正向）**：由真实 WASM 导出的 `.pcraft`（含圆角矩形 + 多边形 + 裁切路径；另一份含矢量蒙版）交给
  `photocraft-project-verify`：均 `{"ok":true}`，`objectKinds:["raster","shape"]`，`layerCount` 3 / 4。
  ⚠️ 这条**只证明合法工程不被误拒**，不证明损坏路径会被拒 —— 见下一节。

### 域内构造器 → 真实内核（本轮方法，替代手写参数）

前几轮的冒烟脚本是**手写参数**，无法发现「TS 构造器与内核契约不一致」。本轮改为先用 esbuild 把
`features/vectors/*.ts` 的构造器打成 node bundle，再把它们的输出原样交给真实 `dist/wasm`
（脚本已入库：`constructor-to-kernel.ts`，先 `pnpm wasm`，`PHOTOCRAFT_DIR=$PWD` 运行）。

结果：**34 项接受 / 1 项拒绝**，唯一拒绝是 `select.convertToShape` 在**无选区**时被拒
（`no selection`，属预期的前置条件，不是参数错位）。覆盖：

| 构造器 | 命令 | 结果 |
| --- | --- | --- |
| `shapeCreateParams` × 7 种 | `shape.create` | 7/7 接受 |
| `booleanParams` × 5 种 | `layer.combineShapes.*` | 5/5 接受 |
| `transformParams` / `clippingPathParams` | `path.transform` / `path.clippingPath.set` | 2/2 接受 |
| `defineCustomShapeParams` / `newPresetParams` / `placePresetParams` / `presetEditParams` × 6（rename / newGroup / move / renameGroup / delete / deleteGroup） | `edit.defineCustomShape` / `shape.presets.*` | 9/9 接受 |
| `maskFromPathParams` / `maskEditParams` × 2 / `rasterizeMaskParams` | `layer.vectorMask.*` / `layer.rasterize.vectorMask` | 4/4 接受 |
| `addAnchorParams` / `bendSegmentParams` / `commandForDrag` × 2 / `convertPointParams` × 2 / `deleteAnchorParams` | `path.*` | 7/7 接受 |

三项**探针自身**的误报已排除，均不属于产品缺陷（脚本已按正确用法写死，避免后人重犯）：
`transformParams` 第二参数是 6 元仿射矩阵（不是 `{translate}`）；
`clippingPathParams` 对应命令 id 是 `path.clippingPath.set`（不是 `clippingPath.set`）；
`addAnchorParams` 等返回 `{id, params}`，要取 `.params` 再提交。

另外确认 `density` 的单位分流是正确的：**命令入参 0–100、快照回读 0–1**（真实内核实测
`edit{density:40}` → `vectorSnapshot.vectorMasks[0].density = 0.4`；`density:101` 被拒），
因此面板 `Math.round(density*100)` 与 `maskSummaryText` 的换算都无误。

### 核验器接线：从缺口到通过（本轮已接线）

上一轮把上面那条 `{"ok":true}` 当作「路径持久性已被原生核验覆盖」的证据，**这是过度解读**。
上一轮用真实 WASM 造工程、篡改 `manifest.json` 的路径字段、再交给真实核验器二进制，结果三项全部放行：

| 篡改用例 | 期望 | 接线前 | 接线后 |
| --- | --- | --- | --- |
| 裁切路径引用不存在的已存路径 `MISSING` | 拒绝 | `ok:true`（放行） | **rejected** |
| 已存路径名称为空 | 拒绝 | `ok:true`（放行） | **rejected** |
| 已存路径锚点坐标 `1e12` | 拒绝 | `ok:true`（放行） | **rejected** |

原因：`features/vectors/inspect.rs::inspect_document` 已实现且自测通过，但共享
`rust/crates/project-verify/src/lib.rs` 在 `inspect_layers(...)` 之后**没有调用它**。
域内单测只证明判据正确，无法证明它被公开入口调用，因此上一轮把它固化成可执行门禁。
**本轮按用户授权在共享 `lib.rs` 加了一行调用**，同一脚本转为通过：

```sh
node openspec/changes/2026-10-22-add-photocraft-vector-canvas-tools/verify-wiring-gate.mjs
# 上一轮：EXIT 1，3/3 逃过核验
# 本轮：  EXIT 0，3/3 被拒，非法工程不再放行
```

（先 `pnpm wasm` 与 `pnpm verifier`。）接线前后的差异**只来自那一行调用**——域内判据与测试未变，
所以这条门禁确实测的是「公开入口有没有执行该判据」，而不是判据本身。

- **预设库不随工程走**：定义自定形状后重开工程，`custom` 由 1 变 0、内置 5 组仍在 —— 库是工具状态，符合 design D3。

### 内容身份的作用域（本轮已扩到文档级路径与矢量外观）

`contentHash` 覆盖图层树，**并自本轮起覆盖**文档级路径（已存命名路径 / 工作路径 / 裁切路径引用）
以及**矢量外观**（形状层的填充/描边/规范参数、矢量蒙版的密度/羽化）。此前的口径是这些都只算
路径几何，本轮按任务 3.2 补上，理由是它们都是**持久字段**：只改一条已存路径、只改描边宽度、
只调蒙版浓度时，工程字节变了而 `contentHash` 不变，宿主会把「有净变化」判成「无变化」而丢工作。

- **规范文本**（`identity.rs` 与 `features/vectors/content.ts` 逐字节一致）：
  `canvas:WxH` → `patterns:<hash>` → `paths:[<UTF-16 长度>:<名字>:<摘要>…]` → `work:<hash>` →
  `clip:<长度>:<名字>:<平直度 1e-4 归一>` → 图层行。
- **矢量外观是可选的图层内后缀**（不新增顶层行，避免影响无矢量内容的工程）：
  形状层 `shape:<几何摘要>[:appearance:<外观摘要>]`；矢量蒙版
  `|vector:<0/1>:<几何摘要>[:unlinked][:density:<0..1>][:feather:<0..1000>]`。
  外观摘要覆盖填充的全部字段、描边的全部字段与 `LiveShape` 规范参数；
  字段省略时指纹与改前逐字节相同。
- **顺序不敏感**：已存路径按 UTF-16 code unit 排序（Rust 用 `encode_utf16().cmp()`，对齐 JS 的 `String` 比较）。
- **失败必须传播**：`canonicalize*` 返回 `null` 时整层判为不可判定。TS 侧曾把
  `canonicalizeVectorMask()` 的 `null` 直接拼成字面量 `"null"`，使非法蒙版也能得到「合法」指纹，
  本轮已修（与其它规范函数一致地向上传播）。
- **旧工程兼容**：路径三个字段为空时**整体省略**，外观后缀缺省时**不出现**，因此没有路径/外观
  的工程指纹与改前逐字节相同（`tests/fixtures/contract.json` 的 `projectContentHash` 仍为
  `42d710c4700e1a13`，`features:check` 的 8 组内容/状态快照与 `bdc3c084` 逐字相同）。
- **跨语言锚点**：fixture 另有 `vectorPathCanonical` / `vectorPathHash = ef50aab665dcced5`
  与 `shapeAppearanceCanonical` / `shapeAppearanceHash = 5ecb006223572088`、
  `maskDensityCanonical` / `maskDensityHash = 1d8ebc300a3a9588`；
  Rust `contract_fixture.rs` 与 TS `contract-fixture.test.ts` 双向断言同一字符串。
- **实测**（`identity-kernel-check.mjs`，真实 `dist/wasm`，13/13）：新增已存路径、改其几何、写工作路径、
  设裁切、改平直度都改变 `contentHash`；保存重开后相等；清空路径后回到旧基线指纹；
  裁切引用指向缺失路径被拒。
- **实测**（`appearance-kernel-check.mjs`，真实 `dist/wasm`，27/27）：形状描边 7 个字段与填充（含改成
  「无」）、圆角逐个改动都改变 `contentHash`；蒙版密度/羽化同样；两者保存重开后 hash 逐字相等且字段仍在；
  越界密度（150）/羽化（-1）被拒且不改变 hash；空矢量工程重开稳定。

`revision` 仍会因写命令递增；「有无净变化」判据是 `contentHash`。本轮的改变方向是**只补持久字段**，
没有把视图状态（参考线/网格/标尺、预设库、面板选择）拉进身份——那些由 `features:check` 的快照与
`presets` 不进工程两件事共同保证。

### 运行时协商与文档归属门禁（任务 3.3，本轮实现与实测）

| 门禁 | 实现位置 | 行为 | 回归 |
| --- | --- | --- | --- |
| 能力协商 | `editor-wasm.ts::loadEditor` | `new WasmEditor()` 后立刻读 `capabilityHandshakeJson()`，交协议 `verifyPhotocraftHandshake` 逐项比对阶段与能力；缺字段、畸形 JSON、少/多能力、阶段缺项、顺序不同都拒绝，`free()` 释放半初始化对象后返回 `capability-drift` | `editor-wasm.test.ts`：7 种漂移逐个断言 `code` 与 `free` 调用次数，一致时正常建句柄 |
| 文档代际令牌 | `workspace-context.ts` 的 `VectorDocumentToken` + `vectors/workspace.ts` | 手势开始取 `{generation, session}`，提交时回传；代际或活动索引不符即 `code:"stale"`，**内核不被调用** | `wasm-handle.test.ts`（换代际 / 只换活动文档两种失效）、`editor-workspace-tools.test.ts`（换文档后零写入） |
| 矢量草稿 | `editor-workspace.ts` 的 `setVectorDraft`/`hasVectorDraft`/`blockingDraft` | 形状拖绘中、钢笔未完成、锚点拖动登记为 `vector-active`；其它写入口（`dispatch`/保存/新入口/父子回写）被拦，矢量自身提交走 `blockingDraftExceptVector()` 放行 | `editor-workspace-tools.test.ts`（草稿期 `layer.delete` 被拒、矢量命令仍成功、结算后解除）、`canvas-bridge-hook.test.tsx`、`document-session.test.ts` |
| 冻结窗口 | `writesFrozen()`（`dispatch` 与矢量命令共用） | 保存/导出取走成对产物后拒绝内容写入（`code:"frozen"`），不调内核、不推进修订 | `wasm-handle.test.ts`、`editor-workspace-tools.test.ts` 各 1 项 |
| 父子回写 | `updateSmartParent` / `updateSmartParentFromChild` | 父文档回写先过草稿门禁；子文档仍有未结算草稿时拒绝导出其工程，避免用半截工程覆盖父文档 | `editor-workspace-tools.test.ts`「父子回写与矢量命令共用草稿门禁」「子文档草稿未结算时拒绝把它导出回写父文档」 |

**变异验证**（本轮实际做过两次）：

1. 把 `vectors/workspace.ts` 的冻结判定与 `updateSmartParent` 的 `blockingDraft()` 删掉后重跑，
   **4 项用例立刻失败**（门禁顺序、冻结拒绝、父回写门禁、冻结期不写）；
2. 把 `updateSmartParentFromChild` 的 `child.hasActiveDraft()` 判据删掉后重跑，
   「子文档草稿未结算时拒绝…」立刻失败。

恢复后均回到全绿（`editor` 54 files / 411 passed）。

3. 把画布桥的 `controller.setVectorDraft(drafting)` 改成空 effect 后重跑，
   「未结算的拖绘登记为草稿，松手后解除」立刻失败——这条固定的是**桥真的登记了草稿**，
   而不只是控制器有 `setVectorDraft` 这个方法。

**没有独立「请求序号」机制**：矢量命令是同步调用，一次手势的多条命令按数组顺序执行、首个失败即停止，
跨文档失效靠代际令牌而不是序号。这里如实记录，不假称存在异步队列序号。

## 逐 U 记录

| U | 子能力 | 操作与参数 | 预期 vs 实际 | 证据 | 判定 |
| --- | --- | --- | --- | --- | --- |
| U08 | 数值创建 | 面板默认 `rect [0,0,100,100]` + `#3366cc` | 一条 `shape.create`，无多余参数 | `vector-tools-panel.test.tsx`、`shape-tools.test.ts` | 通过 |
| U08 | 拖绘手势 | 画布 `shape` 手势 → 归约器；Shift/Alt/零面积归约；松手提交 | 拖动期间零命令、松手恰一条 `shape.create`；几何与提交共用 `shapeCreateParams` 并经协议解码器复核；零面积/零长度拒绝；提交后叠加层清空 | `canvas-bridge-hook.test.tsx`（真实 `dist/wasm`）、`canvas-bridge.test.ts`、`photo-editor-canvas.test.tsx`（坐标转发 3 项）、Rust `vectors` 29 项 | **通过**（真实窗口体感待人工，见下文） |
| U08 | 单击输入尺寸 | 零面积单击 → `sizeInput` → 面板填入起点并聚焦宽度 | 不是「什么都没发生」的提示；面板宽度输入获得焦点 | `vector-tools.test.ts`、`vector-tools-panel.test.tsx` | 通过 |
| U09 | 圆角/边数/星形 | `radii` 上限按将用矩形裁定；`sides 3–100`；`starRatio 0.01–<1`；三角形归一为 `polygon`+3 | 10×10 上 `radii:99` 与 `radii:6` 均拒绝且不推进历史；40×40 上 8 合法；7 种形状在真实 WASM 上全部创建成功；面板参数经 `shape-options` store 进入拖绘 | Rust `rounded_corner_radius_is_bounded_by_the_rectangle_that_will_be_used`、`triangle_is_accepted_as_a_three_sided_polygon…`、`canvas-bridge.test.ts`「面板的形状参数进入拖绘」 | 通过 |
| U10 | 属性回填/编辑/取消 | 改宽高、圆角、描边属性后“应用属性”；三角形回填显示为「三角形」 | 只发一条 `shape.edit`；`rect/radii/fill/stroke` 全部回填自快照；“取消”零命令 | `vector-tools-panel.test.tsx`（17 项） | 通过 |
| U11 | 贝塞尔/开放/续接/自由/曲率 | 画布 `pen` 手势 + `PathOverlay` 手柄 + `continueFrom` 续接 + 自由钢笔采样 + 曲率钢笔两步提交 | 拖出切线柄；开放路径不闭合；`in/out` 与锚点重合不画手柄；**续接只在单击已有开放子路径末端锚点时触发**；自由钢笔用 coalesced 采样落成平滑折线；**曲率钢笔落平滑锚点后由内核 `moveAnchors{curvature:true}` 重排手柄**，且重排的 `name` 与落点一致（面板选命名路径时两条命令写同一名字） | `pen-tools.test.ts`（8 项）、`vector-tools.test.ts`、`canvas-bridge.test.ts`「曲率钢笔两步命令按序落地」、`pen-kernel-check.mjs`（真实内核 8 项） | **通过** |
| U12 | 命中/移动/增删/转换 | 画布 `path` 手势；`hitTest` 6px÷zoom；`moveAnchors`/`addAnchor`/`deleteAnchor`/`convertPoint`/`bendSegment` | 只改预期节点；一次拖动一步历史；非法索引/`t` 拒绝；`path-select` 拖整条子路径、`direct-select` 只动选中锚点；双击线段插锚。**双击转换必须用 `curvature:true`**：不带 `out` 的 `convertPoint` 只会转尖角，无法切回平滑（实测，已修正） | `path-edit.test.ts`（7 项）、`path-selection.test.ts`（2 项）、`canvas-bridge.test.ts`（拖动/整条子路径/双击）、`mask-kernel-check.mjs`、Rust `direct_selection_edits_one_anchor_per_drag…` | **通过** |
| U13 | 变换/裁切/选区转形状 | `path.transform`、`path.clippingPath.set/clear`、`select.convertToShape`、`path.toSelection` | 矩阵结果来自内核；裁切引用重开仍正确；**损坏的裁切/已存路径引用现被原生核验器拒绝** | `boolean-ops.test.ts`、`constructor-to-kernel.ts`、`verify-wiring-gate.mjs`（EXIT 0） | **通过**（核验侧已接线） |
| U14 | 五种布尔 | 选中 2 个形状层后逐个执行 | 整体提交、一步历史、一步撤销恢复原组件 | `boolean-ops.test.ts`、`constructor-to-kernel.ts`、Rust `boolean_operations_commit…` | 通过 |
| U15 | 全显/全隐/参数/栅格化/直接编辑 | `revealAll`/`hideAll`/`edit`/`rasterize`/`path.moveAnchors(name:"layer")` | 只改蒙版；图像保留；栅格化后蒙版并入像素蒙版 | `mask-edit.test.ts`、`constructor-to-kernel.ts`、`mask-kernel-check.mjs`（真实内核 20 项）、Rust 蒙版用例 | 通过 |
| U15 | 双击锚点平滑/尖角 **双向**转换 | `path.convertPoint{curvature:true}` | 第一下转平滑、第二下转尖角（实测）。初版用「不带 `out`」只能单向转尖角，第二次双击无效果，已修正 | `vector-tools.test.ts`、`path-edit.test.ts`、`mask-kernel-check.mjs` | 通过（真实内核验证双向） |
| U15 | **画布上直接编辑蒙版路径** | 路径目标选「当前图层」→ `resolvePathTarget` → `name:"layer"` + 图层 id；直接选择拖锚点 | 选中带矢量蒙版的像素层即可看见并拖锚点；改的只是蒙版几何，不动密度/羽化；`hasVectorMask` 与像素 `hasMask` 分开 | `canvas-bridge-hook.test.tsx`「路径编辑默认改图层自身路径」、`editor-view-model.ts` 的 `hasVectorMask`、`path-selection.test.ts`、`mask-kernel-check.mjs` | **通过** |
| U16 | 库管理/定义/放置 | `list/place/new/edit/reset`、`defineCustomShape`；`edit` 覆盖 rename/delete/move/newGroup/renameGroup/deleteGroup | 删库项与删分组都不伤已应用几何；库不随工程持久化；内置预设必须带 `group`、自定形状不带 `group` 且不可组间移动 | `presets.test.ts`（13 项）、`vector-tools-panel.test.tsx`（17 项）、`preset-kernel-check.mjs`（真实内核 19 项）、Rust 预设用例 | 通过 |
| U16 | Custom Shape 拖绘 | 画布 `shape` 手势（`custom-shape`）→ 落点矩形 → `shape.presets.place` | 用面板选中的预设放置；**未选预设时明确拒绝**并提示「请先选择一个形状预设」，不静默建默认形状 | `vector-tools.test.ts`、`canvas-bridge.test.ts`「自定形状用面板选中的预设；面板清空后拖绘被拒」 | **通过** |

## 参考项说明

- **`layer.vectorMask.currentPath` 与 `fromPath` 是同一个实现**：上游两条 spec 都调用
  `vector_mask_add(s, p, true)`（`vendor/…/vector_cmds.rs:1860` 与 `:1823`），行为完全一致。
  本域仍把两条都放行（协议与能力清单里都有），但**面板只给一个入口**，不摆两个同义按钮 ——
  这一点是本轮核对源码后从初版的两按钮方案改回来的。
- **跨文档复制**：形状层 `edit.copy` 成功，但 `edit.paste` 在本基线被
  `features/layers/clipboard_commands.rs` 的 `supported()` 白名单拒绝（`LayerContent::Shape` 不在其中），
  提示“剪贴板包含尚未开放的图层类型”。这是 **layers 域既有裁剪**，不是本域回归；
  本域的跨文档等价证据改用「同一 `.pcraft` 字节重开 `contentHash` 相等 + 参数逐字一致」。
  如需真正的形状层剪贴板往返，须由 layers 域开放该类型（跨域，本 change 不单方面修改）。
- **跨域附带发现（未修，属 layers 域）**：真实内核里 `canPasteLayerTransfer` 一律抛
  `unreachable` 且随后的 `pasteLayerTransfer`/`free()` 报 `recursive use of an object ... unsafe aliasing`。
  复现是**与矢量无关**的：只含像素层的载荷同样触发；单跑 `pasteLayerTransfer`（不先调预检）则成功，
  说明问题在预检函数内部而非载荷本身。定位线索：`features/layers/editor_transfer.rs` 的
  `can_paste_layer_transfer` 是该 crate 里唯一使用 `std::time::Instant::now()` 的地方，
  而目标产物里带着 `time not implemented on this platform`。
  该文件属 `2026-10-22-add-photocraft-layer-workflows` 的单一写入范围，本 change 不单方面修改；
  另 `EditorWorkspaceController.canPasteLayers` 目前**没有 UI 调用方**（宿主直接走 `pasteLayers`），
  因此当前界面路径不受影响。已在此如实登记，供 layers 域复核。

## 待人工验证

1. **真实窗口下的画布手势体感**（拖绘预览的跟手程度、Shift/Alt 手感、钢笔拖柄、直接选择命中半径、Custom Shape 拖绘）——
   接线已完成并有 jsdom + 真实 `dist/wasm` 的行为回归；但**帧率/渲染与指针体感**需在真实 GPU + 显示会话下人工确认。
2. **1440×1000 与 1024×768 界面走查**（菜单 → 工具组 → 参数栏 → 图内/属性反馈）——
   **真实原因：本环境为 Linux 容器，`ls /dev/dri | grep '^renderD'` 无输出、`DISPLAY`/`WAYLAND_DISPLAY` 皆为空**，
   即无 GPU 且无显示会话；按仓库规则不采渲染证据，也不用软件渲染替代。
3. **PSD 往返矩阵**（形状/路径在 PSD 中的表达，无法表达时报告而非静默压平）——
   **真实原因：本环境无 Photoshop、也没有 Photoshop 产出的 PSD 资产**（不是工具未安装）；
   `compatibility_matrix()` 的 `vector.shape-mask` 行是既有声明，不能用它代替往返验收。
   本轮**补做了内核侧字节往返**（本仓库编码器 → 本仓库解码器，真实 `dist/wasm`），
   结论是既有静默丢失，已登记在 `tasks.md` 3.2b：非 ASCII 路径名退化为 `???`、
   裁切平直度重置为 `0`、`EvenOdd` 退化为 `NonZero`，均不报告；形状层默认拒绝导出（符合 spec）。
   该修复属 `features/io/psd.rs`（raster-interchange 域的写入范围），本 change 不单方面修改。
4. **Pad 正常窗口 / 数位笔**——**真实原因：无对应硬件**，无法验证压感与笔尖精度。
5. **形状层跨文档复制**——`edit.paste` 被 layers 域白名单拒绝（见「参考项说明」），需该域先开放 `LayerContent::Shape`；
   本环境无法绕过该跨域裁剪。
6. **真实宿主会话下的切标签/关闭/父子回写链路**——门禁本身已有单测（`document-session.test.ts`、
   `editor-workspace-tools.test.ts`），但本环境没有可运行的 Woohaa 宿主会话与真实节点存储，
   宿主侧用例用的是内核替身。**真实原因：无宿主运行环境**（不是门禁未实现），
   故 5.2 仍不勾选。

## 需要集成方复核的确切清单（本轮已按用户授权实施，此处供复核）

> 与上一轮不同：这些**不再是待办**，而是本轮已完成的共享文件改动。列出确切落点是为了让集成负责人
> 能逐条复核「改了什么、为什么必须改、怎么验」。复核方式全部是重跑命令，不需要读代码猜测。

1. `photocraft/rust/crates/project-verify/src/lib.rs`：已在 `inspect_layers(...)` 之后加
   `features::vectors::inspect_document(&document)?;`。
   **复核方式**：`node openspec/changes/…/verify-wiring-gate.mjs` 应为 EXIT 0（上一轮同一脚本为 EXIT 1）。
2. `photocraft/notes/feature-boundary-wasm-baseline.json`：已把 19 个命令 id 并入 `commands`（字典序）。
   **复核方式**：`pnpm features:check` 通过，输出 `… match bdc3c084`。
3. `photocraft/packages/editor/src/photo-editor-canvas.tsx` + `features/index.ts`：
   已加 `onVectorPointer` 转发与 `isFeatureVectorTool`，并把 12 个矢量工具登记进 `features/vectors/index.ts` 的 `tools`。
   **复核方式**：`photo-editor-canvas.test.tsx`（33 项，含 3 项新分派回归）与 `features/boundaries.test.ts`（4 项）全绿；
   `pnpm run check` EXIT 0。
4. `photocraft/packages/editor/src/photo-editor-app.tsx` / `photo-editor-chrome.tsx` / `editor-tool-group.tsx` /
   `editor-view-model.ts`：应用层装配、三分组工具栏、图标类型放宽、`hasVectorMask` 解码。
   **复核方式**：`photo-editor-chrome.test.tsx`（5 项）、`photo-editor-app` 相关套件（Woohaa 54 项含同类）
   与 `pnpm -C photocraft/packages/editor run typecheck`。
5. `photocraft/packages/protocol/src/index.ts`：本域 re-export（`VECTOR_LIMITS`、`VECTOR_PATH_OPS`、`VECTOR_SHAPE_KINDS`、
   `decodeVectorShapeParams`、`decodeVectorShapePresetLibrary`、`vectorPathWithinBudget`、`vectorPresetSnapshotWithinBudget`
   及 6 个类型），因为 `@woohaa3/photocraft-protocol` 的 `exports` 只映射 `.`、域解码器又必须被编辑器复用。
   **已收敛到最小面**：根入口只从 `./features/vectors/index.js` re-export 一次，不绕过域入口。
   **复核方式**：`packages/protocol` 4 files / 84 passed，`tsc` 0 错误；如需改为包级子路径导出，可整体替换这一处。
6. `photocraft/notes/capability-matrix.md` 的 `vector.*` 行：已按实际范围改为指向 `features/vectors` 真实实现，
   并明写「真实窗口走查与 PSD 往返矩阵待人工」。**复核方式**：与 `features/vectors/index.ts` 的 `tools`
   和 `feature-boundary-wasm-baseline.json` 的 `commands` 对照，三处 id 必须一致（`features:check` 已覆盖第四条）。
7. **3.2 的三处冻结文件只新增本域键**（复核重点）：
   - `photocraft/tests/fixtures/contract.json`：新增 `vectorPathCanonical` / `vectorPathHash`，**旧键一字未动**
     （`projectContentHash` 仍是 `42d710c4700e1a13`）。
   - `photocraft/rust/project-limits.json`：新增 4 个 `maxVector*` 键，既有键未改。
   - `photocraft/rust/crates/editor-core/src/identity.rs`：新增三个函数与三行 suffix 插入；
     `canonicalize` 的既有分支逐字未动。
   `notes/feature-boundary-baseline.json` 的 `sharedFiles` 三项摘要已随之刷新，并在 `sharedFileRevisions`
   记录理由。**复核方式**：`pnpm features:check`（8 组快照与 `bdc3c084` 逐字相同）
   + `cargo test --manifest-path rust/Cargo.toml -p photocraft-embed-editor --offline document_paths`（3 项）
   + `node openspec/changes/…/identity-kernel-check.mjs`（13/13）。
   另有形状外观/蒙版密度羽化后缀（同一 3.2 的持久字段补全）：`sharedFiles` 已再刷新一次，
   **复核方式**：`appearance-kernel-check.mjs`（27/27）+ `shape_appearance_and_mask_density`（1 项）
   + fixture 的 `shapeAppearance*` / `maskDensity*` 双端锚点。省略这些可选后缀时指纹逐字节不变。
8. **3.3 的四处共享接线**（复核重点）：
   - `editor-wasm.ts`：`loadEditor` 的协商位置在 `new module.WasmEditor()` 之后、返回句柄之前；
     失败路径必须 `free()` 后再抛，否则 WASM 对象泄漏。
   - `editor-workspace.ts`：`writesFrozen()` 是从 `dispatch` 抽出的同一判定（抽函数本身不改行为，
     `editor-workspace-tools.test.ts` 既有用例全绿可证）。
   - `features/workspace-context.ts`：只新增 3 个方法与 1 个类型，未改既有成员。
   - `integrations/woohaa/src/document-session.ts`：`pendingDraftOf` 新增一个分支，既有分支顺序未变。
   **复核方式**：`pnpm run check` EXIT 0（editor 411 项）、`integrations/woohaa` 34 files / 276 passed。
9. **仍是可选、需产品裁决**：整库快照「恢复」端口。域内已实现 `restoreSnapshotParams`（TS）与
   `presets::restore` / `snapshot_within_budget`（Rust，含原子替换与全部预算校验），但目前**没有任何调用方**
   —— 库是工具状态（design D3），不随 `.pcraft` 持久化。若要支持跨会话保存自定形状库，需要：
   在 `rust/crates/editor-core/src/features/vectors/wasm.rs` 暴露恢复入口（本域文件）、
   在共享 `packages/editor/src/editor-wasm.ts` 或宿主偏好端口给出读写位置（共享单写）、
   并在面板加“导入/导出形状库”动作（本域文件）。**本轮不新增推测性 UI**：
   这两对函数继续只在测试中被调用，验收记录如实标注，不声称已接线。
10. **跨域、本 change 不改**：形状层 `edit.paste` 的 layers 域白名单。复核者可自行确认提示文案
    「剪贴板包含尚未开放的图层类型」来自 `features/layers/clipboard_commands.rs`，与本域无关。

## 发布记录格式（本条 change 的登记方式）

每项按「U 编号 / 子能力 / 实现 / 操作与参数 / 预期及实际 / 证据 / 通过或待验证」登记在上表；
路径文字、竖排文字以及未实现的菜单目录项保持排除；不以 SVG 叠加画面代替可保存几何。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
