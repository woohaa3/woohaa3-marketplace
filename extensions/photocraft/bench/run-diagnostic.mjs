import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { exportTimings } from './export-webview-performance.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(root, 'WooHaa3.app/Contents/MacOS/woohaa-desktop');
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw Error('此包仅支持 Apple 芯片 Mac。');
for (const file of [app, path.join(root, 'photocraft/extension.json'), path.join(root, 'photocraft/browser-dist/artifact-manifest.json')]) {
  if (!fs.existsSync(file)) throw Error(`包不完整：${file}`);
}
if (process.argv.includes('--check')) { console.log('包完整；Apple Silicon 平台检查通过。'); process.exit(0); }
const workspace = path.join(root, 'workspace');
const extension = path.join(workspace, 'extensions/photocraft');
if (!fs.existsSync(extension)) fs.cpSync(path.join(root, 'photocraft'), extension, { recursive: true });
const label = new Date().toISOString().replace(/[:.]/g, '-');
const run = path.join(root, 'records', label);
fs.mkdirSync(run, { recursive: true });
fs.writeFileSync(path.join(run, 'machine.json'), JSON.stringify({ platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryBytes: os.totalmem(), release: os.release(), build: 'debug', startedAt: new Date().toISOString() }, null, 2));
const gpu = spawnSync('/usr/sbin/system_profiler', ['SPDisplaysDataType'], { encoding: 'utf8', timeout: 15000 });
fs.writeFileSync(path.join(run, 'displays.txt'), gpu.stdout || gpu.stderr || 'GPU probe unavailable');
const log = fs.openSync(path.join(run, 'app.log'), 'a');
const env = { ...process.env, WOOHAA_DESKTOP_DATA_DIR: workspace, WOOHAA_NATIVE_METRICS_PATH: path.join(run, 'native.json'), WOOHAA_WEBVIEW_TRACE_PATH: path.join(run, 'webview.jsonl') };
const child = spawn(app, [], { env, stdio: ['ignore', log, log] });
console.log('诊断版已启动。本次记录：', run);
console.log('请用同一张图片依次试画笔和修复／移除工具；关闭 App 后记录会自动保存。');
let lastNative = '', lastExport = 0;
function capture() {
  try {
    const text = fs.readFileSync(path.join(run, 'native.json'), 'utf8');
    if (text !== lastNative) {
      fs.appendFileSync(path.join(run, 'metrics.jsonl'), JSON.stringify({ observedAt: new Date().toISOString(), metrics: JSON.parse(text) }) + '\n');
      lastNative = text;
    }
  } catch {}
}
function report() {
  try { if (fs.existsSync(path.join(run, 'webview.jsonl'))) exportTimings(path.join(run, 'webview.jsonl')); }
  catch (error) { console.error('汇总暂未更新：', error.message); }
}
const timer = setInterval(() => {
  capture();
  if (Date.now() - lastExport > 5000) { report(); lastExport = Date.now(); }
}, 1000);
child.on('error', error => { clearInterval(timer); fs.closeSync(log); console.error('启动失败：', error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => {
  clearInterval(timer); capture(); report(); fs.closeSync(log);
  fs.writeFileSync(path.join(run, 'exit.json'), JSON.stringify({ code, signal, endedAt: new Date().toISOString() }));
  console.log('记录已保存：', run);
  process.exitCode = code || (signal ? 1 : 0);
});
