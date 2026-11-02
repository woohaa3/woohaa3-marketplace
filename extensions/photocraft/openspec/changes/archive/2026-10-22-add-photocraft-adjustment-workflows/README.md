# 直接调整与调整图层

实施与开放发布已完成（2026-10-23）；只剩真实设备/显示会话验收与跨 change 归档顺序。审计归属：U40, U41, U42, U43, U44。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划](verification.md)

现状：15 类调整（含新增 9 类）与 8 条自动/匹配命令由调整域自己的 `CONTRIBUTION` 进唯一命令门，
原生核验器、TS 工程核验器、内容身份（跨语言逐字节一致）、PSD 白名单与两份基线同批落地；`pnpm -C
photocraft run check`、`cargo test --workspace`、`features:check`、`codemap:check`、`boundary:check`
全绿。

本批还修掉一个用真实 WASM 导出才暴露的既有缺陷：TS 工程核验器原先按 `adjustment.kind` 取类型名，
而工程 manifest 是上游 serde 的外部标记枚举（`{"Exposure": {…}}`、`"Invert"`），于是**任何**含调整层
的工程都被判成「未开放类型：undefined」。现在按真实形状解析并与协议 15 类逐项互锁，LUT 与
`Unsupported` 仍拒绝。详见 [verification.md](verification.md) 的发布批次第 5b 条。
未完成项与真实原因见 [tasks.md](tasks.md) 的「剩余待办」：本机为 Linux 容器（无 `renderD*`、无
显示会话），1440×1000 / Pad 1024×768 的画面与手势验收留待真实 GPU 人工验证；
`2026-10-22-complete-photocraft-webui-editing` 的同名 capability 归档顺序仍需先处理。

并行施工必须先读 [单一写入归属与依赖](parallel-work.md)。
