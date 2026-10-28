# Domain `rhythm`

Owner: **Petra**. Status: filled for ASTRID Rhythm.

CSS vars are `--nc-rhythm-<name>`. JS is `component.rhythm['<name>']`.

A Rhythm file may read generic semantic tokens (and the runtime surprise tokens) plus this domain. It may not read a base token, and it may not read `synth`, `meaning`, or `situation`. The lint maps a file to this domain when its path matches `$scope` in `tokens/tokens.json`. The longest match wins. These paths are the Rhythm repo, the same way ASTRID's domains list ASTRID paths:

- `apps/rhythm/**`
- `packages/ui-theme/src/**`
- `vendor/nc-ui/src/module/**`
- `vendor/nc-ui/src/primitives/**`

## What stays generic

`slot-*` and `sparkle-*` (pattern slots and the surprise button), `trigger-dot`, `module-bg-*` shading, `label-*` / `readout-*` / `title-*` type, slider parts, `accent`, `danger`, `warning`, `transition-feedback`, and the curve / trace / grid strokes. Filter curves are the shared semantic roles `filter-lowpass`, `filter-highpass`, and `filter-bandpass` (`--nc-ui-filter-*`). `src/alias.js` (`filterPaint`) is the only caller.

## Members

| name | ref | role |
|---|---|---|
| `step-cell-off` | `semantic.surface-page` | step that is off |
| `step-cell-on` | `color.accent-pad` | step that is on (the accent's hue, lighter: 2.35:1 against the ink accented step, paper ink on it 6.07:1) |
| `step-cell-ink` | `semantic.on-accent` | mark drawn on an on step |
| `step-cell-accent` | `semantic.text` | accented step (kept for the contrast tests; a step's fill is now its velocity, and an accent is `accent-mark`) |
| `step-cell-size` | `semantic.slot-size` | step-grid cell, same square as a pattern slot |
| `step-gap` | `semantic.slot-gap` | gap between step cells, including a full row. This is the old `gap-tight` (1px), now 2px |
| `playhead` | `semantic.playhead` | the step that is playing: a `semantic.playhead-width` ring in `semantic.playhead`, `semantic.playhead-offset` clear of the step (the shared playhead, Bass's method) |
| `track-mute` | `semantic.text-sub` | mute pressed |
| `track-solo` | `semantic.accent` | solo pressed |
| `probability-dim` | `semantic.disabled-opacity` | a step whose probability is below certain |
| `velocity-bar` | `semantic.accent` | velocity bar inside a step |
| `velocity-min` | `color.accent-velocity-min` | fill of an on step at velocity 5%, the light end of the ramp (#477399) |
| `velocity-max` | `color.accent` | fill of an on step at velocity 100%, the dark end of the ramp (#003153) |
| `accent-mark` | `semantic.on-accent` | the accent mark: a paper bar inside the bottom of an accented step or pad |
| `accent-mark-size` | `space.3` | height of the accent mark (an inset box-shadow, so no layout) |
| `bar-accent` | `semantic.text` | downbeat / bar mark on the grid |
| `lane-1` | `color.ink` | lane colour 1, palette |
| `lane-2` | `color.accent` | lane colour 2, palette |
| `lane-3` | `color.amber` | lane colour 3, palette |
| `lane-4` | `color.sub-0` | lane colour 4, palette |
| `sparkle-gap` | `space.6` | space around the surprise button in a slot row |
| `morph-max` | `space.40` | morph slider max width |
| `morph-min` | `space.24` | morph slider min width, so the row stays one line at 360 |
| `morph-readout` | `34px` | morph time readout width (no spacing step equals 34) |
| `brand-size` | `font-size.xl` | instrument name in the page header (PETRA / RHYTHM / 01, as ASTRID / SYNTH / 01) |
| `brand-tracking` | `tracking.8` | instrument name letter spacing |
| `brand-weight` | `font-weight.medium` | instrument name weight |
| `brand-sub-size` | `font-size.lg` | line under the instrument name |
| `brand-sub-gap` | `space.8` | space between the instrument name and the line under it |
| `menu-item-min` | `space.32` | slot menu item height on a fine pointer (a coarse pointer uses `target-min`) |

Pattern slots themselves stay on the generic `slot-*` roles. Tapping a slot loads its pattern into the controls below. Tempo is not a per-slot value and is not a token here.

## Velocity shade

An on step's (or pad's) fill is its velocity: one continuous ramp in the accent's hue, from `velocity-min` at 5% to `velocity-max` (#003153) at 100%. The runtime token `velocity-fill` (`--nc-ui-velocity-fill`, default `color.accent-pad`, the plain on fill for a cell with no velocity) carries it per cell. Shade means velocity only, so:

- an accent is a mark, not a fill: `accent-mark` (paper) as an inset bar `accent-mark-size` high along the inside of the bottom edge;
- a step whose chance is below 100% has a dashed outline at the same `hairline` width (`border-style: dashed`, `background-clip: padding-box`), with no opacity;
- a muted or soloed-out lane still dims with `probability-dim`, and steps past a lane's length stay ghosted.

The colour snaps (`transition: none`), and it is written only when a cell's velocity changes.

`src/color.js` holds the one mapping, shared with Bass:

```js
import { velocityFill, velocityFillStyle, VELOCITY_RANGE, VELOCITY_RAMP } from "@netcomposer/nc-ui";

velocityFill(0.8);
// → { velocity: 0.8, t: 0.789…, fill: "#103E61", ink: "#F5F5F5" }
velocityFillStyle(0.8); // → { "--nc-ui-velocity-fill": "#103E61" }, set on the cell
```

- Input: a number. It is clamped to `VELOCITY_RANGE` (the `velocity-range` constant, `[0.05, 1]`); anything that is not a finite number counts as 0.05. An optional second argument `{ min, max }` (#rrggbb) replaces the ramp ends; the default is `VELOCITY_RAMP`, the two tokens above.
- Output: plain JSON. `velocity` is the clamped value, `t` its place on the ramp (0 at 0.05, 1 at 1.0), `fill` the colour as `#RRGGBB` (exactly `min` at 0.05 and `max` at 1.0, linear in OKLab in between, so lightness steps evenly and the hue stays the accent's), and `ink` the colour of a mark or step number on it (`step-cell-ink`, paper).
- Contrast on the default ramp (WCAG), held by `test/velocity.test.mjs`: the 5% fill is 4.61:1 on paper (the empty step), 3.67:1 on the selected-row tint (`accent-tint`) and at least 3.26:1 on the module backgrounds (`module-bg-stack-1` to `-4`); paper ink and the accent mark are at least 4.61:1 on every fill (12.31:1 at 100%). A louder step is a darker fill: strictly at every 5% step, never lighter at 1% steps (the output is 8-bit `#RRGGBB`, 188 distinct shades across the range). The playhead ring (`playhead`, #003153) sits one `playhead-offset` outside the step, so a hairline of the page or the tint (12.31:1 / 9.82:1 to the ring) always separates it from the fill; against the 5% fill itself the ring is 2.67:1, and at 100% it is the same colour as the fill, as it was with the old ink accent.

## Upstream

This domain is applied in the Rhythm repo as `patches/nc-ui-rhythm-domain.patch` against nc-ui commit `7d9bb4e`. Astrid accepted the names on nc-ui branch `petra/rhythm-renames-filter-roles` (local, not published), so this tree stays `7d9bb4e` plus the patch. `gap` is `module-gap`, `gap-sm` is `control-gap`, `leading` is `label-leading`, and `gap-tight` (1px) is folded into `step-gap` (2px). `synth.filter-*` and `rhythm.filter-*` are the semantic roles `filter-lowpass`, `filter-highpass`, and `filter-bandpass`. `lane-1`…`lane-4` point at palette colours. Regenerating outputs is `node scripts/build-tokens.mjs` from the nc-ui root.

## Moved to the shared kit (nc-ui 0.2.0)

The kit's spacing and type roles are not Rhythm's: every instrument's modules use them. They are now semantic tokens
(`--nc-ui-*`), with the same values and no aliases: `module-gap`, `control-gap`, `header-gap`, `head-margin`,
`name-width`, `slider-pitch` (was `slider-block`), `knob-size`, `display-height`, `button-tracking`, `button-pad-y`,
`fx-name-weight` (was `hack-weight`) and `label-leading`. See CHANGELOG.md for the full table.
