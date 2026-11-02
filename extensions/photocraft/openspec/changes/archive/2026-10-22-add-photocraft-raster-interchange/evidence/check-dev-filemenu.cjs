/**
 * dev 宿主「文件 ▸ 导出 PNG…」真浏览器复验（change 2026-10-22-add-photocraft-raster-interchange，任务 3.4）
 *
 * 复验的缺陷：dev 宿主此前没有注入 fileDelivery 端口，菜单项在、点击后
 * deliverFile() 恒返回「当前宿主不支持本地文件保存」且界面无任何提示。
 * 复跑前把 <repo> / <fixtures> 换成本机路径。
 */
const { chromium } = require(require.resolve('@playwright/test', {
  paths: ['<repo>/web']
}));
const FIX = '<fixtures>';

async function openMenu(page, label) {
  await page.locator('.photo-editor__menubar button', { hasText: new RegExp(`^${label}$`) }).first().click();
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:4488/', { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').first().setInputFiles(`${FIX}/sample.png`);
  await page.waitForTimeout(2500);

  // 文件菜单：确认三处导出入口都在
  await openMenu(page, '文件');
  const items = (await page.locator('[role=menuitem]').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
  console.log('文件菜单:', JSON.stringify(items));
  await page.keyboard.press('Escape');

  // 导出 PNG…：必须真的发起下载（缺陷版本会静默失败）
  await openMenu(page, '文件');
  const downloadPromise = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await page.locator('[role=menuitem]', { hasText: /^导出 PNG…$/ }).click();
  const download = await downloadPromise;
  console.log('导出 PNG 下载:', download ? download.suggestedFilename() : '（未发起）');
  await page.waitForTimeout(600);
  const message = await page.locator('[role=alert], .photo-editor__status').allInnerTexts().catch(() => []);
  console.log('界面提示:', JSON.stringify(message.map((s) => s.trim()).filter(Boolean).slice(0, 4)));

  // Save for Web…：必须落在 web 模式
  await openMenu(page, '文件');
  await page.locator('[role=menuitem]', { hasText: /^Save for Web…$/ }).click();
  await page.waitForTimeout(1200);
  const mode = await page.locator('select').evaluateAll((nodes) =>
    nodes.map((n) => ({ value: n.value, options: [...n.options].map((o) => o.value) })).filter((n) => n.options.includes('web'))
  );
  console.log('Save for Web 落点:', JSON.stringify(mode));
  await page.screenshot({ path: '/data/tmp/opencode/shot-dev-saveforweb.png' });

  console.log('pageerror:', JSON.stringify(errs));
  await browser.close();
})();
