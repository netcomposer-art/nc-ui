# nc-ui

nc-ui was created by [Peter Semmelhack](https://psem.me/).

> "This becomes a design language that everything uses to stay in sync with respect to UI... if we decide we want to change the font or the colors system wide, we do it in one place and all modules reference it."

nc-ui is the NetComposer design language: one set of **design tokens** (colours, fonts, type sizes, spacing, module shading, motion) that every NetComposer app and module reads. ASTRID, Rhythm, nc-clock and future modules all use it. `tokens/tokens.json` is the only place a font family, colour or size is defined: change a value there, run the build, and every module follows.

- **Three tiers.** *Base* tokens are raw values (palette, type scale, spacing scale, radii, durations). *Semantic* tokens name generic roles every app has (`module-bg-stack-2`, `readout-size`, `accent`, `label-on-fill-dark`). *Component* tokens name roles that belong to one domain, such as `--nc-synth-keybed-height` or `--nc-meaning-tension`. A module reads semantic tokens plus its own domain's component tokens, and never base tokens.
- **One source, three outputs.** `tokens.json` is compiled into `tokens.css` (CSS custom properties), a typed `tokens.ts` / `tokens.js` (for canvas, SVG and anything that can't read CSS), and `tokens.resolved.json`.
- **Runtime tokens.** The surprise fill: a random bright slot colour and the label colour that stays readable on it, computed by pure functions (`surpriseColor`, `labelColorFor`).
- **No dependencies.** The build and the tests run on plain Node ≥ 20.

Status: **0.1.0, not published.** Tokens extracted from ASTRID (psemmelhack/NetComposer-Synth) with a pixel-identical result. See [docs/token-inventory.md](docs/token-inventory.md) and the draft [docs/design-rules.md](docs/design-rules.md).

## Use

CSS (once, at the root of the app):

```css
@import '@netcomposer/nc-ui/tokens.css';

.my-module { background: var(--nc-ui-module-bg-adjacent-1); padding: var(--nc-ui-module-pad); }
.my-label  { font-size: var(--nc-ui-label-size); letter-spacing: var(--nc-ui-label-tracking); color: var(--nc-ui-text-sub); }
```

Tailwind v4: put token values in arbitrary classes (`text-[length:var(--nc-ui-font-size-xs)]`, `tracking-[var(--nc-ui-label-tracking)]`), and point the theme at the tokens in `@theme inline` (see ASTRID's `src/index.css` for the bridge).

JS / TS (canvas, SVG attributes, charts, maps):

```js
import { semantic as nc, component, cssVar, componentVar } from '@netcomposer/nc-ui/tokens';
ctx.strokeStyle = nc.accent;                          // '#003153'
path.setAttribute('stroke', nc['filter-lowpass']);            // shared filter curve
el.style.color = cssVar('text-sub');                  // 'var(--nc-ui-text-sub)'
el.style.height = `var(${componentVar('synth', 'keybed-height')})`; // --nc-synth-keybed-height
```

The surprise fill:

```js
import { surpriseColor, slotColors, surpriseFillStyle } from '@netcomposer/nc-ui/color';
const fill = surpriseColor(previousFill);    // HSL s 85–100 %, l 50–60 %, ≥ 60° from the last hue
const { ink, on, onInk } = slotColors(fill); // label is #242424 (ink) or white, ≥ 4.5:1
Object.assign(slots.style, surpriseFillStyle(fill)); // sets --nc-ui-surprise-*
```

## Develop

```sh
npm run build   # tokens.json → dist/tokens.{css,js,d.ts,resolved.json} + src/tokens.ts
npm test        # outputs current, CSS/TS in sync, contrast + surprise rules, ASTRID parity
npm run inventory -- --astrid ../NetComposer-Synth --base <commit>   # regenerate docs/token-inventory.md
```

Generated files are committed so consumers don't need a build step. `npm test` fails if they are stale.

## Layout

```
tokens/tokens.json        the single source (base, semantic, component domains, runtime, constants)
tokens/renames.json       old → new names for roles moved into component domains (0.1.0 pre-release)
scripts/build-tokens.mjs  compiler (plain node)
scripts/inventory.mjs     ASTRID usage → token map
dist/                     generated: tokens.css, tokens.js, tokens.d.ts, tokens.resolved.json
src/tokens.ts             generated typed tokens for TS consumers
src/color.js              contrast + surprise-fill maths (pure)
src/module/               seam: defineModule API (Petra)
src/primitives/           seam: control primitives (Petra)
test/                     node:test suites + ASTRID parity fixture
docs/                     design rules, token inventory, renames, domains/ (rhythm stub)
```

## Where the tooling plugs in

nc-ui 0.1.0 is the token layer only. Petra builds the parts that use it; these are the seams:

| piece | goes in | reads | contract |
|---|---|---|---|
| `defineModule` API | `src/module/` (export from `src/index.js`) | `semantic` from `dist/tokens.js`; shading through `module-bg-adjacent-n` / `module-bg-stack-n` + `module-sub-stack-n` / `module-div-stack-n` | A module declares its position (adjacent index or stack depth) and gets its shading vars. It never picks a colour. |
| Control primitives (slider, select, toggle, slot row, readout) | `src/primitives/` | semantic tokens only; their own internal geometry may stay literal | No transitions on sliders; one line down to 360 px; hide (not unmount) |
| Lint | `scripts/lint-tokens.mjs` (suggested), wired into `npm test` | `dist/tokens.resolved.json` (`domains[d].scope` maps files to domains) | Fail on a colour, font-family, px font-size, em tracking, duration or opacity literal outside `tokens/`, primitives' geometry and media queries. A media-query width must equal a `breakpoint.*` value. **Module contract:** semantic + own-domain component tokens only; a base token or another domain's `--nc-<domain>-*` is an error. The inventory's contract preview shows today's count. |
| Contract test | `test/contract.test.mjs` | `semantic`, `component`, `refs`, `componentRefs`, `domains` | Every semantic token resolves to a base token, and every component token to a base or semantic token (or an allowed fixed dimension); required roles exist; no module defines its own `--nc-ui-*` or `--nc-<domain>-*`. |
| Screenshot harness | `tools/screenshot/` | a consumer build | Desktop 1440, iPhone 390 and 360; deterministic (seeded `Math.random`, service worker bypassed); pixel diff against a baseline. The harness used for the ASTRID extraction is a starting point. |

## Credit

MIT licensed. If you fork or redistribute nc-ui, keep the credit line "nc-ui was created by Peter Semmelhack (https://psem.me/)" (see [NOTICE](NOTICE)).
