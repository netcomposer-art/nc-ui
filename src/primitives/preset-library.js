// nc-ui preset library UI (specs/preset-library.md; mockups approved by Peter 2026-11-25: "I like it. Go").
//
// The Library part of an instrument's Presets fold, the same in every instrument, laid out as CALLIOPE's chord list:
// Category and Search, the source chips (All · Factory · Mine · Shared, with counts), how many are shown, then a row
// per preset: its name (a shared one: "by …", NEW until opened), where it's from, and its pad box (☆: not a Fav; a
// number: on that pad). A row loads at once (the next key plays it, no Play needed). ⋯ on a row (or right-click, or
// the menu key): Put on a Fav pad, Rename, Category & tags, Duplicate, Copy link, Delete. Under the list: Save as…
// (a sheet in place: Name, Category, By, Tags, Also a Fav), Import, Export.
//
// The instrument keeps its pads (Favs, 1–0) and what plays now; it hands this its store (presets.js), its categories,
// what to do on a load, and its pads. Ties to instrument links: Copy link uses the same envelope (toEnvelope), and a
// link's Keep is `keep(envelope, link)`, which lands under Shared.
// Styles: one <style data-nc-ui-presets> per document, the kit's tokens only. nc-ui was created by Peter Semmelhack
// (https://psem.me/). MIT License.

import { filterPresets, fromEnvelope, mineFrom, sourceCounts, toEnvelope } from "./presets.js";

const FAVS = 10;
const padKey = (i) => (i === 9 ? "0" : String(i + 1));

export const PRESET_LIBRARY_CSS = `
.nc-pl { margin-top: var(--nc-ui-space-16); }
.nc-pl-hd { display: flex; align-items: baseline; justify-content: space-between; gap: var(--nc-ui-space-8); margin-bottom: var(--nc-ui-space-8); }
.nc-pl-h { font-size: var(--nc-ui-font-size-2xs); letter-spacing: var(--nc-ui-label-tracking); text-transform: uppercase; color: var(--nc-ui-text-sub); }
.nc-pl-hint, .nc-pl-count, .nc-pl-msg { font-size: var(--nc-ui-font-size-2xs); color: var(--nc-ui-text-sub); }
.nc-pl-count { font-family: var(--nc-ui-font-readout); margin-bottom: var(--nc-ui-space-6); }
.nc-pl-msg:empty { display: none; }
.nc-pl-msg { margin-top: var(--nc-ui-space-8); }
.nc-pl-grid2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--nc-ui-space-16); }
.nc-pl-field { display: flex; flex-direction: column; gap: var(--nc-ui-space-4); min-width: 0; }
.nc-pl-label { font-size: var(--nc-ui-font-size-2xs); letter-spacing: var(--nc-ui-label-tracking); text-transform: uppercase; color: var(--nc-ui-text-sub); }
.nc-pl-input { font: inherit; font-size: var(--nc-ui-font-size-md); color: var(--nc-ui-text); background: none; border: 0; min-width: 0; width: 100%;
  border-bottom: var(--nc-ui-border-hairline) solid var(--nc-ui-divider); padding: var(--nc-ui-space-4) 0; border-radius: 0; }
.nc-pl-input:focus { outline: none; border-bottom-color: var(--nc-ui-accent); }
.nc-pl-input::placeholder { color: var(--nc-ui-text-sub); }
.nc-pl-chips { display: flex; flex-wrap: wrap; gap: var(--nc-ui-space-6); margin: var(--nc-ui-space-12) 0 var(--nc-ui-space-8); }
.nc-pl-chip { font: inherit; font-size: var(--nc-ui-font-size-2xs); padding: var(--nc-ui-space-4) var(--nc-ui-space-8); cursor: pointer;
  border: var(--nc-ui-border-hairline) solid var(--nc-ui-divider); border-radius: var(--nc-ui-radius-xs); background: none; color: var(--nc-ui-text-sub); }
.nc-pl-chip[aria-pressed="true"] { background: var(--nc-ui-text); border-color: var(--nc-ui-text); color: var(--nc-ui-surface-page); }
.nc-pl-chip i { font-style: normal; font-family: var(--nc-ui-font-readout); margin-left: var(--nc-ui-space-4); }
.nc-pl-list { list-style: none; margin: 0; padding: 0; max-height: 22rem; overflow-y: auto; scrollbar-width: thin; }
.nc-pl-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: var(--nc-ui-space-6);
  min-height: var(--nc-ui-target-min); border-bottom: var(--nc-ui-border-hairline) solid var(--nc-ui-divider); }
.nc-pl-row[data-on] { background: var(--nc-ui-text); color: var(--nc-ui-surface-page); }
.nc-pl-row[data-on] :is(.nc-pl-meta, .nc-pl-by) { color: inherit; }
.nc-pl-load { all: unset; box-sizing: border-box; display: block; min-width: 0; padding: var(--nc-ui-space-6) var(--nc-ui-space-8); cursor: pointer; }
.nc-pl-load:focus-visible { outline: var(--nc-ui-focus-width) solid var(--nc-ui-focus-ring); outline-offset: calc(var(--nc-ui-focus-width) * -1); }
.nc-pl-name { display: block; font-size: var(--nc-ui-font-size-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nc-pl-by { display: block; font-size: var(--nc-ui-font-size-2xs); color: var(--nc-ui-text-sub); margin-top: var(--nc-ui-space-2); }
.nc-pl-new { font-family: var(--nc-ui-font-readout); font-size: var(--nc-ui-font-size-2xs); padding: 0 var(--nc-ui-space-4); margin-left: var(--nc-ui-space-6);
  border: var(--nc-ui-border-hairline) solid currentColor; border-radius: var(--nc-ui-radius-xs); vertical-align: 1px; }
.nc-pl-meta { font-family: var(--nc-ui-font-readout); font-size: var(--nc-ui-font-size-2xs); color: var(--nc-ui-text-sub); white-space: nowrap; }
.nc-pl-pad, .nc-pl-more { font: inherit; font-family: var(--nc-ui-font-readout); font-size: var(--nc-ui-font-size-2xs); cursor: pointer;
  width: var(--nc-ui-space-28); height: var(--nc-ui-space-28); display: inline-flex; align-items: center; justify-content: center; padding: 0;
  border: var(--nc-ui-border-hairline) solid var(--nc-ui-divider); border-radius: var(--nc-ui-radius-xs); background: none; color: var(--nc-ui-text-sub); }
.nc-pl-pad[data-has] { border-color: currentColor; color: inherit; }
.nc-pl-more { border-color: transparent; margin-right: var(--nc-ui-space-4); }
.nc-pl-row[data-on] :is(.nc-pl-pad, .nc-pl-more) { color: inherit; }
.nc-pl-row[data-on] .nc-pl-pad { border-color: currentColor; }
.nc-pl-menu { display: grid; padding: var(--nc-ui-space-4) 0; margin: var(--nc-ui-space-4) 0 var(--nc-ui-space-8) auto; width: min(14rem, 100%);
  border: var(--nc-ui-border-hairline) solid var(--nc-ui-text); border-radius: var(--nc-ui-radius-xs); background: var(--nc-ui-surface-page); }
.nc-pl-menu > button { all: unset; box-sizing: border-box; display: flex; justify-content: space-between; gap: var(--nc-ui-space-8); cursor: pointer;
  padding: var(--nc-ui-space-8) var(--nc-ui-space-12); font-size: var(--nc-ui-font-size-sm); color: var(--nc-ui-text); min-height: var(--nc-ui-space-32); }
.nc-pl-menu > button:hover, .nc-pl-menu > button:focus-visible { background: var(--nc-ui-surface-raised); }
.nc-pl-menu > button span { font-family: var(--nc-ui-font-readout); font-size: var(--nc-ui-font-size-2xs); color: var(--nc-ui-text-sub); }
.nc-pl-menu > button[data-danger] { color: var(--nc-ui-danger); }
.nc-pl-menu hr { border: 0; border-top: var(--nc-ui-border-hairline) solid var(--nc-ui-divider); margin: var(--nc-ui-space-4) 0; width: 100%; }
.nc-pl-pads { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: var(--nc-ui-space-4); padding: var(--nc-ui-space-4) var(--nc-ui-space-12) var(--nc-ui-space-8); }
.nc-pl-pads button { font: inherit; font-family: var(--nc-ui-font-readout); font-size: var(--nc-ui-font-size-2xs); min-height: var(--nc-ui-space-28); cursor: pointer;
  border: var(--nc-ui-border-hairline) solid var(--nc-ui-divider); border-radius: var(--nc-ui-radius-xs); background: none; color: var(--nc-ui-text-sub); padding: 0; }
.nc-pl-pads button[data-full] { color: var(--nc-ui-text); border-color: var(--nc-ui-text-sub); }
.nc-pl-pads button[aria-pressed="true"] { background: var(--nc-ui-text); color: var(--nc-ui-surface-page); border-color: var(--nc-ui-text); }
.nc-pl-acts { display: flex; gap: var(--nc-ui-space-8); flex-wrap: wrap; margin-top: var(--nc-ui-space-12); }
.nc-pl-btn { font: inherit; font-size: var(--nc-ui-font-size-2xs); letter-spacing: var(--nc-ui-label-tracking); text-transform: uppercase;
  font-weight: var(--nc-ui-font-weight-bold); padding: 0 var(--nc-ui-space-12); min-height: var(--nc-ui-space-32); cursor: pointer;
  border: var(--nc-ui-border-hairline) solid var(--nc-ui-text); border-radius: var(--nc-ui-radius-xs); background: none; color: var(--nc-ui-text); }
.nc-pl-btn[data-solid] { background: var(--nc-ui-text); color: var(--nc-ui-surface-page); }
.nc-pl-btn[data-quiet] { border-color: var(--nc-ui-divider); color: var(--nc-ui-text-sub); }
.nc-pl-sheet { display: grid; gap: var(--nc-ui-space-12); margin-top: var(--nc-ui-space-12); padding: var(--nc-ui-space-12);
  border: var(--nc-ui-border-hairline) solid var(--nc-ui-text); border-radius: var(--nc-ui-radius-xs); background: var(--nc-ui-surface-page); }
.nc-pl-sheet-title { font-size: var(--nc-ui-font-size-md); color: var(--nc-ui-text); }
.nc-pl-sheet .nc-pl-pads { padding: 0; }
`;

function addStyles(doc) {
  if (!doc?.head || doc.head.querySelector("style[data-nc-ui-presets]")) return;
  const s = doc.createElement("style");
  s.dataset.ncUiPresets = "";
  s.textContent = PRESET_LIBRARY_CSS;
  doc.head.append(s);
}

/**
 * The Library for one instrument.
 * @param {import('./preset-library').PresetLibraryOptions} opts
 */
export function createPresetLibrary(opts) {
  const { store, categories, noun = "sounds" } = opts;
  const doc = opts.document ?? globalThis.document;
  addStyles(doc);
  const h = (tag, attrs = {}, ...kids) => {
    const e = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c);
    return e;
  };
  const state = {
    category: opts.category ?? categories[0] ?? null,
    source: "all",
    search: "",
    /** The preset loaded now (its id), or null. */
    on: opts.current ?? null,
    /** The row whose menu is open, and what part of it ("menu" | "pads" | "delete"). */
    menu: null,
    menuPart: "menu",
    /** The sheet: null, or { mode: "save" | "edit", id?, pad }. */
    sheet: null,
    msg: "",
  };
  const el = h("div", { class: "nc-pl", "data-nc-id": "preset-library" });
  let msgTimer = null;
  const say = (text) => {
    state.msg = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => {
      state.msg = "";
      const m = el.querySelector(".nc-pl-msg");
      if (m) m.textContent = "";
    }, 5000);
  };
  const favIds = () => opts.favs?.ids() ?? [];
  const padOf = (id) => favIds().indexOf(id);
  const shown = () => filterPresets(store.list(), state);

  async function load(rec) {
    state.on = rec.id;
    state.menu = null;
    opts.onLoad(rec);
    if (rec.source === "shared" && rec.seen === false) await store.update(rec.id, { seen: true }).catch(() => {});
    paint();
  }
  function putOnPad(rec, pad) {
    opts.favs?.put(pad, rec);
    say(`${rec.name} is on pad ${padKey(pad)}.`);
  }
  /** ☆: the next free pad; all full: pick one. On a pad already: nothing (the menu takes it off). */
  function star(rec) {
    const ids = favIds();
    if (ids.includes(rec.id)) {
      state.menu = rec.id;
      state.menuPart = "pads";
    } else {
      const free = ids.findIndex((x, i) => i < FAVS && !x);
      const pad = free >= 0 ? free : ids.length < FAVS ? ids.length : -1;
      if (pad >= 0) putOnPad(rec, pad);
      else {
        state.menu = rec.id;
        state.menuPart = "pads";
        say("All ten pads are full: pick one to replace.");
      }
    }
    paint();
  }
  function padPicker(rec, onPick, chosen = null) {
    const ids = favIds();
    const names = opts.favs?.names?.() ?? [];
    return h(
      "div",
      { class: "nc-pl-pads", role: "group", "aria-label": "Fav pads" },
      Array.from({ length: FAVS }, (_, i) =>
        h(
          "button",
          {
            type: "button",
            "data-full": !!ids[i],
            "aria-pressed": String(chosen === i || (chosen === null && rec && ids[i] === rec.id)),
            "aria-label": `Pad ${padKey(i)}${names[i] ? `: ${names[i]}` : ""}`,
            title: names[i] ?? "",
            onclick: () => onPick(i),
          },
          padKey(i),
        ),
      ),
    );
  }
  function rowMenu(rec) {
    const close = () => {
      state.menu = null;
      paint();
    };
    if (state.menuPart === "pads")
      return h(
        "div",
        { class: "nc-pl-menu", "data-nc-id": "preset-menu" },
        h("button", { type: "button", onclick: () => ((state.menuPart = "menu"), paint()) }, "Put on a Fav pad", h("span", {}, "‹ back")),
        padPicker(rec, (i) => {
          putOnPad(rec, i);
          close();
        }),
        padOf(rec.id) >= 0
          ? h("button", { type: "button", onclick: () => (opts.favs?.put(padOf(rec.id), null), say(`${rec.name} is off its pad.`), close()) }, "Take off its pad")
          : null,
      );
    const mine = rec.source !== "factory";
    const items = [
      h("button", { type: "button", "data-nc-id": "preset-to-pad", onclick: () => ((state.menuPart = "pads"), paint()) }, "Put on a Fav pad", h("span", {}, "▸ 1–0")),
      mine ? h("button", { type: "button", onclick: () => ((state.sheet = { mode: "edit", id: rec.id }), (state.menu = null), paint()) }, "Rename, category & tags") : null,
      h(
        "button",
        {
          type: "button",
          onclick: async () => {
            const copy = mineFrom({ format: rec.format, fv: rec.fv, data: rec.data, name: `${rec.name} copy`, category: rec.category, tags: rec.tags, by: rec.by, basedOn: rec });
            await store.put(copy);
            say(`${copy.name} is under Mine.`);
            close();
          },
        },
        "Duplicate",
      ),
      opts.copyLink
        ? h(
            "button",
            {
              type: "button",
              "data-nc-id": "preset-copy-link",
              onclick: async () => {
                try {
                  await opts.copyLink(toEnvelope(rec), rec);
                  say("Link copied · unlisted. Anyone with it can open this sound.");
                } catch (e) {
                  say(e instanceof Error ? e.message : "The link couldn't be made.");
                }
                close();
              },
            },
            "Copy link",
            h("span", {}, "share"),
          )
        : null,
    ];
    if (mine)
      items.push(
        h("hr"),
        state.menuPart === "delete"
          ? h(
              "button",
              {
                type: "button",
                "data-danger": true,
                "data-nc-id": "preset-delete",
                onclick: async () => {
                  await store.remove(rec.id);
                  if (state.on === rec.id) state.on = null;
                  say(`${rec.name} is deleted. Its pad keeps its copy.`);
                  close();
                },
              },
              "Press again to delete",
            )
          : h("button", { type: "button", "data-danger": true, "data-nc-id": "preset-delete", onclick: () => ((state.menuPart = "delete"), paint()) }, "Delete"),
      );
    return h("div", { class: "nc-pl-menu", role: "menu", "data-nc-id": "preset-menu" }, items);
  }
  function row(rec) {
    const pad = padOf(rec.id);
    const li = h(
      "li",
      { class: "nc-pl-row", "data-on": state.on === rec.id, "data-preset": rec.id },
      h(
        "button",
        { type: "button", class: "nc-pl-load", "aria-current": state.on === rec.id ? "true" : null, onclick: () => load(rec) },
        h(
          "span",
          { class: "nc-pl-name" },
          rec.name,
          rec.source === "shared" && rec.seen === false ? h("span", { class: "nc-pl-new" }, "NEW") : null,
        ),
        rec.by && rec.source !== "factory" ? h("span", { class: "nc-pl-by" }, `by ${rec.by}`) : null,
      ),
      h("span", { class: "nc-pl-meta" }, state.search || state.category === null ? rec.category : rec.source === "factory" ? "Factory" : rec.source === "mine" ? "Mine" : "Shared"),
      h(
        "button",
        {
          type: "button",
          class: "nc-pl-pad",
          "data-has": pad >= 0,
          "aria-label": pad >= 0 ? `${rec.name} is on pad ${padKey(pad)}` : `Put ${rec.name} on a Fav pad`,
          onclick: () => star(rec),
        },
        pad >= 0 ? padKey(pad) : "☆",
      ),
      h(
        "button",
        {
          type: "button",
          class: "nc-pl-more",
          "aria-label": `More for ${rec.name}`,
          "aria-expanded": String(state.menu === rec.id),
          onclick: () => {
            state.menu = state.menu === rec.id ? null : rec.id;
            state.menuPart = "menu";
            paint();
          },
        },
        "⋯",
      ),
    );
    li.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      state.menu = rec.id;
      state.menuPart = "menu";
      paint();
    });
    return li;
  }
  function sheet() {
    const s = state.sheet;
    const editing = s.mode === "edit" ? store.get(s.id) : null;
    const now = editing ?? opts.now?.() ?? null;
    const name = h("input", { class: "nc-pl-input", "data-nc-id": "preset-name", value: editing?.name ?? s.name ?? opts.suggestName?.() ?? "", maxlength: 80, "aria-label": "Name" });
    const cat = h(
      "select",
      { class: "nc-select", "data-nc-id": "preset-category", "aria-label": "Category" },
      categories.map((c) => h("option", { value: c, selected: c === (editing?.category ?? s.category ?? state.category ?? categories[0]) }, c)),
    );
    const by = h("input", { class: "nc-pl-input", "data-nc-id": "preset-by", value: editing?.by ?? opts.by?.() ?? "", maxlength: 40, "aria-label": "By" });
    const tags = h("input", {
      class: "nc-pl-input",
      "data-nc-id": "preset-tags",
      value: (editing?.tags ?? s.tags ?? []).join(", "),
      placeholder: "warm, slow attack",
      "aria-label": "Tags, separated by commas",
    });
    let pad = s.pad ?? null;
    const pads = editing
      ? null
      : padPicker(null, (i) => {
          pad = pad === i ? null : i;
          for (const [j, b] of [...pads.children].entries()) b.setAttribute("aria-pressed", String(j === pad));
        }, pad);
    const save = async () => {
      const parts = {
        name: name.value,
        category: cat.value,
        by: by.value,
        tags: tags.value.split(","),
      };
      try {
        if (editing) {
          await store.update(editing.id, parts);
          say(`${parts.name.trim() || editing.name} is saved.`);
        } else {
          const cur = opts.capture();
          const rec = mineFrom({ ...cur, ...parts, basedOn: state.on ? store.get(state.on) : null });
          await store.put(rec);
          state.on = rec.id;
          if (pad !== null) opts.favs?.put(pad, rec);
          opts.onSaved?.(rec);
          say(`${rec.name} is saved under Mine${pad !== null ? ` and on pad ${padKey(pad)}` : ""}.`);
          state.category = rec.category;
          state.source = "all";
          state.search = "";
        }
        state.sheet = null;
      } catch (e) {
        say(e instanceof Error ? e.message : "It couldn't be saved.");
      }
      paint();
    };
    return h(
      "div",
      { class: "nc-pl-sheet", "data-nc-id": "preset-sheet", role: "group", "aria-label": editing ? "Rename" : "Save as" },
      h("span", { class: "nc-pl-sheet-title" }, editing ? `Rename ${editing.name}` : now?.edited ? "Save as a new sound" : "Save this sound"),
      h("label", { class: "nc-pl-field" }, h("span", { class: "nc-pl-label" }, "Name"), name),
      h(
        "div",
        { class: "nc-pl-grid2" },
        h("label", { class: "nc-pl-field" }, h("span", { class: "nc-pl-label" }, "Category"), cat),
        h("label", { class: "nc-pl-field" }, h("span", { class: "nc-pl-label" }, "By"), by),
      ),
      h("label", { class: "nc-pl-field" }, h("span", { class: "nc-pl-label" }, "Tags"), tags),
      pads ? h("div", { class: "nc-pl-field" }, h("span", { class: "nc-pl-label" }, "Also a Fav"), pads) : null,
      h(
        "div",
        { class: "nc-pl-acts" },
        h("button", { type: "button", class: "nc-pl-btn", "data-solid": true, "data-nc-id": "preset-save", onclick: save }, "Save"),
        h("button", { type: "button", class: "nc-pl-btn", "data-quiet": true, onclick: () => ((state.sheet = null), paint()) }, "Cancel"),
      ),
    );
  }

  function paint() {
    const focusId = doc.activeElement && el.contains(doc.activeElement) ? doc.activeElement.getAttribute("data-nc-id") : null;
    const all = store.list();
    const list = shown();
    const counts = sourceCounts(all, state);
    const search = h("input", {
      class: "nc-pl-input",
      type: "search",
      "data-nc-id": "preset-search",
      value: state.search,
      placeholder: "names, tags, people",
      "aria-label": "Search",
    });
    search.addEventListener("input", () => {
      state.search = search.value;
      paintList();
    });
    const cat = h(
      "select",
      { class: "nc-select", "data-nc-id": "preset-filter-category", "aria-label": "Category" },
      h("option", { value: "", selected: state.category === null }, "All categories"),
      categories.map((c) => h("option", { value: c, selected: c === state.category }, c)),
    );
    cat.addEventListener("change", () => {
      state.category = cat.value || null;
      paint();
    });
    const chips = h(
      "div",
      { class: "nc-pl-chips", role: "group", "aria-label": "Show" },
      [
        ["all", "All"],
        ["factory", "Factory"],
        ["mine", "Mine"],
        ["shared", "Shared"],
      ].map(([k, label]) =>
        h(
          "button",
          {
            type: "button",
            class: "nc-pl-chip",
            "data-nc-id": `preset-source-${k}`,
            "aria-pressed": String(state.source === k),
            onclick: () => {
              state.source = k;
              paint();
            },
          },
          label,
          h("i", {}, String(counts[k])),
        ),
      ),
    );
    const ul = h("ul", { class: "nc-pl-list", "data-nc-id": "preset-list" });
    const count = h("div", { class: "nc-pl-count", "aria-live": "polite" });
    function paintList() {
      const rows = shown();
      ul.replaceChildren(
        ...rows.flatMap((r) => (state.menu === r.id ? [row(r), h("li", { class: "nc-pl-menu-row" }, rowMenu(r))] : [row(r)])),
      );
      count.textContent = state.search
        ? `${rows.length} found`
        : `${rows.length} ${state.source === "all" ? "" : `${state.source} `}in ${state.category ?? "all categories"}`.replace("  ", " ");
      if (!rows.length)
        ul.append(h("li", { class: "nc-pl-hint" }, state.source === "mine" ? "Nothing of yours here yet. Save as… keeps the sound you have now." : state.source === "shared" ? "Sounds you keep from a link land here." : "Nothing here."));
    }
    const fileIn = h("input", { type: "file", accept: ".json,application/json", hidden: true });
    fileIn.addEventListener("change", async () => {
      const f = fileIn.files?.[0];
      if (!f) return;
      const r = await opts.importFile(await f.text());
      say(r);
      paint();
    });
    const parts = [
      h("div", { class: "nc-pl-hd" }, h("span", { class: "nc-pl-h" }, "Library"), h("span", { class: "nc-pl-hint" }, `${all.length} ${noun}`)),
      h(
        "div",
        { class: "nc-pl-grid2" },
        h("label", { class: "nc-pl-field" }, h("span", { class: "nc-pl-label" }, "Category"), cat),
        h("label", { class: "nc-pl-field" }, h("span", { class: "nc-pl-label" }, "Search"), search),
      ),
      chips,
      count,
      ul,
      state.sheet ? sheet() : null,
      state.sheet
        ? null
        : h(
            "div",
            { class: "nc-pl-acts" },
            h("button", { type: "button", class: "nc-pl-btn", "data-solid": true, "data-nc-id": "preset-save-as", onclick: () => ((state.sheet = { mode: "save" }), (state.menu = null), paint()) }, "Save as…"),
            opts.importFile ? h("button", { type: "button", class: "nc-pl-btn", "data-quiet": true, "data-nc-id": "preset-import", onclick: () => fileIn.click() }, "Import") : null,
            opts.exportFile ? h("button", { type: "button", class: "nc-pl-btn", "data-quiet": true, "data-nc-id": "preset-export", onclick: () => say(opts.exportFile()) }, "Export") : null,
            fileIn,
          ),
      h("div", { class: "nc-pl-msg", role: "status" }, state.msg),
    ];
    // replaceChildren would write a null as the text "null".
    el.replaceChildren(...parts.filter((p) => p !== null && p !== undefined && p !== false));
    paintList();
    if (focusId) el.querySelector(`[data-nc-id="${focusId}"]`)?.focus();
  }

  store.onChange(() => paint());
  paint();
  return {
    el,
    paint,
    /** The preset loaded now changed elsewhere (a pad, ‹ ›, a link): mark it. */
    setCurrent(id) {
      state.on = id;
      paint();
    },
    /** ‹ / ›: the next (+1) or previous (-1) preset in the list as shown, wrapping; null when it's empty. */
    step(dir) {
      const rows = shown();
      if (!rows.length) return null;
      const i = rows.findIndex((r) => r.id === state.on);
      const next = rows[(i < 0 ? (dir > 0 ? 0 : rows.length - 1) : i + dir + rows.length) % rows.length];
      void load(next);
      return next;
    },
    /** A link's Keep: the shared sound into the library under Shared, credited and NEW; shown and selected. */
    async keep(envelope, link) {
      const rec = fromEnvelope(envelope, { source: "shared", link, categories });
      await store.put(rec);
      state.source = "shared";
      state.category = null;
      state.search = "";
      state.on = rec.id;
      say(`Kept: ${rec.name}${rec.by ? ` by ${rec.by}` : ""} is in your library under Shared.`);
      paint();
      return rec;
    },
    /** Open Save as… (e.g. from the instrument's own Save). */
    saveAs() {
      state.sheet = { mode: "save" };
      paint();
    },
  };
}
