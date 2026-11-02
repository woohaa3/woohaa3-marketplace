# 形状与路径画布工具

U08–U16（形状、钢笔、路径编辑、布尔、矢量蒙版、自定形状与预设）已在域内实现，
并**接入共享画布与原生核验器**；内容身份、运行时协商与文档归属门禁也已完成。
本环境无法采集的只剩真实 GPU/窗口走查、PSD 往返与 Pad/数位笔。
审计归属：U08, U09, U10, U11, U12, U13, U14, U15, U16。

[提案](proposal.md) · [设计](design.md) · [任务](tasks.md) · [范围与生产源码依据](scope.md) · [验收记录](verification.md)

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`；结构前置 `b61da631`。原 change
`2026-10-22-complete-photocraft-webui-editing` 仍有真实设备/外部应用验收，不能把本次实现视作其归档。
归档本 change 前须先处理原 change 的同名 capability 基线。

## 本轮完成了什么

域内（`features/vectors/` 四处：editor / protocol / editor-core / project-verify）实现全部落地后，
本轮按用户明确指令「完成这个 change」解除了 `parallel-work.md` 的并行共享文件约束，
由本会话作为**唯一集成负责人顺序**完成接线：

- **画布**：12 个矢量工具登记进 `features/vectors/index.ts` 的 `tools`，手势取值 `shape`/`pen`/`path`；
  `photo-editor-canvas.tsx` 新增 `onVectorPointer`，在平移/笔迹分支**之前**把文档坐标转发给域内归约器；
  拖动只更新叠加层、**松手才提交一条命令**；工具栏把 12 个工具按 `group` 合并成形状/钢笔/路径三个弹出组。
- **路径目标**：面板与画布共享 `path-selection` 小 store，`resolvePathTarget` 保证「读到哪条路径就写到哪条」；
  形状层与矢量蒙版都用 `name:"layer"` + 图层 id，因此蒙版路径可直接在画布上编辑。
- **核验器**：共享 `project-verify/src/lib.rs` 已调用 `inspect_document`，并在**解码前**调用
  `inspect_manifest_budget`（矢量载荷累计预算）；`verify-wiring-gate.mjs` 由 **EXIT 1 转为 EXIT 0**
  （3 个损坏工程现全部被拒）。
- **内容身份**：已存命名路径 / 工作路径 / 裁切引用进 `contentHash`（`paths:`/`work:`/`clip:` 后缀行），
  空值整体省略 → 旧工程指纹逐字节不变；形状层的填充/描边/规范参数与矢量蒙版的密度/羽化同属持久内容，
  以图层内可选后缀（`shape:…:appearance:…`、`|vector:…:density:…:feather:…`）参与，避免「只改描边/浓度」
  被判成无净变化；TS/Rust 规范文本一致，锚点 `vectorPathHash = ef50aab665dcced5`、
  `shapeAppearanceHash = 5ecb006223572088`、`maskDensityHash = 1d8ebc300a3a9588`。
- **运行时会话**：`loadEditor` 做能力协商（漂移即 `capability-drift` 并释放实例）、画布手势携带文档代际令牌
  （晚到命令返回 `stale` 且不调内核）、矢量草稿进入统一门禁、矢量写入复用保存/导出冻结窗口、
  父子回写补草稿门禁。
- **基线**：19 条新命令并入 `notes/feature-boundary-wasm-baseline.json`，`pnpm features:check` 通过。
- **文档**：能力矩阵 `vector.*` 行、模块地图 vectors 段、本包 README 均按实际范围更新。

逐条改动清单与理由见 [验收记录的「本轮共享文件接线清单」](verification.md#本轮共享文件接线清单按用户授权顺序实施)。

## 实测结果摘要（详见 [验收记录](verification.md#已执行的非渲染检查真实结果接线后全量重跑)）

- `pnpm run check` EXIT 0（editor **54 files / 411 passed**；protocol 4/84；project-verifier 2/40；`tsc` 0 错误）；
- Rust workspace **319 passed / 0 failed**（主目标 234）；
- 本域 TS **15 文件 / 132 项**（含 `wasm-handle` 9 项：门禁顺序、冻结窗口、代际令牌）；
- Woohaa 适配包 **34 files / 276 passed**；
- 真实 `dist/wasm`：构造器 → 内核 34 项接受；U11 续接/曲率钢笔/两步撤销 8 项、U16 库管理 19 项、
  U15 蒙版几何命令链 20 项、**3.2 内容身份 13 项**、**3.2 形状外观/蒙版密度羽化 27 项**全通过；
- `verify-wiring-gate.mjs` **EXIT 0**；`pnpm features:check` 通过；`pnpm codemap:check` 通过（1358 链接）；
  `pnpm openspec validate … --strict` valid。
- **变异验证**：删掉矢量冻结判定与父子回写草稿门禁后，4 项新用例立刻失败，恢复即全绿。

## 仍待人工验证（本环境做不到，不是未做）

| 项 | 真实原因 |
| --- | --- |
| 1440×1000 / 1024×768 真实窗口走查、拖绘与命中体感 | Linux 容器，`/dev/dri` 无 `renderD*`、`DISPLAY`/`WAYLAND_DISPLAY` 皆空：无 GPU 且无显示会话 |
| PSD 往返矩阵 | 无 Photoshop、无真实 PSD 资产 |
| Pad 正常窗口 / 数位笔压感 | 无对应硬件 |
| 形状层跨文档复制 | `edit.paste` 被 layers 域白名单拒绝（`LayerContent::Shape` 未开放），跨域，本 change 不单方面改 |
| 真实宿主会话下的切标签/关闭/父子回写链路 | 无宿主运行环境；门禁本身已有单测，宿主侧用例用内核替身 |

并行施工边界与授权记录见 [单一写入归属与依赖](parallel-work.md)；
需要复核的共享文件落点见
[验收记录清单](verification.md#需要集成方复核的确切清单本轮已按用户授权实施此处供复核)。
