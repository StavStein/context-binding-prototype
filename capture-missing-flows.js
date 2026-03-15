const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:8777/binding-platform-demo.html';
const OUT_DIR = path.join(__dirname, 'demo-screens', 'repeater-flows');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
async function snap(page, filename) {
  await delay(400);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
  console.log(`  ✓ ${filename}`);
}

function navToOptA() {
  return `selectPage(document.querySelector('.pp-sub[onclick*="Option A"]'), 'Option A · On Repeater');`;
}
function selectEl(id) {
  return `
    S.sel = '${id}';
    document.querySelectorAll('.sel').forEach(n => n.classList.remove('sel'));
    var n = document.getElementById('${id}');
    if (n) { n.classList.add('sel'); n.scrollIntoView({block:'center',behavior:'instant'}); }
    S.inspectorOpen = true;
    S.tab = 'settings';
    renderRP();
    renderActionBar();
  `;
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1366, height: 768, deviceScaleFactor: 2 }
  });
  const page = await browser.newPage();
  page.on('dialog', async dialog => { await dialog.accept(); });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await delay(1000);

  await page.evaluate(new Function(navToOptA()));
  await delay(500);

  // ========== FLOW 3: Filter & Sort ==========
  console.log('\nFlow 3: Filter & Sort');

  // Step 1: Select the pre-bound repeater, show settings with context
  await page.evaluate(new Function(selectEl('repeater-opta-prebound')));
  await delay(500);
  await snap(page, 'flow3-step1.png');

  // Step 2: Click "Edit context settings" to open context settings view
  await page.evaluate(() => {
    const bkey = S.sel + '|Items';
    const b = S.bindings[bkey];
    if (b && b.ctxId) {
      openCtxSettings(null, b.ctxId);
    }
  });
  await delay(500);
  await snap(page, 'flow3-step2.png');

  // Step 3: Open Sort dialog
  await page.evaluate(() => { openSfDialog('sort'); });
  await delay(500);
  // Add a sort rule
  await page.evaluate(() => {
    sfTempRules.push({ field: 'title', direction: 'asc' });
    renderSfBody();
  });
  await delay(300);
  await snap(page, 'flow3-step3.png');

  // Step 4: Apply sort, then open filter dialog
  await page.evaluate(() => { applySfDialog(); });
  await delay(300);
  await page.evaluate(() => { openSfDialog('filter'); });
  await delay(500);
  await page.evaluate(() => {
    sfTempRules.push({ field: 'description', operator: 'isNotEmpty' });
    renderSfBody();
  });
  await delay(300);
  await snap(page, 'flow3-step4.png');

  // Apply and close
  await page.evaluate(() => { applySfDialog(); });
  await delay(300);

  // ========== FLOW 6: Disconnect Items ==========
  console.log('\nFlow 6: Disconnect Items');

  // Reset state
  await page.evaluate(new Function(navToOptA()));
  await delay(500);

  // Step 1: Select bound repeater, show settings with Items bound
  await page.evaluate(new Function(selectEl('repeater-opta-prebound')));
  await delay(500);
  await snap(page, 'flow6-step1.png');

  // Step 2: Click on an inner element to show it's bound
  await page.evaluate(new Function(selectEl('el-opta-pb-title-1')));
  await delay(500);
  await snap(page, 'flow6-step2.png');

  // Step 3: Go back to repeater and disconnect
  await page.evaluate(new Function(selectEl('repeater-opta-prebound')));
  await delay(300);
  await page.evaluate(() => { disconnectRepCtx('repeater-opta-prebound'); });
  await delay(500);
  await snap(page, 'flow6-step3.png');

  console.log('\n✅ Missing flow screenshots re-captured from prototype!');
  await browser.close();
})().catch(err => { console.error('Error:', err.message); process.exit(1); });
