# 补齐 PhotoCraft Web UI 编辑能力

## Why

PhotoCraft 已有独立 pnpm/Cargo workspace、React 编辑器、WASM 内核和独立开发宿主，但当前页面只开放上游的一部分能力。可核对的差距包括：

- `rust/crates/editor-core/src/capability.rs` 和 `packages/protocol/src/image-project-editor.ts` 仍明确关闭 PSD、智能对象、ABR、魔棒、修复、仿制、通道曲线与矢量路径。
- `packages/editor/src/photo-editor-tools.ts` 的圆形笔刷已有尺寸、硬度、不透明度、流量和平滑，间距仍固定；没有完整预设库、笔尖设置或压感控制面板。已传递压力采样不代表真实数位笔手感已验收。
- `rust/crates/editor-core/src/clipboard_commands.rs` 是单实例内部剪贴板，多文档实例之间没有可移植的图层载荷。
- `rust/crates/editor-core/src/smart_source_edit.rs` 等已有嵌入源、事务及重算基础，但尚未形成可操作的 React 子文档编辑流程。
- 已有三类调整、手工选区、图层组、蒙版、混合和样式；缺少通道级调色、常用修饰、参考线吸附和完整文字／矢量工作流。
- `vendor/photocraft/docs/brush-parity.md` 说明上游有更多算法和资源解析器，但其 egui 界面及自评不能视为当前 React Web UI 的完成度。

用户要求继续完善共享编辑器本身，暂不建设独立应用外壳。本 change 将上述缺口落实为可分阶段实施和验收的编辑工作流，独立 Web UI 与 Woohaa 使用同一份核心实现。

## What Changes

- **P0 契约与基础**：逐能力扩展协议、命令门禁、WASM、内容身份和工程核验；建立真实实现／上游可复用／需补建的矩阵。
- **P1 笔刷**：预设库及笔迹预览，间距／角度／圆度，大小／不透明度／流量压感、压力曲线和平滑；随后接入受限 ABR、采样笔尖、散布、纹理、形状／颜色／传递动态及绘画混合模式。
- **P2 跨文档与素材**：共享工作区内复制图层及组、原位粘贴、复制合并；通过公共字节端口把图片置入当前工程，支持像素层或嵌入智能对象。宿主拖放只做适配。
- **P3 PSD**：实现有明确兼容矩阵的 RGB/U8 PSD 导入导出、导入前检查、损失报告与明确的副本栅格化选择。保留矩阵内的图层、组、蒙版、文字、调整与样式。
- **P4 智能对象**：转换、嵌入置入、替换内容、普通复制共享源／新建独立副本、子文档编辑和显式回写；保留父文档变换，冲突时保留子文档修改。
- **P5 调色与选区**：色阶、分通道曲线、自然饱和度、黑白、直方图；魔棒、快速选择、色彩范围、选区修改及手工边缘细化。
- **P6 修饰与滤镜**：仿制图章、修复／污点修复、模糊／锐化／涂抹、减淡／加深／海绵；首批参数滤镜为高斯模糊和 USM 锐化。
- **P7 构图、文字与矢量**：裁剪／图像和画布尺寸、平移、标尺／参考线／网格／吸附、图层过滤；文字行距／字距等排版控制，钢笔路径、基础形状及矢量蒙版。
- 所有新增功能均贯通入口、参数、实时反馈、取消、撤销、工程往返和失败恢复；使用现有界面体系，按电脑／Pad 验收。`dev/` 只补真实功能演示与必要的多文档／子文档测试装配，不升级为产品外壳。

## Capabilities

### New Capabilities

- `brush-workflow`：预设、笔尖、动态、压感、平滑、ABR 和真实笔迹反馈。
- `cross-document-editing`：跨实例图层载荷、资源迁移、图片置入与原子粘贴。
- `psd-interchange`：受限 PSD 兼容矩阵、导入导出、预检与损失报告。
- `smart-object-editing`：嵌入源、实例关系、子文档编辑、回写及冲突恢复。
- `adjustment-workflow`：新增调整层、分通道曲线及直方图。
- `selection-refinement`：像素选择、组合、选区修改及边缘细化。
- `retouch-filter-workflow`：采样修饰工具、局部笔触及参数滤镜草稿。
- `composition-type-vector`：构图辅助、裁剪尺寸、文字排版、路径／形状／矢量蒙版。

### Modified Capabilities

- `editor-workspace`：替换首期禁止置入／裁剪／平移的约束，允许经过公共端口和能力检查的素材编辑。
- `project-format`：新增内容的规范指纹、能力版本、旧工程兼容和视图／偏好边界。
- `project-verification`：新图层与资源、嵌套源、外部文件和跨文档载荷的完整预算核验。

## Non-goals

- 不建设首页、最近文件、独立应用菜单壳、账号、云存储、PWA、安装包或生产站点发布。
- 不实施原生磁盘保存／另存为、崩溃或刷新恢复；编辑能力继续使用既有文件交付端口，不把浏览器下载视为写盘成功。
- 不重做已完成的 Woohaa 文档 Tab、画布聚焦和节点保存流程；宿主只消费新增核心端口。新增宿主导航或发布协议须另立主仓 change。
- 不承诺 Photoshop 全量一致；PSB、CMYK、ICC 色彩管理、16/32 位 HDR、RAW、打印、插件与自动化仍关闭。
- 不实施外链智能对象、任意文件系统访问、智能滤镜栈、液化、AI 主体／发丝抠图、路径文字与竖排文字。
- 双重笔刷、混合器湿画、鬃毛及特殊笔尖、ABR 导出留待后续；本 change 不把这些高级项藏在“笔刷完整”承诺里。
- 不升级或修改 vendor 快照，不整体抬高现有工程／文档／工作区上限，不增加手机及无障碍专项。
- 本次交付规划文档与 ATC 空闲双会话；不启动实施、不提交 Git。

## Impact

主要修改 `packages/editor`、`packages/protocol`、`packages/project-verifier`、`rust`、`dev`、测试 fixture 与本子项目 OpenSpec。`integrations/woohaa` 及 `web/frontend` 只做新增公共能力所需的接入、能力协商和回归；不将 Woohaa 服务或 Bevy 引入核心。实施同步对应模块地图和包说明。
