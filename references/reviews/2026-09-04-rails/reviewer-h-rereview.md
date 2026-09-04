The F1a behaviour change is right, and I proved its whole state machine. What it doesn't have is a test.

## Findings

**MATERIAL — the F1a fix has no regression test; both suites pass on the defective commit.**

`use-panel-toggle.spec.tsx:230` is named "a reopen that could not act leaves memory alone" but never calls `expand()`. It mounts with `stuck=true` and asserts `memory.write` wasn't called — and the mount path never wrote memory even before the fix (`sync(false)` at `53cb769`). So it's green either way. `git show --stat HEAD` confirms the spec file wasn't touched, and `cockpit.mjs` got only the 760→600 edit.

I served `53cb769` — the commit carrying the defect, `use-panel-toggle.ts:142` = `return !sync(true)` — from a scratch clone and ran both suites against it:

- `vitest run` in `packages/shell` → **32 passed (32)**
- HEAD's harness, `BASE=http://localhost:5182` → **70 passed, 0 failed**

The defect is plainly visible there, so a test would bite. At 560px, pre-fix: clicking *Expand navigation* leaves bits `--- → 1--` and a wide reload keeps the nav at **48px, pressed=false**. HEAD: bits stay `---`, wide reload gives **160px, pressed=true**. Same at 520px.

This is F1b's own failure mode — a fix behind a test that can't go red — repeated on the finding G raised. G's clean row claims F3 and F4 were mutation-tested red on revert; F1a got only a session probe. Fix is two small additions: a harness block at 560px mirroring the table above, and a unit test that actually calls `act(() => result.current.expand())` on a stuck handle. Rename the `:230` test to say it covers the mount reconcile, which is what it tests.

**MINOR — `disposition.md:142` says "longest line 100"; `AGENTS.md:102` is 101.** The rest of the paragraph is ≤100. Worth noting no 100-char rule is stated in AGENTS.md at all, and 25 lines in the file exceed it (longest, `AGENTS.md:88`, is 184) — F5 was measured against an undeclared convention.

**MINOR — "Only two things write it" (`use-panel-toggle.ts:67`) undercounts.** Three call sites write: `:134`, `:124`, `:147`. It means two *kinds* of write and the next sentences clarify — but F1d existed precisely because a header asserted something the code didn't.

## Clean, with what I checked

All six required state-machine cases pass at HEAD, including the failed expand at 520/560px recording nothing and reopening on a wide reload. Four contradiction hunts found none: 11 window widths and 6 reload widths after a control collapse never produced bit `1` while open or an unbitted rail that should have had one; a squeeze-railed nav survives an unrelated drag; and a deliberate inspector collapse survives both a nav double-click reset and a nav drag — a neighbour's gesture can't silently forget an intentional hide. `collapsedByUs` still gates correctly (`sync()` clears it only on seeing the panel open, unchanged), and `sync`'s five call sites are all in-file, so dropping `record` breaks nobody.

F1b is confirmed exactly as claimed — at 760px both assertions pass on the pre-fix commit, at 600px pre-fix fails both and HEAD passes both. F1c's full cost is in the header, the friction note and the disposition; the decision framing sits in the two documents rather than the source header, which I read as correct placement. F2a's watcher is sound. Regression sweep is green: five regions and five named landmarks survive collapse, three expand controls present, top shelf session-only. I chased an apparent toolbar styling inconsistency — Inspector rendering in pressed ink at `aria-pressed=false` — and it's hover, not a bug.

```
pnpm nx run-many -t typecheck test lint --skip-nx-cache
  NX   Successfully ran targets typecheck, test, lint for 6 projects
  Output of 17 successful tasks were not shown.      [exited with code 0]

node tools/src/verify/cockpit.mjs
  70 passed, 0 failed (dev server)                   [exited with code 0]
```

Full report at `references/reviews/2026-09-04-rails/reviewer-h-rereview.md`; screenshots under `screenshots/review-h-*.png`. The scratch clone is trashed and :5182 is closed — the repo working tree is untouched apart from that report.
7px, bits stay `---`, and a 1440px reload reopens it at 160px
   `aria-pressed=true`. (At 480px the nav is not railed and at 600px the expand succeeds and
   correctly writes `0`; both are the rule working, not exceptions to it.)
4. A 600px window squeeze rails the nav and writes no bit.
5. A double-click reset that reopens the nav clears the stale bit: `1-- → 0-0`, nav 288px.
6. A collateral rail records nothing: at 600px a nav reset rails the inspector to 48px with bit
   unwritten, and a wide reload returns it at 200px, pressed.

**No bit/panel contradiction found.** Four hunts, all clean:
- 11 window widths 520–2200px after a control collapse: bit stayed `1` with the nav railed
  throughout; never bit `1` while open, never a rail whose missing bit should have been there.
- 6 reload widths 520–2200px on a remembered rail: consistent at every one.
- A squeeze-railed nav plus an unrelated separator drag: no hide stamped on it (`bits=-0-`), and it
  still reopens on a wide reload.
- A deliberate inspector collapse survives both a nav **double-click reset** (`--1 → --1`, inspector
  48px, still 48px and bit `1` after a reload) and a nav **drag** (`--1 → 0-1`). A neighbour's user
  gesture cannot silently forget an intentional hide.
- At 520px a `collapse()` with no slack leaves the inspector at 182px and writes no bit — the
  `else collapsedByUs.current = false` branch at `:135` behaves.

**`collapsedByUs` still gates correctly.** `sync()` clears it only on seeing the panel open
(`:97`), which is unchanged from before the refactor; it was never cleared on a recorded collapse,
so moving the write out of `sync` did not disturb it. `collapse()` sets it before acting and unsets
it on failure (`:129`, `:135`); `expand()` reads it to choose `expand()` vs `resize(restoreSize)`
(`:141`).

**Removing the `record` arg breaks no caller.** `sync` is module-private; its five call sites are all
inside `use-panel-toggle.ts` (`:112`, `:116`, `:124`, `:131`, `:143`). Grep across `packages/` and
`apps/` finds no other reference.

**F1b — mutation-tested.** §6a′ verbatim against both bases:

| | pre-fix `0671daa` | HEAD `6817730` |
|---|---|---|
| @600px | A1 **FAIL** (inspector bit `1`), A2 **FAIL** (48px, pressed=false) | A1 **PASS** (bit null), A2 **PASS** (200px, pressed=true) |
| @760px | A1 PASS, A2 PASS (inspector 200px — nothing rails) | A1 PASS, A2 PASS |

Exactly as claimed: 760 was vacuous, 600 discriminates. The clone's served source was confirmed
pre-fix (`onUserLayout = () => void sync(true)`) before running.

**F1c — cost stated in all three places.** Hook header `:75–79` ("drags or keys shut… not
remembered… the neighbour it made room for snaps back — at any window size… A control collapse is the
only hide that persists"); `friction-notes.md` ("recorded as a decision (Ryan's to overrule)", the
attribution alternative as the door); `disposition.md:141` ("Flagged to Ryan as the decision he may
overrule (with B6)"). The *decision framing* appears in the two documents, not in the source header —
which I read as correct placement, not a gap. Flagging it so Ryan can overrule.

**F1d — header matches the code**, subject to M3: `collapse()` writes only when it acted (`:134`),
`expand()` and `onUserLayout` write only a reopen and only when they acted (`:147`, `:124`), nothing
writes on the mount (`:112`), on a bare `onResize` (`:116`), or on a no-slack call.

**F2a — every pending timer cleared.** `cockpit.tsx:136–153`: a per-effect `Set`, each timer removes
itself on fire (`:142`), cleanup calls `pending.forEach(clearTimeout)` (`:152`). `Set.forEach` passes
extra args that `clearTimeout` ignores. Correct. (Untested, as the disposition states.)

**F5 — the AGENTS.md paragraph reads correctly** and wraps at ≤101; see M2 for the one-char miss.

**Regression sweep, all green.**
- Five regions render; all five still in the DOM after collapsing three
  (`screenshots/review-h-rails.png`, `review-h-collapsed-all.png`).
- Five named landmarks before and after collapse: `SECTION[Top shelf]`, `SECTION[Navigation]`,
  `SECTION[Manuscript]`, `SECTION[Context shelf]`, `SECTION[Inspector]`.
- Three `Expand …` controls present on the rails/strip.
- Toolbar truthful: `aria-pressed` false for all three collapsed regions while their regions read
  48×851 / 1342×32 / 48×851. I chased an apparent styling inconsistency in
  `review-h-toolbar-2x.png` (Inspector rendering in pressed ink at `aria-pressed=false`) and it is
  **hover**: with the pointer parked away it matches its siblings at `oklch(0.62 0.012 95)`. Not a
  finding.
- Focus handoff and top-shelf session scoping pass inside the harness run below; separately
  re-measured: top shelf mounts at 48px after a reload while rails/strip return with bits `111`.

**Scope.** Eight files, every one traceable to F1a–F5 or to the review record itself
(`brief-h-rereview.md`, `disposition.md`, `reviewer-g-rereview.md`). No creep.

## Runs

```
pnpm nx run-many -t typecheck test lint --skip-nx-cache
  NX   Successfully ran targets typecheck, test, lint for 6 projects
  Output of 17 successful tasks were not shown.      [exited with code 0]

node tools/src/verify/cockpit.mjs
  70 passed, 0 failed (dev server)                   [exited with code 0]
```

Screenshots: `screenshots/review-h-open.png`, `review-h-rails.png`,
`review-h-collapsed-all.png`, `review-h-toolbar-2x.png`, `review-h-toolbar-after-reload.png`.
