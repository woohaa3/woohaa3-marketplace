/**
 * 纯 metadata：浏览器侧唯一身份来源，JSON 可序列化。
 *
 * 只做 `import type`：宿主求值 metadata 时是**单独一次 esbuild 打包**，外部扩展（不在 pnpm
 * workspace 里）在构建机上也拿不到 workspace 依赖解析，所以这里不能 import
 * `@woohaa3/contracts` 的运行期导出。
 *
 * `sdkAbi` 直接写 1，与客户端的 `EXTENSION_SDK_ABI_VERSION` 相同；不一致会在受管预检里被拦下。
 * `activation` / `configScope` 都必须是 `browser-local`：本扩展没有后端入口，靠用户自己的
 * 浏览器偏好启停，不进站点控制面的 catalog（那里的行需要可激活的后端定义）。
 */
import type { ExtensionFrontendMetadata } from "@woohaa3/contracts";

export const metadata: ExtensionFrontendMetadata = {
  extensionId: "hello-marketplace",
  version: "0.2.0",
  label: "市场示例插件",
  description: "演示「GitHub 仓库 → Release → 客户端市场安装」全链路的最小浏览器插件。",
  icon: "plugin",
  activation: "browser-local",
  configScope: "browser-local",
  required: false,
  sdkAbi: 1
};
