/**
 * Shared runner for the browser harnesses. One `vite preview` per process
 * (memoised; the whole process group is killed on exit), one headless
 * Chromium per process, one context per harness with its own viewport and
 * scale. `createHarness()` hands a harness `{ page, browser, ok, sleep,
 * errors, report }`; `report()` returns the fail count instead of exiting, so
 * all.mjs can run several harnesses and exit once.
 *
 *   node tools/src/verify/<name>.mjs            against the dev server on :5180
 *   node tools/src/verify/<name>.mjs --preview  serves an existing apps/studio/dist on :5181 (run `pnpm build` first)
 *   BASE=http://… node tools/src/verify/<name>.mjs   anywhere else
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export const APP = new URL('../../../apps/studio/', import.meta.url).pathname;
export const PREVIEW = process.argv.includes('--preview');
export const BASE = process.env.BASE ?? (PREVIEW ? 'http://localhost:5181' : 'http://localhost:5180');
export const PROJECT = 'default';
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let preview = null;
let previewReady = null;

function stopPreview() {
  if (!preview) return;
  try {
    process.kill(-preview.pid, 'SIGTERM'); // the group: pnpm and the vite it spawned
  } catch {
    preview.kill();
  }
  preview = null;
}

/** Starts `vite preview` on :5181 once per process; a no-op without --preview. */
export function ensurePreview() {
  if (!PREVIEW) return Promise.resolve();
  previewReady ??= (async () => {
    if (!existsSync(`${APP}dist/index.html`)) {
      console.error('✗ --preview needs a build: run `pnpm build` first (apps/studio/dist/index.html missing)');
      process.exit(1);
    }
    preview = spawn('pnpm', ['exec', 'vite', 'preview', '--port', '5181', '--strictPort'], { cwd: APP, stdio: 'ignore', detached: true });
    process.on('exit', stopPreview);
    const started = Date.now();
    for (;;) {
      try {
        if ((await fetch(BASE)).ok) break;
      } catch {
        /* not up yet */
      }
      if (Date.now() - started > 15000) {
        console.error(`✗ vite preview did not answer on ${BASE}`);
        stopPreview();
        process.exit(1);
      }
      await sleep(150);
    }
  })();
  return previewReady;
}

let browserPromise = null;
const getBrowser = () => (browserPromise ??= chromium.launch());

/** Closes the shared browser and the preview server; all.mjs calls it once at the end. */
export async function shutdown() {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = null;
  stopPreview();
}

/**
 * A page at the given viewport and scale, with error capture and a counting
 * `ok`. `report()` prints the tally and returns the number of failures.
 */
export async function createHarness({ label, viewport, deviceScaleFactor = 1 }) {
  await ensurePreview();
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport, deviceScaleFactor });
  const page = await context.newPage();
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
  const report = () => {
    const where = PREVIEW ? `production bundle built ${statSync(`${APP}dist/index.html`).mtime.toISOString()}` : 'dev server';
    console.log(`\n${label}: ${pass} passed, ${fail} failed (${where}, ${viewport.width}×${viewport.height} @${deviceScaleFactor}×)\n`);
    return fail;
  };
  return { page, browser, errors, ok, sleep, report, close: () => context.close(), BASE, PROJECT };
}

/** Fail loudly rather than test another app on that port. */
export async function assertStudio(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const title = await page.title();
  if (!title.includes('Studio')) throw new Error(`${BASE} is not the studio (title "${title}"); is another app on that port?`);
}

/** Runs one harness to completion and returns its fail count; the browser stays up for the next. */
export async function main(run, options) {
  const h = await createHarness(options);
  try {
    await assertStudio(h.page);
    await run(h);
  } catch (error) {
    h.ok(`harness ran to completion: ${error.message}`, false);
  } finally {
    await h.close();
  }
  return h.report();
}

/** True when this module is the script node was started with, not an import of all.mjs. */
export const isMain = (url) => url === pathToFileURL(process.argv[1]).href;

/** The CLI shim every harness ends with: run alone, close everything, exit once. */
export async function cli(run, options) {
  const fails = await main(run, options);
  await shutdown();
  process.exit(fails ? 1 : 0);
}
