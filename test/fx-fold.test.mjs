import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { document } = installDom();
const { renderControl, patchControl } = await import("../src/primitives/controls.js");
const { defineModule } = await import("../src/module/define-module.js");
const { kitCss } = await import("../src/primitives/kit.js");

const css = kitCss();

function foldable(state) {
  const control = {
    type: "fx",
    id: "mix-a",
    title: "A · Reverb",
    depth: 1,
    on: state.on,
    onToggle: (on) => state.toggles.push(on),
    folded: state.folded,
    onFold: (folded) => state.folds.push(folded),
    foldHelp: "Folds this effect into a narrow column. It keeps sounding.",
    controls: [{ type: "slider", id: "a-level", label: "Level", min: 0, max: 1, step: 0.01, value: 0.5, onChange() {} }],
  };
  return control;
}

test("FX fold: a −/+ after the switch, aria-expanded, help words; folded draws one button that unfolds", () => {
  const state = { on: true, folded: false, toggles: [], folds: [] };
  let control = foldable(state);
  const card = renderControl(control, () => control);
  document.body.append(card);
  const head = card.querySelector(":scope > .nc-ui-fx-hd");
  const parts = [...head.children].map((n) => n.className || n.getAttribute("role"));
  assert.deepEqual(parts.slice(0, 1), ["nc-ui-fx-name"]);
  const sw = head.querySelector('[role="switch"]');
  const hide = head.querySelector("[data-nc-fx-hide]");
  assert.ok(sw && hide);
  assert.equal(hide.previousElementSibling, sw, "the toggle sits next to ON/OFF");
  assert.equal(hide.tagName, "BUTTON");
  assert.equal(hide.getAttribute("type"), "button");
  assert.equal(hide.className, "nc-hide");
  assert.equal(hide.textContent, "−");
  assert.equal(hide.getAttribute("aria-expanded"), "true");
  assert.equal(hide.getAttribute("aria-label"), "Hide A · Reverb");
  assert.match(hide.getAttribute("data-nc-help"), /narrow column/);
  assert.equal(card.dataset.ncFolded, undefined);
  const fold = card.querySelector(":scope > [data-nc-fx-fold]");
  assert.ok(fold);
  assert.equal(fold.hidden, true);

  click(hide);
  assert.deepEqual(state.folds, [true]);
  state.folded = true;
  control = foldable(state);
  patchControl(card, control);
  assert.equal(card.dataset.ncFolded, "true");
  assert.equal(hide.textContent, "+");
  assert.equal(hide.getAttribute("aria-expanded"), "false");
  assert.equal(hide.getAttribute("aria-label"), "Show A · Reverb");
  assert.equal(fold.hidden, false);
  assert.equal(fold.tagName, "BUTTON");
  assert.equal(fold.getAttribute("type"), "button");
  assert.equal(fold.getAttribute("aria-expanded"), "false");
  assert.equal(fold.getAttribute("aria-label"), "Show A · Reverb, on");
  assert.equal(fold.dataset.on, "true");
  assert.equal(fold.querySelector("[data-nc-fx-fold-name]").textContent, "A · Reverb");
  assert.equal(fold.querySelector("[data-nc-fx-fold-state]").textContent, "On");
  assert.match(fold.getAttribute("data-nc-help"), /narrow column/);
  assert.deepEqual(state.toggles, [], "folding never switches the effect");
  assert.equal(sw.getAttribute("aria-checked"), "true");

  state.on = false;
  control = foldable(state);
  patchControl(card, control);
  assert.equal(fold.getAttribute("aria-label"), "Show A · Reverb, off");
  assert.equal(fold.querySelector("[data-nc-fx-fold-state]").textContent, "Off");
  assert.equal(card.dataset.ncDim, "true");

  click(fold);
  assert.deepEqual(state.folds, [true, false]);
  state.folded = false;
  control = foldable(state);
  patchControl(card, control);
  assert.equal(card.dataset.ncFolded, undefined);
  assert.equal(fold.hidden, true);
  assert.equal(hide.getAttribute("aria-expanded"), "true");
  card.remove();
});

test("FX fold: no onFold, no toggle and no folded column (and `folded` alone does nothing)", () => {
  const control = { type: "fx", id: "d", title: "Drive", depth: 1, on: true, folded: true, controls: [] };
  const card = renderControl(control, () => control);
  assert.equal(card.querySelector("[data-nc-fx-hide]"), null);
  assert.equal(card.querySelector("[data-nc-fx-fold]"), null);
  assert.equal(card.dataset.ncFolded, undefined);
});

test("FX fold in a module: folding is a patch (same nodes, so focus stays), not a rebuild", () => {
  const state = { on: true, folded: false, toggles: [], folds: [] };
  const def = () => ({ id: "mixf", title: "Mix", layout: "console", sections: [{ id: "fx", area: "fx", controls: [foldable(state)] }] });
  const mod = defineModule(def(), "test.fold.hidden");
  const before = mod.el.querySelector('[data-nc-id="mix-a"]');
  state.folded = true;
  mod.update(def());
  const after = mod.el.querySelector('[data-nc-id="mix-a"]');
  assert.equal(after, before);
  assert.equal(after.dataset.ncFolded, "true");
});

test("FX fold CSS: tokens only, a narrow console column from 769 px, header row elsewhere, no motion", () => {
  assert.match(css, /\.nc-ui-fx\[data-nc-folded\] > :not\(\.nc-ui-fx-hd, \.nc-token-probe\) \{ display: none; \}/);
  assert.match(css, /width: var\(--nc-ui-fx-fold-width\);/);
  assert.match(css, /@media \(min-width: 769px\) \{\s*\.nc-module-body\[data-nc-layout="console"\] > \[data-nc-area="fx"\]:has\(> \.nc-ui-fx\[data-nc-folded\]\) \{\s*display: flex;/);
  const name = css.slice(css.indexOf("\n.nc-ui-fx-fold-name {"), css.indexOf("}", css.indexOf("\n.nc-ui-fx-fold-name {")));
  assert.match(name, /writing-mode: vertical-rl;/);
  assert.match(name, /transform: rotate\(180deg\);/);
  const fold = css.slice(css.indexOf("\n.nc-ui-fx-fold {\n"), css.indexOf("}", css.indexOf("\n.nc-ui-fx-fold {\n")));
  assert.match(fold, /transition: none;/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.nc-ui-fx-fold\b/);
  assert.match(css, /\.nc-ui-fx-fold\[data-on="true"\] \.nc-ui-fx-fold-state \{ color: var\(--nc-ui-text\); border-bottom-color: var\(--nc-ui-accent\); \}/);
});

function stripControl(state) {
  return {
    type: "strip",
    id: "strip-bass",
    label: "Bass",
    value: 0.75,
    step: 0.01,
    valueText: "−9.0",
    onChange: (v) => state.levels.push(v),
    onMute: () => state.ms.push("m"),
    onSolo: () => state.ms.push("s"),
    onRemove: () => state.removed++,
    folded: state.folded,
    onFold: (folded) => state.folds.push(folded),
    foldHelp: "Minimizes this channel.",
    foldedHelp: "Bass, minimized.",
  };
}

test("strip fold: − first, the name between, × right after it; folded keeps M, S, the meter and a name button", () => {
  const state = { folded: false, folds: [], levels: [], ms: [], removed: 0 };
  let control = stripControl(state);
  const strip = renderControl(control, () => control);
  document.body.append(strip);
  const head = strip.querySelector(".nc-strip-hd");
  assert.equal(head.firstElementChild.dataset.ncStripHide, "", "minimize first");
  assert.equal(head.lastElementChild.dataset.ncStripRemove, "", "remove last");
  const hide = head.firstElementChild;
  assert.equal(hide.className, "nc-hide");
  assert.equal(hide.getAttribute("aria-expanded"), "true");
  assert.equal(hide.getAttribute("aria-label"), "Minimize Bass");
  assert.equal(hide.getAttribute("data-nc-help"), "Minimizes this channel.");
  assert.equal(head.lastElementChild.hasAttribute("data-nc-help"), false, "the × is unchanged: no new words");
  assert.equal(head.lastElementChild.previousElementSibling, head.querySelector(".nc-strip-name"), "× right after the name");
  const fold = strip.querySelector(".nc-strip-body > [data-nc-strip-fold]");
  assert.ok(fold);
  assert.equal(fold.hidden, true);
  click(hide);
  assert.deepEqual(state.folds, [true]);
  assert.equal(state.removed, 0, "minimize never removes");
  state.folded = true;
  control = stripControl(state);
  patchControl(strip, control);
  assert.equal(strip.dataset.ncFolded, "true");
  assert.equal(hide.textContent, "+");
  assert.equal(hide.getAttribute("aria-label"), "Show Bass");
  assert.equal(fold.hidden, false);
  assert.equal(fold.getAttribute("aria-expanded"), "false");
  assert.equal(fold.getAttribute("aria-label"), "Show Bass");
  assert.equal(fold.getAttribute("data-nc-help"), "Bass, minimized.");
  assert.equal(fold.querySelector("[data-nc-strip-fold-name]").textContent, "Bass");
  assert.ok(fold.querySelector(".nc-strip-fold-cap"));
  click(strip.querySelector('[data-nc-ms="mute"]').parentElement);
  click(strip.querySelector('[data-nc-ms="solo"]').parentElement);
  assert.deepEqual(state.ms, ["m", "s"], "M and S still work folded");
  assert.deepEqual(state.levels, [], "folding never moves the fader");
  click(fold);
  assert.deepEqual(state.folds, [true, false]);
  strip.remove();
});

test("strip fold: never on the master; CSS is a narrow column of tokens with the meter on its row", () => {
  const control = { ...stripControl({ folds: [], levels: [], ms: [] }), master: true, folded: true };
  const strip = renderControl(control, () => control);
  assert.equal(strip.querySelector("[data-nc-strip-hide]"), null);
  assert.equal(strip.dataset.ncFolded, undefined);
  assert.match(css, /\.nc-strip\[data-nc-folded\] \{ width: var\(--nc-ui-strip-fold-width\); padding-inline: 0; align-content: start; \}/);
  assert.match(css, /\.nc-strip\[data-nc-foldable\] > \.nc-strip-hd \{\s*justify-content: flex-start;/);
  assert.match(css, /\.nc-strip-hd > \[data-nc-strip-hide\] \{[^}]*margin-inline-end: auto;/);
  assert.match(css, /\.nc-strip\[data-nc-folded\] > \.nc-strip-body \{\s*grid-row: 5;/);
  assert.match(css, /\.nc-strip-fold-cap \{[^}]*background: var\(--nc-strip-cap, var\(--nc-ui-fader-cap\)\);/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.nc-strip \{|\.nc-strip,|, \.nc-strip \{/);
});
