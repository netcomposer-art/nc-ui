import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnvelope, shareProblem } from "../src/primitives/share.js";
import {
  cleanTags,
  createPresetStore,
  exportFile,
  filterPresets,
  fromEnvelope,
  importFile,
  mineFrom,
  presetProblem,
  sourceCounts,
  toEnvelope,
} from "../src/primitives/presets.js";

const NOW = new Date("2026-11-25T21:00:00Z");
const CATS = ["Bass", "Lead", "Pads & Strings", "Keys"];
const LINK = "https://netcomposer.art/synth/#p=abc";
const env = (over = {}) =>
  makeEnvelope({ format: "netcomposer.synth", fv: 3, data: { vcf: { cutoff: 0.4 } }, name: "Harbour Mist", by: "Kiki", category: "Pads & Strings", tags: ["warm"], ...over });
const factory = [
  { id: "f-velvet", format: "netcomposer.synth", data: { a: 1 }, name: "Velvet Section", category: "Pads & Strings", tags: [], created: NOW.toISOString(), updated: NOW.toISOString() },
  { id: "f-undertow", format: "netcomposer.synth", data: { a: 2 }, name: "Undertow", category: "Bass", tags: ["deep"], created: NOW.toISOString(), updated: NOW.toISOString() },
];

test("the envelope takes a category and tags (additive), and checks them", () => {
  const e = env();
  assert.equal(e.category, "Pads & Strings");
  assert.deepEqual(e.tags, ["warm"]);
  assert.equal(shareProblem({ ...e, tags: ["x".repeat(25)] }), "Bad tags.");
  assert.equal(shareProblem({ ...e, category: "" }), "Bad category.");
  const { category, tags, ...old } = e;
  assert.equal(shareProblem(old), null, "an envelope from before still travels");
});

test("Keep: a link's envelope becomes a shared preset, credited, NEW, in its category", () => {
  const r = fromEnvelope(env(), { link: LINK, categories: CATS, now: NOW, id: "p-1" });
  assert.equal(presetProblem(r), null);
  assert.deepEqual(
    { source: r.source, name: r.name, by: r.by, category: r.category, tags: r.tags, link: r.link, seen: r.seen },
    { source: "shared", name: "Harbour Mist", by: "Kiki", category: "Pads & Strings", tags: ["warm"], link: LINK, seen: false },
  );
  const odd = fromEnvelope(env({ category: "Choirs" }), { categories: CATS, now: NOW });
  assert.equal(odd.category, "Bass", "an unknown category lands in the instrument's first");
});

test("a preset travels as the same envelope; a shared one keeps its link as from when shared on", () => {
  const r = fromEnvelope(env(), { link: LINK, categories: CATS, now: NOW });
  const back = toEnvelope(r);
  assert.equal(shareProblem(back), null);
  assert.equal(back.from, LINK);
  assert.equal(back.category, "Pads & Strings");
  assert.deepEqual(back.data, { vcf: { cutoff: 0.4 } });
});

test("Save as… on a shared preset is yours, remembering where it came from", () => {
  const shared = fromEnvelope(env(), { link: LINK, categories: CATS, now: NOW });
  const mine = mineFrom({ format: "netcomposer.synth", fv: 3, data: { vcf: { cutoff: 0.6 } }, name: "  Harbour  Mist Wide ", category: "Pads & Strings", tags: ["Warm", "warm", " slow attack "], by: "Peter", basedOn: shared, now: NOW });
  assert.equal(mine.source, "mine");
  assert.equal(mine.name, "Harbour Mist Wide");
  assert.deepEqual(mine.tags, ["warm", "slow attack"]);
  assert.equal(mine.from, LINK);
});

test("filter: a category, a source, and search across all categories (every word); factory first in order", () => {
  const list = [
    ...factory.map((r) => ({ ...r, source: "factory" })),
    fromEnvelope(env(), { categories: CATS, now: NOW, id: "p-s" }),
    mineFrom({ format: "netcomposer.synth", data: {}, name: "Acid Glass", category: "Bass", tags: ["squelch"], now: NOW, id: "p-m" }),
  ];
  assert.deepEqual(filterPresets(list, { category: "Bass" }).map((r) => r.id), ["f-undertow", "p-m"]);
  assert.deepEqual(filterPresets(list, { category: "Bass", source: "mine" }).map((r) => r.id), ["p-m"]);
  assert.deepEqual(filterPresets(list, { category: "Bass", search: "kiki warm" }).map((r) => r.id), ["p-s"]);
  assert.deepEqual(filterPresets(list, { search: "deep" }).map((r) => r.id), ["f-undertow"]);
  assert.deepEqual(sourceCounts(list, { category: "Bass" }), { all: 2, factory: 1, mine: 1, shared: 0 });
});

test("export leaves factory presets out; import checks each, keeps the rest, never overwrites an id", () => {
  const s = fromEnvelope(env(), { categories: CATS, now: NOW, id: "p-s" });
  const text = exportFile([{ ...factory[0], source: "factory" }, s], NOW);
  const parsed = JSON.parse(text);
  assert.equal(parsed.format, "netcomposer.presets");
  assert.equal(parsed.presets.length, 1);
  const bad = JSON.parse(text);
  bad.presets.push({ id: "x", source: "mine", format: "netcomposer.synth" });
  const got = importFile(JSON.stringify(bad), { format: "netcomposer.synth", have: new Set(["p-s"]), rand: () => 0.5 });
  assert.equal(got.presets.length, 1);
  assert.notEqual(got.presets[0].id, "p-s");
  assert.equal(got.problems.length, 1);
  assert.deepEqual(importFile("nope").problems, ["This isn't a preset file."]);
});

test("the store: factory first and unchangeable; put, update, mark seen, remove (memory when no IndexedDB)", async () => {
  const store = createPresetStore({ format: "netcomposer.synth", factory, idb: null });
  await store.ready;
  assert.equal(store.persistent, false);
  assert.deepEqual(store.list().map((r) => r.source), ["factory", "factory"]);
  let changes = 0;
  store.onChange(() => changes++);
  const s = fromEnvelope(env(), { categories: CATS, now: NOW, id: "p-s" });
  await store.put(s);
  await assert.rejects(store.put({ ...factory[0], source: "factory" }), /Factory presets can't be changed/);
  await assert.rejects(store.update("f-velvet", { name: "x" }), /Factory presets can't be changed/);
  const seen = await store.update("p-s", { seen: true });
  assert.equal(seen.seen, true);
  assert.equal(seen.updated, s.updated, "opening it doesn't change its date");
  const renamed = await store.update("p-s", { name: "Harbour", tags: ["Night"] }, new Date("2026-11-26T00:00:00Z"));
  assert.equal(renamed.name, "Harbour");
  assert.deepEqual(renamed.tags, ["night"]);
  assert.equal(store.list().length, 3);
  assert.equal(await store.remove("p-s"), true);
  assert.equal(store.list().length, 2);
  assert.equal(changes, 4);
});
