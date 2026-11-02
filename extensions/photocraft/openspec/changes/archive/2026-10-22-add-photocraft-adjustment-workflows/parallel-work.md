# 并行实施边界

## 启动与完成前置

硬前置：`2026-10-22-refactor-photocraft-feature-boundaries` 已完成并在所有工作分支合入同一个提交。其门槛包括实际抽取、稳定端口、注册槽位和全量基线回归，不能仅凭目录计划开始同时改共享文件。

同级完成前置：无。有同级前置时，可以在已冻结接口上同时开发；最终 UI/保存/核验须接真实提供方验收，mock 不算交付。跨域新增接口需求回到共享集成负责人顺序处理。

## 单一写入归属

本 change 独占以下预先建立的域目录（路径相对 PhotoCraft）：

- `packages/editor/src/features/adjustments/`：参数/面板/工具控制器、域状态、菜单/工具/快捷键/动作 manifest 和 TS WASM 适配扩展。
- `packages/protocol/src/features/adjustments/`：本域数据/能力/预算声明及契约 fixture。
- `rust/crates/editor-core/src/features/adjustments/`：命令、草稿、算法包装、WASM impl 及内容描述/身份贡献。
- `rust/crates/project-verify/src/features/adjustments/`：本域有界内容/引用验证贡献。
- `tests/features/adjustments/`、本域就近测试、文档和本 change 目录。

这些目录由前置 change 创建且进入唯一装配。这里是拟定写入边界，不是声称当前已有目录。上游或数据源已存在的共享类型仍由前置适配提供；禁止以“归属本域”为由复制另一套规范内容。

共享核心保持单一写入：`packages/editor/src/photo-editor-app.tsx`、`photo-editor-canvas.tsx`、`photo-editor-chrome.tsx`、`photo-editor-tools.ts`、`editor-tool-panels.tsx`、`editor-workspace.ts`、`editor-wasm.ts`；`packages/protocol/src/image-project-content.ts` / `image-project-editor.ts`；`rust/crates/editor-core/src/editor.rs` / `editor/tools.rs` / `wasm.rs` / `capability.rs` / `document_content.rs` / `identity.rs`；`rust/crates/project-verify/src/lib.rs` / limits 和共享 fixture；通用 UI primitives、视图坐标实现、宿主聚焦/导航和保存适配。

功能作者通过自己的 manifest/适配/验证贡献接入；不得各自修改上列共享文件或 sibling 目录，也不并发升级全局版本号/资源预算。共享接口修订、宿主端口和发布聚合由一个集成负责人顺序落地，再同步给仍在实施的分支。公共目录原有测试的更新由该负责人汇总，本域测试独立放置。

## 本 change 的发布批次（实际执行记录）

本 change 交付「开放发布」时，共享核心的**一部分**必须同批改动，否则会出现「声明已开放、门禁仍拒绝」
或「核验通过、运行时拒绝」的错配。已在同一批次内完成并互相锁定，不再外派给后续提交：

- `rust/crates/editor-core/src/identity.rs`（+ `identity/tests.rs`）：15 类规范串与「只在非默认值时追加」
  的旧工程兼容规则；由 `notes/feature-boundary-baseline.json` 的 `sharedFiles` 哈希锁定。
- `tests/fixtures/contract.json`：能力 71 → 92，按真实握手顺序插入；同一 `sharedFiles` 锁定。
- `notes/feature-boundary-wasm-baseline.json`：命令 185 → 211、能力 71 → 92；`build`/`steps`/`errors`/
  `output` 与旧基线逐字节相同（已逐段实测），重新锚定属发布收尾而不是漂移。
- `scripts/check-feature-boundaries.mjs`：注释与报错文案说明「已发布能力批次可重新锚定」。
- `rust/crates/editor-core/src/features/io/psd.rs`：`supported_adjustment` 扩到 15 类，与核验器同批。
- `packages/project-verifier/src/project-verification.ts`（+ `src/project-verification.test.ts`）：
  TS 侧工程核验的 `inspectAdjustment` 改读上游 serde 的**真实** manifest 形状（外部标记枚举
  `{"Exposure": {…}}` / 裸字符串 `"Invert"`）并把接受集合锁到 15 类。这不是为本 change 放宽边界，
  而是修掉一处既有的跨语言解析分歧：旧实现读 `adjustment.kind`，而该字段在真实工程里**从不存在**，
  于是连 `brightnessContrast` 都被判成「首期未开放的调整类型：undefined」——任何含调整层的工程
  都无法通过 Media 的进程内核验。LUT 与 `Unsupported` 仍拒绝，非唯一键对象判为结构非法。

**未改动**：`capability.rs`（阶段能力表由各域 `CONTRIBUTION` 推导）、兄弟域
`features/{layers,composition}/mod.rs`（聚合端拼接排序去重，既有 9 个 id 不重复声明）、
`editor.rs`、`document_content.rs`、`editor-wasm.ts`、`editor-workspace.ts`、
`editor-tool-panels.tsx`、`photo-editor-*.tsx`、`rust/project-limits.json`。

域外最小修改仍保持三条（都由本域冻结接口/语义变化逼出）：`tests/interaction_state.rs`（U41 语义
更新）、`integrations/woohaa/tests/editor-workspace.test.ts`（替身内核补两个必需成员）、
`integrations/woohaa/vitest.config.ts`（React 别名按 Node 解析，测试基础设施可移植性）。
另加一条**共享包内的缺陷修复**：`packages/project-verifier/`（该包不被任何 change 的 parallel-work
声明为独占；本 change 的 proposal 已写明「有新内容时同步 `packages/project-verifier`」）。

## 交叉验证

域内完成后逐项合入集成分支并运行相关及共享回归；有目标模式/通道/旋转视图/新层类型交叉的场景，在双方能力均可用后补真实联合验收。代码能独立编译不等于最终语义无依赖，未完成联合项继续保持未勾选。
