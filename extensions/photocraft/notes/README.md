# PhotoCraft 历史笔记

本目录保留旧独立子项目（`photocraft/`，含 `vendor/` 上游快照、自建 `editor-core` Rust 内核、
`packages/editor` React 界面与 `packages/protocol`）的能力矩阵、领域边界与 PS/UI 走查记录。

**这些都是历史快照，不代表当前实现。** 那套编辑器已在 client `64765113` 被删除，现在的图片编辑由
固定上游的 egui/WASM 运行时承担，源码在 [`../web`](../web/README.md)，补丁与固定版本见
[`../web/patch/SOURCE.md`](../web/patch/SOURCE.md)。因此本目录文档里出现的
`rust/crates/…`、`packages/editor/…`、`vendor/photocraft/…` 等路径**都不再存在于任何 checkout**，
只用来对照当时的交付范围。

当前生效的能力规格在主仓 `openspec/specs/photocraft-*`；同目录的 [`../openspec`](../openspec/specs/editor-workspace/spec.md)
是旧子项目的归档规格与 change。

| 文件 | 内容 |
| --- | --- |
| [capability-matrix.md](capability-matrix.md) | P0–P7 能力落实矩阵：上游实现 / 本内核包装 / 协议 / React / 核验器 / 状态 |
| [feature-boundaries.md](feature-boundaries.md) | 18 个功能域的目录与冻结接口约定 |
| [feature-boundary-baseline.json](feature-boundary-baseline.json) / [feature-boundary-additions.json](feature-boundary-additions.json) / [feature-boundary-wasm-baseline.json](feature-boundary-wasm-baseline.json) | 当时 `features:check` 用来锁命令/能力集合的基线数据（对应脚本已随子项目移除） |
| [integration-2026-10-23.md](integration-2026-10-23.md) | 18 域合并记录与未勾选的 UI/像素验收项 |
| [archive-2026-10-23.md](archive-2026-10-23.md) | 一批 change 的归档记录 |
| [photoshop-ui-parity-audit-2026-10-23.md](photoshop-ui-parity-audit-2026-10-23.md) | 与 Photoshop 的交互差异走查 |
| [upstream-ui-change-plan.md](upstream-ui-change-plan.md) | 按上游差异拆出的 1 + 18 个 change 计划 |
