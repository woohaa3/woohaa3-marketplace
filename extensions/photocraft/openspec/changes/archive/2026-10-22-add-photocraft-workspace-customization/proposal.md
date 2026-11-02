# 命令搜索与工作区定制

## Why

已有固定快捷键、标签重排与面板浮动/停靠；尚无命令搜索和完整自定义配置。 2026-10-22 的固定上游接入审计确认了 U78；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U78 命令搜索、自定义快捷键/工具栏/工作区**：提供命令搜索、键位/菜单/工具栏/工作区保存重载与默认恢复；只绑定当前已接通动作并保留鼠标入口。

## Capabilities

### New Capabilities

- `workspace-customization`：命令搜索与工作区定制的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第一批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

不重做已经交付的标签位置、面板浮动、鼠标滚轮语义；手机布局及无障碍专项不在范围。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。本轮已交付域内实现、共享外壳消费端接入与回归；偏好不进工程内容，故 Rust 内核、`packages/protocol` 与 `project-verify` 均无改动。真实电脑/Pad 主线已在真实 Chromium 执行并留证；仅桌面 GUI 人工观感与真实 GPU 渲染待人工验收，详见 [verification.md](verification.md)。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/customization/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
