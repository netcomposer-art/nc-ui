# AGENTS.md: nc-ui

For AI agents (and people) working in this repo. [CONTRIBUTING.md](CONTRIBUTING.md) and
[docs/design-rules.md](docs/design-rules.md) have the detail; this does not override them.

## What this is

`@netcomposer/nc-ui`: NetComposer's design language. One set of tokens (colours, fonts, sizes, spacing, shading,
motion) and the module kit (modules, sliders, knobs, FX cards, console strips, meters, the EQ graph, dialogs) that
every NetComposer app reads. The live copy is served at https://netcomposer.art/nc-ui/, so a published change
reaches every module on its next load. MIT; created by Peter Semmelhack (keep that credit).

## Commands

```sh
npm ci
npm run build   # tokens/tokens.json -> dist/tokens.* and src/tokens.ts, then dist/nc-ui.* (the kit)
npm run lint    # lint:ui: no green, no opacity dimming, no literal 44px, no foreign domain tokens
npm test        # generated files current, lint, tokens, contrast (light and dark), components (linkedom), dist
```

CI runs `npm ci`, `npm run lint`, `npm test`, then `git diff --exit-code` (generated files must be committed).

## Rules

- **Tokens only.** Never put a colour, font, size, spacing, duration or opacity in kit or app code: add or change
  a token in `tokens/tokens.json` and use it through `v("name")` / `var(--nc-ui-name)`.
- **Colour rule (Peter):** accent colours come only from the instrument title colours: ASTRID #EB512E,
  PETRA #5AC4F7, OLIVE #9CA536, LUCY #9B30FF, NYX #FEAA02. Any other accent: stop and ask Peter. No green.
- **Every colour has a dark value**, and contrast pairs are tested (`test/contrast.test.mjs`, `test/dark.test.mjs`).
- **Never edit generated files** (`dist/`, `src/tokens.ts`): edit the source and run `npm run build`.
- **Peter's UI rules:** ultra-minimal; hide rather than delete; no slider animation; rows stay on one line down to
  360 px; ASTRID is the north star.
- **A changed value is a visible change:** say which modules look different in `CHANGELOG.md` (Unreleased).
- **No new dependencies.** Plain Node 20+.
- **Copy:** short plain sentences.
- **Vendoring:** apps vendor `src/`, `dist/`, `scripts/` and `package.json` into `vendor/nc-ui/` with a
  `VENDORED_FROM` line; the live sheet comes from netcomposer.art/nc-ui/ (the site's `tools/pull-ui.mjs`). Don't edit
  a vendored copy.
- Commits and PRs need no attribution lines.

## Plugins

Insert plugins (new effects for the Studio's Mix) are not written here: their card is drawn from their manifest by
the kit's `fx` card. See nc-fx's [docs/plugins.md](https://github.com/netcomposer-art/nc-fx/blob/main/docs/plugins.md)
and [netcomposer-art/nc-plugin-template](https://github.com/netcomposer-art/nc-plugin-template). The kit pieces they
use: `select` option `group` (Add › Plugins), `note` `tone: "danger"`, and `ask()` (Load plugin from URL).

## Where to ask

Open an issue on [netcomposer-art/nc-ui](https://github.com/netcomposer-art/nc-ui/issues). Peter Semmelhack decides
design questions; merges need his OK.
