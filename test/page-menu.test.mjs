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
const { pageMenu, PAGE_MENU_PHONE } = await import("../src/primitives/page-menu.js");
const { kitCss } = await import("../src/primitives/kit.js");
const index = await import("../src/index.js");

function header() {
  document.body.replaceChildren();
  const hd = document.createElement("header");
  hd.className = "nc-page-hd";
  const actions = document.createElement("div");
  actions.className = "nc-page-actions";
  const panel = document.createElement("div");
  const clicks = [];
  for (const label of ["Save", "Load", "New"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "nc-page-action";
    b.textContent = label;
    b.addEventListener("click", () => clicks.push(label));
    panel.append(b);
  }
  const panic = document.createElement("button");
  panic.textContent = "Panic";
  actions.append(panel, panic);
  hd.append(actions);
  const outside = document.createElement("main");
  document.body.append(hd, outside);
  const menu = pageMenu({ panel });
  actions.append(menu.button);
  return { menu, panel, panic, clicks, outside };
}

const key = (k) => {
  const e = new Event("keydown", { bubbles: true, cancelable: true });
  e.key = k;
  return e;
};

test("page menu: a ☰ button labelled Menu, aria-expanded and aria-controls naming the panel", () => {
  const { menu, panel } = header();
  const b = menu.button;
  assert.equal(b.tagName, "BUTTON");
  assert.equal(b.getAttribute("type"), "button");
  assert.equal(b.getAttribute("aria-label"), "Menu");
  assert.equal(b.getAttribute("aria-expanded"), "false");
  assert.ok(panel.id);
  assert.equal(b.getAttribute("aria-controls"), panel.id);
  assert.ok(b.classList.contains("nc-page-menu-btn"));
  assert.ok(panel.classList.contains("nc-page-menu"));
  assert.ok(b.querySelector("svg"), "inline SVG, not a glyph");
  assert.equal(PAGE_MENU_PHONE, "(max-width: 768px)");
  assert.equal(index.pageMenu, pageMenu);
});

test("page menu: opens on the button, focus moves to the first item; an item click runs it, closes, focus back", () => {
  const { menu, panel, clicks } = header();
  click(menu.button);
  assert.equal(menu.isOpen(), true);
  assert.ok(panel.hasAttribute("data-nc-open"));
  assert.equal(menu.button.getAttribute("aria-expanded"), "true");
  assert.equal(document.activeElement?.textContent, "Save");
  click(panel.children[1]);
  assert.deepEqual(clicks, ["Load"]);
  assert.equal(menu.isOpen(), false);
  assert.equal(menu.button.getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, menu.button);
});

test("page menu: Escape closes it and is taken (an instrument's Escape is Panic); the button toggles", () => {
  const { menu } = header();
  click(menu.button);
  const other = key("Enter");
  document.body.dispatchEvent(other);
  assert.equal(menu.isOpen(), true);
  assert.equal(other.defaultPrevented, false);
  const esc = key("Escape");
  document.body.dispatchEvent(esc);
  assert.equal(menu.isOpen(), false);
  assert.equal(esc.defaultPrevented, true);
  assert.equal(document.activeElement, menu.button);
  click(menu.button);
  click(menu.button);
  assert.equal(menu.isOpen(), false);
});

test("page menu: a press outside closes it; inside does not; a data-nc-menu-stay button keeps it open", () => {
  const { menu, panel, outside } = header();
  click(menu.button);
  panel.children[0].dispatchEvent(new Event("pointerdown", { bubbles: true }));
  assert.equal(menu.isOpen(), true);
  const stay = document.createElement("button");
  stay.dataset.ncMenuStay = "";
  panel.append(stay);
  click(stay);
  assert.equal(menu.isOpen(), true);
  outside.dispatchEvent(new Event("pointerdown", { bubbles: true }));
  assert.equal(menu.isOpen(), false);
  menu.destroy();
  click(menu.button);
  assert.equal(menu.isOpen(), false, "destroyed");
});

test("kit sheet: the panel is display: contents wide, hidden on phones until open, rows of target-min", () => {
  const css = kitCss();
  assert.match(css, /\.nc-page-menu \{ display: contents; \}/);
  assert.match(css, /\.nc-page-menu-btn \{ display: none; \}/);
  const phone = css.slice(css.indexOf("@media (max-width: 768px) {\n  .nc-page-menu:not"));
  assert.match(phone, /\.nc-page-menu:not\(\[data-nc-open\]\) \{ display: none !important; \}/);
  assert.match(phone, /min-height: var\(--nc-ui-target-min\)/);
  assert.match(phone, /\.nc-page-hd:has\(\.nc-page-menu-btn\) \{ flex-direction: row;/);
});

test("kit sheet: phones in landscape put the adjacent modules side by side, the lead over two columns", () => {
  const css = kitCss();
  const at = css.indexOf("@media (orientation: landscape) and (max-height: 500px) and (max-width: 1023px)");
  assert.ok(at > 0);
  const block = css.slice(at, css.indexOf("\n}\n", at));
  assert.match(block, /display: grid;/);
  assert.match(block, /repeat\(auto-fill, minmax\(min\(100%, calc\(var\(--nc-ui-module-slim-column\) \* 2\)\), 1fr\)\)/);
  assert.match(block, /align-items: start;/);
  assert.match(block, /\[data-nc-lead\]:not\(\[data-nc-slim\]\) \{ grid-column: span 2; \}/);
});
