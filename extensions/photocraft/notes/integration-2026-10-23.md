# 18 域集成核验（2026-10-23）

> **历史快照。** 记录的是旧独立子项目那 18 个功能域的合并结果，代码已在 client `64765113` 删除；
> 当前实现见 [`../web`](../web/README.md)。

18 个 change 的现有实现已汇入主工作区 `photocraft` 分支；没有提交、推送或归档。
这次完成的是代码集成与可执行的自动化核验，不代表全部产品验收完成。

## 来源与可恢复性

- 共同基线：`b0cd6cbc37aba4d36ae28b29cfebee7eba5d6b06`；18 个来源 worktree 均基于此 HEAD。
- 合并前按文件保存来源、SHA256、共同基线和目标原文件；快照位置：
  `/data/tmp/photocraft-integration-20261023/manifest.json`，对应 `sources/`、`base/`、`original/`。
- 785 个来源路径，其中 64 个由多个 change 修改；保留来源 worktree，未修改其内容。
- 主工作区原有 `web/frontend/src/image-editor-wasm/` 未跟踪文件保留；宿主的新内核副本在
  `web/frontend/src/photocraft-wasm/`，来自子项目正式 WASM 构建。
- vendor 固定快照未改动。OpenSpec 未归档，前置 change 未验收记录保留。

## 共享接缝的修复

- 合并单画布与并排画布的全部指针接线：绘画、快速蒙版、选区布防取样、矢量与修饰区域手势、参考线、叠加层。
- 画布选区单击在取消选区前消费域内待命；吸管与仿制取样各走其域语义。
- 外壳装配 18 域、32 个唯一 section 和全部新工具；定制工具栏保持出厂顺序，矩形 `U` 和重复滤镜 `Mod+Alt+F` 与快捷键表一致。
- 文件域经 io 公共预设端口读取、保存、删除预设，预设参数由 io 校验并回灌导出面板；未引入第二套设置规则。
- 宿主同时绑定动画 codec、文档请求序号及各域门禁。dev 新建槽位等待真实加载回执，失败不冒充成功。
- 合并文档内容的所有增量贡献；Rust/TS 对模式与文字样式的顺序已统一。
  `tests/fixtures/integrated-content.json` 同时覆盖图案、通道、模式、文字样式、路径、动画与变量。
- 两份重构基线保持原字节；443 个命令、99 个能力和必要共享文件变动在
  `feature-boundary-additions.json` 显式登记。旧状态/身份/导出不通过重写基线来“修绿”。

## 已执行检查

原始日志均在 `/data/tmp/photocraft-integration-20261023/`；以下为这次集成分支实际结果。

| 检查 | 结果 | 日志 |
| --- | --- | --- |
| PhotoCraft 协议/editor/verifier/dev 类型检查 | 通过 | `typecheck-final2.log` |
| Rust workspace 全套 | 932 项通过；另新增跨域身份用例通过 | `rust-tests2.log`、`combined-identity.log` |
| 协议 | 230 项通过 | `protocol-tests2.log` |
| React 编辑器 | 1,702 项通过、1 项跳过（旋转视图宿主端口尚未完成） | `editor-tests-final.log` |
| 新增 U 快捷键与受影响定制/预设/装配回归 | 135 项通过 | `final-targeted.log` |
| Node 工程核验包 | 47 项通过 | `check.log` |
| Woohaa 适配器类型检查 / 交互回归 | 通过 / 350 项通过 | `woohaa-types-final.log`、`woohaa-tests-final.log` |
| 独立 dev | 24 项通过；Vite 生产构建通过 | `dev-tests.log`、`dev-build-final.log` |
| 宿主 frontend/contracts/media-service 类型检查 | 通过 | `host-types.log` |
| contracts / media-service 单元回归 | 1,311 / 79 项通过 | `host-tests.log` |
| 动画、历史、修饰真实 WASM 工作流与原生核验 | 18 项通过 | `wasm-node-tests2.log` |
| 绘画 WASM 套件 | 14/14 个用例文件通过 | `wasm-painting.log` |
| 通道、文件、模式及文字跨域/工程兼容脚本 | 8/8 个脚本通过 | `wasm-scripts-results.json` |
| 冻结基线对账 | 旧 8 组状态/内容、撤销/重做/取消、导出字节一致 | `features-final.log` |
| 正式 WASM 构建与宿主同步 | 通过；优化内核约 18.27 MiB | `wasm-release.log` |
| 原生 verifier 构建 | 通过 | `verifier-build.log` |
| OpenSpec strict | 18/18 通过 | `openspec.log` |
| 代码地图 / 开闭源边界 | 通过 / 6 项通过 | `codemap.log`、`boundary.log` |

WASM/协议/文件字节回归仅证明可重复的逻辑和格式结果，不是硬件视觉或性能验收。
本次环境为 Linux 容器，按平台探测没有 `renderD*` GPU 渲染节点，且没有显示会话；
未采集真实 GPU 计时、帧率、视觉截图、数位笔或 Pad/Photoshop/真实视频 codec 互操作结论。
现有 React 测试有 `act` 提示，Vite 有大 chunk 提示，Rust 有可见性/穷尽分支提示；检查退出成功，提示未视为产品通过证据。

## 尚未完成

- **视图 2.3**：Rotate View/复位与真实画面旋转、落笔/命中坐标联动仍缺实现；已有 Navigator/并排不能代替它。
- **矢量 3.2b**：专门的形状/路径 PSD 往返矩阵仍未完成。已有文字/绘画 PSD 自动化不代替此矩阵或外部 Photoshop 可编辑验收。
- **文件 2.4**：预设接缝本次已集成并自动化验证；整项包含最近文件及 EXIF/XMP/版权跨格式损失的验收，仍保留未勾选。
- **绘画 2.5**：coalesced pen/倾斜/旋转与大笔刷真实硬件证据未采集。
- 各域 4.2/4.3 与仍含 UI/像素验收的 5.2 保持未勾选。当前已同分支、可执行的联合回归不等于真实窗口人工主线已验收。
- 部分 1.1 的旧 change 同名 capability 归档前置仍开放；旧 change 自身尚有真机待验收，不在此次集成中强行归档。

## tasks 账面

仅勾选已复核的依赖/共享接缝项：文件与模式 1.3，通道/文件/历史 5.1，定制 4.6。
其余任务沿用来源声明，本表不是对来源所有历史勾选的重新认证。

| Change | 已勾选 | 未勾选 |
| --- | ---: | ---: |
| add-photocraft-adjustment-workflows | 13 | 4 |
| add-photocraft-animation-workflows | 12 | 3 |
| add-photocraft-channel-workflows | 13 | 3 |
| add-photocraft-composition-workflows | 18 | 2 |
| add-photocraft-file-workflows | 15 | 3 |
| add-photocraft-filter-workflows | 16 | 2 |
| add-photocraft-history-automation-workflows | 15 | 2 |
| add-photocraft-image-mode-workflows | 13 | 2 |
| add-photocraft-layer-workflows | 19 | 3 |
| add-photocraft-painting-color-workflows | 22 | 2 |
| add-photocraft-raster-interchange | 18 | 0 |
| add-photocraft-retouch-workflows | 16 | 1 |
| add-photocraft-selection-mask-workflows | 21 | 2 |
| add-photocraft-typography-workflows | 15 | 2 |
| add-photocraft-vector-canvas-tools | 20 | 4 |
| add-photocraft-view-workspace-workflows | 16 | 2 |
| add-photocraft-workspace-customization | 17 | 1 |
| complete-photocraft-smart-object-workflows | 13 | 3 |
| **合计** | **292** | **41** |
