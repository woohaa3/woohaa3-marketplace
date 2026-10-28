# woohaa3-marketplace

Woohaa3 的插件市场仓库：存放扩展的源码，并以 GitHub Release 资产的形式发布可安装的
`.wxt` 包。

客户端不自建服务器也能从这里装扩展——本机宿主自带一个 GitHub Release 市场来源
（`sourceId: github-release`），它直接读本仓库的 Release 资产。

> 本仓库是 **private**，所以客户端必须配置访问令牌（见下文）。令牌只读 Releases，不会写任何东西。

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

它是**纯浏览器扩展**：`extension.json` 只有分发字段（`version` / `engines` / `icon`），
没有 `backend` / `hostPlugin` / `site`。后三者属于有后端入口的扩展——纯前端扩展声明
`site` 会进站点控制面 catalog，却没有可激活的东西，面板会一直显示「正在应用…」。
浏览器本地扩展靠用户自己的插件开关启停。

## 完整工作区示例：`photocraft`

[extensions/photocraft](extensions/photocraft) 是**多包工作区**：`extension/` 是可加载扩展包
（`extension.json` + `src/frontend/` + 后端工厂），`web/`、`protocol/`、`project-verifier/` 是它的
编辑器与核验依赖。它演示另一条链路——宿主在**开发者模式**下直接指向源码目录，作者侧增量重建，
产物变化即重载扩展实例，不经过 Release、签名与受管安装：

```sh
# 依赖与首次构建（client 与 marketplace 同级；父仓里它们是两个子模块）
pnpm -C marketplace/extensions/photocraft install --ignore-scripts
pnpm -C marketplace/extensions/photocraft build:extension

# 作者侧 watch + 宿主登记
node client/web/scripts/build-extension-browser.mjs \
  --cwd marketplace/extensions/photocraft/extension --watch
pnpm dev --dev-source marketplace/extensions/photocraft/extension
```

前端产物变化会重装该扩展实例（不刷新页面、不重开画布）；后端仍受 `hostPlugin` 热切换范围限制，
细节与边界见 [extensions/photocraft/extension/README.md](extensions/photocraft/extension/README.md)。

## 从本仓库安装（客户端配置）

**令牌**（private 仓库必需）：Fine-grained PAT，Resource owner 选 org，Repository access 只勾
本仓库，Repository permissions 只开 **Contents: Read-only**（Metadata 会自动带上）。其余权限一律
不需要。token 写进密钥文件（不能写普通配置文件）：

```yaml
# client/web/woohaa.secrets.yml
extensions:
  marketplace:
    github:
      token: github_pat_xxx
```

`WOOHAA3_GITHUB_TOKEN` 环境变量可替代这一项。

**其余配置**在 `client/web/woohaa.config.yml`：

```yaml
extensions:
  marketplace:
    github:
      enabled: true
      repos: woohaa3/woohaa3-marketplace
    # <keyId>=<base64 公钥>，逗号分隔；示例插件用下面这把 key
    trustedKeys: afd67694dd46ddcd=BeYbxnmO12EpA/qCrYZjXfDA++dqDXXRoTMnclB46Aw=
```

- `enabled` 缺省为 `false`：没显式打开时客户端不会向 GitHub 发任何请求。
- `trustedKeys` 是本机信任根，只能追加；示例插件的私钥不在此仓库里，**别人无法冒充发布**。
  换自备密钥重新发布时，把新的 keyId / 公钥追加进来即可。

设置改完即热重载，随后在「设置 → 插件」里搜索并安装。

## 市场目录：`catalog.json`

Release 资产只带得出 `extensionId`、版本与摘要；客户端卡片上的人可读名称、描述、图标来自
仓库根目录的 `catalog.json`（可选）。缺失、无权限或形状不对时，客户端退回
`owner/repo@tag` 与 Release 标题，不影响搜索与安装：

```json
{
  "schemaVersion": 1,
  "extensions": {
    "photocraft": {
      "name": "PhotoCraft 图片编辑",
      "description": "图片编辑、工程格式核验与 PNG 写回。",
      "icon": "media",
      "hotReload": true
    }
  }
}
```

- `name` / `description` / `icon` 只用于市场展示；安装、摘要与签名校验都不读这里。
- `icon` 取客户端语义图标名（`media` / `provider` / `generation` / `prompt` …）或
  `/plugin-icons/` 下的品牌图形路径；未知值回退通用插件图标。
- `hotReload` 声明安装后是否无需重启；缺省时界面不显示该标签（不猜测）。
- 新增扩展时补一条；目录与 Release 的版本无关，改目录不需要重新发布 `.wxt`。

## 发布一个新版本

打包工具链在客户端仓里，不在这里复制一份（在父仓根目录执行，`client` 是它的子模块）：

```bash
# 1. 打包 + 签名（--key 省略则是未签名包，市场渠道会拒绝）
node client/scripts/pack-extension.mjs marketplace/extensions/hello-marketplace \
  --key <ed25519私钥.pem> \
  --out hello-marketplace-0.2.0.wxt

# 2. 发布 Release，资产名必须是 <extensionId>-<version>.wxt
gh release create v0.2.0 hello-marketplace-0.2.0.wxt --title v0.2.0 --notes "hello-marketplace 0.2.0"
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
| 私有仓库 | 带令牌时下载走资产 API（`Accept: application/octet-stream`）；网页直链对 private 仓库带令牌只会 404，客户端需包含该支持 |

## 目录

| 路径 | 内容 |
| --- | --- |
| `catalog.json` | 市场目录：名称、描述、图标、`hotReload`（只影响展示） |
| `extensions/<id>/` | 扩展源码；`extension.json` 声明、`src/frontend/` 浏览器入口 |
| `extensions/<id>/`（多包） | 复杂扩展可自带 `pnpm-workspace.yaml`；此时可加载包放在 `extension/`，其余包是它的构建依赖（见 `photocraft`） |
| `.gitignore` | 构建产物（`browser-dist/`、`backend-dist/`）不入库，发布只走 Release 资产 |
