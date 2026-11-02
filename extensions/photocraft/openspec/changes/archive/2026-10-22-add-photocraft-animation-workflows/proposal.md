# 时间轴与浏览器视频工作流

## Why

上游有时间轴和视频命令，当前 WASM、工程核验与 React 均未提供时间维度；原生编解码命令不能直接复用。 2026-10-22 的固定上游接入审计确认了 U77；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U77 时间轴、视频图层和视频交付**：分阶段提供时间轴/帧导航与属性、视频轨道/逐帧编辑、帧导入和浏览器实际支持的动画/视频交付；依赖真实 codec 端口。

## Capabilities

### New Capabilities

- `animation-workflow`：时间轴与浏览器视频工作流的新增独立行为。

### Modified Capabilities

无；现有工程身份、核验和工作区规则继续约束新增能力。

## Dependencies and Non-goals

优先级：第三批（平台前置）。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：2026-10-22-add-photocraft-raster-interchange。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

依赖原生进程的未移植视频编解码、后台转码、无限时长/超预算媒体保持关闭；有真实端口和验收前不宣称 Render Video 可用。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。

本次实施落在四个域目录 + `tests/features/animation/`（见 [matrix.md](matrix.md)）。核验器分派与文档级调用、
「窗口」菜单合并、Woohaa 替身与真实 codec 端口、PSD 视频层损失行已逐项接线并在
[verification.md](verification.md) 记录；另外修正了进程内 TS 核验器对视频层的错误拒绝（未配置原生工具时
它就是 Media 的默认接收边界，原会把本应用保存的动画工程判成外部引用）。能力发布（4 个 `animation.*`
id）与跨语言内容身份接线也已落地：基线不被改写，增量登记在 `notes/feature-boundary-additions.json`。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/animation/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
