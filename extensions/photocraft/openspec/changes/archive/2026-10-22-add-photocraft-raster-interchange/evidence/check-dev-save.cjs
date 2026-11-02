/**
 * dev 宿主「文件 ▸ 保存」真浏览器复验：保存必须成对下载工程 + PNG（按文档名命名），
 * 且失败要有提示。复跑前把 <repo> / <fixtures> 换成本机路径。
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
  const unhandled = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:4488/', { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').first().setInputFiles(`${FIX}/sample.png`);
  await page.waitForTimeout(2500);

  // 改一笔内容，让「保存」有真实事情可做
  await page.locator('input[type=file]').first();
  await page.keyboard.press('Control+a').catch(() => {});
  const downloads = [];
  page.on('download', (d) => downloads.push(d.suggestedFilename()));
  await openMenu(page, '文件');
  await page.locator('[role=menuitem]', { hasText: /^保存$/ }).click();
  await page.waitForTimeout(2500);
  console.log('保存下载:', JSON.stringify(downloads));

  const alerts = await page.locator('[role=alert]').allInnerTexts().catch(() => []);
  console.log('失败提示:', JSON.stringify(alerts.map((s) => s.trim()).filter(Boolean)));

  // 导出为…：落在 export 模式并列出多格式
  await openMenu(page, '文件');
  await page.locator('[role=menuitem]', { hasText: /^导出为…$/ }).click();
  await page.waitForTimeout(1200);
  const mode = await page.locator('select').evaluateAll((nodes) =>
    nodes.map((n) => ({ value: n.value, options: [...n.options].map((o) => o.value) })).filter((n) => n.options.includes('web'))
  );
  const formats = await page.locator('select').evaluateAll((nodes) =>
    nodes.filter((n) => [...n.options].includes('web')).map((n) => n.value)
  );
  console.log('导出为落点:', JSON.stringify(mode), '格式数:', formats.length);
  const overflow = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  console.log('横向溢出:', JSON.stringify(overflow));
  console.log('pageerror:', JSON.stringify(errs));
  await browser.close();
})();
