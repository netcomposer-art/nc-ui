// nc-ui pad grid: a sampler's pads as the way in (Peter, 2026-10-30; NYX's Pad module). Each pad is a button: an
// empty pad says Load (tap it, or drop a file on it); a filled pad shows its name and a small waveform in its lane
// colour. Tap presses it (select and play); long-press or right-click opens its menu (Replace, Rename, Clear…, as
// the host lists them); a file dropped on a pad goes to that pad. The selected pad is outlined in the accent.

const LONG_PRESS_MS = 450;
const SVG = "http://www.w3.org/2000/svg";
/** Columns drawn in a pad's mini waveform. */
const WAVE_COLUMNS = 48;

/** A pad's waveform as an SVG path in a 100 × 20 box (min/max pairs in −1..1, any number of columns). */
export function padWavePath(peaks) {
  const pairs = Math.floor((peaks?.length ?? 0) / 2);
  if (!pairs) return "";
  const cols = Math.min(WAVE_COLUMNS, pairs);
  const top = [];
  const bottom = [];
  for (let c = 0; c < cols; c++) {
    const a = Math.floor((c * pairs) / cols);
    const b = Math.max(a + 1, Math.floor(((c + 1) * pairs) / cols));
    let lo = 0;
    let hi = 0;
    for (let i = a; i < b; i++) {
      lo = Math.min(lo, peaks[2 * i] ?? 0);
      hi = Math.max(hi, peaks[2 * i + 1] ?? 0);
    }
    const x = cols === 1 ? 50 : (c / (cols - 1)) * 100;
    top.push(`${x.toFixed(1)} ${(10 - Math.min(1, hi) * 10).toFixed(2)}`);
    bottom.push(`${x.toFixed(1)} ${(10 - Math.max(-1, lo) * 10).toFixed(2)}`);
  }
  return `M${top.join("L")}L${bottom.reverse().join("L")}Z`;
}

export function renderPadGrid(control, lookup) {
  const wrap = document.createElement("div");
  wrap.className = "nc-pad-grid";
  wrap.dataset.ncId = control.id;
  wrap.dataset.ncRow = "";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", control.label ?? "Pads");
  const grid = document.createElement("div");
  grid.className = "nc-pads";
  grid.dataset.ncColumns = String(control.columns ?? 2);
  control.pads.forEach((_, index) => grid.append(renderPad(wrap, index, lookup)));
  wrap.append(grid);
  wrap.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu(wrap);
  });
  patchPadGrid(wrap, control);
  return wrap;
}

function renderPad(wrap, index, lookup) {
  const pad = document.createElement("button");
  pad.type = "button";
  pad.className = "nc-pad";
  pad.dataset.ncPad = String(index);
  const bar = document.createElement("span");
  bar.className = "nc-pad-bar";
  bar.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.className = "nc-pad-name";
  const hint = document.createElement("span");
  hint.className = "nc-pad-hint";
  const wave = document.createElementNS(SVG, "svg");
  wave.setAttribute("class", "nc-pad-wave");
  wave.setAttribute("viewBox", "0 0 100 20");
  wave.setAttribute("preserveAspectRatio", "none");
  wave.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  wave.append(path);
  pad.append(bar, name, hint, wave);
  bindPadPress(wrap, pad, index, lookup);
  // Drop a file on this pad.
  pad.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    pad.dataset.drop = "true";
  });
  pad.addEventListener("dragleave", () => delete pad.dataset.drop);
  pad.addEventListener("drop", (event) => {
    delete pad.dataset.drop;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    event.preventDefault();
    event.stopPropagation();
    const live = lookup(wrap);
    if (live?.type === "padGrid") live.onFile?.(index, file);
  });
  return pad;
}

function press(wrap, index, lookup) {
  const live = lookup(wrap);
  if (live?.type === "padGrid") live.onPress(index);
}

function bindPadPress(wrap, pad, index, lookup) {
  let timer = 0;
  let opened = false;
  let x0 = 0;
  let y0 = 0;
  const stop = () => {
    window.clearTimeout(timer);
    timer = 0;
  };
  pad.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    opened = false;
    x0 = event.clientX;
    y0 = event.clientY;
    stop();
    timer = window.setTimeout(() => {
      timer = 0;
      opened = openMenu(wrap, pad, index, lookup);
    }, LONG_PRESS_MS);
  });
  pad.addEventListener("pointermove", (event) => {
    if (timer && Math.hypot(event.clientX - x0, event.clientY - y0) > 8) stop();
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"]) pad.addEventListener(type, stop);
  pad.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    stop();
    opened = openMenu(wrap, pad, index, lookup);
  });
  // A tap, or Enter / Space: press. A long press that opened the menu is not also a tap.
  pad.addEventListener("click", () => {
    if (opened) {
      opened = false;
      return;
    }
    press(wrap, index, lookup);
  });
}

/** Open a pad's menu (the host's items for it); false when it lists none. */
function openMenu(wrap, pad, index, lookup) {
  const live = lookup(wrap);
  if (live?.type !== "padGrid" || !live.menu) return false;
  const items = live.menu(index);
  if (!items.length) return false;
  closeMenu(wrap);
  const scrim = document.createElement("div");
  scrim.className = "nc-slot-scrim";
  scrim.setAttribute("aria-hidden", "true");
  scrim.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu(wrap);
  });
  scrim.addEventListener("click", (event) => event.stopPropagation());
  const menu = document.createElement("div");
  menu.className = "nc-slot-menu nc-pad-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", pad.getAttribute("aria-label") ?? "Pad");
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nc-menu-btn";
    button.setAttribute("role", "menuitem");
    button.dataset.ncMenuItem = item.id;
    button.textContent = item.label;
    button.addEventListener("click", () => {
      closeMenu(wrap);
      const now = lookup(wrap);
      if (now?.type === "padGrid") now.onMenu?.(index, item.id);
    });
    menu.append(button);
  }
  wrap.append(scrim, menu);
  const box = wrap.getBoundingClientRect();
  const at = pad.getBoundingClientRect();
  menu.style.left = `${at.left - box.left}px`;
  menu.style.top = `${at.bottom - box.top}px`;
  menu.querySelector("button")?.focus();
  return true;
}

function closeMenu(wrap) {
  for (const el of wrap.querySelectorAll(":scope > .nc-slot-scrim, :scope > .nc-pad-menu")) el.remove();
}

export function patchPadGrid(node, control) {
  const pads = node.querySelectorAll(".nc-pad");
  control.pads.forEach((cell, index) => {
    const pad = pads[index];
    if (!(pad instanceof HTMLButtonElement)) return;
    const name = pad.querySelector(".nc-pad-name");
    const hint = pad.querySelector(".nc-pad-hint");
    const path = pad.querySelector(".nc-pad-wave path");
    if (cell.empty) {
      pad.dataset.empty = "true";
      if (name) name.textContent = control.emptyLabel ?? "Load";
      if (hint) hint.textContent = control.emptyHint ?? "tap or drop a file";
      path?.setAttribute("d", "");
    } else {
      delete pad.dataset.empty;
      if (name) name.textContent = cell.label;
      if (hint) hint.textContent = "";
      path?.setAttribute("d", padWavePath(cell.peaks));
    }
    if (cell.lane) pad.dataset.ncLane = String(cell.lane);
    else delete pad.dataset.ncLane;
    const selected = control.selected === index;
    if (selected) pad.dataset.selected = "true";
    else delete pad.dataset.selected;
    pad.setAttribute("aria-pressed", selected ? "true" : "false");
    if (cell.playing) pad.dataset.playing = "true";
    else delete pad.dataset.playing;
    pad.setAttribute(
      "aria-label",
      cell.empty
        ? `Pad ${index + 1}, empty: load a sample`
        : `Pad ${index + 1}, ${cell.label}${selected ? ", selected" : ""}`,
    );
  });
}
