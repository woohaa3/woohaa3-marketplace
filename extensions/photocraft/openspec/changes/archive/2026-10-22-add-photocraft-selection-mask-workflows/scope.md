# 范围与追溯

本 change 是 19 项拆分中的「选区与蒙版完整交互」，唯一负责 U17, U18, U19, U20, U21, U22, U23, U24。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：2026-10-22-add-photocraft-channel-workflows。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U17

**单行/单列选框** · 内核已开放，UI 缺失

上游 Tool 含 SingleRow/SingleColumn；当前选框组只有矩形和椭圆。select.rect 接口本身支持 line，但 UI 未编排。

依据：[commands.rs:560](../../../vendor/photocraft/crates/engine/src/commands.rs#L560)；[single_line_drag.rs:1](../../../vendor/photocraft/crates/ui-egui/src/single_line_drag.rs#L1)；[marquee-tool-group.tsx:8](../../../packages/editor/src/marquee-tool-group.tsx#L8)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：在选框组增加单行/单列工具，按源像素创建一行/一列并支持既有选择组合模式。

结果证据：缩放后单击形成准确的一源像素行/列，完成后边界持续显示。

## U18

**多边形套索、磁性套索** · 未接包装及 UI

当前只有自由手绘套索，没有点击逐点形成多边形或磁性边缘追踪；上游有两类原生手势，磁性套索另有引擎命令。

依据：[magnetic_cmds.rs:178](../../../vendor/photocraft/crates/engine/src/magnetic_cmds.rs#L178)；[lasso_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/lasso_ui.rs#L1)；[photo-editor-canvas.tsx:118](../../../packages/editor/src/photo-editor-canvas.tsx#L118)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供多边形逐点套索与磁性边缘追踪，支持回退锚点、双击/闭合完成和取消，预览使用实际追踪结果。

结果证据：磁性轨迹依据源图边缘，多边形锚点可修正，最终内核边界与预览吻合。

## U19

**命名选区、扩大选取和选取相似** · 内核已开放，UI 缺失

select.saveSelection/loadSelection/grow/similar 已开放，无菜单或面板。几何扩展 Expand 已有，不能代替按颜色 Grow。

依据：[channel_cmds.rs:1803](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1803)；[channel_cmds.rs:1812](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1812)；[selection_cmds.rs:697](../../../vendor/photocraft/crates/engine/src/selection_cmds.rs#L697)；[selection_cmds.rs:698](../../../vendor/photocraft/crates/engine/src/selection_cmds.rs#L698)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供命名保存/加载选区、覆盖确认及按色彩 Grow/Similar 的参数与真实预览，区别几何 Expand。

结果证据：命名选区重载覆盖一致，Grow/Similar 在受控色块上与几何扩展不同，命名数据可工程往返。

## U20

**快速蒙版及其画笔编辑** · 未接包装及 UI

缺 Q 切换 Quick Mask、红色叠加、蒙版/选区互换和快速蒙版绘画目标。现有像素层蒙版编辑不等同于 Quick Mask。

依据：[channel_cmds.rs:1821](../../../vendor/photocraft/crates/engine/src/channel_cmds.rs#L1821)；[select_mask_view.rs:1](../../../vendor/photocraft/crates/ui-egui/src/select_mask_view.rs#L1)；[photo-editor-app.tsx:163](../../../packages/editor/src/photo-editor-app.tsx#L163)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Q/鼠标 Quick Mask 切换、覆盖色查看、临时黑白画笔编辑及退出转选区；取消恢复进入选区。

结果证据：快速蒙版笔迹只修改临时选择，退出后边界保留，不污染当前图层/像素蒙版。

## U21

**对象/主体/天空/焦点选择和移除背景** · 未接包装及 UI

上游有 select.object/subject/sky/focusArea 与 removeBackground；本机未开放。另有 AI 主体非目标声明，但不能将所有传统分割功能自动归入该声明；上游这些注册命令使用传统分割模块，不能由名称推断为云端 AI。

依据：[smartselect_cmds.rs:507](../../../vendor/photocraft/crates/engine/src/smartselect_cmds.rs#L507)；[smartselect_cmds.rs:515](../../../vendor/photocraft/crates/engine/src/smartselect_cmds.rs#L515)；[select_extra_cmds.rs:215](../../../vendor/photocraft/crates/engine/src/select_extra_cmds.rs#L215)；[smartselect_cmds.rs:531](../../../vendor/photocraft/crates/engine/src/smartselect_cmds.rs#L531)；[cutout_cmds.rs:80](../../../vendor/photocraft/crates/engine/src/cutout_cmds.rs#L80)；[smartselect_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/smartselect_cmds.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：接入传统 Object/Subject/Sky/Focus Area 和 Remove Background 的采样区域、参数、候选遮罩/选区及输出，不标记为 AI 模型能力。

结果证据：本地传统分割产生可见可修改的实际 mask，确认按选择/蒙版输出并可撤销。

## U22

**色彩范围的画布取样和高级选项** · 接入不完整

当前有单色、容差、固定色域/明暗、运算和反相；缺画布多点取样/增减吸管、局部颜色群组及范围、色调区间、采样层选择等上游选项。上游 detectFaces 明确未实现，不把它算作漏接。

依据：[selection_cmds.rs:666](../../../vendor/photocraft/crates/engine/src/selection_cmds.rs#L666)；[color_range_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/color_range_ui.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：色彩范围支持画布多点/增减取样、局部颜色群组/范围、色调区间和采样层选项，已有单色/反相功能保留。

结果证据：改变取样点和群组范围立即改变真实候选选区，确认与最后预览一致。

## U23

**选择并遮住的修边画笔和预览** · 接入不完整

当前仅五个数值、两种输出与“预览参数”（只编译参数）。缺真实边缘预览、前景/背景手工修边画笔、smartRadius/采样层控件；新层/新文档等其余输出和净化颜色还需包装。上游 refineStrokes 已实现。

依据：[smartselect_cmds.rs:523](../../../vendor/photocraft/crates/engine/src/smartselect_cmds.rs#L523)；[select_mask_view.rs:1](../../../vendor/photocraft/crates/ui-egui/src/select_mask_view.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：选择并遮住提供真实像素边缘预览、前景/背景修边笔、smartRadius/采样层、净化颜色及选择/蒙版/新层/新文档等输出。

结果证据：修边画笔真实改变候选边缘，所有开放输出各有正确像素和结构，取消恢复基线。

## U24

**像素蒙版密度、非破坏羽化和显示模式** · 未接包装及 UI

现有蒙版增删、启用/链接、应用与像素绘画已经接入；缺 density/feather 属性，以及独立蒙版/叠加查看等完整 UI。选区羽化不能替代蒙版属性。

依据：[layer_mask_props_cmds.rs:60](../../../vendor/photocraft/crates/engine/src/layer_mask_props_cmds.rs#L60)；[mask_view_cmds.rs:158](../../../vendor/photocraft/crates/engine/src/mask_view_cmds.rs#L158)；[mask_props_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/mask_props_ui.rs#L1)；[photo-editor-panels.tsx:18](../../../packages/editor/src/photo-editor-panels.tsx#L18)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供像素蒙版 density、非破坏 feather 及独立/覆盖显示模式，密度羽化属于内容而查看属于会话。

结果证据：调整密度/羽化不改原蒙版采样值，重开仍可改参数；单独查看不新增内容历史。

## 明确边界

AI 主体/发丝模型和上游未实现的 detectFaces 不在本 change；传统 select.subject/object 不按名称误禁为 AI。
