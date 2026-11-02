# 形状与路径画布工具

## Why

已有形状数值创建、直线点列钢笔与部分路径/矢量蒙版操作；缺实际形状拖绘和可编辑曲线。 2026-10-22 的固定上游接入审计确认了 U08, U09, U10, U11, U12, U13, U14, U15, U16；需要以真实可操作工作流补齐，不能以已开放命令或阶段声明代替交互完成。

## What Changes

- **U08 矩形、椭圆、直线的画布绘制工具**：在工具栏提供矩形/椭圆/直线，图内拖动实时预览，支持 Shift 比例/角度、Alt 从中心和单击输入尺寸；和数值创建共享几何。
- **U09 圆角矩形、三角形、多边形、星形**：补圆角矩形/三角形/多边形/星形的拖绘与边数、圆角、星形内外比例参数。
- **U10 已有形状的属性编辑**：选中已有形状时显示尺寸/圆角/填充/描边、线帽/拐角/虚线/描边对齐属性，通过同一草稿编辑当前形状。
- **U11 完整钢笔：贝塞尔、开放路径、自由钢笔、曲率钢笔**：提供贝塞尔拖柄、开放/闭合、续接、自由钢笔和曲率钢笔，结束规则清晰，不再一律 closed:true。
- **U12 路径选择、直接选择和增删/转换锚点**：接入路径选择/直接选择、锚点/线段/手柄命中移动和增删/平滑尖角转换，屏幕命中阈值按取景换算。
- **U13 路径变换、裁切路径与选区转形状**：提供路径变换、裁切路径设置/清除、选区转形状，保留已有填充/描边/重命名和工作路径功能。
- **U14 形状布尔运算**：接入形状合并、减去顶层、相交、排除重叠与合并组件，明确层序与填充规则，在候选几何上整体提交。
- **U15 矢量蒙版的其余编辑与转换**：在现有矢量蒙版基础上提供全显/全隐、栅格化以及直接编辑现有蒙版路径，保留像素蒙版共存与链接语义。
- **U16 自定形状与形状预设**：提供 Custom Shape 工具、从路径定义形状、预设选择/保存/重命名/分组/删除；应用后保留独立几何快照。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `composition-type-vector`：复用前置 change `2026-10-22-complete-photocraft-webui-editing` 中的同名能力，追加本域要求，不复制已有 Requirement。该能力尚在 changes 中，归档顺序须先建立原 capability。

## Dependencies and Non-goals

优先级：第一批（优先矩形）。前置实现提交 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`，同级依赖：无新增同级 change 的硬依赖。各自保持唯一 U 编号 owner；共用接口的提供方不代替本 change 的用户流程验收。

路径文字、竖排文字以及未实现的菜单目录项保持排除；不以 SVG 叠加画面代替可保存几何。 全局明确非目标仍保留；不建设独立应用外壳、手机布局或无障碍专项。

## Impact

涉及 `packages/editor`、纯 `packages/protocol`、`rust/crates/editor-core`，有新内容时同步 `rust/crates/project-verify` / `packages/project-verifier`、limits 与 fixture。`dev` 和 `integrations/woohaa` 消费相同公共端口；只在确有宿主能力需求时更新适配和相关接口。vendor 快照不修改。交付完整规划和空闲 ATC 会话；本次不启动实施。

## Parallel implementation

先完成 `2026-10-22-refactor-photocraft-feature-boundaries`；本 change 仅写 `features/vectors/` 相关域目录，通过冻结接口接入。共享文件和具体同级前置见 [parallel-work.md](parallel-work.md)。
