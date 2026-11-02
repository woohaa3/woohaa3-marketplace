# 范围与追溯

本 change 是 19 项拆分中的「形状与路径画布工具」，唯一负责 U08, U09, U10, U11, U12, U13, U14, U15, U16。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U08

**矩形、椭圆、直线的画布绘制工具** · 接入不完整

目前只能在形状与路径面板填写坐标/宽高后创建；缺工具栏入口、拖拽预览、Shift 比例约束、Alt 从中心、点击创建尺寸对话框。上游原生 UI 均有对应逻辑。

依据：[vector_cmds.rs:1681](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1681)；[vector_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/vector_ui.rs#L1)；[vector-tools-panel.tsx:5](../../../packages/editor/src/vector-tools-panel.tsx#L5)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：在工具栏提供矩形/椭圆/直线，图内拖动实时预览，支持 Shift 比例/角度、Alt 从中心和单击输入尺寸；和数值创建共享几何。

结果证据：缩放/平移后拖出的形状位于正确源坐标，松手一层一步历史，已有选区不会无故消失。

## U09

**圆角矩形、三角形、多边形、星形** · 内核已开放，UI 缺失

当前面板只有 rect/ellipse/line。上游引擎支持圆角与 polygon/star 参数，原生工具有 Triangle/Polygon；这些形状和边数/星形参数没有当前 UI。

依据：[vector_cmds.rs:1681](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1681)；[vector_cmds.rs:1691](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1691)；[vector_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1)；[vector-tools-panel.tsx:5](../../../packages/editor/src/vector-tools-panel.tsx#L5)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：补圆角矩形/三角形/多边形/星形的拖绘与边数、圆角、星形内外比例参数。

结果证据：改变边数或圆角后实际可编辑轮廓改变，保存/重开仍保持规范形状参数。

## U10

**已有形状的属性编辑** · 内核已开放，UI 缺失

shape.edit/info 已开放；没有已建形状的宽高/圆角、填充/描边、线帽/拐角/虚线/对齐等属性编辑流程。路径描边按钮只是在路径上画线，不能替代形状描边属性。

依据：[vector_cmds.rs:1691](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1691)；[vector_cmds.rs:1701](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1701)；[shape_stroke_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/shape_stroke_ui.rs#L1)；[vector-tools-panel.tsx:5](../../../packages/editor/src/vector-tools-panel.tsx#L5)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：选中已有形状时显示尺寸/圆角/填充/描边、线帽/拐角/虚线/描边对齐属性，通过同一草稿编辑当前形状。

结果证据：属性修改改变已有层而不新增形状，图内/数值一致，取消恢复全部参数。

## U11

**完整钢笔：贝塞尔、开放路径、自由钢笔、曲率钢笔** · 接入不完整

当前钢笔累积二维点并 closed:true 提交；缺拖出切线控制柄、开放路径提交、续接与自由钢笔/曲率钢笔交互。不是完全没有钢笔。

依据：[vector_cmds.rs:1739](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1739)；[vector_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/vector_ui.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供贝塞尔拖柄、开放/闭合、续接、自由钢笔和曲率钢笔，结束规则清晰，不再一律 closed:true。

结果证据：开放路径重开仍开放，连续/尖角控制柄可重编，渲染与保存几何一致。

## U12

**路径选择、直接选择和增删/转换锚点** · 未接包装及 UI

上游有 Path Selection/Direct Selection、移动锚点/手柄/线段、增删锚点及平滑/尖角转换。当前没有已有路径命中、选点和编辑工具；专用 path.* 编辑命令也尚未开放。

依据：[path_edit_cmds.rs:164](../../../vendor/photocraft/crates/engine/src/path_edit_cmds.rs#L164)；[path_edit_cmds.rs:165](../../../vendor/photocraft/crates/engine/src/path_edit_cmds.rs#L165)；[path_edit_cmds.rs:171](../../../vendor/photocraft/crates/engine/src/path_edit_cmds.rs#L171)；[path_edit_cmds.rs:183](../../../vendor/photocraft/crates/engine/src/path_edit_cmds.rs#L183)；[path_edit_cmds.rs:189](../../../vendor/photocraft/crates/engine/src/path_edit_cmds.rs#L189)；[path_edit_cmds.rs:177](../../../vendor/photocraft/crates/engine/src/path_edit_cmds.rs#L177)；[direct_select.rs:1](../../../vendor/photocraft/crates/ui-egui/src/direct_select.rs#L1)；[photo-editor-canvas.tsx:118](../../../packages/editor/src/photo-editor-canvas.tsx#L118)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：接入路径选择/直接选择、锚点/线段/手柄命中移动和增删/平滑尖角转换，屏幕命中阈值按取景换算。

结果证据：单点/多点移动和转角只改变预期节点，一次拖动一步历史，路径拓扑合法。

## U13

**路径变换、裁切路径与选区转形状** · 内核已开放，UI 缺失

path.transform、clippingPath.set/clear、select.convertToShape 已在白名单，没有 UI 调用。路径填充/描边、重命名、转选区和选区转工作路径已经有界面。

依据：[vector_cmds.rs:1750](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1750)；[vector_cmds.rs:1758](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1758)；[vector_cmds.rs:1766](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1766)；[vector_cmds.rs:1899](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1899)；[vector-tools-panel.tsx:5](../../../packages/editor/src/vector-tools-panel.tsx#L5)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供路径变换、裁切路径设置/清除、选区转形状，保留已有填充/描边/重命名和工作路径功能。

结果证据：变换结果来自内核，裁切引用和选区转换保存重开/复制后仍正确。

## U14

**形状布尔运算** · 未接包装及 UI

合并、减去顶层、相交、排除重叠、合并组件等上游有实现，本机未开放对应 combineShapes 命令与交互。

依据：[vector_cmds.rs:1875](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1875)；[vector_cmds.rs:1876](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1876)；[vector_cmds.rs:1882](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1882)；[vector_cmds.rs:1888](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1888)；[vector_cmds.rs:1891](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1891)；[vector-tools-panel.tsx:5](../../../packages/editor/src/vector-tools-panel.tsx#L5)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：接入形状合并、减去顶层、相交、排除重叠与合并组件，明确层序与填充规则，在候选几何上整体提交。

结果证据：重叠/孔洞用例的轮廓与合成一致，可一步撤销恢复原组件。

## U15

**矢量蒙版的其余编辑与转换** · 接入不完整

当前已有从路径创建、启用、链接和删除；缺全显/全隐、栅格化矢量蒙版及直接编辑已有蒙版路径，部分转换命令已开放。

依据：[vector_cmds.rs:1855](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1855)；[vector_cmds.rs:1850](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1850)；[vector_cmds.rs:1841](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1841)；[vector_cmds.rs:1830](../../../vendor/photocraft/crates/engine/src/vector_cmds.rs#L1830)；[vector-tools-panel.tsx:5](../../../packages/editor/src/vector-tools-panel.tsx#L5)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：在现有矢量蒙版基础上提供全显/全隐、栅格化以及直接编辑现有蒙版路径，保留像素蒙版共存与链接语义。

结果证据：只修改蒙版几何/类型，原图像保留，转换后保存重开结果一致。

## U16

**自定形状与形状预设** · 未接包装及 UI

缺 Custom Shape 工具、形状预设选择/保存/管理和从路径定义自定形状。

依据：[shapes.rs:431](../../../vendor/photocraft/crates/engine/src/presets/shapes.rs#L431)；[shapes.rs:441](../../../vendor/photocraft/crates/engine/src/presets/shapes.rs#L441)；[edit_menu_cmds.rs:1195](../../../vendor/photocraft/crates/engine/src/edit_menu_cmds.rs#L1195)；[vector-tools-panel.tsx:5](../../../packages/editor/src/vector-tools-panel.tsx#L5)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Custom Shape 工具、从路径定义形状、预设选择/保存/重命名/分组/删除；应用后保留独立几何快照。

结果证据：删除库项不损坏已应用的形状，库重载和自定形状拖绘均可复现。

## 明确边界

路径文字、竖排文字以及未实现的菜单目录项保持排除；不以 SVG 叠加画面代替可保存几何。
