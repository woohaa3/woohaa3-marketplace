# 精确文字排版与文字工具

## Why

已有原位水平点/段落文字、基础行字距/基线与三种字偶距；缺精确字符对、样式库和转换工作流。 2026-10-22 的固定上游接入审计确认了 U67, U68, U69；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U67 精确排版、段落/字符样式和 OpenType**：补指定字符对/数值字偶距、完整已实现段落选项、点/段落转换、字符/段落样式库和真实可用 OpenType。
- **U68 文字抗锯齿、变形、转路径/形状和栅格化**：提供文字抗锯齿、Warp Text、Create Work Path、Convert to Shape 和现有 rasterize 命令入口。
- **U69 文字蒙版、查找替换和拼写**：提供水平文字蒙版、当前文档查找/替换、可用语言拼写和缺字体发现/替换，不扩竖排。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `composition-type-vector`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第二批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

竖排和沿路径排字明确排除；“转工作路径”不等于“路径文字”。不承诺未提供字典的中文拼写检查。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/type/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
