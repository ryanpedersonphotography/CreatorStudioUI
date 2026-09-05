/**
 * The expected baseline set, shared by the specs (which take their names from it)
 * and the workflows (which prune by it). Stories come from the Ladle build's
 * manifest; the studio views are named here so the spec and this list cannot
 * drift. Run as a script it reports the difference between the expected set and
 * the committed Linux PNGs and exits 1 on any; `--prune` deletes the orphans
 * instead, which the baselines workflow does before regenerating, so a deleted
 * or renamed story takes its picture with it.
 *
 *   node tools/src/visual/baselines.mjs            report, exit 1 on a difference
 *   node tools/src/visual/baselines.mjs --prune    delete orphan PNGs, exit 0
 */
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const manifest = new URL('../../../dist/ladle/meta.json', import.meta.url);

/** The studio views studio.visual.mts photographs: `<view>-<colour scheme>`. */
export const STUDIO_VIEWS = [
  'cockpit-light',
  'cockpit-dark',
  'view-open-light',
  'view-open-dark',
];

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
  return { stories, 'stories-dark': stories, studio: STUDIO_VIEWS };
}

/** Baseline names on disk per project, for one platform suffix. */
export function onDisk(platform = 'linux') {
  const suffix = `-${platform}.png`;
  const out = {};
  for (const project of Object.keys(expected())) {
    const dir = `${here}baselines/${project}`;
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
  for (const project of Object.keys(want)) {
    const w = new Set(want[project]);
    const h = new Set(have[project]);
    for (const name of want[project])
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
      unlinkSync(`${here}baselines/${orphan}-linux.png`);
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
