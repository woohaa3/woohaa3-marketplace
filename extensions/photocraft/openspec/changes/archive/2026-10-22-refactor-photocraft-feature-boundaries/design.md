# 代码边界与并行协议

## 当前集中点

基线 `bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。实际集中点包括：

`packages/editor/src/photo-editor-app.tsx`、`photo-editor-canvas.tsx`、`photo-editor-chrome.tsx`、`photo-editor-tools.ts`、`editor-tool-panels.tsx`、`editor-workspace.ts`、`editor-wasm.ts`；`packages/protocol/src/image-project-content.ts` / `image-project-editor.ts`；`rust/crates/editor-core/src/editor.rs` / `editor/tools.rs` / `wasm.rs` / `capability.rs` / `document_content.rs` / `identity.rs`；`rust/crates/project-verify/src/lib.rs` / limits 和共享 fixture；通用 UI primitives、视图坐标实现、宿主聚焦/导航和保存适配。

`editor/tools.rs` 同时实现调色、选区、修饰、滤镜、构图、文字和矢量入口；`editor-tool-panels.tsx` 也混合这些域。当前 `EditorToolId` 和工具/画布分支是集中联合类型，直接新增 18 个工作分支会多点冲突。

## D1 一次建立域目录和装配

每个域建立 `packages/editor/src/features/<domain>/`、`packages/protocol/src/features/<domain>/`、`rust/crates/editor-core/src/features/<domain>/`、`rust/crates/project-verify/src/features/<domain>/` 和对应测试目录。迁移已有域实现及就近测试；集中文件保留 facade 和统一生命周期，不反向 import Woohaa 私有实现。

| 域名 | 唯一功能 owner | 审计范围 |
| --- | --- | --- |
| `files` | 文档创建、来源与关闭结算 | U01, U02, U03, U04 |
| `io` | 栅格格式与导出交付 | U05, U06, U07 |
| `vectors` | 形状与路径画布工具 | U08, U09, U10, U11, U12, U13, U14, U15, U16 |
| `selections` | 选区与蒙版完整交互 | U17, U18, U19, U20, U21, U22, U23, U24 |
| `channels` | 通道与通道计算 | U25, U26 |
| `painting` | 绘画、笔刷动态与颜色 | U27, U28, U29, U30, U31, U32, U33, U34, U35, U36 |
| `retouch` | 修饰工具与仿制源 | U37, U38, U39 |
| `adjustments` | 直接调整与调整图层 | U40, U41, U42, U43, U44 |
| `modes` | 图像模式与调色板 | U45 |
| `filters` | 滤镜参数、画廊与摄影滤镜 | U46, U47, U48, U49 |
| `composition` | 裁剪、变换与画板切片 | U50, U51, U52, U53, U54, U55, U56 |
| `layers` | 填充层、高级混合与图层复合 | U57, U58, U59, U60, U61, U62, U63, U64 |
| `smart` | 智能对象子文档与还原图层 | U65, U66 |
| `type` | 精确文字排版与文字工具 | U67, U68, U69 |
| `views` | 视图导航、参考线与分析辅助 | U70, U71, U72, U73 |
| `customization` | 命令搜索与工作区定制 | U78 |
| `history` | 历史快照、动作与数据驱动编辑 | U74, U75, U76 |
| `animation` | 时间轴与浏览器视频工作流 | U77 |

所有域在本 change 一次加入静态装配索引。尚无实现的域导出稳定空贡献/不支持描述，不显示空面板/占位工具/菜单，不开放写命令；已有功能按原 capability 和输出原样装配。每域自己的 manifest 之后增加工具/面板/命令，不再编辑共享 switch/import/index。TS 工具联合类型/端口通过已装配的域类型组合；Rust 分域 impl 复用同一个 Editor/WasmEditor，不引入第二个内核实例。

## D2 必须冻结的接口

- 动作/工具/面板：稳定 id、能力依赖、canRun/disabledReason、输入事件和 typed 结果。共用手势仲裁拥有 pointer capture/修饰键/输入法优先级，各域只处理被授予的文档坐标事件，不能并发抢同一笔。
- 草稿：稳定 owner/target/attempt，begin/update/commit/cancel 与现有保存/导航门禁；域持有自己的有类型草稿，统一管线只做事务/发布，不解释各域参数。
- 目标与取景：统一可逆 documentToView/viewToDocument 和每工具支持目标/模式矩阵，先包装现有像素/蒙版/无旋转行为。未来通道、旋转或模式由对应域实现，其他工具使用同一接口，未知目标默认拒绝。
- 文档/字节/交付：候选实例注册、来源与保存回执、关闭串行结算、字节读取/下载/codec 支持探测；域不接触宿主节点 id 或原生路径。注册空闲名额和代际由唯一工作区拥有。
- 内容/身份/核验：分域有类型贡献、规范序列/空值兼容、能力要求、资源引用和共享累计预算。无类型 JSON 透传或给每域重新发全额预算均禁止。底层同一 channel/path/嵌入源只能有一个资源表示，消费者通过端口读取。

上述是代码拆分契约，不在本 change 激活新的通道/模式/视频数据或改变工程 wire/hash。先把现有分支搬入域模块并证明输出等价；未来字段由各功能域显式增加其 typed 贡献并按现有运行时协商规则发布。全局能力/版本需要变化时由集成负责人一次聚合，不让多个分支各自加版本号。

## D3 共享文件单一写入

上列集中文件、通用 primitives、宿主导航/聚焦/保存、全局预算/版本/fixture/锁文件和主地图，在并行阶段由唯一集成负责人维护。功能域新增字段/能力/预算在本域声明和 fixture 中提交，集成负责人顺序聚合并执行跨域验证；不以允许每域修改总表的方式假装无冲突。

目录中同名 `manifest.ts`/Rust 贡献入口和 session 类型在本 change 就固定，后续增字段无需修改别域文件。不要为减少文本冲突引入全局 mutable service locator、绕过原命令门或另外一份文档/历史。

## D4 启动和完成依赖不同

本 change 是所有功能开发的共同启动硬前置。完成后可并行实施 18 个域；选区的 Alpha/Quick Mask 集成与图像模式的通道解释最终依赖 Channels；历史/前台批处理依赖文档创建/文件交付，动画媒体交付依赖静态交付端口实现。其余域按固定接口独立实施，交叉目标/视图/格式在双方交付后验收。

并行开发可使用受控端口替身，但最终任务完成必须使用真实提供方，不得把尚未接入的数据源写为已完成。中途出现共享接口需求先提交集成负责人顺序调整，再同步所有未合入分支。

## D5 通过门槛

只改变路径/装配/责任，不改变可见功能、文档 hash、命令参数、错误、撤销、保存或 GPU 呈现。现有 editor/protocol/verifier/adapter 全量相关回归、真实 WASM/原生核验构建及代表性 UI 操作应等价通过。用两个不同域的最小独立修改在试验分支合并，确认业务文件不相交且共享装配不需要再次修改；试验不增加产品能力。

源码路径和状态归属变化后同步模块地图、公共 README 并运行 codemap/boundary。电脑/Pad 正常窗口；不扩手机/无障碍。重构验证不替代原 change 未完成的真笔/Photoshop 验收。

## 实施对应

前端贡献文件使用各域 `index.ts` / `sections.tsx` / `workspace.ts` / `wasm-instance.ts` /
`wasm-handle.ts`；Rust 使用 `mod.rs` / `tools.rs` / `wasm.rs`，`type` 的 Rust 模块声明为
`r#type`。共享装配均已提前包含全部 18 域。接口和实际输入/输出见
[领域边界](../../../notes/feature-boundaries.md)。
