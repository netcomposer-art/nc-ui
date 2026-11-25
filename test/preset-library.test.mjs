// The preset library UI in a DOM (linkedom): rows, chips, search, load, ☆ to a pad, Save as…, menu, Keep from a link.
import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { document } = installDom();
const { createPresetStore } = await import("../src/primitives/presets.js");
const { makeEnvelope } = await import("../src/primitives/share.js");
const { createPresetLibrary } = await import("../src/primitives/preset-library.js");

const T = "2026-11-25T21:00:00.000Z";
const CATS = ["Bass", "Lead", "Pads & Strings"];
const fac = (id, name, category) => ({ id, format: "netcomposer.synth", data: { id }, name, category, tags: [], created: T, updated: T });
const flush = () => new Promise((r) => setTimeout(r, 0));

async function setup() {
  const store = createPresetStore({
    format: "netcomposer.synth",
    factory: [fac("f1", "Velvet Section", "Pads & Strings"), fac("f2", "Amber Strings", "Pads & Strings"), fac("f3", "Undertow", "Bass")],
    idb: null,
  });
  await store.ready;
  const pads = Array(10).fill(null);
  const loaded = [];
  const copied = [];
  const lib = createPresetLibrary({
    store,
    categories: CATS,
    category: "Pads & Strings",
    document,
    onLoad: (r) => loaded.push(r.id),
    capture: () => ({ format: "netcomposer.synth", fv: 3, data: { now: true } }),
    by: () => "Peter",
    favs: { ids: () => pads.map((p) => p?.id ?? null), names: () => pads.map((p) => p?.name ?? null), put: (i, r) => (pads[i] = r) },
    copyLink: async (env) => copied.push(env),
  });
  document.body.replaceChildren(lib.el);
  return { store, lib, pads, loaded, copied };
}
const rows = (lib) => [...lib.el.querySelectorAll(".nc-pl-row")].map((r) => r.querySelector(".nc-pl-name").textContent);
const q = (lib, id) => lib.el.querySelector(`[data-nc-id="${id}"]`);

test("rows of the category, the chips' counts, and search across all categories", async () => {
  const { lib } = await setup();
  assert.deepEqual(rows(lib), ["Velvet Section", "Amber Strings"]);
  assert.ok(!/null/.test(lib.el.textContent), "no stray text");
  assert.equal(q(lib, "preset-source-all").textContent, "All2");
  assert.equal(q(lib, "preset-source-mine").textContent, "Mine0");
  const s = q(lib, "preset-search");
  s.value = "under";
  s.dispatchEvent(new Event("input"));
  assert.deepEqual(rows(lib), ["Undertow"]);
  assert.match(lib.el.querySelector(".nc-pl-count").textContent, /1 found/);
});

test("a row loads at once and is marked; ☆ puts it on the next free pad", async () => {
  const { lib, loaded, pads } = await setup();
  click(lib.el.querySelectorAll(".nc-pl-load")[1]);
  await flush();
  assert.deepEqual(loaded, ["f2"]);
  assert.ok(lib.el.querySelector('.nc-pl-row[data-preset="f2"]').hasAttribute("data-on"));
  click(lib.el.querySelector('.nc-pl-row[data-preset="f2"] .nc-pl-pad'));
  assert.equal(pads[0]?.id, "f2");
  assert.equal(lib.el.querySelector('.nc-pl-row[data-preset="f2"] .nc-pl-pad').textContent, "1");
  assert.match(lib.el.querySelector(".nc-pl-msg").textContent, /on pad 1/);
});

test("all ten pads full: ☆ asks which pad, and the pick replaces it", async () => {
  const { lib, pads } = await setup();
  for (let i = 0; i < 10; i++) pads[i] = { id: `x${i}`, name: `X${i}` };
  lib.paint();
  click(lib.el.querySelector('.nc-pl-row[data-preset="f1"] .nc-pl-pad'));
  const picker = lib.el.querySelector(".nc-pl-menu .nc-pl-pads");
  assert.ok(picker, "the pad picker opens");
  click(picker.querySelectorAll("button")[3]);
  assert.equal(pads[3]?.id, "f1");
});

test("Save as… keeps the sound now under Mine, with its category, tags, author, and a pad", async () => {
  const { lib, store, pads } = await setup();
  click(q(lib, "preset-save-as"));
  q(lib, "preset-name").value = "Glass Pad";
  q(lib, "preset-tags").value = "Warm, slow attack";
  click(lib.el.querySelectorAll(".nc-pl-sheet .nc-pl-pads button")[4]);
  click(q(lib, "preset-save"));
  await flush();
  const mine = store.list().find((r) => r.source === "mine");
  assert.equal(mine.name, "Glass Pad");
  assert.equal(mine.category, "Pads & Strings");
  assert.deepEqual(mine.tags, ["warm", "slow attack"]);
  assert.equal(mine.by, "Peter");
  assert.deepEqual(mine.data, { now: true });
  assert.equal(pads[4]?.id, mine.id);
  assert.ok(!q(lib, "preset-sheet"), "the sheet closes");
});

test("the menu: Copy link sends the same envelope; Delete asks twice; factory has no Delete", async () => {
  const { lib, store, copied } = await setup();
  click(lib.el.querySelector('.nc-pl-row[data-preset="f1"] .nc-pl-more'));
  assert.ok(!q(lib, "preset-delete"), "factory: no Delete");
  click(q(lib, "preset-copy-link"));
  await flush();
  assert.equal(copied[0].name, "Velvet Section");
  assert.equal(copied[0].category, "Pads & Strings");
  // A link's Keep lands under Shared, then Delete it.
  const kept = await lib.keep(makeEnvelope({ format: "netcomposer.synth", data: { k: 1 }, name: "Harbour Mist", by: "Kiki", category: "Pads & Strings" }), "https://netcomposer.art/synth/#p=x");
  assert.equal(q(lib, "preset-source-shared").getAttribute("aria-pressed"), "true");
  assert.ok(lib.el.querySelector(`.nc-pl-row[data-preset="${kept.id}"] .nc-pl-new`), "NEW");
  assert.match(lib.el.querySelector(`.nc-pl-row[data-preset="${kept.id}"] .nc-pl-by`).textContent, /by Kiki/);
  click(lib.el.querySelector(`.nc-pl-row[data-preset="${kept.id}"] .nc-pl-more`));
  click(q(lib, "preset-delete"));
  assert.equal(q(lib, "preset-delete").textContent, "Press again to delete");
  click(q(lib, "preset-delete"));
  await flush();
  assert.equal(store.get(kept.id), null);
});

test("opening a NEW shared one marks it seen; ‹ › step through the list as shown", async () => {
  const { lib, store, loaded } = await setup();
  const kept = await lib.keep(makeEnvelope({ format: "netcomposer.synth", data: {}, name: "Rubber Bass", category: "Bass" }));
  click(lib.el.querySelector(`.nc-pl-row[data-preset="${kept.id}"] .nc-pl-load`));
  await flush();
  assert.equal(store.get(kept.id).seen, true);
  click(q(lib, "preset-source-all"));
  const sel = q(lib, "preset-filter-category");
  [...sel.options].forEach((o) => (o.selected = o.value === "Pads & Strings"));
  sel.dispatchEvent(new Event("change"));
  lib.setCurrent("f1");
  assert.equal(lib.step(1).id, "f2");
  assert.equal(lib.step(1).id, "f1", "wraps");
  assert.deepEqual(loaded.slice(-2), ["f2", "f1"]);
});
