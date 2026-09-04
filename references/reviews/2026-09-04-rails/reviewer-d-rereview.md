## Findings

### D1 — MATERIAL. A window resize records the clamp as intent, and the false bit then defeats C1's own repair

C1 stops the mount from *reading* a clamp as a collapse. Nothing stops the app from *writing* one. `onResize` records to memory unconditionally once the mount has settled (`packages/shell/src/lib/use-panel-toggle.ts:115` → `:94`), and the library fires `onResize` from a per-panel ResizeObserver (`react-resizable-panels.js:1372`, observer attached at `:1491`) — which cannot distinguish a separator drag from the window getting narrower.

Measured on the dev server, nav never touched:

```
mount 1440x900   nav=288px  bits(nav|context|inspector)=0|0|0
resize to 600    nav= 48px  bits=1|0|0   layout nav: 20% → 3.338%
back to 1440     nav= 48px  bits=1|0|0
reload  @1440    nav= 48px  bits=1|0|0   ← permanent
```

`screenshots/review-d-clamp-after-reload.png` shows the result at 1440×900: nav is a 48px rail, its toolbar button unpressed. That is C1's exact symptom, now durable. The threshold is **700px**, not the 680px body floor — a width sweep gives `1000px → nav=288 bits=000`, `800px → nav=160 bits=000`, `700px → nav=48 bits=100`. A half-screen split on a 1400px display reaches it, as does browser zoom.

Isolating the two writes: the bit alone is harmless (`layout 20% + bit=1 → nav=288px`, memory correctly only reopens), and the corrupted layout alone is repaired by C1 (`layout 3.338%, no bit → nav=160px`). It is the *pair* — both written by the same resize — that is unrecoverable, because the bit tells the mount reconcile at `use-panel-toggle.ts:110` to stand down. C1 made this state stickier than it was before the fix.

**Fix:** stop treating a bare `onResize` as intent. The library already carries the attribution you need — `Group`'s `onLayoutChanged(layout, { isUserInteraction })`, documented at `react-resizable-panels.d.ts:165–175` as `true` only for a released pointer drag or a resize keypress, `false` for constraint recompute and mount. Record memory from `collapse()`/`expand()` (explicit intent) plus a layout change flagged `isUserInteraction`, and never from `onResize`. Worth pairing with `useDefaultLayout`'s `onlySaveAfterUserInteractions` at `packages/shell/src/lib/cockpit.tsx:104`, which is currently unset and is why the stored share degrades to 3.338% in the first place — that half is pre-existing, not introduced here, but it is the other leg of the trap.

### D2 — MATERIAL (governing rule). The paragraph's headline is absolute; its penultimate sentence hands out a self-issued exemption

`AGENTS.md:95` opens with "Nothing an agent runs may open a window on the user's screen." `AGENTS.md:102–103` then says "A visible browser or a computer-use tool only when the CLI genuinely cannot do the check, and say why." An agent that judges the CLI insufficient may open a window and merely narrate the reason afterwards — the user is told, not asked. Two sentences of the same paragraph give opposite answers to the only question the rule exists to settle.

The ban list is also an enumeration where the headline is a principle, so anything unenumerated reads as permitted. One concrete leak from the very CLI the rule endorses as "headless unless told otherwise": `playwright-cli show --annotate`, described in its own skill doc as "launch the dashboard for UI review / design feedback — user annotates the page" (`playwright-cli/SKILL.md:176–177`). That is a window on the user's screen, and `show` is not on the list. In a repo with `playwright` in devDependencies, `playwright test --ui`, `--debug`, `PWDEBUG=1`, `show-report` and `show-trace` are the same shape.

**Fix:** make the exception require the user's prior go-ahead rather than the agent's own judgment — "a visible browser only when Ryan has approved it in this session; never on your own reading of necessity" — and state that the enumerated bans are examples of the headline, not its extent, so an unlisted headed path is still forbidden. Add `show`/`--annotate` and the `playwright test --ui / --debug / PWDEBUG / show-report / show-trace` family to the examples.

Everything factual in the paragraph checks out, for the record: `playwright-cli` is at `/opt/homebrew/bin/playwright-cli`; `--headed` is a real flag on `open` and absent by default; `.ladle/vite.config.mts` sets both `server.open: false` and `preview.open: false`; and `BROWSER=none` genuinely stops Ladle — its `open-browser.js:151` has the explicit `BROWSER="none" will prevent opening completely` case.

### D3 — MINOR. "Memory is written on transitions only, never from the mount" is false

A plain mount at 1440×900 with zero interaction writes all three keys: `cs:collapsed:default:context, cs:collapsed:default:inspector, cs:collapsed:default:nav`. The harness prints the same thing at its own §5 checkpoint, where only nav has been dragged — context's and inspector's bits are already present. The claim appears at `packages/shell/src/lib/use-panel-toggle.ts:68–70`, in the commit message, and in `references/reviews/2026-09-04-rails/disposition.md:51`. It is benign in isolation (the mount writes `'0'`), but it is the mechanism behind D1, and it is the sentence a later session would trust instead of re-deriving.

**Fix:** falls out of D1. Once memory is written only from explicit intent and `isUserInteraction`, the sentence becomes true and can stay.

### D4 — MINOR. C4's replacement assertion is not revert-sensitive where it sits

`tools/src/verify/cockpit.mjs:329,335` captures the context shelf's height before Enter and compares within 1px. But by §8 the shelf is at exactly **180px**, which *is* `cockpitSizes.contextDefault` (`packages/tokens/src/lib/sizes.ts:24`) — the harness prints `180 → 180`. A regression in which `expand()` always falls back to `restoreSize` instead of replaying the recorded size would produce 180 and pass. That is the same looseness A4 and C4 were raised to remove, relocated rather than removed.

**Fix:** drag or Enter-resize the shelf to a non-default height (240px will do) before the Enter round-trip, so the assertion can tell "exactly" from "the default".

### D5 — MINOR. The new hook tests encode the defect as the contract

`packages/shell/src/lib/use-panel-toggle.spec.tsx:177` — "writes each transition the user makes: buttons and drags" — drives `dragTo(true)`, which is just `onResize`, and asserts a write. That is precisely the call D1 shows also fires for a window resize; the test therefore ratifies the behaviour rather than constraining it. And `:159–160`'s "the mount itself is not a transition the user made" passes only because jsdom never runs a ResizeObserver — the same assertion is false in Chromium, as D3 measures.

**Fix:** with D1 applied, re-express the drag case in terms of a user-flagged layout change, and move the "mount writes nothing" guarantee into the harness, where a real ResizeObserver can falsify it.

## Checked and clean

- **Required runs.** `pnpm nx run-many -t typecheck test lint --skip-nx-cache` → `Successfully ran targets typecheck, test, lint for 6 projects`, 17 tasks, `EXIT=0`. `node tools/src/verify/cockpit.mjs` → `56 passed, 0 failed (dev server)`.
- **C1's table, reproduced independently** (my own context, not the harness's): seeding `cs:layout:default:body = {"nav":11.127,"center":64.873,"inspector":24}` at 900×800 gives `nav=160px pressed=true`; adding `cs:collapsed:default:nav = 1` gives `nav=48px pressed=false`. Both as claimed.
- **C1's other named hazards.** Memory identity is stable — `layoutStore` is module-level (`apps/studio/src/app/app.tsx:11`) and `useCollapsedMemory` memoises on `[store, projectId, region]`, so the mount effect does not re-run per render. StrictMode is on (`apps/studio/src/main.tsx:8`) and the double-invoked effect is idempotent: `settled` is set false and true inside one synchronous body, and a repeated `handle.expand()` on an already-open panel is a no-op. The consumer-`collapse()`-in-an-effect path is guarded by `collapsedByUs` at `use-panel-toggle.ts:110` and covered by the spec at `:190`.
- **C2, on the built bundle.** `ladle build` + `ladle preview --port 61003` (both with `BROWSER=none`), driving `studio-cockpit--compact-states`. Mounts `nav=48 insp=48 ctx=32 top=32`; expanding navigation, inspector, context shelf and top shelf leaves `288 / 345 / 180 / 48`; a second identical pass finds no expand controls left and changes nothing. Zero console or page errors. `screenshots/review-d-c2-compact.png`, `screenshots/review-d-c2-expanded.png`.
- **C3.** The spy is load-bearing in the right direction: a store-less `Cockpit` falls back to `sessionStore()`, an in-memory `Map` (`packages/shell/src/lib/cockpit.tsx:76–83`), and `vi.spyOn(Storage.prototype, …)` covers both `localStorage` and `sessionStorage` in jsdom, so swapping the bag for real storage would fail the test.
- **C5.** Sensitive as written — asserting `document.activeElement` is `SECTION[Navigation]` fails for a wrapper div or the panel itself, where the old `focusWithin('#nav')` passed. Harness reports `SECTION[Navigation] at 288px`.
- **C6.** Same token, measured after the 120ms transition settles: separator `solid 2px oklch(0.64 0.17 45)` at offset `0px`; landmark `solid 2px oklch(0.64 0.17 45)` at offset `-2px`. No clipping — the landmark's box matches its panel's exactly in every state (expanded nav `288×851` in a `288×851` panel; rail `48×851`; context strip `1045×32`; top strip `1440×32`) and every panel computes `overflow: visible`, so a −2px inset ring paints inside. No landmark enters the Tab order: zero `section`/`[role=region]` elements have `tabIndex >= 0`, and a 25-press Tab walk cycles only the four toolbar buttons and three separators. `screenshots/review-d-landmark-ring.png`, `screenshots/review-d-rails-strips.png`.
- **C8.** Exactly five landmarks and exactly one `Top shelf` section in both extremes — all-expanded and all-four-collapsed read `Top shelf | Navigation | Manuscript | Context shelf | Inspector`. Never two, never none; the toolbar and the strip are mutually exclusive branches of `topToggle.collapsed`. `screenshots/review-d-collapsed-landmarks.png`.
- **Scope.** Nothing beyond C1–C8 and the disclosed `h-full`. The `@creator-studio/contracts` dependency, the `tsconfig.app.json` project reference, the two `index.ts` re-exports and the lockfile lines are all mechanically required by C1's `collapsedKey`; `layout-store.spec.ts` and `app.spec.tsx` follow C1 and C8 respectively.
- **Friction note.** `references/friction-notes.md` states the clamp generally and gives the right midpoint formula and both worked examples; its only weakness is the D3 overclaim it inherits.
