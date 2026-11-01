import assert from "node:assert/strict";
import { test } from "node:test";
import { installDom } from "./helpers/dom.mjs";

const { document } = installDom();
const { renderControl, patchControl, panText } = await import("../src/primitives/controls.js");
const { defineModule } = await import("../src/module/define-module.js");
const { kitCss } = await import("../src/primitives/kit.js");
const css = kitCss();

const key = (el, k) => {
  const e = new Event("keydown", { bubbles: true, cancelable: true });
  Object.assign(e, { key: k });
  el.dispatchEvent(e);
};

test("panText reads C, L n, R n", () => {
  assert.equal(panText(0), "C");
  assert.equal(panText(-0.3), "L 30");
  assert.equal(panText(0.45), "R 45");
  assert.equal(panText(-1), "L 100");
  assert.equal(panText(2), "R 100");
  assert.equal(panText(0.004), "C");
});

test("strip pan: a compact bipolar knob in its own row; arrows, double-click centre, aria-valuetext", () => {
  const seen = [];
  const def = (pan) => ({
    id: "mixp",
    title: "Mix",
    layout: "console",
    sections: [
      {
        id: "strips",
        area: "strips",
        controls: [
          {
            type: "strip",
            id: "strip-bass",
            label: "Bass",
            value: 0.75,
            onChange() {},
            pan: { id: "pan-bass", value: pan, onChange: (v) => seen.push(v), help: "Pans Bass." },
          },
          { type: "strip", id: "strip-master", label: "Master", master: true, value: 0.9, onChange() {} },
        ],
      },
    ],
  });
  const mod = defineModule(def(0), "test.pan.hidden");
  const strip = mod.el.querySelector('[data-nc-id="strip-bass"]');
  const rows = [...strip.children].map((n) => n.className);
  assert.ok(rows.indexOf("nc-strip-pan") === rows.indexOf("nc-strip-sends") + 1, "after the sends");
  assert.ok(rows.indexOf("nc-strip-pan") === rows.indexOf("nc-strip-body") - 1, "before the fader");
  const master = mod.el.querySelector('[data-nc-id="strip-master"] .nc-strip-pan');
  assert.ok(master && master.children.length === 0, "the master keeps an empty row");
  const field = strip.querySelector(".nc-strip-pan .nc-field");
  assert.equal(field.dataset.ncBipolar, "");
  assert.equal(field.dataset.ncCompact, "");
  assert.equal(field.querySelector(".nc-label").textContent, "L R");
  assert.equal(field.getAttribute("data-nc-help"), "Pans Bass.");
  const knob = strip.querySelector(".nc-strip-pan .nc-knob");
  assert.equal(knob.getAttribute("role"), "slider");
  assert.equal(knob.getAttribute("aria-label"), "Bass pan");
  assert.equal(knob.getAttribute("aria-valuetext"), "C");
  assert.equal(knob.getAttribute("aria-valuemin"), "-1");
  key(knob, "ArrowLeft");
  assert.ok(Math.abs(seen.at(-1) + 0.05) < 1e-9, "an arrow moves it by 0.05");
  mod.update(def(-0.3));
  assert.equal(knob.getAttribute("aria-valuetext"), "L 30");
  assert.equal(field.querySelector("[data-nc-readout]").textContent, "L 30");
  assert.equal(knob.style.getPropertyValue("--knob-from"), String(Math.round(0.35 * 270)));
  assert.equal(knob.style.getPropertyValue("--knob-to"), "135");
  assert.equal(strip.style.getPropertyValue("--nc-strip-pan"), "-0.3");
  knob.dispatchEvent(new Event("dblclick", { bubbles: true }));
  assert.equal(seen.at(-1), 0, "double-click centres it");
});

test("pan CSS: tokens only, readout in the label's place on hover/focus/drag, a folded pan mark", () => {
  assert.match(css, /\.nc-field\[data-nc-compact\]\[data-nc-bipolar\]:is\(:hover, :focus-within, \[data-nc-dragging\]\) \.nc-readout \{ display: block; \}/);
  assert.match(css, /conic-gradient\(from 225deg, var\(--nc-ui-meter-track\) calc\(var\(--knob-from, 135\) \* 1deg\), var\(--nc-ui-meter-fill\) 0 calc\(var\(--knob-to, 135\) \* 1deg\)/);
  assert.match(css, /\.nc-strip\[data-nc-folded\] > \.nc-strip-pan,/);
  assert.match(css, /\.nc-strip-fold-pan::after \{[^}]*left: calc\(\(var\(--nc-strip-pan, 0\) \+ 1\) \/ 2/);
});
