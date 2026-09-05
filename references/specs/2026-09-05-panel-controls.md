# Panel controls — foundation spec

**Status:** revised after review round 3; **round-4 findings open** (see the record) and the spec is paused at Ryan's steer of 2026-09-05 toward the View-menu glyph, which lands first · **Date:** 2026-09-05 · **Owner:** Ryan ·
**Scope:** the bones of a starter kit for hiding and showing cockpit panels, built foundation first,
extended compositionally. **Review record:** `references/reviews/2026-09-05-panel-controls/`.

## Why this shape

Ryan's rulings, in his words and made operational:

1. *"Make different variants for different situations."* Hiding a panel is not one behaviour. The kit
   has three variants, and the cockpit chooses per panel.
2. *"Have a compositional approach. Allow the variants to be changed in menu options. Make the
   baseline one the most primitive."* The variant is a writer's preference reachable from the View
   menu, and the default is the plainest variant: the panel simply hides and its icon brings it back.
3. *"Not a final design but the bones and foundation of a starter kit that later has highly
   opinionated versions extending it, hopefully without stripping much out. Harden and stress-test
   the foundation, then slowly and compositionally add bells and whistles, plus the proper testing
   that goes with them, so a change that broke something is known immediately, even a subtle visual
   element, animation, or behaviour."* Hence three waves: a small foundation that changes nothing a
   writer relies on and is hardened before anything sits on it, then each addition beside it with
   its own tests, including tests that watch motion.

What exists and is reused as is: the region toggle hooks (`useCockpitRegion`, `usePanelToggle` in
`packages/shell`), the collapse mechanics of `Cockpit.Panel` over `react-resizable-panels` 4.12,
the focus handoff for controls that unmount themselves (`useFocusHandoff` in
`apps/studio/src/app/studio-cockpit.tsx`), the View menu and its ⌃⌘B/J/I/T bindings
(`studio-commands.ts`, `studio-menus.tsx`), the preference store and key builders in
`packages/contracts`, the region names in `studio-regions.ts`, the token lint, Ladle, both
`verify:ui` harnesses (`tools/src/verify/cockpit.mjs` and `menubar.mjs`), and the visual baseline
with its pull-request flow.

## The three variants

| Variant | What a hidden panel leaves on screen | Way back |
|---|---|---|
| `hidden` (the default from wave 2) | Nothing. The panel slides away and the manuscript takes the space. | The panel's icon on the top shelf (or on its strip), its ⌃⌘ shortcut, the View menu, and dragging the panel's separator open. |
| `rail` (today's behaviour, the default in wave 1) | A slim edge at the place the panel was: 48px for a sidebar with the way-back control only, 32px for a shelf with the control and the title. | The control on the edge, plus all of the above. |
| `peek` | Nothing, plus an invisible hover zone at the edge of the cockpit body. The pointer there floats the panel over the manuscript until it leaves; Escape closes it; focus inside keeps it open. Pointer-only by design: keyboard users show the panel. | As `hidden`. |

Every variant shares the same controls, so switching variant changes what the hidden state looks
like and nothing else: accessible names, shortcuts, menu items, and the toggles are identical in all
three. The accepted values are exactly `hidden`, `rail`, `peek`; the menu shows them as Vanish, Rail,
Peek.

**The way back never disappears.** The top shelf is pinned to `rail`, and from wave 2 its strip
carries the other three regions' toggles in compact form, so collapsing the shelf (⌃⌘T) leaves every
panel's icon on screen. The strip's order is fixed: its own `Expand top shelf` control first (the
focus handoff lands on the strip's first control and the harness asserts it), then the title, then
Navigation, Context shelf, Inspector; every control on the 32px strip is `compact` (24px), so the
2px focus ring and its offset fit inside the strip's clip. Wave 1 leaves the strip as it is today.

**A hidden panel is hidden to everyone.** The studio's preset swaps a collapsed panel's children
for its edge (today the rail or strip; nothing, for `hidden`), so in the studio nothing focusable is
left in a zero-width box. The shell adds the same guarantee for callers that keep content mounted:
when a panel's `collapse` is `hidden` and it is collapsed, `Cockpit.Panel` stamps `inert` and
`data-collapsed` on the panel's outer element, and the shell's stylesheet sets `visibility: hidden`
from it (the `peek` variant is `hidden` to the shell; see *The studio*). A panel collapsed to a
visible edge is never inert: its collapsed content is the edge, and the edge holds the way back. A polite live region in the preset's `shortcuts` slot, which renders outside
every panel and so outlives a collapsed shelf, announces a hide or show that came from the menu or a
shortcut: "Navigation hidden" / "Navigation shown", and for the pinned shelf "Top shelf collapsed" /
"Top shelf expanded" (wave 2).

## The kit — `@creator-studio/panel-controls`

A portable package (`kind:portable`, zero workspace dependencies, the same manifest spec as
`packages/menubar`). Headless-first: every part renders a stable `data-pc="<part>"` hook (not
`data-panel`, which `react-resizable-panels` stamps on every panel it renders) and passes
`className` through; a plain-CSS skin (`panel-controls.css`) targets the hooks and the parts' own
`data-*` state. The skin's public properties are declared once on `:root` in the file's contract
block, each turned into a file-local `--_pc-*` with a standalone fallback and a `token-ok` reason,
exactly as the menubar does; the studio bridges them from tokens in `apps/studio/src/styles.css`.

Two portable packages weaken the `kind:portable` constraint as written (`onlyDependOnLibsWithTags:
['kind:portable']` would let them import each other). Wave 1 changes it to
`onlyDependOnLibsWithTags: []`, which the installed rule reads as "only untagged projects": every
workspace project is tagged, so a portable package imports no workspace project at all. The menubar
already complies.

Parts, from the most primitive up. Each later part composes the earlier ones and none edits them.

**`PanelToggle`** (wave 1) — an icon-only button that shows or hides one panel.

- Props: `side: 'left' | 'right' | 'top' | 'bottom'`, `pressed: boolean` (true = the panel is
  shown), `onPressedChange`, `label: string` (the panel's name, "Navigation"), `shortcut?` (the
  menubar's `Shortcut` descriptor shape, copied not imported), `platform?: 'mac' | 'other'`,
  `hint?: string` (a second tooltip line, "No room: widen the window") with `hintAt?: number` (a
  timestamp; each new value opens the tooltip for two seconds without hover, so a failed attempt is
  seen by a sighted pointer user and not only heard), `disabled?: boolean`
  (renders `aria-disabled="true"`, stays focusable and hoverable, activation is a no-op; a natively
  disabled button could neither take the focus handoff nor open the tooltip that explains it),
  `glyph?: ReactNode` to replace the default glyph when two panels share a side, `size?: 'default' |
  'compact'` (32px and 24px boxes) for the strip, `tooltip?: boolean` (default true; the hover and
  focus baseline stories turn it off so no floating overlay is in those pictures).
- Renders `<button type="button" aria-pressed aria-label={label} aria-keyshortcuts={serialised}
  data-pc="toggle" data-side data-pressed>` with a 16px inline SVG glyph: a rounded rectangle whose
  `side` segment is a `<rect data-pc="segment">` filled when pressed and unfilled when not (the VS
  Code / Codex "toggle panel" glyph). The glyph is `aria-hidden`; its stroke and the segment's fill
  use `currentColor`, so the button's `color` is what paints it.
- Pressed state has two channels a machine can read, as today's chips do: the segment's `fill`
  attribute is `currentColor` when pressed and `none` when not (jsdom computes no `fill`, so the
  unit test reads the attribute; a browser resolves it, so the harness asserts the resolved `fill`
  equals the button's computed `color` when pressed and is `none` when not), and a pressed toggle
  draws a 1px border in `--panel-highlight-border` where an unpressed one's border is transparent.
  The bridge sends that border to `--cs-ink`, today's `border-ink`, never to the accent: the focus
  ring is the accent, and the menubar harness requires the two colours far apart
  (`menubar.mjs:174-178`, `apart > 40`) with the ring outset (`:171`, `offset >= 0`, hence a
  `--panel-focus-offset` property). The border probes (`:169-178`, `:193-201`) keep passing; the
  fill check is one read beside them. `aria-keyshortcuts` is new on the toolbar (today only the menu
  items carry it) and nothing asserts its absence.
- A tooltip on hover and keyboard focus: the label, the shortcut in glyphs (`⌃⌘B`), and the `hint`
  when there is one; Ark UI's `Tooltip` with its defaults (`openDelay` 400, Escape closes),
  **rendered through Ark's `Portal`**, because the shelf's panel clips its content and a tooltip in
  place would never be seen. The tooltip is never the accessible name. `@ark-ui/react` 5.39 (peer
  React ≥ 18) is not a dependency anywhere in the workspace yet; the kit adds it and becomes the
  workspace's first Ark use, which the README's extraction list must state (a larger tree than the
  menubar's one Radix package), and `tools/src/vitest/setup.ts` gains whatever jsdom stubs Ark's
  tooltip needs, recorded in the friction notes like Radix's. Ark opens on focus only for keyboard
  focus (its focus-visible tracker), so the unit test tabs to the button with `user-event` and the
  visual spec reaches it by pressing Tab, never by `element.focus()`.
- States the skin shows distinctly, each with a story and a baseline (see Testing): pressed /
  unpressed, hover, `:focus-visible` (the focus ring from the contract), `aria-disabled`, and the
  tooltip open (a story with the tooltip's `open` prop set, settled like the menu).
- Contrast: the button's `color` clears 3:1 against the shelf in both schemes, read by the menubar
  probe's existing `color` mode; pressed and unpressed are distinct by the fill and the border, not by
  colour alone.

**`PanelEdge`** (wave 2) — what a hidden panel leaves behind.

- Props: `variant`, `side`, `label` (the region name), `onExpand`, `children?`.
- `hidden` renders nothing. `rail` renders a landmark `<section aria-label={label} tabIndex={-1}
  data-pc="edge">` the size of a rail or strip whose control is a `PanelToggle` named
  `Expand <label>` (today's name, kept so it never collides with the shelf's toggle named
  `<Label>`), inside a landmark named `label` as today (`cockpit.mjs:205` finds the rail as the
  region named "Navigation" holding the button named "Expand navigation"). The control's `glyph`
  defaults to today's direction chevron derived from `side` (a rail's control says which way the
  region opens, and an unpressed panel glyph would look like the shelf's) and `PanelEdge` takes
  `glyph?` to override it. `children` renders after the control in both forms: the studio passes
  the title for a strip and nothing for a rail, and the letter under today's rail control goes.
  `peek` renders the hover zone (`data-pc="zone"`) and delegates opening to `PanelPeek`.
- The variants are a map, and each entry names its renderer **and its shell behaviour**
  (`collapse`, see *The shell*): `hidden → 'hidden'`, `rail → 'rail'`, `peek → 'hidden'`. Adding a
  variant is a new entry; the accepted set the preference validates against is the map's keys.

**`PanelPeek`** (wave 3) — the overlay a peek zone opens.

- Props: `side`, `open`, `onOpenChange`, `label`, `children` (the panel's own content), `anchor`
  (the element whose edge it sits on: the cockpit body group's element, which `Cockpit` exposes, not
  the window, so a panel beside the text peeks at the text's edge).
- Rendered in a body portal (every panel clips), positioned from the anchor's bounding rect on the
  anchor's edge, re-measured by a `ResizeObserver` on the anchor and on window resize; the anchor's
  full extent along that edge, the panel's last known size across it, a shadow from the contract,
  above the manuscript (`--panel-z`). Opens after `--panel-peek-open` in the zone, closes
  `--panel-peek-close` after the pointer leaves both zone and overlay, Escape closes, focus inside
  keeps it open. The zone is 6px wide and
  yields to a scrollbar: no peek while `elementFromPoint` at the pointer is a scrollable element's
  edge. `role` is the landmark of the panel it stands in for (it is the same content, moved).

**`formatShortcut` / `serializeShortcut`** — the same two functions the menubar exports, duplicated
into the kit (twenty lines) so neither package depends on the other. Recorded as a known duplicate
with a one-line note in both packages.

### CSS contract

| Property | Purpose | Fallback | Studio bridge |
|---|---|---|---|
| `--panel-fg` / `--panel-fg-muted` | glyph and rail text | `CanvasText` / `GrayText` | `--cs-ink` / `--cs-ink-muted` |
| `--panel-bg` | rail, strip, peek surface | `Canvas` | `--cs-surface` |
| `--panel-border` / `--panel-border-width` | rail edge, peek edge | `ButtonBorder` / `1px` | `--cs-border` / `--cs-line` |
| `--panel-highlight-bg` / `--panel-highlight-fg` | pressed toggle fill and ink | `Highlight` / `HighlightText` | `--cs-surface-muted` / `--cs-ink` (today's chip) |
| `--panel-highlight-border` | the pressed ring's colour; must stay far from `--panel-focus` | `CanvasText` | `--cs-ink` |
| `--panel-toggle-size` / `--panel-toggle-size-compact` | toggle box | `32px` / `24px` | left on the fallback |
| `--panel-toggle-border` | the pressed ring's width | `1px` | `--cs-line` |
| `--panel-gap` | between toggles | `4px` | `--cs-space-xs` |
| `--panel-focus` / `--panel-focus-ring` / `--panel-focus-offset` | focus ring colour, width, outset | `Highlight` / `2px` / `2px` | `--cs-focus` / `--cs-focus-ring` / left on the fallback (the studio's `CONTROL_FOCUS` uses the same 2px) |
| `--panel-radius` | toggle corners | `0.25rem` | `--cs-radius-sm` |
| `--panel-rail-size` / `--panel-strip-size` | rail width, strip height | `48px` / `32px` | `--cs-size-rail` / `--cs-size-strip` (new) |
| `--panel-peek-zone` | hover zone width | `6px` | left on the fallback |
| `--panel-shadow` | peek overlay | `0 0 1rem rgb(0 0 0 / 0.3)` | left on the fallback until a shadow token exists (as the menubar does) |
| `--panel-peek-open` / `--panel-peek-close` | peek dwell before opening, grace before closing | `150ms` / `300ms` | left on the fallback |
| `--panel-z` | peek overlay stacking | `40` (under the menubar's 50) | left on the fallback |

Fallbacks are in px where the harness asserts pixels: `3rem` equals 48px only at a 16px root, and
the shell's `collapsedSize` is a px value. Two new tokens carry the sizes (`--cs-p-size-rail: 48px`,
`--cs-p-size-strip: 32px` → `--cs-size-rail`, `--cs-size-strip`), one carries the slide's motion
for the shell (`--cs-p-motion-slide: 200ms` → `--cs-motion-slide`; the kit has no slide and no
property for it), and a unit spec in the tokens package (which
the token lint exempts, being the token package) reads `tokens.css` and asserts the two sizes equal
`cockpitSizes.rail` and `cockpitSizes.strip` in `sizes.ts`, so the CSS rail and the panel's
collapsed width are one number. Only the contract block carries `token-ok`.

## The shell

`Cockpit` publishes on context its `orientation` (today only the library's `Group` receives it) and
its group element (the library's `Group` takes an `elementRef`). `Cockpit.Panel` gains `collapse?:
'hidden' | 'rail' | { size: PanelLength }`, the only source of the library's `collapsedSize`:
`hidden` gives `cockpitSizes.collapsed` (0) and is the one value that makes a collapsed panel
inert; `rail` gives the rail or strip size by the group's orientation; `{ size }` gives that size
and stays live, the escape hatch for a variant with an edge of its own (a 24px mini rail) so that no
future variant edits the shell. The shell knows nothing called `peek`; the kit's variant map says
`peek` is `hidden` to the shell.
`pinnedPanel(size)` drops its `collapsedSize` parameter; its two assertions in `cockpit.spec.tsx`
change with it, the studio stops passing `collapsedSize`, and the nested shelf in
`cockpit.stories.tsx` gains `collapse="hidden"` so `cockpit--nested` keeps its zero (a deliberate,
baseline-neutral edit). The panel stamps `data-collapse="<variant>"` on the library's outer, sized
element, to which `Cockpit.Panel` forwards every `data-*` attribute (the library spreads rest props
there; `className` and `style` reach the inner element only).

**The binding grows.** `usePanelToggle`'s `panelProps` (`CockpitPanelBinding`) carries three more
fields, and `Cockpit.Panel` accepts them: `collapsed` (the toggle's state), `sliding` (true from a
programmatic toggle that acted until its slide ends), and `onSlideEnd`. The toggle also returns
`sliding`. Only `collapse()` and `expand()` set `sliding`, and only when they acted; a drag, the
mount reconcile (which calls the library directly, not `expand()`), and a call with no slack never
do. `Cockpit.Panel` stamps `inert` and `data-collapsed` when `collapse` is `hidden` and
`collapsed && !sliding`, so the collapsed state lands when the slide ends. The studio's preset swaps
children on the same condition (`collapsed && !sliding ? edge : content`), so content stays mounted
and visible while it slides shut and appears at once when it opens. `useFocusHandoff` keys its
effect on `collapsed` and `sliding` and returns while `sliding` **before** it reads and clears its
pending flag, so the flag survives the sliding commit and focus moves to the edge's control in the
commit that ends the slide, as it does today; under reduced motion `sliding` is never true and
today's path is unchanged.

**The slide.** `react-resizable-panels` renders two elements per panel: an outer one that carries
the sizing style, `flex-grow` alone (`flex-shrink` 1 and `flex-basis` 0 are constant), and an inner
one that receives the consumer's `className`. A transition on the inner element animates nothing.
The rule lives in a new `packages/shell/src/lib/cockpit.css`, exported from the shell's
`package.json` as `./cockpit.css` (the menubar's `./menubar.css` shape; the shell exports no CSS
today) and imported by the studio's `styles.css` and `.ladle/preview.css`, reading the token,
lint-clean: `[data-panel][data-sliding] { transition: flex-grow var(--cs-motion-slide) ease-out }`. Because a panel's rendered width is its share of the
group's total, every panel in the group whose share changes must be armed for the same duration, or
the neighbours jump on the first frame while the toggled panel eases. `Cockpit.Panel` arms in a
layout effect of the commit in which `collapsed` changed with `sliding` true: it stamps
`data-sliding` on each direct `[data-panel]` child of its group's element (`:scope > [data-panel]`,
so a nested cockpit inside a panel is untouched and the compound selector holds) and a second
attribute, `data-sliding-self`, on its own, so two panels of one group sliding in the same window
never overwrite each other's mark; the library's `flex-grow` change commits in the same task, and a
CSS transition starts whenever the after-change style names the property, so arming in the same
commit is early enough, and the motion assertion proves it. The clip is for the toggled panel only,
`[data-panel][data-sliding-self] > * { overflow: hidden !important }` (the library sets `overflow`
inline, hence `!important`, with the reason beside it); neighbours keep their own `overflow`, so the
manuscript's scroller is never clamped mid-slide. Disarming: `Cockpit.Panel` listens on the group
element for `transitionend` and `transitioncancel` with `propertyName === 'flex-grow'`, and once no
armed element has a running animation (`element.getAnimations()`), removes both attributes
everywhere and calls `onSlideEnd()`. Two backstops: after arming it reads its own computed
`transition-duration`; `0s` (reduced motion, or a token set to 0) disarms at once, otherwise a timer
at five times the duration re-checks, and while a check still finds a running animation (a test has
paused it) it re-arms the timer rather than disarming, so the attribute's lifetime is the
animation's; and any `pointerdown` inside the group element, heard at capture, disarms at once, so
a drag never fights a transition (the library's separator is `[data-separator]`, but its grab area
is inflated to 10px around a 1px line, so the event's target is usually a panel; no selector
would catch it, and a pointer down anywhere in the group during a 200ms slide costs nothing to
honour). Under `prefers-reduced-motion: reduce` the
studio's stylesheet sets `--cs-motion-slide: 0ms`: the state change is the same, only the motion is
gone.

**No room.** When the window is too narrow for a panel to expand, `expand()` returns false today
and the toggle looks like it does nothing. Nothing in the shell can know the slack without acting,
so the answer is after the fact (wave 2): a command whose `expand()` returned false is marked
`blocked`; while blocked, its toggle carries the `hint` and the attempt's `hintAt`, so the tooltip
opens for two seconds at once and again on hover, and the live region says the same, whether the
attempt came from the toggle, the menu item, or the shortcut. The hint names the axis the region
runs out of: "No room: widen the window" for the navigation and the inspector (the body group's
floor is a width), "No room: make the window taller" for the context shelf (the centre group's
floor is a height). `blocked` clears on the next call that acts, on a user layout change
(`onUserLayout`), or on a window `resize` event. The toggle stays enabled, because resizing the
window and trying again is the remedy. A window-caused collapse renders the
panel's chosen variant (it does not force a rail).

## The studio

- **Order.** `studio-regions.ts` exports `REGION_ORDER = ['nav', 'context', 'inspector', 'top']`,
  the panels' spatial order, which is also VS Code's Appearance order; the toolbar and the View menu
  both import it (the menu's private `VIEW_ORDER` goes), the comment on `STUDIO_REGIONS` no longer
  claims toolbar order, and a one-line spec asserts the two arrays hold the same set, so a sixth
  region added to one cannot be missing from the other.
- **Toolbar** (wave 1). The four text toggles become `PanelToggle`s in `REGION_ORDER`. Accessible
  names, `aria-pressed`, `aria-keyshortcuts` and the pressed border are unchanged, so both
  harnesses' name queries and the menubar's chip probes keep passing; the visible text moves to the
  tooltip.
- **Preference** (wave 2). `packages/contracts` gains `panelVariantKey(projectId, region)` →
  `cs:panel-variant:<projectId>:<region>` on the existing `PreferenceStore`, shaped like the layout
  and collapsed keys so a per-project variant later is not a migration; the studio passes the same
  project id it uses for those. `usePanelVariant(region)` reads it, validates against the accepted
  set (the variant map's keys; unknown → `hidden`), writes only on change, never on mount, and the
  preset passes each region's `collapse` from the map entry. "Reset layout" leaves the
  variants alone; the `layoutKeys` doc comment in `studio-commands.ts` says variants are not in the
  list by design.
- **Edges** (wave 2). The rails and strips are rebuilt on `PanelEdge`; the top shelf's strip gains
  the three compact toggles in the order fixed above.
- **Menu** (wave 2). After the four checkbox items and a separator, a `When hidden` submenu holding
  one submenu per region (Navigation, Context shelf, Inspector) with a radio group: Vanish · Rail ·
  Peek (Peek only once wave 3 lands). The four checkbox items and their shortcuts do not move.
- **Focus** (wave 2). `useFocusHandoff` today searches the collapsed region's own panel for the way
  back. It gains a second target: when the region's panel has no focusable control (every variant
  but `rail`), focus goes to that region's `PanelToggle` on the top shelf, or on the strip when the
  shelf is collapsed; that target always exists and is never natively disabled. The portal-aware
  check stays.
- **Separator.** A hidden panel's separator stays draggable and keeps its name ("Resize
  navigation"): dragging it open is a way back, as in VS Code. Named, not accidental.
- **Storage whitelist.** The cockpit harness's storage assertion admits the new key shape (wave 2).
- **Theme** is untouched.

**Sentences that change, by wave.** Wave 1: `AGENTS.md`'s gate paragraph ("two studio views" →
"the studio views `baselines.mjs` names"); the shell header in `studio-cockpit.tsx` gains the slide
and the swap-on-slide-end; `useFocusHandoff`'s own doc block (`studio-cockpit.tsx:171-181`) and the
friction note on the handoff (`friction-notes.md:123-126`) gain "after the slide";
`studio-toolbar.tsx:17-20` ("each toggle's visible text is its accessible name" → the name is the
`aria-label`, the text is the tooltip); `studio-regions.ts`'s "in toolbar order" comment;
`studio-menus.tsx`'s `VIEW_ORDER` comment. Wave 2: the friction note on no-slack toggles
(`friction-notes.md:86-87`, "the toolbar buttons do nothing" → the blocked hint); the cockpit
harness's header (`cockpit.mjs:7-8`, "Nothing vanishes"); `AGENTS.md`'s Stage line "a rail or strip state on every edge (nothing
vanishes)" → "a way back on every edge: the plainest variant hides the panel and leaves its icon on
the shelf"; the "Nothing vanishes" paragraph of the `studio-cockpit.tsx` header; `studio-rails.tsx`'s
rationale (`:4-11`) and glyph comment (`:15-16`); the `layoutKeys` comment. Each wave's commit names
them.

## Testing contract — what turns red when something subtle breaks

Every wave lands with all of these for the parts it adds; nothing merges on the visual baseline alone.

- **Unit (Vitest, jsdom):** roles and states per part (`aria-pressed`, `aria-keyshortcuts`,
  `data-pressed`, the segment's `fill`, `aria-disabled` with activation a no-op); tooltip appears on
  hover and on Tab focus, closes on Escape, shows the `hint`, and is not the accessible name;
  `PanelEdge` renders nothing for `hidden`, a landmark named `Expand <region>` for `rail`, a zone
  for `peek`; `PanelPeek` opens, closes on leave and on Escape, stays with focus inside; the
  preference hook never writes on mount and rejects unknown values; the shell's `collapse` resolves
  the rail size from orientation; `usePanelToggle` sets `sliding` only for a call that acted;
  `Cockpit.Panel` stamps `inert` for `hidden` only, and only once `sliding` is false, and resolves
  `{ size }` to that size; `REGION_ORDER` and `STUDIO_REGIONS` hold one set; the manifest spec (no workspace imports); the tokens spec that ties `--cs-size-rail`/`strip` to
  `sizes.ts`.
- **Behaviour (both harnesses, headless, dev and preview):** for each region and each variant
  reachable through the menu: hide via toggle, via shortcut, via menu; the geometry after the change
  at the pinned sizes (0 or 48 or 32); `aria-pressed` and the segment's `fill`; focus lands where the
  spec says; a hidden panel's content is gone from the tab order; the live region announced; the
  strip carries three working toggles after its own control; the peek zone opens the overlay and the
  overlay closes on leave; reload keeps the variant; the blocked hint: at 700px wide ⌃⌘B on a
  collapsed navigation leaves it collapsed, the tooltip is visible with the width hint and the live
  region carries it, and after a resize to 1440 the tooltip is gone and ⌃⌘B acts; the same at 500px
  tall for the context shelf with the height hint. The
  harness reads `--cs-motion-slide` from the page once and sleeps duration + 100ms after every
  toggle (the two 200ms sleeps in `cockpit.mjs` change; the 300ms ones already clear), so the
  harness has no second copy of the number. Assertions that change are named in the commit with the
  reason.
- **Motion (in the harness):** during a programmatic toggle, among the direct `[data-panel]`
  children of the toggled panel's group, exactly the panels whose inline `flex-grow` changed carry
  one running `CSSTransition` each with `transitionProperty === 'flex-grow'`, and no other panel
  does: for the navigation in the body group that is two, the navigation and the centre (the
  library hands the freed share to the nearest neighbour that can take it, and the centre has no
  maximum), the same two for the inspector, the main and context in the centre group, and the top
  and body in the root group: two for every region; each has `effect.getTiming().duration` equal to
  the token and its `finished` resolves within duration + 50ms; during the slide the toggled panel's
  computed `transitionTimingFunction` is `ease-out` and its inner element's computed `overflow` is
  `hidden`, and its neighbour's is not; both attributes are gone afterwards; none exist under
  emulated `prefers-reduced-motion: reduce`; a pointer pressed inside the group within the slide
  (a toggle, then `mouse.down` on the navigation's separator after 50ms) leaves zero running
  `flex-grow` transitions and no attribute, so the drag check cannot pass vacuously; none exist on
  the mount reconcile. The harness asserts these numbers, not the feel.
- **Visual (Playwright baselines on the runner):** every kit story in both schemes, including the
  hover, focus, `aria-disabled` and tooltip-open states: a story declares in its Ladle `meta` the
  element to hover, or to reach by Tab, before the shot (`meta` reaches `dist/ladle/meta.json`;
  `baselines.mjs` gains a `storyMeta()` export beside `storyKeys()`), and `stories.visual.mts`
  honours it, so a flattened hover fill or a lost focus ring fails the comparison. Studio views: the
  descriptor in `baselines.mjs` grows from `{ view, menu }` to `{ view, steps, screenshot? }`, where
  `steps` is serialisable data interpreted by `studio.visual.mts` (the prune script imports the file
  under plain Node, so no callbacks), and `screenshot` carries per-view options such as
  `animations: 'allow'`. Six step kinds, and every named view is written in them: `['menu', ...path]`
  opens each item along the path and holds the last menu or submenu open for the picture
  (`view-open` is `['menu', 'View']`, `when-hidden-open` is `['menu', 'View', 'When hidden',
  'Navigation']`); `['select', ...path]` opens along the path and activates the last item;
  `['toggle', region]` clicks the shelf toggle; `['dwell', selector, ms]` moves the pointer to the
  element and holds it there for `ms` before the shot (`peek-all` dwells on `[data-pc="zone"]` for
  the open delay plus 100ms); `['pause-slide', region, 0.5]`; `['resize', width, height]`. The set is bounded: `cockpit`, `view-open`,
  `top-collapsed` (the strip; wave 1), `hidden-all`, `rail-all`, `peek-all` (navigation peeking),
  `when-hidden-open` (the submenu; wave 2), and two mid-slide frames (`slide-nav-hide`,
  `slide-nav-show`), each in both schemes: 18 studio baselines when all waves are in. The mid-slide
  frames take `document.getAnimations()`, finish every animation that is not a `flex-grow`
  transition of the group (the toggle's own colour transition among them, so nothing on the page is
  at a round-trip-dependent point), pause the `flex-grow` ones and set each `currentTime` to half
  the duration, shoot with `animations: 'allow'` (which the shell's disarm rule leaves running),
  then finish them so the shell disarms; a change to easing, duration, clipping, or the glyph's
  shape fails the comparison, and nothing else in the frame moves.
- **Contrast:** the toggle's `color` 3:1 against the shelf in both schemes by the menubar probe's
  `color` mode; the pressed border by its `borderTopColor` mode, unchanged.
- **Token lint** clean: only the contract block carries `token-ok`.

## Waves

1. **Foundation, nothing a writer relies on changes.** Kit skeleton (`nx-generate`,
   `kind:portable`, the tightened constraint, manifest spec), `PanelToggle` with its glyph, both
   pressed channels, portalled tooltip, states and `compact` size, the contract block and skin, the
   studio toolbar on `PanelToggle` with `REGION_ORDER`, the shell's orientation and group-element
   context, `collapse` prop with the shell's whole vocabulary (`hidden`, `rail`, `{ size }`; the
   studio uses `rail` everywhere, as today), `pinnedPanel(size)`, the grown binding, `inert` for
   `hidden` (a shell unit test and a shell story exercise it; the studio has no route to it until
   wave 2), the slide with its
   stylesheet, arming, clip, disarm and `sliding` state, the preset's swap on slide end, the
   handoff waiting for the slide, the three tokens with their spec, stories (standalone, matrix of
   four sides × pressed, hover / focus / disabled / tooltip-open by meta, dark), unit specs, harness
   updates (fill check, token-read sleeps, motion assertions), the descriptor and `storyMeta()`,
   the `top-collapsed` view and the mid-slide frames, and regenerated baselines through a pull
   request. Two-reviewer gate on the code before merge.
2. **Variants as a preference; `hidden` becomes the default.** `PanelEdge`, the rails and strips
   rebuilt on it with the strip's three toggles, the preference key and hook, the live region, the
   blocked hint, the focus handoff's second target, the `When hidden` submenu with Vanish and Rail,
   the composite views and `when-hidden-open`, harness coverage of both variants per region, the
   storage whitelist, the wave-2 sentences, baselines. Gate.
3. **Peek.** `PanelPeek`, the zone in `PanelEdge`, Peek in the menu, its harness and baselines. Gate.

Doors, named so they are not blanks: auto-hide while typing; a handle on the panel's own header;
variants for the top shelf; a peek for shelves (top and bottom); mnemonics on the toggles; a shadow
token; Ark UI's own Collapsible for the rail content.

## Extension seams for the opinionated version

- A new variant: one entry in `PanelEdge`'s map naming its shell behaviour (`hidden`, `rail`, or
  `{ size }`) and its renderer, a part if it needs one, one radio item, one composite view. The
  shell, the preference validator (the map's keys) and the menu code do not change.
- A new panel beside the text (a character card): the kit gives it a `PanelToggle` (its own
  `glyph` when it shares a side with the inspector), a `Cockpit.Panel` with `collapse`, a
  preference key from the same builder, and a `PanelPeek` anchored to the body group's element from
  the cockpit context. What it does not give: a slot in `StudioCockpit`, whose five regions are
  fixed props; adding a region is an edit to the studio's preset, which is the opinionated layer by
  design, and the harness pattern per region copies.
- A different skin: redefine the `--panel-*` contract; the skin never hardcodes a colour.
- A different animation: the slide reads one token; the motion assertions and the harness sleeps
  read the same token from the page.

## Open questions, parked with defaults

- Tooltip delay: Ark's 400ms (VS Code's). Changeable in one prop later if wanted.
- The menu name "When hidden": kept unless Ryan prefers another; the item ids do not depend on it.
- Whether the context shelf should default to `rail` rather than `hidden` once the Write milestone
  puts something on it: decided then.
- Whether `hidden` as the wave-2 default should come with a one-time hint (the tooltip on first
  hide): not in scope; the icon's unfilled segment is the hint.

## Accepted risks

- Ark UI enters the workspace inside a portable package; the extraction list grows by one library
  and the jsdom stubs it needs.
- The peek zone and the manuscript's scrollbar share an edge on the inspector side; the zone yields
  to a scrollbar, and a writer with the pointer on the scrollbar gets no peek.
- The default path (`hidden`) is hardened for one wave less than the rail path, because wave 1
  keeps the rails to avoid changing what a writer relies on before the foundation is proven.
