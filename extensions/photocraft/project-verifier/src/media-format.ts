import type { MediaFormatValidator } from "@woohaa3/contracts";
import { IMAGE_PROJECT_CONTENT_TYPE, IMAGE_PROJECT_LIMITS } from "../../protocol/src/index.js";
import { ProjectVerificationError, inspectEmbeddedPhotocraftProject } from "./project-verification.js";
import type { NativeProjectVerifier } from "./native-project-verifier.js";
/** PhotoCraft's own save policy, including embedded source-tree verification. */
export function photocraftMediaFormat(verifier: NativeProjectVerifier): MediaFormatValidator {
  return { contentType: IMAGE_PROJECT_CONTENT_TYPE, maxBytes: IMAGE_PROJECT_LIMITS.maxProjectBytes,
    async validate(bytes, options) {
      try { await verifier.verifyForIngest(bytes, IMAGE_PROJECT_CONTENT_TYPE, options); return; }
      catch (error) {
        if (!(error instanceof ProjectVerificationError) || error.code !== "unsupported-object") throw error;
        if (!inspectEmbeddedPhotocraftProject(bytes, options).objectKinds.includes("smart")) throw error;
      }
      await verifier.verifyEmbeddedForIngest(bytes, IMAGE_PROJECT_CONTENT_TYPE, options);
    }
  };
}
