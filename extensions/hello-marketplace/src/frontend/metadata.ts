/**
 * 纯 metadata：唯一身份来源，JSON 可序列化。
 *
 * 刻意只做 `import type`：宿主求值 metadata 时是**单独一次 esbuild 打包**，不带 workspace 解析插件，
 * 所以外部扩展（不在 pnpm workspace 里）不能在这里 import `@woohaa3/contracts` 的运行期导出。
 * `sdkAbi` 直接写 1，与 `EXTENSION_SDK_ABI_VERSION` 相同；不一致会在受管预检里被拦下。
 */
import type { ExtensionFrontendMetadata } from "@woohaa3/contracts";

export const metadata: ExtensionFrontendMetadata = {
  extensionId: "hello-marketplace",
  version: "0.1.0",
  label: "市场示例插件",
  description: "演示「GitHub 仓库 → Release → 客户端市场安装」全链路的最小浏览器插件。",
  activation: "browser-local",
  configScope: "browser-local",
  required: false,
  sdkAbi: 1
};
