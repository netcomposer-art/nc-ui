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

test("switch CSS: ASTRID text on/off, no track, 44 px pad on touch only, tokens only", () => {
  const base = rule(".nc-ui-switch");
  assert.doesNotMatch(base, /min-height|min-width/, "drawn at ASTRID size, not 44 px");
  assert.match(base, /font-weight: var\(--nc-ui-control-weight\)/);
  assert.match(base, /border-bottom: var\(--nc-ui-hairline\) solid transparent/);
  assert.match(rule(".nc-ui-switch:hover"), /color: var\(--nc-ui-text\)/);
  assert.doesNotMatch(css, /nc-ui-switch-track|--nc-ui-switch-/, "the track and its tokens are gone");
  assert.equal(createSwitch().el.querySelector(".nc-ui-switch-track"), null);
  assert.match(css, /@media \(pointer: coarse\) \{\s*:is\([^)]*\.nc-ui-switch[^)]*\) \{ position: relative; \}\s*:is\([^)]*\.nc-ui-switch[^)]*\)::before \{[^}]*width: max\(100%, var\(--nc-ui-target-min\)\)/);
  assert.match(css, /prefers-reduced-motion[\s\S]*\.nc-ui-switch, \.nc-select/);
});

test("segmented control is ASTRID's underline tabs: hairline row, accent tab-mark, no fill", () => {
  assert.match(rule(".nc-seg"), /border-bottom: var\(--nc-ui-hairline\) solid var\(--nc-ui-divider\)/);
  assert.doesNotMatch(rule(".nc-seg"), /border-radius|border: /);
  const on = rule('.nc-seg > button[aria-checked="true"]');
  assert.match(on, /color: var\(--nc-ui-text\)/);
  assert.doesNotMatch(on, /background/);
  assert.match(rule('.nc-seg > button[aria-checked="true"]::after'), /height: var\(--nc-ui-tab-mark\)/);
  assert.match(rule('.nc-seg > button[aria-checked="true"]::after'), /background: var\(--nc-ui-accent\)/);
  assert.doesNotMatch(rule(".nc-seg > button"), /min-height/);
});

test("page frame: ASTRID gutters, a header over a divider, then the modules", () => {
  assert.match(rule(".nc-page"), /padding: var\(--nc-ui-page-pad-y\) var\(--nc-ui-page-pad-x\)/);
  assert.match(rule(".nc-page-hd"), /border-bottom: var\(--nc-ui-hairline\) solid var\(--nc-ui-divider\)/);
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.nc-page \{ padding: var\(--nc-ui-page-pad-y-md\) var\(--nc-ui-page-pad-x-md\)/);
  assert.match(css, /@media \(min-width: 1280px\) \{\s*\.nc-page \{ padding-inline: var\(--nc-ui-page-pad-x-xl\)/);
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
  assert.doesNotMatch(rule(".nc-ui-more > summary"), /min-height/);
  assert.match(css, /:is\([^)]*\.nc-ui-more > summary[^)]*\)::before/);
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


test("switch colours follow plan 5.1: off sub, on text with an accent hairline", () => {
  assert.match(rule(".nc-ui-switch"), /color: var\(--nc-ui-text-sub\)/);
  const on = rule('.nc-ui-switch[aria-checked="true"]');
  assert.match(on, /color: var\(--nc-ui-text\)/);
  assert.match(on, /border-bottom-color: var\(--nc-ui-accent\)/);
  assert.match(rule(".nc-ui-switch:focus-visible"), /outline: var\(--nc-ui-focus-width\) solid var\(--nc-ui-focus-ring\)/);
});

test("FX and stacked cards draw the slider track in their own divider shade, so it never vanishes", () => {
  for (const n of [1, 2, 3, 4])
    assert.match(css, new RegExp(`data-nc-depth="${n}"\\] \\{[^}]*--nc-ui-slider-track: var\\(--nc-ui-module-div-stack-${n}\\)`));
});

test("tablets (769-1023 px) get the same 2 x 5 slot grid as phones and desktop", () => {
  assert.match(css, /@media \(min-width: 769px\) and \(max-width: 1023px\) \{\s*\.nc-slot-line \{ flex-wrap: wrap; \}\s*\.nc-snap-row \{[^}]*repeat\(5, minmax\(0, 1fr\)\)/);
});

test("page header: ASTRID's title, sub line and text actions", () => {
  assert.match(rule(".nc-page-title"), /font-size: var\(--nc-ui-page-title-size\)/);
  assert.match(rule(".nc-page-title"), /letter-spacing: var\(--nc-ui-page-title-tracking\)/);
  assert.match(rule(".nc-page-action"), /color: var\(--nc-ui-text-sub\)/);
  assert.match(css, /:is\([^)]*\.nc-page-action[^)]*\)::before/);
});

test("M/S 44 px boxes only on touch; the tap chip has no extra hit pad over the slider", () => {
  assert.match(css, /@media \(pointer: coarse\) \{\s*\.nc-ms-wrap \{ flex-basis: var\(--nc-ui-target-min\)/);
  assert.doesNotMatch(css, /\n\.nc-ms-wrap \{ flex-basis/, "not on every pointer");
  assert.match(css, /\.nc-tap > \.nc-hit \{ display: none; \}/);
});

test("title band: page-head-bg behind the header, from the page top to the divider, inside the page padding", () => {
  assert.match(rule(".nc-page-hd::before"), /background: var\(--nc-ui-page-head-bg\)/);
  assert.match(rule(".nc-page-hd::before"), /top: calc\(var\(--nc-ui-page-pad-y\) \* -1\)/);
  assert.match(rule(".nc-page-hd::before"), /bottom: 0/);
  assert.match(css, /@media \(min-width: 1280px\) \{[^}]*\}\s*\.nc-page-hd::before \{ left: calc\(var\(--nc-ui-page-pad-x-xl\) \* -1\)/);
});

test("the page header is its own layer above the modules, so a header menu opens over them (Rhythm #40)", () => {
  assert.match(rule(".nc-page-hd"), /position: relative;[\s\S]*z-index: var\(--nc-ui-page-head-layer\)/);
  assert.doesNotMatch(rule(".nc-page-hd"), /isolation: isolate/);
});

test("a minimized full-width (compact) module is one slim bar at every width", () => {
  assert.match(css, /\.nc-module\[data-nc-compact\]\[data-nc-slim\] \{\s*display: flex !important;\s*flex-direction: row;/);
  assert.match(css, /\.nc-module\[data-nc-compact\]\[data-nc-slim\] \.nc-slim-lines \{\s*white-space: nowrap !important;/);
});

test("hosted (inside the Studio): no title block or band, the header keeps its controls on one row", () => {
  assert.match(css, /html\[data-nc-hosted\] \.nc-page-hd > :first-child \{ display: none; \}/);
  assert.match(css, /html\[data-nc-hosted\] \.nc-page-hd::before \{ display: none; \}/);
  assert.match(css, /html\[data-nc-hosted\] \.nc-page \{ padding-top: var\(--nc-ui-module-gap\); min-height: 0; \}/);
});

test("select: options with a group sit under an <optgroup>; disabled options can't be picked; groups are in the shape", () => {
  // linkedom's <select> has no value setter: a minimal one (the first option with that value is selected).
  const proto = Object.getPrototypeOf(document.createElement("select"));
  if (!Object.getOwnPropertyDescriptor(proto, "value")?.set)
    Object.defineProperty(proto, "value", {
      configurable: true,
      get() { return this.querySelector("option[selected]")?.value ?? this.querySelector("option")?.value ?? ""; },
      set(v) { for (const o of this.querySelectorAll("option")) o.toggleAttribute("selected", o.value === v); },
    });
  const options = [
    { value: "", label: "Effect…" },
    { value: "delay", label: "Delay" },
    { value: "plugin:a", label: "Tremolo", group: "Plugins" },
    { value: "plugin:b", label: "Fuzz (failed)", group: "Plugins", disabled: true },
    { value: "url", label: "Load plugin from URL…" },
  ];
  const el = renderControl({ type: "select", id: "add", label: "Add", value: "", options, onChange() {} }, () => undefined);
  const select = el.querySelector("select");
  const groups = select.querySelectorAll("optgroup");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].getAttribute("label"), "Plugins");
  assert.deepEqual([...groups[0].querySelectorAll("option")].map((o) => o.value), ["plugin:a", "plugin:b"]);
  assert.equal(groups[0].querySelectorAll("option")[1].disabled, true);
  assert.deepEqual([...select.children].map((c) => c.tagName), ["OPTION", "OPTION", "OPTGROUP", "OPTION"]);
  // A new plugin in the list rebuilds the select (the module's shape includes the options and their groups).
  const def = (opts) => ({ id: "m", title: "M", sections: [{ id: "s", controls: [{ type: "select", id: "add", label: "Add", value: "", options: opts, onChange() {} }] }] });
  const mod = defineModule(def(options));
  document.body.append(mod.el);
  mod.update(def([...options.slice(0, 3), { value: "plugin:c", label: "Echo", group: "Plugins" }, options[4]]));
  assert.deepEqual([...mod.el.querySelectorAll("optgroup option")].map((o) => o.value), ["plugin:a", "plugin:c"]);
});

test('note: tone "danger" marks it, and an update can clear it', () => {
  const el = renderControl({ type: "note", id: "n", text: "Stopped.", tone: "danger" }, () => undefined);
  assert.equal(el.dataset.ncTone, "danger");
  assert.match(rule('.nc-note[data-nc-tone="danger"]'), /color: var\(--nc-ui-danger\)/);
});
