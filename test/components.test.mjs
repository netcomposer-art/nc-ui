import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { document } = installDom();
const { createSwitch } = await import("../src/primitives/switch.js");
const { renderControl } = await import("../src/primitives/controls.js");
const { defineModule } = await import("../src/module/define-module.js");
const { kitCss } = await import("../src/primitives/kit.js");

const css = kitCss();
/** The declarations of the first rule whose selector list is exactly `selector`. */
function rule(selector) {
  const at = css.indexOf(`\n${selector} {`);
  assert.ok(at >= 0, `rule ${selector}`);
  return css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
}

test("createSwitch is a real switch: role, aria-checked, named by its title", () => {
  const title = document.createElement("h3");
  title.id = "drive-name";
  title.textContent = "Drive";
  document.body.append(title);
  const seen = [];
  const sw = createSwitch({ checked: false, labelledBy: "drive-name", onChange: (on) => seen.push(on) });
  document.body.append(sw.el);
  assert.equal(sw.el.tagName, "BUTTON");
  assert.equal(sw.el.getAttribute("type"), "button");
  assert.equal(sw.el.getAttribute("role"), "switch");
  assert.equal(sw.el.getAttribute("aria-checked"), "false");
  assert.equal(sw.el.getAttribute("aria-labelledby"), "drive-name");
  click(sw.el);
  assert.equal(sw.el.getAttribute("aria-checked"), "true");
  assert.equal(sw.checked, true);
  click(sw.el);
  assert.deepEqual(seen, [true, false]);
  sw.set(true);
  assert.equal(sw.el.getAttribute("aria-checked"), "true");
  assert.deepEqual(seen, [true, false], "set() does not call onChange");
});

test("the switch never changes width: both words are always in the box", () => {
  const sw = createSwitch({ label: "Power" });
  assert.equal(sw.el.getAttribute("aria-label"), "Power");
  const words = sw.el.querySelectorAll(".nc-ui-switch-text > span");
  assert.equal(words.length, 2);
  assert.equal(sw.el.querySelector(".nc-ui-switch-text").getAttribute("aria-hidden"), "true");
  sw.set(true);
  assert.equal(sw.el.querySelectorAll(".nc-ui-switch-text > span").length, 2);
  assert.match(rule(".nc-ui-switch-text > span"), /grid-area: 1 \/ 1/);
  assert.match(css, /\[aria-checked="true"\] \[data-nc-off\], \.nc-ui-switch\[aria-checked="false"\] \[data-nc-on\] \{ visibility: hidden; \}/);
  assert.doesNotMatch(css, /\[data-nc-(on|off)\][^{]*\{[^}]*display: none/);
});

test("switch CSS: 44 px target, hover state, tokens only, motion-press", () => {
  const base = rule(".nc-ui-switch");
  assert.match(base, /min-height: var\(--nc-ui-target-min\)/);
  assert.match(base, /min-width: var\(--nc-ui-target-min\)/);
  assert.match(rule(".nc-ui-switch:hover"), /color: var\(--nc-ui-text\)/);
  assert.match(rule(".nc-ui-switch-track"), /width: var\(--nc-ui-switch-track-width\)/);
  assert.match(rule(".nc-ui-switch-track::after"), /transform var\(--nc-ui-motion-press\)/);
  assert.match(css, /\.nc-ui-switch\[aria-checked="true"\] \.nc-ui-switch-track \{ background: var\(--nc-ui-accent\)/);
  assert.match(css, /prefers-reduced-motion[\s\S]*\.nc-ui-switch, \.nc-ui-switch-track/);
});

test("FX card: kit namespace, header switch named by the title, colour dim when off, More", () => {
  const toggles = [];
  const control = {
    type: "fx",
    id: "drive",
    title: "Drive",
    depth: 1,
    on: false,
    onToggle: (on) => toggles.push(on),
    controls: [{ type: "slider", id: "drive-amt", label: "Amount", min: 0, max: 1, step: 0.01, value: 0.5, onChange() {} }],
    more: [{ type: "slider", id: "drive-lfo", label: "LFO", min: 0, max: 1, step: 0.01, value: 0, onChange() {} }],
  };
  const card = renderControl(control, () => control);
  assert.equal(card.className, "nc-ui-fx");
  assert.equal(card.querySelector(".nc-fx"), null);
  const name = card.querySelector(".nc-ui-fx-hd > .nc-ui-fx-name");
  const sw = card.querySelector('.nc-ui-fx-hd > [role="switch"]');
  assert.ok(name && sw);
  assert.equal(sw.getAttribute("aria-labelledby"), name.id);
  assert.equal(card.dataset.ncDim, "true");
  click(sw);
  assert.deepEqual(toggles, [true]);
  const more = card.querySelector("details.nc-ui-more");
  assert.equal(more.querySelector("summary").textContent, "More");
  assert.ok(more.querySelector('[data-nc-id="drive-lfo"]'));
  assert.match(rule(".nc-ui-more > summary"), /min-height: var\(--nc-ui-target-min\)/);
  assert.match(rule(".nc-ui-fx-hd"), /min-height: var\(--nc-ui-target-min\)/);
});

test("an FX card without `on` has no switch (Rhythm's hacks stay as they are)", () => {
  const control = { type: "fx", id: "h", title: "Hacks", depth: 2, controls: [] };
  const card = renderControl(control, () => control);
  assert.equal(card.querySelector('[role="switch"]'), null);
  assert.ok(card.querySelector(":scope > .nc-ui-fx-name"));
});

test("defineModule: header switch only when `on` is given; off dims the body by colour", () => {
  const seen = [];
  const mod = defineModule({ id: "vcf", title: "Filter", controls: [] });
  mod.update({ id: "vcf", title: "Filter", controls: [] });
  const sw = mod.el.querySelector(".nc-module-hd [data-nc-module-switch]");
  assert.ok(sw);
  assert.equal(sw.hidden, true);
  mod.update({ id: "vcf", title: "Filter", on: false, onToggle: (on) => seen.push(on), controls: [] });
  assert.equal(sw.hidden, false);
  assert.equal(sw.getAttribute("role"), "switch");
  assert.equal(sw.getAttribute("aria-labelledby"), "vcf-title");
  assert.equal(mod.el.querySelector(".nc-module-body").dataset.ncDim, "true");
  click(sw);
  assert.deepEqual(seen, [true]);
  mod.update({ id: "vcf", title: "Filter", on: true, onToggle: () => {}, controls: [] });
  assert.equal(mod.el.querySelector(".nc-module-body").dataset.ncDim, undefined);
});


test("switch colours follow plan 5.1: off sub/divider, on accent with a page-coloured knob", () => {
  assert.match(rule(".nc-ui-switch"), /color: var\(--nc-ui-text-sub\)/);
  assert.match(rule(".nc-ui-switch-track"), /border: var\(--nc-ui-hairline\) solid var\(--nc-ui-divider\)/);
  assert.match(rule(".nc-ui-switch-track::after"), /background: var\(--nc-ui-text-sub\)/);
  assert.match(rule('.nc-ui-switch[aria-checked="true"] .nc-ui-switch-track::after'), /background: var\(--nc-ui-surface-page\)/);
  assert.match(rule(".nc-ui-switch:focus-visible"), /outline: var\(--nc-ui-focus-width\) solid var\(--nc-ui-focus-ring\)/);
});
