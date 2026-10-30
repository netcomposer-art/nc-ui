import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { document } = installDom();
const { createFader, faderHandle } = await import("../src/primitives/fader.js");
const { createMeter, meterHandle, cssSeconds } = await import("../src/primitives/meter.js");
const { stripMeter } = await import("../src/primitives/controls.js");
const { defineModule } = await import("../src/module/define-module.js");
const { kitCss } = await import("../src/primitives/kit.js");

const css = kitCss();
function rule(selector) {
  const at = css.indexOf(`\n${selector} {`);
  assert.ok(at >= 0, `rule ${selector}`);
  return css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
}
const key = (el, k, shiftKey = false) => {
  const e = new Event("keydown", { bubbles: true });
  Object.assign(e, { key: k, shiftKey });
  el.dispatchEvent(e);
};

test("createFader: a vertical slider (role, orientation, value text) moved by keys, reset by double-click", () => {
  const seen = [];
  let resets = 0;
  const f = createFader({ label: "Bass level", value: 0.5, step: 0.01, valueText: "−6.0", onChange: (v) => seen.push(v), onReset: () => resets++ });
  assert.equal(f.el.getAttribute("role"), "slider");
  assert.equal(f.el.getAttribute("aria-orientation"), "vertical");
  assert.equal(f.el.getAttribute("aria-label"), "Bass level");
  assert.equal(f.el.getAttribute("aria-valuetext"), "−6.0");
  assert.equal(f.el.style.getPropertyValue("--fader-pos"), "0.5");
  assert.ok(f.el.querySelector(".nc-fader-cap"), "a flat cap, not the round thumb");
  key(f.el, "ArrowUp");
  key(f.el, "PageDown");
  key(f.el, "ArrowUp", true);
  assert.deepEqual(seen.map((v) => Math.round(v * 10000) / 10000), [0.51, 0.41, 0.4125]);
  key(f.el, "End");
  key(f.el, "End");
  assert.equal(seen.at(-1), 1);
  assert.equal(seen.length, 4, "no change, no onChange");
  f.el.dispatchEvent(new Event("dblclick"));
  assert.equal(resets, 1);
  f.set(0.2);
  assert.equal(f.value, 0.2);
  assert.equal(seen.length, 4, "set() does not call onChange");
  assert.equal(faderHandle(f.el), f);
});

test("createMeter: rises at once, falls back, holds its peak, and the clip light latches until clicked", () => {
  let cleared = 0;
  const m = createMeter({ channels: 2, label: "Master", onClear: () => cleared++ });
  const bars = m.el.querySelectorAll(".nc-meter-bar");
  assert.equal(bars.length, 2, "stereo: two-sided");
  assert.equal(m.el.querySelector(".nc-meter-bars").getAttribute("aria-hidden"), "true");
  const rms = () => bars[0].querySelector(".nc-meter-rms").style.transform;
  const peak = () => bars[0].querySelector(".nc-meter-peak").style.transform;
  m.update([{ peak: 0.8, rms: 0.5 }, { peak: 0.7, rms: 0.4 }], 0.016);
  assert.equal(peak(), "scaleY(0.8)");
  assert.equal(rms(), "scaleY(0.5)");
  m.update([{ peak: 0, rms: 0 }, { peak: 0, rms: 0 }], 0.1);
  const after = Number(peak().match(/[\d.]+/)[0]);
  assert.ok(after > 0 && after < 0.8, `falls back, not at once (${after})`);
  const hold = bars[0].querySelector(".nc-meter-hold");
  assert.equal(hold.style.transform, "translateY(20%)", "the hold line stays at the peak");
  assert.equal(m.clipped, false);
  m.update([{ peak: 1, rms: 0.7, over: true }], 0.016);
  m.update([{ peak: 0.1, rms: 0.1 }], 1);
  const light = m.el.querySelector(".nc-meter-clip");
  assert.equal(light.dataset.lit, "true", "latched");
  assert.equal(light.getAttribute("aria-pressed"), "true");
  click(light);
  assert.equal(light.dataset.lit, "false");
  assert.equal(cleared, 1);
  assert.equal(meterHandle(m.el), m);
  assert.equal(cssSeconds(".2s", 1), 0.2);
  assert.equal(cssSeconds("1500ms", 1), 1.5);
  assert.equal(cssSeconds("", 0.3), 0.3);
});

function consoleDef(state, calls) {
  const ticks = [
    { value: 0.9, label: "0" },
    { value: 0.5, label: "−24" },
  ];
  const strip = (id, label, extra = {}) => ({
    type: "strip",
    id,
    label,
    value: state[id],
    valueText: String(state[id]),
    defaultValue: 0.8,
    ticks,
    onChange: (v) => calls.push([id, v]),
    ...extra,
  });
  return {
    id: "mix",
    title: "Mix",
    layout: "console",
    sections: [
      {
        id: "strips",
        area: "strips",
        controls: [
          strip("bass", "Bass", {
            mute: state.mute,
            silent: state.mute,
            onMute: () => calls.push(["mute"]),
            onSolo: () => calls.push(["solo"]),
            sends: [{ id: "bass-a", label: "A", min: 0, max: 1, value: 0.25, defaultValue: 0, valueText: "−12 dB", onChange: (v) => calls.push(["send", v]) }],
          }),
        ],
      },
      { id: "fx", area: "fx", controls: [{ type: "fx", id: "rev", title: "Reverb", depth: 1, on: true, controls: [] }] },
      { id: "master", area: "master", controls: [strip("master", "Master", { master: true, channels: 2 })] },
    ],
  };
}

test("strip control: name, M/S, compact sends, fader + scale + meter, readout; patches in place", () => {
  const state = { bass: 0.8, master: 0.9, mute: false };
  const calls = [];
  const mod = defineModule(consoleDef(state, calls), "nc-ui.test.console");
  document.body.append(mod.el);
  const body = mod.el.querySelector(".nc-module-body");
  assert.equal(body.dataset.ncLayout, "console");
  assert.deepEqual([...body.children].map((n) => n.dataset.ncArea), ["strips", "fx", "master"]);
  const strip = mod.el.querySelector('.nc-strip[data-nc-id="bass"]');
  assert.equal(strip.querySelector(".nc-strip-name").textContent, "Bass");
  assert.equal(strip.querySelectorAll(".nc-ms").length, 2);
  assert.ok(strip.querySelector('.nc-field[data-nc-compact] .nc-knob'), "sends are compact knobs");
  assert.equal(strip.querySelector(".nc-knob").getAttribute("aria-valuetext"), "−12 dB");
  assert.deepEqual(
    [...strip.querySelector(".nc-strip-body").children].map((n) => n.className),
    ["nc-scale", "nc-fader", "nc-meter"],
  );
  assert.deepEqual([...strip.querySelectorAll(".nc-scale-tick")].map((t) => t.textContent), ["0", "−24"]);
  assert.equal(strip.querySelector(".nc-strip-db").textContent, "0.8");
  const master = mod.el.querySelector('.nc-strip[data-nc-id="master"]');
  assert.ok(master.hasAttribute("data-nc-master"));
  assert.equal(master.querySelectorAll(".nc-meter-bar").length, 2);
  assert.equal(master.querySelectorAll(".nc-ms").length, 0);
  assert.ok(master.querySelector(".nc-strip-ms") && master.querySelector(".nc-strip-sends"), "the master keeps the rows, so faders line up");

  // Interactions reach the live definition.
  click(strip.querySelector(".nc-ms-wrap"));
  key(strip.querySelector(".nc-fader"), "ArrowDown");
  strip.querySelector(".nc-strip-db").dispatchEvent(new Event("dblclick"));
  assert.deepEqual(calls.map((c) => c[0]), ["mute", "bass", "bass"]);
  assert.equal(calls[2][1], 0.8, "double-click on the readout returns to defaultValue");

  // Patch in place: same nodes, new values; the meter handle survives.
  const meter = stripMeter(mod.el, "bass");
  assert.ok(meter);
  state.bass = 0.3;
  state.mute = true;
  mod.update(consoleDef(state, calls));
  assert.equal(mod.el.querySelector('.nc-strip[data-nc-id="bass"]'), strip);
  assert.equal(stripMeter(mod.el, "bass"), meter);
  assert.equal(strip.querySelector(".nc-fader").style.getPropertyValue("--fader-pos"), "0.3");
  assert.equal(strip.querySelector('[data-nc-ms="mute"]').getAttribute("aria-pressed"), "true");
  assert.equal(strip.dataset.silent, "true");
  mod.el.remove();
});

test("console CSS: tokens only; strips scroll on phones with the master pinned; FX cards stack under", () => {
  for (const sel of [".nc-strip", ".nc-fader-cap", ".nc-meter-bar", ".nc-meter-rms", ".nc-meter-clip", ".nc-scale", ".nc-strip-body"]) {
    const r = rule(sel);
    assert.doesNotMatch(r, /#[0-9a-f]{3,8}\b|rgb|hsl|\d+px/i, `${sel} uses tokens only`);
  }
  assert.match(rule(".nc-strip"), /width: var\(--nc-ui-strip-width\)/);
  assert.match(rule(".nc-fader-cap"), /background: var\(--nc-ui-fader-cap\)/);
  assert.doesNotMatch(rule(".nc-fader-cap"), /border-radius/, "a flat cap");
  assert.match(rule(".nc-meter-peak, .nc-meter-rms"), /transform-origin: bottom/);
  assert.match(rule(".nc-meter-peak, .nc-meter-rms"), /transition: none/);
  assert.match(rule('.nc-meter-clip[data-lit="true"]'), /background: var\(--nc-ui-meter-clip\)/);
  assert.match(rule(".nc-meter-rms") + rule(".nc-meter-peak"), /meter-fill|meter-peak/);
  assert.match(css, /@media \(max-width: 1023px\) \{\s*\.nc-module-body\[data-nc-layout="console"\] \{[^}]*"strips master" "fx fx"/);
  assert.match(css, /\[data-nc-area="strips"\] \{[^}]*overflow-x: auto/);
});
