import assert from "node:assert/strict";
import { test } from "node:test";
import { padWavePath } from "../src/primitives/pads.js";

test("pad waveform: an area path in a 100 × 20 box, down-sampled to at most 48 columns", () => {
  assert.equal(padWavePath([]), "");
  const flat = padWavePath([-0.5, 0.5, -0.5, 0.5]);
  assert.match(flat, /^M0\.0 5\.00L100\.0 5\.00L100\.0 15\.00L0\.0 15\.00Z$/);
  const many = Array.from({ length: 400 }, (_, i) => (i % 2 ? 1 : -1));
  assert.equal(padWavePath(many).split("L").length, 96);
});

test("rename opens only from a double-click on the pad's name, not anywhere on the pad", async () => {
  const { parseHTML } = await import("linkedom");
  const { document, window } = parseHTML("<html><body></body></html>");
  const saved = { document: globalThis.document, window: globalThis.window, HTMLButtonElement: globalThis.HTMLButtonElement, HTMLElement: globalThis.HTMLElement, Element: globalThis.Element };
  Object.assign(globalThis, { document, window, HTMLButtonElement: window.HTMLButtonElement, HTMLElement: window.HTMLElement, Element: window.Element });
  try {
    // linkedom's inputs have no focus()/select(); the rename field calls both.
    window.HTMLElement.prototype.focus ??= () => {};
    window.HTMLInputElement.prototype.select ??= () => {};
    const { renderPadGrid } = await import("../src/primitives/pads.js");
    const control = {
      type: "padGrid",
      id: "pads",
      pads: [{ name: "Master grab", peaks: [0.2, -0.2] }],
      onRename: () => {},
    };
    const wrap = renderPadGrid(control, () => control);
    document.body.append(wrap);
    const pad = wrap.querySelector(".nc-padgrid-pad");
    const dbl = (el) => el.dispatchEvent(new window.Event("dblclick", { bubbles: true }));
    dbl(pad.querySelector(".nc-padgrid-pad-wave"));
    assert.equal(wrap.querySelector(".nc-padgrid-rename"), null, "a double-click on the wave doesn't rename");
    dbl(pad);
    assert.equal(wrap.querySelector(".nc-padgrid-rename"), null, "nor on the pad itself");
    dbl(pad.querySelector(".nc-padgrid-pad-name"));
    assert.ok(wrap.querySelector(".nc-padgrid-rename"), "a double-click on the name renames");
  } finally {
    Object.assign(globalThis, saved);
  }
});
