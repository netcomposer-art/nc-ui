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

test("a filled pad shows its hint under the name (and says it); an empty pad keeps Load and tap or drop", async () => {
  const { parseHTML } = await import("linkedom");
  const { document, window } = parseHTML("<html><body></body></html>");
  const saved = { document: globalThis.document, window: globalThis.window, HTMLButtonElement: globalThis.HTMLButtonElement, HTMLElement: globalThis.HTMLElement, Element: globalThis.Element };
  Object.assign(globalThis, { document, window, HTMLButtonElement: window.HTMLButtonElement, HTMLElement: window.HTMLElement, Element: window.Element });
  try {
    const { renderPadGrid, patchPadGrid } = await import("../src/primitives/pads.js");
    const control = {
      type: "padGrid",
      id: "pads",
      pads: [
        { label: "Rhodes C3", empty: false, peaks: [0.2, -0.2], hint: "tuned · CALLIOPE" },
        { label: "", empty: true },
        { label: "Kick", empty: false, peaks: [0.2, -0.2] },
      ],
    };
    const wrap = renderPadGrid(control, () => control);
    patchPadGrid(wrap, control);
    const pads = wrap.querySelectorAll(".nc-padgrid-pad");
    assert.equal(pads[0].querySelector(".nc-padgrid-pad-hint").textContent, "tuned · CALLIOPE");
    assert.equal(pads[0].dataset.hint, "true");
    assert.match(pads[0].getAttribute("aria-label"), /Rhodes C3, tuned · CALLIOPE/);
    assert.equal(pads[1].querySelector(".nc-padgrid-pad-hint").textContent, "tap or drop");
    assert.equal(pads[1].dataset.hint, undefined);
    assert.equal(pads[2].querySelector(".nc-padgrid-pad-hint").textContent, "");
    assert.equal(pads[2].dataset.hint, undefined);
    control.pads[0] = { ...control.pads[0], hint: undefined };
    patchPadGrid(wrap, control);
    assert.equal(pads[0].dataset.hint, undefined, "the hint goes when the host drops it");
  } finally {
    Object.assign(globalThis, saved);
  }
});

test("a pad's menu stays on screen: down with room, up near the bottom, inside the right edge", async () => {
  const { placePadMenu } = await import("../src/primitives/pads.js");
  const band = { top: 0, bottom: 800, left: 0, right: 1200 };
  const size = { w: 180, h: 200 };
  const pad = (left, top) => ({ left, top, right: left + 100, bottom: top + 80 });
  assert.deepEqual(placePadMenu(pad(100, 100), size, band), { left: 100, top: 182, up: false, maxHeight: null });
  const up = placePadMenu(pad(100, 600), size, band);
  assert.equal(up.up, true);
  assert.equal(up.top, 398, "up from the pad, a 2 px gap");
  assert.ok(placePadMenu(pad(1150, 100), size, band).left + size.w <= 1196, "clamped at the right edge");
  assert.equal(placePadMenu(pad(-50, 100), size, band).left, 4, "and the left");
  // Neither side has room: the roomier side, capped (it scrolls).
  const short = { top: 0, bottom: 300, left: 0, right: 400 };
  assert.deepEqual(placePadMenu(pad(10, 160), { w: 180, h: 400 }, short), { left: 10, top: 4, up: true, maxHeight: 154 });
  // In the Studio the band is the frame's part on screen: a pad near its bottom flips though the frame goes on.
  assert.equal(placePadMenu(pad(100, 1050), size, { top: 400, bottom: 1200, left: 0, right: 1200 }).up, true);
});

test("a pad's menu opens up from a pad near the bottom of the visible band (the Studio's --nc-host-*)", async () => {
  const { parseHTML } = await import("linkedom");
  const { document, window } = parseHTML("<html><body></body></html>");
  const saved = { document: globalThis.document, window: globalThis.window, HTMLButtonElement: globalThis.HTMLButtonElement, HTMLElement: globalThis.HTMLElement, Element: globalThis.Element };
  Object.assign(globalThis, { document, window, HTMLButtonElement: window.HTMLButtonElement, HTMLElement: window.HTMLElement, Element: window.Element });
  try {
    window.HTMLElement.prototype.focus ??= () => {};
    const { renderPadGrid, visibleBand } = await import("../src/primitives/pads.js");
    // A hosted frame: 3000 px tall, 400–1200 on screen.
    window.getComputedStyle = () => ({ getPropertyValue: (n) => (n === "--nc-host-top" ? "400px" : n === "--nc-host-height" ? "800px" : "") });
    assert.deepEqual(visibleBand(document), { top: 400, bottom: 1200, left: 0, right: document.documentElement.clientWidth || window.innerWidth || 0 });
    const control = {
      type: "padGrid",
      id: "pads",
      pads: [{ label: "Kick", empty: false, peaks: [0.2, -0.2] }],
      menu: () => [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      onMenu: () => {},
    };
    const wrap = renderPadGrid(control, () => control);
    document.body.append(wrap);
    const pad = wrap.querySelector(".nc-padgrid-pad");
    pad.getBoundingClientRect = () => ({ left: 10, top: 1100, right: 110, bottom: 1180, width: 100, height: 80 });
    wrap.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 3000, width: 400, height: 3000 });
    Object.defineProperty(window.HTMLElement.prototype, "offsetHeight", { configurable: true, get() { return this.classList?.contains("nc-slot-menu") ? 60 : 0; } });
    Object.defineProperty(window.HTMLElement.prototype, "offsetWidth", { configurable: true, get() { return this.classList?.contains("nc-slot-menu") ? 120 : 0; } });
    pad.dispatchEvent(new window.Event("contextmenu", { bubbles: true, cancelable: true }));
    const menu = wrap.querySelector(".nc-padgrid-pad-menu");
    assert.ok(menu, "the menu opens");
    assert.equal(menu.dataset.ncUp, "true");
    assert.equal(menu.style.top, `${1100 - 2 - 60}px`);
  } finally {
    Object.assign(globalThis, saved);
  }
});
