# 栅格格式与导出交付

本域实现已完成（U05 / U06 / U07），含宿主接线（dev 与 Woohaa 的格式清单、打开预检、共享「文件」
菜单的「导出为…」「Save for Web…」）与跨域联合回归；全部自动化检查在本机通过，界面主线已在真实
Chromium 的 1440×1000 / 1024×768 两个视口走查。仍未验收的是实体 Pad 触控/硬件差异、全局能力
登记与尚未实现的 sibling 能力交叉验收，原因见 [verification.md](verification.md) 文末。审计归属：
U05, U06, U07。

真实 WASM 证据可重跑：`features/io/wasm-integration.test.ts`（12 项，产物缺失时明示跳过）覆盖
逐格式打开、预览/交付同源、逐层与资产 ZIP、单层 Export As、打开预检、草稿门禁、工程往返，
以及协议域 `OPEN_RASTER_*` 与内核矩阵的逐项一致性；`features/io/cross-domain.test.ts`（4 项）
覆盖跨域像素/身份/保存/原生核验；`evidence/check-interchange-wasm.mjs` 输出同一批结论
（含 `hostAcceptParity`），便于人工复核。

宿主侧同样有可跑回归：`dev/src/dev-export.test.ts`（14 项）覆盖 dev 宿主的端口装配、保存/导出
两条路径与「文件」菜单能力；`integrations/woohaa/tests/interchange-menu.test.tsx`（3 项）用真实
共享菜单断言「导出为…」「Save for Web…」的条目与落点；`place-file.test.ts` 断言「置入」与「打开」
共用同一份格式清单。真浏览器复验脚本见 `evidence/check-dev-filemenu.cjs` / `check-dev-save.cjs` /
`check-place-formats.mjs`。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收计划与记录](verification.md) · [矩阵与暂缓清单](evidence/interchange-matrix.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；原 change `2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收，不能把本次新建规划视作其归档。归档本 change 前须先处理原 change 的同名 capability 基线；实施可直接基于上述实现提交。

未勾选任务与阻塞项的归属见 [tasks.md](tasks.md) 文末。为完成 3.4 的宿主接线，经用户明确授权
触及了若干共享/宿主文件（清单与改动性质同见该表），须由集成负责人合并前逐项复核。

并行施工必须先读 [单一写入归属与依赖](parallel-work.md)。
