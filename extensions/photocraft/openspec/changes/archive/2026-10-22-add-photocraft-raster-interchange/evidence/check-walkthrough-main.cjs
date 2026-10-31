/**
 * 4.2 主线复跑（1440×1000 与 1024×768 各一遍）
 * change: 2026-10-22-add-photocraft-raster-interchange
 *
 * 复跑前把 <repo> / <fixtures> 换成本机路径：
 * - <repo>     = 本 worktree 根
 * - <fixtures> = 含 sample.png/sample.jpg/sample.tif/… /layered.pcraft/gradient.png 的夹具目录
 *   （由 check-interchange-wasm.mjs 同款思路生成的探针图片；本仓库不内置二进制夹具）
 *
 * 前置：`pnpm -C photocraft run wasm` 产出真实产物，且 dev 宿主在 4488 端口运行
 *       （`pnpm -C photocraft run dev -- --port 4488`）。
 *
 * 输出即 verification.md「真实浏览器界面走查」表中实测值的来源。
 */
const { chromium } = require(require.resolve('@playwright/test', { paths: ['<repo>/web'] }));
const fs = require('node:fs');
const FIX = '<fixtures>';
const OUT = '<repo>/photocraft/openspec/changes/2026-10-22-add-photocraft-raster-interchange/evidence';
const OPEN_FORMATS = ['sample.png', 'sample.jpg', 'sample.tif', 'sample.webp', 'sample.gif', 'sample.bmp',
  'sample.tga', 'sample.ico', 'sample.qoi', 'sample.pnm', 'sample.pcx', 'sample.xpm', 'sample.dds'];

async function openMenu(page, label) {
  await page.locator('.photo-editor__menubar button', { hasText: new RegExp(`^${label}$`) }).first().click();
  await page.waitForTimeout(350);
}
async function openPanelFromFileMenu(page, label) {
  await openMenu(page, '文件');
  await page.locator('[role=menuitem]', { hasText: new RegExp(`^${label}$`) }).click();
  await page.waitForTimeout(1100);
}
async function grab(page, buttonText, path) {
  const pending = page.waitForEvent('download', { timeout: 25000 }).catch(() => null);
  const button = page.locator('button', { hasText: new RegExp(`^${buttonText}$`) }).first();
  await button.scrollIntoViewIfNeeded().catch(() => undefined);
  await button.click();
  const file = await pending;
  if (!file) return null;
  await file.saveAs(path);
  return fs.statSync(path).size;
}
const bytesOf = (hint) => {
  const match = hint.match(/(\d+)\s*字节/);
  return match ? Number(match[1]) : null;
};
const formatsOf = (page) => page.locator('label', { hasText: /^格式/ }).locator('select').first()
  .evaluate((node) => [...node.options].map((option) => option.value));
const modeOf = (page) => page.locator('label', { hasText: /^模式/ }).locator('select').first()
  .evaluate((node) => node.value);

async function run(browser, width, height, tag) {
  const page = await browser.newPage({ viewport: { width, height }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (error) => errs.push(String(error)));
  await page.goto('http://127.0.0.1:4488/', { waitUntil: 'networkidle' });
  const out = { viewport: `${width}x${height}` };

  // 1) 逐格式打开
  const opened = [];
  for (const name of OPEN_FORMATS) {
    await page.locator('input[type=file]').first().setInputFiles(`${FIX}/${name}`);
    await page.waitForTimeout(1100);
    opened.push({ name, ok: (await page.locator('.photo-editor').count()) > 0 });
  }
  out.opened = { total: opened.length, failed: opened.filter((entry) => !entry.ok).map((entry) => entry.name) };

  // 2) 三处入口与落点
  await openMenu(page, '图像');
  const imageItems = (await page.locator('[role=menuitem]').allInnerTexts()).map((text) => text.trim());
  await page.locator('[role=menuitem]', { hasText: /格式与导出/ }).first().click();
  await page.waitForTimeout(1100);
  out.imageMenu = { mode: await modeOf(page), formats: await formatsOf(page), entry: imageItems.find((l) => l.includes('格式与导出')) ?? null };
  out.matrixRows = await (async () => {
    await page.locator('button', { hasText: /^格式矩阵$/ }).click();
    await page.waitForTimeout(600);
    return page.locator('[data-io-matrix-row]').count();
  })();

  await openPanelFromFileMenu(page, '导出为…');
  out.exportMenu = { mode: await modeOf(page), formats: await formatsOf(page) };
  await openMenu(page, '文件');
  const fileItems = (await page.locator('[role=menuitem]').allInnerTexts()).map((text) => text.trim()).filter(Boolean);
  out.fileMenu = fileItems;
  await page.keyboard.press('Escape');

  await openPanelFromFileMenu(page, 'Save for Web…');
  out.webMenu = { mode: await modeOf(page), formats: await formatsOf(page) };

  // 3) 多图层工程：预览 == 交付、逐层、资产
  await page.locator('input[type=file]').nth(1).setInputFiles(`${FIX}/layered.pcraft`);
  await page.waitForTimeout(2200);
  await openPanelFromFileMenu(page, '导出为…');
  out.previewEqualsDelivery = {};
  for (const [format, key] of [['jpg', 'jpeg'], ['webp', 'webp'], ['tif', 'tiff']]) {
    await page.locator('label', { hasText: /^格式/ }).locator('select').first().selectOption(format);
    await page.waitForTimeout(350);
    await page.locator('button', { hasText: /^真实预览$/ }).click();
    await page.waitForTimeout(1100);
    const hint = (await page.locator('[data-io-preview="true"] span').first().innerText().catch(() => '')).trim();
    const delivered = await grab(page, '导出并下载', `/tmp/${tag}-${key}`);
    out.previewEqualsDelivery[key] = { hint, previewBytes: bytesOf(hint), deliveredBytes: delivered, equal: bytesOf(hint) === delivered };
  }

  await page.locator('button', { hasText: /^逐层与资产$/ }).click();
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: /^查看逐层计划$/ }).click();
  await page.waitForTimeout(800);
  out.layers = {
    plan: (await page.locator('[data-io-layer-plan]').innerText().catch(() => '')).trim().slice(0, 120),
    renames: (await page.locator('[data-io-renames]').allInnerTexts().catch(() => [])).map((text) => text.trim().replace(/\s+/g, ' ')),
    zip: await grab(page, '逐层打包下载', `/tmp/${tag}-layers.zip`)
  };
  await page.locator('button', { hasText: /^查看资产计划$/ }).click();
  await page.waitForTimeout(800);
  out.assets = {
    plan: (await page.locator('[data-io-asset-plan]').innerText().catch(() => '')).trim().slice(0, 120),
    zip: await grab(page, '生成资产包下载', `/tmp/${tag}-assets.zip`)
  };

  // 4) 保存与导出 PNG（按文档名）
  await page.locator('input[type=file]').first().setInputFiles(`${FIX}/sample.png`);
  await page.waitForTimeout(1600);
  const saved = [];
  const onSaved = (download) => saved.push(download.suggestedFilename());
  page.on('download', onSaved);
  await openMenu(page, '文件');
  await page.locator('[role=menuitem]', { hasText: /^保存$/ }).click();
  await page.waitForTimeout(2500);
  page.off('download', onSaved);
  out.save = saved;

  const png = [];
  const onPng = (download) => png.push(download.suggestedFilename());
  page.on('download', onPng);
  await openMenu(page, '文件');
  await page.locator('[role=menuitem]', { hasText: /^导出 PNG…$/ }).click();
  await page.waitForTimeout(1800);
  page.off('download', onPng);
  out.exportPng = png;
  out.exportPngNotice = (await page.locator('[role=alert], .dev-error').allInnerTexts().catch(() => []))
    .map((text) => text.trim()).filter(Boolean).slice(0, 2);

  // 5) EXR 拒绝
  await page.locator('input[type=file]').first().setInputFiles(`${FIX}/sample.exr`);
  await page.waitForTimeout(1600);
  out.exr = (await page.locator('[role=alert], .dev-error').allInnerTexts().catch(() => []))
    .map((text) => text.trim()).filter(Boolean).slice(0, 2);

  out.overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  await page.screenshot({ path: `${OUT}/walkthrough-${tag}.png` });
  out.pageerrors = errs;
  await page.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [width, height, tag] of [[1440, 1000, '1440x1000'], [1024, 768, '1024x768']]) {
    console.log(JSON.stringify(await run(browser, width, height, tag), null, 1));
  }
  await browser.close();
})();
