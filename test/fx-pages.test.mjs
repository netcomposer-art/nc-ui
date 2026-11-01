import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { document } = installDom();
// linkedom keeps no focus: track it as a browser does, enough for document.activeElement.
let focused = null;
HTMLElement.prototype.focus = function () {
  focused = this;
};
Object.defineProperty(document, "activeElement", { get: () => focused, configurable: true });
const { defineModule, fxPages } = await import("../src/module/define-module.js");
const { kitCss } = await import("../src/primitives/kit.js");

const css = kitCss();

const card = (id, extra = {}) => ({
  type: "fx",
  id,
  title: id,
  depth: 1,
  controls: [{ type: "slider", id: `${id}-level`, label: "Level", min: 0, max: 1, step: 0.01, value: 0.5, onChange() {} }],
  ...extra,
});

function mix(ids, fx = {}) {
  return {
    id: "mix-pages",
    title: "Mix",
    layout: "console",
    sections: [
      { id: "strips", area: "strips", controls: [] },
      { id: "fx", area: "fx", label: "Bass inserts", pageSize: 3, controls: ids.map((id) => card(id)), ...fx },
      { id: "master", area: "master", controls: [] },
    ],
  };
}

const area = (mod) => mod.el.querySelector('[data-nc-area="fx"]');
const shown = (mod) =>
  [...area(mod).querySelectorAll(":scope > .nc-ui-fx")].filter((c) => !c.hasAttribute("data-nc-off-page")).map((c) => c.dataset.ncId);
const pager = (mod) => area(mod).querySelector(":scope > [data-nc-fx-pager]");
const btn = (mod, dir) => pager(mod).querySelector(`[data-nc-fx-page="${dir}"]`);

test("fxPages: pages of a size, the page clamped into range", () => {
  assert.deepEqual(fxPages(6, 3, 0), { pages: 2, page: 0 });
  assert.deepEqual(fxPages(7, 3, 5), { pages: 3, page: 2 });
  assert.deepEqual(fxPages(4, 3, -2), { pages: 2, page: 0 });
  assert.deepEqual(fxPages(0, 3, 1), { pages: 1, page: 0 });
  assert.deepEqual(fxPages(5, 0, 1), { pages: 1, page: 0 }, "no pageSize: one page");
  assert.deepEqual(fxPages(5, 3, Number.NaN), { pages: 2, page: 0 });
});

test("pages: three cards fit one page, no bar; a fourth makes a second page with ‹ › and 1 / 2", () => {
  const mod = defineModule(mix(["a", "b", "c"]));
  document.body.append(mod.el);
  assert.equal(pager(mod), null, "one page: no bar");
  assert.equal(area(mod).hasAttribute("data-nc-paged"), false);
  assert.deepEqual(shown(mod), ["a", "b", "c"]);

  mod.update(mix(["a", "b", "c", "add"]));
  assert.ok(pager(mod), "two pages: the bar");
  assert.ok(area(mod).firstElementChild === pager(mod), "the bar comes first (above the cards, first in tab order)");
  assert.equal(area(mod).hasAttribute("data-nc-paged"), true);
  assert.deepEqual(shown(mod), ["a", "b", "c"]);
  assert.equal(pager(mod).getAttribute("role"), "group");
  assert.equal(btn(mod, "prev").getAttribute("aria-label"), "Previous effects page");
  assert.equal(btn(mod, "next").getAttribute("aria-label"), "Next effects page");
  assert.equal(btn(mod, "prev").tagName, "BUTTON");
  assert.equal(btn(mod, "prev").getAttribute("aria-disabled"), "true", "page 1: ‹ is quiet");
  assert.equal(btn(mod, "next").getAttribute("aria-disabled"), "false");
  assert.equal(pager(mod).querySelector("[data-nc-fx-page-count]").textContent, "1 / 2");
  assert.equal(pager(mod).querySelector("[data-nc-fx-page-live]").textContent, "Effects page 1 of 2");

  // Back to three: the bar goes, every card shows.
  mod.update(mix(["a", "b", "c"]));
  assert.equal(pager(mod), null);
  assert.deepEqual(shown(mod), ["a", "b", "c"]);
  mod.el.remove();
});

test("pages: › and ‹ turn the page, tell the host, and stop at the ends", () => {
  const turns = [];
  const ids = ["e1", "e2", "e3", "e4", "e5", "e6", "add"];
  const mod = defineModule(mix(ids, { onPage: (p) => turns.push(p) }));
  document.body.append(mod.el);
  assert.deepEqual(shown(mod), ["e1", "e2", "e3"]);
  click(btn(mod, "next"));
  assert.deepEqual(turns, [1]);
  assert.deepEqual(shown(mod), ["e4", "e5", "e6"]);
  assert.equal(pager(mod).querySelector("[data-nc-fx-page-count]").textContent, "2 / 3");
  click(btn(mod, "next"));
  assert.deepEqual(shown(mod), ["add"], "the Add card is the last card, on the last page");
  assert.equal(btn(mod, "next").getAttribute("aria-disabled"), "true");
  click(btn(mod, "next"));
  assert.deepEqual(turns, [1, 2], "a quiet › does nothing");
  click(btn(mod, "prev"));
  assert.deepEqual(shown(mod), ["e4", "e5", "e6"]);
  assert.deepEqual(turns, [1, 2, 1]);
  // A re-render without a page keeps the one the kit shows.
  mod.update(mix(ids, { onPage: (p) => turns.push(p) }));
  assert.deepEqual(shown(mod), ["e4", "e5", "e6"]);
  mod.el.remove();
});

test("pages: keyboard focus stays in the bar when a chevron reaches its end", () => {
  const mod = defineModule(mix(["a", "b", "c", "add"]));
  document.body.append(mod.el);
  btn(mod, "next").focus();
  click(btn(mod, "next"));
  assert.equal(btn(mod, "next").getAttribute("aria-disabled"), "true");
  assert.ok(document.activeElement === btn(mod, "prev"), "focus moves to ‹");
  mod.el.remove();
});

test("pages: the host's page wins and is clamped; a rebuild (a card added) keeps it", () => {
  const ids = ["e1", "e2", "e3", "e4", "add"];
  const mod = defineModule(mix(ids, { page: 1 }));
  document.body.append(mod.el);
  assert.deepEqual(shown(mod), ["e4", "add"]);
  mod.update(mix(ids, { page: 9 }));
  assert.deepEqual(shown(mod), ["e4", "add"], "clamped to the last page");
  mod.update(mix(ids, { page: 0 }));
  assert.deepEqual(shown(mod), ["e1", "e2", "e3"]);
  mod.update(mix(["e1", "e2", "e3", "e4", "e5", "e6", "add"], { page: 2 }));
  assert.deepEqual(shown(mod), ["add"]);
  // Fewer cards (one removed): back to a page that exists.
  mod.update(mix(["e1", "e2", "e3", "add"]));
  assert.deepEqual(shown(mod), ["add"]);
  mod.update(mix(["e1", "add"]));
  assert.deepEqual(shown(mod), ["e1", "add"]);
  assert.equal(pager(mod), null);
  mod.el.remove();
});

test("pages: a section without pageSize never pages", () => {
  const def = mix(["a", "b", "c", "d", "e"]);
  delete def.sections[1].pageSize;
  const mod = defineModule(def);
  assert.equal(pager(mod), null);
  assert.deepEqual(shown(mod), ["a", "b", "c", "d", "e"]);
});

test("pages: the sheet keeps a paged area on one row from 769 px, the other pages unseen and taking no width", () => {
  const at = css.indexOf("@media (min-width: 769px) {\n  .nc-module-body[data-nc-layout=\"console\"] > [data-nc-area=\"fx\"][data-nc-paged] {");
  assert.ok(at >= 0, "a 769 px block for paged areas");
  const block = css.slice(at, css.indexOf("\n}\n", at));
  assert.match(block, /\[data-nc-paged\] \{[^}]*display: flex;[^}]*flex-direction: row;/);
  assert.match(block, /\[data-nc-paged\] \{[^}]*padding-top: var\(--nc-ui-target-min\)/, "room for the bar above the cards");
  assert.match(block, /\[data-nc-off-page\]\[data-nc-off-page\]\[data-nc-off-page\] \{[^}]*visibility: hidden;/);
  assert.match(
    block,
    /\[data-nc-off-page\]\[data-nc-off-page\]\[data-nc-off-page\] \{[^}]*width: var\(--nc-ui-fx-card-width\);[^}]*margin-inline-end: calc\(var\(--nc-ui-fx-card-width\) \* -1\);/,
    "unseen cards keep their height but no width",
  );
  assert.match(block, /min-width: calc\(var\(--nc-ui-fx-card-width\) \* 3\)/, "a part-filled page keeps three cards' width");
  assert.match(block, /> \.nc-fx-pager \{[^}]*position: absolute;[^}]*height: var\(--nc-ui-target-min\)/);
  assert.match(css, /\n\.nc-fx-pager \{ display: none; \}/, "phones: no bar (every card stacked)");
  const button = css.slice(css.indexOf("\n.nc-fx-page-btn {"), css.indexOf("}", css.indexOf("\n.nc-fx-page-btn {")));
  assert.match(button, /width: var\(--nc-ui-target-min\);/);
  assert.match(button, /height: var\(--nc-ui-target-min\);/);
  assert.match(css, /\.nc-fx-page-btn\[aria-disabled="true"\] \{ color: var\(--nc-ui-divider\);/, "quiet by colour at the ends");
});

test("pages: a maximized card takes its page; turning away from it restores it", async () => {
  const def = mix(["eq", "b", "c", "add"]);
  def.sections[1].controls[0].maximize = true;
  const mod = defineModule(def);
  document.body.append(mod.el);
  const eq = () => area(mod).querySelector('[data-nc-id="eq"]');
  const max = () => eq().querySelector("[data-nc-fx-max]");
  click(max());
  assert.equal(eq().dataset.ncMax, "row", "maximized in the row");
  assert.equal(max().getAttribute("aria-pressed"), "true");
  click(btn(mod, "next"));
  assert.equal(eq().dataset.ncMax, undefined, "restored once its page is turned away");
  assert.equal(max().getAttribute("aria-pressed"), "false");
  click(btn(mod, "prev"));
  mod.update(def);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(eq().dataset.ncMax, undefined, "and it stays restored (not maximized again by a re-render)");
  mod.el.remove();
});
