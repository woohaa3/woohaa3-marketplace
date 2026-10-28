import { accessSync, constants } from "node:fs";
import { isAbsolute } from "node:path";
import type { ApplicationBackendExtensionDefinition } from "@woohaa3/contracts";
import { createNativeProjectVerifier, createProcessOnlyVerifier, photocraftMediaFormat } from "../../project-verifier/src/index.js";
/** Installed as a normal site extension; no host import of PhotoCraft is required. */
export function createPhotocraftBackendDefinition(): ApplicationBackendExtensionDefinition {
  return { extensionId: "photocraft", activate(host) {
    if (!host.registerMediaFormat) throw new Error("Host does not support editable media formats");
    host.registerCapability({ id: "photocraft.edit", value: { available: true } });
    const binaryPath = process.env.WOOHAA3_PROJECT_VERIFIER_PATH?.trim();
    if (binaryPath) { if (!isAbsolute(binaryPath)) throw new Error("核验工具必须为绝对路径"); accessSync(binaryPath, constants.X_OK); }
    const verifier = binaryPath ? createNativeProjectVerifier({ binaryPath }) : createProcessOnlyVerifier();
    try { host.registerMediaFormat(photocraftMediaFormat(verifier)); }
    catch (error) { verifier.dispose(); throw error; }
    return { dispose: () => verifier.dispose() };
  } };
}
