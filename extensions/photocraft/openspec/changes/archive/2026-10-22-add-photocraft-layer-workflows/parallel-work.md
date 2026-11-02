# 并行实施边界

## 启动与完成前置

硬前置：`2026-10-22-refactor-photocraft-feature-boundaries` 已完成并在所有工作分支合入同一个提交。其门槛包括实际抽取、稳定端口、注册槽位和全量基线回归，不能仅凭目录计划开始同时改共享文件。

同级完成前置：无。有同级前置时，可以在已冻结接口上同时开发；最终 UI/保存/核验须接真实提供方验收，mock 不算交付。跨域新增接口需求回到共享集成负责人顺序处理。

## 单一写入归属

本 change 独占以下预先建立的域目录（路径相对 PhotoCraft）：

- `packages/editor/src/features/layers/`：参数/面板/工具控制器、域状态、菜单/工具/快捷键/动作 manifest 和 TS WASM 适配扩展。
- `packages/protocol/src/features/layers/`：本域数据/能力/预算声明及契约 fixture。
- `rust/crates/editor-core/src/features/layers/`：命令、草稿、算法包装、WASM impl 及内容描述/身份贡献。
- `rust/crates/project-verify/src/features/layers/`：本域有界内容/引用验证贡献。
- `tests/features/layers/`、本域就近测试、文档和本 change 目录。

这些目录由前置 change 创建且进入唯一装配。这里是拟定写入边界，不是声称当前已有目录。上游或数据源已存在的共享类型仍由前置适配提供；禁止以“归属本域”为由复制另一套规范内容。

共享核心保持单一写入：`packages/editor/src/photo-editor-app.tsx`、`photo-editor-canvas.tsx`、`photo-editor-chrome.tsx`、`photo-editor-tools.ts`、`editor-tool-panels.tsx`、`editor-workspace.ts`、`editor-wasm.ts`；`packages/protocol/src/image-project-content.ts` / `image-project-editor.ts`；`rust/crates/editor-core/src/editor.rs` / `editor/tools.rs` / `wasm.rs` / `capability.rs` / `document_content.rs` / `identity.rs`；`rust/crates/project-verify/src/lib.rs` / limits 和共享 fixture；通用 UI primitives、视图坐标实现、宿主聚焦/导航和保存适配。

功能作者通过自己的 manifest/适配/验证贡献接入；不得各自修改上列共享文件或 sibling 目录，也不并发升级全局版本号/资源预算。共享接口修订、宿主端口和发布聚合由一个集成负责人顺序落地，再同步给仍在实施的分支。公共目录原有测试的更新由该负责人汇总，本域测试独立放置。

## 交叉验证

域内完成后逐项合入集成分支并运行相关及共享回归；有目标模式/通道/旋转视图/新层类型交叉的场景，在双方能力均可用后补真实联合验收。代码能独立编译不等于最终语义无依赖，未完成联合项继续保持未勾选。

## 本 worktree 的执行方式（用户明确要求「完成这个 change」）

用户要求本 change 在其 worktree 内闭环，因此上列共享单写文件**在本 worktree 内也完成了一次落地**，
但遵守两条约束，避免与 17 个兄弟 change 的并行结果互相覆盖：

1. **只增不改既有前缀**：能力 id 用 `order` 21–28（既有 `0–20` 不动）、命令 id 用 `order` 101–148
   （既有 `0–100` 不动）、菜单项 `menuOrder` 2–6 追加在既有 0/1 之后、`FEATURE_SECTIONS` 的 `order`
   12–16 追加在既有域之后；`tests/fixtures/contract.json` 的新能力插在 `adjust.curves` 之后。
2. **基线按本轮真实构建重新采集，并证明等价**：`notes/feature-boundary-wasm-baseline.json` 只增
   `commands`（+48）与 `capabilities.capabilities`（+8），`build`/`steps`/`errors`/`output` 与
   `nonGoals`/`stages`/`allStages` 逐字节相同；`notes/feature-boundary-baseline.json` 的
   `sharedFiles` 哈希按实际字节重算。逐条对照见 [verification.md](verification.md) 的
   「features:check 的等价性证明」。

合并时若集成负责人重新采集基线，本 change 只需保证自己那 8 个能力与 48 个命令 id 存在，
其余域的新增量由合并后的统一采集覆盖；不存在「本域删除他人条目」的情况。

## 本轮新增的共享触点（第二轮）

第一轮之外的改动集中在“让已登记的能力真的可达可读回”，仍按只增不改的原则落在共享文件上：

| 位置 | 改动 | 为什么必须动共享文件 |
| --- | --- | --- |
| `packages/editor/src/photo-editor-menu.ts` | 「图层」菜单补 选择性粘贴（粘贴入/外）、剪切建层、背景互转、链接组、图层样式、去边与净化、排列▸反转、盖印、栅格化▸图层样式 | 菜单是本仓库手写清单，`commandsJson()` 的 `menu` 元数据不参与渲染；不加条目命令就不可达 |
| `packages/editor/src/photo-editor-panels.tsx` | 图层行显示颜色标签色块与链接指示（`data-link-group`），图层动作里加标签颜色下拉 | 图层面板是共享装配点；U58 的标签/链接必须有可见状态 |
| `packages/editor/src/photo-editor.css` | 标签色块、链接左栏、`__workflow-preview` 画布样式 | 样式与上面的结构同处一份样式表 |
| `packages/editor/src/editor-view-model.ts` | 图层行解码新增 `linkGroup`/`labelColor`/`advancedBlending`/`channels`/`blendIf` | 视图模型是唯一状态解码处；缺字段面板只能退回默认值 |
| `packages/protocol/src/features/layers/workflows.ts` | 透明度端点改为 0–100 百分比；`scaleEffects` 允许缺省 `scale` | 与内核/上游同单位，避免面板把 0–1 传给内核 |
| `packages/editor/src/features/layers/workspace.ts` | `layerComp` 把内核 `result` 报告转出；导入共享 `isRecord` | U64 缺失层报告在命令返回值里，丢弃后面板拿不到 |

这些改动都用等价/回归证据守住：`pnpm run check`（protocol 91 / verifier 40 / editor 299）、
`cargo test --workspace`（233 + 4/13/25/10/0/1/3/10/15）、`features:check`、`boundary:check`、
`codemap:check`、`openspec validate --strict` 全部通过；真实 WASM 逐项脚本
[evidence/per-unit-real-wasm.mjs](evidence/per-unit-real-wasm.mjs) 126 项检查全绿。

## 本轮新增的共享触点（第三轮）

第三轮补齐的是「已登记但界面上没有入口」与「只有输入框、没有真控件」的部分，仍然只增不改：

| 位置 | 改动 | 为什么必须动共享文件 |
| --- | --- | --- |
| `packages/protocol/src/features/layers/workflows.ts` + `index.ts` | 新增 `LAYER_EFFECT_KINDS`（10 个效果种类） | 面板要生成「效果默认值」下拉；种类名必须与内核 `effect_from_params` 同一份，不能各自硬编码 |
| `packages/protocol/src/index.ts` | 再导出 `LAYER_EFFECT_KINDS` | 域外唯一的再导出点，沿用既有做法 |
| `packages/editor/src/features/layers/panels.tsx` | `FillLayerPanel` 增加「蒙版路径（仅新建）」；`BlendingPanel` 增加 `BlendIfSliders` 与两个分离开关；`StylePresetPanel` 增加效果转层到指定层、效果默认值读写；`LayerCompPanel` 增加「导出快照 JSON」 | U57 的 `path`、U60 的分离滑块、U61 的 `transferEffects`/`defaultFor`、U64 的「导出」此前只有内核能力 |
| `packages/editor/src/photo-editor.css` | `__blend-if` 滑块与 `__effect-defaults` 文本域样式 | 与面板结构同处一份样式表 |
| `rust/crates/editor-core/src/features/layers/layer_workflows.rs` | `layer.layerStyle.transferEffects` 增加源/目标存在、效果序号、空效果、锁定的前置校验 | 上游在隔离会话里才报，面板只能拿到英文错误；提前拒绝才能给人话原因且不写历史 |

第三轮证据：`pnpm run check`（protocol 91 / verifier 40 / editor **304**）、
`cargo test --workspace`（**233** + 4/13/25/10/0/1/3/10/15）、`features:check`、`boundary:check` 6/6、
`codemap:check`、`openspec validate --strict`；真实 WASM 逐项脚本 **126** 项、主线脚本 146 项全绿。
