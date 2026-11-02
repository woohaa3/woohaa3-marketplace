# 修饰工具与仿制源

## Why

已有仿制、修复和部分修饰工具下拉；通用画笔参数掩盖工具差异，海绵曾因 mode=normal 失败。 2026-10-22 的固定上游接入审计确认了 U37, U38, U39；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U37 修补、内容识别移动、移除、红眼**：接入 Patch、Content-Aware Move、Remove、Red Eye 的工具、区域/拖动/笔迹手势与专用参数。
- **U38 图案图章和历史画笔**：接入图案图章的来源/对齐和历史画笔的稳定历史源选择、取样与绘画。
- **U39 修饰专用参数和取样源面板**：按工具提供减淡/加深范围/曝光、海绵增减饱和、涂抹强度等，增加多仿制源的缩放/旋转/翻转和叠加预览。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `retouch-filter-workflow`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第一批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

不扩展云端 AI 移除、后台作业或混合器画笔；历史源不可用时不静默退化普通画笔。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/retouch/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
