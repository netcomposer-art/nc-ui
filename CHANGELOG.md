# Changelog

All notable changes to nc-ui are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/):

- a new token is a minor release
- renaming or removing a token is a major release
- changing a token's value is a minor release, with a note saying what looks different

## [Unreleased]

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
