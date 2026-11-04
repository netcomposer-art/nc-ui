import assert from "node:assert/strict";
import { test } from "node:test";
import { installDom } from "./helpers/dom.mjs";

installDom();
const { trimText } = await import("../src/primitives/controls.js");
const { defineModule } = await import("../src/module/define-module.js");
const { kitCss } = await import("../src/primitives/kit.js");
const css = kitCss();
const rule = (sel) => {
  const at = css.indexOf(`${sel} {`);
  assert.ok(at >= 0, `rule ${sel}`);
  return css.slice(at, css.indexOf("}", at));
};
const key = (el, k) => {
  const e = new Event("keydown", { bubbles: true, cancelable: true });
  Object.assign(e, { key: k });
  el.dispatchEvent(e);
};

test("trimText reads 0 dB, +12 dB, −3.5 dB", () => {
  assert.equal(trimText(0), "0 dB");
  assert.equal(trimText(12), "+12 dB");
  assert.equal(trimText(-3.5), "−3.5 dB");
  assert.equal(trimText(0.04), "0 dB");
  assert.equal(trimText(23.96), "+24 dB");
});

const def = (trim, extra = {}) => ({
  id: "mixt",
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
          ...(trim ? { trim } : {}),
          ...extra,
        },
        { type: "strip", id: "strip-master", label: "Master", master: true, value: 0.9, onChange() {}, trimRow: !!trim, ...extra },
      ],
    },
  ],
});

test("strip trim: a compact knob at the top, its ring from 0 dB; arrows, double-click 0 dB, aria-valuetext", () => {
  const seen = [];
  const trim = (value) => ({ id: "trim-bass", value, onChange: (v) => seen.push(v), help: "Trims Bass." });
  const mod = defineModule(def(trim(0)), "test.trim");
  const strip = mod.el.querySelector('[data-nc-id="strip-bass"]');
  const rows = [...strip.children].map((n) => n.className);
  assert.equal(rows.indexOf("nc-strip-trim"), rows.indexOf("nc-strip-hd") + 1, "under the name");
  assert.equal(rows.indexOf("nc-strip-trim"), rows.indexOf("nc-strip-hacks") - 1, "before the Inserts");
  assert.ok(strip.hasAttribute("data-nc-trim"));
  const master = mod.el.querySelector('[data-nc-id="strip-master"]');
  assert.ok(master.hasAttribute("data-nc-trim"), "the master keeps the row (trimRow)");
  assert.equal(master.querySelector(".nc-strip-trim").children.length, 0, "empty");
  const field = strip.querySelector(".nc-strip-trim .nc-field");
  assert.equal(field.dataset.ncCompact, "");
  assert.equal(field.dataset.ncBipolar, "");
  assert.equal(field.querySelector(".nc-label").textContent, "Trim");
  assert.equal(field.getAttribute("data-nc-help"), "Trims Bass.");
  const knob = field.querySelector(".nc-knob");
  assert.equal(knob.getAttribute("aria-label"), "Bass trim");
  assert.equal(knob.getAttribute("aria-valuemin"), "-12");
  assert.equal(knob.getAttribute("aria-valuemax"), "24");
  assert.equal(knob.getAttribute("aria-valuetext"), "0 dB");
  // 0 dB is a third of the travel: the ring is empty there.
  assert.equal(knob.style.getPropertyValue("--knob-from"), "90");
  assert.equal(knob.style.getPropertyValue("--knob-to"), "90");
  key(knob, "ArrowRight");
  assert.equal(seen.at(-1), 0.5, "an arrow moves it 0.5 dB");
  mod.update(def(trim(12)));
  assert.equal(knob.getAttribute("aria-valuetext"), "+12 dB");
  assert.equal(field.querySelector("[data-nc-readout]").textContent, "+12 dB");
  assert.equal(knob.style.getPropertyValue("--knob-from"), "90");
  assert.equal(knob.style.getPropertyValue("--knob-to"), "180");
  mod.update(def(trim(-6)));
  assert.equal(knob.style.getPropertyValue("--knob-from"), "45");
  assert.equal(knob.style.getPropertyValue("--knob-to"), "90");
  knob.dispatchEvent(new Event("dblclick", { bubbles: true }));
  assert.equal(seen.at(-1), 0, "double-click: back to 0 dB");
});

test("trimHidden takes the row out (the knob kept, unseen); no trim, no row", () => {
  const trim = { id: "trim-bass", value: 3, onChange() {} };
  const mod = defineModule(def(trim, { trimHidden: true }), "test.trim.hidden");
  for (const s of mod.el.querySelectorAll(".nc-strip")) assert.ok(!s.hasAttribute("data-nc-trim"), "every strip");
  assert.ok(mod.el.querySelector(".nc-strip-trim .nc-field"), "the knob stays");
  mod.update(def(trim));
  for (const s of mod.el.querySelectorAll(".nc-strip")) assert.ok(s.hasAttribute("data-nc-trim"));
  const plain = defineModule(def(null), "test.trim.none");
  for (const s of plain.el.querySelectorAll(".nc-strip")) assert.ok(!s.hasAttribute("data-nc-trim"), "no trim: as before");
});

test("trim CSS: a named knob row at the top; the old layouts unchanged without it; folded joins M and S", () => {
  const areas = (sel) => rule(sel).match(/grid-template-areas:([^;]*)/)[1].match(/"[^"]*"/g);
  const knobRows = (sel) => rule(sel).match(/grid-template-rows:([^;]*)/)[1].split("var(--nc-strip-knob-row)").length - 1;
  assert.deepEqual(areas(".nc-strip"), ['". hd ."', '". hacks ."', '"ms ms ms"', '". sends ."', '". pan ."', '". body ."', '". db ."']);
  assert.deepEqual(areas(".nc-strip[data-nc-trim]"), ['". hd ."', '". trim ."', '". hacks ."', '"ms ms ms"', '". sends ."', '". pan ."', '". body ."', '". db ."']);
  assert.equal(knobRows(".nc-strip[data-nc-trim]"), 3);
  assert.deepEqual(areas(".nc-strip[data-nc-trim][data-nc-sends-hidden]"), ['". hd ."', '". trim ."', '". hacks ."', '"ms ms ms"', '". pan ."', '". body ."', '". db ."']);
  assert.equal(knobRows(".nc-strip[data-nc-trim][data-nc-sends-hidden]"), 2);
  assert.equal(areas(".nc-strip[data-nc-folded][data-nc-trim]").length, 8);
  assert.equal(areas(".nc-strip[data-nc-folded][data-nc-trim][data-nc-sends-hidden]").length, 7);
  assert.match(rule(".nc-strip > .nc-strip-trim"), /grid-area: trim;/);
  assert.match(css, /\.nc-strip:not\(\[data-nc-trim\]\) > \.nc-strip-trim, \.nc-strip\[data-nc-folded\] > \.nc-strip-trim \{ display: none; \}/);
});
