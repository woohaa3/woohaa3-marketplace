# 填充层、高级混合与图层复合

## Why

已有组、锁定、对齐分布、丰富样式和基本过滤；缺填充层及高级层关系/混合/复合。 2026-10-22 的固定上游接入审计确认了 U57, U58, U59, U60, U61, U62, U63, U64；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U57 纯色/渐变/图案填充层**：接纯色/渐变/图案可重编填充层及其参数、蒙版和资源快照，不能只烘成普通像素层。
- **U58 图层链接、标签、剪切建层和盖印**：提供图层链接/取消链接、颜色标签、剪切/复制建层和盖印，链接移动尊重锁定规则。
- **U59 粘贴入/粘贴外**：接 Paste Into/Paste Outside 的选择区域与蒙版语义，使用现有有界剪贴板和资源重映射。
- **U60 高级混合、Blend If 和挖空**：提供 Blend If 分离端点、按通道混合、Knockout 及内部效果/剪贴层成组和蒙版隐藏效果选项。
- **U61 样式复制粘贴、样式预设和效果转换**：提供 Copy/Paste Style、样式预设管理、Scale Effects、效果转层和样式栅格化，保持图案/等高线/全局光源语义。
- **U62 去边/去杂边和颜色净化**：提供 Defringe、Remove Black/White Matte 和 Color Decontaminate 的实际像素预览与参数。
- **U63 图层过滤的剩余入口**：补 only_selected、shape 类型和上游已实现属性筛选，保留当前名称/类型筛选并说明组合条件。
- **U64 图层复合**：提供 Layer Comps 创建/更新/切换/恢复及导出，按可见性/位置/外观保存规范快照。

## Capabilities

### New Capabilities

- `layer-workflow`：填充层、高级混合与图层复合的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第二批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

智能滤镜栈、外链资源、印刷色彩和未知 PSD 块继续拒绝。图层过滤不被当成内容编辑。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/layers/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
