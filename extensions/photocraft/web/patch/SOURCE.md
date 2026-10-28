# 固定上游来源

- 仓库：https://github.com/storytold/photocraft
- 版本：0.15.0
- 提交：`e6d6fb45a40250f518d2e824236a8fdcaa4472c8`
- 许可证：上游提供 MIT / Apache-2.0；原文保留在本目录，并随生成的运行产物复制到 `app/LICENSE-MIT` 与 `app/LICENSE-APACHE`，本 change 不改变项目许可。
- 工具链：客户端固定 Rust 1.97.1（`client/rust-toolchain.toml`），wasm32-unknown-unknown、wasm-bindgen-cli 0.2.129（发布时 `--remove-name-section`）；依赖由该提交 Cargo.lock 固定。独立临时源码的接缝逻辑测试另在 stable 1.98.1 通过。

`0001-external-canvas-overlay.patch` 是相对此提交的完整补丁，包含新增 Rust 文件，无须另外复制 patch/files。`files/` 保留 overlay 模块与测试的便于阅读副本，与补丁内新增文件一致。构建脚本按补丁字节计算 SHA-256 写入 `app/source.sha256`（当前补丁 `fa1ad636a4af0cec184d48d26d5577f7589bec20271e9c1700cd1c3d8047654a`）；补丁变化会自动使旧产物失效，不需要手改常量。

接缝仍支持 host 提供 RGBA / transparent；聚焦编辑新增 capture-clean（不接管合成）、logic 请求处理和 UI 状态快照、Fit 与源分辨率 PNG 导出。WebShell 显式委托 clear_color；只改内部 PhotocraftApp 的 clear_color 不会影响外层 WebRunner，无法获得透明捕获底板。

## 中文本地化补丁

本 change 在同一补丁中增加四处源码改动，不新增第二份补丁：

- `apps/photocraft-web/src/web.rs`：启动时 `i18n::set_system_tags(browser_languages())`，让 `interface.language = auto` 在 web 跟随浏览器语言（桌面端仍是 sys-locale）；`WebShell::serve_fonts` 按 `i18n::current().code()` 主动请求 script 回退字体，在隐藏门禁之前运行，并把到达的 script 回退字体先注册为界面回退再交给文档引擎。
- `crates/ui-egui/src/i18n/system.rs`：`set_system_tags` 一次性注入平台语言列表；空列表、不可读或不支持的语言回落英文，显式语言优先。
- `crates/ui-egui/src/cjk_fonts.rs`：界面回退注册入口可接收运行时字体字节，复用既有基线对齐、字重轴与字号缩放；另提供把回退加入即将安装的 `FontDefinitions` 的路径。
- `crates/ui-egui/src/served_fonts.rs` / `theme.rs`：保存已到货的 script 回退字体，并在 `set_fonts` 重建字体栈时重新挂载（`add_font` 在旧栈同名时会被去重，因此重建必须写入新定义）。

字体资产不在上游补丁内：`NotoSansSC-Regular.otf` 与 `OFL-NotoSansSC.txt` 来自本仓公开客户端 `client/web/frontend/public/assets/fonts/`（Noto Sans SC，OFL-1.1），由 `build-app.sh` 复制到 `app/fonts/`，清单作者态来源是 `marketplace/extensions/photocraft/web/src/app-assets/fonts/manifest.txt`。字体不嵌入 WASM。

重编命令（固定源码缓存已应用当前补丁时）：

```sh
PHOTOCRAFT_SRC="$PWD/marketplace/extensions/photocraft/.local/photocraft-source/work" \
  bash marketplace/extensions/photocraft/web/build-app.sh --rebuild
```

重新克隆固定提交、应用补丁并重编的完整命令见上级 [README.md](../README.md)。产物更新后 `app/source.sha256` 应等于上面的补丁 SHA-256；`app/fonts/manifest.txt` 的 SHA-256 字段应等于 `sha256sum client/web/frontend/public/assets/fonts/NotoSansSC-Regular.otf`。

重新构建与测试命令见上级 README。编译产物来自固定源码加此补丁，不手写 JS glue、不替换上游工具或合成器。导出长边参数保留接口兼容，当前导出始终保持源尺寸，0 表示无限制。

常驻工作区补丁额外包含显式 WebRunner 生命周期、可回收 pen/drag/unload 监听、资源基址、官方文档操作与隐藏/输入门禁。`runtime.rs` 使用 WebRunner 的 app_mut 接口，不通过合成拖放打开文件；`overlay_workspace.rs` 供 WASM 与非渲染回归共用。官方 tab 的激活/关闭先通知扩展结算/绑定，再调用原会话；不是另一份文档树。隐藏门禁只拦绘制：`overlay::remember_ctx` 在 `logic`/`ui` 门禁之前记下 egui 上下文，否则宿主在 eframe 首帧之前隐藏运行时会让 `wake()` 失去重绘目标，首次显示必须等外部 resize。
