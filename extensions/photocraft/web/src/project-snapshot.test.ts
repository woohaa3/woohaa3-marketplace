import { expect, it } from 'vitest';
import { buildZip, manifest } from '../../project-verifier/src/test-support/project-fixtures.js';
import { projectSnapshot } from './project-snapshot.js';
const zip = (value:unknown) => buildZip([{name:'manifest.json',data:new TextEncoder().encode(JSON.stringify(value))}]);
it('hashes document content independently of name, selection and ZIP packaging',()=>{
  const a=manifest();const b=structuredClone(a);
  Object.assign(b.document as object,{name:'renamed',selection:{not:'content'},id:999});
  expect(projectSnapshot(zip(a)).documentContentHash).toBe(projectSnapshot(zip(b)).documentContentHash);
  ((b.document as {layers:Array<{opacity:number}>}).layers[0]).opacity=0.5;
  expect(projectSnapshot(zip(a)).documentContentHash).not.toBe(projectSnapshot(zip(b)).documentContentHash);
});
it('rejects invalid, oversized or truncated manifests before a save can succeed',()=>{
  expect(()=>projectSnapshot(new Uint8Array(33))).toThrow();
  expect(()=>projectSnapshot(zip(manifest()).subarray(0,50))).toThrow();
  expect(()=>projectSnapshot(zip(manifest({document:{size:{width:999999,height:2},layers:[{}]}})))).toThrow();
});
