#!/usr/bin/env node
/**
 * 把 PhotoCraft 组装进 client 的第二扩展根（预构建产物根），供 dev 宿主直接扫描。
 *
 *   pnpm build:dev            复用 extension/ 已有产物，只重新组装 + 拷贝（秒级）
 *   pnpm build:dev:full       先完整构建（WASM 应用 + 后端 + browser 产物）再组装
 *   pnpm build:dev --outdir X 指定目标目录
 *
 * 目标目录优先级：`--outdir` → `PHOTOCRAFT_DEV_EXTENSION_DIR` → `<父仓>/client/extensions/photocraft`。
 * 父仓由 marketplace 在父仓中的位置推断（`marketplace/extensions/photocraft` → `../../..`）；
 * marketplace 单独 checkout 时推断不出父仓，必须显式给出路径。
 *
 * 目标位置的约定见 client 的 `extensions.config.json`：配置根的直接子目录才被当作扩展，
 * 目录名不能以 `.` 开头（那是「未安装」标记），扫描器只接受真实目录、不跟随符号链接。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
// marketplace/extensions/photocraft → 父仓（client 与 marketplace 同级）。
const parentRepo = path.resolve(root, '../../..');
const clientRoot = path.join(parentRepo, 'client');

const arg = (name) => {
  const index = process.argv.indexOf('--' + name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const full = process.argv.includes('--full');
const explicit = arg('outdir') ?? process.env.PHOTOCRAFT_DEV_EXTENSION_DIR;
if (!explicit && !existsSync(path.join(clientRoot, 'extensions.config.json'))) {
  throw new Error(
    `找不到 client 仓库（${clientRoot}）。marketplace 单独 checkout 时请显式指定目标：\n` +
      '  pnpm build:dev --outdir <client>/extensions/photocraft'
  );
}
const destination = path.resolve(explicit ?? path.join(clientRoot, 'extensions', 'photocraft'));
if (path.basename(destination).startsWith('.')) throw new Error(`目录名以 . 开头会被当作「未安装」：${destination}`);

execFileSync(
  process.execPath,
  [path.join(root, 'build-extension.mjs'), '--outdir', destination, ...(full ? [] : ['--skip-build'])],
  { stdio: 'inherit' }
);

// 产物有 35 MB 上下，误提交一次就很难收拾；默认写进 client 的本地排除文件（幂等）。
if (!process.argv.includes('--no-git-exclude')) {
  try {
    const exclude = execFileSync('git', ['-C', clientRoot, 'rev-parse', '--git-path', 'info/exclude'], { encoding: 'utf8' }).trim();
    const file = path.resolve(clientRoot, exclude);
    const entry = path.relative(clientRoot, destination).split(path.sep).join('/') + '/';
    const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
    if (!current.split(/\r?\n/).includes(entry)) {
      appendFileSync(file, `${current.endsWith('\n') || current === '' ? '' : '\n'}${entry}\n`);
      console.log(`[photocraft] 已加入 ${path.relative(process.cwd(), file)}：${entry}`);
    }
  } catch (error) {
    console.warn(`[photocraft] 跳过 git 排除（${error.message}）；产物 ${destination} 需要自行避免提交`);
  }
}

console.log(`[photocraft] dev 扩展根：${destination}${full ? '（完整构建）' : '（复用已有产物）'}`);
console.log(`[photocraft] 重启 dev 宿主后生效：cd ${clientRoot} && pnpm dev:desktop`);
