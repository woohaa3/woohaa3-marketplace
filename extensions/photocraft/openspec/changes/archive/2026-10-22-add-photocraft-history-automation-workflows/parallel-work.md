# 并行实施边界

## 启动与完成前置

硬前置：`2026-10-22-refactor-photocraft-feature-boundaries` 已完成并在所有工作分支合入同一个提交。其门槛包括实际抽取、稳定端口、注册槽位和全量基线回归，不能仅凭目录计划开始同时改共享文件。

同级完成前置：2026-10-22-add-photocraft-file-workflows, 2026-10-22-add-photocraft-raster-interchange。有同级前置时，可以在已冻结接口上同时开发；最终 UI/保存/核验须接真实提供方验收，mock 不算交付。跨域新增接口需求回到共享集成负责人顺序处理。

## 单一写入归属

本 change 独占以下预先建立的域目录（路径相对 PhotoCraft）：

- `packages/editor/src/features/history/`：参数/面板/工具控制器、域状态、菜单/工具/快捷键/动作 manifest 和 TS WASM 适配扩展。
- `packages/protocol/src/features/history/`：本域数据/能力/预算声明及契约 fixture。
- `rust/crates/editor-core/src/features/history/`：命令、草稿、算法包装、WASM impl 及内容描述/身份贡献。
- `rust/crates/project-verify/src/features/history/`：本域有界内容/引用验证贡献。
- `tests/features/history/`、本域就近测试、文档和本 change 目录。

这些目录由前置 change 创建且进入唯一装配。这里是拟定写入边界，不是声称当前已有目录。上游或数据源已存在的共享类型仍由前置适配提供；禁止以“归属本域”为由复制另一套规范内容。

共享核心保持单一写入：`packages/editor/src/photo-editor-app.tsx`、`photo-editor-canvas.tsx`、`photo-editor-chrome.tsx`、`photo-editor-tools.ts`、`editor-tool-panels.tsx`、`editor-workspace.ts`、`editor-wasm.ts`；`packages/protocol/src/image-project-content.ts` / `image-project-editor.ts`；`rust/crates/editor-core/src/editor.rs` / `editor/tools.rs` / `wasm.rs` / `capability.rs` / `document_content.rs` / `identity.rs`；`rust/crates/project-verify/src/lib.rs` / limits 和共享 fixture；通用 UI primitives、视图坐标实现、宿主聚焦/导航和保存适配。

功能作者通过自己的 manifest/适配/验证贡献接入；不得各自修改上列共享文件或 sibling 目录，也不并发升级全局版本号/资源预算。共享接口修订、宿主端口和发布聚合由一个集成负责人顺序落地，再同步给仍在实施的分支。公共目录原有测试的更新由该负责人汇总，本域测试独立放置。

**本 change 的实施记录（如实披露）**：落地过程中经用户明确授权，顺序修改了下列共享文件——`photo-editor-chrome.tsx`（「窗口」「文件」菜单接入 `featureMenuSections`）、`photo-editor-app.tsx`（「高级…」title）、`packages/protocol/src/features/shared/content.ts`（变量规范文本）、`rust/crates/editor-core/src/{document_content.rs,identity.rs}`（内容身份）、`rust/crates/project-verify/src/{lib.rs,features/mod.rs}`（文档级核验钩子）、`integrations/woohaa/tests/editor-workspace.test.ts`（宿主测试替身）、`tests/fixtures/contract.json` 与两个 `notes/feature-boundary*baseline.json`（发布 12 个能力 id 并重新采集基线）。每次都只补本域需要的那一处、没有复制第二套实现；逐条改动见 [verification.md](verification.md)「共享文件改动清单」。合入时 `boundaries.test.ts` 的 section 计数与两个基线快照仍需按最终合并结果统一复核。其中「文件」菜单的接线后来按真实走查结果再修过一次：域入口不再依赖宿主是否注入文档动作（否则只注入 `documents.transfer` 的独立 dev 宿主里「自动处理…」没有入口），详见 `verification.md` 第 12 条。

历史源的「失效」最初只暴露 `epoch` 数字，相当于要求消费方自觉比对；本轮在**本域目录内**补了读取点 `history_sample`（`rust/crates/editor-core/src/features/history/tools.rs`）与 `sampleHistory`（`wasm.rs` / `wasm-instance.ts` / `workspace.ts` / `panels.tsx`），没有触碰共享的 `editor.rs` / `editor/tools.rs` / `wasm.rs`（用 `#[path]` 从本域文件挂载），也没有把这个读取点登记进唯一命令门。sibling `add-photocraft-retouch-workflows` 的历史画笔可以直接复用同一入口，不需要本域再暴露别的共享接口。

## 交叉验证

域内完成后逐项合入集成分支并运行相关及共享回归；有目标模式/通道/旋转视图/新层类型交叉的场景，在双方能力均可用后补真实联合验收。代码能独立编译不等于最终语义无依赖，未完成联合项继续保持未勾选。
