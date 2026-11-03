# canvas-note（画布备注）

教程用的示例插件，放在本仓库是因为市场扩展和这份源码一起开源。它同时有 client 和 host：

- **client** 在画布工具栏放一枚按钮。点一下，向宿主要当前备注。
- **host** 把备注文案放在配置里，并注册相对路由 `note`。

页面不保存这份文案。按钮只负责显示和去取。

## 结构

```text
extension.json          身份，以及 hostPlugin 工厂
src/frontend/
  metadata.ts           浏览器产物里的描述（扫描不读它）
  plugin.ts             defineExtensionPlugin，登记工具栏按钮
  remote.ts             fetch /api/extensions/canvas-note/note
  index.ts              descriptor，plugin() 是无副作用工厂
src/backend/index.ts    createCanvasNotePlugin，apply 里读配置并注册路由
```

`extensionId` 以 `extension.json` 为准。有 host，所以前端 `activation` 是 `server-active`：宿主报告已激活才装配。`site` 让它出现在插件面板。

`webServer` 声明为可选。没有它时插件仍然加载，只是不提供这条 HTTP。

## 本地跑

开发用 dev 模式。宿主登记这个目录，加载的是旁边构建出来的 `browser-dist/` 和 `backend-dist/`，不直接跑 `src/`。装到别人机器上时，装的也是这两份产物。

工具链在 client 仓。父仓里 `client` 与 `marketplace` 是同级子模块。在**客户端仓库根目录**：

```sh
node web/scripts/build-extension-browser.mjs --cwd ../marketplace/extensions/canvas-note --watch
node web/scripts/build-extension-backend.mjs --cwd ../marketplace/extensions/canvas-note --watch
pnpm dev --dev-source ../marketplace/extensions/canvas-note
```

打开画布，工具栏上出现「备注」。点一下，文案换成宿主返回的那句。只做类型检查时，先在本目录执行一次 `pnpm install`。
