#!/usr/bin/env node
/**
 * Browser proof for the top shelf's menu bar, at the design viewport: a
 * MacBook Pro 14" (1512 × 982 logical px at 2×). Proves the bar, the portaled
 * menus (unclipped, skinned through the :root contract), hover-switch,
 * click-to-close, Escape, keyboard travel and typeahead, the indicator gutter,
 * the ⌃⌘ shortcuts, disabled seams, the theme (persisted), the focus handoff
 * from a menu item that collapses the shelf, Reset layout, and the geometry
 * of the bar. None of it passes with the feature absent.
 *
 * See lib.mjs for the flags (`--preview`, `BASE`) and all.mjs for the whole set.
 */
import { cli, isMain } from './lib.mjs';

export const OPTIONS = { label: 'menubar', viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 };

export async function run({ page, ok, sleep, errors, BASE }) {
  const box = (loc) => loc.boundingBox();
  const width = async (sel) => Math.round((await box(page.locator(sel).first()))?.width ?? -1);
  const height = async (sel) => Math.round((await box(page.locator(sel).first()))?.height ?? -1);
  const fresh = async () => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(300);
  };
  const bar = () => page.locator('#top [role="menubar"]');
  const trigger = (name) => bar().getByRole('menuitem', { name, exact: true });
  const menus = () => page.locator('[role="menu"]');
  /** The one open top-level menu (a submenu is a second [role=menu]). */
  const menu = () => page.locator('[role="menu"]:not([data-menubar-sub])');
  const item = (name) => menu().getByRole('menuitemcheckbox', { name, exact: true }).or(menu().getByRole('menuitem', { name, exact: true }));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const focusedLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '');
  const state = (loc) => loc.getAttribute('data-state');
  const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const themeKey = () => page.evaluate(() => localStorage.getItem('cs:theme'));
  const outline = (loc) =>
    loc.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
    });
  const openView = async () => {
    await trigger('View').click();
    await menu().waitFor({ state: 'visible' });
    await sleep(150);
  };
  const closeAll = async () => {
    await page.keyboard.press('Escape');
    await sleep(150);
  };

  // 1 — the bar lives in the top shelf
  await fresh();
  ok('#top holds one menubar', (await bar().count()) === 1);
  const titles = (await bar().getByRole('menuitem').allTextContents()).join('|');
  ok('its titles are File, Edit, View, in that order', titles === 'File|Edit|View', titles);
  ok('the region toggles are still there, to its right', (await button('Navigation').count()) === 1 && (await box(button('Navigation'))).x > (await box(trigger('View'))).x);
  ok('no console or page errors on load', errors.length === 0, errors.join(' | '));

  // 2 — click a title: the menu displays under it, in a body portal, unclipped and skinned
  await openView();
  const tb = await box(trigger('View'));
  const mb = await box(menu());
  ok('View opens a menu', (await menus().count()) === 1 && (await state(trigger('View'))) === 'open');
  ok(
    'the menu sits under its title and inside the viewport',
    mb.y >= tb.y + tb.height - 1 && Math.abs(mb.x - tb.x) <= 2 && mb.x + mb.width <= 1512 && mb.y + mb.height <= 982,
    `title ${Math.round(tb.x)},${Math.round(tb.y + tb.height)} menu ${Math.round(mb.x)},${Math.round(mb.y)} ${Math.round(mb.width)}×${Math.round(mb.height)}`,
  );
  ok('the menu is portaled out of the clipping shelf', (await page.locator('#top [role="menu"]').count()) === 0);
  const unclipped = await menu().evaluate((m) => {
    const items = m.querySelectorAll('[role^="menuitem"]');
    const last = items[items.length - 1];
    const r = last.getBoundingClientRect();
    return last.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  });
  ok('elementFromPoint at the last item is that item: nothing clips or covers the menu', unclipped);
  const bg = await menu().evaluate((m) => getComputedStyle(m).backgroundColor);
  ok('the menu is painted: the :root contract reached the portal', bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent', bg);
  const zIndex = await menu().evaluate((m) => getComputedStyle(m).zIndex);
  ok('the menu stacks above a focused separator (z-index ≥ 50)', Number(zIndex) >= 50, zIndex);

  // 3 — hover-switch, click-to-close, Escape, outside click, loop, focus ring
  await trigger('File').hover();
  await sleep(200);
  ok('hovering File while View is open switches to File', (await state(trigger('File'))) === 'open' && (await state(trigger('View'))) === 'closed');
  await trigger('File').click();
  await sleep(200);
  ok('clicking the open title closes it', (await menus().count()) === 0 && (await state(trigger('File'))) === 'closed');
  await trigger('File').click();
  await menu().waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await sleep(200);
  ok('Escape closes the menu and focuses its title', (await menus().count()) === 0 && (await focusedLabel()) === 'File', await focusedLabel());
  await openView();
  await page.locator('#main').click({ position: { x: 200, y: 200 } });
  await sleep(200);
  ok('clicking the manuscript closes the menu', (await menus().count()) === 0);
  await trigger('File').focus();
  await page.keyboard.press('ArrowLeft');
  await sleep(100); // roving focus moves on a timer
  ok('ArrowLeft from File wraps to View: the bar loops', (await focusedLabel()) === 'View', await focusedLabel());
  await page.locator('#top section').focus(); // the shelf's landmark (tabindex -1): Tab from there enters the bar
  await page.keyboard.press('Tab');
  const ringOn = await focusedLabel();
  const ring = await outline(page.locator('#top [role="menuitem"]:focus'));
  ok('Tab into the bar lands on a title and paints a focus ring', ['File', 'Edit', 'View'].includes(ringOn) && ring.style !== 'none' && ring.width >= 1, `${ringOn}: ${ring.style} ${ring.width}px`);

  // 4 — View's check items are the regions; the gutter shows the state; the ⌃⌘ shortcuts work
  await openView();
  const nav = () => item('Navigation');
  const gutter = async () => ((await nav().locator('[data-menubar="indicator"]').textContent()) ?? '').trim();
  ok('Navigation is checked while the nav is open, and its gutter shows the mark', (await nav().getAttribute('aria-checked')) === 'true' && (await gutter()) !== '', `"${await gutter()}"`);
  ok(
    'Navigation carries its shortcut for assistive tech and for the eye',
    (await nav().getAttribute('aria-keyshortcuts')) === 'Control+Meta+B' && (await nav().locator('[data-menubar="shortcut"]').textContent()) === '⌃⌘B',
  );
  await nav().click();
  await sleep(300);
  ok('choosing Navigation rails the nav and the toolbar button says so', (await width('#nav')) === 48 && (await button('Navigation').getAttribute('aria-pressed')) === 'false', `${await width('#nav')}px`);
  ok('the menu closed on select', (await menus().count()) === 0);
  await openView();
  ok('reopened, Navigation is unchecked with an empty gutter', (await nav().getAttribute('aria-checked')) === 'false' && (await gutter()) === '', `"${await gutter()}"`);
  await nav().click();
  await sleep(300);
  ok('choosing it again reopens the nav', (await width('#nav')) > 100, `${await width('#nav')}px`);
  for (const [combo, sel, size, closed] of [
    ['Control+Meta+B', '#nav', width, 48],
    ['Control+Meta+J', '#context', height, 32],
    ['Control+Meta+I', '#inspector', width, 48],
  ]) {
    const before = await size(sel);
    await page.keyboard.press(combo);
    await sleep(300);
    const shut = await size(sel);
    await page.keyboard.press(combo);
    await sleep(300);
    const back = await size(sel);
    ok(`${combo} collapses ${sel} to ${closed}px and again brings it back`, shut === closed && Math.abs(back - before) <= 1, `${before} → ${shut} → ${back}`);
  }
  await page.keyboard.press('Control+Meta+T');
  await sleep(300);
  ok('⌃⌘T collapses the top shelf to its strip', (await height('#top')) === 32 && (await button('Expand top shelf').count()) === 1, `${await height('#top')}px`);
  await page.keyboard.press('Control+Meta+T');
  await sleep(300);
  ok('⌃⌘T brings it back though the toolbar was unmounted: the bindings live outside the shelf', (await height('#top')) === 48 && (await bar().count()) === 1, `${await height('#top')}px`);

  // 5 — keyboard travel, open with the first item highlighted, typeahead on the label
  await trigger('File').focus();
  await page.keyboard.press('ArrowRight');
  await sleep(100);
  await page.keyboard.press('ArrowRight');
  await sleep(100);
  ok('ArrowRight twice from File reaches View', (await focusedLabel()) === 'View', await focusedLabel());
  await page.keyboard.press('ArrowDown');
  await menu().waitFor({ state: 'visible' });
  await sleep(150);
  ok('ArrowDown opens View with the first item highlighted', (await nav().getAttribute('data-highlighted')) !== null);
  ok('Inspector is checked before the typeahead, so its text starts with the mark', (await item('Inspector').getAttribute('aria-checked')) === 'true');
  await page.keyboard.press('i');
  await sleep(150);
  ok('typing "i" highlights Inspector, not the mark or the shortcut', (await item('Inspector').getAttribute('data-highlighted')) !== null && (await focusedLabel()).includes('Inspector'), await focusedLabel());
  await page.keyboard.press('Enter');
  await sleep(300);
  ok('Enter runs it: the inspector is a rail', (await width('#inspector')) === 48, `${await width('#inspector')}px`);
  await page.keyboard.press('Control+Meta+I');
  await sleep(300);

  // 6 — a disabled seam stays disabled: clicking it does nothing and the menu stays open
  await trigger('File').click();
  await menu().waitFor({ state: 'visible' });
  const seam = item('New manuscript…');
  ok('File › New manuscript… is a disabled seam', (await seam.getAttribute('data-disabled')) !== null && (await seam.getAttribute('aria-disabled')) === 'true');
  const sb = await box(seam);
  const navBefore = await width('#nav');
  await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await sleep(200);
  ok('clicking it leaves the menu open and moves nothing', (await state(trigger('File'))) === 'open' && (await menus().count()) === 1 && (await width('#nav')) === navBefore);
  await closeAll();

  // 7 — theme: chosen from a submenu, stamped on <html>, remembered across a reload; Escape closes one level
  ok('a fresh mount has no theme attribute and no theme key', (await theme()) === null && (await themeKey()) === null);
  await openView();
  await item('Theme').click();
  await page.locator('[role="menu"][data-menubar-sub]').waitFor({ state: 'visible' });
  await sleep(200); // past Radix's 100ms hover-open timer, which the click's pointer move also started
  const radio = (name) => page.getByRole('menuitemradio', { name, exact: true });
  ok('Theme opens a submenu with System chosen', (await menus().count()) === 2 && (await radio('System').getAttribute('aria-checked')) === 'true');
  await page.keyboard.press('Escape');
  await sleep(200);
  ok('Escape in the submenu closes only the submenu and focuses Theme', (await menus().count()) === 1 && (await focusedLabel()).includes('Theme'), await focusedLabel());
  await item('Theme').click();
  await page.locator('[role="menu"][data-menubar-sub]').waitFor({ state: 'visible' });
  await radio('Dark').click();
  await sleep(200);
  ok('Dark stamps data-theme="dark" and closes the menus', (await theme()) === 'dark' && (await menus().count()) === 0);
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(300);
  ok('the theme survives a reload, from the cs:theme key', (await theme()) === 'dark' && (await themeKey()) === 'dark');
  await openView();
  await item('Theme').click();
  await page.locator('[role="menu"][data-menubar-sub]').waitFor({ state: 'visible' });
  ok('the submenu shows Dark chosen', (await radio('Dark').getAttribute('aria-checked')) === 'true');
  await radio('System').click();
  await sleep(200);
  ok('System removes the attribute and writes "system"', (await theme()) === null && (await themeKey()) === 'system');

  // 8 — a menu item that collapses the shelf it lives in: focus lands on the way back, and returns
  await openView();
  await item('Top shelf').click();
  await sleep(300);
  ok('View › Top shelf collapses the shelf to its strip and focus is on the way back', (await height('#top')) === 32 && (await focusedLabel()) === 'Expand top shelf', `${await height('#top')}px, ${await focusedLabel()}`);
  await page.keyboard.press('Enter');
  await sleep(300);
  ok('Enter on the strip brings the bar back with focus on File', (await height('#top')) === 48 && (await focusedLabel()) === 'File', await focusedLabel());

  // 9 — Reset layout forgets the project's layout and starts over
  {
    const sep = page.locator('[role="separator"][aria-label="Resize navigation"]');
    const b = await sep.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 180, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
    await sleep(300);
    await button('Inspector').click();
    await sleep(300);
    const dragged = await width('#nav');
    const bodyWidth = await width('#body');
    ok('the nav is dragged well off its default and the inspector is railed', dragged > 0.2 * bodyWidth + 100 && (await width('#inspector')) === 48, `${dragged}px of ${bodyWidth}`);
    await openView();
    await item('Reset layout').click();
    await page.waitForLoadState('networkidle');
    await sleep(400);
    const reset = await width('#nav');
    const leftover = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cs:collapsed:default:')));
    ok('after Reset layout the nav is back at its default share and the inspector is open', Math.abs(reset - 0.2 * (await width('#body'))) <= 2 && (await width('#inspector')) > 100, `${reset}px`);
    ok('no collapsed bit survives the reset', leftover.length === 0, leftover.join(', '));
    ok("the theme key is not the reset's to remove", (await themeKey()) === 'system');
  }

  // 10 — geometry at 1512 × 982, and the proof picture
  {
    const brand = await box(page.locator('#top').getByText('Studio', { exact: true }));
    const f = await box(trigger('File'));
    const e = await box(trigger('Edit'));
    const v = await box(trigger('View'));
    const last = await box(button('Inspector'));
    ok('the three titles share a baseline', Math.abs(f.y - e.y) < 1 && Math.abs(e.y - v.y) < 1, `${f.y} ${e.y} ${v.y}`);
    ok('File starts after the brand', f.x > brand.x + brand.width, `${Math.round(brand.x + brand.width)} < ${Math.round(f.x)}`);
    ok('the rightmost toggle ends inside the viewport, right of the titles', last.x + last.width <= 1512 && last.x > v.x + v.width, `${Math.round(last.x + last.width)}`);
    await openView();
    ok('Navigation is checked for the picture', (await nav().getAttribute('aria-checked')) === 'true');
    await page.screenshot({ path: 'screenshots/menubar-1512-view-open.png' });
    await closeAll();
  }
  ok('still no console or page errors', errors.length === 0, errors.join(' | '));
}

if (isMain(import.meta.url)) await cli(run, OPTIONS);
