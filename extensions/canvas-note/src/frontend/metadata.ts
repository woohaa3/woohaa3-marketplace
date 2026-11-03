/**
 * 打进浏览器产物的描述。扫描不读这份文件，身份以 extension.json 的 extensionId 为准。
 * 只做 import type：metadata 会单独打包，不能带上 contracts 的运行期导出。
 */
import type { ExtensionFrontendMetadata } from "@woohaa3/contracts";

export const metadata: ExtensionFrontendMetadata = {
  extensionId: "canvas-note",
  version: "0.1.0",
  label: "画布备注",
  description: "在画布工具栏显示宿主保存的备注。",
  icon: "plugin",
  activation: "server-active",
  configScope: "site",
  required: false,
  sdkAbi: 1
};
