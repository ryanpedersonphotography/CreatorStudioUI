#!/usr/bin/env node
/**
 * Browser proof for the writer's cockpit: real pointer drags in headless
 * Chromium. Proves the five regions, the separator states, drag + persist +
 * reload through the port, the toggles, the keyboard, the pinned top shelf,
 * and sidebars that hold their pixels while the window resizes (a stored layout is a share, not pixels).
 * Nothing vanishes: sidebars collapse to 48px rails (above the body's minimum width) and shelves to
 * 32px strips, each a landmark with its way back; focus travels with the swap.
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
/** The three remembered collapsed bits, nav|context|inspector, '-' where nothing is written. */
const bits = () => page.evaluate(() => ['nav', 'context', 'inspector'].map((r) => localStorage.getItem(`cs:collapsed:default:${r}`) ?? '-').join(''));
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
/** The library's double-click reset; raw mouse, since the 1px separator fails Playwright's hit test. */
const doubleClick = async (sel) => {
  const b = await page.locator(sel).boundingBox();
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
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

ok('a plain mount remembers nothing: no collapsed bits before any interaction', !(await keys()).some((k) => k.startsWith('cs:collapsed:')), (await keys()).join(', '));

// 1b — a window squeeze is not the user collapsing anything. Below ~700px the body cannot hold
// nav + centre + inspector and the library rails the nav; that must not be recorded as intent, and
// a reload on a wide window must bring the nav back open.
await page.setViewportSize({ width: 600, height: 900 });
await sleep(400);
ok('a 600px window squeezes the nav to its rail', (await width('#nav')) === 48, `${await width('#nav')}`);
ok('and writes no collapsed bit', !(await bits()).includes('1'), await bits());
await page.setViewportSize({ width: 1440, height: 900 });
await sleep(400);
await page.reload({ waitUntil: 'networkidle' });
await sleep(400);
ok('after the squeeze, a reload on a wide window mounts the nav open and pressed (at its minimum: the squeezed share is what the store kept)', (await width('#nav')) >= 160 && (await button('Navigation').getAttribute('aria-pressed')) === 'true', `${await width('#nav')}px`);
await fresh();

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
  afterDrag.length > 0 && afterDrag.every((k) => k.startsWith(`cs:layout:${PROJECT}:`) || k.startsWith(`cs:collapsed:${PROJECT}:`)),
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

// 5 — the top shelf is pinned: token height, an edge that refuses, and a strip when collapsed
const topHeight = await height('#top');
ok('top shelf sits at its token height', topHeight === 48, `${topHeight}`);
ok('the shelf edge is a disabled separator', (await page.locator(TOP_SEP).getAttribute('data-separator')) === 'disabled');
await drag(TOP_SEP, 0, 80);
ok('dragging the shelf edge moves it zero pixels (pinned by min = max; disabled is proven above)', (await height('#top')) === topHeight, `${topHeight} → ${await height('#top')}`);
await button('Top shelf').click();
await sleep(300);
ok(
  'the toolbar collapses its own shelf to the strip, which carries the way back',
  (await height('#top')) === 32 && (await button('Expand top shelf').count()) === 1,
  `${await height('#top')}`,
);
await drag(TOP_SEP, 0, 80);
ok('the collapsed shelf edge refuses a drag too', (await height('#top')) === 32, `${await height('#top')}`);
await button('Expand top shelf').click();
await sleep(300);
ok(
  'the strip brings the shelf back at its token height',
  (await height('#top')) === 48 && (await button('Top shelf').getAttribute('aria-pressed')) === 'true',
  `${await height('#top')}`,
);

// 5b — a shelf stored as a share of a tall window must not mount collapsed on a short one.
// The root group is session-only, so a stale stored share is ignored; this seeds one to prove it.
{
  const short = await browser.newContext({ viewport: { width: 1440, height: 740 } });
  await short.addInitScript(() => localStorage.setItem('cs:layout:default:root', '{"top":5.339,"body":94.661}'));
  const page2 = await short.newPage();
  await page2.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(300);
  const topShort = Math.round((await page2.locator('#top').boundingBox())?.height ?? -1);
  const toolbar = await page2.getByRole('button', { name: 'Top shelf', exact: true }).count();
  ok('a short window mounts the shelf expanded with its toolbar, whatever share an older window stored', topShort === 48 && toolbar === 1, `${topShort}px, ${toolbar} toolbar`);
  await short.close();
}

// 5c — the same clamp hits any collapsible region. Nav dragged to its 160px minimum on a 1440px
// window stores 11.127%: 100px on a 900px window, under the 104px collapse midpoint, so the library
// mounts it as a rail. The region's remembered collapsed bit tells a clamp from a collapse.
{
  const draggedNarrow = '{"nav":11.127,"center":64.873,"inspector":24}';
  const clamped = await browser.newContext({ viewport: { width: 900, height: 800 } });
  await clamped.addInitScript((body) => localStorage.setItem('cs:layout:default:body', body), draggedNarrow);
  const page3 = await clamped.newPage();
  await page3.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(300);
  const navClamped = Math.round((await page3.locator('#nav').boundingBox())?.width ?? -1);
  const pressed = await page3.getByRole('button', { name: 'Navigation', exact: true }).getAttribute('aria-pressed');
  const rails = await page3.getByRole('button', { name: 'Expand navigation', exact: true }).count();
  ok('a nav the user left open at its minimum mounts open on a narrower window, not as a rail', navClamped === 160 && pressed === 'true' && rails === 0, `${navClamped}px, pressed=${pressed}, ${rails} rail`);
  await clamped.close();
  const remembered = await browser.newContext({ viewport: { width: 900, height: 800 } });
  await remembered.addInitScript((body) => { localStorage.setItem('cs:layout:default:body', body); localStorage.setItem('cs:collapsed:default:nav', '1'); }, draggedNarrow);
  const page4 = await remembered.newPage();
  await page4.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(300);
  const navRemembered = Math.round((await page4.locator('#nav').boundingBox())?.width ?? -1);
  ok('a nav the user collapsed stays a rail: memory only ever reopens', navRemembered === 48, `${navRemembered}px`);
  await remembered.close();
}

// 6 — sidebars collapse to rails; a rail holds its pixels; expand puts back exactly what collapse took
await button('Navigation').click();
await sleep(300);
ok(
  'the nav collapses to its rail, not to nothing, and the button says so',
  (await width('#nav')) === 48 && (await button('Navigation').getAttribute('aria-pressed')) === 'false',
  `${await width('#nav')}`,
);
ok('the rail is a landmark that carries the way back', (await page.locator('#nav').getByRole('region', { name: 'Navigation' }).getByRole('button', { name: 'Expand navigation' }).count()) === 1);
await page.setViewportSize({ width: 1200, height: 900 });
await sleep(300);
ok('a rail holds its pixels across a window resize', (await width('#nav')) === 48, `${await width('#nav')}`);
await page.setViewportSize({ width: 1440, height: 900 });
await sleep(300);
await button('Expand navigation').click();
await sleep(300);
const navShown = await width('#nav');
ok(
  'expanding from the rail restores the width the writer had dragged, not the default',
  Math.abs(navShown - navRestored) <= 1 && (await button('Navigation').getAttribute('aria-pressed')) === 'true',
  `${navRestored} → ${navShown}`,
);
const inspectorBefore = await width('#inspector');
await button('Inspector').click();
await sleep(300);
ok('the inspector collapses to its rail', (await width('#inspector')) === 48, `${await width('#inspector')}`);
await button('Expand inspector').click();
await sleep(300);
ok('the inspector rail brings it back at exactly the width it had', Math.abs((await width('#inspector')) - inspectorBefore) <= 1, `${inspectorBefore} → ${await width('#inspector')}`);

// 6a — a user layout change records only a reopen. A resize key that grows a panel and a
// double-click reset that reopens it clear the bit to 0; a drag or reset that rails a *sibling*
// records nothing for that sibling, so a window's collateral never survives as a rail the user
// never asked for.
await fresh();
ok('fresh: no bits before any gesture', (await bits()) === '---', await bits());
await page.locator(NAV_SEP).focus();
await page.keyboard.press('ArrowRight');
await sleep(300);
ok('a resize key that grows the nav records the reopen', (await bits())[0] === '0' && (await width('#nav')) > 288, `${await bits()} at ${await width('#nav')}px`);
await button('Navigation').click();
await sleep(300);
ok('toolbar collapse records the hide: bit 1', (await bits())[0] === '1', await bits());
await doubleClick(NAV_SEP);
ok('double-clicking the separator resets the nav to its default width and clears the bit', Math.abs((await width('#nav')) - 288) <= 1 && (await bits())[0] === '0', `${await width('#nav')}px, ${await bits()}`);
await fresh();

// 6a′ — the collateral case, reproduced. On a 900px-tall-enough but narrow window the nav reset
// steals space from the inspector and rails it; that squeeze must not be recorded as the user
// hiding the inspector, and a wide reload must bring the inspector back.
{
  const narrow = await browser.newContext({ viewport: { width: 760, height: 900 } });
  const p2 = await narrow.newPage();
  await p2.goto(BASE, { waitUntil: 'networkidle' });
  await p2.evaluate(() => localStorage.clear());
  await p2.reload({ waitUntil: 'networkidle' });
  await sleep(300);
  const nb = await p2.locator(NAV_SEP).boundingBox();
  await p2.mouse.dblclick(nb.x + nb.width / 2, nb.y + nb.height / 2);
  await sleep(300);
  const inspRailed = Math.round((await p2.locator('#inspector').boundingBox()).width);
  const inspBit = await p2.evaluate(() => localStorage.getItem('cs:collapsed:default:inspector'));
  ok('a nav reset that collaterally rails the inspector records no intent for the inspector', inspBit !== '1', `inspector=${inspRailed}px bit=${inspBit}`);
  await p2.setViewportSize({ width: 1440, height: 900 });
  await sleep(300);
  await p2.reload({ waitUntil: 'networkidle' });
  await sleep(400);
  const inspWide = Math.round((await p2.locator('#inspector').boundingBox()).width);
  ok('and a wide reload brings the collaterally-railed inspector back open', inspWide >= 200 && (await p2.getByRole('button', { name: 'Inspector', exact: true }).getAttribute('aria-pressed')) === 'true', `${inspWide}px`);
  await narrow.close();
}
await fresh();

// 6b — a rail can be dragged open, and the toolbar's expand then returns to that dragged width
await button('Navigation').click();
await sleep(300);
await drag(NAV_SEP, 200, 0);
const navDraggedOpen = await width('#nav');
ok('dragging a rail outward expands it and the button follows', navDraggedOpen > 160 && (await button('Navigation').getAttribute('aria-pressed')) === 'true', `48 → ${navDraggedOpen}`);
await button('Navigation').click();
await sleep(300);
await button('Navigation').click();
await sleep(300);
ok('collapse then expand from the toolbar returns to the dragged-open width', Math.abs((await width('#nav')) - navDraggedOpen) <= 1, `${navDraggedOpen} → ${await width('#nav')}`);

// 7 — the context shelf: a drag shut lands on the strip; the strip reopens at the token default; a button collapse reopens exactly
const contextBefore = await height('#context');
await drag(CTX_SEP, 0, 400);
ok('dragging the context shelf shut lands on its strip', (await height('#context')) === 32, `${contextBefore} → ${await height('#context')}`);
ok('a drag shut is sizing, not a hide: it records no intent bit', (await bits())[1] !== '1', await bits());
ok('the toolbar button noticed the drag', (await button('Context shelf').getAttribute('aria-pressed')) === 'false');
await button('Expand context shelf').click();
await sleep(300);
ok('after a drag shut, the strip reopens it at the token default, not the minimum', Math.abs((await height('#context')) - 180) <= 1, `${await height('#context')}`);
ok('reopening records the open state: no stale collapsed bit', (await bits())[1] !== '1', await bits());
await drag(CTX_SEP, 0, -100);
const contextDragged = await height('#context');
await button('Context shelf').click();
await sleep(300);
ok('the toolbar collapses the shelf to its strip', (await height('#context')) === 32, `${await height('#context')}`);
await button('Context shelf').click();
await sleep(300);
ok('after a button collapse, expand brings back the dragged height exactly', Math.abs((await height('#context')) - contextDragged) <= 1, `${contextDragged} → ${await height('#context')}`);

// 7b — compact states survive a reload; the shelf's does not, on purpose
for (const name of ['Navigation', 'Context shelf', 'Inspector', 'Top shelf']) {
  await button(name).click();
  await sleep(200);
}
await page.reload({ waitUntil: 'networkidle' });
await sleep(300);
ok(
  'rails and the context strip come back from storage after a reload',
  (await width('#nav')) === 48 && (await height('#context')) === 32 && (await width('#inspector')) === 48,
  `${await width('#nav')} / ${await height('#context')} / ${await width('#inspector')}`,
);
ok(
  'their expand controls come back with them',
  (await page.getByRole('button', { name: /^Expand (navigation|context shelf|inspector)$/ }).count()) === 3,
);
ok('the collapses were remembered as intent under their own keys', (await bits()) === '111', await bits());
ok(
  'the top shelf mounts expanded after a reload: its collapse is session-scoped',
  (await height('#top')) === 48 && (await button('Top shelf').count()) === 1,
  `${await height('#top')}`,
);
for (const name of ['Expand navigation', 'Expand context shelf', 'Expand inspector']) {
  await button(name).click();
  await sleep(200);
}
ok('and the reopens were remembered too', (await bits()) === '000', await bits());

// 8 — keyboard: Tab reaches the separators in order, focus is painted, Enter toggles the drawer
await page.locator('#top button').last().focus();
await page.keyboard.press('Tab');
ok('Tab from the toolbar lands on the navigation separator, skipping the disabled shelf edge', (await focusedLabel()) === 'Resize navigation', await focusedLabel());
ok('a focused separator reports focus through data-separator', (await page.locator(NAV_SEP).getAttribute('data-separator')) === 'focus');
const ring = await outline(NAV_SEP);
ok('keyboard focus paints a ring', ring.style !== 'none' && ring.width >= 1, `${ring.style} ${ring.width}px`);
const nbNow = await box(NAV_SEP); // re-read: the drags above moved it
await page.mouse.move(nbNow.x + nbNow.width / 2, nbNow.y + nbNow.height / 2 + 200);
await sleep(150);
const ringUnderHover = await outline(NAV_SEP);
ok('the ring survives the pointer hovering the same separator', ringUnderHover.style !== 'none' && ringUnderHover.width >= 1, `${ringUnderHover.style} ${ringUnderHover.width}px`);
await page.keyboard.press('Tab');
ok('the next Tab reaches the context shelf separator', (await focusedLabel()) === 'Resize context shelf', await focusedLabel());
// Away from the default first, so "exactly" cannot be satisfied by a fallback to it.
await drag(CTX_SEP, 0, -60);
await page.locator(CTX_SEP).focus();
const contextBeforeEnter = await height('#context');
ok('the shelf sits off its default before the keyboard round trip', Math.abs(contextBeforeEnter - 180) > 20, `${contextBeforeEnter}px`);
await page.keyboard.press('Enter');
await sleep(300);
ok('Enter on the separator collapses the context shelf to its strip', (await height('#context')) === 32, `${await height('#context')}`);
ok('the app\'s Enter handler collapses through the toggle, so it is remembered', (await bits())[1] === '1', await bits());
await page.keyboard.press('Enter');
await sleep(300);
ok('Enter again brings it back at exactly the height it had', Math.abs((await height('#context')) - contextBeforeEnter) <= 1, `${contextBeforeEnter} → ${await height('#context')}`);

// 8c — focus travels with a region whose content swaps under the control that was pressed
const focusWithin = (sel) => page.evaluate((s) => document.querySelector(s)?.contains(document.activeElement) === true, sel);
await button('Top shelf').focus();
await page.keyboard.press('Enter');
await sleep(300);
ok('collapsing the shelf from its own toolbar moves focus to the strip control', (await focusedLabel()) === 'Expand top shelf', await focusedLabel());
await page.keyboard.press('Enter');
await sleep(300);
ok('expanding from the strip moves focus into the returned toolbar', (await focusedLabel()) === 'Top shelf', await focusedLabel());
await button('Navigation').focus();
await page.keyboard.press('Enter');
await sleep(300);
ok('collapsing nav from the toolbar keeps focus on the toolbar button', (await focusedLabel()) === 'Navigation' && (await width('#nav')) === 48, await focusedLabel());
await button('Expand navigation').focus();
await page.keyboard.press('Enter');
await sleep(300);
const focusedLandmark = () => page.evaluate(() => { const a = document.activeElement; return `${a?.tagName}[${a?.getAttribute('aria-label')}]`; });
ok('expanding from the rail keeps focus inside the nav, on its landmark', (await focusedLandmark()) === 'SECTION[Navigation]' && (await width('#nav')) > 100, `${await focusedLandmark()} at ${await width('#nav')}px`);

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
  'body and center groups are remembered, and every key names a cockpit group (a conditional set may extend it) or a region\'s collapsed bit',
  finalKeys.includes(key('body')) &&
    finalKeys.includes(key('center')) &&
    finalKeys.every((k) => k.startsWith('cs:collapsed:default:') || ['root', 'body', 'center'].some((g) => k === key(g) || k.startsWith(`${key(g)}:`))),
  finalKeys.join(', '),
);
ok('still no console or page errors', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(`\n${pass} passed, ${fail} failed ${PREVIEW ? `(production bundle built ${statSync(`${APP}dist/index.html`).mtime.toISOString()})` : '(dev server)'}`);
process.exit(fail ? 1 : 0);
