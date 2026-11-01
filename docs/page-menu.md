# Page menu (phones)

Peter, 2026-11-01 (iPhone, the Studio at 390 px): "On mobile put the top menu choices in a hamburger".

`pageMenu({ panel, button?, label?, media? })` (src/primitives/page-menu.js, exported from the index and as
`@netcomposer/nc-ui/page-menu`; no imports, so an app can vendor the file alone) puts a page header's text actions
behind a ☰ button on phones (`PAGE_MENU_PHONE`, the kit's `(max-width: 768px)`). Wider screens are unchanged.

## Markup

Wrap the actions that fold away in one element (the panel) and keep everything else where it is:

```js
const panel = h("div", {}, master, save, load);          // folds away on phones
const menu = pageMenu({ panel });
actions.append(panel, panic, menu.button, fileInput);   // Panic stays in the header; the ☰ at the right end
```

- Wider than a phone the panel is `display: contents`: its children lay out in the header exactly as before, and the
  ☰ is hidden.
- On a phone the header is one row: the title at the left (cut with an ellipsis only if it must be), then what the
  app kept outside the panel, then the ☰ (a `target-min` square, the bars' right edge on the page gutter). Open, the
  panel is a flat list under the header's divider, edge to edge, over the page (no layout shift): `surface-page`, a
  hairline under it, each button a full-width `target-min` row with the same label. Light and dark come from the
  tokens.
- Panic stays outside the menu, one tap away: a performer reaching for it should never have to open a menu first.

## Behaviour

- The ☰ is a real button: `aria-label="Menu"` (or `label`), `aria-expanded`, `aria-controls` naming the panel.
- Opening moves the focus to the first item. A click on a button in the panel runs it, then closes the menu (mark a
  button `data-nc-menu-stay` to keep it open; sliders and fields never close it). Escape closes it and is taken, so
  an instrument's Escape-is-Panic does not also fire. A press outside closes it. The focus goes back to the ☰ when it
  was in the panel.
- Growing past the phone breakpoint closes it.
- `destroy()` closes it and removes the listeners (a React effect's cleanup).

## Phones in landscape

Not part of the menu, but the same pass (Peter, 2026-11-01): on a short, wide screen
(`(orientation: landscape) and (max-height: 500px) and (max-width: 1023px)`) an `adjacent` module stack is a grid of
as many columns as fit at two `module-slim-column`s wide (two or three on a phone), each module at its own height, in
reading order; a lead module (a step grid) spans two columns.

Inside the Studio an instrument's frame is as tall as its page, so its own media query never reads as landscape. The
Studio mirrors `LANDSCAPE_PHONE` (exported) onto each frame's `<html>` as `data-nc-landscape`, and the kit applies the
same grid under `html[data-nc-landscape]` (below 1024 px).

