# 范围与追溯

本 change 是 19 项拆分中的「绘画、笔刷动态与颜色」，唯一负责 U27, U28, U29, U30, U31, U32, U33, U34, U35, U36。审计依据为固定上游 `4e7a17cd5d5723313f459753663d0d155f047e19`，原审计基线 `a5f0d9e2` + 当时工作区；现在实现已提交为 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。以下保留审计原始描述/源码定位，实施开始时按新基线再核对。

处置原则：未另述项均计划接入；U05 的不兼容色彩/缺 feature 格式、U76 的原生 Droplet/任意脚本、U77 的无浏览器 codec 路径明确暂缓。暂缓部分仍列在本 change 的追溯和验收报告中，不从清单删去，也不能算成已完成。

同级前置：无新增同级 change 的硬依赖。另需前置结构 change；同级完成依赖无环，开发并行与最终验收分别判定。执行者无需读取未复制的审计附件才能理解本 change；本页保存了本域必要描述与来源。

## U27

**铅笔和颜色替换** · 内核已开放，UI 缺失

两条绘画命令已在本机白名单；没有工具栏入口、专用设置或画布路由。

依据：[brush_cmds.rs:1114](../../../vendor/photocraft/crates/engine/src/brush_cmds.rs#L1114)；[brush_cmds.rs:1130](../../../vendor/photocraft/crates/engine/src/brush_cmds.rs#L1130)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供铅笔和颜色替换工具及各自模式/容差/采样参数，逐工具冻结笔迹设置。

结果证据：铅笔硬边和颜色替换区域与普通软画笔有真实差异，一笔可撤销。

## U28

**渐变和油漆桶** · 未接包装及 UI

缺 Gradient/Paint Bucket 工具、拖动方向、渐变类型/色标/不透明度与油漆桶的容差/连续/采样选项；上游 paint.gradient/bucket 有实现。菜单的前/背景填充仅覆盖整层/选区填色。

依据：[paint_cmds.rs:170](../../../vendor/photocraft/crates/engine/src/paint_cmds.rs#L170)；[paint_cmds.rs:160](../../../vendor/photocraft/crates/engine/src/paint_cmds.rs#L160)；[gradient_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/gradient_ui.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供 Gradient 拖动方向、类型、色标/透明度与 Paint Bucket 的容差/连续/采样控制，区别整层前背景填充。

结果证据：渐变端点/色标作用于真实源坐标，桶填充尊重连通域、选区和采样策略。

## U29

**背景橡皮擦和魔术橡皮擦** · 未接包装及 UI

当前只有普通橡皮；上游有颜色采样式背景擦除与魔棒式区域擦除及其容差/边界选项。

依据：[eraser_cmds.rs:171](../../../vendor/photocraft/crates/engine/src/eraser_cmds.rs#L171)；[eraser_cmds.rs:161](../../../vendor/photocraft/crates/engine/src/eraser_cmds.rs#L161)；[eraser_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/eraser_ui.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供背景橡皮的采样/边界/保护颜色与魔术橡皮容差/连续等工具参数。

结果证据：背景擦除按取样色工作，魔术擦除按区域工作，保留无关前景并支持撤销。

## U30

**高级笔刷动态与混合模式** · 接入不完整

当前有基础大小/硬度/流量/不透明度、部分形状/散布/传递/平滑；缺绘画混合模式、纹理与纹理模式、颜色动态、角度/圆度动态、压力响应曲线、散布双轴/数量抖动等。buildStroke 固定 mode=normal。

依据：[brush_cmds.rs:1158](../../../vendor/photocraft/crates/engine/src/brush_cmds.rs#L1158)；[pattern_cmds.rs:441](../../../vendor/photocraft/crates/engine/src/pattern_cmds.rs#L441)；[brush.rs:1](../../../vendor/photocraft/crates/paint/src/brush.rs#L1)；[brush-panels.tsx:254](../../../packages/editor/src/brush-panels.tsx#L254)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：让绘画混合模式、纹理/模式、颜色/角度/圆度动态、压力曲线与双轴散布/数量抖动真实进入内核笔迹及预览。

结果证据：固定轨迹/seed 下预览和落笔一致，切模式改变实际像素而非只改变控件值。

## U31

**数位笔倾斜/旋转数据和大笔刷范围** · 接入不完整

设置中可选 penTilt，但当前画布样本只收 x/y/pressure，缺 tiltX/tiltY/twist 等输入链路；普通笔刷大小当前钳制至 512，上游可更大。此项是数据/工具封装缺口，未对真实数位笔做硬件效果验证。

依据：[brush.rs:1](../../../vendor/photocraft/crates/paint/src/brush.rs#L1)；[photo-editor-canvas.tsx:118](../../../packages/editor/src/photo-editor-canvas.tsx#L118)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：贯通真实 coalesced pen 的倾斜/旋转输入；在共享限额和真实性能证据下开放超过 512 的有界笔刷，鼠标/缺传感器明确回退。

结果证据：真笔记录显示 tilt/twist 到达内核并影响支持动态，大笔刷可取消/撤销且不突破文档预算。

## U32

**选区定义笔刷与笔刷分组管理** · 内核已开放，UI 缺失

已有预设选择、ABR/图片笔尖导入、保存/重命名/删除和本机库；缺 Define from Selection、移动笔刷、分组改名/排序/删除等管理入口。导入时填写分组不等于分组管理。

依据：[brush_cmds.rs:1157](../../../vendor/photocraft/crates/engine/src/brush_cmds.rs#L1157)；[brush_preset_cmds.rs:453](../../../vendor/photocraft/crates/engine/src/brush_preset_cmds.rs#L453)；[brush_preset_cmds.rs:459](../../../vendor/photocraft/crates/engine/src/brush_preset_cmds.rs#L459)；[brush_preset_cmds.rs:465](../../../vendor/photocraft/crates/engine/src/brush_preset_cmds.rs#L465)；[brush_preset_cmds.rs:471](../../../vendor/photocraft/crates/engine/src/brush_preset_cmds.rs#L471)；[brush-panels.tsx:254](../../../packages/editor/src/brush-panels.tsx#L254)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：从当前选区定义静态笔尖，提供笔刷移动组、分组改名/排序/删除及库持久化错误反馈。

结果证据：定义笔尖与所选区域一致，组管理重载保持，已冻结笔迹不受随后库删除影响。

## U33

**对称绘画** · 未接包装及 UI

缺垂直/水平/径向等对称、从路径指定对称和编辑对称轴。

依据：[symmetry_cmds.rs:189](../../../vendor/photocraft/crates/engine/src/symmetry_cmds.rs#L189)；[symmetry_cmds.rs:199](../../../vendor/photocraft/crates/engine/src/symmetry_cmds.rs#L199)；[symmetry_cmds.rs:209](../../../vendor/photocraft/crates/engine/src/symmetry_cmds.rs#L209)；[symmetry_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/symmetry_ui.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供水平/垂直/径向等对称及从路径定义/编辑对称轴，所有复制笔迹同一事务。

结果证据：旋转/缩放视图后对称仍绕源坐标轴，撤销一次移除整笔所有镜像。

## U34

**独立吸管和采样选项** · 接入不完整

Alt 临时取色已经存在；缺独立吸管入口、平均采样尺寸、当前/全部/下方图层采样策略和背景色取样交互。不能称取色完全没有实现。

依据：[sample_cmds.rs:223](../../../vendor/photocraft/crates/engine/src/sample_cmds.rs#L223)；[eyedropper_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/eyedropper_ui.rs#L1)；[photo-editor-app.tsx:163](../../../packages/editor/src/photo-editor-app.tsx#L163)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：增加独立吸管、平均采样尺寸、当前/全部/下方图层和前/背景色取样，保留 Alt 临时取色。

结果证据：实际颜色来自所选源策略而非显示缩略图，取色不改文档历史。

## U35

**颜色/色板/渐变预设面板** · 未接包装及 UI

前背景色和原生颜色控件已有；缺上游 Color/Swatches 的色板分组、导入导出、常用颜色、渐变预设和色标编辑。图层样式中的渐变编辑是现有局部能力。

依据：[swatch_cmds.rs:684](../../../vendor/photocraft/crates/engine/src/swatch_cmds.rs#L684)；[swatch_cmds.rs:788](../../../vendor/photocraft/crates/engine/src/swatch_cmds.rs#L788)；[swatch_cmds.rs:798](../../../vendor/photocraft/crates/engine/src/swatch_cmds.rs#L798)；[swatch_cmds.rs:736](../../../vendor/photocraft/crates/engine/src/swatch_cmds.rs#L736)；[gradients.rs:661](../../../vendor/photocraft/crates/engine/src/presets/gradients.rs#L661)；[preset_import_cmds.rs:225](../../../vendor/photocraft/crates/engine/src/preset_import_cmds.rs#L225)；[swatches_ui.rs:1](../../../vendor/photocraft/crates/ui-egui/src/swatches_ui.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供颜色/色板的分组、导入导出/常用色，以及共享渐变预设/色标编辑，应用后的资源与库独立。

结果证据：色板/渐变往返后数值一致，渐变可用于实际绘画和已有样式控件。

## U36

**工具预设与重置工具** · 未接包装及 UI

缺保存/选择工具预设、当前/全部工具恢复默认的菜单和工具记忆管理。

依据：[tools.rs:195](../../../vendor/photocraft/crates/engine/src/presets/tools.rs#L195)；[tools.rs:205](../../../vendor/photocraft/crates/engine/src/presets/tools.rs#L205)；[tools.rs:215](../../../vendor/photocraft/crates/engine/src/presets/tools.rs#L215)；[tool_reset.rs:1](../../../vendor/photocraft/crates/ui-egui/src/tool_reset.rs#L1)；[photo-editor-chrome.tsx:19](../../../packages/editor/src/photo-editor-chrome.tsx#L19)；[capability.rs:250](../../../rust/crates/editor-core/src/capability.rs#L250)

交付约束：提供保存/选择工具预设以及当前/全部工具恢复默认，明确重置的参数范围而不删除文档和工作区。

结果证据：切换工具恢复各自参数，重置只改变声明的偏好，不产生文档 dirty。

## 明确边界

双重笔刷、湿边/混合器、特殊鬃毛以及未经预算和真笔验收的大范围参数仍关闭。
