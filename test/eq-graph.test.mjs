// The EQ graph (eq-graph.js) and the FX card's maximize (controls.js): nodes, keys, drags, wheel and resets reach the
// host's setters; maximize and restore; the spectrum loop only holds its analyser while it should.
import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { document, window } = installDom();
const { renderControl, patchControl } = await import("../src/primitives/controls.js");
const {
  eqX, eqHz, eqY, eqDb, eqKeyPatch, eqDragPatch, hzText, spectrumColumns, columnLevel, eqSpectrumState,
} = await import("../src/primitives/eq-graph.js");
const { kitCss } = await import("../src/primitives/kit.js");

const bands = (mid = { hz: 938, db: -18, q: 0.3 }) => [
  { id: "low", label: "Low", kind: "lowshelf", hz: 150, db: 3, q: 0.71, minHz: 150, maxHz: 150, help: "lows" },
  { id: "mid", label: "Mid", kind: "peak", ...mid, moveHz: true, moveQ: true, minHz: 200, maxHz: 5000, minQ: 0.3, maxQ: 6, valueText: "−18 dB at 938 Hz, Q 0.3" },
  { id: "high", label: "High", kind: "highshelf", hz: 6000, db: -18, q: 0.71, minHz: 6000, maxHz: 6000 },
];
function graph(log, extra = {}) {
  return {
    type: "eqGraph",
    id: "eq-g",
    label: "EQ curve",
    range: 18,
    bands: bands(),
    response: (f) => ({ total: new Float64Array(f.length), bands: [] }),
    onBand: (id, patch) => log.push(["band", id, patch]),
    onReset: (id) => log.push(["reset", id]),
    help: "The curve",
    ...extra,
  };
}
function card(log, extra = {}) {
  return {
    type: "fx",
    id: "hack-ch-eq-1",
    title: "1 · EQ",
    depth: 1,
    on: true,
    onToggle() {},
    folded: false,
    onFold: (f) => log.push(["fold", f]),
    controls: [graph(log), { type: "slider", id: "s-low", label: "Low", min: -18, max: 18, step: 1, value: 3, onChange() {} }],
    ...extra,
  };
}
const key = (el, k, shiftKey = false) => el.dispatchEvent(Object.assign(new window.Event("keydown", { bubbles: true, cancelable: true }), { key: k, shiftKey }));

test("axes: log frequency 20 Hz-20 kHz, gain to the range with a pad, both ways", () => {
  assert.equal(eqX(20, 600), 0);
  assert.equal(eqX(20000, 600), 600);
  assert.ok(Math.abs(eqX(632.4555, 600) - 300) < 0.01, "the geometric middle");
  assert.ok(Math.abs(eqHz(eqX(938, 500), 500) - 938) < 1e-6);
  assert.equal(eqY(0, 100, 18, 8), 50);
  assert.equal(eqY(18, 100, 18, 8), 8);
  assert.equal(eqY(-40, 100, 18, 8), 92, "clamped");
  assert.ok(Math.abs(eqDb(eqY(-7, 120, 18, 8), 120, 18, 8) + 7) < 1e-9);
  assert.equal(hzText(938), "938 Hz");
  assert.equal(hzText(1500), "1.5 kHz");
  assert.equal(hzText(12000), "12 kHz");
});

test("keys: up/down gain, left/right frequency (gain on a shelf), page up/down Q, Delete resets", () => {
  const [low, mid] = bands();
  assert.deepEqual(eqKeyPatch(mid, "ArrowUp", false, 18), { db: -17 });
  assert.deepEqual(eqKeyPatch(mid, "ArrowDown", true, 18), { db: -18 }, "clamped");
  assert.ok(Math.abs(eqKeyPatch(mid, "ArrowRight", false, 18).hz - 938 * 2 ** (1 / 6)) < 1e-9);
  assert.equal(eqKeyPatch(mid, "ArrowLeft", false, 18).hz, 938 * 2 ** (-1 / 6));
  assert.ok(Math.abs(eqKeyPatch(mid, "PageUp", false, 18).q - 0.375) < 1e-9);
  assert.equal(eqKeyPatch(mid, "PageDown", false, 18).q, 0.3, "clamped to minQ");
  assert.deepEqual(eqKeyPatch(low, "ArrowRight", false, 18), { db: 4 });
  assert.equal(eqKeyPatch(low, "PageUp", false, 18), null);
  assert.equal(eqKeyPatch(low, "Delete", false, 18), "reset");
  assert.equal(eqKeyPatch(low, "a", false, 18), null);
});

test("drags: relative to the start; across moves frequency only on a band that has one; Shift is fine", () => {
  const [low, mid] = bands();
  const p = eqDragPatch(mid, { hz: 938, db: -18 }, 100, -42, 600, 100, 18, 8, false);
  assert.ok(Math.abs(p.db - 0) < 1e-9, "42 px up of a 42 px half is +18 dB");
  assert.ok(Math.abs(p.hz - 938 * 1000 ** (100 / 600)) < 1e-6);
  const fine = eqDragPatch(mid, { hz: 938, db: -18 }, 0, -42, 600, 100, 18, 8, true);
  assert.ok(Math.abs(fine.db + 13.5) < 1e-9);
  const shelf = eqDragPatch(low, { hz: 150, db: 3 }, 300, 0, 600, 100, 18, 8, false);
  assert.deepEqual(shelf, { db: 3 });
  assert.equal(eqDragPatch(mid, { hz: 938, db: 0 }, 2000, 0, 600, 100, 18, 8, false).hz, 5000, "clamped to maxHz");
});

test("the graph in an EQ card: at the top, one focusable slider per band, help words; keys, wheel, double-click", () => {
  const log = [];
  let control = card(log);
  const lookup = () => control;
  const el = renderControl(control, (n) => {
    const id = n.closest?.("[data-nc-id]")?.getAttribute("data-nc-id");
    return id === "eq-g" ? control.controls[0] : id === control.id ? control : undefined;
  });
  void lookup;
  document.body.append(el);
  const g = el.querySelector(".nc-eq");
  assert.ok(g, "the graph is in the card");
  assert.equal(el.querySelector(":scope > .nc-ui-fx-hd").nextElementSibling, g, "first, under the header");
  assert.equal(g.getAttribute("role"), "group");
  assert.equal(g.getAttribute("aria-label"), "EQ curve");
  assert.equal(g.getAttribute("data-nc-help"), "The curve");
  const nodes = [...g.querySelectorAll(".nc-eq-node")];
  assert.deepEqual(nodes.map((n) => n.dataset.band), ["low", "mid", "high"]);
  assert.deepEqual(nodes.map((n) => n.dataset.tone), ["1", "2", "3"]);
  for (const n of nodes) {
    assert.equal(n.getAttribute("role"), "slider");
    assert.equal(n.getAttribute("tabindex"), "0");
    assert.equal(n.getAttribute("aria-valuemin"), "-18");
  }
  assert.equal(nodes[1].getAttribute("aria-label"), "Mid band");
  assert.equal(nodes[1].getAttribute("aria-valuetext"), "−18 dB at 938 Hz, Q 0.3");
  assert.equal(nodes[1].getAttribute("aria-valuenow"), "-18");
  assert.equal(nodes[0].getAttribute("data-nc-help"), "lows");
  key(nodes[1], "ArrowUp");
  key(nodes[1], "PageUp");
  key(nodes[0], "Backspace");
  nodes[2].dispatchEvent(new window.Event("dblclick", { bubbles: true }));
  const wheel = Object.assign(new window.Event("wheel", { bubbles: true, cancelable: true }), { deltaY: -240, deltaMode: 0, timeStamp: 1 });
  nodes[1].dispatchEvent(wheel);
  const wheelOnShelf = Object.assign(new window.Event("wheel", { bubbles: true, cancelable: true }), { deltaY: -240, deltaMode: 0, timeStamp: 2 });
  nodes[0].dispatchEvent(wheelOnShelf);
  assert.equal(wheelOnShelf.defaultPrevented, false, "a shelf has no Q: the page scrolls");
  assert.deepEqual(log.slice(0, 4), [["band", "mid", { db: -17 }], ["band", "mid", { q: 0.375 }], ["reset", "low"], ["reset", "high"]]);
  assert.equal(log[4][0], "band");
  assert.ok(Math.abs(log[4][2].q - 0.6) < 1e-9, "one wheel notch up doubles Q");
  // A patch from the host moves the nodes' values (same elements, focus kept).
  control = { ...control, controls: [{ ...control.controls[0], bands: bands({ hz: 2000, db: 6, q: 1 }) }, control.controls[1]] };
  patchControl(el, control);
  assert.equal(g.querySelectorAll(".nc-eq-node")[1], nodes[1]);
  assert.equal(nodes[1].getAttribute("aria-valuenow"), "6");
  // Off: the graph says so (the kit greys its nodes).
  patchControl(el, { ...control, controls: [{ ...control.controls[0], on: false }, control.controls[1]] });
  assert.equal(g.dataset.on, "false");
  el.remove();
});

test("maximize: in the header after the fold triangle; row in a console, over elsewhere; Escape and × restore; folding restores", async () => {
  const log = [];
  let control = card(log);
  const lookup = (n) => {
    const id = n.closest?.("[data-nc-id]")?.getAttribute("data-nc-id");
    return id === "eq-g" ? control.controls[0] : id === control.id ? control : undefined;
  };
  // In a console's fx area.
  const body = document.createElement("div");
  body.dataset.ncLayout = "console";
  const area = document.createElement("div");
  area.dataset.ncArea = "fx";
  body.append(area);
  document.body.append(body);
  const el = renderControl(control, lookup);
  area.append(el);
  const head = el.querySelector(":scope > .nc-ui-fx-hd");
  const max = head.querySelector("[data-nc-fx-max]");
  assert.ok(max);
  assert.equal(max.previousElementSibling, head.querySelector("[data-nc-fx-hide]"), "after the fold triangle");
  assert.equal(max.getAttribute("aria-pressed"), "false");
  assert.equal(max.getAttribute("aria-label"), "Maximize 1 · EQ");
  click(max);
  assert.equal(el.dataset.ncMax, "row");
  assert.equal(max.getAttribute("aria-pressed"), "true");
  assert.equal(max.getAttribute("aria-label"), "Restore 1 · EQ");
  // A re-render keeps it (the kit remembers it by id for the page's life).
  const again = renderControl(control, lookup);
  el.replaceWith(again);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(again.dataset.ncMax, "row");
  // Escape restores.
  document.dispatchEvent(Object.assign(new window.Event("keydown", { bubbles: true, cancelable: true }), { key: "Escape" }));
  assert.equal(again.dataset.ncMax, undefined);
  // Elsewhere (a Hacks column): a panel over the modules, with a ghost keeping its place and a ×.
  const module = document.createElement("section");
  module.className = "nc nc-module";
  const row = document.createElement("div");
  row.append(module);
  document.body.append(row);
  module.append(again);
  click(again.querySelector("[data-nc-fx-max]"));
  assert.equal(again.dataset.ncMax, "over");
  assert.ok(again.previousElementSibling?.classList.contains("nc-fx-ghost"));
  assert.equal(again.getAttribute("role"), "region");
  const close = again.querySelector(".nc-fx-close");
  assert.equal(close.getAttribute("aria-label"), "Close 1 · EQ");
  click(close);
  assert.equal(again.dataset.ncMax, undefined);
  assert.ok(!module.querySelector(".nc-fx-ghost"), "no ghost");
  assert.ok(!again.querySelector(".nc-fx-close"), "no ×");
  // Folding a maximized card restores it, and a folded card has no maximize.
  click(again.querySelector("[data-nc-fx-max]"));
  assert.equal(again.dataset.ncMax, "over");
  control = { ...control, folded: true };
  patchControl(again, control);
  assert.equal(again.dataset.ncMax, undefined);
  assert.equal(again.querySelector("[data-nc-fx-max]").hidden, true);
  // A card without a graph has no maximize unless asked.
  const plain = renderControl({ type: "fx", id: "p", title: "Drive", depth: 1, on: true, controls: [] }, () => undefined);
  assert.ok(!plain.querySelector("[data-nc-fx-max]"));
  const asked = renderControl({ type: "fx", id: "p2", title: "Drive", depth: 1, on: true, maximize: true, controls: [] }, () => undefined);
  assert.ok(asked.querySelector("[data-nc-fx-max]"));
  row.remove();
  body.remove();
});

test("spectrum: columns span the bins (interpolated below one bin), tilt 4.5 dB/oct about 1 kHz", () => {
  const m = spectrumColumns(300, 600, 2048, 48000);
  assert.equal(m.lo.length, 300);
  assert.ok(Math.abs(m.tilt[0] - 4.5 * Math.log2(20 / 1000)) < 1e-4);
  for (let i = 1; i < 300; i++) assert.ok(m.lo[i] >= m.lo[i - 1] && m.hi[i] >= m.lo[i]);
  const buf = Float32Array.from({ length: 8 }, (_, i) => -10 * i);
  assert.equal(columnLevel(buf, 2.5, 2.7), -25, "between bins 2 and 3");
  assert.equal(columnLevel(buf, 1.2, 5.6), -10, "the loudest bin it spans");
});

test("spectrum loop: opens the analyser while on screen, gives it back when the graph leaves", async () => {
  const log = [];
  const analyser = { frequencyBinCount: 64, context: { sampleRate: 48000 }, getFloatFrequencyData: (b) => b.fill(-30) };
  const spectrum = { open: () => (log.push("open"), analyser), close: () => log.push("close") };
  const control = graph(log, { spectrum });
  const el = renderControl(control, () => control);
  assert.deepEqual(log, [], "not on screen yet");
  document.body.append(el);
  patchControl(el, control);
  assert.deepEqual(log, ["open"]);
  assert.equal(eqSpectrumState(el).open, true);
  assert.equal(eqSpectrumState(el).running, true);
  el.remove();
  await new Promise((r) => setTimeout(r, 300));
  assert.deepEqual(log, ["open", "close"]);
  assert.equal(eqSpectrumState(el).open, false);
  assert.equal(eqSpectrumState(el).running, false);
});

test("kit sheet: tokens only; the maximized card spans three console columns", () => {
  const css = kitCss();
  assert.match(css, /\.nc-eq-plot \{[^}]*height: var\(--nc-ui-eq-graph-height\)/);
  assert.match(css, /\.nc-ui-fx\[data-nc-max\] \.nc-eq-plot \{ height: var\(--nc-ui-eq-graph-height-max\); \}/);
  assert.match(css, /\[data-nc-area="fx"\] > \.nc-ui-fx\[data-nc-max="row"\] \{ grid-column: span 3; \}/);
  assert.match(css, /width: calc\(var\(--nc-ui-fx-card-width\) \* 3\)/);
  assert.match(css, /\.nc-eq-node\[data-tone="2"\] \{ --nc-eq-tone: var\(--nc-ui-eq-band-2\); \}/);
  const eqRules = css.slice(css.indexOf(".nc-eq {"), css.indexOf(".nc-fx-ghost"));
  assert.doesNotMatch(eqRules, /#[0-9a-f]{3,8}\b|rgba?\(/i, "no raw colours");
});

test("over panel: three module widths from its column, kept inside the row", async () => {
  const { overPanelBox } = await import("../src/primitives/eq-graph.js");
  const r = (left, top, width) => ({ left, top, width, right: left + width });
  // Hacks is the last of four 300 px columns (16 px gaps): the panel ends at the row's right edge.
  assert.deepEqual(overPanelBox(r(948, 200, 300), r(948, 100, 300), r(0, 0, 1248), 16, 2000), { left: -633, top: 100, width: 932 });
  // A first column: it opens to the right from its own left.
  assert.deepEqual(overPanelBox(r(0, 50, 300), r(0, 0, 300), r(0, 0, 1248), 16, 2000), { left: 1, top: 50, width: 932 });
  // A narrow row: never wider than the row.
  assert.equal(overPanelBox(r(0, 0, 300), r(0, 0, 300), r(0, 0, 600), 16, 2000).width, 598);
});
