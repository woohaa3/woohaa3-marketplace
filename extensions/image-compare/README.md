# image-compare（图片对比）

在画布空白处右键，「在此处新建」的**创作工具**区多一项「新建对比」。

1. 新建对比节点。
2. 把两张图片节点依次连线到它上面：先连的是 A，后连的是 B。
3. 选中对比节点，节点操作条出现「对比」，点它。
4. 差异图写回这个节点本身：差异图（B 压暗为底，超过阈值的像素涂红、差异区域加黄框，保持原分辨率；A、B 已连在画布上，不再重复画出），**结论画在图片下方**，
   不再另开文字节点。结论全文同时存在 `nodeData.imageCompare.conclusion`。再点一次「对比」直接更新这个节点。

对比节点不是模型任务的产物，带 `suppressModelPanel`，选中时**不会打开模型生成面板**。

连线数量不对（不是恰好两张图片）、输入还没有产物、尺寸不一致时：操作条上的「对比」置灰并说明原因，
或者把失败原因画在节点里（同样不另开节点）。

纯浏览器扩展：没有 host、没有后端路由，只用画布命令和 Media 上传。

## 为什么对比节点是一个 `image` 节点

画布不接受扩展自己的节点类型：未知类型读取时会被规范化成 `custom`，nodeData 也会被丢掉。
所以对比节点是普通 `image` 节点，另带 `suppressModelPanel: true`（宿主的中性标记，需要宿主含该改动），用 `nodeData.imageCompare = { schemaVersion: 1, conclusion? }` 作身份标记；
差异图就是它的 `outputAssetId`，下游照常把它当图片用。

## 比对规则

- 同一位置 RGBA 四个通道里**最大的差值**大于阈值（默认 25）就算变了。
- **不模糊、不做形态学去噪**。预处理会把真实的小差异一起抹掉；压缩噪点交给阈值。
- 报告同时给出 `> 0 / 10 / 25 / 50` 四档的差异像素数。压缩噪点集中在低档，内容差异在高档也不会消失，
  对比这几行就能判断剩下的是噪点还是真差异。
- 区域列表**不过滤小区域**，面积很小且分散的多半是噪点，由人放大核对。
- 两张图尺寸不同时**直接失败，不缩放**。

## 结构

```text
extension.json          身份；没有 backend / hostPlugin / site，纯前端
src/frontend/
  metadata.ts           browser-local，用户在插件面板自行启停
  compare.ts            纯函数：compareImages / describeReport（无 DOM）
  render.ts             纯函数：renderComparison（合成差异图，无 DOM）
  graph.ts              纯函数：识别对比节点、按连线找出 A / B（无宿主依赖）
  pixels.ts             浏览器侧：URL → RGBA、RGBA → PNG
  plugin.ts             canvas.node-template（新建项）+ canvas.node-action（「对比」按钮）+ 落结果
tests/                  node:test，不需要装依赖
```

## 开发

```sh
# 算法、合成与连线解析的单测（Node 22+，不依赖 pnpm install）
pnpm test

# 类型检查：先在本目录 pnpm install
pnpm typecheck

# 构建与 dev 模式（在客户端仓库根目录）
node web/scripts/build-extension-browser.mjs --cwd ../marketplace/extensions/image-compare --watch
pnpm dev --dev-source ../marketplace/extensions/image-compare
```

## 已知边界

- 阈值固定为 25。节点操作条目前没有设置弹窗，要改阈值就改 `compare.ts` 的 `DEFAULT_THRESHOLD`。
- A / B 由连线先后决定，没有「交换」按钮；要换就删掉一条边重新连。
- 结论是画进图片里的文字，缩放很小时会看不清；全文在节点数据里。
- 只处理 `image` 节点作为输入；视频、3D 不支持。
- 画布 2D 上下文按预乘 alpha 存储，半透明像素的 RGB 会有 1 级左右的舍入误差，不影响默认阈值。
