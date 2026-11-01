import assert from "node:assert/strict";
import { test } from "node:test";
import { installDom } from "./helpers/dom.mjs";

installDom();
const T = await import("../src/primitives/taper.js");
const E = await import("../src/primitives/envelope.js");
const { createSlider } = await import("../src/primitives/slider.js");
const { renderControl, patchControl } = await import("../src/primitives/controls.js");

const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) <= eps, `${what} ${a} != ${b} (±${eps})`);
const at = (taper, min, max, x) => T.taperFromUnit(taper, min, max, x);

test("curves: time from 0 is a cube, from a floor is log; freq/q/rate are log, a 0 floor a cube; the rest linear", () => {
  assert.equal(T.taperCurve("time", 0, 5), "power");
  assert.equal(T.taperCurve("time", 1, 100), "log");
  assert.equal(T.taperCurve("freq", 20, 20000), "log");
  assert.equal(T.taperCurve("freq", 0, 1000), "power");
  assert.equal(T.taperCurve("q", 0.1, 20), "log");
  assert.equal(T.taperCurve("rate", 0.01, 20), "log");
  for (const lin of ["linear", "percent", "db", "bipolar", undefined, "nope"]) assert.equal(T.taperCurve(lin, 0, 1), "linear");
  assert.equal(T.taperCurve("time", 5, 5), "linear", "an empty range never divides by zero");
});

test("endpoints, monotonic and round trip for every taper on real ranges", () => {
  const ranges = [["time", 0, 5], ["time", 0, 10], ["time", 0.01, 4], ["time", 1, 100], ["freq", 20, 20000], ["freq", 0, 1000],
    ["q", 0.1, 20], ["rate", 0.01, 20], ["percent", 0, 100], ["db", -60, 0], ["bipolar", -100, 100]];
  for (const [taper, min, max] of ranges) {
    assert.equal(T.taperToUnit(taper, min, max, min), 0, `${taper} ${min}`);
    assert.equal(T.taperToUnit(taper, min, max, max), 1, `${taper} ${max}`);
    near(at(taper, min, max, 0), min, 1e-12, taper);
    near(at(taper, min, max, 1), max, 1e-9, taper);
    assert.equal(T.taperPosition(taper, min, max, min - 1), 0, "clamped below");
    assert.equal(T.taperPosition(taper, min, max, max * 2 + 1), T.TAPER_STEPS, "clamped above");
    let last = -Infinity;
    for (let p = 0; p <= T.TAPER_STEPS; p++) {
      const v = T.taperValue(taper, min, max, p);
      assert.ok(v >= last, `${taper} ${min}..${max} rises at ${p}`);
      last = v;
      assert.equal(T.taperPosition(taper, min, max, v), p, `${taper} ${min}..${max} position ${p} round trips`);
    }
    for (let i = 0; i <= 50; i++) {
      const v = min + ((max - min) * i) / 50;
      const back = T.taperValue(taper, min, max, T.taperPosition(taper, min, max, v));
      // Within one position's worth of value.
      const x = T.taperToUnit(taper, min, max, v);
      const slack = Math.abs(at(taper, min, max, Math.min(1, x + 1 / T.TAPER_STEPS)) - at(taper, min, max, Math.max(0, x - 1 / T.TAPER_STEPS)));
      near(back, v, slack + 1e-9, `${taper} value ${v}`);
    }
  }
});

test("the 25/50/75% table: envelope times spread by ear instead of crowding the left", () => {
  // ASTRID VCA Attack 0..5 s: linear put 1.25 s at a quarter; the cube puts 78 ms there.
  near(at("time", 0, 5, 0.25), 0.078125, 1e-9);
  near(at("time", 0, 5, 0.5), 0.625, 1e-9);
  near(at("time", 0, 5, 0.75), 2.109375, 1e-9);
  // Release 0..10 s.
  near(at("time", 0, 10, 0.25), 0.15625, 1e-9);
  near(at("time", 0, 10, 0.5), 1.25, 1e-9);
  near(at("time", 0, 10, 0.75), 4.21875, 1e-9);
  // 10 ms of attack is now an eighth of the travel (it was 0.2%).
  near(T.taperToUnit("time", 0, 5, 0.01), 0.126, 0.001);
  // Cutoff 20 Hz..20 kHz: three octaves-ish per quarter.
  near(at("freq", 20, 20000, 0.5), 632.46, 0.01);
  // Q 0.1..20.
  near(at("q", 0.1, 20, 0.25), 0.376, 0.001);
  near(at("q", 0.1, 20, 0.5), 1.414, 0.001);
  near(at("q", 0.1, 20, 0.75), 5.318, 0.001);
  // Percent stays linear.
  assert.equal(at("percent", 0, 100, 0.25), 25);
});

test("snap to step without float dust; keyboard: 1% per arrow, 0.1% with Shift, 10% per page", () => {
  assert.equal(T.snapToStep(0.12345, 0, 5, 0.001), 0.123);
  assert.equal(T.snapToStep(632.46, 20, 20000, 1), 632);
  assert.equal(T.snapToStep(17, 0, 1000, 5), 15);
  assert.equal(T.snapToStep(0.30000000000000004, 0, 1, 0.1), 0.3);
  assert.equal(T.taperKeyPosition(500, "ArrowRight"), 510);
  assert.equal(T.taperKeyPosition(500, "ArrowLeft", true), 499);
  assert.equal(T.taperKeyPosition(500, "PageUp"), 600);
  assert.equal(T.taperKeyPosition(995, "ArrowUp"), 1000);
  assert.equal(T.taperKeyPosition(3, "PageDown"), 0);
  assert.equal(T.taperKeyPosition(500, "Home"), 0);
  assert.equal(T.taperKeyPosition(500, "End"), 1000);
  assert.equal(T.taperKeyPosition(500, "a"), null);
});

test("a key always moves the value, even where the step is coarse for the travel", () => {
  // Compressor attack 1..100 ms in whole ms: 1% of travel from 1 ms is 1.05 ms, which rounds back to 1.
  assert.equal(T.taperKeyValue("time", 1, 100, 1, "ArrowRight", false, 1), 2);
  assert.equal(T.taperKeyValue("time", 1, 100, 2, "ArrowLeft", false, 1), 1);
  assert.equal(T.taperKeyValue("time", 1, 100, 1, "ArrowLeft", false, 1), 1, "stops at the end");
  assert.equal(T.taperKeyValue("time", 0, 5, 0.625, "ArrowRight", false, 0.001), T.taperValue("time", 0, 5, 510, 0.001));
  assert.equal(T.taperKeyValue("time", 0, 5, 0.625, "x", false, 0.001), null);
});

test("dialTaper reads an nc-fx catalog dial", () => {
  assert.equal(T.dialTaper({ key: "attack_ms", unit: "ms", min: 1, max: 100 }), "time");
  assert.equal(T.dialTaper({ key: "release_ms", min: 10, max: 1000 }), "time");
  assert.equal(T.dialTaper({ key: "predelay", min: 0, max: 200 }), "time");
  assert.equal(T.dialTaper({ key: "low_cut", curve: "log", min: 0, max: 1000 }), "freq");
  assert.equal(T.dialTaper({ key: "mix", unit: "%" }), "linear");
  assert.equal(T.dialTaper({ key: "delay_beats", options: [] }), "linear");
  assert.equal(T.dialTaper({ key: "x", taper: "q" }), "q");
  assert.equal(T.dialTaper(null), "linear");
});

test("createSlider with a taper: positions in, values out, step snapped, keys by travel", () => {
  const got = [];
  const s = createSlider({ id: "a", label: "Attack", min: 0, max: 5, step: 0.001, value: 0.01, taper: "time", format: String, onInput: (v) => got.push(v) });
  const input = s.el.querySelector("input");
  assert.equal(input.min, "0"); assert.equal(input.max, "1000"); assert.equal(input.step, "1");
  assert.equal(input.value, String(T.taperPosition("time", 0, 5, 0.01)));
  input.value = "500";
  input.dispatchEvent(new Event("input"));
  assert.deepEqual(got, [0.625]);
  input.dispatchEvent(Object.assign(new Event("keydown"), { key: "ArrowRight" }));
  assert.equal(input.value, "510");
  assert.equal(got.length, 2);
  assert.equal(got.at(-1), T.taperValue("time", 0, 5, 510, 0.001));
  // A linear slider is untouched (native range in its own units).
  const lin = createSlider({ id: "l", label: "L", min: 0, max: 100, step: 1, value: 40, format: String, onInput() {} });
  assert.equal(lin.el.querySelector("input").max, "100");
  assert.equal(lin.el.querySelector("input").value, "40");
});

test("renderControl slider and knob honour taper; patch keeps the position", () => {
  let live = { type: "slider", id: "rel", label: "Release", min: 0, max: 10, step: 0.001, value: 1.25, taper: "time", onChange: (v) => (live.got = v), onCommit: (v) => (live.done = v) };
  const el = renderControl(live, () => live);
  const input = el.querySelector("input");
  assert.equal(input.max, "1000");
  assert.equal(input.dataset.ncTaper, "time");
  assert.equal(input.value, "500");
  input.value = "250";
  input.dispatchEvent(new Event("input"));
  assert.equal(live.got, 0.156);
  input.dispatchEvent(new Event("change"));
  assert.equal(live.done, 0.156);
  live = { ...live, value: 4.21875 };
  patchControl(el, live);
  assert.equal(input.value, "750");
  // Knob: the ring's turn is the taper's share.
  const knob = renderControl({ type: "knob", id: "k", label: "Q", min: 0.1, max: 20, value: Math.SQRT2, taper: "q", onChange() {} }, () => undefined);
  near(Number(knob.querySelector(".nc-knob").style.getPropertyValue("--knob-turn")), 135, 1);
});

test("envelope geometry: one fixed scale, 0 s is no width, the hold takes the rest", () => {
  const MAX = [5, 5, 0, 10];
  // Peter's screenshot: A 0, D 0, S 46%, R 0. Straight up, straight down, a flat hold, straight down.
  const zero = E.envelopeXs([0, 0, null, 0], MAX, 240, 40);
  assert.deepEqual(zero, [0, 0, 0, 240, 240]);
  // A 10 ms / D 300 ms / R 1.2 s.
  const typ = E.envelopeXs([0.01, 0.3, null, 1.2], MAX, 240, 40);
  const w = (xs, i) => xs[i + 1] - xs[i];
  assert.ok(w(typ, 0) > 2 && w(typ, 0) < 6, `10 ms is visibly short (${w(typ, 0)})`);
  assert.ok(w(typ, 1) > 25, "300 ms reads");
  assert.ok(w(typ, 3) > 40, "1.2 s reads long");
  assert.equal(typ[4], 240);
  // Same time, same width, in any segment.
  const same = E.envelopeXs([0.5, 0.5, null, 0.5], MAX, 240, 40);
  near(w(same, 0), w(same, 1), 0.02); near(w(same, 1), w(same, 3), 0.02);
  // Everything at its longest exactly fills the box with the smallest hold.
  const all = E.envelopeXs([5, 5, null, 10], MAX, 240, 40);
  near(w(all, 2), 40, 0.02);
  // Without a hold the envelope ends where its last segment does.
  const ad = E.envelopeXs([0, 0.2], [0.1, 4], 100);
  assert.equal(ad[1], 0); assert.ok(ad[2] < 100 && ad[2] > 30);
  assert.equal(E.envelopeXs([0.1, 4], [0.1, 4], 100)[2], 100);
  // Longer is wider; times below zero are zero.
  assert.ok(E.envUnits(0.02) > E.envUnits(0.01)); assert.equal(E.envUnits(-1), 0);
});

test("envelope labels never overlap, stay inside the box, and sit under their segment when there is room", () => {
  const xs = [0, 0, 0, 240, 240];
  const labels = E.envelopeLabelXs(xs, 10, 240);
  for (let i = 1; i < labels.length; i++) assert.ok(labels[i] - labels[i - 1] >= 10 - 1e-9);
  assert.ok(labels[0] >= 5 && labels.at(-1) <= 235);
  const roomy = E.envelopeLabelXs([0, 40, 100, 160, 240], 10, 240);
  assert.deepEqual(roomy, [20, 70, 130, 200]);
});

test("filter painter's real response: nc-fx's RBJ biquads on ASTRID's frame", async () => {
  const C = await import("../src/primitives/canvas.js");
  const db = (m) => 20 * Math.log10(m);
  near(db(C.biquadMagnitude("lp", 1000, Math.SQRT1_2, 1000)), -3.01, 0.02, "LP corner");
  near(db(C.biquadMagnitude("lp", 1000, Math.SQRT1_2, 20)), 0, 0.01, "LP passband");
  assert.ok(db(C.biquadMagnitude("lp", 1000, Math.SQRT1_2, 10000)) < -35, "LP stopband (12 dB/oct)");
  near(db(C.biquadMagnitude("hp", 1000, Math.SQRT1_2, 1000)), -3.01, 0.02, "HP corner");
  near(db(C.biquadMagnitude("hp", 1000, Math.SQRT1_2, 15000)), 0, 0.1, "HP passband");
  near(db(C.biquadMagnitude("bp", 1000, 4, 1000)), 0, 0.01, "BP peaks at 0 dB on its centre");
  near(db(C.biquadMagnitude("hp", 500, 8, 500)), db(8), 0.05, "resonant HP: +Q at the corner");
  // Axes: 20 Hz at the left, 20 kHz at the right, 632 Hz in the middle; 0 dB where ASTRID's line is (26.3 of 8..72).
  assert.equal(C.filterX(20, 240), 0); near(C.filterX(20000, 240), 240, 1e-9); near(C.filterX(632.46, 240), 120, 0.01);
  near(C.filterY(0, 8, 72), 26.29, 0.01); assert.equal(C.filterY(-90, 8, 72), 72); assert.equal(C.filterY(40, 8, 72), 8);
});
