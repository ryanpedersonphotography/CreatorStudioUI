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
  // WCAG contrast of an element's text (`color` on its own backdrop), of its border
  // (`borderTopColor`) or of its focus ring (`outlineColor`), both on the backdrop behind the
  // element: the non-text 3:1 of 1.4.11 for state and focus indicators
  const probe = (loc, of = 'color') =>
    loc.evaluate((el, of) => {
      // canvas readback turns any CSS colour (oklch included) into un-premultiplied RGBA
      const rgba = (color) => {
        const g = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
        g.fillStyle = color;
        g.fillRect(0, 0, 1, 1);
        const [r, gg, b, a] = g.getImageData(0, 0, 1, 1).data;
        return { rgb: [r, gg, b], alpha: a / 255 };
      };
      const lum = (c) => c.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)).reduce((t, v, i) => t + v * [0.2126, 0.7152, 0.0722][i], 0);
      const cs = getComputedStyle(el);
      // the effective background: composite every ancestor's paint, top down, until one is opaque;
      // a transparent or translucent layer alone would score against black and flatter light text.
      // An outline sits on what is behind the element, so its walk starts at the parent.
      const layers = [];
      let painted = false;
      for (let node = of === 'color' ? el : el.parentElement; node; node = node.parentElement) {
        const layer = rgba(getComputedStyle(node).backgroundColor);
        if (layer.alpha === 0) continue;
        painted = true;
        layers.push(layer);
        if (layer.alpha === 1) break;
      }
      let base = [255, 255, 255]; // nothing painted at all: the viewport's white
      for (const layer of layers.reverse()) base = layer.rgb.map((v, i) => v * layer.alpha + base[i] * (1 - layer.alpha));
      const fg = rgba(cs[of]);
      const seen = fg.rgb.map((v, i) => v * fg.alpha + base[i] * (1 - fg.alpha)); // a translucent foreground is what the eye sees of it
      const a = lum(seen);
      const b = lum(base);
      const background = `rgb(${base.map(Math.round).join(', ')})`;
      // a border or outline keeps its computed colour when nothing draws it (width 0 or style none), so those probes report both
      const drawn =
        of === 'color' ? true : of === 'outlineColor' ? parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none' : parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
      return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), color: cs[of], rgb: seen.map(Math.round), background, painted, drawn, border: `${cs.borderTopWidth} ${cs.borderTopStyle}` };
    }, of);
  const contrast = (loc) => probe(loc, 'color');
  const edge = (loc) => probe(loc, 'borderTopColor');
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
  const maxH = await menu().evaluate((m) => parseFloat(getComputedStyle(m).maxHeight));
  ok(
    'the menu caps its height at the space Radix measured under the title, not the 80vh fallback',
    maxH > mb.height - 1 && maxH <= 982 - mb.y + 2 && Math.abs(maxH - 0.8 * 982) > 4,
    `max-height ${maxH}px, menu top ${Math.round(mb.y)}, fallback would be ${0.8 * 982}px`,
  );

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
  await page.keyboard.press('Tab');
  const afterTag = await page.evaluate(() => document.activeElement?.tagName);
  const afterLabel = (await focusedLabel()).trim();
  ok('Tab again leaves the bar for a region toggle: one tab stop for the whole bar', afterTag === 'BUTTON' && ['Navigation', 'Context shelf', 'Inspector', 'Top shelf'].includes(afterLabel), `${afterTag} ${afterLabel}`);
  const focusedChip = page.locator('#top button:focus');
  await sleep(300); // the chip transitions its colours (outline included) for 150ms; probe the settled ring, not the interpolation
  const chipRing = await focusedChip.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), offset: parseFloat(cs.outlineOffset), border: `${cs.borderTopWidth} ${cs.borderTopStyle}`, borderColor: cs.borderTopColor, pressed: el.getAttribute('aria-pressed') };
  });
  const chipRingColor = await probe(focusedChip, 'outlineColor');
  const chipBorderColor = await probe(focusedChip, 'borderTopColor');
  const apart = Math.hypot(...chipRingColor.rgb.map((v, i) => v - chipBorderColor.rgb[i])); // numeric, because Chrome serialises the same colour as oklch or oklab depending on how it got there
  ok(
    'the focused toggle paints the ring outside its border, so a pressed outline stays visible under focus',
    chipRing.style !== 'none' && chipRing.width >= 1 && chipRing.offset >= 0 && chipRing.border === '1px solid' && chipRing.pressed === 'true',
    `${chipRing.style} ${chipRing.width}px offset ${chipRing.offset}px, border ${chipRing.border}, pressed ${chipRing.pressed}`,
  );
  ok(
    "the ring clears 3:1 against the shelf and is not the pressed outline's colour: focus and pressed stay distinguishable",
    chipRingColor.drawn && chipRingColor.painted && chipRingColor.ratio >= 3 && apart > 40,
    `ring ${chipRingColor.ratio.toFixed(2)}:1 (${chipRingColor.color} on ${chipRingColor.background}), ${Math.round(apart)} from the border ${chipRing.borderColor}`,
  );

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
  // the pressed state's second channel: an outline that clears WCAG 1.4.11's 3:1 against the shelf, on the pressed button only
  const pressedState = async (theme) => {
    const on = await edge(button('Inspector'));
    const off = await edge(button('Navigation'));
    const offFill = await button('Navigation').evaluate((el) => getComputedStyle(el).backgroundColor);
    ok(
      `${theme} theme: a pressed toggle's outline clears 3:1 against the shelf and an unpressed one's does not: state is not signalled by ink alone`,
      (await button('Inspector').getAttribute('aria-pressed')) === 'true' && on.painted && on.drawn && on.ratio >= 3 && off.ratio < 3 && offFill === 'rgba(0, 0, 0, 0)',
      `pressed ${on.ratio.toFixed(2)}:1 (${on.color} on ${on.background}, ${on.border}), unpressed ${off.ratio.toFixed(2)}:1, unpressed fill ${offFill}`,
    );
  };
  await pressedState('light');
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
  const lightRow = await contrast(nav());
  ok('light theme: the highlighted row clears AA (≥ 4.5:1)', (await nav().getAttribute('data-highlighted')) !== null && lightRow.painted && lightRow.ratio >= 4.5, `${lightRow.ratio.toFixed(2)}:1, ${lightRow.color} on ${lightRow.background}`);
  const shortcutOf = (name) => item(name).locator('[data-menubar="shortcut"]');
  const lightHint = await contrast(shortcutOf('Context shelf'));
  ok('light theme: the muted shortcut on an enabled row clears AA (≥ 4.5:1)', (await item('Context shelf').getAttribute('data-highlighted')) === null && lightHint.painted && lightHint.ratio >= 4.5, `${lightHint.ratio.toFixed(2)}:1, ${lightHint.color} on ${lightHint.background}`);
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
  const navBefore = await width('#nav');
  await seam.dispatchEvent('click'); // the row has pointer-events: none, so a pointer click would land on the menu behind it and prove nothing
  await sleep(200);
  ok('a click on the row itself leaves the menu open and moves nothing', (await state(trigger('File'))) === 'open' && (await menus().count()) === 1 && (await width('#nav')) === navBefore);
  const heading = () => menu().getByText('Coming soon', { exact: true });
  ok('and its heading says why it is dimmed, naming the group', (await heading().count()) === 1 && (await menu().getByRole('group', { name: 'Coming soon' }).count()) === 1);
  const lightHeading = await contrast(heading());
  ok('light theme: the muted heading clears AA (≥ 4.5:1)', lightHeading.painted && lightHeading.ratio >= 4.5, `${lightHeading.ratio.toFixed(2)}:1, ${lightHeading.color} on ${lightHeading.background}`);
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
  await trigger('View').focus();
  await page.keyboard.press('ArrowDown');
  await menu().waitFor({ state: 'visible' });
  await sleep(100);
  const darkRow = await contrast(nav());
  ok('dark theme: the highlighted row clears AA (≥ 4.5:1)', (await nav().getAttribute('data-highlighted')) !== null && darkRow.painted && darkRow.ratio >= 4.5, `${darkRow.ratio.toFixed(2)}:1, ${darkRow.color} on ${darkRow.background}`);
  const darkHint = await contrast(shortcutOf('Context shelf'));
  ok('dark theme: the muted shortcut on an enabled row clears AA (≥ 4.5:1)', (await item('Context shelf').getAttribute('data-highlighted')) === null && darkHint.painted && darkHint.ratio >= 4.5, `${darkHint.ratio.toFixed(2)}:1, ${darkHint.color} on ${darkHint.background}`);
  await closeAll();
  await trigger('File').focus();
  await page.keyboard.press('ArrowDown');
  await menu().waitFor({ state: 'visible' });
  await sleep(100);
  const darkHeading = await contrast(heading());
  ok('dark theme: the muted heading clears AA (≥ 4.5:1)', darkHeading.painted && darkHeading.ratio >= 4.5, `${darkHeading.ratio.toFixed(2)}:1, ${darkHeading.color} on ${darkHeading.background}`);
  await closeAll();
  await page.keyboard.press('Control+Meta+B'); // rail the nav so one toggle is unpressed
  await sleep(300);
  await pressedState('dark');
  await page.keyboard.press('Control+Meta+B');
  await sleep(300);
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
    const draggedLayout = await page.evaluate(() => localStorage.getItem('cs:layout:default:body'));
    ok('the drag was stored under the body layout key', typeof draggedLayout === 'string' && draggedLayout.length > 0);
    await openView();
    await item('Reset layout').click();
    await page.waitForLoadState('networkidle');
    await sleep(400);
    const reset = await width('#nav');
    const leftover = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cs:collapsed:default:')));
    ok('after Reset layout the nav is back at its default share and the inspector is open', Math.abs(reset - 0.2 * (await width('#body'))) <= 2 && (await width('#inspector')) > 100, `${reset}px`);
    ok('no collapsed bit survives the reset', leftover.length === 0, leftover.join(', '));
    const layoutNow = await page.evaluate(() => localStorage.getItem('cs:layout:default:body'));
    ok('the dragged layout is gone: what the fresh mount stored is not what the drag stored', layoutNow !== draggedLayout, `${layoutNow} vs ${draggedLayout}`);
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
