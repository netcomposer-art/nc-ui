// A filter curve above the row it draws (Peter, 2026-11-07: "In Sampler, the filter slider belongs UNDER the
// graphic"): in an FX card, the row after the curve keeps a gap's distance from its 20 Hz / 20 kHz.
import assert from "node:assert/strict";
import { test } from "node:test";
import { installDom } from "./helpers/dom.mjs";

installDom();
const { renderControl } = await import("../src/primitives/controls.js");
const { kitCss } = await import("../src/primitives/kit.js");

test("the sheet: the row after a filter curve in an FX card gets module-gap above it", () => {
  const css = kitCss();
  assert.match(
    css,
    /\.nc-ui-fx > \.nc-field:has\(> \.nc-canvas\[data-nc-paint="filter"\]\) \+ \.nc-field \{ margin-top: var\(--nc-ui-module-gap/,
  );
});

test("Mode, Curve, Cutoff render in that order, the curve's field holding a filter canvas", () => {
  const el = renderControl({
    type: "fx",
    id: "hack-filter",
    title: "Filter",
    depth: 1,
    on: true,
    onToggle() {},
    controls: [
      // (linkedom has no select value: a slider stands in for Mode.)
      { type: "slider", id: "mode", label: "Mode", min: 0, max: 2, step: 1, value: 0, onChange() {} },
      { type: "canvas", id: "curve", label: "Curve", paint: "filter", mode: "lp", cutoff: 0.5, resonance: 0 },
      { type: "slider", id: "cutoff", label: "Cutoff", min: 0, max: 1, step: 0.01, value: 0.5, onChange() {} },
    ],
  });
  const rows = [...el.children].filter((c) => c.classList.contains("nc-field")).map((c) => c.dataset.ncId);
  assert.deepEqual(rows, ["mode", "curve", "cutoff"]);
  const curve = el.querySelector('.nc-field[data-nc-id="curve"]');
  assert.ok(curve.querySelector(':scope > .nc-canvas[data-nc-paint="filter"]'));
  assert.equal(curve.nextElementSibling?.dataset.ncId, "cutoff");
});
