import { buildZip, manifest, HASH_A } from '../../project-verifier/src/test-support/project-fixtures.js';
export function savedProject(width = 2, height = 2) {
  const value = manifest();
  (value.document as { size: unknown }).size = { width, height };
  return buildZip([{name:`blobs/${HASH_A}.zst`,data:new Uint8Array([1,2,3,4])},{name:'manifest.json',data:new TextEncoder().encode(JSON.stringify(value))}]);
}
