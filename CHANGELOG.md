# Changelog

All notable changes to nc-ui are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/):

- a new token is a minor release
- renaming or removing a token is a major release
- changing a token's value is a minor release, with a note saying what looks different


## Unreleased: ASTRID north star

- Console fx pages (Peter, 2026-11-01: "don't push to a second row, create a second 'page' that user access via some standard arrow or chevron icon. Needs to be obvious though"). A section's `pageSize` (with `page` and `onPage`, or the kit keeps the page) shows its FX cards that many at a time from 769 px, never wrapping to a second row: a slim `target-min` bar above the cards with a ‹ at its left end, "1 / 3" in the middle and a › at its right end (square outlined buttons, `target-min`, the chevron in ink, `aria-label` "Previous effects page" / "Next effects page", `aria-disabled` and `divider`-coloured at the ends, the page said in a polite live region). Pages count cards, folded or not. The other pages' cards stay laid out but unseen and take no width, so the row is as tall as the tallest card of any page: turning a page never changes the console's height. A part-filled last page keeps three cards' width (unless a card on it is folded). A maximized card takes its page with its page-mates as fold columns; turning away restores it. Phones (≤ 768 px) still stack every card, no bar. `fxPages(count, size, page)`; `.nc-fx-pager`, `.nc-fx-page-btn`, `[data-nc-paged]`, `[data-nc-off-page]`.
- FX level meter (Peter, 2026-11-01: "For all the inserts add a small visual indicator (small bar graph indicator?) that shows the amount of signal being 'seen' in the insert"). An `fx` card's optional `meter: { open?(), close?(), read() }` (nc-fx's `fxMeter(fx, id)`) draws two thin vertical bars just before its switch: the signal going into the effect (left, `fx-level-in`, the meters' lighter Prussian blue) and coming out (right, `fx-level-out`, the accent), −48 to 0 dBFS with the strips' ballistics (rises at once, falls over `motion-meter-fall`), the hot colour (`fx-level-hot`, ASTRID's title orange: accents start with the instrument title colours) only from −1 dBFS (held `motion-meter-hold`). Fixed size (`fx-level-bar` 3 px, `fx-level-height` 20 px), so it never moves the header; a bypassed card dims it by colour; a folded column repeats it at its foot (`fx-level-fold-length`, giving way when short). aria-hidden; `meterHelp` gives its hover words. Every meter on a page shares one loop (src/primitives/fx-level.js: `bindFxLevel`, `createFxLevel`, `fxLevelPosition`, `fxLevelState`), about 30 frames a second, running only while one is on screen and the page is visible, 4 a second after silence; a source is opened only while its meter is on screen. The file has no imports, so an app can vendor it alone (docs/fx-level.md).
- Page menu (Peter, 2026-11-01: "On mobile put the top menu choices in a hamburger"). `pageMenu()` (src/primitives/page-menu.js, docs/page-menu.md): on phones (`PAGE_MENU_PHONE`, max-width 768 px) a header's text actions wait behind a ☰ button (`aria-expanded`, `aria-controls`, "Menu") and open as a flat list of `target-min` rows under the header; Escape, an item or a press outside closes it, the focus goes in and back. Wider screens are unchanged (the panel is `display: contents`). Panic stays outside the menu. `.nc-page-menu`, `.nc-page-menu-btn`.
- Phones in landscape (Peter, 2026-11-01: "these sections can be side by side in landscape mode"): at `(orientation: landscape) and (max-height: 500px)` below 1024 px an `adjacent` stack lays its modules side by side, as many columns as fit at two `module-slim-column`s, natural heights, the lead over two columns.
- Console strips: `sendsHidden` hides a strip's sends row (view only: the knobs stay in the DOM, unseen) and drops the row from the strip's grid, so a console that gives it to every strip, the master too, gets shorter strips whose faders and meters still line up; a folded strip follows (Peter, 2026-11-01: "a way to hide the send fx"; first user: the Studio's "− Sends").
- EQ graph (Peter, 2026-11-01: "a real-time visualizer at the top of the [EQ] module ... make it beautiful like FabFilter"). A new `eqGraph` control (src/primitives/eq-graph.js, docs/eq-graph.md): 20 Hz-20 kHz on a log axis and the EQ's gain range; the combined response (from the host's `response()`) as one line over a soft fill to 0 dB with a faint wide underlay; each band's own curve as a thin line in its colour; a draggable, focusable node per band (`role="slider"`; drag, arrows, Page Up/Down for Q, the wheel for Q, double-click or Delete resets; Shift is fine); a readout chip beside the band in use; and a live spectrum behind (an optional `spectrum` analyser, read about 30 times a second only while the graph is on screen and sound flows, 4 times a second while silent, given back when it leaves the page). New tokens with dark values: `eq-graph-height` (112 px), `eq-graph-height-max` (248 px), `eq-node-size`, `eq-graph-bg` (paper-bright), `eq-curve` (accent), `eq-fill` (filter-blue), `eq-grid`, `eq-spectrum` (slate), `eq-band-1..3` (amber, filter-red, plum), `eq-panel-layer`. The file has no imports, so an app can vendor it alone.
- FX card maximize: a card holding an `eqGraph` (or `maximize: true`) gets a maximize button after its fold triangle (`maxHelp` for hover words). In a console row it takes three columns; elsewhere it opens as a panel three module widths wide over the modules, anchored to its own column, with a × (`overPanelBox`); on phones it only grows taller. The button again, Escape or the × restores it. Remembered per card id for the page's life, never stored. Folding a maximized card restores it.
- Dark mode (Peter, 2026-10-31). `tokens.json` gains a `dark` set: the same names as the light tiers, each replacing one light value (a calm warm-neutral dark: paper `#1E1D1C`, ink `#E8E7E6`, module shades stepping lighter, the accent's twin `#69A7D3`, lighter danger/warning/filter colours, LUCY `#B566FF` for 4.5:1 on dark). The build emits only the changed properties, with `color-scheme: dark`, under `:root[data-nc-theme="dark"]` and under `@media (prefers-color-scheme: dark) { :root:not([data-nc-theme="light"]) }`, so the default follows the system and a host can force either. Light values are unchanged. JS gains `themes.light` / `themes.dark` (resolved colours for canvas), `VELOCITY_RAMPS` (the step ramp per theme, with its mark ink) and `src/theme.js`: `applyTheme`, `currentTheme`, `themeChoice`, `onThemeChange` (attribute and system changes, for canvas repaints), `followHostTheme` (an iframe takes its same-origin host's choice before first paint), `THEME_CHOICES`, `STUDIO_THEME_KEY`. test/dark.test.mjs checks the selectors, the JS/CSS sync and every key contrast pair. The kit follows on its own: step and pad cells paint their velocity fill from the theme's ramp (`data-nc-velocity`; one theme watch per document repaints them), and `defineModule` redraws its canvas displays on a theme change.
- Console strips: on the darker alternate strips the Inserts outline is `text-sub` at 50% against the divider, so it stays visible (Peter); hover is still `text-sub`, pressed unchanged.
- Console strips: `pan` adds a compact bipolar knob (−1 L .. +1 R) in its own row between the sends and the fader, labelled "L R" and read out as "C" / "L 30" / "R 45" (`panText`) on hover, focus or drag; double-click centres it. Every strip keeps the row, so faders line up; folded strips hide it and show a tiny pan mark. Knobs gain `bipolar` (the ring fills from the centre) and `help` (hover words).
- Console strips: the Inserts (Hacks) button's outline is the `divider` at rest and `text-sub` on hover (Peter: lighter); its text, and the pressed and master filled looks, are unchanged.
- Horizontal fold: `foldToggle()` / `setFoldToggle()`, a small solid triangle (◀ open, flipped to ▶ folded; `text-sub`, ink on hover; `motion-press` flip, instant under reduced motion; `target-min` pad on touch), replaces the −/+ on FX cards and console strips (Peter's mockup). On a strip it sits in the top-left corner above the name, so the name row and its × are as before. Labels "Minimize …" / "Expand …". −/+ stays the vertical module hide.
- Console strips: the × stays right after the name when a strip can minimize (the − alone moves to the row's start), and the `removeHelp` option is gone: the × is as it was (Peter).
- Console strips: minimize. `onFold` / `folded` / `foldHelp` / `foldedHelp` give a channel strip a −/+ at the start of its name row; folded it is a `strip-fold-width` (40 px) column with M and S stacked and working, a mark in the cap colour, the name read bottom to top (one button) and a thin meter on the open strips' row. Not on the master (docs/fx-fold.md).
- Console: an optional `meters` area (`area: "meters"`) after the FX cards and left of the master, on the master's shade with a hairline between; tablets put it beside the master on the strips' row, phones on its own row above the FX. First user: the Studio's VU meters.
- FX card fold: `onFold` / `folded` / `foldHelp` give an `fx` card a −/+ after its ON/OFF; folded in a console row (769 px up) it is a narrow column (`fx-fold-width`, 120 px), one button with the on/off word and the name read bottom to top, elsewhere its header row. No motion; the host keeps the state (docs/fx-fold.md). First user: the Studio's Mix.
- Step grid: Fill and Clear are text actions like Save and Load (held Fill: ink underline); coarse pointers keep a target-min pad.
- Console strips: `--nc-strip-cap` on a strip colours its fader cap (the Studio: each instrument's colour, muted). Unset, the cap stays ink.
- Group: the `group` control folds a run of a module's controls under one header (the More toggle's look and touch target, `aria-expanded` / `aria-controls`, no motion), closed by default, with a summary while closed; open state is a browser-wide preference (`GROUP_OPEN_KEY`, `readGroups`, `writeGroup`; docs/group.md). First user: NYX's "Tune & shape".
- Group: the closed summary sits on its own line under the title and wraps instead of being cut with an ellipsis (NYX's narrow Params column showed only "+3 st · …").
- Help: `installHelpTips()` and `data-nc-help` show a label's description when the pointer rests on it, in a small toast-styled bubble (`.nc-ui-help`; docs/help.md). Every instrument uses it.
- Canvas: `paint: "waveform"` draws a sample from `peaks` (min/max pairs), tints the played `region`, marks its start, end and slice `markers`, and a playhead `position` (NYX sampler).
- Console strips: the Hacks button's outline is `strip-hacks-text` (#8C8C8C), darker than the divider (Peter).
- Console strips: the Hacks label is mixed case ("Hacks") in a lighter grey, the new `strip-hacks-text` (`color.hacks-grey`, #8C8C8C, 3.2:1 on the strips); hover and pressed are unchanged.
- Console strips: `onHacks` / `hacks` / `hacksLabel` add a Hacks toggle above M and S (pressed in the master accent, `fader-cap-master`). Every strip keeps the row, so faders still line up.
- `createSwitch` / `.nc-ui-switch`: ASTRID's text on/off (the word, an accent hairline when on). Same API; the track and knob are gone, and so are the `switch-track-width`, `switch-track-height`, `switch-knob`, `switch-knob-inset` and `switch-gap` tokens.
- `.nc-seg`: ASTRID's underline tabs (hairline row, accent `tab-mark` under the chosen tab), replacing the filled black segmented bar. Radio semantics unchanged.
- Controls drawn at ASTRID's sizes; the 44 px target is an invisible pad on a coarse pointer (`target-min`). Toggles and on/off are regular weight (`control-weight`).
- Page frame: `.nc-page`, `.nc-page-hd`, `.nc-page-body` and the `page-*` tokens (ASTRID's 24/48/64 px gutters, header divider, module inset).
- Live kit: `@netcomposer/nc-ui/vite` (`ncUiLive`), `dist/nc-ui.fallback.css`, `installTheme()` in `@layer nc-ui-fallback` (docs/live.md).
- `scripts/guard-app.mjs` (`nc-ui-guard`): per-app ratchet on raw colours, fonts, px and Tailwind arbitrary values.
- Motion tokens in ASTRID's shape: `motion-fade`, `-fade-out`, `-slide` are durations; `-easing` tokens beside them; press/thumb/meter motion roles.
- Fixes from the Bass migration: FX/stacked cards set `slider-track` from their divider (the track vanished); tablets (769-1023 px) get the 2 x 5 slot grid; `.nc-page-title`, `.nc-page-sub`, `.nc-page-actions`, `.nc-page-action` (ASTRID's header).
- New tokens: `page-title-size`, `page-title-tracking`, `page-sub-size`, `page-sub-gap`, `page-action-gap`, `control-weight`, `tab-size`, `tab-pad-y`, `tab-mark`, `select-pad-end`, `page-*`, base `space-64`.
## [Unreleased]

## [0.2.0] - unreleased (not published): nc-ui is the shared module kit

Breaking: no aliases or compatibility names (Peter: no backward compatibility). Apps move on their own migration (Synth, Rhythm, Bass), after review.

### Added
- The module kit, imported from ASTRID-Rhythm `3001e7c` `vendor/nc-ui` (see `docs/history/rhythm-3001e7c-patches.md`): `kitCss`, `defineModule`, `renderControl`, confirm, toast, step editor.
- `createSwitch`: the shared on/off switch (`role="switch"`, hover, fixed width). Used by the module header (`on`/`onToggle`) and the FX card.
- `createSlider` / `sliderFactory`: fx-blocks' `SliderFactory` contract, returning the kit's slider row.
- FX card: header row with a switch (`on`/`onToggle`), `more` disclosure, colour dimming when off.
- Tokens: `motion-press` (.1s), `switch-track-width` 28, `switch-track-height` 16, `switch-knob` 10, `switch-knob-inset` 2, `switch-gap` 8, `target-min-coarse` 44.
- `[data-nc-dim="true"]`: colour dimming for a row, card or module body.
- `dist/nc-ui.css`, `nc-ui.min.css`, `nc-ui.min.js`, `nc-ui-inject.min.js` (JS-injected CSS entry), `confirm.css`, `tailwind-preset.js`, `tailwind-theme.css`, all committed. Subpath exports `./inject`, `./switch`, `./slider`, `./nc-ui.css`, `./tailwind-preset`, `./tailwind-theme.css`.
- `scripts/lint-ui.mjs` (in CI), plus component, lint and dist tests.
- S2 decided: tokens are the source of truth; Tailwind only references them (README).

### Renamed (Rhythm-domain roles the shared kit used; same values)
| 0.1.0 / Rhythm | 0.2.0 |
|---|---|
| `--nc-rhythm-module-gap` | `--nc-ui-module-gap` |
| `--nc-rhythm-control-gap` | `--nc-ui-control-gap` |
| `--nc-rhythm-header-gap` | `--nc-ui-header-gap` |
| `--nc-rhythm-head-margin` | `--nc-ui-head-margin` |
| `--nc-rhythm-name-width` | `--nc-ui-name-width` |
| `--nc-rhythm-slider-block` | `--nc-ui-slider-pitch` |
| `--nc-rhythm-knob-size` | `--nc-ui-knob-size` |
| `--nc-rhythm-display-height` | `--nc-ui-display-height` |
| `--nc-rhythm-button-tracking` | `--nc-ui-button-tracking` |
| `--nc-rhythm-button-pad-y` | `--nc-ui-button-pad-y` |
| `--nc-rhythm-hack-weight` | `--nc-ui-fx-name-weight` |
| `--nc-rhythm-label-leading` | `--nc-ui-label-leading` |
| `.nc-fx` / `.nc-fx-name` (kit FX card) | `.nc-ui-fx` / `.nc-ui-fx-name` |
| `--nc-ui-color-olive` (#6E7A3C) | `--nc-ui-color-plum` (#774A84); `--nc-meaning-movement` follows |

### Removed
| Token | Use instead |
|---|---|
| `--nc-ui-disabled-opacity`, `--nc-ui-control-disabled-opacity`, `--nc-rhythm-probability-dim` | colour dimming: `text-sub` / `divider`, `[data-nc-dim]` |
| `--nc-ui-dialog-button-min` (32 px), `--nc-rhythm-menu-item-min` (32 px) | `--nc-ui-target-min` (44 px, every pointer) |
| `--nc-ui-color-filter-green` (deprecated alias) | `--nc-ui-color-filter-accent` |

### Changed (what looks different)
- 44 px targets on every pointer, desktop too: confirm buttons, slot menu items, module header, hide/slim, select, toggle, button, the slider band, M/S and `.nc-hit` pads. Rhythm's desktop M/S rows may get taller; check this in the Rhythm migration.
- Dimming by colour: disabled sliders and buttons, muted or soloed-out lanes (on steps fill `text-sub`), ghost steps and pads, the step editor's sheet scrim (`dialog-scrim`).
- `color.ink-label` / `label-on-fill-dark` is ink `#242424` (was the green-tinted `#1f2421`). Surprise fills keep ASTRID's hue and saturation; 871 of 1000 fixture rolls are identical, and the rest differ only in the lightness nudge.

### Added
- `rhythm` domain (owner: Petra): step cells, playhead, track mute and solo, probability, lane colours, bar accent, drum-filter curves, and rhythm kit geometry. Source paths are in `component.rhythm.$scope`. See `docs/domains/rhythm.md`.

## [0.1.0] - 2026-10-27 (not published)

### Added
- Three-tier design tokens extracted from ASTRID with a pixel-identical result: base values (palette, type scale, weights, tracking, leading, spacing, radii, border and stroke widths, durations, opacities, breakpoints, legacy shadcn/Tailwind values) and semantic roles (surfaces, text, accent, module shading for adjacent and stacked modules, paddings, label/title/readout type, slider, slots, focus, strokes, motion).
- Component tier (tier 3), namespaced by domain as `--nc-<domain>-<name>` / `component.<domain>`:
  - `synth`: keys, filter curves, curve labels
  - `meaning`: areas and dimensions
  - `situation`: drawer, map, chart
  - `rhythm`: reserved, empty

  Domain-specific roles from the first draft moved here; see `docs/renames.md` and `tokens/renames.json`. The build rejects domain leaks and collisions, and each domain carries a `$scope` for the module lint.
- Runtime surprise-fill tokens (`--nc-ui-surprise-*`) and pure colour functions: `surpriseColor`, `labelColorFor`, `slotColors`, `contrastRatio`, `surpriseFillStyle`.
- `scripts/build-tokens.mjs`: `tokens.json` → `tokens.css`, `tokens.js`, `tokens.d.ts`, `tokens.ts`, `tokens.resolved.json`; `--check` mode.
- `scripts/inventory.mjs` and `docs/token-inventory.md`; draft `docs/design-rules.md`.
- Tests (node:test): build, CSS/TS sync, contrast and surprise rules, roll-for-roll parity with ASTRID's surprise colours.
