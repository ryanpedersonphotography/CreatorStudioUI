import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Portability is enforced, not promised. The `kind:portable` boundary tag in the
 * root eslint config stops this package importing any workspace project; that
 * rule reads imports, never `package.json`, so this spec guards the manifest.
 */
interface Manifest {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  nx?: { tags?: string[] };
}

// Not `new URL(..., import.meta.url)`: under the jsdom environment that URL is
// not file-scheme and node:fs refuses it.
const manifest = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'),
) as Manifest;

describe('@creator-studio/menubar manifest', () => {
  it('carries the boundary tags the eslint matrix keys on', () => {
    expect(manifest.nx?.tags).toEqual(
      expect.arrayContaining(['type:ui', 'scope:shared', 'kind:portable']),
    );
  });

  it.each(['dependencies', 'peerDependencies'] as const)(
    'declares no workspace package under %s',
    (field) => {
      const workspaceDeps = Object.keys(manifest[field] ?? {}).filter((name) =>
        name.startsWith('@creator-studio/'),
      );
      expect(workspaceDeps).toEqual([]);
    },
  );
});
