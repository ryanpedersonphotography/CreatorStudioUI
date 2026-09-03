#!/usr/bin/env node
/**
 * Browser proof for the writer's cockpit: real pointer drags in headless
 * Chromium. Proves the five regions, the separator states, drag + persist +
 * reload through the port, the toggles, the keyboard, the pinned top shelf,
 * and sidebars that hold their pixels when the window resizes.
 *
 *   pnpm verify:ui               against the dev server on :5180
 *   pnpm verify:ui --preview     build first; serves dist/ on :5181 and proves the production bundle
 *   BASE=http://… pnpm verify:ui anywhere else
 *
 * `--preview` matters: Tailwind's dev server also collects class names from
 * Vite's module graph, so a missing @source line still renders styled in dev
 * and only the built bundle goes bare.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const APP = new URL('../../../apps/studio/', import.meta.url).pathname;
const PREVIEW = process.argv.includes('--preview');
const BASE = process.env.BASE ?? (PREVIEW ? 'http://localhost:5181' : 'http://localhost:5180');
const PROJECT = 'default';
const key = (group) => `cs:layout:${PROJECT}:${group}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let preview = null;
if (PREVIEW) {
  if (!existsSync(`${APP}dist/index.html`)) {
    console.error('✗ --preview needs a build: run `pnpm build` first (apps/studio/dist/index.html missing)');
    process.exit(1);
  }
  preview = spawn('pnpm', ['exec', 'vite', 'preview', '--port', '5181', '--strictPort'], { cwd: APP, stdio: 'ignore' });
  const started = Date.now();
  for (;;) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() - started > 15000) {
      console.error(`✗ vite preview did not answer on ${BASE}`);
      preview.kill();
      process.exit(1);
    }
    await sleep(150);
  }
}
process.on('exit', () => preview?.kill());

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const box = (sel) => page.locator(sel).first().boundingBox();
const width = async (sel) => Math.round((await box(sel))?.width ?? -1);
const height = async (sel) => Math.round((await box(sel))?.height ?? -1);
const keys = () => page.evaluate(() => Object.keys(localStorage).sort());
const drag = async (sel, dx, dy) => {
  const b = await page.locator(sel).boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.mouse.up();
  await sleep(300);
};
const fresh = async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(300);
};
const button = (label) => page.getByRole('button', { name: `Toggle ${label}` });
const NAV_SEP = '[role="separator"][aria-label="Resize navigation"]';
const CTX_SEP = '[role="separator"][aria-label="Resize context shelf"]';

// 0 — identity: fail loudly rather than test another app on that port.
await page.goto(BASE, { waitUntil: 'networkidle' });
const title = await page.title();
if (!title.includes('Studio')) {
  console.error(`✗ ${BASE} is not the studio (title "${title}"); is another app on that port?`);
  await browser.close();
  process.exit(1);
}

// 1 — five regions, no errors
await fresh();
for (const id of ['top', 'nav', 'main', 'context', 'inspector']) {
  ok(`region #${id} renders`, (await page.locator(`#${id}`).count()) === 1);
}
ok('no console or page errors on load', errors.length === 0, errors.join(' | '));

// 2 — the separator speaks v4: data-separator, and the styles listen to it
const sepColor = () => page.locator(NAV_SEP).evaluate((el) => getComputedStyle(el).backgroundColor);
const idleState = await page.locator(NAV_SEP).getAttribute('data-separator');
const idleColor = await sepColor();
const nb = await page.locator(NAV_SEP).boundingBox();
await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
await sleep(150);
const hoverState = await page.locator(NAV_SEP).getAttribute('data-separator');
const hoverColor = await sepColor();
await page.mouse.down();
await page.mouse.move(nb.x + 30, nb.y + nb.height / 2, { steps: 4 });
const activeState = await page.locator(NAV_SEP).getAttribute('data-separator');
const activeColor = await sepColor();
await page.mouse.up();
await sleep(200);
ok(
  'separator reports inactive → hover → active through data-separator',
  idleState === 'inactive' && hoverState === 'hover' && activeState === 'active',
  `${idleState} → ${hoverState} → ${activeState}`,
);
ok(
  'hover and active are painted differently from idle',
  hoverColor !== idleColor && activeColor !== idleColor,
  `${idleColor} → ${hoverColor} → ${activeColor}`,
);
ok('no v2 attribute anywhere in the page', (await page.locator('[data-resize-handle-active]').count()) === 0);

// 3 — a drag persists under the port's key and survives a reload
await fresh();
const navBefore = await width('#nav');
await drag(NAV_SEP, 160, 0);
const navAfter = await width('#nav');
ok('dragging the navigation separator widens the nav', navAfter > navBefore + 100, `${navBefore} → ${navAfter}`);
const afterDrag = await keys();
ok('the body group is written under the port key', afterDrag.includes(key('body')), afterDrag.join(', '));
ok(
  'every key is ours; the library prefix never reaches storage',
  afterDrag.length > 0 && afterDrag.every((k) => k.startsWith(`cs:layout:${PROJECT}:`)),
  afterDrag.join(', '),
);
await page.reload({ waitUntil: 'networkidle' });
await sleep(300);
const navRestored = await width('#nav');
ok('nav width survives a reload', Math.abs(navRestored - navAfter) <= 1, `${navAfter} → ${navRestored}`);

// 4 — sidebars hold their pixels when the window resizes; the surface absorbs it
const mainBefore = await width('#main');
await page.setViewportSize({ width: 1200, height: 900 });
await sleep(300);
ok('nav keeps its pixel width across a window resize', Math.abs((await width('#nav')) - navRestored) <= 1, `${navRestored} → ${await width('#nav')}`);
ok('the main surface absorbed the change', (await width('#main')) < mainBefore - 100, `${mainBefore} → ${await width('#main')}`);
await page.setViewportSize({ width: 1440, height: 900 });
await sleep(300);

// 5 — the top shelf is pinned: token height, inert edge
const topHeight = await height('#top');
ok('top shelf sits at its token height', topHeight === 48, `${topHeight}`);
const tb = await page.locator('#top').boundingBox();
await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height - 1);
await page.mouse.down();
await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height + 80, { steps: 8 });
await page.mouse.up();
await sleep(200);
ok('dragging the top shelf edge moves it zero pixels', (await height('#top')) === topHeight, `${topHeight} → ${await height('#top')}`);

// 6 — toolbar toggles hide and show, and reopen at the restore size
await button('navigation').click();
await sleep(300);
ok(
  'toggle hides the nav and the button says so',
  (await width('#nav')) === 0 && (await button('navigation').getAttribute('aria-pressed')) === 'false',
  `${await width('#nav')}`,
);
await button('navigation').click();
await sleep(300);
const navShown = await width('#nav');
ok('toggle shows it again at its restore size', navShown > 100 && (await button('navigation').getAttribute('aria-pressed')) === 'true', `${navShown}`);
await button('inspector').click();
await sleep(300);
ok('toggle hides the inspector', (await width('#inspector')) === 0, `${await width('#inspector')}`);
await button('inspector').click();
await sleep(300);
ok('the inspector comes back', (await width('#inspector')) > 100, `${await width('#inspector')}`);

// 7 — drag the context shelf shut; the button notices, and reopens it at the token default
const contextBefore = await height('#context');
await drag(CTX_SEP, 0, 400);
ok('dragging the context shelf shut collapses it', (await height('#context')) === 0, `${contextBefore} → ${await height('#context')}`);
ok('the toolbar button noticed the drag', (await button('context shelf').getAttribute('aria-pressed')) === 'false');
await button('context shelf').click();
await sleep(300);
ok('the button reopens it at the token default, not the minimum', Math.abs((await height('#context')) - 180) <= 1, `${await height('#context')}`);

// 8 — keyboard: a focused separator shows it, and Enter toggles the drawer after it
await page.locator(CTX_SEP).focus();
ok('a focused separator reports focus through data-separator', (await page.locator(CTX_SEP).getAttribute('data-separator')) === 'focus');
await page.keyboard.press('Enter');
await sleep(300);
ok('Enter on the separator hides the context shelf', (await height('#context')) === 0, `${await height('#context')}`);
await page.keyboard.press('Enter');
await sleep(300);
ok('Enter again brings it back', (await height('#context')) > 100, `${await height('#context')}`);

// 9 — only cockpit groups in storage, all under our key
const finalKeys = await keys();
ok(
  'body and center groups are remembered, and nothing that is not a cockpit group',
  finalKeys.includes(key('body')) && finalKeys.includes(key('center')) && finalKeys.every((k) => ['root', 'body', 'center'].some((g) => k === key(g))),
  finalKeys.join(', '),
);
ok('still no console or page errors', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed ${PREVIEW ? '(production bundle)' : '(dev server)'}`);
process.exit(fail ? 1 : 0);
