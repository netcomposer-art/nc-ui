# FX level meter

A small level meter on every FX card (Peter, 2026-11-01: "For all the inserts add a small visual indicator (small bar
graph indicator?) that shows the amount of signal being 'seen' in the insert").

## What it shows

Two thin vertical bars just before the card's switch: what goes into the effect (left, `fx-level-in`) and what comes
out (right, `fx-level-out`). The scale is the Studio strips' −48 to 0 dBFS; the ballistics are theirs too (rises at
once, falls back over `motion-meter-fall`). The hot colour (`fx-level-hot`, ASTRID's title orange; accents start with the instrument title colours) shows only
from −1 dBFS and holds for `motion-meter-hold`.
A bypassed card keeps showing its input, dimmed by colour (`text-sub`). Folded in a console row, the column repeats the
meter at its foot (`fx-level-fold-length`) and it gives way when the column is too short. The meter has a fixed size,
so it never moves the header. It is decorative (`aria-hidden`); give `meterHelp` hover words that say what it shows.

## API

```ts
{
  type: "fx",
  id: "hack-bass-drive-1",
  title: "1 · Drive",
  meter: fxMeter(fx, "drive-1"),     // nc-fx; or any { open?(), close?(), read() }
  meterHelp: "Level: left what goes in, right what comes out",
  …
}
```

- `open()` is called when the meter comes on screen (an IntersectionObserver) and the page is visible; `false` means
  there is nothing to meter. `close()` when it leaves the screen, the page is hidden, the card goes, or `meter` changes
  to another object. Keep the object's identity stable across renders (nc-fx's `fxMeter` returns one per effect).
- `read()` returns the latest sample peaks, `{ in, out? }` (1 = full scale), or a bare number for input only (then
  one bar). It is called once a frame, about 30 a second, by one loop shared by every meter on the page; after
  1.2 s of silence the loop looks only 4 times a second, and it stops when no meter is on screen.

Hosts that draw their own cards (ASTRID's React Hacks panel) vendor `src/primitives/fx-level.js` alone (no imports):
`createFxLevel(document)` makes the element, `bindFxLevel(el, source)` drives it (`.set(source)`, `.destroy()`).
