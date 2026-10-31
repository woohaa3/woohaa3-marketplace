# 栅格格式与导出交付

## Why

已有 PNG/PSD 和工程交付，更多栅格 codec、导出参数与逐层资产交付尚未贯通。 2026-10-22 的固定上游接入审计确认了 U05, U06, U07；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U05 更多栅格格式的打开**：维护逐格式读写/位深/metadata/feature 的真实矩阵，接入可用 RGB/U8 解码路径并明确只读项；HDR 和缺 codec 项列为暂缓。
- **U06 通用导出及 Save for Web**：提供通用导出/Save for Web 的格式、质量、压缩、尺寸、透明及元数据设置、真实编码预览和预设；至少完成 JPEG/WebP 及矩阵内可写 TIFF。
- **U07 逐层导出与自动切图**：提供逐层/所选层 Export As、Layers to Files 和按图层名称生成 Image Assets 的用户触发交付，处理重名、非法文件名和资源包预算。

## Capabilities

### New Capabilities

- `raster-file-interchange`：栅格格式与导出交付的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第一批。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

原生路径保存/恢复、持续目录监听、PSB、ICC/CMYK/HDR 和依赖未编入 WASM 的解码器暂缓；不承诺所有上游格式双向可用。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/io/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
