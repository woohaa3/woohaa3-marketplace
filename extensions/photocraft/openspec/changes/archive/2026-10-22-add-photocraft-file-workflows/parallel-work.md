# 并行实施边界

## 启动与完成前置

硬前置：`2026-10-22-refactor-photocraft-feature-boundaries` 已完成并在所有工作分支合入同一个提交。其门槛包括实际抽取、稳定端口、注册槽位和全量基线回归，不能仅凭目录计划开始同时改共享文件。

同级完成前置：`2026-10-22-add-photocraft-raster-interchange`（仅 U04 导出预设入口的联合验收；新建/复制/关闭等可独立交付）。有同级前置时，可以在已冻结接口上同时开发；最终 UI/保存/核验须接真实提供方验收，mock 不算交付。跨域新增接口需求回到共享集成负责人顺序处理。

## 单一写入归属

本 change 独占以下预先建立的域目录（路径相对 PhotoCraft）：

- `packages/editor/src/features/files/`：参数/面板/工具控制器、域状态、菜单/工具/快捷键/动作 manifest 和 TS WASM 适配扩展。
- `packages/protocol/src/features/files/`：本域数据/能力/预算声明及契约 fixture。
- `rust/crates/editor-core/src/features/files/`：命令、草稿、算法包装、WASM impl 及内容描述/身份贡献。
- `rust/crates/project-verify/src/features/files/`：本域有界内容/引用验证贡献。
- `tests/features/files/`、本域就近测试、文档和本 change 目录。

这些目录由前置 change 创建且进入唯一装配。这里是拟定写入边界，不是声称当前已有目录。上游或数据源已存在的共享类型仍由前置适配提供；禁止以“归属本域”为由复制另一套规范内容。

共享核心保持单一写入：`packages/editor/src/photo-editor-app.tsx`、`photo-editor-canvas.tsx`、`photo-editor-chrome.tsx`、`photo-editor-tools.ts`、`editor-tool-panels.tsx`、`editor-workspace.ts`、`editor-wasm.ts`；`packages/protocol/src/image-project-content.ts` / `image-project-editor.ts`；`rust/crates/editor-core/src/editor.rs` / `editor/tools.rs` / `wasm.rs` / `capability.rs` / `document_content.rs` / `identity.rs`；`rust/crates/project-verify/src/lib.rs` / limits 和共享 fixture；通用 UI primitives、视图坐标实现、宿主聚焦/导航和保存适配。

功能作者通过自己的 manifest/适配/验证贡献接入；不得各自修改上列共享文件或 sibling 目录，也不并发升级全局版本号/资源预算。共享接口修订、宿主端口和发布聚合由一个集成负责人顺序落地，再同步给仍在实施的分支。公共目录原有测试的更新由该负责人汇总，本域测试独立放置。

## 交叉验证

域内完成后逐项合入集成分支并运行相关及共享回归；有目标模式/通道/旋转视图/新层类型交叉的场景，在双方能力均可用后补真实联合验收。代码能独立编译不等于最终语义无依赖，未完成联合项继续保持未勾选。
