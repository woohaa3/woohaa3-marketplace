# 范围与追溯

本 change 是 19 项拆分中的「滤镜参数、画廊与摄影滤镜」，唯一负责 U46, U47, U48, U49。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U46

**USM 完整参数和重复上次滤镜** · 接入不完整

已有高斯模糊/USM，USM 只显示 amount，缺 radius/threshold；filter.lastFilter 已允许但没有菜单/快捷键入口。

依据：[filters.rs:409](../../../vendor/photocraft/crates/engine/src/filters.rs#L409)；[filters.rs:365](../../../vendor/photocraft/crates/engine/src/filters.rs#L365)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：补 USM radius/threshold/amount 和重复上次滤镜入口；重复保存规范参数与资源而非旧目标。

结果证据：radius/threshold 改变实际结果，换可写层可重复同一设置，确认一次一步历史。

## U47

**其余模糊/锐化/降噪** · 未接包装及 UI

缺普通/进一步/方框/动感/径向/表面/智能/形状/镜头模糊，以及智能锐化、锐化边缘、加噪、去斑、蒙尘与划痕、中间值、减少杂色等。当前“滤镜库”名称实际只有两项。

依据：[filters.rs:357](../../../vendor/photocraft/crates/engine/src/filters.rs#L357)；[filters.rs:358](../../../vendor/photocraft/crates/engine/src/filters.rs#L358)；[filters.rs:364](../../../vendor/photocraft/crates/engine/src/filters.rs#L364)；[filters_ext.rs:653](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L653)；[filters_ext.rs:659](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L659)；[filters.rs:371](../../../vendor/photocraft/crates/engine/src/filters.rs#L371)；[filters.rs:377](../../../vendor/photocraft/crates/engine/src/filters.rs#L377)；[filters.rs:383](../../../vendor/photocraft/crates/engine/src/filters.rs#L383)；[filters_ext.rs:646](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L646)；[filters.rs:1](../../../vendor/photocraft/crates/engine/src/filters.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：逐项接生产实现中的普通/进一步/方框/动感/径向/表面/智能/形状/镜头模糊、智能/边缘锐化及加噪/去斑/划痕/中间值/降噪。

结果证据：每个已开放命令都有真实参数/像素证据与取消/撤销用例，不能用两项滤镜算整组完成。

## U48

**像素化、扭曲、风格化、渲染和其他滤镜** · 未接包装及 UI

缺马赛克/晶格化/点状化/彩色半调，波浪/旋转/球面/位移等扭曲，浮雕/查找边缘/油画等风格化，云彩/镜头光晕/光照等渲染，高反差保留/最大最小/位移/自定等；上游 filters/filters_ext 均有生产实现。

依据：[filters.rs:385](../../../vendor/photocraft/crates/engine/src/filters.rs#L385)；[filters_ext.rs:570](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L570)；[filters.rs:392](../../../vendor/photocraft/crates/engine/src/filters.rs#L392)；[filters_ext.rs:603](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L603)；[filters.rs:386](../../../vendor/photocraft/crates/engine/src/filters.rs#L386)；[filters_ext.rs:588](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L588)；[extra_cmds.rs:1020](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L1020)；[filters_ext.rs:623](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L623)；[filters.rs:400](../../../vendor/photocraft/crates/engine/src/filters.rs#L400)；[filters_ext.rs:703](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L703)；[color_to_alpha_cmds.rs:108](../../../vendor/photocraft/crates/engine/src/color_to_alpha_cmds.rs#L108)；[filters_ext.rs:1](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：逐项接生产实现中的像素化/扭曲/风格化/渲染/其他滤镜，包括位移/自定卷积/高反差/最大最小及颜色转透明的资源参数。

结果证据：各子项在规范清单有真实效果，随机项固定 seed 可重现，资源型滤镜可工程结果往返。

## U49

**滤镜画廊、模糊画廊和摄影滤镜** · 未接包装及 UI

缺真正的 Filter Gallery、场景/光圈/移轴/路径/旋转模糊交互、Camera Raw、镜头校正、自适应广角、消失点；当前“滤镜库”不等于上游 Filter Gallery。

依据：[gallery_cmds.rs:175](../../../vendor/photocraft/crates/engine/src/gallery_cmds.rs#L175)；[filters_ext.rs:684](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L684)；[filters_ext.rs:678](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L678)；[filters_ext.rs:672](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L672)；[filters_ext.rs:696](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L696)；[filters_ext.rs:690](../../../vendor/photocraft/crates/engine/src/filters_ext.rs#L690)；[lens_cmds.rs:461](../../../vendor/photocraft/crates/engine/src/lens_cmds.rs#L461)；[lens_cmds.rs:441](../../../vendor/photocraft/crates/engine/src/lens_cmds.rs#L441)；[lens_cmds.rs:451](../../../vendor/photocraft/crates/engine/src/lens_cmds.rs#L451)；[vp_cmds.rs:209](../../../vendor/photocraft/crates/engine/src/vp_cmds.rs#L209)；[camera_raw_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/camera_raw_ui.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供真实 Filter Gallery、场景/光圈/移轴/路径/旋转模糊图内控件，以及 RGB 摄影调节、镜头校正/广角/消失点工作区。

结果证据：移动控制点/平面和切画廊组合改变内核候选图像，最终整体一次提交；不冒称 RAW 文件解码。

## 明确边界

液化、智能滤镜栈、RAW 解码、HDR 和不能编译到 WASM 的原生执行路径继续关闭。
