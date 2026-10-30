import assert from "node:assert/strict";
import { test } from "node:test";
import { installDom } from "./helpers/dom.mjs";

installDom();
const { createSlider, sliderFactory, toPosition, fromPosition, LOG_STEPS } = await import("../src/primitives/slider.js");
const { renderControl } = await import("../src/primitives/controls.js");
const { kitCss } = await import("../src/primitives/kit.js");

const css = kitCss();
function rule(selector) {
  const at = css.indexOf(`\n${selector} {`);
  assert.ok(at >= 0, `rule ${selector}`);
  return css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
}

test("createSlider meets fx-blocks' SliderFactory contract and matches the kit's slider row", () => {
  const values = [];
  const s = sliderFactory({ id: "time", label: "Time", min: 0, max: 2, value: 0.5, format: (v) => `${v.toFixed(2)} s`, onInput: (v) => values.push(v) });
  assert.ok(s.el instanceof HTMLElement);
  assert.equal(typeof s.set, "function");
  assert.ok(s.el.matches('.nc-field[data-nc-slider][data-nc-row][data-nc-id="time"]'));
  const input = s.el.querySelector("input.nc-range");
  assert.equal(input.type, "range");
  assert.equal(s.el.querySelector("label.nc-label").getAttribute("for"), "time");
  assert.equal(s.el.querySelector("[data-nc-readout]").textContent, "0.50 s");
  assert.equal(input.getAttribute("aria-valuetext"), "0.50 s");
  input.value = "1.5";
  input.dispatchEvent(new Event("input"));
  assert.deepEqual(values, [1.5]);
  s.set(1);
  assert.equal(s.el.querySelector("[data-nc-readout]").textContent, "1.00 s");
  // Same structure as renderControl's slider.
  const kit = renderControl({ type: "slider", id: "k", label: "K", min: 0, max: 1, step: 0.1, value: 0, onChange() {} }, () => undefined);
  const shape = (el) => [...el.children].map((c) => `${c.tagName}.${c.className}`).filter((x) => !x.includes("probe"));
  assert.deepEqual(shape(s.el), shape(kit));
  // The 44 px hit area comes from the [data-nc-slider] band, on every pointer.
  assert.match(css, /\.nc-field\[data-nc-slider\] \.nc-range \{\n  height: var\(--nc-ui-target-min\);/);
});

test("log sliders map positions round trip; disabled dims by colour", () => {
  assert.equal(toPosition(20, 20000, 20, true), 0);
  assert.equal(toPosition(20, 20000, 20000, true), LOG_STEPS);
  assert.ok(Math.abs(fromPosition(20, 20000, toPosition(20, 20000, 632, true), true) - 632) < 5);
  const s = createSlider({ id: "cut", label: "Cutoff", min: 20, max: 20000, value: 632, log: true, format: String, onInput() {} });
  const input = s.el.querySelector("input");
  assert.equal(input.min, "0");
  assert.equal(input.max, String(LOG_STEPS));
  assert.throws(() => createSlider({ id: "x", label: "x", min: 0, max: 1, value: 0, log: true, format: String, onInput() {} }), RangeError);
  s.setDisabled(true);
  assert.equal(input.disabled, true);
  const disabled = rule(".nc-range:disabled");
  assert.doesNotMatch(disabled, /opacity/);
  assert.match(disabled, /accent-color: var\(--nc-ui-text-sub\)/);
});
