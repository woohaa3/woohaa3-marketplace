# hello-marketplace（市场示例插件）

演示一个**外部 GitHub 仓库里的插件**如何被客户端市场装上：

```text
本仓库 extensions/hello-marketplace/  →  pnpm pack:extension  →  <id>-<version>.wxt
        →  GitHub Release 资产  →  客户端 github-release 市场来源  →  摘要 + 签名校验  →  受管安装
```

它只有浏览器侧实现：在画布右下角状态气泡里显示「市场 demo」。装上后能看到这条读数，
就说明外部来源、包格式、签名信任与装配这几段是通的。

## 本地构建

构建要用客户端的打包脚本（工具链在 client 仓里，不在这里复制一份）：

```bash
# 在父仓根目录（client 是它的子模块）
node client/scripts/pack-extension.mjs marketplace/extensions/hello-marketplace \
  --key <ed25519私钥.pem> \
  --out /tmp/hello-marketplace-0.1.0.wxt
```

`--key` 可省略，那样产物未签名；**未签名包只能经 local-file 来源安装**，市场渠道一律拒绝。
首次需要密钥对时用 `node client/scripts/pack-extension.mjs --genkey <prefix>` 生成。
