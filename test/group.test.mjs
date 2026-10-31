import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { document, window } = installDom();
// A Storage in memory, as the browser's localStorage.
const store = new Map();
const storage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
const { GROUP_OPEN_KEY, readGroups, writeGroup } = await import("../src/primitives/group.js");
const { defineModule } = await import("../src/module/define-module.js");
const { kitCss } = await import("../src/primitives/kit.js");
const index = await import("../src/index.js");

const seen = [];
function def(over = {}) {
  return {
    id: "params",
    title: "Params",
    controls: [
      { type: "label", id: "slices", text: "Slices" },
      {
        type: "group",
        id: "tune-shape",
        title: "Tune & shape",
        summary: "+3 st · decay 450 ms",
        onToggle: (open) => seen.push(open),
        controls: [
          { type: "label", id: "pitch-label", text: "Pitch" },
          { type: "slider", id: "tune", label: "Tune", min: -24, max: 24, step: 1, value: 3, valueText: "+3 st", onChange() {} },
        ],
        ...over,
      },
      { type: "label", id: "out-label", text: "Output" },
    ],
  };
}

test("group: a header button over its controls, closed by default, aria-expanded and aria-controls", () => {
  store.clear();
  const m = defineModule(def());
  document.body.append(m.el);
  const group = m.el.querySelector('.nc-group[data-nc-id="tune-shape"]');
  assert.ok(group, "rendered");
  const toggle = group.querySelector(":scope > button.nc-group-toggle");
  const body = group.querySelector(":scope > .nc-group-body");
  assert.equal(toggle.getAttribute("type"), "button");
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  assert.equal(toggle.getAttribute("aria-controls"), body.id);
  assert.equal(body.getAttribute("role"), "group");
  assert.equal(body.getAttribute("aria-labelledby"), toggle.id);
  assert.equal(body.hidden, true);
  assert.equal(group.dataset.ncOpen, "false");
  assert.equal(toggle.querySelector(".nc-group-title").textContent, "Tune & shape");
  assert.equal(toggle.querySelector(".nc-group-summary").textContent, "+3 st · decay 450 ms");
  assert.equal(toggle.querySelector(".nc-group-mark").textContent, "+");
  // Its controls are inside it, in order, and the module's own come before and after it.
  assert.deepEqual(
    [...body.querySelectorAll(":scope > [data-nc-id]")].map((el) => el.dataset.ncId),
    ["pitch-label", "tune"],
  );
  const ids = [...m.el.querySelectorAll(".nc-section > [data-nc-id]")].map((el) => el.dataset.ncId);
  assert.deepEqual(ids, ["slices", "tune-shape", "out-label"]);
  m.el.remove();
});

test("group: a click (or Enter / Space on the button) opens and closes it, tells the host, and is remembered", () => {
  store.clear();
  seen.length = 0;
  const m = defineModule(def());
  document.body.append(m.el);
  const toggle = m.el.querySelector(".nc-group-toggle");
  const body = m.el.querySelector(".nc-group-body");
  // A native button: the browser turns Enter and Space into this click.
  assert.equal(toggle.tagName, "BUTTON");
  click(toggle);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.equal(body.hidden, false);
  assert.equal(toggle.querySelector(".nc-group-mark").textContent, "−");
  assert.deepEqual(seen, [true]);
  assert.deepEqual(JSON.parse(store.get(GROUP_OPEN_KEY)), { "tune-shape": true });
  // A new module (a reload, another copy of the app) opens it as left.
  const again = defineModule(def());
  assert.equal(again.el.querySelector(".nc-group-toggle").getAttribute("aria-expanded"), "true");
  click(toggle);
  assert.equal(body.hidden, true);
  assert.deepEqual(seen, [true, false]);
  assert.equal(readGroups(storage).get("tune-shape"), false);
  m.el.remove();
});

test("group: an update patches the summary and the controls in place and keeps the open state", () => {
  store.clear();
  const m = defineModule(def());
  document.body.append(m.el);
  const toggle = m.el.querySelector(".nc-group-toggle");
  click(toggle);
  const input = m.el.querySelector('[data-nc-id="tune"] input');
  const next = def({ summary: "" });
  next.controls[1].controls[1] = { ...next.controls[1].controls[1], value: 5, valueText: "+5 st" };
  m.update(next);
  assert.equal(m.el.querySelector('[data-nc-id="tune"] input'), input, "patched, not rebuilt");
  assert.equal(input.value, "5");
  assert.equal(m.el.querySelector('[data-nc-id="tune"] [data-nc-readout]').textContent, "+5 st");
  assert.equal(m.el.querySelector(".nc-group-summary").textContent, "");
  assert.equal(m.el.querySelector(".nc-group-toggle").getAttribute("aria-expanded"), "true");
  // A control added inside it rebuilds the body; the group stays open (the browser remembers it).
  const more = def();
  more.controls[1].controls.push({ type: "label", id: "shape-label", text: "Shape" });
  m.update(more);
  assert.equal(m.el.querySelector(".nc-group-toggle").getAttribute("aria-expanded"), "true");
  assert.ok(m.el.querySelector('.nc-group-body [data-nc-id="shape-label"]'));
  m.el.remove();
});

test("group: `open` is the first state; storage that throws or holds junk is ignored", () => {
  store.clear();
  assert.equal(defineModule(def({ open: true })).el.querySelector(".nc-group-body").hidden, false);
  store.set(GROUP_OPEN_KEY, "not json");
  assert.equal(readGroups(storage).size, 0);
  store.set(GROUP_OPEN_KEY, JSON.stringify({ "tune-shape": "yes", other: true }));
  assert.deepEqual([...readGroups(storage)], [["other", true]]);
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(readGroups(broken).size, 0);
  writeGroup(broken, "x", true); // no throw
  assert.equal(index.GROUP_OPEN_KEY, GROUP_OPEN_KEY);
  assert.equal(typeof index.writeGroup, "function");
  void window;
});

test("group CSS: the More toggle's look and touch target, tokens only, no motion", () => {
  const css = kitCss();
  const block = (sel) => {
    const at = css.indexOf(`\n${sel} {`);
    assert.ok(at >= 0, sel);
    return css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  };
  const toggle = block(".nc-group-toggle");
  for (const d of ["label-size", "label-weight", "label-tracking", "text-sub", "control-gap"])
    assert.match(toggle, new RegExp(`--nc-ui-${d}\\b`), d);
  assert.match(toggle, /text-transform: uppercase/);
  assert.doesNotMatch(css.slice(css.indexOf(".nc-group {"), css.indexOf(".nc-group-body[hidden]")), /transition|animation|\d+px|#[0-9a-f]{3,6}\b/i);
  // The coarse-pointer hit pad (target-min) covers it, as it does More.
  assert.match(css, /\.nc-ui-more > summary, \.nc-group-toggle, \.nc-page-action\)::before/);
  assert.match(css, /\.nc-group\[data-nc-open="true"\] \.nc-group-summary \{ display: none; \}/);
});
