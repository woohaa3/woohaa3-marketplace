# 范围与追溯

本 change 是 19 项拆分中的「填充层、高级混合与图层复合」，唯一负责 U57, U58, U59, U60, U61, U62, U63, U64。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U57

**纯色/渐变/图案填充层** · 未接包装及 UI

上游三类 Fill Layer 及参数编辑都有实现；本机当前只暴露像素层、组和六类调整层，没有这些填充层入口。现有图层样式的颜色/渐变/图案叠加不等同填充层。

依据：[commands.rs:907](../../../vendor/photocraft/crates/engine/src/commands.rs#L907)；[commands.rs:927](../../../vendor/photocraft/crates/engine/src/commands.rs#L927)；[pattern_cmds.rs:431](../../../vendor/photocraft/crates/engine/src/pattern_cmds.rs#L431)；[solid_fill_cmds.rs:76](../../../vendor/photocraft/crates/engine/src/solid_fill_cmds.rs#L76)；[pattern_fill_cmds.rs:135](../../../vendor/photocraft/crates/engine/src/pattern_fill_cmds.rs#L135)；[gradient_fill_cmds.rs:560](../../../vendor/photocraft/crates/engine/src/gradient_fill_cmds.rs#L560)；[gradient_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/gradient_ui.rs#L1)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：接纯色/渐变/图案可重编填充层及其参数、蒙版和资源快照，不能只烘成普通像素层。

结果证据：重开后仍能改填充参数，修改库项不改变已应用快照，合成/核验正确。

## U58

**图层链接、标签、剪切建层和盖印** · 未接包装及 UI

缺图层间链接/选取链接图层、图层颜色标签、排列反转、通过剪切建层、盖印可见/向下盖印以及显式背景层互转。蒙版链接、普通编组、复制、合并、锁定和重排已有，不能混为一谈。

依据：[layer_multi_cmds.rs:1478](../../../vendor/photocraft/crates/engine/src/layer_multi_cmds.rs#L1478)；[layer_multi_cmds.rs:1446](../../../vendor/photocraft/crates/engine/src/layer_multi_cmds.rs#L1446)；[layer_label_cmds.rs:67](../../../vendor/photocraft/crates/engine/src/layer_label_cmds.rs#L67)；[layer_multi_cmds.rs:1483](../../../vendor/photocraft/crates/engine/src/layer_multi_cmds.rs#L1483)；[edit_cmds.rs:1021](../../../vendor/photocraft/crates/engine/src/edit_cmds.rs#L1021)；[stamp_cmds.rs:146](../../../vendor/photocraft/crates/engine/src/stamp_cmds.rs#L146)；[stamp_cmds.rs:156](../../../vendor/photocraft/crates/engine/src/stamp_cmds.rs#L156)；[background_cmds.rs:92](../../../vendor/photocraft/crates/engine/src/background_cmds.rs#L92)；[extra_cmds.rs:870](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L870)；[layer_multi_cmds.rs:1](../../../vendor/photocraft/crates/engine/src/layer_multi_cmds.rs#L1)；[photo-editor-panels.tsx:18](../../../packages/editor/src/photo-editor-panels.tsx#L18)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供图层链接/取消链接、颜色标签、剪切/复制建层和盖印，链接移动尊重锁定规则。

结果证据：链接层协同变换，盖印保留来源，剪切建层与选区统一一步撤销。

## U59

**粘贴入/粘贴外** · 未接包装及 UI

普通、合并复制、原位和跨文档图层粘贴已有；缺 Paste Into/Paste Outside 生成或利用选区蒙版的流程。

依据：[extra_cmds.rs:834](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L834)；[extra_cmds.rs:843](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L843)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：接 Paste Into/Paste Outside 的选择区域与蒙版语义，使用现有有界剪贴板和资源重映射。

结果证据：粘贴内容与内/外蒙版正确，原剪贴板不变，撤销一次恢复进入状态。

## U60

**高级混合、Blend If 和挖空** · 未接包装及 UI

普通混合模式/不透明度/填充不透明度已存在；缺 Blend If 分离滑块、按通道混合、Knockout、内部效果/剪贴层成组混合、透明形状/蒙版隐藏效果等选项。

依据：[layer_menu_cmds.rs:951](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L951)；[advanced.rs:1](../../../vendor/photocraft/crates/doc/src/advanced.rs#L1)；[layer-style-editor.tsx:116](../../../packages/editor/src/layer-style-editor.tsx#L116)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Blend If 分离端点、按通道混合、Knockout 及内部效果/剪贴层成组和蒙版隐藏效果选项。

结果证据：分离滑块产生真实平滑过渡，组/剪贴合成按规则变化，保存重开一致。

## U61

**样式复制粘贴、样式预设和效果转换** · 未接包装及 UI

已有丰富图层样式编辑（含图案、等高线和全局光源）；缺跨层 Copy/Paste Style、样式预设管理、Scale Effects、效果转独立层/栅格化等。不能称图层样式整体未接。

依据：[extra_cmds.rs:879](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L879)；[extra_cmds.rs:886](../../../vendor/photocraft/crates/engine/src/extra_cmds.rs#L886)；[layer_menu_cmds.rs:968](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L968)；[layer_menu_cmds.rs:967](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L967)；[rasterize_style_cmds.rs:122](../../../vendor/photocraft/crates/engine/src/rasterize_style_cmds.rs#L122)；[styles.rs:334](../../../vendor/photocraft/crates/engine/src/presets/styles.rs#L334)；[preset_panels.rs:1](../../../vendor/photocraft/crates/ui-egui/src/preset_panels.rs#L1)；[layer-style-editor.tsx:116](../../../packages/editor/src/layer-style-editor.tsx#L116)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Copy/Paste Style、样式预设管理、Scale Effects、效果转层和样式栅格化，保持图案/等高线/全局光源语义。

结果证据：跨层应用后效果资源完整，转层结果可独立编辑，一步撤销恢复原样式。

## U62

**去边/去杂边和颜色净化** · 未接包装及 UI

缺 Defringe、Remove Black/White Matte、Color Decontaminate 等图层边缘处理命令。

依据：[layer_menu_cmds.rs:920](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L920)；[layer_menu_cmds.rs:921](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L921)；[layer_menu_cmds.rs:922](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L922)；[layer_menu_cmds.rs:923](../../../vendor/photocraft/crates/engine/src/layer_menu_cmds.rs#L923)；[photo-editor-menu.ts:39](../../../packages/editor/src/photo-editor-menu.ts#L39)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Defringe、Remove Black/White Matte 和 Color Decontaminate 的实际像素预览与参数。

结果证据：边缘用例实际去除对应杂边而保留主体，撤销恢复原像素。

## U63

**图层过滤的剩余入口** · 接入不完整

当前按名称/种类过滤已存在；缺 only_selected 开关、shape 类型选项，以及上游按更多属性筛选的完整面板。only_selected 本机过滤模型已支持。

依据：[layer_filter_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/layer_filter_ui.rs#L1)；[editor-tool-panels.tsx:23](../../../packages/editor/src/editor-tool-panels.tsx#L23)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：补 only_selected、shape 类型和上游已实现属性筛选，保留当前名称/类型筛选并说明组合条件。

结果证据：只改变图层列表，不改内容、选择或可见合成，过滤隐藏选中层时状态仍一致。

## U64

**图层复合** · 未接包装及 UI

缺 Layer Comps 的可见性/位置/外观快照、更新/切换/恢复和导出；操作历史与图层复合是不同功能。

依据：[comps_cmds.rs:410](../../../vendor/photocraft/crates/engine/src/comps_cmds.rs#L410)；[comps_cmds.rs:426](../../../vendor/photocraft/crates/engine/src/comps_cmds.rs#L426)；[comps_cmds.rs:418](../../../vendor/photocraft/crates/engine/src/comps_cmds.rs#L418)；[comps_cmds.rs:461](../../../vendor/photocraft/crates/engine/src/comps_cmds.rs#L461)；[comps_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/comps_ui.rs#L1)；[photo-editor-panels.tsx:18](../../../packages/editor/src/photo-editor-panels.tsx#L18)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Layer Comps 创建/更新/切换/恢复及导出，按可见性/位置/外观保存规范快照。

结果证据：切复合只恢复声明字段，缺失层给报告，复合保存重开有效并能交付快照。

## 明确边界

智能滤镜栈、外链资源、印刷色彩和未知 PSD 块继续拒绝。图层过滤不被当成内容编辑。
