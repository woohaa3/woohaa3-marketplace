# 填充层、高级混合与图层复合

实施与验收已在本 worktree 完成到「非渲染检查与真实 WASM 主线全通过」；仅剩需真实 GPU + 人工操作的
像素外观与逐项截图，按仓库约定标「待人工验证」。审计归属：U57, U58, U59, U60, U61, U62, U63, U64。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划](verification.md) · [主线实测证据](evidence/)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`（HEAD 仍为 `b0cd6cbc`，本 change 未提交）；
原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收，不能把本次新建规划视作其归档。

## 当前状态一览

| 项 | 状态 |
| --- | --- |
| U57–U64 域内实现 + 回归 | 完成（Rust 29 测；TS 协议 21 测 + 编辑器面板/绑定 31 测覆盖本域） |
| 能力登记（8 能力 / 48 命令） | 完成，`features:check` 与 `bdc3c084` 基线等价（只增 commands/capabilities） |
| 菜单装配（图层 ▸ 5 项 + 「图层样式」子菜单） | 完成，`boundaries.test.ts` 断言顺序与总数 17，21 个新菜单命令可达 |
| 内容身份（填充参数） | 完成（Rust + TS 同源、跨重开一致） |
| 核验器（原生 + 进程内 TS） | 完成（两边 `objectKinds` 一致，含图案引用检查） |
| 真实 WASM 主线脚本 | 完成，146 项检查 0 失败（[证据](evidence/)） |
| 真实 WASM 逐 U 组脚本 | 完成，126 项检查全绿（[证据](evidence/)） |
| 真实 GPU 像素外观 / 人工截图 | 待人工验证（本机 Linux 容器无 `/dev/dri/renderD*`） |

并行施工的单一写入归属见 [parallel-work.md](parallel-work.md)；本 change 对共享文件的改动一律
「只增不改既有前缀」，逐条等价证据见 [verification.md](verification.md)。
