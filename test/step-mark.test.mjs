import assert from "node:assert/strict";
import { test } from "node:test";
import { installDom } from "./helpers/dom.mjs";

const { document } = installDom();
const { renderControl, patchControl } = await import("../src/primitives/controls.js");
const { kitCss } = await import("../src/primitives/kit.js");

// StepCell.mark (NYX: a step's bar number when it plays in one bar only of a longer pattern; Peter, 2026-11-07).
const grid = (steps) => ({
  type: "stepGrid",
  id: "grid",
  selectedRow: "a",
  playhead: -1,
  rows: [{ id: "a", label: "Groove 9", length: 4, steps }],
  onToggle() {},
});

test("a step's mark: on the grid and the phone pads, said after the step, and gone when the cell drops it", () => {
  const steps = [
    { on: true, accent: false, mark: "2", markLabel: "bar 2 of 2" },
    { on: false, accent: false },
    { on: true, accent: true, mark: "1", markLabel: "bar 1 of 2" },
    { on: false, accent: false, mark: "toolong" },
  ];
  let control = grid(steps);
  const node = renderControl(control, () => control);
  document.body.append(node);
  patchControl(node, control);
  const step = (i) => node.querySelector(`[data-nc-step="a:${i}"]`);
  const pad = (i) => node.querySelector(`.nc-pad[data-nc-pad="${i}"]`);
  assert.equal(step(0).getAttribute("data-nc-mark"), "2");
  assert.equal(step(0).getAttribute("aria-label"), "Groove 9 step 1, bar 2 of 2");
  assert.equal(step(1).hasAttribute("data-nc-mark"), false);
  assert.equal(step(1).getAttribute("aria-label"), "Groove 9 step 2");
  assert.equal(step(3).getAttribute("data-nc-mark"), "to", "two characters at most");
  assert.equal(pad(2).getAttribute("data-nc-mark"), "1");
  assert.equal(pad(2).getAttribute("aria-label"), "Groove 9 step 3, bar 1 of 2");
  control = grid(steps.map((s) => ({ on: s.on, accent: s.accent })));
  patchControl(node, control);
  assert.equal(step(0).hasAttribute("data-nc-mark"), false);
  assert.equal(pad(2).hasAttribute("data-nc-mark"), false);
  assert.equal(step(0).getAttribute("aria-label"), "Groove 9 step 1");
});

test("the mark's CSS: the corner, token sizes, paper ink on a filled step, above the accent bar", () => {
  const css = kitCss();
  assert.match(css, /:is\(\.nc-step, \.nc-pad\)\[data-nc-mark\]::after \{[^}]*content: attr\(data-nc-mark\)/);
  assert.match(css, /:is\(\.nc-step, \.nc-pad\)\[aria-pressed="true"\]\[data-nc-mark\]::after \{ color: var\(--nc-rhythm-accent-mark\)/);
  assert.match(css, /\[data-accent="true"\]\[data-nc-mark\]::after \{\s*bottom: calc\(/);
  const block = css.slice(css.indexOf("[data-nc-mark]::after {"), css.indexOf("}", css.indexOf("[data-nc-mark]::after {")));
  assert.doesNotMatch(block, /\d+px/, "tokens only");
  assert.match(block, /var\(--nc-rhythm-step-mark-size\)/);
});
