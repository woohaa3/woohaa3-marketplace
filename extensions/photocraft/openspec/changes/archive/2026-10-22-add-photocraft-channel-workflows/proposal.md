# 通道与通道计算

## Why

当前只有复合图像/图层蒙版局部目标接口，保存选区命令存在；没有独立 Channels 工作流。 2026-10-22 的固定上游接入审计确认了 U25, U26；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U25 Channels 面板和通道操作**：提供 RGB 单通道查看/编辑及 Alpha/屏幕专色通道的创建/复制/改名/排序/显隐/选择、拆分/合并；通道目标与查看分离。
- **U26 应用图像、计算和亮度选区**：提供应用图像/计算的源文档/层/通道、混合/不透明度/反相和输出选择，以及亮度选区入口，使用源快照。

## Capabilities

### New Capabilities

- `channel-workflow`：通道与通道计算的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第二批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

CMYK/Lab/ICC 多色彩管理、印刷专色保真和任意外部文件路径保持排除。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/channels/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
