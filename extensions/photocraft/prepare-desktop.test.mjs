import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { desktopConfig } from './prepare-desktop.mjs';
test('production composition preserves official identity/updater and resolves resource paths', () => {
  const input = {identifier:'com.woohaa.desktop',productName:'WooHaa3',version:'1.2.3',
    build:{frontendDist:'../web/frontend/dist'},plugins:{updater:{pubkey:'public'}},
    bundle:{icon:['icons/icon.icns'],macOS:{entitlements:'entitlements.plist'}}};
  const client = path.resolve('/workspace/client');
  const config = desktopConfig(input, client);
  assert.equal(config.identifier, input.identifier);
  assert.deepEqual(config.plugins, input.plugins);
  assert.equal(config.version, '1.2.3');
  assert.equal(config.build.frontendDist, path.join(client, 'web/frontend/dist'));
  assert.equal(config.bundle.icon[0], path.join(client, 'desktop/icons/icon.icns'));
  assert.equal(config.bundle.macOS.entitlements, path.join(client, 'desktop/entitlements.plist'));
  assert.equal(input.bundle.icon[0], 'icons/icon.icns');
});
