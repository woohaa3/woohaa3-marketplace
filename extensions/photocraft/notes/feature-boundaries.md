# PhotoCraft 领域边界与集成约定

> **历史快照。** 本文件描述旧独立子项目的目录划分，代码已随该子项目删除；当前实现见
> [`../web`](../web/README.md)。下文 `packages/*`、`rust/crates/*` 路径只用于对照当时的边界约定。

实现基线：`bdc3c0847fa7d2ed5db82128dafcf3f47ad1bfa1`。本次只重构结构，不增加工具、格式、图层种类或开放能力。

## 领域拥有的代码

每域均已在以下四处静态装配：`packages/editor/src/features/<domain>/`、`packages/protocol/src/features/<domain>/`、`rust/crates/editor-core/src/features/<domain>/`、`rust/crates/project-verify/src/features/<domain>/`。

| 域 | 输入 → 输出 / 当前实现 |
| --- | --- |
| files | 图片/工程字节与来源 → 当前文档；文档槽位、代际与关闭结算仍归共享工作区 |
| io | 图片/PSD/工程字节、交换参数 → 检查报告、置入结果或工程/PNG/PSD/逐层包字节；逐格式读写矩阵、通用导出与 Save for Web、逐层与按名称资产交付（change: 2026-10-22-add-photocraft-raster-interchange）。宿主 `<input accept>` 的栅格清单以协议域 `OPEN_RASTER_*` 为唯一权威，「打开」与「置入」共用同一份，不各自维护 |
| vectors | 文档坐标路径/命令、目标层 → 规范几何、形状/路径操作、几何摘要与核验 |
| selections | 文档坐标、选区模式、修改参数 → 选区/蒙版、修改草稿与细化参数 |
| channels | 空贡献；不创建另一份 Alpha/Spot 资源，也不开放 UI |
| painting | 文档坐标/笔压、笔刷参数、ABR/采样字节 → 笔迹、预设库与内核预览 |
| retouch | 修饰命令、采样源与笔迹 → 同一文档上的修饰草稿与提交 |
| adjustments | 参数、采样目标与修订 → 调整草稿/规范参数/直方图与核验 |
| modes | 空贡献；当前仅 RGB/U8，不改变 wire 或解释通道 |
| filters | 已开放滤镜 id 与参数、画廊组合、模糊/摄影图内几何 → 参数 schema（唯一来源是上游命令记法）、隔离滤镜草稿、一次提交或取消 |
| composition | 裁剪/尺寸/仿射参数 → 构图与变换草稿、规范变换描述 |
| layers | 层目标、样式/图案/混合/载荷 → 图层操作、共享资源身份与样式核验 |
| smart | 源字节、目标实例、attempt → 子文档、回写/冲突结果、唯一嵌入源身份与递归核验 |
| type | 定位/排版/字体参数 → 文字草稿、排版参数、文字规范内容 |
| views | 视图辅助/吸附参数、文档点 → 工作区视图状态与吸附点；不写内容身份 |
| customization | 命令搜索（只索引已接通命令，执行走同一门禁）与本机偏好：快捷键覆盖、工具栏/菜单隐藏与顺序、工具选项记忆、命名工作区；偏好不进工程内容或历史。`shell-adapter.ts` 把偏好翻译成外壳既有形状（按键分派/菜单/工具栏/面板几何/画笔选项），共享外壳已接入并消费（`photo-editor-app.tsx` 按键分派/工具选项/工作区重排、`photo-editor-chrome.tsx` 菜单与工具栏、`FeaturePanelContext.applyPanelLayout` 端口） |
| history | 原有撤销/重做命令贡献；历史栈仍由同一 engine session 持有 |
| animation | 时间轴/视频层/逐帧编辑/帧导入/帧与 GIF 交付 → 域内预算与内容摘要、公共 `AnimationCodecPort` 负责容器编解码（change: 2026-10-22-add-photocraft-animation-workflows）；时间轴与帧栈已进入共享内容身份，四个能力 id 已发布。视频层的**显示内容只是帧栈在播放头处的投影**，共享指纹只认帧栈（未写回的编辑除外），播放头与工作区范围不进身份 |

旧文件名保留 TypeScript facade 与 Rust 模块路径兼容；实现和对应叶子测试已进入领域目录。跨域契约、保存/生命周期、内容指纹和集成交互测试保留在共享位置。

## 一次装配后的扩展方式

- `editor/features/index.ts` 聚合全部 18 域的工具、面板和菜单贡献。工具联合类型与 `EditorFeaturePanel` 从清单派生。域内 `index.ts` / `sections.tsx` 增加贡献，不改 App/Chrome 的集中枚举。
- `features/sessions.ts` 与 `features/handles.ts` 已装配全部 18 域。`controller.features.<domain>` 提供有类型领域会话，`handle.features.<domain>` 提供受控 WASM 适配。域内 `workspace.ts` / `wasm-handle.ts` 修改本域工厂；`wasm-instance.ts` 定义本域真实 glue 签名。旧公共方法继续委托，新增功能无需扩充兼容 facade。
- Rust 的每域 `tools.rs` 与 `wasm.rs` 已提前声明并编译，包括空域。它们作为 `editor::tools` / `wasm` 的子模块扩展同一 `Editor` / `WasmEditor`，不创建新的 engine、文档或历史。目录中的 `mod.rs` 声明分阶段能力与命令贡献。
- protocol 的各域 `index.ts` 声明能力；`content.ts` 持有既有规范内容类型与序列化分支。共享层按旧顺序组合，空值与缺省值保持原定义。
- verifier 的 18 个域均有检查入口；未支持域返回未处理，不会放行对象。树遍历、计数与嵌入源的解压/资源累计仍只有一份。禁止每域重新获得完整预算。

领域通过显式、具体的输入类型增加新操作。原来已存在的 JSON 兼容方法保持签名和内核校验，不能把它们当作新增任意 JSON 转发接口。

## 冻结的共享接口

| 边界 | 权威与契约 |
| --- | --- |
| 动作/工具/面板 | 稳定 id、领域工具的 `canRun` 与拒绝原因、目标矩阵、具体参数和结果；`FeaturePanelContext` 只提供只读视图及显式效果 |
| 输入仲裁 | `PhotoCanvas` 唯一拥有 pointer capture、修饰键与 IME/文本优先级；手势/笔迹分类读取域贡献。选区状态机和自动平移归 selections |
| 草稿 | 内核各域持有自己的具体草稿；前端会话通过 `WorkspaceFeatureContext` 共用活动门禁/发布。生命周期标记不是第二份文档或参数。异步操作继续受控制器代际及原有 smart/save attempt 约束；新增异步草稿使用 `FeatureOwner` / `FeatureDraft<Begin, Update, Output>` 的明确归属 |
| 目标/取景 | `DocumentCoordinatePort` 统一 `documentToView` / `viewToDocument`，Canvas 使用同一反变换；当前无旋转。`FeatureToolContext` 固定 RGB/U8、像素/蒙版，画笔支持两者，其他工具不接收蒙版编辑目标 |
| 文档/字节 | `document-workspace.ts`、`ports.ts`、`session.ts` 是既有候选注册/来源/保存/字节端口；宿主导航、原始字节交付、串行关闭仍经既有 Woohaa 适配。领域核心不接触宿主节点 id 或本机路径 |
| 规范资源 | Alpha/Spot 的未来唯一表示归 channels；路径几何归 vectors；智能对象源归 smart；图案资源归 layers。消费者不能另造同义资源 |
| 内容/核验 | 同一规范序列、空值规则和累计预算；阶段内顺序通过原有序号保留。`features:check` 对照**冻结的**重构前真实 WASM 快照与共享文件摘要，并只放行 `notes/feature-boundary-additions.json` 里逐条登记的命令/能力/共享文件哈希（登记项必须全部出现，未登记项一个都不许有）。后续 change 不得直接改写基线来自证等价 |

## 单一集成职责

并行阶段，集成会话唯一维护 App/Canvas/Chrome shell、`features/{index,sessions,handles,contracts,workspace-context,panel-context,coordinates,tool-contracts}`、公共 facade、共享内容树组合、Rust 装配/身份算法、verifier 遍历与累计预算、全局 stage/版本/limits/fixtures/锁文件、通用 primitives、Woohaa 导航/聚焦/保存适配和代码地图。功能会话只改自己的四个域目录及对应本域测试。

新增 wire 字段、能力交付版本或全局预算先由领域声明需求，再由集成会话顺序聚合；不能各分支自行更改版本或总额。跨域调用使用既有端口和规范资源。Channels 与 IO 等最终集成依赖仍按各功能 change 验收，不因静态装配而视为完成。

## 验证入口

`pnpm -C photocraft check`、`rust:test`、`wasm`、`verifier`，然后 `pnpm -C photocraft features:check`。后者真实加载构建后的 WASM，比较错误、8 组状态和 hash、撤销/重做/取消、导出摘要及 PNG 字节是否仍与重构前基线一致，并断言命令表/能力握手 = 冻结基线 + `notes/feature-boundary-additions.json` 的登记项；同时核对 limits、contract、identity 与两个锁文件只在登记处漂移。

实际 UI、并行试验、宿主检查和设备限制见 [结构验收](../openspec/changes/archive/2026-10-22-refactor-photocraft-feature-boundaries/verification.md)。原 change 未完成的真笔、Pad 实机和 Photoshop 外部应用验收保持未完成。
