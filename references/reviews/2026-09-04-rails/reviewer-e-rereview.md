**D1's stated defect is genuinely fixed, but the fix leaves one user gesture unattributed — and that gesture reproduces D1's failure verbatim.** Full report at `references/reviews/2026-09-04-rails/reviewer-e-rereview.md`.

## E1 — MATERIAL. Double-clicking a separator reopens a panel without recording it

Wave three narrowed the memory write to `collapse()`/`expand()` plus `meta.isUserInteraction`. The library routes exactly one user gesture through its *imperative* path instead: the separator's double-click reset. `_e` at `react-resizable-panels.js:1017-1034` calls `u.resize(s)`; the imperative commit at `:956-983` calls `j(p, {…})` with no meta, and `j` at `:472-480` defaults `isUserInteraction` to false. So `cockpit.tsx:120` never fires and nothing writes. The gesture is live and documented (`cockpit.tsx:240`), with `disableDoubleClick` unset on all three separators (`studio-cockpit.tsx:111,117,130`).

Two arms, identical except for how the nav was reopened:

```
DBLCLICK  collapse nav=48 bits=1-- → dblclick nav=288 bits=1-- → squeeze 600 → reload@1440: nav=48  pressed=false rail=1
TOOLBAR   collapse nav=48 bits=1-- → button   nav=288 bits=0-- → squeeze 600 → reload@1440: nav=160 pressed=true  rail=0
```

That first line is D1's bug, still live. It's a **regression of this commit** — the removed `onResize = () => void sync(settled.current)` used to record it. The context shelf behaves the same way.

The fix belongs on the separator, where the gesture is observable: the library's `dblclick` listener is document-level capture (`:1518`), so it has already committed the reset when React's bubble-phase `onDoubleClick` runs. Give `CockpitSeparator` the same `UserLayoutContext` the panels read and notify listeners from `onDoubleClick`, skipped when `disableDoubleClick` is set. `:1031` is the only imperative call site in the whole bundle, so this closes the gap completely rather than patching one instance.

## E2 — MINOR. §8's keyboard-bit assertion doesn't test D1's fix

`cockpit.mjs:355` would pass with `onUserLayout` deleted. Enter on that separator is handled by the app, not the library — `studio-cockpit.tsx:82-86` calls `contextToggle.toggle()` → `collapse()` → `sync(true)`, a write that predates wave three. The harness prints bits `000` entering §8, so `[1] === '1'` is satisfied by `collapse()` alone. The library's keyboard attribution *is* real (ArrowRight on the nav separator: 288 → 360, bits `0-0`), but nothing asserts it. Add that arrow-key assertion and retitle the existing one.

## E3 — MINOR. AGENTS.md bans the dashboard's mode flag, not the dashboard

`playwright-cli show --help`: `show` opens the window; `--annotate` only switches its mode. `AGENTS.md:101` bans `show --annotate`, so bare `show` reads as permitted. The absolute headline and "examples, not its extent" cover it, but this is the exact sentence D2 raised.

## E4 — MINOR. An unstated behaviour change rode along

`{...layout}` previously wired the deprecated `onLayoutChange` (per-pointer-move, debounced) alongside `onLayoutChanged`; the destructure drops it, so layouts now persist on release only. Benign, arguably better, but unmentioned in a diff whose whole subject is which signals write storage.

## Checked and clean

I reproduced D1's table from scratch before reading the disposition's numbers: 1440 → nav 288 no bits; 600 → 48 no bits; back → 48 no bits; reload → **160px, pressed, no bit**. The residual is stated honestly, and the `onlySaveAfterUserInteractions` reasoning checks out against `:1878-1882` — it really would stop persisting toggle collapses. D3 measures true (a plain mount leaves only the two `cs:layout:` keys). The broadcast reaches panels that didn't move and doesn't cross groups (nav drag → bits `0-0`, context untouched). No listener leak or per-render re-registration: the Set is a ref, cleanup deletes, and the Group's own callbacks are `useEvent`-stable (`se`, `:1548`). StrictMode is on (`main.tsx:8`) and the double-invoked effect is benign in practice. D4 is now revert-sensitive and the 240px replay is genuine. D5 leaves no test ratifying the defect. Scope is nine files, all inside D1–D5 or the review record.

Of the seven new assertions, five bite on revert, one (`a 600px window squeezes the nav to its rail`) is a precondition, and one is E2.

`pnpm nx run-many -t typecheck test lint --skip-nx-cache` → `Successfully ran targets typecheck, test, lint for 6 projects`, 17 tasks all `✔`. `node tools/src/verify/cockpit.mjs` → `63 passed, 0 failed (dev server)`.
rely and the assertion still passes.

**Citation.** The harness's own output shows bits `000` entering §8 (`and the reopens were remembered
too — 000`), then `010` after the Enter. With `onUserLayout` removed, the preceding
`drag(CTX_SEP, 0, -60)` writes nothing (context stays `0`) and the Enter's `collapse()` still writes
`1` — same `010`. `studio-cockpit.tsx:76–81` states why the library stays quiet on that Enter (`main`
is not collapsible).

The library's keyboard attribution is real and does work — arrow keys reach `:1113`
(`{ isUserInteraction: !0 }`). Measured independently: fresh mount, focus `Resize navigation`,
`ArrowRight` → nav 288 → 360, bits `0-0`. Nothing in the harness asserts it.

The disposition's D1 row therefore overstates: "§8 asserts a keyboard collapse does [write the bit]"
describes an assertion about the toolbar path.

**Recommended fix.** Add one assertion on the library's own keyboard path — `fresh()`, focus
`NAV_SEP`, `ArrowRight`, then `(await bits())[0] === '0'` (it is `-` before) — and retitle the §8
assertion to name the app's Enter handler rather than "the user's".

### E3 — MINOR. `AGENTS.md` bans the dashboard's *mode flag*, not the dashboard

**Claim.** The rule forbids "`show --annotate` (a dashboard window)". The window is opened by `show`
itself; `--annotate` only switches an already-open dashboard into annotation mode.

**Citation.** `playwright-cli show --help`: *"Show Playwright Dashboard"*, with `--annotate` listed as
*"switch the dashboard into annotation mode."* A literal reader could take bare `playwright-cli show`
as permitted. The absolute headline and "the bans below are examples of that rule, not its extent"
(`AGENTS.md:97–99`) do cover it — this is a precision defect, not a hole — but it is the exact
sentence D2 was raised about, so it should name the right token.

**Recommended fix.** `AGENTS.md:101` → ban `playwright-cli show` (the dashboard, with or without
`--annotate`).

### E4 — MINOR. An unstated behaviour change rode along with the refactor

**Claim.** `Cockpit` previously spread `useDefaultLayout`'s whole return onto `Group` (`{...layout}`),
which wired the **deprecated** `onLayoutChange` — called on every pointer move, debounced 100ms —
alongside `onLayoutChanged`. HEAD destructures only `defaultLayout` and `onLayoutChanged`, so a
layout is now persisted on release only, never mid-drag.

**Citation.** `useDefaultLayout`'s return type, `react-resizable-panels.d.ts:488–500`, has all three
members; the group calls `f` (onLayoutChange) unconditionally and `d` (onLayoutChanged) only when the
interaction is no longer active, `react-resizable-panels.js:1761`. The commit message and the
disposition's D1 row mention neither.

The change is benign and arguably an improvement — one debounced writer of the same key removed, and
harness §3 still proves a drag survives a reload. But it is a silent behaviour change in a diff whose
whole subject is *which* signals write storage.

**Recommended fix.** One line in the disposition's D1 row recording it.

---

## Checked and clean — what, and how

- **D1's own table, reproduced from scratch before reading the disposition's numbers.** Cleared
  storage, mount 1440×900 → nav 288, no bits; viewport 600 → nav 48, no bits; back to 1440 → nav 48,
  no bits; reload → nav **160px, `aria-pressed=true`, no bit `1`**, stored share
  `{"nav":11.127,…}`. The squeeze is no longer recorded as intent.
- **The residual is stated honestly.** The disposition and the §1b assertion text both say the nav
  reopens at its minimum because the degraded share is what the store kept; measured 160px, and the
  11.127% share in storage is the reason. No overclaim.
- **The `onlySaveAfterUserInteractions` reasoning is correct against the library source.**
  `react-resizable-panels.js:1878–1882` — the hook returns early on `!h.isUserInteraction` when the
  option is set, and `collapse()`/`expand()` reach `j` with no meta (`:956–983`, `:472–480`), so a
  toggle collapse would indeed stop being persisted. The friction note's account of the door is
  accurate.
- **D3, measured not asserted.** A plain mount leaves exactly `cs:layout:default:body` and
  `cs:layout:default:center` in `localStorage` — no `cs:collapsed:` key. "Intent only" holds.
- **The broadcast reaches panels that did not move, and does not cross groups.** Fresh mount, drag
  `Resize navigation` → bits `0-0`: nav and **inspector** both written (inspector never moved),
  context untouched (it lives in the `center` group). Matches `cockpit.tsx:94–101` exactly.
- **Nested groups register against their own group.** `UserLayoutContext` is provided per `Cockpit`
  (`cockpit.tsx:125`) and read in `CockpitPanel` (`:181`), which is rendered by its own cockpit — so
  `context` hears the `center` group and `nav`/`inspector` hear `body`. Confirmed by the probe above.
- **No listener leak, no per-render re-registration.** `listeners` is a `useRef` Set (`:116`);
  `CockpitPanel`'s effect adds and its cleanup deletes (`:182–186`); `onUserLayout`'s identity changes
  only when the panel handle attaches (`use-panel-toggle.ts:115` → `sync` → `[handle, memory]`, and
  `memory` is a `useMemo` on `[store, projectId, region]`, `studio-cockpit.tsx:151`). The Group's own
  callbacks are `useEvent`-stable (`se`, `react-resizable-panels.js:1548–1556`), so the cockpit's
  `onLayoutChanged` identity cannot re-run the group's effect.
- **StrictMode.** The app mounts under `StrictMode` (`apps/studio/src/main.tsx:8`); the double-invoked
  effect adds, deletes, re-adds into a Set. 63/63 harness assertions pass against that build with
  zero console and zero page errors, and my probes logged `errors: none`.
- **D4 is now revert-sensitive and the replay is genuine.** §8 drags the shelf 60px off its default
  first and asserts it (`the shelf sits off its default — 240px`), then the Enter round trip restores
  `240 → 240`. A fallback to the 180px default would now miss by 60px. The replay is real: the Enter
  collapse sets `collapsedByUs`, so `expand()` takes `handle.expand()` and the library replays its
  recorded `expandToSize` (`react-resizable-panels.js:993–999`).
- **D5 — no test still ratifies the defect.** `use-panel-toggle.spec.tsx:37–47` splits `resizeTo` (a
  bare `onResize`) from `dragTo` (`onResize` then `onUserLayout`). The new test at `:194–200` asserts
  a bare size change writes nothing; `:182–192` asserts buttons and released drags write, exactly 3
  times. No remaining test asserts that `onResize` alone writes. `:224–226` pins the binding at three
  props.
- **Revert-sensitivity of the seven new assertions.** Five bite, one is a precondition, one does not:
  §1 *no bits on a plain mount* (restoring the `onResize` write makes the mount write `000`) ✓;
  §1b *writes no collapsed bit* ✓; §1b *reload mounts the nav open and pressed* ✓; §7 *a released
  drag is remembered* ✓ against deleting `onUserLayout` (context is `-` before the drag — the
  assertion prints `010`), though it would also pass against restoring the old `onResize` write;
  §8 *sits off its default* ✓ (that assertion is D4's fix). §1b *a 600px window squeezes the nav to
  its rail* is a precondition observation, not a fix assertion. §8 *a keyboard collapse is
  remembered* — **no**, see E2.
- **Scope.** Nine files, all inside D1–D5 or the review record: `AGENTS.md` (D2),
  `cockpit.tsx` + `use-panel-toggle.ts` (D1), `use-panel-toggle.spec.tsx` (D5),
  `tools/src/verify/cockpit.mjs` (D1/D3/D4), `references/friction-notes.md` +
  `disposition.md` + the three brief/report files. No unrelated edit. The one unnamed rider is E4.
- **The `AGENTS.md` rule, judged as a governing rule.** The self-exemption D2 flagged is gone: the
  sole exception is Ryan in the current session, and "an agent's own reading of necessity is never
  one" closes the loophole explicitly. The list is framed as examples rather than an enumeration, so
  an unlisted headed path is still forbidden. Its factual claims hold here: `--headed` is a real flag
  on `playwright-cli open` (so "headless unless told otherwise" is accurate), and
  `.ladle/vite.config.mts` does set `server: { open: false }` and `preview: { open: false }`, with a
  comment saying why. Only E3's token is wrong.

## Runs

- `pnpm nx run-many -t typecheck test lint --skip-nx-cache` →
  `NX   Successfully ran targets typecheck, test, lint for 6 projects`, 17 tasks, all `✔`, cache
  skipped, 3.3s.
- `node tools/src/verify/cockpit.mjs` → `63 passed, 0 failed (dev server)`.
