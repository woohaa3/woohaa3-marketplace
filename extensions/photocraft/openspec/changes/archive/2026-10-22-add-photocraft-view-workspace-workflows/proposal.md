# 视图导航、参考线与分析辅助

## Why

已有平移缩放、网格参考线开关、面板独立浮动/停靠及 tab 重排；缺精细参考线、导航器、多视图和命令定制。 2026-10-22 的固定上游接入审计确认了 U70, U71, U72, U73；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U70 参考线单条编辑、拖动和标尺原点**：提供标尺拖出参考线、已有线命中/拖动/数值编辑/单条删除、原点拖动与复位。
- **U71 参考线布局及吸附的完整参数**：提供 New Guide Layout 列/行/间距/边距、从形状建线、单位/网格细分/吸附目标和智能参考线选项。
- **U72 旋转视图、导航器与多视图**：提供独立 Hand/Zoom、Rotate View/复位、Navigator 和同文档多视图/并排；视图共用内容和保存历史。
- **U73 信息、颜色取样器、标尺测量、计数和注释**：提供 Info、持久颜色采样点、Ruler/拉直/测量日志、Count 分组和 Note 注释，明确持久与会话数据。

## Capabilities

### New Capabilities

- `view-navigation`：视图导航、参考线与分析辅助的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第一批基础辅助，第三批多视图。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

不重做已经交付的标签位置、面板浮动、鼠标滚轮语义；手机布局及无障碍专项不在范围。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/views/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
