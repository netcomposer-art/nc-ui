// nc-ui presets: the instruments' preset library (specs/preset-library.md; Peter, 2026-11-25: "a well-organized
// framework that's deep but easy to use … important when presets start to get shared", "make sure it ties into the
// URL link sharing work").
//
// A preset is a share envelope (share.js: format, fv, data, name, by, from, category, tags) plus what the library
// keeps about it: id, source (factory | mine | shared), when it was made and changed, and whether a shared one has been
// opened yet (seen). So a link's Keep, a Scene's Preset and the library all hold the same thing.
//
// One library per instrument format, in this browser (IndexedDB "netcomposer-presets"), shared by every copy of that
// instrument, in the Studio and on its own page. Factory presets ship with the instrument (never stored, never
// changed). Favs (the pads, 1–0) stay the instrument's own: a pad keeps a preset's id and its own copy.
// Self-contained but for share.js. nc-ui was created by Peter Semmelhack (https://psem.me/). MIT License.

import { isOurLink, makeEnvelope, SHARE_PAGES, shareProblem } from "./share.js";

export const PRESETS_FILE = "netcomposer.presets";
export const PRESETS_FILE_V = 1;
export const SOURCES = Object.freeze(["factory", "mine", "shared"]);
export const NAME_MAX = 80;
export const BY_MAX = 40;
export const CATEGORY_MAX = 32;
export const TAGS_MAX = 8;
export const TAG_MAX = 24;
/** At most this many presets of one instrument kept in a browser (a file imports up to it). */
export const LIBRARY_MAX = 2000;
const DB = "netcomposer-presets";
const STORE = "presets";

const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const isIso = (x) => typeof x === "string" && !Number.isNaN(Date.parse(x));

/** Tags cleaned: trimmed, lower case, one space, no repeats, at most TAGS_MAX of TAG_MAX characters. */
export function cleanTags(tags) {
  const out = [];
  for (const t of Array.isArray(tags) ? tags : []) {
    if (typeof t !== "string") continue;
    const c = t.replace(/\s+/g, " ").trim().toLowerCase().slice(0, TAG_MAX);
    if (c && !out.includes(c)) out.push(c);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}

/** A name cleaned (one space, trimmed, at most `max`), or "". */
export function cleanText(text, max) {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A new preset id: "p-" and 12 random base-36 characters. */
export function newPresetId(rand = Math.random) {
  let s = "";
  for (let i = 0; i < 12; i++) s += Math.floor(rand() * 36).toString(36);
  return `p-${s}`;
}

/** The problem with a preset record, in a short sentence, or null. */
export function presetProblem(rec) {
  if (!isObj(rec)) return "A preset needs an object.";
  if (typeof rec.id !== "string" || !/^[\w.-]{1,64}$/.test(rec.id)) return "A preset needs an id.";
  if (!SOURCES.includes(rec.source)) return "A preset's source is factory, mine or shared.";
  if (typeof rec.format !== "string" || !Object.hasOwn(SHARE_PAGES, rec.format)) return "Unknown instrument.";
  if (!isObj(rec.data)) return "The preset is empty.";
  if (rec.fv !== undefined && (typeof rec.fv !== "number" || !Number.isFinite(rec.fv))) return "Bad format version.";
  if (typeof rec.name !== "string" || !rec.name.trim() || rec.name.length > NAME_MAX) return "A preset needs a name.";
  if (rec.by !== undefined && (typeof rec.by !== "string" || rec.by.length > BY_MAX)) return "The author name is too long.";
  if (typeof rec.category !== "string" || !rec.category || rec.category.length > CATEGORY_MAX) return "A preset needs a category.";
  if (!Array.isArray(rec.tags) || rec.tags.length > TAGS_MAX || !rec.tags.every((t) => typeof t === "string" && t.length > 0 && t.length <= TAG_MAX))
    return "Bad tags.";
  if (rec.from !== undefined && !isOurLink(rec.from)) return "Bad remix link.";
  if (rec.link !== undefined && !isOurLink(rec.link)) return "Bad link.";
  if (!isIso(rec.created) || !isIso(rec.updated)) return "Bad dates.";
  if (rec.seen !== undefined && typeof rec.seen !== "boolean") return "Bad seen mark.";
  return null;
}

/**
 * A preset from a share envelope (a link's Keep: source "shared", its `link` kept and NEW until opened; or a Save:
 * "mine"). `categories` are the instrument's own: a category it doesn't have becomes its first.
 */
export function fromEnvelope(env, { source = "shared", link, categories = [], now = new Date(), id = newPresetId() } = {}) {
  const problem = shareProblem(env);
  if (problem) throw new Error(problem);
  const at = now.toISOString();
  const cat = typeof env.category === "string" && categories.includes(env.category) ? env.category : (categories[0] ?? "Other");
  const rec = {
    id,
    source,
    format: env.format,
    data: structuredClone(env.data),
    name: cleanText(env.name, NAME_MAX) || "Untitled",
    category: cat,
    tags: cleanTags(env.tags),
    created: at,
    updated: at,
  };
  if (typeof env.fv === "number") rec.fv = env.fv;
  const by = cleanText(env.by, BY_MAX);
  if (by) rec.by = by;
  if (env.from) rec.from = env.from;
  if (link && isOurLink(link)) rec.link = link;
  if (source === "shared") rec.seen = false;
  return rec;
}

/** The envelope a preset travels as (Copy link, Share): its settings, name, author, category and tags. */
export function toEnvelope(rec) {
  const e = makeEnvelope({
    format: rec.format,
    fv: rec.fv,
    data: rec.data,
    name: rec.name,
    by: rec.by,
    from: rec.source === "shared" ? (rec.link ?? rec.from) : rec.from,
  });
  if (rec.category) e.category = rec.category;
  const tags = cleanTags(rec.tags);
  if (tags.length) e.tags = tags;
  const problem = shareProblem(e);
  if (problem) throw new Error(problem);
  return e;
}

/**
 * Save as… a new preset of yours from the sound now (`data`). Saved from a shared one, it remembers where it came from
 * (`basedOn`: its link, as `from`).
 */
export function mineFrom({ format, fv, data, name, category, tags, by, basedOn, now = new Date(), id = newPresetId() }) {
  const at = now.toISOString();
  const rec = {
    id,
    source: "mine",
    format,
    data: structuredClone(data),
    name: cleanText(name, NAME_MAX) || "Untitled",
    category: cleanText(category, CATEGORY_MAX) || "Other",
    tags: cleanTags(tags),
    created: at,
    updated: at,
  };
  if (typeof fv === "number") rec.fv = fv;
  const b = cleanText(by, BY_MAX);
  if (b) rec.by = b;
  const from = basedOn?.source === "shared" ? (basedOn.link ?? basedOn.from) : basedOn?.from;
  if (from && isOurLink(from)) rec.from = from;
  const problem = presetProblem(rec);
  if (problem) throw new Error(problem);
  return rec;
}

/** The words a preset is found by: its name, category, author, tags and where it came from. */
function haystack(rec) {
  return [rec.name, rec.category, rec.by ?? "", ...(rec.tags ?? []), rec.source].join(" ").toLowerCase();
}

/**
 * The presets shown: in `category` (null: all), from `source` ("all" or one), matching every word of `search`
 * (searching looks across all categories, as CALLIOPE's chord list does). Factory first in their own order, then
 * yours and shared by name.
 */
export function filterPresets(list, { category = null, source = "all", search = "" } = {}) {
  const words = cleanText(search, 200).toLowerCase().split(" ").filter(Boolean);
  const out = list.filter(
    (r) =>
      (source === "all" || r.source === source) &&
      (words.length ? words.every((w) => haystack(r).includes(w)) : category === null || r.category === category),
  );
  const order = new Map(list.map((r, i) => [r.id, i]));
  return out.sort((a, b) => {
    const fa = a.source === "factory" ? 0 : 1;
    const fb = b.source === "factory" ? 0 : 1;
    if (fa !== fb) return fa - fb;
    if (fa === 0) return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

/** How many there are of each source, with the same category and search: the chips' numbers. */
export function sourceCounts(list, { category = null, search = "" } = {}) {
  const base = filterPresets(list, { category, search });
  const n = { all: base.length, factory: 0, mine: 0, shared: 0 };
  for (const r of base) n[r.source]++;
  return n;
}

/** The library file (Export): your and shared presets of one or more instruments. Factory ones stay out. */
export function exportFile(records, now = new Date()) {
  const presets = records.filter((r) => r.source !== "factory").map((r) => structuredClone(r));
  return JSON.stringify({ format: PRESETS_FILE, v: PRESETS_FILE_V, exported: now.toISOString(), presets }, null, 1);
}

/**
 * A library file read back (Import): the presets for `format` (or every format, when null) that are right, and one
 * line for each that isn't. An id already in `have` gets a new id, so nothing is overwritten.
 */
export function importFile(text, { format = null, have = new Set(), rand = Math.random } = {}) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { presets: [], problems: ["This isn't a preset file."] };
  }
  if (!isObj(raw) || raw.format !== PRESETS_FILE || !Array.isArray(raw.presets))
    return { presets: [], problems: ["This isn't a preset file."] };
  if (raw.v !== PRESETS_FILE_V) return { presets: [], problems: [`This preset file is from another version (${String(raw.v)}).`] };
  const presets = [];
  const problems = [];
  const ids = new Set(have);
  raw.presets.forEach((p, i) => {
    if (format && isObj(p) && p.format !== format) return;
    const why = presetProblem(p) ?? (p.source === "factory" ? "A factory preset can't be imported." : null);
    if (why) {
      problems.push(`Preset ${i + 1}: ${why}`);
      return;
    }
    const rec = structuredClone(p);
    if (ids.has(rec.id)) rec.id = newPresetId(rand);
    ids.add(rec.id);
    presets.push(rec);
  });
  return { presets: presets.slice(0, LIBRARY_MAX), problems };
}

// ------------------------------------------------------------------------------------------------- the store

function openDb(idb) {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }).createIndex("format", "format");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
const done = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

/**
 * One instrument's library: its factory presets (given, in order) and the ones kept in this browser. Without
 * IndexedDB (a private window, a test) it keeps them for this visit only (`persistent` false).
 */
export function createPresetStore({ format, factory = [], idb = globalThis.indexedDB ?? null } = {}) {
  const fac = factory.map((r) => ({ ...r, source: "factory" }));
  let kept = [];
  let dbp = null;
  const listeners = new Set();
  const changed = () => {
    for (const l of [...listeners])
      try {
        l();
      } catch {
        /* a listener's problem stays its own */
      }
  };
  const db = () => {
    if (!idb) return null;
    dbp ??= openDb(idb).catch(() => null);
    return dbp;
  };
  const ready = (async () => {
    const d = await db();
    if (!d) return;
    const tx = d.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).index("format").getAll(format);
    kept = await new Promise((resolve) => {
      req.onsuccess = () => resolve((req.result ?? []).filter((r) => !presetProblem(r)));
      req.onerror = () => resolve([]);
    });
  })();
  const write = async (put, del) => {
    const d = await db();
    if (!d) return;
    const tx = d.transaction(STORE, "readwrite");
    const s = tx.objectStore(STORE);
    for (const r of put) s.put(r);
    for (const id of del) s.delete(id);
    await done(tx);
  };
  const store = {
    format,
    ready,
    get persistent() {
      return !!idb;
    },
    /** Factory first, in order, then what this browser keeps. */
    list: () => [...fac, ...kept],
    get: (id) => fac.find((r) => r.id === id) ?? kept.find((r) => r.id === id) ?? null,
    onChange(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    /** Keep (add or replace) presets of yours or shared ones. Throws on a factory one or a wrong record. */
    async put(...recs) {
      await ready;
      for (const r of recs) {
        if (r.format !== format) throw new Error("That preset is for another instrument.");
        if (r.source === "factory") throw new Error("Factory presets can't be changed. Save a copy instead.");
        const why = presetProblem(r);
        if (why) throw new Error(why);
      }
      const byId = new Map(kept.map((r) => [r.id, r]));
      for (const r of recs) byId.set(r.id, structuredClone(r));
      if (byId.size > LIBRARY_MAX) throw new Error(`${LIBRARY_MAX} presets is the most one instrument keeps.`);
      kept = [...byId.values()];
      changed();
      await write(recs, []);
    },
    /** Change a kept preset's name, category, tags or author (or mark a shared one seen). */
    async update(id, patch, now = new Date()) {
      await ready;
      const r = kept.find((x) => x.id === id);
      if (!r) throw new Error(fac.some((x) => x.id === id) ? "Factory presets can't be changed. Save a copy instead." : "No such preset.");
      const next = { ...r };
      if (patch.name !== undefined) next.name = cleanText(patch.name, NAME_MAX) || r.name;
      if (patch.category !== undefined) next.category = cleanText(patch.category, CATEGORY_MAX) || r.category;
      if (patch.tags !== undefined) next.tags = cleanTags(patch.tags);
      if (patch.by !== undefined) {
        const b = cleanText(patch.by, BY_MAX);
        if (b) next.by = b;
        else delete next.by;
      }
      if (patch.data !== undefined) next.data = structuredClone(patch.data);
      if (patch.seen !== undefined && r.source === "shared") next.seen = !!patch.seen;
      if (patch.seen === undefined) next.updated = now.toISOString();
      const why = presetProblem(next);
      if (why) throw new Error(why);
      kept = kept.map((x) => (x.id === id ? next : x));
      changed();
      await write([next], []);
      return next;
    },
    async remove(id) {
      await ready;
      if (!kept.some((r) => r.id === id)) return false;
      kept = kept.filter((r) => r.id !== id);
      changed();
      await write([], [id]);
      return true;
    },
  };
  return store;
}
