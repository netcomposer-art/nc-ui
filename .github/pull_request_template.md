## What changes

<!-- One or two lines. Which tokens were added, changed, renamed or removed? -->

## Does anything look different?

- [ ] No visible change (refactor, new token nobody uses yet, docs)
- [ ] Yes. These modules look different: <!-- list them -->

## UI parity checklist

Screenshots before/after (or "identical" from the pixel diff) for each:

| | ASTRID | Rhythm |
|---|---|---|
| Desktop (1440) | [ ] | [ ] |
| iPhone 390 | [ ] | [ ] |
| iPhone 360 | [ ] | [ ] |

- [ ] Matches ASTRID
- [ ] Matches Rhythm
- [ ] Every row still fits on one line at 360 px
- [ ] No new slider animation or transition
- [ ] Hidden modules/controls are hidden, not deleted
- [ ] No colour, font or size literal outside `tokens/tokens.json`

## Checks

- [ ] `npm run build` run and generated files committed
- [ ] `npm test` passes
- [ ] CHANGELOG updated (semver: a new token is minor, a rename/removal is major, a changed value is minor with a note)
