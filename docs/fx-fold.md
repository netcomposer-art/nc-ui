# Fold sideways (FX cards and console strips)

An FX card that folds into a narrow column, so a console row (the Studio's Mix) gives its width back to the
strips. First user: the Mix's A · Reverb, B · Delay and Insert · Drive (Peter, 2026-10-31).

## API

```ts
{
  type: "fx",
  id: "mix-a",
  title: "A · Reverb",
  depth: 1,
  on: true,
  onToggle: (on) => {},
  folded: false,                        // folded now; the host keeps it
  onFold: (folded) => {},               // the triangle or the folded column was pressed
  foldHelp: "Folds this effect away…",  // optional hover words (data-nc-help) on both buttons
  controls: [ /* … */ ],
}
```

The kit draws the fold; the host keeps the state and passes it back as `folded` (a UI preference, so keep it in
the browser, never in a document, scene or preset). Without `onFold` the card is unchanged. Folding is a patch on
`update()`, not a rebuild, so focus stays where it was.

## Behaviour

- The horizontal-fold toggle (`foldToggle()`, `.nc-fold-toggle[data-nc-fx-hide]`) sits after the card's ON/OFF: a
  small solid triangle in `text-sub` (ink on hover), ◀ while open ("collapse this way"), flipped to ▶ while folded
  ("expand"). `aria-expanded`, `aria-label` "Minimize A · Reverb" / "Expand A · Reverb"; a `target-min` pad on a
  coarse pointer. −/+ (`.nc-hide`) stays the vertical hide of modules: the triangle means fold sideways.
- Folded in a console row from 769 px: the card is `fx-fold-width` (120 px, the width of a hidden module's
  column) and is one `<button class="nc-ui-fx-fold" aria-expanded="false">`, labelled "Expand A · Reverb, on". It
  shows the on/off word (on: `text` with the `accent` hairline, as the switch draws it) and the name read bottom
  to top (`writing-mode: vertical-rl`, turned 180°, like the Studio's instrument spine). Click, Enter or Space
  unfolds it, and focus moves to the card's triangle. The column shows the ▶ at its top too.
- With any card folded the fx area becomes a row of its cards' own widths (`fx-card-width` open, `fx-fold-width`
  folded); on tablets (769-1023 px) the open cards share what is left of the full-width row.
- Everywhere else (phones, where the console stacks its cards; cards outside a console) a folded card keeps only
  its header row: name, ON/OFF and ▶.
- Folding never touches `on`: an effect that is on keeps sounding. Off still dims the folded column by colour.
- It folds and unfolds at once. Only the triangle's flip moves (`motion-press`); `prefers-reduced-motion` makes it
  instant.

## Classes

`.nc-ui-fx[data-nc-folded="true"]` › `button.nc-ui-fx-fold[data-on]` (`.nc-ui-fx-fold-state`,
`.nc-ui-fx-fold-name`), and `.nc-ui-fx-hd > .nc-fold-toggle[data-nc-fx-hide]` (› `.nc-fold-tri`).

## Strips (minimize a channel)

The console's channel strips use the same fold (Peter, 2026-10-31: "a way of both minimizing and deleting
channels"). Not on the master.

```ts
{
  type: "strip",
  /* … */
  onRemove: (opener) => {},             // the × (unchanged; the host confirms)
  folded: false,
  onFold: (folded) => {},
  foldHelp: "Minimizes this channel…",  // the triangle
  foldedHelp: "Bass, minimized…",       // the folded name (defaults to foldHelp)
}
```

- The fold triangle (`.nc-fold-toggle[data-nc-strip-hide]`, `aria-expanded`, "Minimize Bass" / "Expand Bass") sits in
  the strip's top-left corner, above the name. The name row and its × are unchanged, so a minimize click can't land
  on remove.
- Folded, the strip is `strip-fold-width` (40 px) on the same rows as the open strips, so meters still line up: the
  ▶ (centred over the column); M and S stacked (still working); then one button (`.nc-ui-fx-fold.nc-strip-fold`, "Expand Bass") holding a small
  mark in the fader cap's colour (`--nc-strip-cap`) and the name read bottom to top, beside a thin meter (bars
  `control-gap` wide). The button or the ▶ unfolds it (click, Enter or Space).
- Folding never touches the level, mute, solo or sends. No motion. On phones the strips still scroll sideways;
  folded ones are just narrower.
