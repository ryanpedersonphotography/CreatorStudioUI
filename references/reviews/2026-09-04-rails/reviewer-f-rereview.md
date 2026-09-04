**E1's fix works for the panel the user acted on, and mis-attributes the panel that paid for it.** The double-click reset now reaches memory in every case I could construct, cross-group isolation holds, and nothing spurious writes — but on a narrow window the reset takes its space from a sibling, and that sibling's squeeze is recorded as the user's intent and never recovers.

## F1 — MATERIAL. A double-click reset records a collateral rail as intent, permanently

**Claim.** `cockpit.tsx:130–143` notifies *every* listener of the group when the group's layout changed during a double-click. On a window narrow enough that the group has no slack, the library's reset takes the space from a neighbour, rails it, and that neighbour's `onUserLayout` → `sync(true)` writes its collapsed bit `1`. C1's mount reconcile then stands down forever, because memory says the user collapsed it. This is D1's failure — a rail the window caused, made permanent — reached through the gesture this commit added.

**Citation.** Measured on the dev server, cleared storage, `page.mouse.dblclick` at the nav separator's centre:

```
                    nav  insp  bits
fresh @1440         288   345   ---
squeezed @600        48   231   ---     ← D1's fix holds: the squeeze writes nothing
dblclick NAV @600   231    48   0-1     ← the reset rails the inspector and records it
back @1440          231    48   0-1
reload @1440        231    48   0-1     inspectorPressed=false
```

Control, same sequence with no gesture at 600: `---` throughout, and the reload reopens nav at 160. Screenshot of the end state: `screenshots/review-f-dblclick-collateral-rail.png` — inspector a 48px rail at 1440, its toolbar button unpressed.

Before this commit the same double-click wrote nothing at all, so the reload's reconcile reopened the inspector. The disposition's E1 row says the fix "closes the gap completely rather than patching one instance"; it closes the nav's and opens the inspector's.

The collateral write itself is not new — a released drag wide enough to shut the inspector already writes `inspector=1` (measured: `drag nav +900 @1440` → `nav=1070 insp=48 bits=0-1`, surviving a reload). So the defect lives in wave three's broadcast rule, and HEAD adds a cheap new way to trigger it where the user never touched the affected panel.

**Fix.** A broadcast should sync *state* for every panel of the group, as it does now, but only *record* for the panel the gesture acted on. The narrow version that needs no new plumbing: on a broadcast, write `false` for panels that are open and leave a panel the broadcast found newly collapsed alone — a collapse then only ever gets recorded through `collapse()` or a toggle. That trades away harness §7's `a released drag is the user's: the collapse is remembered`, so it is Ryan's ruling rather than a mechanical fix; the alternative is to carry the acted-on panel through the notification, which costs the watcher a hit-test against the separator boxes at the event's coordinates.

## F2 — MINOR. The watcher's pending timer can outlive its group

**Claim.** `cockpit.tsx:133–140` schedules `setTimeout(…, 0)` and the effect cleanup removes only the listener. If the Cockpit unmounts inside that dispatch, the timer still fires and calls `groupHandle.getLayout()` on a group the library has already deregistered — `kt` at `react-resizable-panels.js:451–453` deletes it from the registry and `lt`'s lookup at `:1048–1054` throws `Could not find Group with id "…"`. An uncaught throw in a timer, not a caught render error.

Not reachable in the studio (no cockpit unmounts), but `Cockpit` is a shell export and a caller may render one conditionally.

**Fix.** Hold the timer id and `clearTimeout` it in the effect cleanup.

## F3 — MINOR. §6a re-introduces the loose width check C4 was raised to remove

**Claim.** `tools/src/verify/cockpit.mjs:295` asserts `(await width('#nav')) > 100`. C4's disposition records exactly this pattern being removed from §8 ("restored the context shelf with `> 100`, the same loose check A4 removed elsewhere"). The reset's landing point is knowable: it is the panel's `defaultSize`, measured 288 at 1440 in every run.

**Fix.** `Math.abs((await width('#nav')) - 288) <= 1`, which also distinguishes the library's reset from any other reopen.

## F4 — MINOR. The watcher's guard has no test at any level

**Claim.** The disposition says "No jsdom unit test: the library needs a measured layout to resolve the gesture." That is true of the *positive* direction only. The guard — notify only when the layout changed — is the half that keeps every double-click in the app from writing memory, and it is testable in jsdom precisely because the layout is unresolved there: `getLayout()` returns `{}` both times (`:1056–1059`, `defaultLayoutDeferred`), so a bare `window.dispatchEvent(new MouseEvent('dblclick'))` must not call a panel's `onUserLayout`. Delete the `if (…!== before)` and that test goes red.

Nothing currently covers it: `onUserLayout` appears in `use-panel-toggle.spec.tsx:44,226` only, called directly on the hook. No test asserts that `Cockpit` broadcasts at all.

## F5 — MINOR. `AGENTS.md:101` breaks its own paragraph's wrap

129 characters inside a paragraph hand-wrapped at 93–100 (lines 95–106). The token itself is right, and matches the memory file (`headless-playwright-cli.md`: "`playwright-cli show` (the dashboard)"). Rewrap.

## Checked and clean — what, and how

- **Cross-group isolation, both directions.** Fresh mount, `page.mouse.dblclick` at each separator's centre: context separator → `-0-` (nav and inspector untouched); nav separator → `0-0` (context untouched). The percentage layouts are per-group and the composition alternates axes, so a width change cannot move the nested vertical group's heights.
- **All three separators' resets are recorded.** nav `1--` → `0-0` at 288px; inspector `--1` → `0-0` at 345px; context `-1-` → `-0-` at 180px.
- **No spurious notify.** Double-click on `#main` → `---`. Double-click on the disabled top separator → `---`, top stays 48. Double-click on the "Navigation" toolbar button → two writes (`nav=1` then `nav=0`, the two toggles), no third from the watcher, net layout unchanged.
- **No listener duplication under StrictMode.** `Storage.prototype.setItem` spied via `addInitScript`: one nav-separator double-click produces exactly `['cs:collapsed:default:nav=0', 'cs:collapsed:default:inspector=0']` — one write per registered panel, not two. `main.tsx:8` mounts under StrictMode.
- **Stable handles, no per-render re-attach.** `setGroupHandle` is a `useState` setter, and the library's `useImperativeHandle(ref, () => n.current, [])` (`:1583–1591`) hands back one mutable object whose methods are refreshed in place, so `groupRef` fires once and the effect's `[groupHandle, notify]` never churns (`notify` closes over a `useRef` Set).
- **The timing is sound for the reset itself.** The library registers `dblclick` on `element.ownerDocument` at capture (`:1518`); a window-capture listener runs earlier in the same path, so the snapshot precedes the reset. `getLayout()` reads the module-level registry synchronously (`:1056–1059`) and the imperative `resize` commits through `j` synchronously (`:955–982`), so `setTimeout(0)` is comfortably after. `JSON.stringify` is safe against aliasing because the snapshot is a string, and `X` (`:839+`) rebuilds the layout in panel order, so key order is stable.
- **E2 bites, by deduction from measured intermediate state.** From `fresh()` the bits are `---`; with `onUserLayout` deleted nothing registers on the context, so `bits[0]` stays `'-'` and the ArrowRight assertion fails. For the double-click assertion, the harness prints `1--` immediately before it and nothing else in that block writes, so with the watcher deleted the bit stays `1` and `bits[0] === '0'` fails. I did not run either revert — the repo was read-only for this review.
- **The keyboard family is fully attributed.** Every separator key path — arrows, Home, End, and the library's own Enter — funnels through `B` (`:1082–1114`), which commits with `{ isUserInteraction: !0 }`. The `contextmenu` handler commits the same way (`rt`, `:483–499`). So `_e`'s `u.resize(s)` really was the one unattributed user path.
- **E4 recorded.** Comment at `cockpit.tsx:120–121`, and the disposition's D1 row now names it.
- **Scope.** Six files: `AGENTS.md` (E3), `cockpit.tsx` (E1), `cockpit.mjs` (E1/E2), plus the three review-record files. Nothing outside E1–E4.
- **Housekeeping, not a finding.** `references/reviews/2026-09-04-rails/reviewer-f-rereview.md` and `reviewer-f.stderr.log` are on disk untracked and both zero bytes — placeholders from the dispatch, no content to mistake for a prior review.

## Runs

- `pnpm nx run-many -t typecheck test lint --skip-nx-cache` → `NX   Successfully ran targets typecheck, test, lint for 6 projects`, 17 tasks all `✔`, exit 0.
- `node tools/src/verify/cockpit.mjs` → `67 passed, 0 failed (dev server)`, exit 0.
- All probes headless via `chromium.launch()` from the repo root; every run reported `errors: none`.
