Two material findings, both reproduced against the running app. Suites and harness are green.

---

# Re-review of `053c544` — the rail/strip fix wave

**Ran, with results.** `pnpm nx run-many -t typecheck test lint --skip-nx-cache` → `Successfully ran targets typecheck, test, lint for 6 projects`, 17 tasks, exit 0 (Nx flagged `shell:typecheck` as flaky on timing, not failure). `node tools/src/verify/cockpit.mjs` → **`52 passed, 0 failed (dev server)`**, exit 0.

## Findings

### 1 · MATERIAL — A1 is fixed for the shelf only. Nav and inspector still mount collapsed from a stored share, and three documents now record the defect as solved.

The disposition marks A1 **Fixed**; `studio-cockpit.tsx:29-35` and `references/friction-notes.md:43-50` both describe the mount-time clamp as a property of the pinned shelf, cured by making the root group session-only. It isn't a property of the shelf. It is a property of *any* collapsible panel whose stored percentage falls below `(collapsedSize + minSize) / 2` at the new window size — and `#nav` and `#inspector` still read their shares from `localStorage` (`studio-cockpit.tsx:93`, `:107`).

Reviewer A's carve-out — *"their thresholds land below ~680px width, where the body group already can't satisfy 160 + 320 + 200"* — was computed from the **default** 20% share. A user who drags nav to its 160px minimum stores `11.127%`, which moves the cliff to ≈935px. Measured, fresh browser context per row, seeded only with what the app itself wrote at 1440×900 after that drag:

```
stored: cs:layout:default:body = {"nav":11.127,"center":64.873,"inspector":24}

@1440: nav=160  expandNavBtn=0  aria-pressed=true
@1100: nav=160  expandNavBtn=0  aria-pressed=true
@1000: nav=160  expandNavBtn=0  aria-pressed=true
@950:  nav=160  expandNavBtn=0  aria-pressed=true
@900:  nav=48   expandNavBtn=1  aria-pressed=false   ← cliff
@820:  nav=48   expandNavBtn=1  aria-pressed=false
```

At 900px the body group needs `160 + 320 + 200 = 680` and has 900, so this is not over-constraint. Screenshot: `screenshots/review-c-nav-mounts-railed-at-900.png` — nav is a `»/N` rail the user never asked for, with `Navigation` reading unpressed.

It is the same mount-only mechanism, confirmed by the contrast: seeding that layout at 1440 and **live-resizing** holds nav at 160px through 1200/1000/950/900/820, releasing only at 750 where the group genuinely runs out of room.

`e60933b` introduced this for the sidebars too — with `collapsedSize: 0px` the midpoint was 80px and `11.127% × 900 = 100px` clamped up to the 160px minimum; with `rail` at 48px the midpoint is 104px and the same 100px snaps down to collapsed. Nothing in `053c544` touches it, and the harness cannot see it: §5b only exercises the root group.

**Fix.** Apply reviewer A's actual recommendation rather than its containment half: on mount, reconcile a panel that came up collapsed against a persisted collapsed-or-not bit, and `expand()` when they disagree. `usePanelToggle` already has the mount effect (`use-panel-toggle.ts:72-74`) and the imperative handle to do it in one place, which covers all four regions instead of one. Whatever you land on, the two docs need correcting — right now `friction-notes.md` tells the next session this class of bug is closed. Add a harness assertion mirroring §5b: seed a dragged-narrow nav share, mount at 900×800, assert `#nav === 160`. It fails today.

### 2 · MATERIAL — the `CompactStates` story fights the user and cannot be escaped; expanding the shelf destroys every region they opened.

B5's fix is a story so a designer can see the rails. `CollapseAllOnMount` (`studio-cockpit.stories.tsx:47-59`) guards its one-shot with a `useRef` — but it renders *inside* the `top` panel, so `top.collapse()` unmounts it. Expanding the shelf remounts it with a fresh `done` ref, and it collapses everything again. Driven headlessly against `ladle preview` on the built bundle:

```
mounted:                       top=32 nav=48  ctx=32  insp=48
user opens nav/insp/context:   top=32 nav=288 ctx=183 insp=345
then user expands the shelf:   top=32 nav=48  ctx=32  insp=48   ← all three wiped
after 3 more tries:            top=32 nav=48  ctx=32  insp=48
toolbar visible? 0
```

Zero console or page errors. Screenshots: `screenshots/review-c-story-user-opened-three.png`, `review-c-story-shelf-reslams.png`. So the one control on the strip does the opposite of what it says, and the story's toolbar is unreachable forever — a reviewer cannot compare `CompactStates` against `WritersCockpit` from inside the story.

**Fix.** Move the collapser out of the region it collapses: pass it as part of `main` (never collapsible) and keep `top={<StudioToolbar />}`. The ref then survives, `done` holds, and every expand control works. B5's own suggestion — seeding the store with an already-collapsed layout — is the alternative, and it would also make the story honest about the shelf being session-scoped.

### 3 · MINOR — the new session-store test asserts neither thing its name claims.

`packages/shell/src/lib/cockpit.spec.tsx:100-113`, named *"keeps its layout for the session only and touches no store"*, asserts only that `#one` and `#two` are in the container. It proves the render doesn't throw and nothing else; it would pass if `Cockpit` wrote every key to `localStorage`. This is the unit-level counterpart of A1's fix, and A1's fix is the one thing in the diff with no unit coverage.

**Fix.** The file already has `memoryStore()` with `reads()`/`keys()` (`:8-24`). Render with a spy installed on `localStorage` (or assert against a store handed to a sibling `Cockpit`) and assert zero reads and zero writes; then unmount, remount, and assert the layout came back at defaults rather than restored.

### 4 · MINOR — A4's loose comparison survives four lines from where A4 was fixed.

`tools/src/verify/cockpit.mjs:230` correctly became an exact-restore check. `:306` still reads:

```js
ok('Enter again brings it back', (await height('#context')) > 100, …)
```

`contextMin` is `120px` and `contextDefault` is `180px` (`packages/tokens/src/lib/sizes.ts:24-25`), so `> 100` passes on a restore to the minimum just as A4's `> 100` did for the inspector. Same defect, same section of the same file, left behind.

**Fix.** Capture the height before the `Enter` at `:302` and compare within 1px, exactly as `:230` and `:259` now do.

### 5 · MINOR — §8c's fourth assertion names a landmark it does not check.

`cockpit.mjs:324` is titled *"expanding from the rail keeps focus inside the nav, on its landmark"* but tests `focusWithin('#nav') && width('#nav') > 100`. It would pass if focus landed on any descendant. It happens to be right — I confirmed `document.activeElement` is `SECTION[aria-label="Navigation"][tabindex="-1"]` — but the assertion doesn't say so, and the `FOCUSABLE`-first branch in `useFocusHandoff` means the target will silently change the day a region's content gains a button.

**Fix.** Assert the tag and accessible name of `document.activeElement`, not just containment.

### 6 · MINOR — the handoff's landmark target has no design-system focus ring.

When focus lands on the landmark it gets Chrome's default `auto 1px rgb(0, 95, 204)` — visible (screenshot `screenshots/review-c-focus-after-rail-expand.png`, blue box around the inspector heading) but a different ring from the `solid 2px` the separators paint and the harness asserts at `:293`. Two focus treatments in one keyboard journey.

**Fix.** Give the handoff target the same token ring the separators use, or set `tabIndex` in JSX on `Rail`/`Strip`'s and `Region`'s `<section>` so the styling has a stable hook instead of a runtime DOM mutation.

### 7 · MINOR — an unrelated governing-rule edit rode in on the fix commit.

`AGENTS.md:95-100` gains a paragraph about headless browser verification. It's good guidance and it's correct, but it answers none of A1–A5 or B1–B12 — it belongs with `ad71d78`, the commit that actually fixed the browser-opening leak. AGENTS.md is ground truth later sessions read; slipping it into a fix commit is how a rule change escapes its own review.

### 8 · MINOR — "Top shelf" is a landmark only while collapsed.

B2's disposition says `Rail` and `Strip` are *"landmarks named like their region."* For `top` there is no full-region landmark to be named like: expanded, the shelf renders `StudioToolbar`'s plain `<div>` (`studio-toolbar.tsx:13`); collapsed, `Strip` renders `<section aria-label="Top shelf">`. `app.spec.tsx:8-11` records the asymmetry — four regions asserted, `#top` checked only by id. A screen-reader user navigating by landmark watches a region appear and vanish as the shelf toggles.

**Fix.** Wrap `StudioToolbar`'s row in `<section aria-label={REGION_TITLES.top}>` so the name is constant across the swap. That also gives `useFocusHandoff` a landmark to fall back to for `top`.

---

## Checked and clean

- **§5b is not vacuous, and I checked the key it seeds is the real one.** Hooking `Storage.prototype.getItem` in a fresh context showed the app reads exactly `cs:layout:default:body` and `cs:layout:default:center` — unsuffixed, so `cs:layout:default:root` is genuinely the key the root group used before this commit. §5b passes because the root group now ignores stored state entirely, which is the fix; it would have failed against `e60933b`. It is a valid regression guard, just a narrow one (finding 1).
- **The `sessionStore` memo is keyed correctly.** `cockpit.tsx:103` memoises on `[store]`; with `store === undefined` the dep is stable, so one bag lives for the component's lifetime, and I confirmed nothing is written: after mounting and collapsing the shelf, `localStorage` holds only the `body` and `center` keys.
- **Nothing else relies on the root group being persisted.** Grepped every `<Cockpit ` usage: `cockpit.stories.tsx:19,53,61` and `cockpit.spec.tsx:26,44,61,76,81` all pass a store; only `cockpit.spec.tsx:103` and the preset's root omit it. Harness §9 (`:353-358`) still lists `'root'` in its allowed-key set, which is now dead but harmless — a stale `cs:layout:default:root` left in an existing user's storage is orphaned rather than read, and §7b (`:275-279`) proves the shelf mounts expanded after a reload.
- **The `store?: LayoutStore` widening does not ripple wrongly.** `StudioCockpitProps.store` is `NonNullable<CockpitProps['store']>` (`studio-cockpit.tsx:39`), so the app still cannot forget one. Typecheck is green across all 6 projects.
- **`useFocusHandoff` does not leak its `pending` flag — I tried to make it.** The `if (!acted) pending.current = false` guard plus the fact that a truthful `acted` always flips `toggle.collapsed` (`use-panel-toggle.ts:79-92`) closes the structural path. Empirically: six consecutive `Enter` toggles of the context shelf driven from its separator (outside every region) left focus on `DIV:Resize context shelf` every single time, and a subsequent pointer drag that collapsed nav to 48px left focus on `DIV:Resize navigation`. Three rapid `Enter`s on the self-unmounting "Top shelf" button landed correctly on `Expand top shelf` with `#top` at 32px. Zero page errors.
- **StrictMode is fine.** `apps/studio/src/main.tsx:8` wraps the app; every probe above and all 52 harness assertions ran against it. `pending` is `false` at mount, so the double-invoked effect is a no-op, and the four §8c transitions land on the right targets under it.
- **The `tabIndex = -1` mutation does not touch tab order.** Walked the tab sequence before and after triggering the landmark branch: identical — four toolbar buttons, then `Resize navigation` / `Resize context shelf` / `Resize inspector`. The `<section>` never enters the sequence (it wasn't tabbable before, and `-1` keeps it that way), and React never re-renders the attribute away because it isn't set in JSX.
- **Wrapping the toggles preserves the `Cockpit.Regions` identity contract.** `useFocusHandoff`'s `useMemo` is keyed `[id, toggle]` (`studio-cockpit.tsx:151-162`) and `usePanelToggle` returns a memoised object (`use-panel-toggle.ts:105-108`), so `regions` at `:65-68` changes identity exactly when it did before — on a real `collapsed` flip.
- **No duplicate landmark name at any moment.** `Rail`/`Strip` and the full region are the two arms of one ternary (`studio-cockpit.tsx:86,103,120,134`), so `Navigation`, `Context shelf` and `Inspector` each resolve to one `region` node in every state. The toolbar's `Navigation` button and the `Navigation` region carry different roles, and the harness's `button()` helper is `getByRole('button', { exact: true })`, so §5b's `getByRole('button', { name: 'Top shelf' })` correctly counts 0 while the strip's visible "Top shelf" text is on screen.
- **B4's diagram is genuinely repaired.** Counted the box glyphs per row: every row is 53 columns to the closing border, with bars at columns 5 / 12 / 40 / 52 including the `CONTEXT SHELF` row, which now correctly reads as nested inside the centre column beside the inspector.
- **B9, B10, B12, B3 are real fixes in the diff.** `pinnedPanel(topHeight, strip).collapsedSize` asserted (`cockpit.spec.tsx:116-118`); the token comment now cites `AppShell.tsx` `TOP_HEIGHT` (`sizes.ts:11`); `GLYPH` and `REGION_TITLES` are `Record<StudioRegion, …>` so a new region is a type error and `region`/`title` cannot drift (`studio-rails.tsx:16`, `studio-regions.ts:9-14`); `StudioCockpitProps` is back to five slots with `Rail`/`Strip` rendered by the preset, and `Rail`'s prop type is `Extract<StudioRegion, 'nav' | 'inspector'>`, so `<Rail region="top" />` won't compile.
- **Environment note, pre-existing and outside this diff.** `pnpm exec ladle serve` fails in this workspace with `Internal server error: Missing field 'moduleType'` from `builtin:vite-react-refresh-wrapper` (rolldown 1.2.6 under Ladle's bundled Vite 6) — the page renders blank with 404s on every module. `ladle build` + `ladle preview` works, which is what I used and what `friction-notes.md:30-33` already recommends. Nothing I ran opened a window: headless Chromium throughout, `BROWSER=none` on both Ladle processes, both killed afterwards, and my scratch scripts moved to the trash.
