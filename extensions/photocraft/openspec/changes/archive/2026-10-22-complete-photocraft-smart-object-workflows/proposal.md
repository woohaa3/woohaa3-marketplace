# 智能对象子文档与还原图层

## Why

嵌入对象、共享/独立复制和子编辑器已存在；替换/导出错误依赖子会话 active，宿主 CSS 裁切子工具，缺解包还原。 2026-10-22 的固定上游接入审计确认了 U65, U66；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U65 源替换/导出入口与子文档界面**：按选中智能层提供替换源/导出，不要求已打开子会话；修正嵌套编辑器裁切，让菜单/工具和回写/返回完整可用。
- **U66 智能对象转回图层**：提供 Convert to Layers，解包嵌入源为规范可编辑层/组并保留实例布局/适用样式蒙版，不等同栅格化。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `smart-object-editing`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第一批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

外链智能对象、任意路径重链接和智能滤镜栈保持 NON_GOALS。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/smart/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
