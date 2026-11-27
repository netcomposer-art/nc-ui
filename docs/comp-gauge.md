# Compressor gauge

Peter, 2026-11-27: "a smart level gauge on every compressor hack. Use the classic approach to displaying input,
compression level, output etc. Use bar graphs not anything analog-ish." He picked option B (three rows).

- **Rows:** IN, GR, OUT. IN and OUT on the dBFS scale (−48 to 0, the strips' and the fx header meter's), the ticks
  under them; GR (gain reduction) on its own 0 to −24 dB, filling from the right like a console's.
- **Marks:** the threshold as a tick on IN; a peak hold on each row (motion-meter-hold, 1.5 s), then it follows the
  bar down; the number at the end of each row is the held peak ("−6.2", "−7.0 dB", "—" below the scale).
- **Colours:** IN and OUT in ink; the hot colour (fx-level-hot) within 1 dB of full scale; GR, its number and the
  threshold tick in `--nc-gauge-gr`, which each app sets to its instrument colour (nc-ui's accent without one). No new
  accent colour.
- **Off:** IN keeps moving (what reaches the compressor); GR and OUT rest, grey.
- **Cost:** open only while on screen and the page is visible; about 30 frames a second while sound flows, 4 a second
  after a while of silence (as fx-level).

## Use

An FX card with `meter` and `gauge`:

```js
{ type: "fx", id: "compressor-1", title: "Compressor", on, meter: fxMeter(fx, "compressor-1"),
  gauge: { threshold: () => dials.threshold_db, help: "…" }, controls: [...] }
```

The meter's `read()` gives `{ in, out, gr }`: sample peaks (1 = full scale) and the most gain reduction since the last
read in dB (nc-fx ≥ comp-gauge reports it per effect). `primitives/comp-gauge.js` has no imports, so an app that
vendors only that file (ASTRID's React Hacks panel) can draw the same gauge with `createCompGauge` / `bindCompGauge`.
