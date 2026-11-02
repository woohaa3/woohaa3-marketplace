# 验收计划与记录

## 本次状态

2026-10-23（第二轮）：本 change 的**开放发布已完成并跑通全部非渲染检查**。15 类调整与 8 条命令
经调整域自己的贡献进入唯一命令门（`features/adjustments/mod.rs` 的 `CONTRIBUTION`），原生核验器、
内容身份、PSD 白名单、协议能力清单与两份基线在同批落地并互相锁定。

只剩两类未完成项，原因都写在下面而不是用阶段名代替：

- **真实设备/显示会话验收**（tasks 4.2/4.3/5.2）：本机是 Linux 容器，无 `renderD*`、无
  `DISPLAY`/`WAYLAND_DISPLAY`，不能采渲染/视觉证据 ⇒ **待人工验证**。
- **跨 change 归档顺序**（tasks 1.1）：兄弟 change `2026-10-22-complete-photocraft-webui-editing`
  仍在 changes 中（50/58），归档由集成负责人按顺序执行；两边要求名不重名（`comm -12` 为空）。

## 本轮变更（2026-10-23 第二轮，发布批次）

1. **能力/命令发布落位到调整域自身**：新增 21 个能力（`adjust.levels-output`、`adjust.curve-pencil`、
   `adjust.hue-ranges`、`adjust.black-white-tint`、`adjust.{exposure,color-balance,photo-filter,`
   `channel-mixer,invert,posterize,threshold,gradient-map,selective-color}`、`adjust.{auto-tone,`
   `auto-contrast,auto-color,desaturate,equalize,shadows-highlights,replace-color,match-color}`）
   与 26 条命令（9 条 `image.adjustments.*` + 9 条 `layer.newAdjustmentLayer.*` + 3 条 `image.auto*`
   + 5 条 `image.adjustments.*`）。聚合端只做拼接/排序/去重，所以**未改** `capability.rs`，也未改
   兄弟域 `features/{layers,composition}/mod.rs`；同一 id 不重复声明，能力表保持唯一。
2. **原生核验器同批放宽**：`project-verify/src/features/adjustments/inspect.rs` 接受 15 类，
   `ColorLookup` 与 `Adjustment::Unsupported` 仍拒绝；`tests/verify.rs`、`tests/native_binary.rs`
   的接受/拒绝断言按新集合翻转，避免「核验通过、运行时拒绝」并存。
3. **内容身份跨语言逐字节一致**：`identity.rs` 为 15 类给出规范串，新增持久参数**只追加且只在
   非默认值时追加**（色阶输出端点、`colorize`、六色域、曲线 `pencil`）⇒ 旧工程指纹不变。
   协议侧 `canonicalizeAdjustment` 同步，两侧用例断言同一批 13 条规范串字面量。
4. **修正 Rust/TS 契约分歧**：`content.rs` 的色阶投影由 0–1 存储值改为 0–255 参数单位，与
   `ImageProjectLevelsChannel` 及 TS 校验口径一致（有意对齐，非新增行为）。
5. **PSD 白名单扩到 15 类**：`features/io/psd.rs::supported_adjustment`；逐类验证保存重开指纹一致
   且 PSD 往返保持类型。
5b. **TS 侧工程核验器修复（本轮用真实 WASM 导出发现的既有缺陷）**：
   `packages/project-verifier/src/project-verification.ts` 的 `inspectAdjustment` 原先按
   `adjustment.kind ?? .id ?? .type` 取类型名，但工程 manifest 里 `content.adjustment` 是上游 serde 的
   **外部标记**枚举（`{"Exposure": {…}}`，无参数类型序列化成裸字符串 `"Invert"`）。该字段在真实工程里
   从不存在，因此**连 `brightnessContrast` 都被拒**（`unsupported-object 工程包含首期未开放的调整类型：undefined`）
   ⇒ 任何含调整层的工程都过不了 Media 的进程内核验（生产注入了原生核验器时可绕过，默认路径不可）。
   现在按真实形状解析：单键对象或裸字符串取变体名、接受集合与协议 `IMAGE_PROJECT_ADJUSTMENT_KINDS`
   （15 类）逐项互锁、`ColorLookup` 与 `Unsupported` 继续拒绝、多键对象判为 `invalid-manifest`。
   证据：真实 WASM 导出 15 种调整层工程逐个喂给 `verifyPhotocraftProject` → 15/15 `ACCEPTED`
   （修复前 15/15 全被拒）；另一种实测：一个工程内建满 15 类调整层 → 导出 → 核验接受 16 层 →
   `openProject` 重开后 15 个调整层仍在且 `contentHash` 一致。包内用例 42 个通过（新增
   `接受全部 15 类已发布调整，拒绝范围外变体与非法结构`、
   `核验器的接受集合与协议内容投影的 15 类逐项一致`）。
6. **基线重新锚定（发布收尾，不是漂移）**：`notes/feature-boundary-wasm-baseline.json` 由
   185 命令 / 71 能力更新为 211 / 92，`build`/`steps`/`errors`/`output` 四段与旧基线**逐字节相同**；
   `notes/feature-boundary-baseline.json` 的 `sharedFiles` 重新锚定 `identity.rs` 与
   `tests/fixtures/contract.json`；`scripts/check-feature-boundaries.mjs` 的注释与报错文案改为
   「已发布能力批次可重新锚定」，不再声称与 `bdc3c084` 等价。
7. **界面与层动作覆盖 15 类**：`panels.tsx` 导出共享 `KindParameters` 供 15 类复用，
   `ADJUSTMENT_LAYER_ACTIONS` 列全 15 类起点参数（仍受 `commands.get(id)?.allowed` 过滤），
   `AdvancedAdjustmentPanel` 统一走 `layer.setAdjustment`；新增
   `features/adjustments/adjustment-layer-actions.test.ts` 双向互锁「类型清单不漏不多」与「恒等起点与
   直接调整中性参数同源」；编辑器用例覆盖 15 类可编辑 + LUT 不可编辑，并要求控件操作真的写回
   `layer.setAdjustment`（只渲染控件不算完成）。

上一轮（同一天早些时候）的 7 项修复仍然有效（跨文档匹配冻结源快照、来源选择不丢失、`null` 清除
可选键、无变化判定改用草稿文档、内容投影不折叠、来源清单随会话更新、假可点控件禁用），记录见
修订历史；本轮没有回退它们。

## 原始验收计划

### 必须验证的主线

分别直接调像素/编辑调整层 → R 通道曲线与输出色阶 → 单色域色相 → 新调整层 → 自动/匹配颜色；保存重开保持全部参数且不无意新增层。

每个 U 编号及其子能力分别记录：实际入口/参数、预览、确认/取消、内容 hash/修订/历史、工程往返、核验器结果，以及 spec 中特有的失败条件。只验证菜单存在或只检查命令字符串不算完成。

### 非渲染检查

从所属项目/仓库按影响范围运行并记录实际命令与计数：

```sh
pnpm -C photocraft run check
pnpm -C photocraft run rust:test
pnpm -C photocraft run wasm
pnpm -C photocraft run verifier
pnpm -C photocraft run features:check
pnpm -C web --filter @woohaa3/photocraft-woohaa test
pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck
pnpm -C web --filter @woohaa3/frontend run typecheck
pnpm boundary:check
pnpm codemap:check
```

协议/limits/持久内容变化还需 contract fixture、旧工程身份/错误能力拒绝、TS 与真实原生核验子进程对照；只改 UI 时选择相关包检查，不能把未执行的上表命令标记通过。

### 真实 UI 与设备

独立 dev 和 Woohaa 均使用真实匹配 WASM；电脑 1440×1000 和 Pad 正常窗口 1024×768 逐项操作并留应用内截图，检查菜单/弹层/参数/内容与边界一致性。Pad 窗口走查不代表真实 Pad/数位笔硬件验证。

先按平台探测 GPU：Windows 查询显示适配器，macOS 用 system_profiler，Linux 用 renderD；不得在 Windows/macOS 以 /dev/dri 判定无 GPU。确无 GPU 不采渲染/性能证据，标待人工验证并写原因；有 GPU 但缺显示会话、数位笔、Photoshop 或 codec 时分别记录对应原因，不笼统写“无 GPU”。软件渲染不能替代硬件结论。Photoshop 仅在本 change 修改 PSD 兼容项时需要外部可编辑往返验证。

### 发布记录格式

每项：U 编号 / 子能力 / 实现提交 / 主机与浏览器或设备 / 操作与参数 / 预期及实际结果 / 证据路径 / 通过或待验证 / 暂缓理由。LUT、ICC/CMYK/Lab/HDR、16/32 位与真正 RAW 解码不进入本次范围；索引/双色调尚未全链路接通时保持不发布。

## 执行记录（2026-10-23，发布批次）

环境探测（结论先于判断）：

```sh
uname -sr                       # Linux 5.4.241-1-tlinux4-0023.4
ls /dev/dri                     # No such file or directory ⇒ 无 renderD*
echo "$DISPLAY / $WAYLAND_DISPLAY"  # 均为空 ⇒ 无显示会话
```

⇒ 本机是 Linux 容器，**无 GPU 且无显示会话**。按 AGENTS.md 的分类，本环境只跑与渲染无关的检查；
真实设备帧率、视觉截图、播放/编辑/拾取画面一致性一律标「待人工验证」，原因写「该容器无 GPU
（无 renderD*）且无显示会话」，不使用软件渲染冒充结论。

| 命令 | 实际结果 |
| --- | --- |
| `cargo test --workspace --manifest-path rust/Cargo.toml` | 通过：`photocraft-embed-editor` 234 lib + `contract_fixture` 4 + `editor` 15 + `interaction_state` 25；`photocraft-project-verify` 8 + `limits_agree` 1 + `native_binary` 3 + `smart_source` 10 + `verify` 15；0 failed |
| `pnpm -C photocraft run check` | 通过：`packages/protocol` 73 tests、`packages/project-verifier` 42 tests、`packages/editor` 299 tests（43 files）；build/typecheck 全绿 |
| `pnpm -C photocraft run wasm` | 通过：wasm 17.39 MiB、glue 92.3 KiB |
| `pnpm -C photocraft run verifier` | 通过：`photocraft-project-verify` 3.83 MiB |
| `pnpm -C photocraft run features:check` | 通过：命令 211 / 能力 92 与 `notes/feature-boundary-wasm-baseline.json` 深度相等，`build`/`steps`/`errors`/`output` 与旧基线逐字节相同 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa run typecheck` | 通过 |
| `pnpm -C web --filter @woohaa3/photocraft-woohaa test` | 通过：34 files / 275 tests |
| `pnpm -C web --filter @woohaa3/media-service test` | 通过：6 files / 75 tests（工程接收边界，用 TS 进程内核验器；本次修复后真实调整层工程不再被拒） |
| `pnpm -C web --filter @woohaa3/frontend run typecheck` | 通过 |
| `pnpm -C photocraft/dev test` | 通过：1 file / 8 tests |
| `pnpm boundary:check` | 通过：`open-closed-boundary.test.ts` 6 tests |
| `pnpm codemap:check` | 通过：47 个 manifest、11 篇文档、1365 个本地链接、8 个模块入口清单 |
| `pnpm -C photocraft exec openspec validate 2026-10-22-add-photocraft-adjustment-workflows --strict --no-interactive` | 通过：`Change ... is valid` |

### 命令门实测（真实 WASM 产物直接实例化）

```text
kinds 15  commands 8  allKinds 15  allCommands 8
missing kinds []            // open_kinds() 与 ADJUSTMENT_KINDS 逐项一致
missing commands []         // open_commands() 与 ADJUSTMENT_COMMANDS 逐项一致
documents []                // 尚未打开文档；打开后按会话索引返回
```

15 类（`brightnessContrast`/`hueSaturation`/`curves`/`levels`/`vibrance`/`blackWhite` +
`exposure`/`colorBalance`/`photoFilter`/`channelMixer`/`invert`/`posterize`/`threshold`/
`gradientMap`/`selectiveColor`）与 8 条命令（`image.autoTone`/`autoContrast`/`autoColor` +
`image.adjustments.desaturate`/`equalize`/`shadowsHighlights`/`replaceColor`/`matchColor`）都已在门内，
界面入口不再被过滤掉。`documents` 仍只在会话里取（内核会话索引），匹配颜色的来源下拉用它。

### 发布批次的等价性证据

对 `notes/feature-boundary-wasm-baseline.json` 与 `HEAD` 版本逐段比对（实测）：

| 段 | 结果 |
| --- | --- |
| `commands` | 185 → 211，**新增 26 条、删除 0 条** |
| `capabilities.capabilities` | 71 → 92，**新增 21 个、删除 0 个** |
| `capabilities.{stages,allStages,nonGoals}` | 逐字段相同（阶段划分与非目标未变） |
| `build`（体积/构建信息） | 逐字节相同 |
| `steps`（8 个内容/状态快照） | 逐字节相同 |
| `errors`（错误能力拒绝） | 逐字节相同 |
| `output`（内容 hash / revision / 工程长度 / PNG 字节 sha256） | 逐字节相同 |

⇒ 发布**只增加了命令与能力条目**，既有渲染输出、内容状态快照与错误语义没有变化。`pnpm -C photocraft
run features:check` 再把这份快照与真实 WASM 深度相等（这也是为什么发布批次必须同步重新锚定基线）。

`notes/feature-boundary-baseline.json` 是重构前的「共享契约摘要」，其中 `commit`/`allowedCommands`(185)
仍描述 `bdc3c084` 那一刻的形态，**不作为活基线使用**：脚本只读它的 `sharedFiles` 哈希（本次已重新
锚定 `identity.rs` 与 `tests/fixtures/contract.json`）。当前真实的命令/能力清单是
`notes/feature-boundary-wasm-baseline.json`（211 / 92）与 `tests/fixtures/contract.json`（92 个能力），
两者由 `features:check` 与 `contract_fixture` 测试分别核对。

- 15 类在真实 WASM 上的往返：保存 → 重开后 `documentContentHash` 一致；PSD 往返保持调整类；
  直接像素路径 15 类 + 8 条命令均产生像素差异且不新增图层。这些是在无渲染路径上取得的**结构与
  像素采样**证据，不包含画面观感。
- 旧工程兼容：`new_persistent_parameters_change_identity_but_defaults_stay_compatible` 断言默认值
  下规范串与旧工程完全一致；`published_adjustment_canonical_strings_are_byte_identical_to_typescript`
  与协议侧同名用例断言同一批 13 条规范串字面量两侧逐字节相同。

### 环境偏差（不是本 change 的代码问题）

- `photocraft/integrations/woohaa/vitest.config.ts` 曾把 React 别名写死为
  `photocraft/node_modules/.pnpm/react@18.3.1/...`；本机 pnpm 使用全局虚拟存储，
  `photocraft/node_modules/.pnpm` 里只有 `lock.yaml`，该路径不存在 ⇒ 28 个用例文件报
  `Failed to resolve import "react/jsx-dev-runtime"`。本次把它改成按 Node 解析（以
  `packages/editor` 为锚点，`createRequire(...).resolve`）后，`pnpm -C web --filter
  @woohaa3/photocraft-woohaa test` 直接通过（34 files / 275 tests），不再需要临时配置。
  这是测试基础设施的可移植性修复，未改宿主运行时代码或适配行为。
- `pnpm -C photocraft run check` 在 `/data` 磁盘满（100%）时会以 `Unknown system error -122` 失败，
  与本 change 无关；清理后重跑全绿。未在验证环境中清理仓库外的用户数据。

### 逐 U 记录（域内、非渲染）

| U | 子能力 | 证据 | 结论 |
| --- | --- | --- | --- |
| U40 | 直接像素调整 / 调整层两条路径 | `tests_direct_workflow.rs::direct_adjustment_changes_pixels_in_one_step_without_adding_a_layer`、`adjustment_layer_path_edits_the_recomposable_layer_and_keeps_the_kind`、`the_same_draft_slot_serves_both_targets_but_only_one_at_a_time` | 通过（15 类均在门内） |
| U40 | 选区边界、无变化不增历史 | `selection_bounds_the_direct_adjustment_and_outside_pixels_stay_untouched`、`a_preview_that_matches_the_document_adds_no_history_step` | 通过 |
| U40 | 失败/取消/不可确认旧预览 | `invalid_input_keeps_the_draft_uncommittable_and_cancel_restores_the_document`；UI：`direct-adjustment-panel.test.tsx`「预览失败保留提示并让草稿不可确认」「确认失败保留提示，取消恢复且不改文档」 | 通过 |
| U40 | 入口 = 真实命令门 | `every_reported_target_matches_the_command_gate`（15 类 + 8 条逐项比对 `capability.rs`）；UI「只渲染内核报告的入口」「没有开放目标时给出说明而不是菜单占位」「结构非法的目标清单不显示半截入口」 | 通过 |
| U41 | 分通道曲线只影响本通道 | `a_single_channel_curve_only_changes_its_own_channel` | 通过 |
| U41 | 切通道保留所有曲线 + 重开 | `layer_draft_accepts_the_new_channel_curve_levels_and_hue_options`（含 save/load 往返） | 通过 |
| U41 | 输出端点 / 分通道色阶 / 吸管参数 | 同上（`outBlack`/`outWhite`/`red` 通道/`eyedropper`）；UI「色阶分通道与吸管复用同一草稿」 | 通过（参数与确认链路；画布点选取样待接共享画布端口，见下「已知边界」） |
| U41 | 铅笔曲线 + 平滑 + 几何校验 | `parameter_tables_reject_unknown_keys_and_structural_breakage`、`curve_geometry_reuses_the_native_spline_without_image_rendering`；UI「铅笔曲线写 256 级映射并保持铅笔模式，点曲线读内核样条」、`tool-parameters.test.ts` 的 `buildCurveMap`/`curveMapOf` 断言 | 通过（铅笔模式现在真的写 256 级映射：之前只置 `pencil: true`，界面仍只有控制点编辑，等于把铅笔模式退化成内核 `points_to_map` 生成的一条固定映射；现在切到铅笔时用内核样条 `curveGeometry` 生成初值映射，再逐级写入；切回点曲线把映射折回 9 个控制点，平滑按内核同一半径 3 均值显示） |
| U41 | 输出端点/铅笔进入内容身份且不破坏旧工程 | `new_persistent_parameters_change_identity_but_defaults_stay_compatible`、`published_adjustment_canonical_strings_are_byte_identical_to_typescript` | 通过（默认值不追加后缀 ⇒ 旧指纹不变） |
| U42 | 六色域只作用于对应色域 | `a_single_hue_range_only_touches_pixels_in_that_range` | 通过 |
| U42 | Colorize 切换不丢色域参数 / 黑白 Tint | `layer_draft_accepts_the_new_channel_curve_levels_and_hue_options` | 通过 |
| U42 | 中性色域不污染指纹 | `new_persistent_parameters_change_identity_but_defaults_stay_compatible`（位移全零 + 默认范围整项省略） | 通过 |
| U43 | 9 类参数表/校验 + 真实像素效果 | `parameter_tables_reject_unknown_keys_and_structural_breakage`、`tool-parameters.test.ts`、`direct-adjustment-panel.test.tsx`；`tests_kind_effects.rs::every_implemented_kind_produces_a_real_pixel_change`（15/15 类，隔离会话跑上游命令，一步历史） | 通过（已发布，入口在门内） |
| U43 | 9 类调整层创建与重编 | `every_published_kind_can_create_an_adjustment_layer_and_be_edited`（15/15 类经 `layer.newAdjustmentLayer.*` 建层并断言 `LayerContent::Adjustment`）；UI：`features/adjustments/adjustment-layer-actions.test.ts`（15 类入口不漏不多、恒等起点与直接调整中性参数同源）、`direct-adjustment-panel.test.tsx`「已发布的新调整层都能渲染自己的参数控件并写回 layer.setAdjustment」（15 类可编辑 + LUT 不可编辑） | 通过 |
| U43 | 保存重开与 PSD 往返 | `tests/editor.rs::every_published_adjustment_survives_save_reopen_and_psd_round_trip`（15 类指纹一致、PSD 保类） | 通过 |
| U43 | 渐变映射站点插入 | `insertGradientStop` + UI「渐变映射添加站点不与末站点重复位置」；`buildGradientStops` 保持位置严格递增 | 通过（原先追加 `[1, …]` 与末站点同位置，内核要求严格递增 ⇒ 参数整体非法、预览必然失败） |
| U44 | 8 条命令参数/校验 + 真实效果 | `auto_and_matcher_parameters_are_bounded_and_source_indices_are_structural`、`tests_kind_effects.rs::every_implemented_command_produces_a_real_pixel_change`（8/8 条）、`tests/editor.rs::every_published_auto_and_match_command_changes_pixels_in_one_step` | 通过（已发布，入口在门内） |
| U44 | 跨文档匹配冻结源快照 | 内核：`cross_document_match_uses_a_frozen_source_and_only_commits_the_target`（目标改变、来源 hash 不变、一步历史、撤销只恢复目标）、`cross_document_source_must_exist_and_is_frozen_after_begin`（越界索引/不存在来源层被拒；开始后改来源文档不影响快照，`Arc::ptr_eq` 冻结）、`reported_documents_follow_the_kernel_session_not_a_shared_view_model`、`a_null_patch_clears_an_optional_key_instead_of_being_ignored`；界面：「匹配颜色可从内核报告的其它文档选来源，来源随参数一起提交」（含换回「当前图像」发 `source: null`）、「打开第二份图像后来源下拉跟着内核报告更新，不用重开面板」、「只有一份文档时不显示来源下拉」 | 通过 |
| U41/U42 | 新增持久参数真的写进调整层并成为一步历史 | `adjustment_layer_output_endpoints_and_hue_ranges_really_commit` | 通过（修复前只改「输出端点」或「单色域」时确认会被当成无变化而静默丢弃） |
| U43/U44 | 逐类内容投影不折叠 | `features/adjustments/content.rs` 的 `every_implemented_kind_projects_its_own_kind_and_parameters`、`parameter_differences_survive_the_projection`、`out_of_scope_adjustments_are_marked_as_themselves_not_disguised` | 通过（15 类逐类投影；LUT/不可求值 PSD 块标记为自身） |
| U43/U44 | 内容身份加入新类型 | `identity/tests.rs::every_published_adjustment_kind_joins_the_content_identity`；协议侧 15 类 `canonicalizeAdjustment` 用例 | 通过（`invert` 无参数，按类型本身规范化） |
| U43/U44 | 原生核验器接受 15 类、拒绝未发布类型 | `project-verify` 的 `verify.rs::accepts_delivered_adjustments_and_rejects_undelivered_ones`、`native_binary.rs` 子进程对照（`ColorLookup`/`Unsupported` 拒绝） | 通过 |
| U43/U44 | TS 核验器（Media 进程内默认路径）接受真实工程 | `packages/project-verifier` 的 `接受全部 15 类已发布调整，拒绝范围外变体与非法结构`、`核验器的接受集合与协议内容投影的 15 类逐项一致`；手工实测（真实 WASM）：①15 种调整层工程逐个导出 → `verifyPhotocraftProject` 15/15 `ACCEPTED`（修复前 15/15 全被拒）；②一个工程里同时建 15 类调整层 → 导出 → 核验接受（`objectKinds` 含 `adjustment`、16 层）→ `openProject` 重开后 15 个调整层仍在、`contentHash` 一致 | 通过（修复前真实工程一律被拒，因为读的 `adjustment.kind` 在 manifest 里不存在） |
| U40–U44 | 无参数调整可达 | UI「无参数调整有显式起点，不能靠滑杆才能开始」「无参数命令同样可以开始并确认」、`tool-parameters.test.ts` 的无参数清单互锁 | 通过（之前反相与自动校正/去色/均衡没有任何控件能开始草稿，确认按钮永远不可用） |

### 待人工验证

| 项 | 真实原因 |
| --- | --- |
| 电脑 1440×1000 / Pad 1024×768 主线操作与截图（含 U42 逐色域、U43 逐类、U44 自动/匹配） | 本机是 Linux 容器：`ls /dev/dri` 无 `renderD*`（无 GPU），且 `DISPLAY`/`WAYLAND_DISPLAY` 为空（无显示会话），不能采渲染/视觉证据 |
| 真实 WASM 下的像素观感与性能（曲线/色域/新类型的实际画面差异） | 同上；不得用软件渲染或估算值代替。像素采样证据只能证明「有差异、只加一步历史、不增图层」，不能替代画面观感 |
| Photoshop 往返 | 本 change 只扩了 PSD 白名单，未改动 PSD 编解码兼容项，故不需要外部应用验证 |

### 已知边界（不是未发布的共享改动）

**画布吸管点选取样**：内核与参数表都支持真实点采样（`eyedropper: {point, at:[x,y], size}`，由内核
读像素）。缺的只有「画布点」这条共享链路：`photo-editor-app.tsx` 的 `onSampleColor` 只把点交给
`controller.sampleColor`，而 `editor-workspace.ts` 的 `sampleColor` 在 `adjustmentActive` 时返回
`gesture-active`；`FeaturePanelContext.retouchSample` 只在修饰工具（`isRetouchTool`）下才被写入。
两处都是共享 facade，属宿主端口范畴；本 change 未新增私有端口，也没有为此发布空能力，面板当前以
前景色作为取样色。U41 的「输出端点 + 分通道 + 吸管参数可确认」已通过，画布取点需宿主端口另行支持。

## 2026-10-23 共享分支集成复核

本 change 的实现已与其余 17 域汇入 `photocraft` 分支，冲突由共享集成流程统一处理。
共同检查、跨域证据、源快照与仍未完成事项见
[18 域集成核验记录](../../../notes/integration-2026-10-23.md)。
本段只记录代码集成，不覆盖本文件原有证据；未勾选的真机/UI/外部应用验收仍保持未完成。
