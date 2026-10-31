# Changelog

All notable changes to nc-ui are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/):

- a new token is a minor release
- renaming or removing a token is a major release
- changing a token's value is a minor release, with a note saying what looks different


## Unreleased: ASTRID north star

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
