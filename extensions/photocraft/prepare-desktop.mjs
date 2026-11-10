#!/usr/bin/env node
// This outer composition owns the PhotoCraft dependency; the client stays independent.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assemble } from './build-native.mjs';
export { desktopConfig } from './build-native.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
export async function prepareDesktop({ clientRoot, out, debug = false, env = process.env }) {
  const client = await fs.realpath(clientRoot);
  const output = path.resolve(out ?? path.join(root, '.local/desktop-assembly-client-provider'));
  const patch = await fs.readFile(path.join(root, 'web/patch/0001-external-canvas-overlay.patch'));
  const patchHash = createHash('sha256').update(patch).digest('hex');
  const source = path.join(root, '.local/photocraft-source', `e6d6fb45a40250f518d2e824236a8fdcaa4472c8-${patchHash}`);
  execFileSync('bash', [path.join(root, 'web/build-app.sh'), '--source-only'], {
    env: { ...env, PHOTOCRAFT_SRC: '', PHOTOCRAFT_FONT_DIR: path.join(client, 'web/frontend/public/assets/fonts') }, stdio: 'inherit'
  });
  const project = path.join(output, 'host');
  const result = await assemble({ clientRoot: client, photocraftSource: source, out: output,
    frontendDist: path.join(client, 'web/frontend/public'), production: true, release: !debug });
  // Bundle discovery and Cargo must use the same target root, including custom caches.
  const target = path.resolve(env.CARGO_TARGET_DIR ?? path.join(output, 'target'));
  await fs.mkdir(target, { recursive: true });
  return { project, target, identityPath: path.join(output, 'build-identity.json'), identity: result.identity };
}
