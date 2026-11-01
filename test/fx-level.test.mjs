// The FX card's level meter (fx-level.js, controls.js): the scale, where it sits, the shared loop opening the host's
// source only while the meter is in the page and the page is visible, ballistics, the clip colour, and the sheet.
import assert from "node:assert/strict";
import { test } from "node:test";
import { installDom } from "./helpers/dom.mjs";

const { document } = installDom();
const { renderControl, patchControl } = await import("../src/primitives/controls.js");
const { fxLevelPosition, fxLevelState, FX_LEVEL_FLOOR_DB, FX_LEVEL_CLIP_DB } = await import("../src/primitives/fx-level.js");
const { kitCss } = await import("../src/primitives/kit.js");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function source(log, level = { in: 0.5, out: 0.25 }) {
  const s = { level, open: () => (log.push("open"), true), close: () => log.push("close"), read: () => s.level };
  return s;
}
function card(id, extra = {}) {
  return {
    type: "fx", id, title: "1 · Drive", depth: 1, on: true, onToggle() {}, folded: false, onFold() {},
    controls: [{ type: "slider", id: `${id}-d`, label: "Drive", min: 0, max: 24, step: 1, value: 6, onChange() {} }],
    ...extra,
  };
}
const fills = (el) => [...el.querySelectorAll('[data-nc-fx-level="head"] .nc-fx-level-fill')];
const scale = (fill) => Number(/scaleY\(([\d.]+)\)/.exec(fill.style.transform)?.[1] ?? Number.NaN);

test("scale: −48..0 dBFS, like the strips; clip colour from −1 dBFS", () => {
  assert.equal(FX_LEVEL_FLOOR_DB, -48);
  assert.equal(FX_LEVEL_CLIP_DB, -1);
  assert.equal(fxLevelPosition(0), 0);
  assert.equal(fxLevelPosition(Number.NaN), 0);
  assert.equal(fxLevelPosition(1), 1);
  assert.equal(fxLevelPosition(2), 1);
  assert.ok(Math.abs(fxLevelPosition(10 ** (-24 / 20)) - 0.5) < 1e-9);
  assert.equal(fxLevelPosition(10 ** (-60 / 20)), 0);
});

test("a card with a meter: two bars beside the switch, aria-hidden, and again in the folded column; none without", () => {
  const log = [];
  const c = card("fx-a", { meter: source(log), meterHelp: "Level in and out" });
  const el = renderControl(c, () => c);
  const head = el.querySelector(".nc-ui-fx-hd");
  const level = head.querySelector('[data-nc-fx-level="head"]');
  assert.ok(level);
  assert.equal(level.getAttribute("aria-hidden"), "true");
  assert.equal(level.getAttribute("data-nc-help"), "Level in and out");
  assert.equal(level.nextElementSibling, head.querySelector("[data-nc-fx-switch]"), "just before the switch");
  assert.deepEqual([...level.children].map((b) => b.dataset.ncLevel), ["in", "out"]);
  assert.ok(el.querySelector('.nc-ui-fx-fold > [data-nc-fx-level="fold"]'), "the folded column has one too");
  const plain = card("fx-b");
  assert.equal(renderControl(plain, () => plain).querySelector(".nc-fx-level"), null);
  // A card with only a meter still gets the header row.
  const bare = { type: "fx", id: "fx-c", title: "A · Reverb", depth: 1, controls: [], meter: source([]) };
  assert.ok(renderControl(bare, () => bare).querySelector(".nc-ui-fx-hd > .nc-fx-level"));
});

test("loop: opens the source while in the page, draws peaks with ballistics, gives it back when the card goes", async () => {
  const log = [];
  const src = source(log);
  const c = card("fx-d", { meter: src });
  const el = renderControl(c, () => c);
  await wait(40);
  assert.deepEqual(log, [], "not in the page yet");
  document.body.append(el);
  patchControl(el, c);
  await wait(120);
  assert.deepEqual(log, ["open"]);
  const level = el.querySelector('[data-nc-fx-level="head"]');
  assert.equal(fxLevelState(level).open, true);
  assert.equal(fxLevelState(level).running, true);
  const [fin, fout] = fills(el);
  assert.ok(Math.abs(scale(fin) - fxLevelPosition(0.5)) < 0.01, `in ${fin.style.transform}`);
  assert.ok(Math.abs(scale(fout) - fxLevelPosition(0.25)) < 0.01);
  assert.equal(fin.dataset.clip, "false");
  // The folded column's copy shows the same.
  const fold = el.querySelectorAll('[data-nc-fx-level="fold"] .nc-fx-level-fill');
  assert.equal(fold[0].style.transform, fin.style.transform);
  // Silence: it falls back (motion-meter-fall), not at once.
  src.level = { in: 0, out: 0 };
  await wait(40);
  const falling = scale(fin);
  assert.ok(falling > 0 && falling < fxLevelPosition(0.5), `falling ${falling}`);
  await wait(1500);
  assert.equal(scale(fin), 0);
  // Near full scale: the clip colour.
  src.level = { in: 0.95, out: 0.5 };
  await wait(80);
  assert.equal(fin.dataset.clip, "true");
  assert.equal(fout.dataset.clip, "false");
  // Input only (a bare number): one bar.
  src.level = 0.3;
  await wait(80);
  assert.equal(level.dataset.ncRows, "1");
  el.remove();
  await wait(120);
  assert.deepEqual(log, ["open", "close"]);
  assert.equal(fxLevelState(level).open, false);
});

test("one shared loop for every meter; a new source swaps cleanly; a hidden page closes them all", async () => {
  const la = [], lb = [], lc = [];
  const a = card("fx-e", { meter: source(la) });
  const b = card("fx-f", { meter: source(lb) });
  const ea = renderControl(a, () => a), eb = renderControl(b, () => b);
  document.body.append(ea, eb);
  await wait(120);
  assert.deepEqual([la, lb], [["open"], ["open"]]);
  const st = fxLevelState(ea.querySelector(".nc-fx-level"));
  assert.ok(st.meters >= 2);
  // Same source again: nothing. A new one: the old closes, the new opens.
  patchControl(ea, a);
  assert.deepEqual(la, ["open"]);
  const next = { ...a, meter: source(lc) };
  patchControl(ea, next);
  assert.deepEqual(la, ["open", "close"]);
  assert.deepEqual(lc, ["open"]);
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
  assert.deepEqual(lb, ["open", "close"]);
  assert.deepEqual(lc, ["open", "close"]);
  assert.equal(fxLevelState(eb.querySelector(".nc-fx-level")).running, false, "the loop stops");
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
  assert.deepEqual(lb, ["open", "close", "open"]);
  ea.remove();
  eb.remove();
  await wait(120);
  assert.deepEqual(lb, ["open", "close", "open", "close"]);
});

test("kit sheet: tokens only; fixed size; dimmed by colour when bypassed; the fold copy gives way", () => {
  const css = kitCss();
  const rules = css.slice(css.indexOf(".nc-fx-level {"), css.indexOf(".nc-ui-fx-fold > .nc-fx-level"));
  assert.doesNotMatch(rules, /#[0-9a-f]{3,8}\b|rgba?\(|\d+px|opacity/i);
  assert.match(css, /\.nc-fx-level \{[^}]*flex: none;[^}]*height: var\(--nc-ui-fx-level-height\)/);
  assert.match(css, /\[data-nc-dim="true"\] \.nc-fx-level-fill \{ background: var\(--nc-ui-text-sub\); \}/);
  assert.match(css, /\.nc-fx-level-fill\[data-clip="true"\][^{]*\{ background: var\(--nc-ui-fx-level-hot\); \}/);
  assert.match(css, /\.nc-ui-fx-fold > \.nc-fx-level \{[^}]*min-height: 0;/);
});
