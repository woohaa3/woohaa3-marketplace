# 范围与追溯

本 change 是 19 项拆分中的「裁剪、变换与画板切片」，唯一负责 U50, U51, U52, U53, U54, U55, U56。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U50

**画布裁剪工具和透视裁剪** · 接入不完整

数字裁剪面板已存在；缺工具栏 Crop、画布框拖动/缩放/旋转、比例预设、网格遮罩、拉直、删除裁剪像素选项，以及四角透视裁剪。后者还缺命令包装。

依据：[image_cmds.rs:779](../../../vendor/photocraft/crates/engine/src/image_cmds.rs#L779)；[perspective_crop_cmds.rs:235](../../../vendor/photocraft/crates/engine/src/perspective_crop_cmds.rs#L235)；[crop_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/crop_ui.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供画布裁剪框的移动/缩放/旋转、比例预设/网格/遮罩/拉直和真实删除像素策略，并接四角透视裁剪。

结果证据：裁剪框和实际输出一致，保留模式可恢复画布外内容，透视四角正确映射并一步撤销。

## U51

**图像/画布尺寸的完整设置** · 接入不完整

现有宽高/画布锚点；缺图像分辨率 DPI、重采样开关/算法、打印尺寸，画布相对增减、扩展颜色选择等。当前画布扩展色写死 background。

依据：[image_cmds.rs:763](../../../vendor/photocraft/crates/engine/src/image_cmds.rs#L763)；[image_cmds.rs:771](../../../vendor/photocraft/crates/engine/src/image_cmds.rs#L771)；[image_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/image_cmds.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：补 DPI/打印尺寸单位/重采样开关和算法、画布相对增减/锚点/扩展颜色，数值联动有明确单位。

结果证据：仅改 DPI 不重采样时像素不变，重采样和相对画布按选择正确更新各层与蒙版坐标。

## U52

**自动裁边、显示全部和任意角度旋转** · 接入不完整

image.trim 已开放但没有透明/角像素依据与四边开关；Reveal All 和任意角度整图旋转也无 UI。现有 90/180° 与翻转不计缺失。

依据：[image_cmds.rs:787](../../../vendor/photocraft/crates/engine/src/image_cmds.rs#L787)；[extra_cmds.rs:861](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L861)；[mode_cmds.rs:494](../../../vendor/photocraft/crates/engine/src/mode_cmds.rs#L494)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Trim 的透明/角像素依据与四边控制、Reveal All、任意角度整图旋转，保留现有 90/180° 与翻转。

结果证据：裁边/显示全部/任意旋转的文档边界、选区与内容坐标一致并可重开。

## U53

**斜切/扭曲/透视/网格变形及再次变换** · 接入不完整

当前自由变换覆盖平移/缩放/旋转、比例和参考点；缺 Skew/Distort/Perspective 模式、Warp/分割网格、再次变换/再次变换副本，缺 Puppet/Perspective Warp。

依据：[warp_cmds.rs:553](../../../vendor/photocraft/crates/engine/src/warp_cmds.rs#L553)；[warp_cmds.rs:573](../../../vendor/photocraft/crates/engine/src/warp_cmds.rs#L573)；[edit_cmds.rs:1027](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1027)；[edit_cmds.rs:1028](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1028)；[distort_cmds.rs:398](../../../vendor/photocraft/crates/engine/src/distort_cmds.rs#L398)；[distort_cmds.rs:418](../../../vendor/photocraft/crates/engine/src/distort_cmds.rs#L418)；[transform_tool.rs:1](../../../vendor/photocraft/crates/ui-egui/src/transform_tool.rs#L1)；[layer-transform-ui.tsx:7](../../../packages/editor/src/layer-transform-ui.tsx#L7)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：补 Skew/Distort/Perspective/Warp 及网格分割、Puppet/Perspective Warp，提供再次变换和再次变换副本。

结果证据：图内手柄与内核结果一致，重复变换作用新选中目标，撤销恢复完整网格/层关系。

## U54

**内容识别填充/缩放、选区描边和渐隐** · 未接包装及 UI

当前前背景色填充已实现；缺 Content-Aware Fill/Scale、任意颜色/图案 Fill 对话框、Stroke 的宽度/内外位置和 Fade 的不透明度/混合设置。

依据：[edit_menu_cmds.rs:1167](../../../vendor/photocraft/crates/engine/src/edit_menu_cmds.rs#L1167)；[edit_menu_cmds.rs:1177](../../../vendor/photocraft/crates/engine/src/edit_menu_cmds.rs#L1177)；[commands.rs:501](../../../vendor/photocraft/crates/engine/src/commands.rs#L501)；[extra_cmds.rs:802](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L802)；[edit_menu_cmds.rs:1151](../../../vendor/photocraft/crates/engine/src/edit_menu_cmds.rs#L1151)；[fill_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/fill_ui.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供内容识别 Fill/Scale、任意颜色/图案 Fill、Stroke 宽度/位置和 Fade 不透明度/混合模式。

结果证据：预览尊重选区，描边位置真实不同，Fade 只改变可识别的上一结果；各自一步撤销。

## U55

**自动对齐/混合和照片合并** · 未接包装及 UI

现有规则对齐/分布已经接入；缺图像内容识别的 Auto-Align/Auto-Blend、Photomerge、自动裁切拉直和堆栈统计。

依据：[align_cmds.rs:304](../../../vendor/photocraft/crates/engine/src/align_cmds.rs#L304)；[align_cmds.rs:310](../../../vendor/photocraft/crates/engine/src/align_cmds.rs#L310)；[photo_cmds.rs:884](../../../vendor/photocraft/crates/engine/src/photo_cmds.rs#L884)；[photo_cmds.rs:904](../../../vendor/photocraft/crates/engine/src/photo_cmds.rs#L904)；[automate_cmds.rs:573](../../../vendor/photocraft/crates/engine/src/automate_cmds.rs#L573)；[photo_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/photo_cmds.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供按图像内容 Auto-Align/Auto-Blend、Photomerge、自动裁切拉直与堆栈统计，区别规则对齐。

结果证据：多源受控照片产生实际合并结果，来源不改、结果结构/像素可重开并有失败报告。

## U56

**画板、框架和切片** · 未接包装及 UI

缺 Artboard/Frame/Slice/Slice Select、画板布局、从图层建画板/框架、参考线生成切片和画板/切片导出。

依据：[artboard_cmds.rs:632](../../../vendor/photocraft/crates/engine/src/artboard_cmds.rs#L632)；[frame_cmds.rs:163](../../../vendor/photocraft/crates/engine/src/frame_cmds.rs#L163)；[slice_cmds.rs:503](../../../vendor/photocraft/crates/engine/src/slice_cmds.rs#L503)；[slice_cmds.rs:524](../../../vendor/photocraft/crates/engine/src/slice_cmds.rs#L524)；[slice_cmds.rs:511](../../../vendor/photocraft/crates/engine/src/slice_cmds.rs#L511)；[artboard_cmds.rs:680](../../../vendor/photocraft/crates/engine/src/artboard_cmds.rs#L680)；[artboard_tool.rs:1](../../../vendor/photocraft/crates/ui-egui/src/artboard_tool.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Artboard/Frame/Slice/Slice Select、布局与从层转换、从参考线建切片和画板/切片导出。

结果证据：结构/裁切/引用可编辑且工程往返，导出范围和命名正确，Frame 实际约束嵌入内容。

## 明确边界

打印、原生文件夹输出和被明确排除的智能滤镜/液化不接入；新增结构接通前不批量开放命令。
