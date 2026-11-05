#!/usr/bin/env node
// Explicit, isolated assembly. The normal client manifest never reads this directory.
import { readFile, writeFile, mkdir, realpath, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = dirname(fileURLToPath(import.meta.url));
const digest = data => createHash('sha256').update(data).digest('hex');
const quote = value => JSON.stringify(value);
async function rustTreeHash(directory, extensions=['.rs']) {
  const hash=createHash('sha256');
  async function walk(dir,prefix='') {for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    if(entry.isDirectory()) await walk(join(dir,entry.name),prefix+entry.name+'/');
    else if(extensions.some(extension=>entry.name.endsWith(extension))) {hash.update(prefix+entry.name+'\0');hash.update(await readFile(join(dir,entry.name)));}
  }}
  await walk(directory);return hash.digest('hex');
}
export function validateGraph(metadata) {
  const copies = metadata.packages.filter(p => p.name === 'wgpu');
  if (copies.length !== 1 || copies[0].version !== '30.0.1') throw new Error(`Expected one wgpu 30.0.1 type identity; got ${copies.map(p => p.id).join(', ')}`);
  return copies[0].id;
}
export async function assemble({ clientRoot, photocraftSource, out, cargo = 'cargo', toolchain = '1.97.1', check = false, build = false, release = false, frontendDist }) {
  if (!clientRoot || !photocraftSource) throw new Error('--client-root and --photocraft-source are required');
  const client = await realpath(clientRoot), source = await realpath(photocraftSource);
  const sourceRevision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (sourceRevision !== 'e6d6fb45a40250f518d2e824236a8fdcaa4472c8') throw new Error('Incompatible PhotoCraft source revision');
  execFileSync('git', ['-C', source, 'apply', '--reverse', '--check', join(root, 'web/patch/0001-external-canvas-overlay.patch')]);
  const upstreamLock = await readFile(join(source, 'Cargo.lock'));
  if (digest(upstreamLock) !== 'db9acd6159de3c752155e835b336e06f32dcc378ad7ef4691e6e395e795b1908') throw new Error('Incompatible PhotoCraft pinned dependency lock');
  const output = resolve(out ?? join(root, '.local/native-assembly'));
  const rustc = execFileSync('rustc', [`+${toolchain}`, '-vV'], { encoding: 'utf8' });
  const target = rustc.match(/^host: (.+)$/m)?.[1];
  if (!target) throw new Error('rustc did not report host target');
  const port = await readFile(join(client, 'desktop/src/document_editor/protocol.rs'));
  if (!port.toString().includes('EDITOR_API_MAJOR: u32 = 1')) throw new Error('Incompatible editor API major');
  await mkdir(join(output, 'adapter'), { recursive: true });
  await mkdir(join(output, 'host'), { recursive: true });
  const dep = path => `{ path = ${quote(path)} }`;
  const adapter = `[package]\nname = "woohaa-photocraft-native-adapter"\nversion = "0.1.0"\nedition = "2024"\nbuild = "build.rs"\n[lib]\npath = ${quote(join(root, 'native-adapter/src/lib.rs'))}\n[features]\ndefault = []\ndesktop = ["dep:woohaa_desktop_host", "dep:photocraft-gpu"]\nnative-ui = ["desktop", "dep:photocraft-ui-egui", "dep:egui", "dep:eframe", "dep:parking_lot", "dep:bevy", "dep:rfd", "dep:tempfile"]\n[dependencies]\nphotocraft-engine = ${dep(join(source, 'crates/engine'))}\nserde_json = "1"\nsha2 = "0.10"\nrfd = {version="0.16",optional=true}\ntempfile = {version="3",optional=true}\nphotocraft-io = ${dep(join(source, 'crates/io'))}\nphotocraft-raster = ${dep(join(source, 'crates/raster'))}\neframe = { version = "0.36", default-features = false, features = ["wgpu"], optional = true }\nparking_lot = { version = "0.12", optional = true }\nbevy = { version = "=0.20.0", default-features = false, optional = true }\nphotocraft-gpu = { path = ${quote(join(source, 'crates/gpu'))}, optional = true }\negui = { version = "0.36", default-features = false, optional = true }\nphotocraft-ui-egui = { path = ${quote(join(source, 'crates/ui-egui'))}, optional = true }\nwoohaa_desktop_host = { path = ${quote(join(client, 'desktop'))}, optional = true }\n`;
  const host = `[package]\nname = "woohaa-photocraft-native-host"\nversion = "0.1.0"\nedition = "2024"\n[lib]\npath = ${quote(join(root, 'native-host/src/lib.rs'))}\n[[bin]]\nname = "woohaa-photocraft-experimental"\npath = ${quote(join(root, 'native-host/src/main.rs'))}\n[dependencies]\nwoohaa-photocraft-native-adapter = { path = "../adapter", features = ["native-ui"] }\nwoohaa_desktop_host = { path = ${quote(join(client, 'desktop'))}, features = ["diagnostic-performance"] }\n# Exact pin prevents a second device/queue Rust type identity.\nwgpu = { version = "=30.0.1", default-features = false }\n`;
  await writeFile(join(output, 'Cargo.toml'), '[workspace]\nresolver = "3"\nmembers = ["adapter", "host"]\n');
  await writeFile(join(output, 'adapter/Cargo.toml'), adapter);
  await writeFile(join(output, 'host/Cargo.toml'), host);
  const loaderHelper=join(client,'scripts/lib/desktop-host-package.mjs');
  const {prepareStartupFrontend}=await import(pathToFileURL(loaderHelper).href);
  const frontend=resolve(frontendDist ?? join(client,'web/frontend',build||check?'dist':'public'));
  const startupFrontend=prepareStartupFrontend(frontend,join(output,'startup-frontend'));
  const tauriOverride={identifier:'com.woohaa3.photocraft.experimental',productName:'WooHaa3 PhotoCraft Experimental',build:{frontendDist:startupFrontend}};
  const run = args => execFileSync(cargo, [`+${toolchain}`, ...args, '--manifest-path', join(output, 'Cargo.toml')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, TAURI_CONFIG: JSON.stringify(tauriOverride) } });
  // A present lock is never silently rewritten. Delete it explicitly to resolve a new assembly.
  try { await readFile(join(output, 'Cargo.lock')); } catch (error) { if (error.code !== 'ENOENT') throw error; await writeFile(join(output, 'Cargo.lock'), await readFile(join(client, 'desktop/Cargo.lock'))); run(['metadata', '--format-version', '1', '--all-features']); }
  const metadata = JSON.parse(run(['metadata', '--locked', '--format-version', '1', '--all-features']));
  const wgpuIdentity = validateGraph(metadata);
  const lock = await readFile(join(output, 'Cargo.lock'));
  const identity = { schemaVersion: 1, profile: release ? 'release' : 'dev', applicationId:'com.woohaa3.photocraft.experimental', updateChannel:'photocraft-experimental', compiler: rustc.trim(), target, editorApiMajor: 1, editorApiSha256: digest(port), wgpuIdentity, lockSha256: digest(lock), clientLockSha256: digest(await readFile(join(client, 'desktop/Cargo.lock'))), photocraftRevision: sourceRevision, photocraftPatchSha256: digest(await readFile(join(root, 'web/patch/0001-external-canvas-overlay.patch'))), photocraftLockSha256: digest(upstreamLock), photocraftEngineSha256: digest(await readFile(join(source, 'crates/engine/src/lib.rs'))), photocraftRetouchSha256: digest(await readFile(join(source, 'crates/engine/src/retouch_cmds.rs'))), adapterSourceSha256: digest(await readFile(join(root, 'native-adapter/src/lib.rs'))), sharedEnabled: true };
  identity.startupLoaderSha256=digest(await readFile(join(startupFrontend,'index.html')));
  identity.startupHelperSha256=digest(await readFile(loaderHelper));
  identity.tauriConfigSha256=digest(JSON.stringify(tauriOverride));
  identity.cargoFeaturesSha256=digest(JSON.stringify(metadata.resolve.nodes.map(node=>({id:node.id,features:node.features})).sort((a,b)=>a.id.localeCompare(b.id))));
  identity.clientDesktopCargoSha256=digest(await readFile(join(client,'desktop/Cargo.toml')));
  identity.clientBevyCargoSha256=digest(await readFile(join(client,'bevy/Cargo.toml')));
  identity.adapterRustSourcesSha256=await rustTreeHash(join(root,'native-adapter/src'));
  identity.hostRustSourcesSha256=await rustTreeHash(join(root,'native-host/src'));
  identity.clientDesktopRustSourcesSha256=await rustTreeHash(join(client,'desktop/src'),['.rs','.wgsl','.js']);
  identity.clientBevyRustSourcesSha256=await rustTreeHash(join(client,'bevy/src'),['.rs','.wgsl']);
  identity.extensionFrontendSourcesSha256=await rustTreeHash(join(root,'web/src'),['.ts','.tsx','.js','.css','.html']);
  identity.clientFrontendSourcesSha256=await rustTreeHash(join(client,'web/frontend/src'),['.ts','.tsx','.js','.css']);
  identity.nativeFontManifestSha256=digest(await readFile(join(root,'web/src/app-assets/fonts/manifest.txt')));
  identity.buildScriptSha256=digest(await readFile(fileURLToPath(import.meta.url)));
  identity.adapterDesktopSourceSha256 = digest(await readFile(join(root, 'native-adapter/src/desktop.rs')));
  identity.hostSourceSha256 = digest(await readFile(join(root, 'native-host/src/lib.rs')));
  identity.buildId = digest(JSON.stringify(identity));
  await writeFile(join(output, 'adapter/build.rs'), `fn main() { println!("cargo:rustc-env=WOOHAA_PHOTOCRAFT_BUILD_ID=${identity.buildId}"); }\n`);
  await writeFile(join(output, 'build-identity.json'), `${JSON.stringify(identity, null, 2)}\n`);
  if (build) run(['build', '--locked', '-p', 'woohaa-photocraft-native-host', '--bin', 'woohaa-photocraft-experimental', ...(release ? ['--release'] : [])]);
  if (check) run(['check', '--locked', '--workspace']);
  return { output, identity };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    const key = { '--client-root': 'clientRoot', '--photocraft-source': 'photocraftSource', '--out': 'out', '--toolchain': 'toolchain', '--frontend': 'frontendDist' }[args[i]];
    if (args[i] === '--check') options.check = true;
    else if(args[i] === '--build') options.build = true;
    else if(args[i] === '--release') options.release = true;
    else if (key && args[i + 1]) options[key] = args[++i];
    else throw new Error(`Unknown or missing argument: ${args[i]}`);
  }
  const result = await assemble(options);
  console.log(JSON.stringify(result, null, 2));
}
