import type { ExtensionFrontendDescriptor } from "@woohaa3/frontend/extension-api";
import { createPhotoCraftExtension } from "../../../web/src/plugin.js";
import { metadata } from "./metadata.js";
export const descriptor: ExtensionFrontendDescriptor = {
  ...metadata,
  plugin: () => createPhotoCraftExtension({ assetBaseUrl: new URL("../assets/photocraft/", import.meta.url).href })
};
