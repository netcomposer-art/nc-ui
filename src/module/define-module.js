import { v } from "../alias.js";
import { paintAll, patchControl, renderControl } from "../primitives/controls.js";
import { installTheme } from "../primitives/install.js";
import { createSwitch } from "../primitives/switch.js";

export const HIDDEN_STORAGE_KEY = "netcomposer.hidden.v1";
export const RHYTHM_HIDDEN_KEY = "netcomposer.rhythm.hidden.v1";

const defs = new WeakMap();

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readHidden(storage, key = RHYTHM_HIDDEN_KEY) {
  try {
    const raw = JSON.parse(storage?.getItem(key) ?? "[]");
    return new Set(Array.isArray(raw) ? raw.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeHidden(storage, id, hidden, key = RHYTHM_HIDDEN_KEY) {
  const next = readHidden(storage, key);
  if (hidden) next.add(id);
  else next.delete(id);
  try {
    storage?.setItem(key, JSON.stringify([...next]));
  } catch {
    /* private mode */
  }
}

export function seedHidden(ids, key = RHYTHM_HIDDEN_KEY) {
  const storage = safeStorage();
  if (!storage || storage.getItem(`${key}:seeded`)) return;
  for (const id of ids) writeHidden(storage, id, true, key);
  storage.setItem(`${key}:seeded`, "1");
}

function flatten(def) {
  const lists = [
    ...(def.controls ?? []),
    ...(def.sections ?? []).flatMap((section) => section.controls),
  ];
  const out = [];
  for (const control of lists) {
    out.push(control);
    if (control.type === "fx") out.push(...control.controls, ...(control.more ?? []));
  }
  return out;
}

function findControl(def, id) {
  if (!def || !id) return undefined;
  return flatten(def).find((control) => control.id === id);
}

function signature(def) {
  const shape = (def.sections ?? [])
    .map((section) => `${section.id}${section.panel ? ":panel" : ""}`)
    .join(",");
  return `${shape}#${flatten(def)
    .map((control) => {
      if (control.type === "stepGrid") {
        return `stepGrid:${control.id}:${control.rows.map((row) => `${row.id}/${row.steps.length}`).join(",")}${control.onMute ? ":m" : ""}${control.onSolo ? ":s" : ""}`;
      }
      if (control.type === "slotRow")
        return `slotRow:${control.id}:${control.slots.length}${control.onSparkle ? ":spark" : ""}`;
      if (control.type === "button")
        return `button:${control.id}${control.onSparkle ? ":spark" : ""}`;
      if (control.type === "select")
        return `select:${control.id}:${control.options.map((option) => option.value).join(",")}`;
      if (control.type === "fx")
        return `fx:${control.id}:${control.depth}:${control.on === undefined ? "" : "sw"}:${control.controls.map((child) => child.id).join(",")}/${(control.more ?? []).map((child) => child.id).join(",")}`;
      return `${control.type}:${control.id}`;
    })
    .join("|")}`;
}

/** A section's heading: a plain sub-heading, or a panel's title plus its subject (the selected track). */
function sectionHeading(wrap, section) {
  if (!section.title) return;
  if (!section.panel) {
    const heading = document.createElement("h3");
    heading.className = "nc-ui-fx-name";
    heading.textContent = section.title;
    wrap.append(heading);
    return;
  }
  const head = document.createElement("div");
  head.className = "nc-panel-hd";
  const heading = document.createElement("h3");
  heading.className = "nc-panel-title";
  heading.textContent = section.title;
  const subject = document.createElement("span");
  subject.className = "nc-panel-subject";
  subject.dataset.ncPanelSubject = "";
  head.append(heading, subject);
  wrap.append(head);
  patchHeading(wrap, section);
}

function patchHeading(wrap, section) {
  if (!section.panel) return;
  const head = [...wrap.children].find((node) => node.classList.contains("nc-panel-hd"));
  const heading = head?.querySelector(".nc-panel-title");
  const subject = head?.querySelector(".nc-panel-subject");
  if (heading) heading.textContent = section.title ?? "";
  if (subject) subject.textContent = section.subject ?? "";
  if (section.lane) wrap.dataset.ncLane = String(section.lane);
  else delete wrap.dataset.ncLane;
}

function lookup(node) {
  const module = node.closest?.(".nc-module");
  if (!(module instanceof HTMLElement)) return undefined;
  const def = defs.get(module);
  const id =
    node.getAttribute?.("data-nc-id") ?? node.closest?.("[data-nc-id]")?.getAttribute("data-nc-id");
  return findControl(def, id);
}

function renderBody(body, def) {
  const sections = def.sections ?? [{ id: "main", controls: def.controls ?? [] }];
  const next = signature(def);
  if (body.dataset.ncSignature === next) {
    for (const section of sections) {
      const wrap = body.querySelector(`[data-nc-section="${cssEscape(section.id)}"]`);
      if (wrap) patchHeading(wrap, section);
      for (const control of section.controls) {
        const node = body.querySelector(`[data-nc-id="${cssEscape(control.id)}"]`);
        if (node instanceof Element) patchControl(node, control);
      }
    }
    return;
  }
  body.dataset.ncSignature = next;
  body.replaceChildren();
  for (const section of sections) {
    const wrap = document.createElement("div");
    wrap.className = "nc-section";
    wrap.dataset.ncSection = section.id;
    // A shaded inset panel, one shade darker than its module (ASTRID's Hacks panel inside VCA).
    if (section.inset) wrap.dataset.ncInset = "true";
    // A panel: its own page-coloured area under the section before it, a title plus the subject it edits, and its
    // controls in columns (the Parameters panel under Rhythm's grid; one column on phones).
    if (section.panel) {
      wrap.dataset.ncPanel = "true";
      wrap.setAttribute("role", "region");
      if (section.title) wrap.setAttribute("aria-label", section.title);
    }
    sectionHeading(wrap, section);
    const target = section.panel ? document.createElement("div") : wrap;
    if (section.panel) {
      target.className = "nc-panel-body";
      wrap.append(target);
    }
    for (const control of section.controls) target.append(renderControl(control, lookup));
    body.append(wrap);
  }
}

function cssEscape(value) {
  return value.replace(/["\\]/g, "\\$&");
}

export function defineModule(def, storageKey = RHYTHM_HIDDEN_KEY) {
  installTheme();
  const el = document.createElement("section");
  el.className = "nc nc-module";
  el.dataset.ncModule = def.id;
  el.dataset.ncOpen = "true";
  el.dataset.ncPlace = "adjacent";
  el.dataset.ncShade = "1";
  if (def.lead) el.dataset.ncLead = "";
  const hidden = readHidden(safeStorage(), storageKey).has(def.id);
  const head = document.createElement("header");
  head.className = "nc-module-hd";
  head.dataset.ncRow = "";
  const title = document.createElement("h2");
  title.className = "nc-title";
  title.id = `${def.id}-title`;
  const end = document.createElement("span");
  end.className = "nc-module-end";
  const hide = document.createElement("button");
  hide.type = "button";
  hide.className = "nc-hide";
  hide.dataset.ncHide = "";
  const index = document.createElement("span");
  index.className = "nc-index";
  index.dataset.ncIndex = "";
  // The module's own on/off (fx-blocks' header switch): a real role="switch" named by the title. Off dims the
  // body by colour. Only shown when the module passes `on`.
  const power = createSwitch({
    labelledBy: title.id,
    onChange: (on) => (defs.get(el) ?? def).onToggle?.(on),
  });
  power.el.dataset.ncModuleSwitch = "";
  end.append(power.el, hide, index);
  const status = document.createElement("span");
  status.className = "nc-snap-msg";
  status.dataset.ncStatus = "";
  head.append(title, status, end);
  const body = document.createElement("div");
  body.className = "nc-module-body";
  body.id = `${def.id}-body`;
  const slim = document.createElement("button");
  slim.type = "button";
  slim.className = "nc-slim";
  const lines = document.createElement("span");
  lines.className = "nc-slim-lines";
  slim.append(lines);
  const probe = document.createElement("i");
  probe.className = "nc-token-probe";
  probe.dataset.ncProbe = "";
  el.append(probe, head, body, slim);
  el.setAttribute("aria-labelledby", title.id);

  const applyHidden = (isHidden) => {
    const current = defs.get(el) ?? def;
    el.dataset.ncOpen = isHidden ? "false" : "true";
    body.hidden = isHidden;
    slim.hidden = !isHidden;
    hide.textContent = isHidden ? "+" : "−";
    hide.setAttribute("aria-expanded", isHidden ? "false" : "true");
    hide.setAttribute("aria-controls", body.id);
    hide.setAttribute("aria-label", `${isHidden ? "Show" : "Hide"} ${current.title}`);
    hide.title = isHidden ? "Show" : "Hide";
    if (isHidden) el.dataset.ncSlim = "";
    else delete el.dataset.ncSlim;
  };

  hide.addEventListener("click", () => {
    const next = el.dataset.ncOpen === "true";
    writeHidden(safeStorage(), (defs.get(el) ?? def).id, next, storageKey);
    applyHidden(next);
    syncAdjacentColumns(el.parentElement);
  });
  slim.addEventListener("click", () => {
    writeHidden(safeStorage(), (defs.get(el) ?? def).id, false, storageKey);
    applyHidden(false);
    syncAdjacentColumns(el.parentElement);
  });

  const handle = {
    el,
    update(next) {
      defs.set(el, next);
      title.textContent = next.title;
      status.textContent = next.status ?? "";
      if (next.status !== undefined) status.setAttribute("aria-live", "polite");
      else status.removeAttribute("aria-live");
      lines.textContent = next.summary ?? next.title;
      power.el.hidden = next.on === undefined;
      power.set(next.on === true);
      if (next.on === false) body.dataset.ncDim = "true";
      else delete body.dataset.ncDim;
      slim.setAttribute("aria-label", `Show ${next.title}`);
      renderBody(body, next);
      applyHidden(body.hidden);
      handle.redraw();
    },
    redraw() {
      const current = defs.get(el);
      if (!current) return;
      paintAll(el, flatten(current));
    },
  };
  defs.set(el, def);
  applyHidden(hidden);
  handle.update(def);
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => handle.redraw());
    observer.observe(el);
  }
  return handle;
}

export function placeModules(host, modules, layout = "adjacent") {
  installTheme(host.ownerDocument);
  host.classList.add("nc-stack");
  host.dataset.ncLayout = layout === "stack" ? "stack" : "adjacent";
  host.replaceChildren();
  const place = layout === "stack" ? "stack" : "adjacent";
  modules.forEach((mod, i) => {
    const step = (i % 4) + 1;
    mod.el.dataset.ncShade = String(step);
    mod.el.dataset.ncPlace = place;
    const index = mod.el.querySelector("[data-nc-index]");
    if (index) index.textContent = String(step).padStart(2, "0");
    host.append(mod.el);
    mod.redraw();
  });
  syncAdjacentColumns(host);
}

/** Desktop columns match ASTRID: open modules share the row, a slim module uses module-slim-column. */
export function syncAdjacentColumns(host) {
  if (!(host instanceof HTMLElement)) return;
  if (host.dataset.ncLayout !== "adjacent") {
    host.style.removeProperty("--astrid-cols");
    delete host.dataset.ncStackLast;
    return;
  }
  const modules = [...host.children].filter(
    (node) => node instanceof HTMLElement && node.classList.contains("nc-module"),
  );
  // ASTRID gridColumns(): the lead column is 30fr and every other open column 23.333fr. From 1280 px kit.js sets
  // --astrid-lead-fr / --astrid-rest-fr to 48fr / 21.333fr so the lead's 16-step grid fills it (item C).
  const led = modules.some((node) => node.hasAttribute("data-nc-lead"));
  const columns = modules.map((node) => {
    if (node.hasAttribute("data-nc-slim")) return v("module-slim-column");
    if (!led) return "minmax(0, 1fr)";
    return node.hasAttribute("data-nc-lead")
      ? "minmax(0, var(--astrid-lead-fr, 30fr))"
      : "minmax(0, var(--astrid-rest-fr, 23.333fr))";
  });
  host.style.setProperty("--astrid-cols", columns.join(" "));
  // 1024-1279 px (kit.js): a lead plus three open modules stack the last two in one column.
  const open = modules.filter((node) => !node.hasAttribute("data-nc-slim"));
  if (led && modules.length === 4 && open.length === 4) host.dataset.ncStackLast = "true";
  else delete host.dataset.ncStackLast;
}

export function renderGallery(host) {
  installTheme(host.ownerDocument);
  const noop = () => undefined;
  const slider = (id) => ({
    type: "slider",
    id,
    label: id,
    min: 0,
    max: 1,
    step: 0.01,
    value: 0.4,
    onChange: noop,
  });
  const specs = [
    {
      id: "gallery-button",
      title: "Button",
      controls: [{ type: "button", id: "play", label: "Play", on: true, onPress: noop }],
    },
    {
      id: "gallery-toggle",
      title: "Toggle",
      controls: [
        { type: "toggle", id: "mute", label: "Mute", pressed: true, role: "mute", onPress: noop },
        { type: "toggle", id: "solo", label: "Solo", pressed: false, role: "solo", onPress: noop },
      ],
    },
    { id: "gallery-slider", title: "Slider", controls: [slider("cutoff")] },
    {
      id: "gallery-knob",
      title: "Knob",
      controls: [
        { type: "knob", id: "tune", label: "Tune", min: 0, max: 1, value: 0.3, onChange: noop },
      ],
    },
    {
      id: "gallery-select",
      title: "Select",
      controls: [
        {
          type: "select",
          id: "mode",
          label: "Mode",
          value: "lp",
          options: [
            { value: "lp", label: "Low pass" },
            { value: "hp", label: "High pass" },
            { value: "bp", label: "Band pass" },
          ],
          onChange: noop,
        },
      ],
    },
    {
      id: "gallery-slots",
      title: "Slots",
      controls: [
        {
          type: "slotRow",
          id: "slots",
          morph: 0.5,
          morphText: "0.5 s",
          onSlot: noop,
          onMorph: noop,
          slots: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((label, index) => ({
            label,
            filled: index < 4,
            active: index === 1,
          })),
        },
      ],
    },
    {
      id: "gallery-steps",
      title: "Steps",
      controls: [
        {
          type: "stepGrid",
          id: "grid",
          playhead: 2,
          onToggle: noop,
          rows: [
            {
              id: "kick",
              label: "Kick",
              length: 16,
              steps: Array.from({ length: 16 }, (_, i) => ({
                on: i % 4 === 0,
                accent: i === 0,
                dim: i === 4,
              })),
            },
          ],
        },
      ],
    },
    {
      id: "gallery-filter",
      title: "Filter",
      controls: [
        {
          type: "canvas",
          id: "curve",
          label: "Filter",
          paint: "filter",
          mode: "lp",
          cutoff: 0.45,
          resonance: 0.3,
        },
      ],
    },
    {
      id: "gallery-envelope",
      title: "Envelope",
      controls: [{ type: "canvas", id: "env", label: "Decay", paint: "envelope", decay: 0.35 }],
    },
    {
      id: "gallery-meter",
      title: "Meter",
      controls: [{ type: "canvas", id: "meter", label: "Level", paint: "meter", level: 0.6 }],
    },
    {
      id: "gallery-swatch",
      title: "Swatch",
      controls: [{ type: "canvas", id: "swatch", label: "Tokens", paint: "swatch" }],
    },
    {
      id: "gallery-fx",
      title: "Hacks",
      controls: [
        { type: "fx", id: "drive", title: "Drive", depth: 1, controls: [slider("drive")] },
        { type: "fx", id: "tone", title: "Tone", depth: 2, controls: [slider("tone")] },
        { type: "fx", id: "space", title: "Space", depth: 3, controls: [slider("space")] },
      ],
    },
  ];
  const key = "nc-ui.gallery.hidden";
  const prefixSpec = (spec, suffix) => {
    const mapControl = (control) => ({
      ...control,
      id: `${control.id}${suffix}`,
      controls: control.controls?.map(mapControl),
    });
    return {
      ...spec,
      id: `${spec.id}${suffix}`,
      controls: spec.controls?.map(mapControl),
    };
  };
  try {
    localStorage.setItem(key, JSON.stringify(specs.map((spec) => `${spec.id}-closed`)));
  } catch {
    /* gallery still renders open */
  }
  const open = specs.map((spec) => defineModule({ ...spec, summary: spec.title }, key));
  const knobMod = open.find((mod) => mod.el.dataset.ncModule === "gallery-knob");
  if (knobMod) {
    let tune = 0.3;
    const paintKnob = (value) => {
      tune = value;
      knobMod.update({
        id: "gallery-knob",
        title: "Knob",
        summary: "Knob",
        controls: [
          {
            type: "knob",
            id: "tune",
            label: "Tune",
            min: 0,
            max: 1,
            step: 0.01,
            unit: "Hz",
            value: tune,
            onChange: paintKnob,
          },
        ],
      });
    };
    paintKnob(0.3);
  }
  const closed = specs.map((spec) =>
    defineModule({ ...prefixSpec(spec, "-closed"), summary: "Hidden, still mounted" }, key),
  );
  placeModules(host, [...open, ...closed], "stack");
  return [...open, ...closed];
}
