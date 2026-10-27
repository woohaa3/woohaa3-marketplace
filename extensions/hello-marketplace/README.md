# hello-marketplace（市场示例插件）

演示一个**外部 GitHub 仓库里的插件**如何被客户端市场装上：

```text
本仓库 extensions/hello-marketplace/  →  pnpm pack:extension  →  <id>-<version>.wxt
        →  GitHub Release 资产  →  客户端 github-release 市场来源  →  摘要 + 签名校验  →  受管安装
```

它只有浏览器侧实现：在画布右下角状态气泡里显示「市场 demo」。装上后能看到这条读数，
就说明外部来源、包格式、签名信任与装配这几段是通的。

## 声明形态

本扩展**只有浏览器侧**，因此 `extension.json` 里没有 `backend` / `hostPlugin` / `metadata`
这些后端字段，只有分发字段：

| 字段 | 作用 |
| --- | --- |
| `version` | 分发版本。受管预检要求它**存在**且与 `package.json` 一致，否则拒绝安装 |
| `engines` | 兼容的宿主 ABI（`hostAbi` / `sdkAbi`）与协议版本；受管预检要求它**存在** |
| `icon.glyph` | 设置页与插件面板的图标；纯前端扩展没有 `site` 段可挂图标，用语义名 |

浏览器身份在 [src/frontend/metadata.ts](src/frontend/metadata.ts)：`activation` 与
`configScope` 都是 `browser-local`。

**为什么不声明 `site`**：`site` 是站点控制面的目录条目，只有在后端有可激活入口的扩展才该有
（否则面板状态会永远停在「正在应用…」，因为服务端没有可激活的东西）。浏览器本地扩展靠用户
自己的插件开关启停，不经过站点控制面。

## 本地构建

构建要用客户端的打包脚本（工具链在 client 仓里，不在这里复制一份）：

```bash
# 在父仓根目录（client 是它的子模块）
node client/scripts/pack-extension.mjs marketplace/extensions/hello-marketplace \
  --key <ed25519私钥.pem> \
  --out /tmp/hello-marketplace-0.2.0.wxt
```

`--key` 可省略，那样产物未签名；**未签名包只能经 local-file 来源安装**，市场渠道一律拒绝。
首次需要密钥对时用 `node client/scripts/pack-extension.mjs --genkey <prefix>` 生成。

只想重新生成浏览器产物（不打包）时：

```bash
node client/web/scripts/build-extension-browser.mjs --cwd marketplace/extensions/hello-marketplace
```
