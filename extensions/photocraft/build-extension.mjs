#!/usr/bin/env node
// Author here; distribute only self-contained runtime artifacts to the public client.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, 'extension');
const outIndex = process.argv.indexOf('--outdir');
if (outIndex !== -1 && !process.argv[outIndex + 1]) throw new Error('--outdir requires a directory');
const destination = path.resolve(outIndex === -1 ? path.join(root, '../../.local/photocraft') : process.argv[outIndex + 1]);
if (destination === root || root.startsWith(`${destination}${path.sep}`) || destination.startsWith(`${root}${path.sep}`)) {
  throw new Error('Output must be outside the authoring workspace');
}
execFileSync(process.execPath, [path.join(source, 'build.mjs')], { stdio: 'inherit' });
const staging = path.join(path.dirname(destination), `.${path.basename(destination)}.staging`);
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
try {
  for (const file of ['extension.json', 'dist', 'browser-dist']) {
    cpSync(path.join(source, file), path.join(staging, file), { recursive: true });
  }
  const pkg = JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8'));
  // 预构建包里没有 src/：exports 只保留运行时入口，不能把 authoring 的 types 指回源码。
  const runtimeExports = Object.fromEntries(
    Object.entries(pkg.exports ?? {}).map(([subpath, target]) => {
      if (typeof target === 'string') return [subpath, target];
      const runtime = target.import ?? target.default ?? target.node;
      return [subpath, runtime ? { import: runtime } : target];
    })
  );
  // Build scripts and authoring dependencies must never escape into an installed package.
  writeFileSync(path.join(staging, 'package.json'), JSON.stringify({
    name: pkg.name, version: pkg.version, private: false, type: 'module', exports: runtimeExports,
    files: ['dist', 'browser-dist', 'extension.json', 'README.md'],
  }, null, 2) + '\n');
  writeFileSync(path.join(staging, 'README.md'), '# PhotoCraft runtime extension\n\nPrebuilt runtime; no source checkout, build toolchain or npm installation required.\nLoaded by the standard extension scanner and enabled by default.\nThird-party licenses: browser-dist/assets/photocraft/LICENSE-MIT and LICENSE-APACHE.\n');
  rmSync(destination, { recursive: true, force: true });
  renameSync(staging, destination);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
console.log(`[photocraft] Runtime-only extension: ${destination}`);
