# 历史快照、动作与数据驱动编辑

## Why

当前撤销/重做和历史跳转已有；无命名快照、动作或浏览器可用的数据集批处理流程。 2026-10-22 的固定上游接入审计确认了 U74, U75, U76；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U74 历史快照、新建自历史和清理历史**：提供命名历史快照、从状态建新文档、删除快照/状态和按范围 Purge；清理前说明不可恢复范围并确认。
- **U75 动作录制与 ATN**：提供动作录制/停止/播放、步骤/条件编辑、动作集/快捷键和受限 ATN 导入导出，逐步骤能力预检。
- **U76 批处理、脚本、数据集和变量**：提供前台 Batch/Image Processor/Contact Sheet/Load Stack、受限声明式脚本、文本/像素/显隐变量与数据集导入替换导出；原生 Droplet/任意脚本事件暂缓。

## Capabilities

### New Capabilities

- `history-workflow`：历史快照、动作与数据驱动编辑的新增独立行为。
- `action-workflow`：历史快照、动作与数据驱动编辑的新增独立行为。
- `data-driven-editing`：历史快照、动作与数据驱动编辑的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第三批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：2026-10-22-add-photocraft-file-workflows, 2026-10-22-add-photocraft-raster-interchange。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

MCP、后台批处理、任意脚本执行、原生 Droplet/进程/路径和打印仍为排除或平台暂缓，不从 NON_GOALS 一次移除。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/history/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
