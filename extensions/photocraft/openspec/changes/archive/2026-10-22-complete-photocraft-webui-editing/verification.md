# 验证计划与记录

## 当前状态

2026-10-22（实施日）：P0 → P7 的实现与可自动化验证已完成，任务清单中 6 项属于**真实设备／外部应用**
证据（2.6 数位笔手感、3.5 批量导入响应、5.6 Photoshop 兼容、6.7 Photoshop 嵌入子集、8.6 真实
GPU 数位笔效果、9.7 Photoshop 可编辑往返、10.3 综合交互走查、10.4 真笔/外部兼容记录）。这些项
**保持未勾选**，原因与已采集的替代证据写在下方「未采集项」。

自动验证全部通过（命令与结果见「实施记录」）。这不代表真笔手感、渲染效果或 Photoshop 兼容性
已验收：那些只能在具备对应设备/应用的环境由人操作。

## 非渲染检查

```bash
pnpm -C photocraft run check        # build + typecheck + test（protocol / editor / project-verifier / dev）
pnpm -C photocraft run rust:test    # cargo test --workspace（非渲染）
pnpm -C photocraft run rust:check   # cargo check --workspace
pnpm -C photocraft run wasm         # 真实 WASM 构建（wasm32-unknown-unknown）
pnpm -C photocraft run verifier     # 原生核验工具构建（当前平台）
pnpm -C web --filter @woohaa3/photocraft-woohaa test
pnpm -C web --filter @woohaa3/frontend run typecheck
pnpm -C web --filter @woohaa3/contracts run typecheck
pnpm -C web --filter @woohaa3/contracts test
pnpm boundary:check
pnpm codemap:check
```

覆盖点：

- **TS/Rust 共读 fixture**：`tests/fixtures/contract.json` 新增 `capabilityStages` / `nonGoals` /
  全量 `capabilities`；`contract_fixture.rs` 与 `contract-fixture.test.ts` 双向核对阶段清单、非目标
  清单与能力清单。
- **工程核验器实际接收**：`photocraft-project-verify` 接受新区四类调整（色阶/自然饱和度/黑白）、
  有界形状层与矢量蒙版；仍拒绝未接通的调整、填充层、画板、外链源与非法几何。
- **旧工程 hash／读取兼容**：`identity.rs` 与 `image-project-content.ts` 对省略 `shape` /
  `vectorMask` / 排版字段的旧内容保持原指纹；`new_adjustments_shapes_and_vector_masks_join_the_content_identity`
  与 TS 对应用例固定这一点。
- **新运行时能力拒绝**：`capability.rs` 的 `verify_handshake` 与 protocol 的
  `verifyPhotocraftHandshake` 拒绝阶段或清单漂移（新 UI + 旧 WASM、旧 UI + 新 WASM 都不可写）。

## 实施记录（2026-10-22）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 子项目构建／类型／单元 | `pnpm -C photocraft run check` | 通过：protocol 70、project-verifier 40、editor 257、dev 8 |
| Rust 非渲染回归 | `pnpm -C photocraft run rust:test` | 通过：editor-core 201（lib）+ 4 + 13 + 25；project-verify 8 + 1 + 3（原生二进制）+ 10 + 15 |
| Rust 类型 | `pnpm -C photocraft run rust:check` | 通过（无 error） |
| 真实 WASM 构建 | `pnpm -C photocraft run wasm` | 通过：`wasm-release` 产物 17.33 MiB，glue 90.5 KiB |
| 原生核验工具 | `pnpm -C photocraft run verifier` | 通过：`photocraft-project-verify.exe` 2.76 MiB；`native_binary.rs` 用真实子进程验证「接受新区内容 / 拒绝未接通调整 / 坏输入不崩溃」 |
| Woohaa 适配回归 | `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过：34 文件 / 274 用例（新增 `place-file.test.ts` 8 例） |
| 宿主类型 | `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| contracts 类型与回归 | `pnpm -C web --filter @woohaa3/contracts run typecheck` / `test` | 通过：111 文件 / 1311 用例 |
| frontend 类型 | `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| 开源／闭源边界 | `pnpm boundary:check` | 通过（6 用例） |
| 代码地图 | `pnpm codemap:check` | 通过（47 manifest、11 篇文档、1343 链接） |

新增／主要回归用例（按任务）：

- 1.1 `notes/capability-matrix.md`；1.2 `psd::matrix_lists_every_declared_feature_with_a_reason`；
  1.3 `capability_stages_and_non_goals_match_the_shared_fixture`、`capability_handshake_matches_the_shared_contract_shape`；
  1.4 `limits_agree`、`首期上限与 project-limits.json 单源一致`、`budget_rejects_oversized_tip_before_publishing`；
  1.5 `editor-workspace-tools.test.ts`、`dev-workspace.test.ts`。
- 2.1–2.5 `brush_library`（库/预览/预算/快照/ABR/图片笔尖）7 用例、`brush-library-state.test.ts` 14 用例、
  `brush_preset_writes_never_dirty_the_document_and_gate_on_drafts`。
- 3.1–3.4 `abr_inspection_rejects_bad_files_and_reports_without_publishing`、
  `preview_uses_the_real_kernel_and_is_deterministic`、`image_tip_import_publishes_a_sampled_preset_without_document_writes`。
- 4.1–4.5 `transfer::tests` 6 用例、`transfer_round_trip_between_editors_keeps_content_and_one_history_step`、
  `place_asset_validates_real_decoding_and_writes_one_layer`、`place-file.test.ts` 8 用例。
- 5.1–5.5 `psd::tests` 6 用例、`import_replaces_the_document_only_after_a_successful_candidate`。
- 6.1–6.6 `smart_document::tests` 7 用例、`editor-workspace-tools.test.ts` 智能对象 4 用例。
- 7.1–7.6 `adjustment_ext::tests` 6 用例、`new_adjustments_shapes_and_vector_masks_join_the_content_identity`、
  TS「新区内容身份（P5/P7）」3 用例。
- 8.1–8.5 `retouch::tests` 4 用例、`editor-tool-panels.test.ts` 5 用例。
- 9.1–9.6 `composition::tests` 7 用例、`shape`/`vectorMask` 身份与核验用例。
- 10.1–10.2、10.5 见上方命令表；文档更新见 `README.md`、`packages/editor/README.md`、
  `docs/code-map/photocraft.md`、`notes/capability-matrix.md`。
- 10.1 的原生产物证据：`rust/crates/project-verify/tests/native_binary.rs` 用**实际构建的**
  `photocraft-project-verify` 子进程核验本 change 的工程（新区四类调整 + 矢量蒙版 + 排版文字），
  并确认未接通的调整（曝光）与坏输入被拒绝；产物缺失时跳过而不是伪装通过。
- 真实 WASM 产物证据见上一节（Node 加载 `dist/wasm` 的逐阶段实测）。

### 真实 WASM 产物验证（Node 加载 `dist/wasm`，非浏览器）

用 `initSync` 加载**实际构建的** `photocraft_editor_bg.wasm` 并直接调用绑定，确认产物（不是只在
Rust 单测里）能走通各阶段主路径。命令：`node` 脚本导入 `packages/editor/dist/wasm/photocraft_editor.js`。

| 阶段 | 实测结果 |
| --- | --- |
| 能力协商 | `buildInfo` engineVersion 匹配；`capabilityHandshakeJson()` 返回 `P0…P7` 全阶段 |
| P1a | `brushPresetsJson` 返回 5 个程序性预设；`brushPreview` 64×64 有 666 个非透明像素；`saveBrushPreset` 后 6 条；`brushLibrarySnapshot` 29,098 字节 |
| P2 | `exportLayerTransfer` 3,786 字节，`inspectLayerTransfer` 返回摘要/层数/源尺寸；`placeAsset` 返回 `pixel 24×18` |
| P3 | `psdMatrixJson` 18 行；`exportPsd` 1,528 字节 → `importPsd` 回来 2 层且 `editable: true`；坏 PSD 被拒且内容 hash 不变 |
| P4 | `convertToSmartObject` → `beginSmartChild`（首次 `reused:false`、再次 `reused:true`）；独立子编辑器改层后 `updateSmartParent` 提交 1 步、影响 1 个实例；同 attemptId 重试 `replayed:true` 且历史不再增长；无变化回写 `noChange:true`；父修改后回写被拒、`invalidated` 记录原因、子文档仍可导出（4,557 字节）与独立化 |
| P5 | `beginSelectionModify`（expand 2 → bounds 0,0,14,12）→ `commitSelectionModify`；`histogram` 432 样本 × 256 桶 |
| P6 | `beginRetouch`（blur，3 点）→ `appendRetouch` → `commitRetouch`；`beginFilter` → `updateFilter` → 非法半径被拒（保留上一版）→ `commitFilter` |
| P7 | `beginCompose`/`commitCompose`；`shape.create` 后 `vectorSnapshotJson` 含 1 个形状；`path.set` → `path.toSelection`；`layer.vectorMask.add` 成功；`view.newGuide` + `snapPoint` 返回吸附线与吸附后坐标；`setViewAids` 保留网格/吸附；`filterLayers` 按 UI 种类返回两层；`checkFont("Inter")` 可用、`Comic Sans` 明确不可用并给回退 |
| P5 选区 | `select.magicWand`、`select.quick`、`select.colorRange`、`select.modify.expand`、`select.grow`、`select.refineEdge`（输出 `selection`）均返回 `selected: true` |
| P5 调整草稿 | `layer.newAdjustmentLayer.levels|vibrance|blackWhite` 建层 → `beginAdjustment` → `previewAdjustment` → `commitAdjustment`；非法参数被拒后**不可提交旧预览**（`commitAdjustment` 报「请修正或取消」），取消后草稿清空 |
| P5/P6 目标检查 | 图章无采样点被拒；文字层与智能对象拒绝修饰（提示栅格化/编辑内容）；修饰笔迹期间 `layer.new.layer` 被草稿门禁拒绝 |
| P5 工程往返 | 三类新区调整 `saveProject` → `openProject` 后参数与 kind 保留，内容 hash 不变 |
| 命令白名单 | 图章/修复/污点修复/减淡/涂抹/USM/裁剪/画布尺寸/形状编辑/矢量蒙版/路径转选区/魔棒/边缘细化/色阶全部 `allowed: true` |
| 非目标 | `filter.liquify`、`select.subject`、`paint.mixerBrush`、`view.show.grid`、`type.attachToPath` 全部 `capability-disabled` |

注意：这说明**产物可用、主路径接通**，不等于真笔手感、视觉质量或 Photoshop 兼容已验收。

## 阶段证据

| 阶段 | 正向任务 | 拒绝／恢复 | 当前结果 |
| --- | --- | --- | --- |
| P0 | API／命令／WASM／资源矩阵逐项核实 | 新 UI／旧 WASM 拒绝；未交付命令不能绕过 | 通过：能力表三处一致 + 握手漂移拒绝 + 未交付命令门 |
| P1a | 选软圆预设，压力渐变画蒙版，取消／撤销 | 半笔取消、非法参数、迟到采样、持久化失败 | 通过（自动化）；真笔手感待人工验证 |
| P1b | ABR 含采样和动态，预览后绘画、重载库 | 截断／超预算／未知参数、显式子集导入 | 通过（自动化）；批量导入响应待真实设备 |
| P2 | A 复制层组到 B，源关闭后粘贴，置入图片 | 同 id 不同资源重映射；只读／超限无半提交 | 通过：载荷摘要/身份重映射/一步历史/坏载荷不落盘 |
| P3 | PSD → 可编辑修改 → pcraft → PSD | PSB／CMYK／坏文件拒绝，转换副本前报告 | 通过（自动化）；Photoshop 往返待人工验证 |
| P4 | 同源两个实例、独立副本、子文档更新父 | 父修订冲突／关闭／撤销／只读；重复回执不重复历史 | 通过（自动化）；Photoshop 嵌入子集待人工验证 |
| P5 | 通道曲线／色阶／直方图，魔棒／边缘细化输出蒙版 | 旧 histogram 丢弃；无效参数不确认旧预览 | 通过：代际丢弃/草稿门禁/内容 hash 边界 |
| P6 | 图章／修复／涂抹／减淡及高斯／USM | 源失效、不支持目标拒绝；取消恢复与采样隔离 | 通过（自动化）；真实 GPU／数位笔效果待人工验证 |
| P7 | 裁剪／尺寸／吸附，文字排版／钢笔／矢量蒙版往返 | 超限尺寸、缺字体、非法路径与过期手势 | 通过（自动化）；Photoshop 可编辑往返待人工验证 |

## 真实设备与外部兼容

### 已探测的环境（先探测，再判断）

- 平台：Windows 11 桌面（本会话）。
- 显卡：`Get-CimInstance Win32_VideoController` 返回
  `NVIDIA GeForce RTX 4060`（驱动 32.0.15.7270，4 GiB）与 `Intel(R) UHD Graphics 770`
  （驱动 31.0.101.4255）——**存在真实 GPU**，不是「无 GPU」环境。
- 未使用 `/dev/dri` 判断（那是 Linux 路径，Windows 上不存在）。
- 本次会话是**无交互显示**的自动化会话：可以构建、跑真实 WASM 与原生 verifier，但不能做
  交互式走查、真笔采样或浏览器视觉对比。
- 数位板／笔：**未连接**（无可用设备信息）。
- Photoshop：**未安装／未交换文件**。
- Pad：**未接入**。

### 未采集项（保持待人工验证）

| 任务 | 未采集内容 | 真实原因 | 已采集的替代证据 |
| --- | --- | --- | --- |
| 2.6 | 轻压、压力渐变、缩放光标、延迟、长笔收尾的真笔手感 | 会话无连接的数位板，无法产生真实 pressure/tilt 序列 | 内核逐 sample 压力处理、固定 seed 预览与一笔一步回归；鼠标路径以明确默认压力回退 |
| 3.5 | 批量 ABR 导入与大笔尖的响应测量 | 需要真实交互设备与主观/计时采集 | 预算预检、原子发布、预览与库快照回归 |
| 5.6 | Photoshop 继续编辑、合成效果、副本转换报告 | 环境没有 Photoshop，也没有外部 PSD fixture | 本引擎往返 + 逐层损失报告 + 预检拒绝用例（自导自读**不**证明 Photoshop 兼容） |
| 6.7 | Photoshop 中声明支持的嵌入 PSD 子集 | 同上 | 子文档回写/幂等/冲突恢复的全套自动化 |
| 8.6 | 真实 GPU／数位笔下的修饰效果与响应 | 有真实 GPU，但会话无显示、无数位笔；未做交互式长笔测量 | 采样基线隔离、取消恢复、可写目标拒绝 |
| 9.7 | Photoshop 可编辑往返（文字/路径/矢量蒙版） | 同上 | 保存重开、跨文档、拒绝/转换报告 |
| 10.3 | dev／Woohaa 综合交互走查、Pad 窗口 | 无交互显示会话，Pad 未接入 | 各阶段自动化 + dev A/B 装配 + 适配层回归 |
| 10.4 | 真笔性能与外部兼容的最终记录 | 依赖上述设备/应用 | 本文件的未采集项清单与真实原因 |

采集这些证据时按本文件原来的模板填写：数位笔需记录系统／浏览器／GPU、板与笔型号、驱动、
pressure／tilt 可用性、文档尺寸／层数／缩放、笔尖／间距／平滑／纹理、笔迹样本，并覆盖轻压点按、
压力渐变、快速折线、长笔、抬笔收尾、蒙版、取消和 Tab 切换；PSD 需记录 Photoshop 版本、
fixture 来源／许可与摘要、导入／再编辑／导出步骤、支持类型、逐项损失报告与图层面板截图。

## 本次实施校验

- OpenSpec strict validation：`openspec validate 2026-10-22-complete-photocraft-webui-editing --strict --no-interactive --json`
  → `valid: true`，0 issues。
- Planning artifacts status：`openspec status --change … --json` → `isPlanningComplete: true`。
- 任务勾选口径：实现的自动化验证完成才勾选；只有设备／外部应用证据缺失的项在条目里写明
  「待人工验证」并保持未勾选，不以阶段完成替代整项完成。
