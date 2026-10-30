# NetComposer design rules (draft)

> "This becomes a design language that everything uses to stay in sync with respect to UI... if we decide we want to change the font or the colors system wide, we do it in one place and all modules reference it."
> (Peter Semmelhack)

nc-ui is that one place. These rules are a draft: Peter confirms or changes them before they become CI rules. Petra's lint, contract test and screenshot harness enforce them (see the README, "Where the tooling plugs in").

## 0. ASTRID is the north star (Peter, 2026-10)

Every module (Synth, Rhythm, Bass, Studio, and anything new) looks like ASTRID. When the kit and ASTRID disagree, the kit changes. Peter's decisions:

| # | decision | in the kit |
|---|---|---|
| 1 | Icons are fine where space is tight (dense rows, mobile): ▶ on Bass's Play stays | rule 1 below |
| 2 | On/off is ASTRID's text toggle (the word On / Off, accent hairline when on), not an iOS switch | `createSwitch` keeps its API; `.nc-ui-switch` has no track |
| 3 | Segmented controls are ASTRID's underline tabs, not a filled black bar | `.nc-seg`: hairline row, `tab-mark` accent bar under the chosen tab |
| 4 | Slider thumbs are solid (ASTRID) | `.nc-range` thumb is `slider-thumb` |
| 5 | ASTRID's page frame everywhere: side gutters, a divider under the header, modules inset | `.nc-page`, `.nc-page-hd`, `.nc-page-body`; `page-*` tokens |

Sizes: controls are drawn at ASTRID's sizes (toggle about 20 px, tab 28, select 27, slider 20). On a touch screen (`pointer: coarse`) an invisible pad grows each text control to `target-min` (44 px), centred on it, as ASTRID does. A select can't carry a pad, so it grows itself on touch. Buttons stay 44 px (ASTRID's are 41).

## 1. Peter's UI rules

1. **Ultra-minimal.** Labels, readouts, hairlines, and nothing else. Words by default; an icon only where space is tight (dense rows, mobile). No decoration, no shadows, no rounded cards. Colour is reserved for state (accent = on / selected / playing, danger = an error).
2. **Hide rather than delete.** A module, panel or control the player doesn't want is hidden (`−` / `+`), stays mounted, keeps its state and comes back exactly as it was. Nothing is destroyed by tidying the screen.
3. **Motion is a state change, or it follows the audio.** A button press (ASTRID `.nc-btn:active` scales to .985), a fade, a slide-in, a module reveal, and the Undo toast use only `motion-fade` (.2 s), `motion-fade-out` (.25 s), `motion-slide` (.22 s), and `transition-feedback` (.15 s). Each is 100–250 ms, and each is off under `prefers-reduced-motion: reduce`.
   - Meters, the playhead, and voice activity may update every frame. A slider, knob, or other value driven by an LFO or another external source never tweens: `data-modulated` is present only while that source drives it, and `[data-modulated], [data-modulated] *` set `transition: none`.
   - Slider thumbs and meters do not transition yet. Hide/show does not animate width or height.
4. **Rows stay on one line down to 360 px.** Every control row (label, slider, readout) fits one line on a 360 px-wide phone. Text truncates with an ellipsis and never wraps a row onto two lines. Check desktop, iPhone 390 and iPhone 360 for every UI change (see the PR template).

## 2. Tokens: the only place a font, colour or size is defined

**The rule:** module code never contains a colour (hex, rgb, hsl, named colour), a font family, a font size, a letter-spacing, a spacing value, a radius, a duration or an opacity. It reads a token. Change `tokens/tokens.json`, run `npm run build`, and every module follows.

### Three tiers

| tier | CSS name | JS | what it holds | who may read it |
|---|---|---|---|---|
| 1 base | `--nc-ui-<group>-<name>` (`--nc-ui-color-accent`, `--nc-ui-font-size-xs`) | `base.color.accent` | raw values: palette, font families, type scale, weights, tracking, leading, spacing scale, radii, border and stroke widths, durations, opacities, breakpoints | **only** tiers 2 and 3 (and primitive geometry, rarely). Never a module. |
| 2 semantic | `--nc-ui-<role>` (`--nc-ui-accent`, `--nc-ui-label-size`, `--nc-ui-module-bg-stack-2`) | `semantic.accent` | **generic** roles any NetComposer app has: surfaces, text, accent, danger/warning, module shading and padding, title/label/readout/body type, slider parts, focus, slots and the sparkle, label-on-fill, strokes, disabled, `transition-feedback` | every module and primitive |
| 3 component | `--nc-<domain>-<name>` (`--nc-synth-keybed-height`, `--nc-meaning-tension`) | `component.synth['keybed-height']` | roles that only make sense in one **domain** (one app area): the synth's keys and filter curves, the Meaning dimensions, the Situation drawer | **only** modules of that domain |
| runtime | `--nc-ui-surprise-*` | `runtime` | values computed while the app runs (the surprise fill and its label) | the slots, via `surpriseFillStyle()` |

Domains today (members are in `tokens.json` → `component`):

| domain | covers | members |
|---|---|---|
| `synth` | ASTRID synthesizer modules (`artifacts/netcomposer-synth/src/**`, `lib/synth-audio/src/**`) | `key-white`, `key-black`, `key-hint-on-dark`, `key-held-base`, `keybed-height`, `curve-label-font`, `curve-label-size`, `slim-curve-width` |
| `meaning` | the Meaning filter (`src/meaning/**`) | `area-1`…`area-4`, `intimacy`, `energy`, `tension`, `ambiguity`, `movement`, `highlight` |
| `situation` | the Situation drawer (`src/situation/**`) | `drawer-bg`, `drawer-width`, `map-marker-off`, `chart-tick-size`, `chart-tooltip-size` |
| `rhythm` | ASTRID Rhythm (`apps/rhythm/**`, `packages/ui-theme/src/**`, and the module/primitives seams) | step cells, playhead, mute/solo, probability, lanes, kit geometry. See [domains/rhythm.md](domains/rhythm.md) |

What stayed generic, and why: the snapshot `slot-*` and `sparkle-*` roles (Rhythm has pattern slots too), `trigger-dot`, `label-on-fill-*`, the hidden-module roles (`module-slim-column`, `title-size-slim`), `skeleton-highlight`, and the strokes. `filter-lowpass`, `filter-highpass`, and `filter-bandpass` (`--nc-ui-filter-*`) are shared by synth and Rhythm. `curve-stroke`, `trace-stroke` and `grid-stroke` are read by both synth and Situation, so they belong to no single domain.

Rules:

- **The lint contract.** A module may read **generic semantic tokens** (and runtime tokens) plus **its own domain's component tokens**. It may **never** read a base token, and never another domain's component tokens. A file belongs to the domain whose `$scope` in `tokens.json` matches its path. When more than one scope matches, the longest wins, so `src/meaning/**` beats the synth app's `src/**`. When a module needs a value no role covers, it adds a role (semantic if any app could use it, component if only its domain can). It never reaches for a base token. `docs/token-inventory.md` ends with a contract preview: what the lint would flag in ASTRID today.
- A semantic token references a base token (`{"ref": "{color.accent}"}`). A component token references a base token or a semantic role (`{"ref": "{semantic.text}"}`). Prefer the semantic role when it means the same thing, so a change to the role reaches the component too. The only literal values allowed are dimensions with no scale (`slider-thumb-size`, `keybed-height`, `drawer-width`).
- Names describe the role, not the look: `danger`, not `red`.
- The build rejects collisions:
  - a semantic name that starts with a base group (`color-`, `space-` …)
  - a semantic name that starts with a domain (`synth-`, `meaning-` …), because it belongs in that domain
  - a domain named after a base group, or `ui`
  - a component name that repeats its domain (`meaning.meaning-x`)
- A new domain is one lowercase word with a `$description` and a `$scope`.

### Module shading: what -1..4 means

The number is the **stack depth**: **1 is the top or first module, 4 is the deepest**. Anything deeper than 4 reuses 4. Every step is −5 per RGB channel darker than the one before it, so a deeper module is always a little darker than the one it sits under or next to.

| token | the number counts | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| `module-bg-adjacent-n` | position among modules side by side (desktop) or one after another (phone) | first / top module (Keyboard 01) | second (VCO 02) | third (VCF 03) | fourth and later (VCA 04) |
| `module-bg-stack-n` | depth of something stacked *inside* a module, continuing past the adjacent ramp | the stacked panel itself (Hacks 05) | its first card | second card | third card and deeper |
| `module-sub-stack-n` | same depth as the `module-bg-stack-n` it sits on | secondary text on stack-1 | … on stack-2 | … on stack-3 | … on stack-4 |
| `module-div-stack-n` | same depth as the `module-bg-stack-n` it sits on | divider on stack-1 | … on stack-2 | … on stack-3 | … on stack-4 |

`-sub` and `-div` keep secondary text at 3.0:1 and dividers at 1.07:1 against their own step, so the hierarchy reads the same at every depth. Adjacent modules use the generic `text-sub` and `divider`, as ASTRID does today, so there's no `module-sub-adjacent-n` yet. Add one only if a darker adjacent step ever drops below those ratios. A module never picks its own shade: it declares its depth (the `defineModule` seam) and reads the matching token.

### The surprise fill (runtime)

A tap on the sparkle fills the slots with a random bright colour:

- hue at least 60° from the previous fill
- saturation 85–100%
- lightness 50–60%

The label on it is `#242424` (`label-on-fill-dark`, the ink grey) or white (`label-on-fill-light`), whichever has the higher WCAG contrast, and the lightness is nudged until the label clears 4.5:1. These numbers live in `tokens.json` under `constants`. The maths is the pure functions in `src/color.js` (`surpriseColor`, `labelColorFor`, `slotColors`, `surpriseFillStyle`). ASTRID re-exports them, so there is one implementation.

### Where a literal is still allowed

1. **Media and container queries.** CSS can't read variables there. The value must equal a `breakpoint.*` token, and the lint checks it.
2. **Primitive-owned geometry.** The inner shape of one control (an arrow offset, a star's 28×26 box, a grid's column widths) lives inside that primitive, not in a module.
3. **Canvas, WebGL, Leaflet, Recharts.** These can't read CSS variables. They import the resolved value: `import { semantic as nc, component } from '@netcomposer/nc-ui/tokens'` → `ctx.strokeStyle = nc.accent`, `stroke={nc['filter-lowpass']}`. Still one source, but it takes a rebuild.
4. **Static files the OS reads before CSS** (the PWA manifest and the theme-color meta). This is an open question: inject them from the tokens at build time, or lint them.

### Proof it works

On ASTRID's `feat/nc-ui-tokens` branch, changing one base value in tokens.json and rebuilding changed every module, with nothing else edited:

- `color.ink` → `#E0218A`: Keyboard, VCO, VCF, VCA, Hacks and each hack card changed at desktop, 390 and 360.
- `font-family.sans` → Georgia: the same set changed.
- `color.accent` → `#E0218A`: every accent use changed, including the VCO wavetable canvas, which reads the token from JS.

Putting the original value back rebuilds a byte-identical bundle. Per-module element and pixel counts are in the ASTRID branch's proof report.

## 3. Adding or changing a token

1. Edit `tokens/tokens.json`. Base values go under `base.<group>`, generic roles under `semantic`, domain roles under `component.<domain>`, each with a `ref`.
2. `npm run build` regenerates `dist/tokens.css`, `dist/tokens.js`, `dist/tokens.d.ts`, `dist/tokens.resolved.json` and `src/tokens.ts`. Never edit those by hand: `npm test` fails if they are stale.
3. A change to a value is a visible change. Run the screenshot check (desktop, 390, 360) against ASTRID and Rhythm, and say which modules change in the PR.
4. Semver: a new token is a minor release; renaming or removing one is a major release; a changed value is a minor release with a CHANGELOG line saying what looks different.
