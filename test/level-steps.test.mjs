// Level steps (level-steps.js, Gate's strip): the drawing, the drag that draws levels (in between steps filled), a tap,
// the long press that opens the shape picker (and leaves the level as it was), right-click and Enter, keys, the shape
// tabs, 1/8T's steps that don't play, swing widths, the playhead (solid when locked, quiet while free), and the FX
// card's maximize.
import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { document, window } = installDom();
const { renderControl, patchControl } = await import("../src/primitives/controls.js");
const { levelAt, stepAt, drawLine, levelStepsState, LONG_PRESS_MS } = await import("../src/primitives/level-steps.js");
const { kitCss } = await import("../src/primitives/kit.js");

const SHAPES = [
  { value: 0, label: "Hard", icon: "M0 10 L0 1 L20 1 L20 10" },
  { value: 1, label: "Pump", icon: "M0 10 C3 10 6 1 12 1 L20 1" },
  { value: 2, label: "Swell", icon: "M0 10 C10 10 16 6 20 1 L20 10" },
];
function strip(log, extra = {}) {
  const steps = Array.from({ length: 8 }, (_, i) => ({ level: i % 2 ? 0 : 1, shape: 1 }));
  return {
    type: "levelSteps",
    id: "gate-steps",
    label: "Gate steps",
    steps,
    shapes: SHAPES,
    curve: (i, n) => Array.from({ length: n + 1 }, (_, k) => steps[i].level * (k / n)),
    onLevels: (levels, done) => log.push(["levels", levels, done]),
    onShape: (i, shape) => log.push(["shape", i, shape]),
    onShapeAll: (shape) => log.push(["all", shape]),
    help: "Draw the steps",
    ...extra,
  };
}
/** Lay the plot out: 8 columns 10 px wide from x 0, 100 px tall from y 0. */
function layout(wrap) {
  const plot = wrap.querySelector(".nc-lsteps-plot");
  plot.getBoundingClientRect = () => ({ left: 0, top: 0, right: 80, bottom: 100, width: 80, height: 100 });
  for (const col of wrap.querySelectorAll(".nc-lsteps-step")) {
    const i = Number(col.dataset.i);
    col.getBoundingClientRect = () => ({ left: i * 10, right: i * 10 + 10, top: 0, bottom: 100, width: 10, height: 100 });
  }
  wrap.getBoundingClientRect = () => ({ left: 0, top: 0, right: 80, bottom: 140, width: 80, height: 140 });
  return plot;
}
function pointer(el, type, x, y, extra = {}) {
  const e = new window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, { clientX: x, clientY: y, pointerId: 1, button: 0, ...extra });
  el.dispatchEvent(e);
  return e;
}
const key = (el, k) => el.dispatchEvent(Object.assign(new window.Event("keydown", { bubbles: true, cancelable: true }), { key: k }));
function mount(control) {
  const live = { c: control };
  const wrap = renderControl(control, () => live.c);
  document.body.append(wrap);
  return { wrap, live };
}

test("helpers: a level from y (whole percents), a step from x, a line drawn across steps", () => {
  assert.equal(levelAt(0, 100), 1);
  assert.equal(levelAt(100, 100), 0);
  assert.equal(levelAt(33.3, 100), 0.67);
  assert.equal(levelAt(-20, 100), 1, "clamped");
  assert.equal(stepAt(5, [10, 20, 30]), 0);
  assert.equal(stepAt(25, [10, 20, 30]), 2);
  assert.equal(stepAt(99, [10, 20, 30]), 2);
  assert.deepEqual(drawLine([0, 0, 0, 0, 0], 0, 1, 4, 0), [1, 0.75, 0.5, 0.25, 0]);
  assert.deepEqual(drawLine([0, 0, 0], 2, 0.5, 0, 0.1), [0.1, 0.3, 0.5]);
});

test("draws: a column per step, the level bar, the curve, step numbers every beat, help and labels", () => {
  const { wrap } = mount(strip([]));
  const cols = wrap.querySelectorAll(".nc-lsteps-step");
  assert.equal(cols.length, 8);
  assert.equal(cols[0].querySelector(".nc-lsteps-level").getAttribute("height"), "100");
  assert.equal(cols[1].querySelector(".nc-lsteps-level").getAttribute("height"), "0");
  assert.equal(cols[1].dataset.zero, "true");
  assert.match(cols[0].querySelector(".nc-lsteps-env").getAttribute("d"), /^M0 100 L0\.00 100\.00 .* L100\.00 0\.00 L100 100 Z$/);
  assert.deepEqual([...wrap.querySelectorAll(".nc-lsteps-axis > span")].map((s) => s.textContent), ["1", "", "", "", "5", "", "", ""]);
  assert.equal(cols[4].dataset.beat, "true");
  assert.equal(wrap.getAttribute("data-nc-help"), "Draw the steps");
  const plot = wrap.querySelector(".nc-lsteps-plot");
  assert.equal(plot.getAttribute("role"), "slider");
  assert.equal(plot.getAttribute("aria-valuetext"), "Step 1 of 8: 100%, Pump");
  wrap.remove();
});

test("drag draws: every step crossed gets a level on the line, live while moving, done on release", () => {
  const log = [];
  const { wrap } = mount(strip(log));
  const plot = layout(wrap);
  pointer(plot, "pointerdown", 5, 100); // step 1 to 0 %
  pointer(plot, "pointermove", 45, 0); // to step 5 at 100 %: steps 2-4 on the line
  pointer(plot, "pointerup", 45, 0);
  const moves = log.filter((x) => x[0] === "levels");
  assert.deepEqual(moves[0][1].slice(0, 2), [0, 0]);
  assert.equal(moves[0][2], false);
  assert.deepEqual(moves.at(-2)[1].slice(0, 5), [0, 0.25, 0.5, 0.75, 1]);
  assert.equal(moves.at(-1)[2], true);
  assert.deepEqual(moves.at(-1)[1].slice(0, 5), [0, 0.25, 0.5, 0.75, 1]);
  assert.equal(levelStepsState(wrap).dragging, false);
  wrap.remove();
});

test("a tap sets one step; a long press opens the shape picker on that step and puts its level back", async () => {
  const log = [];
  const { wrap } = mount(strip(log));
  const plot = layout(wrap);
  pointer(plot, "pointerdown", 25, 70); // step 3, 30 %
  pointer(plot, "pointerup", 25, 70);
  assert.deepEqual(log.at(-1), ["levels", [1, 0, 0.3, 0, 1, 0, 1, 0], true]);
  log.length = 0;
  pointer(plot, "pointerdown", 35, 50); // step 4, held
  await new Promise((r) => setTimeout(r, LONG_PRESS_MS + 50));
  assert.deepEqual(log.at(-1), ["levels", [1, 0, 1, 0, 1, 0, 1, 0], true], "the level as it was");
  const pick = wrap.querySelector(".nc-lsteps-pick");
  assert.equal(pick.hidden, false);
  assert.equal(pick.querySelector(".nc-lsteps-pick-head").textContent, "Step 4");
  const buttons = [...pick.querySelectorAll("button")];
  assert.deepEqual(buttons.map((b) => b.textContent), ["Hard", "Pump", "Swell"]);
  assert.equal(buttons[1].getAttribute("aria-checked"), "true");
  pointer(plot, "pointerup", 35, 50);
  click(buttons[2]);
  assert.deepEqual(log.at(-1), ["shape", 3, 2]);
  assert.equal(pick.hidden, true);
  wrap.remove();
});

test("right-click and Enter open the picker; Escape closes it; a press outside closes it", () => {
  const log = [];
  const { wrap } = mount(strip(log));
  const plot = layout(wrap);
  const pick = wrap.querySelector(".nc-lsteps-pick");
  const e = pointer(plot, "contextmenu", 55, 50);
  assert.equal(e.defaultPrevented, true);
  assert.equal(pick.hidden, false);
  assert.equal(pick.querySelector(".nc-lsteps-pick-head").textContent, "Step 6");
  key(pick.querySelector("button"), "Escape");
  assert.equal(pick.hidden, true);
  key(plot, "Enter");
  assert.equal(pick.hidden, false);
  pointer(document.body, "pointerdown", 500, 500);
  assert.equal(pick.hidden, true);
  wrap.remove();
});

test("keys: left and right pick a step, up and down move its level, Home and End", () => {
  const log = [];
  const { wrap, live } = mount(strip(log));
  const plot = wrap.querySelector(".nc-lsteps-plot");
  key(plot, "ArrowRight");
  key(plot, "ArrowUp");
  assert.deepEqual(log.at(-1), ["levels", [1, 0.05, 1, 0, 1, 0, 1, 0], true]);
  key(plot, "Home");
  assert.equal(log.at(-1)[1][1], 1);
  key(plot, "ArrowLeft");
  key(plot, "ArrowLeft");
  key(plot, "End");
  assert.equal(log.at(-1)[1][7], 0);
  assert.equal(levelStepsState(wrap).focus, 7);
  void live;
  wrap.remove();
});

test("shape tabs: every step's shape selected when they agree, none when mixed; a tab sets every step", () => {
  const log = [];
  const c = strip(log);
  const { wrap, live } = mount(c);
  const tabs = [...wrap.querySelectorAll(".nc-lsteps-shape")];
  assert.deepEqual(tabs.map((t) => t.getAttribute("aria-selected")), ["false", "true", "false"]);
  assert.ok(tabs[0].querySelector("svg path"));
  click(tabs[2]);
  assert.deepEqual(log.at(-1), ["all", 2]);
  const mixed = { ...c, steps: c.steps.map((s, i) => ({ ...s, shape: i === 3 ? 0 : 1 })) };
  live.c = mixed;
  patchControl(wrap, mixed);
  assert.deepEqual(tabs.map((t) => t.getAttribute("aria-selected")), ["false", "false", "false"]);
  // Steps that don't play don't count (1/8T: 12 of 16).
  const sixteen = { ...c, curve: undefined, steps: Array.from({ length: 16 }, (_, i) => ({ level: 1, shape: i >= 12 ? 0 : 2 })), played: 12 };
  live.c = sixteen;
  patchControl(wrap, sixteen);
  assert.equal(wrap.querySelectorAll(".nc-lsteps-step").length, 16);
  assert.deepEqual([...wrap.querySelectorAll(".nc-lsteps-shape")].map((t) => t.getAttribute("aria-selected")), ["false", "false", "true"]);
  assert.deepEqual([...wrap.querySelectorAll(".nc-lsteps-step")].map((s) => s.dataset.out ?? "").slice(10), ["", "", "true", "true", "true", "true"]);
  wrap.remove();
});

test("swing widens the first step of each pair; on: false goes quiet", () => {
  const { wrap, live } = mount(strip([], { swing: 0.625, on: false }));
  const cols = wrap.querySelectorAll(".nc-lsteps-step");
  assert.equal(cols[0].style.getPropertyValue("--nc-lsteps-grow"), "1.25");
  assert.equal(cols[1].style.getPropertyValue("--nc-lsteps-grow"), "0.75");
  assert.equal(wrap.dataset.on, "false");
  void live;
  wrap.remove();
});

test("playhead: read each frame while on the page, the step ringed, locked or free; it stops when removed", async () => {
  let ph = { step: 2, locked: true }, reads = 0;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  const { wrap } = mount(strip([], { playhead: () => { reads++; return ph; } }));
  const run = (t) => { const f = frames.splice(0); for (const fn of f) fn(t); };
  run(100);
  const ringed = () => [...wrap.querySelectorAll(".nc-lsteps-step")].filter((s) => s.dataset.playhead === "true").map((s) => [Number(s.dataset.i), s.dataset.locked]);
  assert.deepEqual(ringed(), [[2, "true"]]);
  ph = { step: 5, locked: false };
  run(150);
  assert.deepEqual(ringed(), [[5, "false"]]);
  assert.equal(wrap.dataset.free, "true");
  wrap.remove();
  const before = reads;
  run(200);
  assert.equal(frames.length, 0, "no more frames once off the page");
  assert.equal(reads, before);
  delete window.requestAnimationFrame;
});

test("an FX card with level steps can be maximized; the kit styles the strip with tokens only", () => {
  const card = { type: "fx", id: "hack-ch-gate-1", title: "1 · Gate", depth: 1, on: true, onToggle() {}, controls: [strip([])] };
  const el = renderControl(card, () => card);
  assert.ok(el.querySelector("[data-nc-max-toggle]"), "maximize button");
  const css = kitCss();
  assert.match(css, /\.nc-lsteps-plot \{[^}]*height: var\(--nc-ui-level-steps-height\)/);
  assert.match(css, /\.nc-ui-fx\[data-nc-max\] \.nc-lsteps-plot \{ height: var\(--nc-ui-level-steps-height-max\); \}/);
  assert.match(css, /data-locked="false"\] \{ outline-color: var\(--nc-ui-level-steps-free\)/);
  const block = css.slice(css.indexOf(".nc-lsteps {"), css.indexOf(".nc-eq {"));
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b|rgb\(|\d+px/i);
});

test("choice: a caption shows before the tabs", () => {
  const c = { type: "choice", id: "rate", label: "Rate", caption: "Rate", value: "8", options: [{ value: "4", label: "1/4" }, { value: "8", label: "1/8" }], onChange() {} };
  const el = renderControl(c, () => c);
  assert.equal(el.querySelector(".nc-choice-caption").textContent, "Rate");
  assert.equal(el.dataset.ncCaption, "");
  assert.equal(el.querySelector('[data-nc-choice="8"]').getAttribute("aria-selected"), "true");
});
