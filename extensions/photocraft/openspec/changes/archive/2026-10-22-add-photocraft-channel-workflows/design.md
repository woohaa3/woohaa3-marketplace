# 通道与通道计算设计

## 基线与范围

固定上游 commit `4e7a17cd5d5723313f459753663d0d155f047e19`；已提交实现 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。范围逐项列于 [scope.md](scope.md)，每个 U 组的子能力都需拆成实现时的命令/参数/操作记录，不以一组一个按钮结案。

同级前置：无新增同级 change 的硬依赖。相邻模块只是消费端口的软依赖时，以现有内核能力完成基础流程，新增联动在两边均交付后验证。原 change 的未验收项仍按其证据处理；本计划仅追加缺口，不自动勾选或重写旧任务。

## 操作与布局

窗口 → 通道面板；图像 → 应用图像 / 计算；面板中单通道缩略图、显隐、编辑目标和载入选区明确分离。

复用固定上游 0.9.0 的生产算法，不修改 vendor。`rust/crates/editor-core` 持有规范内容、命令、预览草稿、身份与历史；`packages/protocol` 持有纯数据和限额契约；`packages/editor` 持有共享工具/面板。`dev` 与 `integrations/woohaa` 只装配公共端口，核心不得 import Woohaa 私有实现或内部工具。

界面沿用既有菜单 → 工具组 → 参数栏 → 原图/属性反馈的结构，菜单和参数栏在文档标签之上。所有状态均需有可见忙碌、失败与恢复反馈；面板仍使用现有浮动/停靠能力，不重新设计外壳。只验收电脑 1440×1000 和 Pad 正常窗口 1024×768；手机/极窄窗口和无障碍专项不在范围。

## 本域实现决策

### D1

编辑目标统一表示复合/分量/Alpha/专色/图层蒙版，前后端不各存一份目标。RGB 分量视图和显隐为会话态，Alpha/专色内容与元数据进入工程；专色仅保存屏幕 RGB 替代色及密度，不承诺 ICC/印刷分色。

### D2

绘画、清除、变换和像素调整需逐工具声明可用通道目标；对不支持目标落笔前拒绝。拆分新文档与合并多文档先核对尺寸、代际和 8 文档限额，失败不注册半个结果。拆合只合成 RGB：上游的 CMYK/Lab 分支会产出 CMYK/Lab 模式文档，属「CMYK/Lab/ICC 多色彩管理」排除项，因此内核在参数校验阶段按 `mode` 明确拒绝、面板只给 RGB，不靠用户不选来回避。

### D3

Apply Image/Calculations 使用工作区内不可变来源快照，参数包括源文档/层/通道、混合、不透明度、反相和输出目标。跨文档读取不创建分布式写事务；提交只修改一个目标文档。

来源通道由**每份文档自报**（`documents[].colorNames` 与 `documents[].alpha[{index,name,kind}]`），
面板因此能在非活动文档上按名选分量/Alpha，不必先切换文档（切换会丢当前目标与未确认草稿）。
快照只给引用与名字、不带像素；灰度文档只报合成通道，不重复列出 `color:0`。

## 事务和生命周期

内容操作遵守 begin → preview → commit/cancel：固定 documentId/generation、baseRevision、目标及 attemptId；预览不变正式内容 hash/修订/历史，确认最新有效候选一次，取消恢复，无变化不新增历史。非法参数不得确认上一份成功预览。一次笔迹/拖动按既有完成规则提交，不强制所有参数都变成弹窗。

保存、切文档、关闭、只读变化和父子回写复用活动草稿门禁。晚到任务按文档代际和请求序号丢弃，不能写入后来活动文档。只读采样和工具/查看偏好不制造文档 dirty。分组队列若有不同语义必须在具体设计中声明，不虚构跨文档原子事务。

## 内容、协议与核验

逐能力同步参数解码、唯一命令门、WASM、React、内容身份、工程序列化、TS 检查和原生核验器；实际接通后才发布能力，不把整个命令前缀放开。共享限制只在 `rust/project-limits.json` 与两端 fixture 中维护；不整体提升现有 8192 单边、64 图层、64 MiB 工程、16 嵌套深度和 8 文档上限。

新增规范内容缺省/空值保持旧工程身份兼容，工具本机设置/视图不进入内容 hash。涉及新持久字段时必须给出与旧运行时的能力协商、解码前累计预算和资源引用验证；未知内容不能通过通用 JSON/PSD 原始块绕过。PSD 与 LayerTransferBundle 的兼容项逐类型更新，无法表达时报告而非静默压平。

## 取舍与发布条件

优先复用上游算法和现有 UI/草稿，避免复制另一套内容状态。不能编译进 WASM、没有 codec/字体/硬件或缺公共端口的子能力单独记录停止原因，不能因此把整个域标为完成。

CMYK/Lab/ICC 多色彩管理、印刷专色保真和任意外部文件路径保持排除。

## 验收主线

创建 Alpha → 单通道绘画 → 载入选区 → 两源通道计算 → 工程重开；切来源文档、来源关闭、尺寸不匹配与超限分别拒绝。 具体成功/失败情景和逐项证据见 specs 与 verification；实际像素、结构、历史和工程往返都通过后才开放相应子能力。

## 并行边界

以 `2026-10-22-refactor-photocraft-feature-boundaries` 的实际提交为启动门槛；完整目录、共享文件禁并改清单和完成依赖见 [parallel-work.md](parallel-work.md)。

### 本次实际越界的共享文件（交接清单）

域内目录无法独自闭合整条链路，因此本次**确实**修改了下列共享文件。每处都是最小改动，逐项理由与
行数见 [verification.md](verification.md) 的「共享文件改动」：

- 内容身份：`document_content.rs`（调 `attach`）、`identity.rs`（读 `channelsContentHash`）、
  `packages/protocol/src/features/shared/content.ts`（同名字段）。三处缺一不可，否则两端指纹分歧。
- 核验入口：`project-verify/src/lib.rs`（图层遍历后调 `inspect_document`）。
- 主画布与落笔：`photo-editor-app.tsx`（通道目标驱动单通道视图与 `buildStroke` 的 `channel`）、
  `editor-view-model.ts`（`EditorChannelTarget`）、`features/painting/tool-parameters.ts`（可选 `channel`）。
- 装配与基线：`features/boundaries.test.ts`（12→15 section + 通道域断言）、
  `photo-editor.css`（3 行可见性 + 12 条域样式）、`tests/fixtures/contract.json`（+8 能力）、
  `notes/feature-boundary-wasm-baseline.json` 与 `-baseline.json`（重生成与两个文件哈希）、
  `integrations/woohaa/tests/editor-workspace.test.ts`（替身补 6 个方法）。
- 文档：`notes/capability-matrix.md`、`docs/code-map/photocraft.md`（任务 4.4）。

未改动 `photo-editor-canvas.tsx`、`editor-wasm.ts`、`editor-workspace.ts`、`capability.rs`、
`rust/project-limits.json`、任何 sibling 域目录与 `vendor/photocraft`。
