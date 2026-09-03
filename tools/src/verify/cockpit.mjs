#!/usr/bin/env node
/**
 * Browser proof for the writer's cockpit: real pointer drags in headless
 * Chromium. Proves the five regions, the separator states, drag + persist +
 * reload through the port, the toggles, the keyboard, the pinned top shelf,
 * and sidebars that hold their pixels while the window resizes (a stored layout is a share, not pixels).
 *
 *   pnpm verify:ui               against the dev server on :5180
 *   pnpm verify:ui --preview     serves an existing apps/studio/dist on :5181 (run `pnpm build` first; it does not build)
 *   BASE=http://… pnpm verify:ui anywhere else
 *
 * `--preview` matters: Tailwind's dev server also collects class names from
 * Vite's module graph, so a missing @source line still renders styled in dev
 * and only the built bundle goes bare.
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
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
const button = (name) => page.getByRole('button', { name, exact: true });
const focusedLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '');
const outline = (sel) => page.locator(sel).evaluate((el) => { const cs = getComputedStyle(el); return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }; });
const NAV_SEP = '[role="separator"][aria-label="Resize navigation"]';
const CTX_SEP = '[role="separator"][aria-label="Resize context shelf"]';
const TOP_SEP = '#top + [role="separator"]'; // nameless static separator right after the shelf

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

// 5 — the top shelf is pinned: token height, and its edge is a separator that refuses
const topHeight = await height('#top');
ok('top shelf sits at its token height', topHeight === 48, `${topHeight}`);
ok('the shelf edge is a disabled separator', (await page.locator(TOP_SEP).getAttribute('data-separator')) === 'disabled');
await drag(TOP_SEP, 0, 80);
ok('dragging the shelf edge moves it zero pixels (pinned by min = max; disabled is proven above)', (await height('#top')) === topHeight, `${topHeight} → ${await height('#top')}`);

// 6 — toolbar toggles hide and show, and show puts back exactly what hide took away
await button('Navigation').click();
await sleep(300);
ok(
  'toggle hides the nav and the button says so',
  (await width('#nav')) === 0 && (await button('Navigation').getAttribute('aria-pressed')) === 'false',
  `${await width('#nav')}`,
);
await button('Navigation').click();
await sleep(300);
const navShown = await width('#nav');
ok(
  'toggle shows it again at the width the writer had dragged, not the default',
  Math.abs(navShown - navRestored) <= 1 && (await button('Navigation').getAttribute('aria-pressed')) === 'true',
  `${navRestored} → ${navShown}`,
);
await button('Inspector').click();
await sleep(300);
ok('toggle hides the inspector', (await width('#inspector')) === 0, `${await width('#inspector')}`);
await button('Inspector').click();
await sleep(300);
ok('the inspector comes back', (await width('#inspector')) > 100, `${await width('#inspector')}`);

// 7 — the context shelf: a drag shut reopens at the token default; a button hide reopens exactly
const contextBefore = await height('#context');
await drag(CTX_SEP, 0, 400);
ok('dragging the context shelf shut collapses it', (await height('#context')) === 0, `${contextBefore} → ${await height('#context')}`);
ok('the toolbar button noticed the drag', (await button('Context shelf').getAttribute('aria-pressed')) === 'false');
await button('Context shelf').click();
await sleep(300);
ok('after a drag shut, the button reopens it at the token default, not the minimum', Math.abs((await height('#context')) - 180) <= 1, `${await height('#context')}`);
await drag(CTX_SEP, 0, -100);
const contextDragged = await height('#context');
await button('Context shelf').click();
await sleep(300);
await button('Context shelf').click();
await sleep(300);
ok('after a button hide, show brings back the dragged height exactly', Math.abs((await height('#context')) - contextDragged) <= 1, `${contextDragged} → ${await height('#context')}`);

// 8 — keyboard: Tab reaches the separators in order, focus is painted, Enter toggles the drawer
await page.locator('#top button').last().focus();
await page.keyboard.press('Tab');
ok('Tab from the toolbar lands on the navigation separator, skipping the disabled shelf edge', (await focusedLabel()) === 'Resize navigation', await focusedLabel());
ok('a focused separator reports focus through data-separator', (await page.locator(NAV_SEP).getAttribute('data-separator')) === 'focus');
const ring = await outline(NAV_SEP);
ok('keyboard focus paints a ring', ring.style !== 'none' && ring.width >= 1, `${ring.style} ${ring.width}px`);
const nbNow = await box(NAV_SEP); // re-read: the drag in section 3 moved it
await page.mouse.move(nbNow.x + nbNow.width / 2, nbNow.y + nbNow.height / 2 + 200);
await sleep(150);
const ringUnderHover = await outline(NAV_SEP);
ok('the ring survives the pointer hovering the same separator', ringUnderHover.style !== 'none' && ringUnderHover.width >= 1, `${ringUnderHover.style} ${ringUnderHover.width}px`);
await page.keyboard.press('Tab');
ok('the next Tab reaches the context shelf separator', (await focusedLabel()) === 'Resize context shelf', await focusedLabel());
await page.keyboard.press('Enter');
await sleep(300);
ok('Enter on the separator hides the context shelf', (await height('#context')) === 0, `${await height('#context')}`);
await page.keyboard.press('Enter');
await sleep(300);
ok('Enter again brings it back', (await height('#context')) > 100, `${await height('#context')}`);

// 8b — a layout stored at one window size reopens at another as a share of the window, not as pixels.
// The library persists percentages; "holds its pixels" is a promise about live resizes only. A second
// context seeded with this one's storage keeps a live resize from re-persisting first.
{
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  const bodyWide = await width('#body');
  const navWide = await width('#nav');
  const narrow = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  await narrow.addInitScript((json) => {
    for (const [k, v] of Object.entries(JSON.parse(json))) localStorage.setItem(k, v);
  }, stored);
  const page2 = await narrow.newPage();
  await page2.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(300);
  const w2 = async (sel) => Math.round((await page2.locator(sel).boundingBox())?.width ?? -1);
  const expected = Math.round((navWide / bodyWide) * (await w2('#body')));
  const navNarrow = await w2('#nav');
  ok(
    'a stored layout reopens at a new window size as the same share (percentages, by design)',
    Math.abs(navNarrow - expected) <= 2,
    `${navWide}px of ${bodyWide} at 1440 → ${navNarrow}px at 1000, expected ${expected}`,
  );
  await narrow.close();
}

// 9 — only cockpit groups in storage, all under our key
const finalKeys = await keys();
ok(
  'body and center groups are remembered, and every key names a cockpit group (a conditional set may extend it)',
  finalKeys.includes(key('body')) &&
    finalKeys.includes(key('center')) &&
    finalKeys.every((k) => ['root', 'body', 'center'].some((g) => k === key(g) || k.startsWith(`${key(g)}:`))),
  finalKeys.join(', '),
);
ok('still no console or page errors', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed ${PREVIEW ? `(production bundle built ${statSync(`${APP}dist/index.html`).mtime.toISOString()})` : '(dev server)'}`);
process.exit(fail ? 1 : 0);
