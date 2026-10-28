import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, rm, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { scanExtensions, browserExtensions } from '../../../../client/scripts/lib/extension-scan.mjs';
test('installed artifact loads without repository source or node_modules and owns its assets', async () => {
  const sandbox = await mkdtemp(path.join(tmpdir(), 'photocraft-installed-'));
  const dir = path.join(sandbox, 'extensions/photocraft');
  try {
    if (!existsSync(new URL('./dist/backend.js', import.meta.url)) || !existsSync(new URL('./browser-dist/artifact-manifest.json', import.meta.url))) {
      throw new Error('缺少构建产物：先运行 node extension/build.mjs（或 pnpm -C marketplace/extensions/photocraft build:extension）');
    }
    await mkdir(dir, { recursive: true });
    await mkdir(path.join(sandbox, 'web/extensions'), { recursive: true });
    // 本测试验证的是**本包构建出的安装物**；本地安装单元由 build-extension.mjs 生成到
    // marketplace/.local，不属于发布包。这里从本地 dist/browser-dist 组装一个同样的无源码包。
    const sourcePkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
    for (const file of ['extension.json', 'dist', 'browser-dist']) await cp(new URL('./' + file, import.meta.url), path.join(dir, file), { recursive: true });
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({
      name: sourcePkg.name,
      version: sourcePkg.version,
      private: false,
      type: 'module',
      exports: sourcePkg.exports
    }, null, 2) + '\n');
    const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts, undefined);
    assert.equal(pkg.dependencies, undefined);
    assert.equal(pkg.devDependencies, undefined);
    for (const file of await readdir(dir, { recursive: true })) {
      assert.ok(!/\.(ts|tsx|rs|map)$/.test(file), `Unexpected source: ${file}`);
      assert.ok(!file.split(path.sep).some(x => ['src', 'node_modules'].includes(x)));
    }
    const { createPhotocraftPlugin } = await import(pathToFileURL(path.join(dir, 'dist/backend.js')));
    let format, capability;
    const disposers = [];
    const backendPlugin = createPhotocraftPlugin();
    await backendPlugin.apply({
      effect(fn) {
        const dispose = fn();
        if (typeof dispose === 'function') disposers.push(dispose);
        return dispose;
      },
      capabilities: { register(id, value) { capability = { id, value }; return () => {}; } },
      mediaFormats: { register(value) { format = value; return () => {}; } }
    }, {});
    assert.equal(capability.id, 'photocraft.edit');
    assert.equal(format.contentType, 'application/vnd.woohaa.photocraft-project');
    await assert.rejects(format.validate(new Uint8Array([1]), { maxBytes: 100 }));
    for (const dispose of disposers.reverse()) await dispose();
    const manifest = JSON.parse(await readFile(path.join(dir, 'browser-dist/artifact-manifest.json')));
    for (const file of manifest.files) {
      const bytes = await readFile(path.join(dir, 'browser-dist', file.path));
      assert.equal(bytes.length, file.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    }
    const entry = await import(pathToFileURL(path.join(dir, 'browser-dist', manifest.entry)));
    let options;
    const React = { createContext: () => ({}), forwardRef: x => x, memo: x => x, createElement: (type, props) => ({ type, props }) };
    const { descriptor } = await entry.loadExtension({ token: {}, sdk: { defineExtensionPlugin: (_fn, value) => { options = value; return _fn; }, resolvePublicUrl: x => x, IMAGE_EDIT_SERVICE: "imageEdit" }, react: React, jsxRuntime: { jsx: React.createElement, jsxs: React.createElement } });
    assert.equal(descriptor.extensionId, 'photocraft');
    const plugin = descriptor.plugin(); assert.equal(options.name, 'photocraft');
    let workspace, surface;
    const persistentSurfaces = { acquire(_id, factory) {
      surface ??= { element: { isConnected: true }, render() {}, bind() { return () => {}; }, release() {} };
      surface.value ??= factory(surface); return surface;
    } };
    plugin({ persistentSurfaces, provide() {}, canvasSession: {}, canvasState: { getWorkingCanvas: () => null, subscribe: () => () => {} }, canvasRuntime: { setImageFocusTargets() {} }, canvasScope: { canvasId: () => "canvas" }, slots: { register(_name, value) { workspace = value; return () => {}; } }, effect() {} });
    const rendered = workspace.render({});
    const runtime = new URL("host-bridge.js", rendered.props.owner.value.assetBaseUrl);
    assert.equal(await readFile(runtime, 'utf8'), await readFile(path.join(dir, 'browser-dist/assets/photocraft/host-bridge.js'), 'utf8'));
    const core = await readFile(new URL("host-bridge-core.js", runtime), "utf8");
    assert.ok(core.includes("runtime_create(canvas"));
    assert.ok(!core.includes("window.parent") && !core.includes("postMessage") && !core.includes("DataTransfer"));
    const chunks = manifest.files.filter(x => x.path.startsWith('chunks/') && x.path.endsWith('.js'));
    assert.ok(chunks.length);
    assert.ok(manifest.files.some(x => x.path === 'assets/photocraft/index.html'));
    assert.ok(manifest.files.some(x => x.path.endsWith('photocraft-web_bg.wasm')));
    // Host fonts travel in the artifact: manifest, face and OFL licence, with the declared hash.
    for (const fontFile of [
      'assets/photocraft/fonts/manifest.txt',
      'assets/photocraft/fonts/NotoSansSC-Regular.otf',
      'assets/photocraft/fonts/OFL-NotoSansSC.txt'
    ]) assert.ok(manifest.files.some(x => x.path === fontFile), `missing ${fontFile}`);
    const fontManifest = await readFile(path.join(dir, 'browser-dist/assets/photocraft/fonts/manifest.txt'), 'utf8');
    const fontRow = fontManifest.split('\n').map(x => x.trim()).find(x => x && !x.startsWith('#'));
    assert.match(fontRow, /^Noto Sans SC \| Regular \| fonts\/NotoSansSC-Regular\.otf \| Hans,Hant,Jpan \|/);
    const fontSha = fontRow.split(' | ')[6];
    assert.equal(createHash('sha256').update(await readFile(path.join(dir, 'browser-dist/assets/photocraft/fonts/NotoSansSC-Regular.otf'))).digest('hex'), fontSha);
    const scan = scanExtensions({ repoRoot: sandbox, env: {} });
    assert.deepEqual(browserExtensions(scan).map(x => x.extensionId), ['photocraft']);
    // Exercise the actual client commands with only the source-free installed package.
    const client = fileURLToPath(new URL('../../../../client/', import.meta.url));
    const env = { ...process.env, WOOHAA3_EXTENSION_DIRS: path.join(sandbox, 'extensions'), WOOHAA3_EXTENSION_WRITABLE_DIRS: '' };
    const run = (script, args = []) => execFileSync(process.execPath, [path.join(client, script), ...args], { cwd: client, env, encoding: 'utf8' });
    assert.match(run('web/scripts/build-extension-packages.mjs'), /复用已安装产物/);
    assert.match(run('web/scripts/build-extension-browser.mjs', ['--all']), /verified 1 prebuilt/);
    const host = path.join(sandbox, 'host');
    await mkdir(host);
    await writeFile(path.join(host, 'index.html'), '<html><head></head><body></body></html>');
    run('scripts/assemble-extension-release.mjs', ['--host-dist', host]);
    const html = await readFile(path.join(host, 'index.html'), 'utf8');
    const catalogPath = /rel="woohaa-extension-release" href="([^"]+)"/.exec(html)?.[1];
    assert.ok(catalogPath);
    const catalog = JSON.parse(await readFile(path.join(host, catalogPath), 'utf8'));
    assert.deepEqual(catalog.entries.map(x => x.metadata.extensionId), ['photocraft']);
    assert.equal(JSON.parse(await readFile(path.join(dir, 'browser-dist/artifact-manifest.json'))).artifactId, manifest.artifactId);
  } finally { await rm(sandbox, { recursive: true, force: true }); }
});
