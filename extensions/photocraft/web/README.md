# PhotoCraft 常驻工作区

本包运行固定版本的官方 egui/WASM 编辑器，直接挂载真实 canvas。PhotoCraft 拥有文档、图层、撤销、工具与取景；Bevy 通过既有图片聚焦通道显示文档区 RGBA，同时由 documentView 驱动背景网格和其他节点。

## 生命周期与使用

一个应用窗口只惰性创建一个 WebRunner 和稳定 canvas。页面插件只取得可撤销 lease：返回画布、切换节点、画布或普通页面时解除输入与呈现绑定，文档留在官方会话内。再次进入相同节点只激活原文档，不重新导入或 Fit。独立文件以官方 tab 保留，使用不透明编辑器背景；同名文件也有不同身份。

顶部“应用到节点”导出源尺寸 PNG，经 `editBegin → upload → editComplete` 更新来源节点，成功后继续编辑；它不会保存工程图层。每文档、每轮应用分别保留冻结产物和请求身份，响应未知先查回执，重试使用相同尝试。新修改可在上一轮提交后再应用，r10 的回执不将 r11 标为已应用。

关闭官方标签才提示应用、下载工程或明确不保存；下载只表示浏览器开始交付，需自行确认文件实际保存。来源变化可显式重载，重载前可先下载工程；替换文件解码成功前保留旧文档。容量满时重载需要先关闭其他文档，预留安全解码空间。窗口最多 8 份文档、单个新文件解码，不自动淘汰撤销和编辑内容。

扩展停用或身份改变会撤销普通页面服务，已有文档进入仅能本地下载/关闭的恢复界面。身份改变后须先结算旧文档；停用后重新启用可接管同一 owner。最后文档关闭后释放恢复 owner。刷新、崩溃、关窗不提供恢复，也不拦截或提示（浏览器直接离开）；刷新前应下载工程。

## 呈现与输入

WASM 模块导入不启动编辑器、不修改宿主 query。`createRuntime({canvas, assetBaseUrl, onEvent})` 显式创建实例；glue、WASM 和字体从扩展资源基址解析，支持部署前缀。实例提供 open/activate/close/export/state/show/hide/input/ack/settle/dispose，所有监听与桥接 rAF 都由 disposer 管理。

新文件先 Fit，文档状态与 viewReady 就绪后，节点仍要等匹配文档/rect/documentView 的有效首帧提交到 Bevy 才显示编辑器。已有文档不重新 Fit。capture-clean 只清底板、点阵、阴影和清屏 alpha，保留官方合成、棋盘格与工具覆盖层；CSS mask 隐藏同一 canvas 的文档区，真实输入直接交给官方编辑器。

捕获长边最多 2048、交互至多30fps、空闲10fps；仅活动节点捕获，隐藏停止捕获和桥接 rAF。单帧 ack/200ms，旧代际、文档、修订、布局的在途帧被丢弃。首轮 Fit 就绪后持续传递缩放动画中间帧，每帧保留捕获时的取景；不因下一动画步已渲染而丢弃。官方 WebRunner 隐藏时停止应用逻辑/UI更新；其调度器的真实硬件空闲成本仍需 GPU 验收。Dialog、隐藏、窗口失焦和其他输入框撤销编辑输入；Esc 先由官方工具消费。每次文档激活并显示后恢复 canvas 输入焦点，已有官方 IME 焦点保持。

## 中文字体与界面语言

界面语言偏好 `interface.language` 默认 `auto`。桌面端沿用系统语言；web 没有系统语言 API，`apps/photocraft-web/src/web.rs` 在启动时把 `navigator.languages` 交给 `photocraft_ui_egui::i18n::set_system_tags`，由 `Lang::from_pref("auto")` 按浏览器偏好列表选择已注册语言（`zh-CN`/`zh-Hans`/`zh-SG` → 简体，`zh-TW`/`zh-HK`/`zh-Hant-*` → 繁体，`en-*` → 英文）。用户显式选择语言后以存储的偏好为准；浏览器语言在运行中改变需刷新页面才生效，与桌面端缓存系统语言的语义一致。

宿主字体走上游 served-fonts 通道：`app/fonts/manifest.txt` 使用 craft-fonts 格式，每行 `family | style | file | scripts | licence | licence file | sha256 | source`。当前只列 `Noto Sans SC` `Regular`（`fonts/NotoSansSC-Regular.otf`，scripts `Hans,Hant,Jpan`，OFL-1.1），一个文件覆盖简体、繁体、日文汉字与假名、希腊与西里尔，缺 Hangul。字体与 OFL 由 `build-app.sh` 从 `client/web/frontend/public/assets/fonts/` 复制进 `app/fonts/`，可用 `PHOTOCRAFT_FONT_DIR` 指向别的目录；源文件缺失时构建以明确路径失败，不会产出无字体产物。字体按需下载（中文界面首次约 8 MB，浏览器缓存后不再重复），不嵌入 WASM、不是首屏必下载资源。

字体到达后同时注册为 egui 界面的最低优先级回退（拉丁字符仍用 Inter）和文档文字引擎的脚本回退；界面语言为中文时由 `WebShell::serve_fonts` 主动请求对应 script 字体，切换语言/主题/字号导致字体栈重建后仍会重新挂载。

两个易错点：

- `egui::Context::set_fonts` 会替换整个字体栈并清空 `Context::add_font` 注册的界面回退。重建时必须在即将安装的 `FontDefinitions` 中重新加入（`served_fonts::add_ui_fonts_to`，由 `theme::install_fonts_with` 调用）；事后再 `add_font` 会被旧栈同名条目去重而失效。对应测试：`served_fonts::tests::served_chinese_font_draws_the_ui_and_survives_stack_rebuilds`。
- 字体请求不能放在隐藏门禁之后：`WebShell::serve_fonts` 在 `logic` 的可见性判断之前执行，隐藏期间也会下载并注册回退字体，首帧不等待字体（下载失败或断网时编辑器仍可用，只短暂缺字）。

## 源码

| 位置 | 职责 |
| --- | --- |
| `src/plugin.tsx` | 通用 app surface owner 与 page lease、工作区槽位、节点目标 |
| `src/workspace-session.ts` | 官方文档的来源映射、窗口会话、切换/代际、应用尝试、关闭与恢复 |
| `src/PhotoCraftOverlay.tsx` | 稳定 canvas、顶栏、首帧加载门禁、mask、关闭确认与恢复界面 |
| `src/direct-runtime.ts` / `src/app-assets/host-bridge-core.js` | 类型化直接实例端口、资源加载、捕获和输入生命周期 |
| `src/focus-session.ts` | CSS 坐标投影、纹理/背景相机提交与清理 |
| `src/write-back.ts` | PNG 实际尺寸、冻结尝试、回执对账与可撤销依赖 getter |
| `src/app-assets/fonts/` | 宿主字体清单（craft-fonts 格式），构建时复制到 `app/fonts/`；字体与 OFL 来自公开客户端 |
| `patch/` | 固定上游的完整可重放 Rust 补丁，见 [SOURCE.md](patch/SOURCE.md) |
| `app/` | 生成 WASM/glue/资源，不入库 |

## 构建与验证

在父仓根目录执行：

```sh
pnpm -C marketplace/extensions/photocraft install --ignore-scripts
pnpm -C marketplace/extensions/photocraft/web test
pnpm -C marketplace/extensions/photocraft/web typecheck
pnpm -C marketplace/extensions/photocraft build:extension
pnpm -C marketplace/extensions/photocraft/extension test
```

默认固定源码缓存与专用 wasm-bindgen 位于 `marketplace/extensions/photocraft/.local/`。构建脚本校验固定 revision 和完整补丁 SHA，匹配时复用生成产物；`--rebuild` 强制编译。可用 `PHOTOCRAFT_SRC`、`CARGO_TARGET_DIR`、`PHOTOCRAFT_WASM_BINDGEN` 指定已经核对的源码/缓存/工具。PhotoCraft 的 wasm-bindgen 0.2.129 与 Bevy 0.2.128 隔离。

构建同时把公开客户端里的 `NotoSansSC-Regular.otf` 与 `OFL-NotoSansSC.txt` 复制到 `app/fonts/`（`client` 子模块必须存在，否则脚本以明确路径失败）；`PHOTOCRAFT_FONT_DIR` 可覆盖源目录。字体清单的唯一作者态来源是 `src/app-assets/fonts/manifest.txt`，`pnpm -C marketplace/extensions/photocraft/web test` 校验其字段、相对路径与字体 SHA-256。

重新生成：

```sh
git clone https://github.com/storytold/photocraft.git /tmp/photocraft
git -C /tmp/photocraft checkout e6d6fb45a40250f518d2e824236a8fdcaa4472c8
git -C /tmp/photocraft apply "$PWD/marketplace/extensions/photocraft/web/patch/0001-external-canvas-overlay.patch"
PHOTOCRAFT_SRC=/tmp/photocraft bash marketplace/extensions/photocraft/web/build-app.sh --rebuild
cargo test --manifest-path /tmp/photocraft/Cargo.toml -p photocraft-ui-egui overlay_workspace::tests -- --test-threads=1
```

运行时不依赖仓库源码；接入源码在 `marketplace/extensions/photocraft/extension`，预构建安装单元在 `client/extensions/photocraft`，包含 backend bundle、browser manifest、WASM、桥接、字体（清单 + 字体 + OFL）与许可证。协议和工程核验分别在相邻的 protocol/project-verifier 包内；本期应用仍只上传 PNG。

## 验证边界

非 GPU 环境（例如无 `renderD*` 的 Linux CI）可执行并必须执行：

```sh
pnpm -C marketplace/extensions/photocraft/web test
pnpm -C marketplace/extensions/photocraft/web typecheck
pnpm -C marketplace/extensions/photocraft/extension test
cargo test --manifest-path <固定源码>/Cargo.toml -p photocraft-text served
cargo test --manifest-path <固定源码>/Cargo.toml -p photocraft-ui-egui served_fonts
cargo test --manifest-path <固定源码>/Cargo.toml -p photocraft-ui-egui injected
cargo test --manifest-path <固定源码>/Cargo.toml -p photocraft-engine refreshing_type_layers_takes_no_history_step
```

真实设备（带 GPU）待人工验证，本环境不采集、不用软件渲染冒充：中文浏览器首开为中文界面与对话框、手动切换英文再切回、含中文文字图层的文档可编辑、字体请求 404 时仍可编辑、字体到达后不重复写回或产生脏标记、真实输入/IME、透明混合、网格跟随、三浏览器与电脑/Pad 性能。未完成的项在验证记录中如实标注为待人工验证。
