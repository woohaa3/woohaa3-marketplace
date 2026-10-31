# 文档创建、来源与关闭结算

## Why

已有文件文档、工程保存、PNG/PSD 交付及跨文档图层复制；缺新建、整份复制、导出设置和文件级管理。 2026-10-22 的固定上游接入审计确认了 U01, U02, U03, U04；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U01 新建空白图像**：提供宽高、分辨率、背景/透明和尺寸预设的新建对话框，经资源预检后注册独立文档，不把新建图像解释为新建 Woohaa 画布。
- **U02 从剪贴板新建、复制整份文档**：从工作区剪贴板或用户授权读取的图像建立新文档，支持复制整份当前文档并保留规范层树/资源，源与副本内容独立。
- **U03 另存为/副本、恢复文件、批量关闭**：提供另存工程副本、保存副本、恢复到可取得的上次保存基线、关闭全部/其他；浏览器交付不声称写盘，关闭复用逐文档串行结算。
- **U04 新建/导出预设、最近文件、文件信息**：提供新建/导出参数预设、编辑器最近文件和 File Info 已知 EXIF/XMP/版权字段；最近项说明是否能直接重开或需重新选择。

## Capabilities

### New Capabilities

- `document-file-workflow`：文档创建、来源与关闭结算的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第一批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级完成依赖：`2026-10-22-add-photocraft-raster-interchange` 的导出参数预设端口；其他文档功能可独立实施与交付。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

原生路径保存/恢复、持续目录监听、PSB、ICC/CMYK/HDR 和依赖未编入 WASM 的解码器暂缓；不承诺所有上游格式双向可用。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/files/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
