# One live nc-ui for every module

**Goal (Peter):** one place to change colours, fonts, sizes and control styles, and every module follows.

## How it works

1. **One copy, served by the site.** netcomposer.art serves this package's `dist/` at `/nc-ui/` (`tools/pull-ui.mjs` in the site repo; `/nc-ui/BUILD.txt` names the nc-ui commit).
2. **Every app links it.** `ncUiLive()` from `@netcomposer/nc-ui/vite` adds `<link rel="stylesheet" href="/nc-ui/nc-ui.css" data-nc-ui-live>` last in `<head>`. All apps are on one origin (Studio iframes too), so they all read the same file.
3. **Bundled copies only fill in.** An app still bundles nc-ui, but inside `@layer nc-ui-fallback` (`dist/nc-ui.fallback.css`, and `installTheme()` for the JS-injected kit). An unlayered rule always beats a layered one, so the live sheet wins whatever the order; the bundled copy shows only if `/nc-ui/` is missing.
4. **Standalone dev looks the same.** `ncUiLive()` serves `/nc-ui/` from this package's `dist/` in `vite dev` and `vite preview`.

## Changing the look

Edit `tokens/tokens.json` (values) or `src/primitives/kit.js` (control styles) → `npm run build` → `npm test` → screenshots → merge → in the site repo `node tools/pull-ui.mjs --from <nc-ui clone>` → merge. Every module changes on its next page load. No app rebuilds.

## The contract this creates

- **Apps own structure; nc-ui owns the look.** App CSS may lay out its own surfaces (pattern editors) but never writes a raw colour, font or size; it reads `var(--nc-ui-*)`.
- **Kit CSS must stay compatible with the DOM the deployed apps render.** A kit change that needs new markup ships with the app PRs that render it. The kit's screenshot check covers every module.
- **Canvas reads tokens at paint time** (`readLive()`), not from a build-time import, so drawings follow a token change too.
