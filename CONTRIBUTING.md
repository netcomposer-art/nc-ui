# Contributing to nc-ui

Thanks for helping. nc-ui is the one place NetComposer's look is defined, so changes here change every module.

## Ground rules

- **Tokens only.** Never add a colour, font, size, spacing, duration or opacity to module code. Add or change a token in `tokens/tokens.json`. See [docs/design-rules.md](docs/design-rules.md).
- **Peter's UI rules:** ultra-minimal; hide rather than delete; no slider animation or transitions; rows stay on one line down to 360 px.
- **A changed value is a visible change.** Say which modules look different, and attach screenshots at desktop, iPhone 390 and iPhone 360 for ASTRID and Rhythm.
- **No new dependencies.** The build and tests run on plain Node ≥ 20.

## Workflow

1. Edit `tokens/tokens.json` (or `src/color.js`).
2. `npm run build`, then commit the regenerated files in `dist/` and `src/tokens.ts`.
3. `npm test` must pass.
4. Add a line to `CHANGELOG.md` under *Unreleased* (semver rules are at the top of that file).
5. Open a PR using the template and fill in the UI-parity checklist.

Merges need the maintainer's explicit OK. Nothing is published to npm without it.

## Credit

By contributing you agree your work is released under the MIT License. Add yourself to `AUTHORS` if you like. Please keep the "nc-ui was created by Peter Semmelhack" credit in README, NOTICE and file headers.
