import type { ExtensionFrontendDescriptor } from "@woohaa3/frontend/extension-api";
import { canvasNoteExtension } from "./plugin.js";
import { metadata } from "./metadata.js";

export const descriptor: ExtensionFrontendDescriptor = {
  ...metadata,
  plugin: () => canvasNoteExtension()
};
