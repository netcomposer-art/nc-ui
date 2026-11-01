# EQ graph and FX card maximize

An EQ's frequency graph at the top of its FX card, and a maximize button that widens the card so the graph is easy to
see. First users: the Studio Mix's channel inserts and LUCY's Hacks (Peter, 2026-11-01: "a real-time visualizer at the
top of the module that shows the frequency cuts and boosts ... a 'maximize' button that expands the width of the EQ to
three module widths ... make it beautiful like FabFilter").

## API

```ts
{
  type: "eqGraph",
  id: "hack-bass-eq-1-graph",
  range: 18,                                   // dB each way
  on: true,                                    // false: the curve and nodes go quiet (text-sub)
  bands: [                                     // engine units
    { id: "low", label: "Low", kind: "lowshelf", hz: 150, db: 3, q: 0.71 },
    { id: "mid", label: "Mid", kind: "peak", hz: 938, db: -18, q: 0.3, moveHz: true, moveQ: true,
      minHz: 200, maxHz: 5000, minQ: 0.3, maxQ: 6, valueText: "−18 dB at 938 Hz, Q 0.3", help: "…" },
    { id: "high", label: "High", kind: "highshelf", hz: 6000, db: -18, q: 0.71 },
  ],
  response: (freqs) => ({ total, bands }),     // dB at each frequency: the sum and each band's own
  spectrum: { open: () => analyser, close() {} }, // optional; opened only while the graph is on screen
  onBand: (id, { hz, db, q }) => {},           // route through the sliders' own setters
  onReset: (id) => {},
  help: "…",
}
```

nc-fx builds the whole control from a chain: `eqGraph(fx, "eq-1", { id, set: (key, value) => …, help })`. Its
`response()` is the engine's own coefficients (tested against the engine's impulse response within 0.1 dB), its
`spectrum` a shared analyser on the chain's output, and `onBand` / `onReset` call `set` with dial values, so the
sliders, undo, saves and presets see exactly what a slider move would make.

## Drawing

- Plot: `eq-graph-bg` with a hairline frame, `eq-graph-height` (112 px; 248 px maximized). Hairline grid at each
  decade's 1-9 multiples (stronger at 100, 1k, 10k) and at ±6 / ±12 dB, the 0 dB line in `divider`; labels 100, 1k,
  10k along the bottom and +12, 0, −12 at the right edge, in the label font and `text-sub`.
- Spectrum (behind): `eq-spectrum`, a soft filled shape with a fine top edge; log-binned to one column per 2 px,
  tilted 4.5 dB/octave about 1 kHz, smoothed across neighbours, peaks falling 48 dB/s.
- Each band's own curve: a thin line in its colour (`eq-band-1..3`); the band in use also gets a faint fill.
- The sum: `eq-fill` between it and 0 dB, a wide faint underlay of the same colour (the glow), then the line in
  `eq-curve` (2 px).
- Nodes: an `eq-node-size` dot in the band's colour with a ring of the plot's colour, on its own curve at its
  frequency (a shelf is half its gain at its corner, so its dot rides the curve); a halo while hovered, focused or
  dragged, and a readout chip ("MID · −18 dB · 938 Hz · Q 0.3").
- Canvases repaint on a value, size or theme change (the module's redraw).

## Input

| | Every band | A band with `moveHz` / `moveQ` |
|---|---|---|
| Drag | up/down: gain (the dot follows the pointer) | across: frequency |
| Shift + drag | a quarter of the movement | |
| Arrow Up / Down | ±1 dB (Shift ±3) | |
| Arrow Left / Right | ∓/±1 dB on a shelf | frequency, a sixth of an octave (Shift: half) |
| Page Up / Down, wheel | | Q, ×1.25 per press; the wheel over the dot |
| Double-click, Delete, Backspace, Home | reset the band | |

Each node is `role="slider"` (`aria-valuenow` the gain, `aria-valuetext` the band's words, `aria-keyshortcuts`),
focusable, with a `target-min` hit area and the band's `help` as `data-nc-help`.

## Cost

One analyser per chain (shared by its graphs, connected only while a graph is open). While playing and on screen: one
`getFloatFrequencyData` (2048 bins) and one canvas fill per frame at ~30 fps, about 0.1-0.2 ms of main thread each;
the curve layer redraws only when a value, the size or the theme changes. Silent: 4 reads a second, no drawing. Off
screen, folded, in a hidden tab or removed: nothing, and the analyser is disconnected.

## Maximize

An `fx` card holding an `eqGraph` (or with `maximize: true`; `maximize: false` turns it off) gets a button after its
fold triangle: four corner ticks, turned inward while maximized; `aria-pressed`, "Maximize 1 · EQ" / "Restore 1 · EQ",
`maxHelp` for hover words.

- In a console row (`data-nc-max="row"`): the card spans three columns (`fx-card-width` × 3 when a card is folded).
- Elsewhere (`"over"`): a ghost keeps its place in its column, and the card opens over the modules three module widths
  wide (`overPanelBox`), anchored to its own column and kept inside the row, with a × in its header. Not modal:
  everything else keeps working.
- Phones (`"tall"`): the card stays put; the plot grows to `eq-graph-height-max`.
- Wide, the card is a grid: the header, graph and More across, the dials in columns.
- The button, the ×, or Escape restores it. The kit remembers it per card id for the page's life (a re-render or a
  rebuild keeps it, a reload forgets it). Folding the card restores it, and a folded card has no maximize.
