All checks done. Here is the review.

---

# Adversarial review — CreatorStudioUI skeleton @ `e62743f`

Scope: AGENTS.md §Stage / §How it's built / §Conventions vs. the code; boundaries; the port/adapter shim; adapter correctness; hand-rolled config drift; gates; git hygiene.

Headline: the runtime slice is genuinely correct — the prefix-strip, the key format, the sync port, and the boundary matrix all do what AGENTS.md says, and I verified them live rather than by reading. The damage is in the **gate**: three of the six `pnpm verify` steps are weaker than they look, and one of them is a no-op on any machine that isn't this one.

---

## Findings

### 1. MATERIAL — `.ladle/` is gitignored, so the `stories:build` gate builds zero stories on a fresh clone

`.gitignore:54`

```
.ladle
```

`git ls-files .ladle` returns nothing; `git check-ignore -v .ladle/config.mjs` reports `.gitignore:54:.ladle`. All four Ladle files (`config.mjs`, `vite.config.mts`, `components.tsx`, `preview.css`) exist only on this machine.

I proved the consequence rather than inferring it. Extracting `git archive HEAD` to `/tmp/csui-clean`, symlinking `node_modules`, and running `ladle build`:

```
NO .ladle DIRECTORY
✓ built in 513ms   ✓ Meta.json successfully created.
ladle build on fresh HEAD exit=0
story chunks in fresh build: NONE — zero stories built
story chunks in repo's local dist/ladle: cockpit.stories-o5LoniMw.js
```

Without `config.mjs`, Ladle falls back to its default `stories: "src/**/*.stories.*"` glob from the repo root, matches nothing, writes to `build/` instead of `dist/ladle`, and **exits 0**. So AGENTS.md's *"Ladle from `.ladle/` at the root across all packages"* and the `stories:build` gate both evaporate in CI or on any clone, silently and green. This also takes the *"every component export also has a story"* rule with it.

**Fix:** line 54 was meant to ignore Ladle's cache, not its config. Change it to `.ladle/.cache` and `git add .ladle/`.

---

### 2. MATERIAL — `tools/` and `scripts/` are outside every lint and typecheck target

`package.json:8` (`"lint": "nx run-many -t lint"`) plus `nx show projects` → `["adapter-local","contracts","tokens","shell","studio"]`. No tsconfig in the repo references `tools` or `scripts` (`grep -rn "tools\|scripts" --include='tsconfig*.json'` → none).

That means `tools/vitest/setup.ts`, `tools/verify/persistence.mjs`, and `scripts/check-tokens.mjs` are never linted and never typechecked. Not hypothetically — running eslint on the file directly:

```
tools/vitest/setup.ts
  6:19  error  Unexpected empty method 'observe'     @typescript-eslint/no-empty-function
  7:21  error  Unexpected empty method 'unobserve'   @typescript-eslint/no-empty-function
  8:22  error  Unexpected empty method 'disconnect'  @typescript-eslint/no-empty-function
✖ 3 problems
```

`pnpm -s lint` exits 0 with those three errors sitting in the tree. AGENTS.md §Conventions files *"TS strict, no `any`"* and the whole lint line under **"Enforced — a gate fails the build."** For these files nothing is enforced.

**Fix:** add a `tools` project (a `package.json` with `nx.name` and `type:util` tags is enough for the inferred `lint`/`typecheck` targets to attach), or give the root a `lint` target with an explicit `tools/**,scripts/**` fileset. The three `no-empty-function` errors then need `/* no-op: jsdom stub */` bodies or a scoped rule disable.

---

### 3. MATERIAL — editing the shared Vitest setup does not invalidate any test cache

`nx.json:3-13`

```json
"namedInputs": {
  "default": ["{projectRoot}/**/*", "sharedGlobals"],
  "sharedGlobals": []
}
```

`nx show project shell --json` resolves the `test` target's inputs to `default`, `^production`, `{projectRoot}/tsconfig.spec.json`, `{projectRoot}/tsconfig.storybook.json`, `{workspaceRoot}/tsconfig.json#compilerOptions`, `vitest`, `env:CI`, and dependent-task outputs. `{workspaceRoot}/tools/vitest/setup.ts` appears in none of them, and `sharedGlobals` is empty.

`tools/vitest/setup.ts` is loaded by `apps/studio/vite.config.mts:36` and `packages/shell/vite.config.mts:16` and is outside both project roots. The caches are live — my `pnpm -s test` run reported `[local cache]` for all five projects — so a change to the `ResizeObserver` stub will be cached straight past, and the failure it causes will surface on some later unrelated commit.

The same block carries generator residue that hints at how this happened: it excludes `{projectRoot}/src/test-setup.[jt]s` and `{projectRoot}/.eslintrc.json`, neither of which exists here, because the setup file was deliberately moved to a shared location and the inputs were never moved with it.

**Fix:**
```json
"sharedGlobals": [
  "{workspaceRoot}/tools/vitest/setup.ts",
  "{workspaceRoot}/tsconfig.base.json"
]
```
and drop the two dead exclusions.

---

### 4. MATERIAL — the root `dependencies` block leaks the panel library into every package

`package.json:66-70`

```json
"dependencies": {
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-resizable-panels": "^4.12.3"
}
```

`packages/tokens` does not declare `react-resizable-panels`, has no local `node_modules`, and neither does `packages/`. It resolves the library from the hoisted root. I probed lint on stdin (no file written):

```
### tokens (type:util, does NOT declare the dep) imports it ###
--- (empty above = allowed) ---
### app imports the panel library directly ###
--- (empty above = allowed) ---
```

`eslint.config.mjs:23-67` has no `bannedExternalImports` on any constraint. So AGENTS.md's *"nothing outside this file ever learns which library is underneath"* (§How it's built, Shell) holds only by convention, and the stronger claim in the same section — *"UI packages never import a backend SDK"*, described as enforced by boundary tags — is enforced only against workspace projects, never against npm packages. The day an adapter SDK lands, `type:ui` importing it will be lint-clean.

**Fix:** two changes. Drop `react-resizable-panels` from root `dependencies` (it has no root consumer; `packages/shell/package.json:24` already declares it). Then add banned externals to the type axis:

```js
{ sourceTag: 'type:ui',      onlyDependOnLibsWithTags: [...], bannedExternalImports: ['*-sdk', '@supabase/*', 'firebase*'] },
{ sourceTag: 'type:contract', onlyDependOnLibsWithTags: [...], bannedExternalImports: ['*'] },
{ sourceTag: 'type:util',     onlyDependOnLibsWithTags: ['type:util'], bannedExternalImports: ['*'] },
```
`react-resizable-panels` stays allowed for `type:ui` because shell legitimately owns it; the point is that the list becomes a decision rather than an accident.

---

### 5. MATERIAL — "every export has a test" sits under **Enforced** but nothing checks it, and it is already violated

AGENTS.md §Conventions, under *"Enforced — a gate fails the build"*:

> Every export from a package's `index.ts` has a test; every component export also has a story.

`packages/tokens/src/index.ts:1` exports `THEMES`. `packages/tokens/src/lib/theme.spec.ts` (37 lines, read in full) tests `applyTheme`, `parseTheme`, and `THEME_ATTRIBUTE` — `THEMES` is never asserted, only exercised indirectly through `parseTheme`. `pnpm -s test` exits 0. There is no coverage threshold, no export-vs-test check, and no story check anywhere in the six verify steps.

This is the more damaging half of finding 1: even with `.ladle/` committed, the story half of this rule is unenforceable too.

**Fix:** either move the sentence out of **Enforced** into **Reviewed** (honest, cheap), or add a seventh gate — a small script that parses each `index.ts`, resolves each named export, and asserts a matching `*.spec.*` reference plus, for anything returning JSX, a `*.stories.tsx` reference. Given AGENTS.md's own rule that *"duplicated ground truth is what the 2026-09-02 review caught"*, an unenforced claim under an "Enforced" heading is exactly that defect in prose form.

---

### 6. MATERIAL — the browser adapter is typed against Node's Web Storage shim, which disables the SSR guarantee it advertises

`packages/adapters/local/tsconfig.lib.json:9` sets `"types": ["node"]` and inherits `tsconfig.base.json:8` `"lib": ["es2022"]` — no `dom`. But `packages/adapters/local/src/lib/layout-store.local.ts:17,39` uses `Pick<Storage, 'getItem' | 'setItem'>` and `globalThis.localStorage`.

Those resolve from `node_modules/@types/node/web-globals/storage.d.ts:22`:

```ts
declare global {
  var localStorage: Storage;
}
```

Non-optional. So in the file whose doc comment says

> `packages/adapters/local/src/lib/layout-store.local.ts:14-15` — *"Falls back to memory when no storage is available — server rendering, a locked-down browser…"*

TypeScript believes `globalThis.localStorage` is always present. Line 40's `?? undefined` is type-dead while being the load-bearing runtime path. The runtime behaviour is correct today (I traced both branches: plain Node 22 leaves the property absent → `?? undefined` → memory store; Node with webstorage enabled but no backing file throws `ERR_INVALID_STATE` → the `catch` → memory store). But strict mode is providing zero protection here, and the first person to write `globalThis.localStorage.getItem(k)` directly will get a green typecheck and an SSR crash.

The same file's `Storage` is Node's, not `lib.dom`'s — structurally compatible by coincidence, not by design. Note `@types/node`'s own conditional (`type _Storage = typeof globalThis extends { onabort: any } ? {} : Storage`) exists precisely to yield to `lib.dom` when it is present; here it never is.

**Fix:** `packages/adapters/local/tsconfig.lib.json` should carry `"lib": ["dom", "es2022"]` and drop `"types": ["node"]`, matching what `packages/shell/tsconfig.lib.json:15-19` already does. The adapter is a browser adapter; type it as one.

---

### 7. MATERIAL — the next milestone's own feature will silently rewrite the storage key

`packages/shell/src/lib/cockpit.tsx:47-57` never passes `panelIds`. That is the only reason the key format holds. From the library source (`node_modules/react-resizable-panels/dist/react-resizable-panels.js`):

```js
function he(e, t) { return `react-resizable-panels:${[e, ...t].join(":")}`; }
// read:  const a = he(u, n ?? []);
// write: s ? y = he(u, Object.keys(d)) : y = he(u, []);   // s = (panelIds !== undefined)
```

With no `panelIds`, both sides compute `react-resizable-panels:cs:layout:default:root`, the shim strips the prefix, and the store sees exactly the documented key. Verified live — `node tools/verify/persistence.mjs` returned `"keys":["cs:layout:default:root"]`.

The moment `panelIds` is passed, both sides become `react-resizable-panels:cs:layout:default:root:nav:main:inspector`, and the store starts seeing `cs:layout:default:root:nav:main:inspector`. That breaks the key format AGENTS.md documents in three places, breaks the `layoutKey()` contract at `packages/contracts/src/lib/layout-store.ts:19`, breaks the assertion at `tools/verify/persistence.mjs:39`, and orphans every layout a writer had already saved.

This is not speculative. The library documents `panelIds` as *"For Groups that contain conditionally-rendered Panels"*, and AGENTS.md §Stage names the next milestone as *"the first real panel controls (collapse, pin)"* — pinning and collapsing is how panels become conditionally rendered.

**Fix:** make the shim assert its own contract instead of trusting the library, so the drift fails loudly on the first render rather than quietly on the first save:

```ts
function asLayoutStorage(store: LayoutStore, expected: string): LayoutStorage {
  const unprefix = (key: string) => {
    const stripped = key.startsWith(LIBRARY_PREFIX) ? key.slice(LIBRARY_PREFIX.length) : key;
    if (process.env.NODE_ENV !== 'production' && stripped !== expected) {
      throw new Error(`cockpit: layout key drifted from ${expected} to ${stripped}`);
    }
    return stripped;
  };
  ...
}
```

---

### 8. MATERIAL — the prefix constant is an unversioned private detail, and the unit test cannot catch it drifting

`packages/shell/src/lib/cockpit.tsx:39`

```ts
const LIBRARY_PREFIX = 'react-resizable-panels:';
```

Nothing in the library's public API exposes this; it comes from the minified internal `he()`. If a future v4.x changes it, `unprefix` becomes a silent no-op, keys land as `react-resizable-panels:cs:layout:…`, and every saved layout is lost with no error — the library reads `null`, renders defaults, and the next drag overwrites the good value.

The test that looks like it guards this does not. `packages/shell/src/lib/cockpit.spec.tsx:32-46`:

```ts
store.setItem('cs:layout:demo:root', JSON.stringify({ nav: 30, main: 70 }));
// …render…
// The library prefix never reaches the store: only our key exists.
expect(store.keys()).toEqual(['cs:layout:demo:root']);
```

The test seeds the exact key it then asserts on. A render that writes nothing passes; a render that writes correctly passes. Only a render that writes an *additional* prefixed key fails — which requires the library to save on mount, which it does not. The assertion's stated intent is not what it measures.

The real proof lives in `tools/verify/persistence.mjs`, which needs a running dev server and is **not** part of `pnpm verify` (`package.json:14` lists six steps; `verify:slice` is a separate script on line 15). AGENTS.md §Stage rests the skeleton's whole claim on it — *"proven by `node tools/verify/persistence.mjs` against the dev server"* — which is honest, but means the one check that would catch prefix drift never runs unattended.

**Fix:** the dev-time assertion from finding 7 covers this too. Additionally, make the spec assert a write actually occurred rather than an absence — drive a resize through the group's imperative handle and assert `store.keys()` grew to exactly `['cs:layout:demo:root']` from an empty store.

---

### 9. MINOR — `packages/adapters/local` violates the stated naming rule

AGENTS.md §How it's built, Names:

> directory name = package name (`packages/shell` → `@creator-studio/shell`)

`packages/adapters/local/package.json:2` is `@creator-studio/adapter-local`, and `nx.name` is `adapter-local`. The directory is `local`. The rule as written yields `@creator-studio/local`; the code invented a different, better rule and left it undocumented, so the next adapter is a coin flip between `@creator-studio/adapter-files` and `@creator-studio/files`.

**Fix:** amend the rule — *"directory name = package name; adapters take the `adapter-` prefix (`packages/adapters/local` → `@creator-studio/adapter-local`)"*. Don't rename the package; the current name is the right one.

---

### 10. MINOR — `lint:tokens` does not cover "anywhere else"

AGENTS.md §How it's built, Styling:

> `pnpm lint:tokens` … fails on any raw colour or length anywhere else.

`scripts/check-tokens.mjs:41-53` walks only `apps/*/src` and `packages/**/src`. Out of scope: `.ladle/preview.css`, `apps/studio/index.html`, anything under `tools/`, and any future root-level CSS. Nothing currently violates it — `node scripts/check-tokens.mjs` exits 0 over 20 files — but the guarantee is narrower than the sentence.

**Fix:** either add `.ladle` and `tools` to the walk roots, or narrow the sentence to *"fails on any raw colour or length in `src/` outside the token package."*

---

### 11. MINOR — `build` is one of six gates and covers one project; `^build` is dead config

Per-project targets (`nx show project <p>`):

| project | has `build`? |
|---|---|
| studio | yes |
| shell, tokens, contracts, adapter-local | **no** |

`@nx/js/typescript` infers `build` only when `package.json` `main`/`exports` point into the `outDir`; all four libraries point at `./src/index.ts`, so no `build` target is created. `pnpm -s build` reports `Successfully ran target build for project studio` — singular. Consequently `nx.json:59-62`:

```json
"targetDefaults": { "test": { "dependsOn": ["^build"] } }
```

resolves to nothing for every library dependency. The `dist/*.d.ts` files present in each package come from `typecheck` (composite + `emitDeclarationOnly`), not from `build`.

This is defensible — the libraries are consumed as source by Vite — but AGENTS.md lists `build` as a gate without qualification, while the commit message correctly says *"app build"*. Related dead config in the same family: `tsconfig.base.json:19` sets `"customConditions": ["@creator-studio/source"]` and no package's `exports` declares that condition; `tsconfig.base.json:21` sets `"types": ["*"]`, which every one of the five leaf configs overrides, so it has no effect anywhere.

**Fix:** say *"build (the app bundle)"* in §Conventions, delete the `^build` dependency, and drop the two inert `tsconfig.base.json` lines.

---

### 12. MINOR — assorted generator residue and cross-package config drift

Each of these would force a small refactor later; none is wrong today.

- `packages/shell/.babelrc` has no consumer. `@vitejs/plugin-react@6.1.1`'s only dependency is `@rolldown/pluginutils`; Babel is not in its tree. The shell's declarations come from `tsc`. Editing this file will appear to do nothing. **Delete it** (and `@babel/core` / `@babel/preset-react` from root devDependencies, unless Ladle needs them).
- `packages/shell/vite.config.mts:7-10` still carries commented `// worker: { plugins: [] }` boilerplate. Delete.
- `packages/shell/package.json` is the only package without `"type": "module"` (contracts, tokens, adapter-local all have it at line 5). Add it.
- `tsconfig.base.json:9-10` sets `module`/`moduleResolution` to `nodenext`; `shell` and `studio` override to `esnext`/`bundler` while `contracts`, `tokens`, and `adapters/local` do not. Two resolution modes coexist, and which one a new package gets depends on which sibling it was copied from. Pick `bundler` at the base and delete the leaf overrides — everything here is bundled by Vite.
- Root `vitest.config.mts` is never used by `pnpm test` (which is `nx run-many -t test`, per-project). Its `projects` glob `'**/vite.config.{mjs,js,ts,mts}'` negates only root-level configs, so `.ladle/vite.config.mts` matches the pattern and is excluded today only by dot-directory glob defaults. Either delete the file or add `'!.ladle/**'`.
- `.ladle/preview.css` duplicates lines 1-2 and the `@source` directive of `apps/studio/src/styles.css`, and `.ladle/vite.config.mts` duplicates its plugin list. These will drift. Extract a shared `packages/tokens/src/preview-base.css` or have Ladle import the app's stylesheet.

The three hand-rolled items the brief asked me to judge specifically are all **justified as written**: `setupFiles: ['../../tools/vitest/setup.ts']` (shared rather than duplicated per package — the right call, spoiled only by finding 3); `"lib": ["dom","dom.iterable","es2022"]` on the shell (React DOM code genuinely needs it — the mistake was not extending it to the adapter, finding 6); and the stories `exclude`/`include` split between `packages/shell/tsconfig.lib.json:22-23` and `tsconfig.spec.json:35-36` (stories typechecked but kept out of the lib build — exactly right). The Tailwind plugin additions are necessary for v4 and correct.

---

### 13. MINOR — shim and port sharp edges that will bite at the next milestone

- `packages/shell/src/lib/cockpit.tsx:57` builds a new `asLayoutStorage(store)` object on every render, so `useDefaultLayout`'s `storage` identity churns. Measured as harmless — one write per drag, see Clean #8 — but it should be `useMemo(() => asLayoutStorage(store), [store])`.
- `packages/contracts/src/lib/layout-store.ts:19` does not escape `:`. `layoutKey('a:b','c')` and `layoutKey('a','b:c')` both yield `cs:layout:a:b:c`. With `projectId` currently the literal `'default'` (`apps/studio/src/app/app.tsx:11`) this is unreachable; the first real project id sourced from a filename makes it reachable. Encode the segments, or assert they contain no `:`.
- `packages/shell/src/lib/cockpit.tsx:109-111` — `domId` maps every non-alphanumeric run to `-`, so `cs:layout:my:proj:root` and `cs:layout:my-proj:root` collide on one DOM id. Only matters with two cockpits mounted at once.
- `packages/contracts/src/lib/layout-store.ts:12-15` has no `removeItem`. There is no way to forget a layout through the port — which "reset panel sizes" under *Arrange the cockpit* will need. Add it now while the port has one implementation, not later when it has three.
- `packages/shell/src/index.ts:1` re-exports `PanelSize` (tokens' `` `${number}%` | `${number}px` `` string union). `react-resizable-panels` exports its own `PanelSize` — `{ asPercentage: number; inPixels: number }` (`react-resizable-panels.d.ts:375`). Same name, incompatible shape, both in scope in shell files. Rename ours to `CockpitPanelSize` at the shell boundary.
- `packages/adapters/local/src/lib/layout-store.local.ts:21-27` — a read error returns `null`, which the library reads as "no saved layout", after which the next resize **overwrites** the still-recoverable stored value. For `localStorage` this is near-unreachable. For the async file or service adapter AGENTS.md plans behind this same sync port with a write-through cache, swallow-read-then-clobber is precisely how a layout gets lost. Distinguish "absent" from "unreadable" and suppress writes after a read failure.

---

## Checked and clean

Gate commands, all run from `/Users/ryanpederson/NewDev/CreatorStudioUI`:

1. `pnpm -s typecheck` — **exit 0**, 5/5 projects (`contracts`, `tokens`, `shell`, `adapter-local`, `studio`).
2. `pnpm -s lint` — **exit 0**, 5/5 projects. (Coverage gap is finding 2; the projects it does cover are clean.)
3. `node scripts/check-tokens.mjs` — **exit 0**: `token lint · 20 files · 42 tokens declared · 55 var() references · ✔ no raw values outside packages/tokens/src/tokens.css; every var() resolves`.
4. `pnpm -s test` — **exit 0**, 5/5 projects.
5. `pnpm -s stories:build` — **exit 0**, and `dist/ladle/assets/cockpit.stories-o5LoniMw.js` present, so the story does build *here*. (Finding 1 is about everywhere else.)
6. `pnpm -s build` — **exit 0** (one project; see finding 11).
7. `node tools/verify/persistence.mjs` — **exit 0**:
   `{"before":285.59375,"after":485.46875,"restored":485.46875,"keys":["cs:layout:default:root"],"grew":true,"kept":true,"keyOk":true}`
   The full slice holds: app → shell → port → adapter → `localStorage` → reload, and the store saw exactly one key, in the documented format, with no library prefix.
8. **The `{...layout}` spread is correct, not a double-write.** I suspected `cockpit.tsx:60` attaching both `onLayoutChange` (fires per pointer-move) and `onLayoutChanged` (fires on release) would amplify writes. Measured with an instrumented `Storage.prototype.setItem` over a 30-step drag: `{"totalWrites":1,"distinctKeys":["cs:layout:default:root"]}`. The library's two handlers share a `clearTimeout`, so the settled write cancels the pending debounced one. Spreading all three return values is the intended idiom — the keys map exactly onto `Group`'s prop names.
9. **`useDefaultLayout` sync contract is honest.** `react-resizable-panels.d.ts:177` — `LayoutStorage = Pick<Storage, "getItem" | "setItem">`, structurally identical to `packages/contracts/src/lib/layout-store.ts:12-15`. The library reads via `useSyncExternalStore` during render (`() => o.getItem(a)`), so `layout-store.ts:4-6`'s *"Synchronous on purpose — the panel library reads the saved layout during render"* is accurate as written.
10. **Prefix strip is symmetric.** `cockpit.tsx:48-52` applies `unprefix` in both `getItem` and `setItem`; the library only ever supplies prefixed keys (`he()` at both call sites); no path lets a prefixed key reach the store. Confirmed empirically by check 7.
11. **Boundary enforcement genuinely fires** — three eslint stdin probes, no files written:
    - `type:ui` importing `@creator-studio/adapter-local` → `error … A project tagged with "type:ui" can only depend on libs tagged with "type:ui", "type:contract", "type:util"`. AGENTS.md's *"a `type:ui` file importing an adapter fails lint"* is true.
    - package importing `apps/studio/src/app/app.js` by relative path → `error … Projects cannot be imported by a relative or absolute path`.
    - cross-package relative import into `../../../tokens/src/lib/sizes.js` → same error. AGENTS.md's *"packages import each other only through `index.ts`, and never import apps"* is true, and `grep -rn "from '\.\./\.\./\.\."` over `apps` and `packages` returns none.
12. **The depConstraints matrix matches AGENTS.md.** `eslint.config.mjs:24-60` — `type:app` → feature/ui/contract/adapter/util; `type:feature` → feature/ui/contract/util (no adapter ✓); `type:ui` → ui/contract/util (no adapter ✓); `type:contract` → contract/util; `type:adapter` → contract/util; `type:util` → util. Scope axis at :62-66. The specific claim *"`type:ui` and `type:feature` may not depend on `type:adapter`"* holds on both rows.
13. **`@creator-studio/tokens` (`type:util`) is reachable by exactly what it should be** — all six source tags list `type:util` as permitted, and `type:util` itself may depend only on `type:util`. Every package can use tokens; tokens can use nothing. Correct.
14. **Tags are right on all five packages.** `apps/studio/package.json:7-10` `type:app`+`scope:studio`; `packages/shell:16-19` `type:ui`+`scope:shared`; `packages/contracts:17-21` `type:contract`+`scope:shared`; `packages/tokens:18-22` `type:util`+`scope:shared`; `packages/adapters/local:17-21` `type:adapter`+`scope:shared`. Every tag AGENTS.md lists except `type:feature`, which has no package yet.
15. **No package exposes its internals.** All four library `package.json`s declare `exports` limited to `"."`, `"./package.json"` (plus tokens' deliberate `"./tokens.css"` at :15). Deep imports are unresolvable.
16. **The shell's public API does not leak the panel library.** `packages/shell/dist/index.d.ts` and `dist/lib/cockpit.d.ts` (read in full) mention only `ReactNode`, `LayoutStore` from contracts, and `PanelSize` from tokens. No `react-resizable-panels` type crosses the boundary, and `grep -rn "react-resizable-panels"` across `apps`, `packages`, `.ladle`, `tools` finds it only in `packages/shell/src/lib/cockpit.tsx` (lines 8, 23, 39) and one comment in `tools/vitest/setup.ts:2`. The aliased import at `cockpit.tsx:4` — `Panel as ResizablePanel` — is exactly as AGENTS.md specifies.
17. **Port key format** — `packages/contracts/src/lib/layout-store.ts:19` returns `` `cs:layout:${projectId}:${group}` ``, matching AGENTS.md verbatim, asserted at `layout-store.spec.ts:6` and proven end-to-end by check 7.
18. **Port 5180 strict** — `apps/studio/vite.config.mts:7` `const PORT = 5180`, `:13-15` and `:18-20` both `strictPort: true`; the comment at `:6` names 5173/5190 as the reference app's, matching AGENTS.md. `curl http://localhost:5180` → 200.
19. **Token structure** — `packages/tokens/src/tokens.css:12-35` primitives (`--cs-p-*`), `:37-59` light semantics, `:64-74` `[data-theme='dark']`, `:76-88` `prefers-color-scheme` fallback, `:92-111` `@theme inline` bridge. Exactly the three-layer structure AGENTS.md §Styling describes. `cockpitSizes` typed lengths at `src/lib/sizes.ts:8-14` with `satisfies Record<string, PanelSize>`; the unit rule is asserted at `sizes.spec.ts:7`.
20. **Root scripts match the documented gate order** — `package.json:14`: `typecheck && lint && lint:tokens && test && stories:build && build`, identical to AGENTS.md's `typecheck · lint · lint:tokens · test · stories:build · build`. Node/pnpm pinned at `:61-65` (`packageManager: pnpm@11.22.0`, `engines: node >=22 <23, pnpm >=11`), as documented.
21. **`nx sync` is current** — `npx nx sync:check` → `The workspace is up to date · [@nx/js:typescript-sync]: All files are up to date.` The five TS project references in `tsconfig.json:5-21` match the five projects.
22. **Adapter seed API is sound** — `layout-store.local.ts:5` copies via `new Map(Object.entries(seed))`, so the seed and the store are independent in both directions. Tested at `layout-store.local.spec.ts:12-14`.
23. **Adapter SSR fallback is genuinely correct at runtime** (the typing is finding 6). I traced all three paths: property absent → `?? undefined` → memory store; property throws → `catch` → memory store; present → delegated. All three are covered by `layout-store.local.spec.ts:17-48`.
24. **Git hygiene is otherwise clean.** `git show --stat HEAD` — 75 files, nothing generated committed. `git ls-files` confirms no `dist/`, no `out-tsc/`, no `*.tsbuildinfo`, no `screenshots/*.png` (correctly ignored per AGENTS.md's *"untracked proof"*), no `.nx/` caches. `pnpm-lock.yaml` is committed once as a fresh 11,978-line addition — no churn. `pnpm-workspace.yaml:1-4` covers `apps/*`, `packages/*`, `packages/adapters/*`, matching the actual layout. `git status --short` shows only the untracked review directory this review is being written into. The single omission is `.ladle/` — finding 1.
