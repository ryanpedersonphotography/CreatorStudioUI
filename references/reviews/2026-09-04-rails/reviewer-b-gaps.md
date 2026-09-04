The reading is right in the main and wrong at one edge, and the feature has a keyboard hole the deleted comment predicted. Everything below is verified against the running app or the file; `pnpm nx run-many -t typecheck test lint --skip-nx-cache` printed **`Successfully ran targets typecheck, test, lint for 6 projects`** (17 tasks, exit 0) and `node tools/src/verify/cockpit.mjs` printed **`41 passed, 0 failed (dev server)`**.

## Findings

**1 · MATERIAL — every control that unmounts itself drops focus to `<body>`. The keyboard has no way back.**

The commit's thesis is that a collapsed region "carries the way back" (`apps/studio/src/app/studio-cockpit.tsx:17-19`). With a mouse, yes. With a keyboard, no: pressing Enter on a control that replaces itself sends focus to the document. Measured on the dev server:

```
focus after Enter on toolbar "Top shelf" (collapses the shelf holding it): BODY
focus after Enter on strip "Expand top shelf":                             BODY
focus after Enter on rail "Expand navigation":                             BODY
```

A keyboard user who collapses the top shelf loses their place entirely, must Tab in from the start to reach the strip, and loses it again on expanding. This is precisely the hazard the diff *deleted*: the old `studio-cockpit.tsx` comment read "a button there would hide itself with no route back … A control for `top` must live outside the shelf, or come with a shortcut." The commit removed the warning and shipped the pattern without answering the second half of it.

Fix: hand focus across the transition. `Rail` and `Strip` focus their expand button on mount when the collapse was user-initiated, and `StudioToolbar`'s `RegionButton` re-focuses itself after an expand it caused — a ref plus an effect keyed on `toggle.collapsed`. If that's more than this commit should carry, the honest interim is the shortcut the deleted comment already specified, plus a harness assertion on `document.activeElement` after each transition.

**2 · MATERIAL — collapsing a region deletes its accessible name from the tree.**

Expanded, nav is `<section aria-label="Navigation">` (`apps/studio/src/app/app.tsx:34`). Collapsed, it is a bare `<div>` whose only text is `title[0]` marked `aria-hidden` (`apps/studio/src/app/studio-rails.tsx:16,20-22`). A screen reader in the nav rail hears one button, "Expand navigation", inside nothing — the region has no name, no role, no landmark. "Nothing vanishes" is a claim about pixels that does not hold in the accessibility tree.

Fix: give `Rail` and `Strip` the same `<section aria-label={title}>` wrapper the full region has, and drop `aria-hidden` from the initial so the rail reads as a named region rather than a stray glyph.

**3 · MATERIAL — the rail/strip contract is stated in prose and enforced by nothing; a caller can make the top shelf unrecoverable.**

`StudioCockpitProps` gained four `ReactNode` slots whose JSDoc says "Each must carry a control that expands the region again" (`apps/studio/src/app/studio-cockpit.tsx:52-56`). `ReactNode` cannot carry that promise. Pass `topStrip={<div/>}` and the top shelf becomes a dead 32px bar: its edge is a disabled separator (harness: *"the shelf edge is a disabled separator"*), there is no keyboard stop on it, and the toolbar that would reopen it is inside the region it collapsed. The old code was safe by construction — `RegionButton` was typed `Exclude<StudioRegion,'top'>`. That safety was traded for a comment.

Fix: stop taking the compact node as a free-form slot. Either pair the region with its compact form — `nav={{ full: …, rail: … }}` — so one prop carries both and `StudioCockpit` renders the expand control itself, or have `StudioCockpit` render `<Rail>`/`<Strip>` internally and let the caller pass only decoration. That also answers a convention point: `StudioCockpitProps` went from four region slots to eight flat props, which is the "boolean-prop pile" shape AGENTS.md's *Composition over configuration* rule warns against, in the one component the rule most applies to.

**4 · MATERIAL — the ASCII diagram now misstates the region tree it exists to explain.**

`apps/studio/src/app/studio-cockpit.tsx:9-15`. The `CONTEXT SHELF` row lost a box character — counted:

```
 53 | *   │ rail ├───────────────────────────┤   rail    │|  bars=4
 71 | *   │      │  CONTEXT SHELF  drag · strip          │  ...|  bars=3
 53 | *   └──────┴───────────────────────────┴───────────┘|  bars=4
```

Three bars where the row needs four. The drawing now reads as the context shelf spanning the centre column *and* the inspector. It does not — `context` lives inside the `center` group, beside the inspector (`studio-cockpit.tsx:126-135`). The one artifact whose whole job is to show the nesting shows the wrong nesting. The `TOP SHELF` row also lost its cell padding, running text flush into the border.

Fix: restore the fourth bar and repad the top row.

**5 · MATERIAL — no story shows a rail or a strip. The feature is invisible in the story build.**

Driven headlessly against `pnpm exec ladle preview`: `studio-cockpit--writers-cockpit` renders nav 288 / inspector 345 / context 180 / top 48 and **zero** buttons matching `/^Expand /`. Four clicks later it is 48 / 48 / 32 / 32 with all four expand controls — screenshots at `/Users/ryanpederson/NewDev/CreatorStudioUI/screenshots/review-b-story-default.png` and `review-b-story-collapsed.png` (I inspected the collapsed one). So the compact state exists and works in the story, but nothing in the built stories shows it: a designer or reviewer opening Ladle sees the previous commit's cockpit.

Fix: a second story — `CompactStates`, seeding a store whose persisted layout is already collapsed — so the rails and strips are the first thing the story renders. This is also where finding 2's missing landmarks and the rails' single-letter content would have been caught by eye.

**6 · MATERIAL — the request asked for a rail on the bottom; the bottom got a strip, and the substitution isn't flagged anywhere.**

"add a rail state to the left/right/bottom and also add a top strip as well" draws the line at *top vs. the other three*. The implementation draws it at *vertical vs. horizontal*: left and right get 48px rails, top **and bottom** get 32px strips (`packages/tokens/src/lib/sizes.ts:11-13`). That is a coherent vocabulary — a horizontal region can't hold a vertical rail — and it may well be what Ryan wants. But it silently overrides an explicit instruction, and no comment, doc, or review note records the swap. It also leaves an asymmetry worth naming: the top strip spans the window; the context "strip" spans only the centre column, because the context shelf is not the window's bottom edge.

Fix: name the decision in `studio-cockpit.tsx`'s header — one sentence saying a horizontal edge collapses to a strip because a rail is a vertical form — so the next reader sees a choice rather than a mistake.

**7 · MINOR — four places still describe an API and a behaviour that no longer exist, one of them a ground-truth doc.**

- `references/friction-notes.md:37` — "`usePanelToggle` reads the group back and returns `false` from `hide()`/`show()`". Those methods are gone. Friction notes are read as ground truth by later sessions.
- `packages/tokens/src/lib/sizes.ts:15` — "The top shelf: pinned chrome, hideable."
- `packages/shell/src/lib/cockpit-regions.tsx:13` — "so a toolbar in one region can hide and show the others".
- `packages/shell/src/lib/cockpit.spec.tsx:101` — "is the fixed-but-hideable recipe".

Also in `cockpit.tsx:161-163`, `pinnedPanel`'s doc uses "rail" for the reference kit's pinned panel — a different thing from `cockpitSizes.rail` as of this commit — and still says "while a button still hid it".

Fix: sweep the four, and reword the `pinnedPanel` note so "rail" isn't doing two jobs in one file.

**8 · MINOR — the rename left two test names that no longer say anything.**

`packages/shell/src/lib/use-panel-toggle.spec.tsx:66` reads `expand() falls back to expand() when no restore size was given`, and line 55 reads `expand() after collapse() reopens exactly where it was, through expand()`. Both were meaningful before (`show()` falling back to the library's `expand()`); find-and-replace turned them into tautologies. `packages/shell/src/lib/cockpit.stories.tsx:41` caught the same blade: "What only the primitive can **expand**:" where it meant *show*. Test names are the contract's documentation; these no longer state one.

Fix: "falls back to the library's `expand()` when no restore size was given", and revert the story line to "show".

**9 · MINOR — `pinnedPanel`'s new parameter is untested; only the branch nobody uses is asserted.**

`packages/shell/src/lib/cockpit.spec.tsx:101-113` calls `pinnedPanel(cockpitSizes.topHeight)` and asserts `collapsedSize: cockpitSizes.collapsed`. The only production caller passes a second argument (`studio-cockpit.tsx:100`), so the unit suite covers the default and not the used path. `cockpitSizes.collapsed` is now referenced only by that default, that assertion, and one shell story — a token kept alive by its own test.

Fix: a second case asserting `pinnedPanel(topHeight, strip).collapsedSize === cockpitSizes.strip`.

**10 · MINOR — a token comment cites a reference that doesn't exist.**

`packages/tokens/src/lib/sizes.ts:11` — "The kit's activity bar is 48px too." `grep -rn -i activity` over `/Users/ryanpederson/Dev/Shell2/shell-widgets/packages` returns nothing; the kit's 48 is `const TOP_HEIGHT = 48` in `AppShell.tsx:23`, a top shelf. The number is fine, the provenance is invented, and AGENTS.md points future agents at that kit as the authority.

Fix: cite `AppShell.tsx`'s `TOP_HEIGHT`, or drop the claim.

**11 · MINOR — "a rail (48px)" isn't true at small windows.**

Measured with all three body regions collapsed: 700px → nav 48 / inspector 48; 500px → 48 / 48; **360px → nav 41 / inspector 41**, with `center` at 275 against its 320px minimum. The library squeezes below `collapsedSize` once the group is out of room, so the doc's flat "(48px)" (`studio-cockpit.tsx:17`) and the harness's "sidebars collapse to 48px rails" (`tools/src/verify/cockpit.mjs:7`) overreach. Screenshot: `screenshots/review-b-narrow-360.png`.

Fix: say "48px above the body's minimum width" in both places, next to the existing sentence about the floor where toggles report false.

**12 · MINOR — `Rail` and `Strip` decide by binary ternary and don't tie `region` to `title`.**

`studio-rails.tsx:18` picks the glyph with `region === 'nav' ? '»' : '«'` and `:32` with `region === 'top' ? '⌄' : '⌃'`. A third sidebar silently gets `«`. And nothing links the two props: `<Rail region="nav" title="Inspector" />` compiles and yields a button named "Expand inspector" that expands the nav. Related: `app.tsx` labels the region `"Context"` while its strip and toolbar button both say `"Context shelf"`.

Fix: derive the glyph from an explicit `side` prop, or key a small record off `region` that carries both glyph and title so the pair can't drift.

## Checked and clean

- **Collapsed state survives a reload.** Collapsed nav/context/inspector, reloaded, measured: `nav 48, ctx 32, insp 48`; all three expand controls present; toolbar `aria-pressed` false on all three; `#nav` innerText `"»\nN"`. Zero console/page errors. `screenshots/review-b-after-reload-collapsed.png`.
- **A rail restored at a different viewport is still 48px.** Stored a fully-collapsed layout at 1440 (persisted as percentages — `"nav":3.338`), replayed it into fresh contexts at 1000px and 800px: nav 48 / inspector 48 / context 32 / top 32 at both, expand controls present, no errors. The library re-clamps to `collapsedSize`, so the percentage storage doesn't leak into the rails.
- **A rail can be dragged open.** With nav railed, its separator still reports `inactive` and is present; a 200px pointer drag took nav from 48 → 248 with `aria-pressed` flipping to `true` and the full "NAVIGATION" content returning.
- **The collapse loop is genuinely closed for a pointer.** With all four collapsed, exactly four controls exist — `Expand top shelf`, `Expand navigation`, `Expand context shelf`, `Expand inspector` — one per region, verified in both the app and the story. Every region can be reached without the toolbar. (The keyboard half is finding 1.)
- **`node tools/src/verify/cockpit.mjs` — 41 passed, 0 failed**, including the four new rail/strip assertions, both context-strip routes (drag-shut → strip control; toolbar collapse → toolbar expand), and the top strip through both its own control and the toolbar. `button()` is `getByRole(…, { exact: true })` (`cockpit.mjs:87`), so `"Navigation"` and `"Expand navigation"` don't collide in strict mode — I checked this specifically because substring matching would have made several assertions ambiguous.
- **`pnpm nx run-many -t typecheck test lint --skip-nx-cache` — 17/17 tasks, exit 0.** `pnpm lint:tokens` — `✔ no raw values outside packages/tokens/src/tokens.css; every var() resolves`, 29 files, 56 tokens. `pnpm stories:build` exit 0. `studio-rails.tsx` uses only token classes (`gap-sm`, `py-sm`, `px-sm`, `border-border`).
- **Harness coverage gaps that are missing tests, not bugs** — no assertion that a collapsed state survives a reload, and none that a rail can be dragged open. I verified both behaviours by hand above; they belong in `cockpit.mjs` so the next change can't silently break them.
- **`useCockpitRegion` throws rather than returning a dead control** for an unknown or out-of-provider region (`cockpit-regions.tsx:19-28`), so finding 12's mismatched-`title` trap is a wrong-label bug, not a silent no-op.
- **The padding move is justified, not incidental.** Panels had `p-md`; a 48px rail with 16px each side leaves 16px of content, so the padding had to move into the region content (`app.tsx:34-35`, `studio-cockpit.stories.tsx:32`). Worth knowing it's now an unenforced obligation on every future region author.
