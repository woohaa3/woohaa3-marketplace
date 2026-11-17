/**
 * 打进浏览器产物的描述。扫描不读这份文件，身份以 extension.json 的 extensionId 为准。
 * 只做 import type：metadata 会单独打包，不能带上 contracts 的运行期导出。
 */
import type { ExtensionFrontendMetadata } from "@woohaa3/contracts";

export const metadata: ExtensionFrontendMetadata = {
  extensionId: "image-compare",
  version: "0.1.0",
  label: "图片对比",
  description: "在「新建」里加一个对比节点：连入两张图片，逐像素比对并生成差异图与结论。",
  icon: "plugin",
  activation: "browser-local",
  configScope: "browser-local",
  required: false,
  sdkAbi: 1
};
