# 图像模式与调色板

## Why

当前工程和编辑工具以 RGB/U8 为主；灰度、位图、索引色、双色调和颜色表不能通过调整层近似替代。 2026-10-22 的固定上游接入审计确认了 U45；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U45 灰度/位图/索引色/双色调与颜色表**：提供真实灰度/位图/索引色/双色调模式、颜色表与陷印的转换和编辑，先完成模式数据/工具矩阵/身份核验。

## Capabilities

### New Capabilities

- `image-mode-workflow`：图像模式与调色板的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第二批（分通道优先）。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：2026-10-22-add-photocraft-channel-workflows。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

LUT、ICC/CMYK/Lab/HDR、16/32 位与真正 RAW 解码不进入本次范围；陷印需 CMYK，同属范围外。索引色/双色调与颜色表已全链路接通并发布（实现、内容身份、能力、入口、核验与跨域门禁），仍未验收的只有真实 UI 走查、通道域联合验收与 Photoshop 往返，原因见 [verification.md](verification.md)。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/modes/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
