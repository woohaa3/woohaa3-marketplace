import { EXTENSION_SDK_ABI_VERSION, type ExtensionFrontendMetadata } from "@woohaa3/contracts";
export const metadata: ExtensionFrontendMetadata = {
  extensionId: "photocraft", version: "0.1.1", label: "PhotoCraft 图片编辑",
  description: "PhotoCraft 工具、真实画布取景与 PNG 写回", icon: "media",
  activation: "server-active", configScope: "site", required: false, sdkAbi: EXTENSION_SDK_ABI_VERSION
};
