**The wave's central claim — "a collateral rail is never written and the mount reconcile reopens it" — does not hold, and the test written to prove it tests nothing.** The `onUserLayout` change itself is correct and well-covered; the two failures are next to it, in `expand()` and in the harness's chosen viewport width.

## F1a — MATERIAL. A failed expand still writes a hide, so a window-caused rail is still permanent

**Claim.** `expand()` ends with `return !sync(true)` (`packages/shell/src/lib/use-panel-toggle.ts:142`), and `sync(true)` writes `memory.write(handle.isCollapsed())` (`:93`). When the group has no slack the expand cannot act, `isCollapsed()` is still true, and the hook records bit `1` — a deliberate hide the user never asked for, on a rail the *window* caused. C1's mount reconcile (`:108`) then stands down forever. This is D1's failure exactly, and F1's disposition asserts it is closed ("Only the toolbar toggle (`collapse()`) records a hide").

**Citation.** Measured against the dev server at HEAD, fresh storage, 560×900:

```
@560 fresh   : nav=47 insp=196 bits=---     ← D1 holds: the window's rail writes nothing
@560 expand  : nav=47 insp=196 bits=1--     ← "Expand navigation" fails and records a hide
@560→1440    : nav=48  pressed=false        ← permanent, after widening and reloading
```

`screenshots/review-g-1-fresh-560-window-rail.png` and `screenshots/review-g-2-permanent-rail-at-1440.png` — the second is a 1440px window with nav still a 48px rail and its toolbar button unpressed. The user's only affordance on that rail is the button that poisons it. Also reproduced at 420px (`bits=---` → `1--`).

This predates the commit (pre-fix server on `0671daa` behaves identically: `bit null -> 1`), so it is not a regression — but it falsifies the claim this wave was written to establish, which puts it in scope.

**Fix.** Record only an expand that acted. `expand()` should write `false` on success and nothing on failure, mirroring `onUserLayout`'s new rule — the same one-line shape: read `isCollapsed()` after the call and record only when it came back open. The comment at `:140–141` ("an expand() that could not act keeps the memory for the next attempt") describes behaviour the code does not have: there is no memory to keep, it creates one.

## F1b — MATERIAL. §6a′ passes identically on the pre-fix commit; 760px is the wrong width

**Claim.** The regression test added for F1 (`tools/src/verify/cockpit.mjs:288–309`) runs at 760px, where the nav double-click reset changes nothing at all — so the watcher's guard suppresses the notify, `onUserLayout` never fires, and both assertions pass vacuously. The collateral rail reproduces at 600px, which is the width reviewer F measured and the disposition records.

**Citation.** I served `0671daa` from a scratch clone on port 5199 (`BROWSER=none`, headless) and ran §6a′ verbatim against both. Discriminator first, to prove the clone really served pre-fix code:

```
PRE-FIX 0671daa drag+900: nav=1070 insp=48 bits=0-1
HEAD    53cb769 drag+900: nav=1070 insp=48 bits=0--

PRE-FIX §6a' @760: nav=160 insp=200 bit=null → assert1 PASS ; wide insp=200 → assert2 PASS
HEAD    §6a' @760: nav=160 insp=200 bit=null → assert1 PASS ; wide insp=200 → assert2 PASS
PRE-FIX §6a' @600: nav=230 insp=48  bit=1    → assert1 FAIL ; wide insp=48  → assert2 FAIL
HEAD    §6a' @600: nav=230 insp=48  bit=null → assert1 PASS ; wide insp=200 → assert2 PASS
```

At 760 the inspector is never railed (`screenshots/review-g-narrow-760-after-dblclick.png`); at 600 it is (`screenshots/review-g-collateral-600-head.png`). The friction note carries the same unverified width twice — `references/friction-notes.md:59` "a nav reset at 760px wide rails the inspector" and `:66` "§6a′ nav reset at 760px railing the inspector" — both factually wrong, in the document later sessions read as ground truth.

**Fix.** Change 760 to 600 in `cockpit.mjs:293` and correct both friction-note sentences. At 600 the test discriminates perfectly, as the table shows.

## F1c — MATERIAL. The recorded cost understates itself: the neighbour's width is lost too

**Claim.** The disclosed trade is "a sidebar *dragged* shut is no longer remembered across a reload." Measured, the reload also discards the width of the panel the user *widened*, at an ordinary 1440px window — a layout the user deliberately built is partly undone at the same window size.

**Citation.** 1440×900, drag the nav separator +900 to shut the inspector, then reload with no size change:

```
PRE-FIX after drag : nav=1070 insp=48  bits=0-1
PRE-FIX same reload: nav=1070 insp=48  bits=0-1   ← layout preserved
HEAD    after drag : nav=1070 insp=48  bits=0--
HEAD    same reload: nav=918  insp=200 bits=0--   ← inspector reopens, taking 152px from nav
```

`screenshots/review-g-drag-layout-lost-on-reload.png`. The keyboard is in the same class and is not named anywhere: 40× ArrowLeft on the nav separator collapses it to 48 with bits `0-0`, and a same-size reload reopens it at 160.

**Fix.** No code change — the decision was Ryan's to make and F offered it as such. But the record should state the cost accurately: a drag- or key-built layout that shuts a panel is not remembered *and the neighbour it made room for snaps back*, at any window size. That is a materially bigger price than the one the disposition quotes, and Ryan ruled on the smaller one.

## F1d — MATERIAL. The hook's contract header still documents the rule F1 deleted

**Claim.** `packages/shell/src/lib/use-panel-toggle.ts:68–70` still reads "Memory is written from intent only: collapse() and expand(), and a layout change the library attributes to the user (a released drag, a separator key)". A released drag no longer writes a collapse — that is the whole of F1. This is the doc block a later session reads as the hook's contract, and the brief's question — is the acceptance stated in the preset header — answers no: it is absent there and contradicted.

**Fix.** Rewrite `:68–70` to the new rule and put the accepted cost in it: a drag or separator key records only a reopen; only `collapse()` records a hide; a dragged-shut panel reopens on the next mount. Frame it as a recorded decision, as the friction note and disposition do.

## F5 — MINOR. The AGENTS.md rewrap moved the overflow rather than removing it

**Claim.** F5 shortened `AGENTS.md:101–102`, but line 103 is now **128 characters** in a paragraph whose other lines run 93–101 (measured, lines 95–106: 96, 100, 96, 98, 93, 100, 98, 101, **128**, 99, 99, 52). The `Dev servers are the other leak: Ladle's` clause was pushed onto the tail line and never re-flowed.

**Fix.** Re-flow lines 101–106 as a block.

## F2a — MINOR. The cleanup cancels only the most recent timer

**Claim.** `cockpit.tsx:136` holds a single `pending` id, overwritten by each dispatch. Two `dblclick` events in one task leak the first timer, which the cleanup then cannot cancel — the exact throw F2 fixed. Real double-clicks arrive in separate tasks, so this is theoretical rather than reachable; I list it because the fix is one character wider. Separately, F2 has no test at any level: I reverted the `clearTimeout` in a scratch clone and all 32 shell tests still passed.

**Fix.** `clearTimeout(pending)` before scheduling, or hold a `Set` of ids.

---

## Checked and clean — what, and how

- **F1's write rule, the whole intent story.** Toolbar collapse survives a same-size reload (`bits=1--`, nav 48 before and after reload). A toolbar collapse followed by a separator double-click reopens the nav to 288 and clears the bit to `0` (§6a's story, reproduced by hand: `1--` → `0-0` at 288px). A window squeeze writes nothing (`@600 fresh: nav=48 bits=---`). A drag that collaterally rails a sibling records nothing for it (`@1440 drag+900 → bits=0--`), and a wide reload reopens it at 200px, pressed `true`.
- **The residual contradiction, and its blast radius.** Memory does end up holding `0` while a panel sits at its rail — measured `bits=0-0` with the inspector at 48px after a small drag then a wide one. The reconcile at `:108` only ever expands, so the consequence is bounded to the reopen already covered by F1c; it cannot collapse a panel that mounted open. No path I found leaves bit `1` while a panel is open.
- **F3 and F4 both fail when reverted — mutation-tested, not reasoned.** In a scratch clone of the repo (real `node_modules` symlinked, workspace packages relinked into the clone): replacing the guard with a bare `notify()` turns `cockpit.spec.tsx:136` red; replacing `onUserLayout` with `() => void sync(true)` turns `use-panel-toggle.spec.tsx:192` and `:213` red. Baseline in that clone: 32 passed. F4's test is therefore not vacuous — the listener does register in jsdom.
- **F3's assertion itself.** `Math.abs(width('#nav') - 288) <= 1` matches the measured default at 1440 in every run I made (288 exactly, fresh).
- **Scope.** Ten files, all attributable: `AGENTS.md` (F5), `cockpit.tsx` (F2), `cockpit.spec.tsx` (F4), `use-panel-toggle.ts` + `.spec.tsx` (F1), `cockpit.mjs` (F3 + §6a′ + §7), `friction-notes.md` (F1 record), and three review-record files. No unrelated edits. `packages/shell/dist/` holds stale `.d.ts` copies of the old doc text but is untracked (`git ls-files packages/shell/dist` → 0), so it is build output, not a finding.
- **Runs.** `pnpm nx run-many -t typecheck test lint --skip-nx-cache` → `NX   Successfully ran targets typecheck, test, lint for 6 projects`, exit 0 (with an `NX detected a flaky task: shell:typecheck` notice, no failure). `node tools/src/verify/cockpit.mjs` → `70 passed, 0 failed (dev server)`.
- **Probe hygiene.** All probing headless via `chromium.launch()` from the repo root; the pre-fix clone served on port 5199 with `BROWSER=none`, killed afterwards; port 5181 untouched; the repo's working tree is unchanged apart from the two untracked reviewer-g placeholders that were already there. One process slip on my side: I used `rm -rf` on my own `/tmp` scratch directory during setup before switching to `trash` for the final cleanup — outside the repo, but the rule has no exception and I broke it.
