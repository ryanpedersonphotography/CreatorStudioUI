/**
 * Golden slice: app → shell → LayoutStore port → local adapter → localStorage → reload.
 * Drags the first separator, reloads, and asserts the nav panel keeps its new width
 * and that the store wrote exactly the port's key.
 *
 *   pnpm dev            (in another pane)
 *   node tools/verify/persistence.mjs [http://localhost:5180]
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5180';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

const nav = page.locator('#nav');
const before = (await nav.boundingBox()).width;
const sep = page.getByRole('separator').first();
const box = await sep.boundingBox();
const x = box.x + box.width / 2;
const y = box.y + box.height / 2;
await page.mouse.move(x, y);
await page.mouse.down();
await page.mouse.move(x + 200, y, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(300);
const after = (await nav.boundingBox()).width;

const keys = await page.evaluate(() => Object.keys(localStorage));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const restored = (await nav.boundingBox()).width;
await browser.close();

const grew = after - before > 150;
const kept = Math.abs(restored - after) < 2;
const keyOk = keys.length === 1 && keys[0] === 'cs:layout:default:root';
console.log(JSON.stringify({ before, after, restored, keys, grew, kept, keyOk }));
if (!(grew && kept && keyOk)) {
  console.error('✖ persistence slice failed');
  process.exit(1);
}
console.log('✔ layout persisted through the port and restored after reload');
