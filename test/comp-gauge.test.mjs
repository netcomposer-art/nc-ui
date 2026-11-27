// The compressor gauge (comp-gauge.js, controls.js; Peter, 2026-11-27, option B): IN, GR, OUT rows under the header of
// a card with `gauge`, the threshold tick, the numbers, GR from the right, off greys GR and OUT; the sheet's colours.
import assert from "node:assert/strict";
import { test } from "node:test";
import { installDom } from "./helpers/dom.mjs";

const { document } = installDom();
const { renderControl, patchControl } = await import("../src/primitives/controls.js");
const { attachCompGauge, gaugePosition, gaugeGrPosition, gaugeText, GAUGE_FLOOR_DB, GAUGE_GR_DB, COMP_GAUGE_CSS } = await import("../src/primitives/comp-gauge.js");


const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const amp = (db) => 10 ** (db / 20);
function card(extra = {}) {
  const src = { level: { in: amp(-6), out: amp(-0.5), gr: 7 }, opened: 0, open() { this.opened++; return true; }, close() {}, read() { return this.level; } };
  return {
    src,
    control: {
      type: "fx", id: "compressor-1", title: "Compressor", depth: 1, on: true, onToggle() {}, meter: src,
      gauge: { threshold: () => -18, help: "In, gain reduction, out" },
      controls: [{ type: "slider", id: "c-th", label: "Threshold", min: -60, max: 0, step: 1, value: -18, onChange() {} }],
      ...extra,
    },
  };
}

test("scales: IN and OUT −48..0 dBFS, GR 0..24 dB; numbers", () => {
  assert.equal(GAUGE_FLOOR_DB, -48);
  assert.equal(GAUGE_GR_DB, 24);
  assert.equal(gaugePosition(-48), 0);
  assert.equal(gaugePosition(-24), 0.5);
  assert.equal(gaugePosition(3), 1);
  assert.equal(gaugeGrPosition(6), 0.25);
  assert.equal(gaugeGrPosition(30), 1);
  assert.equal(gaugeText(-6.24), "−6.2");
  assert.equal(gaugeText(-Infinity), "—");
  assert.equal(gaugeText(7, true), "−7.0 dB");
  assert.equal(gaugeText(0, true), "0.0 dB");
});

test("a card with gauge: three rows under the header, a threshold tick, numbers, GR from the right; none without", async (t) => {
  const { control, src } = card();
  const el = renderControl(control, () => control);
  document.body.append(el);
  t.after(() => el.remove());
  const g = el.querySelector(":scope > .nc-comp-gauge");
  assert.ok(g, "the gauge");
  assert.equal(g.getAttribute("aria-hidden"), "true");
  assert.equal(g.previousElementSibling?.classList.contains("nc-ui-fx-hd"), true, "right under the header");
  assert.deepEqual([...g.querySelectorAll(".nc-comp-gauge-label")].map((l) => l.textContent), ["In", "GR", "Out"]);
  for (let i = 0; i < 20 && !src.opened; i++) await wait(20);
  await wait(120);
  assert.ok(src.opened > 0, "opened the meter");
  const vals = [...g.querySelectorAll(".nc-comp-gauge-val")].map((v) => v.textContent);
  assert.deepEqual(vals, ["−6.0", "−7.0 dB", "−0.5"]);
  const th = g.querySelector(".nc-comp-gauge-th");
  assert.equal(th.style.left, "62.5%");
  const grFill = g.querySelector('[data-nc-gauge="gr"] > .nc-comp-gauge-fill');
  assert.match(grFill.style.transform, /scaleX\(0\.29/);
  assert.equal(g.querySelector('[data-nc-gauge="out"]').dataset.hot, "true", "−0.5 dBFS is hot");
  // Off: GR and OUT rest.
  patchControl(el, { ...control, on: false });
  control.on = false;
  await wait(120);
  assert.equal(g.dataset.ncOff, "true");
  assert.equal(g.querySelectorAll(".nc-comp-gauge-val")[1].textContent, "0.0 dB");
  el.remove();
  const plain = renderControl({ ...card().control, gauge: undefined }, () => null);
  assert.equal(plain.querySelector(".nc-comp-gauge"), null);
});

test("sheet (its own, put in the page once): ink bars, the hot colour, GR and the tick in --nc-gauge-gr (nc-ui's accent without one), no radius", () => {
  const css = COMP_GAUGE_CSS;
  assert.ok(document.head.querySelector("style[data-nc-comp-gauge]"), "put in the page once");
  assert.match(css, /--nc-gauge-gr-color: var\(--nc-gauge-gr, var\(--nc-ui-accent\)\)/);
  assert.match(css, /\[data-nc-gauge="gr"\] > \.nc-comp-gauge-fill \{ transform-origin: right; background: var\(--nc-gauge-gr-color\); \}/);
  assert.match(css, /border-left: calc\(var\(--nc-ui-hairline\) \* 1\.5\) solid var\(--nc-gauge-gr-color\)/);
  const rules = css.split("\n").filter((l) => !l.startsWith("@container")).join("\n");
  assert.doesNotMatch(rules, /border-radius|#[0-9a-f]{3,8}\b|rgba?\(|\d+px/i, "tokens only, no radius");
});

test("attachCompGauge: after the header of a card from an older kit, once per card, again in a rebuilt one", (t) => {
  const make = () => {
    const card = document.createElement("div");
    card.className = "nc-ui-fx";
    const hd = document.createElement("div");
    hd.className = "nc-ui-fx-hd";
    card.append(hd, document.createElement("label"));
    document.body.append(card);
    return card;
  };
  const a = make();
  t.after(() => a.remove());
  const src = { open: () => true, close() {}, read: () => ({ in: 0, out: 0, gr: 0 }) };
  const g = attachCompGauge(a, { source: src, threshold: () => -20, help: "words" });
  assert.equal(a.children[1], g);
  assert.equal(g.dataset.ncHelp, "words");
  assert.equal(attachCompGauge(a, { source: src }), g, "the same card keeps its gauge");
  assert.equal(a.querySelectorAll(".nc-comp-gauge").length, 1);
  const b = make();
  t.after(() => b.remove());
  assert.notEqual(attachCompGauge(b, { source: src }), g);
  assert.equal(attachCompGauge(null, { source: src }), null);
});
