# woohaa3-marketplace

Woohaa3 的**公开插件市场仓库**：存放公开扩展的源码，并以 GitHub Release 资产的形式发布
可安装的 `.wxt` 包。

客户端不自建服务器也能从这里装扩展——本机宿主自带一个 GitHub Release 市场来源
（`sourceId: github-release`），它直接读本仓库的 Release 资产。

```text
extensions/<extensionId>/          源码（extension.json + src/frontend/…）
        ↓ 打包 / 签名
<extensionId>-<version>.wxt        Release 资产
        ↓ 客户端 github-release 来源
搜索 → 版本 → 下载 → sha256 摘要复核 → 签名校验 → 受管预检 → 提交 → 装配
```

## 示例插件：`hello-marketplace`

[extensions/hello-marketplace](extensions/hello-marketplace) 是全链路 demo：装好后，画布右下角
状态气泡里会出现一条「市场 demo」读数。它足够小，只用来证明外部来源这条路是通的。

## 从本仓库安装（客户端配置）

在客户端的本机配置 `client/web/woohaa.config.yml` 里加：

```yaml
extensions:
  marketplace:
    github:
      enabled: true
      repos: woohaa3/woohaa3-marketplace
    # <keyId>=<base64 公钥>，逗号分隔；示例插件用下面这把 key
    trustedKeys: afd67694dd46ddcd=BeYbxnmO12EpA/qCrYZjfDA++dqDXXRoTMnclB46Aw=
```

- `enabled` 缺省为 `false`：没显式打开时客户端不会向 GitHub 发任何请求。
- 私有仓库或遇到限流时，把令牌放 `extensions.marketplace.github.token`（属于密钥，写
  `woohaa.secrets.yml` 或环境变量 `WOOHAA3_GITHUB_TOKEN`）。
- `trustedKeys` 是本机信任根，只能追加；示例插件的私钥不在此仓库里，**别人无法冒充发布**。
  换自备密钥重新发布时，把新的 keyId / 公钥追加进来即可。

设置改完即热重载，随后在「设置 → 插件」里搜索并安装。

## 发布一个新版本

打包工具链在客户端仓里，不在这里复制一份（在父仓根目录执行，`client` 是它的子模块）：

```bash
# 1. 打包 + 签名（--key 省略则是未签名包，市场渠道会拒绝）
node client/scripts/pack-extension.mjs marketplace/extensions/hello-marketplace \
  --key <ed25519私钥.pem> \
  --out hello-marketplace-0.1.0.wxt

# 2. 发布 Release，资产名必须是 <extensionId>-<version>.wxt
gh release create v0.1.0 hello-marketplace-0.1.0.wxt --title v0.1.0 --notes "hello-marketplace 0.1.0"
```

首次需要密钥对时：`node client/scripts/pack-extension.mjs --genkey <prefix>`
（生成 `<prefix>.key` 私钥与 `<prefix>.pub.pem`，并打印 keyId 与 base64 公钥）。

### 资产命名与来源规则

| 规则 | 说明 |
| --- | --- |
| 文件名 | `<extensionId>-<version>.wxt`，扩展名大小写敏感 |
| `extensionId` | kebab-case（`hello-marketplace`），与包内 `extension.json` / metadata 一致 |
| `version` | 核心三段 semver（`1.2.3`）；带预发布后缀的文件名无法无歧义拆分，来源会跳过 |
| 摘要 | GitHub API 需对资产返回 `digest: sha256:…`；**拿不到摘要的资产不参与安装** |
| 签名 | 市场渠道必须签名，且签名 key 在客户端信任根里；未签名包只能走 local-file 导入 |

## 目录

| 路径 | 内容 |
| --- | --- |
| `extensions/<id>/` | 扩展源码；`extension.json` 声明、`src/frontend/` 浏览器入口 |
| `.gitignore` | 构建产物（`browser-dist/`、`backend-dist/`）不入库，发布只走 Release 资产 |
