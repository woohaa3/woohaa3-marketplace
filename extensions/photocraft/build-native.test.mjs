import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble, validateGraph } from './build-native.mjs';
test('assembly requires explicit source roots', async () => {
  await assert.rejects(assemble({}), /client-root and --photocraft-source/);
});
test('wgpu must have one exact package identity', () => {
  assert.equal(validateGraph({ packages: [{ name: 'wgpu', version: '30.0.1', id: 'one' }] }), 'one');
  assert.throws(() => validateGraph({ packages: [] }), /one wgpu/);
  assert.throws(() => validateGraph({ packages: [{ name: 'wgpu', version: '30.0.1', id: 'one' }, { name: 'wgpu', version: '29.0.1', id: 'two' }] }), /one wgpu/);
  assert.throws(() => validateGraph({ packages: [{ name: 'wgpu', version: '30.0.2', id: 'one' }] }), /one wgpu/);
});
