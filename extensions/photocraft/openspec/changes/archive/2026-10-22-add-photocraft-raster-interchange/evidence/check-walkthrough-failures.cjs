/**
 * 4.2 失败场景复跑：伪扩展名、损坏字节、改参数撤预览、超预算
 * change: 2026-10-22-add-photocraft-raster-interchange
 *
 * 复跑前把 <repo> / <fixtures> 换成本机路径（同 check-walkthrough-main.cjs）。
 * 前置：真实 WASM 产物已构建，dev 宿主在 4488 端口运行。
 */
const { chromium } = require(require.resolve('@playwright/test', { paths: ['<repo>/web'] }));
const FIX = '<fixtures>';

async function openMenu(page, label) {
  await page.locator('.photo-editor__menubar button', { hasText: new RegExp(`^${label}$`) }).first().click();
  await page.waitForTimeout(350);
}
async function openPanel(page) {
  await openMenu(page, '文件');
  await page.locator('[role=menuitem]', { hasText: /^导出为…$/ }).click();
  await page.waitForTimeout(1100);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errs = [];
  page.on('pageerror', (error) => errs.push(String(error)));
  await page.goto('http://127.0.0.1:4488/', { waitUntil: 'networkidle' });
  const out = {};

  // 1) 伪扩展名：PNG 字节命名为 .tif，必须仍按签名识别为 png 并成功打开
  await page.locator('input[type=file]').first().setInputFiles(`${FIX}/fake.tif`);
  await page.waitForTimeout(1800);
  out.fakeExtension = {
    documentShown: (await page.locator('.photo-editor').count()) > 0,
    alerts: (await page.locator('[role=alert], .dev-error').allInnerTexts().catch(() => []))
      .map((text) => text.trim()).filter(Boolean).slice(0, 2)
  };

  // 2) 损坏字节：拒绝并给出内核原因
  await page.locator('input[type=file]').first().setInputFiles(`${FIX}/broken.png`);
  await page.waitForTimeout(1800);
  out.broken = (await page.locator('[role=alert], .dev-error').allInnerTexts().catch(() => []))
    .map((text) => text.trim()).filter(Boolean).slice(0, 2);

  // 3) 改参数必须撤下旧预览（不把上一次结果当成新设置的结果）
  await page.locator('input[type=file]').first().setInputFiles(`${FIX}/gradient.png`);
  await page.waitForTimeout(1800);
  await openPanel(page);
  await page.locator('button', { hasText: /^真实预览$/ }).click();
  await page.waitForTimeout(1000);
  out.previewBefore = await page.locator('[data-io-preview="true"]').count();
  await page.locator('label', { hasText: /^格式/ }).locator('select').first().selectOption('webp');
  await page.waitForTimeout(600);
  out.previewAfterFormatChange = await page.locator('[data-io-preview="true"]').count();

  // 4) 超预算：宽度 20000 → 不显示目标尺寸、不产出预览
  await page.locator('label', { hasText: /^宽度/ }).locator('input').first().fill('20000');
  await page.waitForTimeout(700);
  out.overBudget = {
    targetSizeShown: await page.locator('[data-io-target-size]').count(),
    previewShown: await page.locator('[data-io-preview="true"]').count()
  };
  await page.locator('button', { hasText: /^真实预览$/ }).click();
  await page.waitForTimeout(900);
  out.overBudget.previewAfterClick = await page.locator('[data-io-preview="true"]').count();
  out.overBudget.message = (await page.locator('[role=alert], .photo-editor__brush-note--error').allInnerTexts().catch(() => []))
    .map((text) => text.trim()).filter(Boolean).slice(0, 2);

  out.pageerrors = errs;
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})();
