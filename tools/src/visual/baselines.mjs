/**
 * The expected baseline set, shared by the specs (which take their names from it)
 * and the workflows (which prune by it). Stories come from the Ladle build's
 * manifest; the studio views are declared here together with what the spec does
 * for each, so a renamed view cannot part from its behaviour. Run as a script it
 * reports the difference between the expected set and the committed Linux PNGs,
 * in every directory under baselines/, and exits 1 on any; `--prune` deletes the
 * orphans instead. The baselines workflow prunes only when dispatched with
 * `prune=true`: a story the manifest lost by accident (a discovery glob that no
 * longer reaches it) must fail the run as a missing picture, not lose it.
 *
 *   node tools/src/visual/baselines.mjs            report, exit 1 on a difference
 *   node tools/src/visual/baselines.mjs --prune    delete orphan PNGs, exit 0
 */
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const manifest = new URL('../../../dist/ladle/meta.json', import.meta.url);
const root = `${here}baselines`;

/** The colour schemes every studio view is photographed in. */
export const SCHEMES = ['light', 'dark'];

/**
 * The studio views studio.visual.mts photographs, each in both schemes as
 * `<view>-<scheme>`. `menu` opens the View menu before the shot.
 */
export const STUDIO_VIEWS = [
  { view: 'cockpit', menu: false },
  { view: 'view-open', menu: true },
];

/** `cockpit-light`, `cockpit-dark`, …: the studio baseline names. */
export function studioNames() {
  return STUDIO_VIEWS.flatMap(({ view }) =>
    SCHEMES.map((scheme) => `${view}-${scheme}`),
  );
}

/** Story keys from the Ladle build; throws when the build is missing or lists nothing. */
export function storyKeys() {
  let stories;
  try {
    stories = Object.keys(JSON.parse(readFileSync(manifest, 'utf8')).stories);
  } catch {
    throw new Error(
      'dist/ladle/meta.json is missing: run `pnpm stories:build` first',
    );
  }
  if (stories.length === 0)
    throw new Error('dist/ladle/meta.json lists no stories');
  return stories;
}

/** Expected baseline names per Playwright project. */
export function expected() {
  const stories = storyKeys();
  return { stories, 'stories-dark': stories, studio: studioNames() };
}

/**
 * Baseline names on disk per directory under baselines/, for one platform
 * suffix. Every directory is read, not only the expected projects, so a project
 * renamed or removed leaves its pictures as orphans rather than invisible.
 */
export function onDisk(platform = 'linux') {
  const suffix = `-${platform}.png`;
  const dirs = existsSync(root)
    ? readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];
  const out = {};
  for (const project of new Set([...Object.keys(expected()), ...dirs])) {
    const dir = `${root}/${project}`;
    out[project] = existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(suffix))
          .map((f) => f.slice(0, -suffix.length))
          .sort()
      : [];
  }
  return out;
}

/** `{ missing: ['stories/x'], orphans: ['studio/y'] }`, each empty when the set is exact. */
export function difference(platform = 'linux') {
  const want = expected();
  const have = onDisk(platform);
  const missing = [];
  const orphans = [];
  for (const project of Object.keys(have)) {
    const w = new Set(want[project] ?? []);
    const h = new Set(have[project]);
    for (const name of want[project] ?? [])
      if (!h.has(name)) missing.push(`${project}/${name}`);
    for (const name of have[project])
      if (!w.has(name)) orphans.push(`${project}/${name}`);
  }
  return { missing, orphans };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prune = process.argv.includes('--prune');
  const { missing, orphans } = difference();
  for (const orphan of orphans) {
    if (prune) {
      unlinkSync(`${root}/${orphan}-linux.png`);
      console.log(`pruned orphan baseline ${orphan}`);
    } else {
      console.log(
        `orphan baseline, no story or view is named for it: ${orphan}`,
      );
    }
  }
  for (const name of missing) console.log(`missing baseline: ${name}`);
  if (!missing.length && !orphans.length)
    console.log('baselines match the stories and views');
  process.exit(!prune && (missing.length || orphans.length) ? 1 : 0);
}
