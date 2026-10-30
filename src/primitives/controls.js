import { readCssPx } from "../alias.js";
import { surpriseColor, surpriseFillStyle, velocityFillStyle } from "../color.js";
import { paintCanvas } from "./canvas.js";
import { createFader, faderHandle } from "./fader.js";
import { bindPadGesture } from "./gesture.js";
import { createMeter, meterHandle } from "./meter.js";
import { createSwitch } from "./switch.js";

function probe() {
  const el = document.createElement("i");
  el.className = "nc-token-probe";
  el.dataset.ncProbe = "";
  return el;
}

function field(id, label) {
  const wrap = document.createElement("div");
  wrap.className = "nc-field";
  wrap.dataset.ncRow = "";
  wrap.dataset.ncId = id;
  const lab = document.createElement("label");
  lab.className = "nc-label";
  lab.htmlFor = id;
  lab.textContent = label;
  const value = document.createElement("span");
  value.className = "nc-readout";
  value.dataset.ncReadout = "";
  wrap.append(lab, value);
  return wrap;
}

function setText(node, text) {
  const probeEl = node.querySelector("[data-nc-probe]");
  node.textContent = text;
  if (probeEl) node.append(probeEl);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

/** Hold this long, and move less than this many CSS pixels, to open the slot menu. */
const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE = 8;

function hitPad() {
  const hit = document.createElement("span");
  hit.className = "nc-hit";
  hit.setAttribute("aria-hidden", "true");
  return hit;
}

function targetPx(root) {
  const value = readCssPx(root, "target-min");
  return value > 0 ? value : 44;
}

/** Grow each hit toward target-min on every pointer, stopping at the next control's midpoint. */
export function placeHits(root) {
  if (!(root instanceof HTMLElement)) return;
  const hits = [...root.querySelectorAll(".nc-hit")];
  const target = targetPx(root);
  const half = target / 2;
  const boxes = hits.map((hit) => hit.parentElement?.getBoundingClientRect() ?? null);
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    const box = boxes[i];
    if (!(hit instanceof HTMLElement) || !box || box.width === 0 || box.height === 0) continue;
    if (box.width >= target && box.height >= target) {
      hit.style.display = "none";
      continue;
    }
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    let left = cx - half;
    let right = cx + half;
    let top = cy - half;
    let bottom = cy + half;
    for (let j = 0; j < hits.length; j++) {
      if (i === j) continue;
      const other = boxes[j];
      if (!other || other.width === 0) continue;
      const ox = other.left + other.width / 2;
      const oy = other.top + other.height / 2;
      if (Math.abs(oy - cy) < half * 2) {
        if (ox > cx) right = Math.min(right, (cx + ox) / 2);
        else if (ox < cx) left = Math.max(left, (cx + ox) / 2);
      }
      if (Math.abs(ox - cx) < half * 2) {
        if (oy > cy) bottom = Math.min(bottom, (cy + oy) / 2);
        else if (oy < cy) top = Math.max(top, (cy + oy) / 2);
      }
    }
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
    top = Math.min(top, box.top);
    bottom = Math.max(bottom, box.bottom);
    hit.style.left = `${left - box.left}px`;
    hit.style.top = `${top - box.top}px`;
    hit.style.width = `${Math.max(0, right - left)}px`;
    hit.style.height = `${Math.max(0, bottom - top)}px`;
    hit.style.transform = "none";
  }
}

function sparkleSvg() {
  return '<svg viewBox="0 0 14 14" aria-hidden="true"><path fill="currentColor" d="M7 0 8.1 5.9 14 7 8.1 8.1 7 14 5.9 8.1 0 7 5.9 5.9Z"/></svg>';
}

// A die (five pips): re-roll one lane. The sparkle stays for Surprise, which re-rolls the whole pattern.
function diceSvg() {
  return '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="4.5" cy="4.5" r="1.1" fill="currentColor"/><circle cx="9.5" cy="4.5" r="1.1" fill="currentColor"/><circle cx="7" cy="7" r="1.1" fill="currentColor"/><circle cx="4.5" cy="9.5" r="1.1" fill="currentColor"/><circle cx="9.5" cy="9.5" r="1.1" fill="currentColor"/></svg>';
}

export function renderControl(control, lookup) {
  switch (control.type) {
    case "slider":
      return renderSlider(control, lookup);
    case "select":
      return renderSelect(control, lookup);
    case "toggle":
      return renderToggle(control, lookup);
    case "button":
      return renderButton(control, lookup);
    case "readout":
      return renderReadout(control);
    case "label":
      return renderLabel(control);
    case "note":
      return renderNote(control);
    case "knob":
      return renderKnob(control, lookup);
    case "choice":
      return renderChoice(control, lookup);
    case "slotRow":
      return renderSlots(control, lookup);
    case "stepGrid":
      return renderSteps(control, lookup);
    case "canvas":
      return renderCanvas(control);
    case "fx":
      return renderFx(control, lookup);
    case "strip":
      return renderStrip(control, lookup);
    case "stripAdd":
      return renderStripAdd(control, lookup);
    default:
      return renderNote({ type: "note", id: "unknown", text: "" });
  }
}

export function patchControl(node, control) {
  if (!(node instanceof Element) || node.dataset.ncId !== control.id) return;
  if (control.type === "slider" && node instanceof HTMLElement) {
    const input = node.querySelector("input");
    const label = node.querySelector("label");
    if (label) label.textContent = control.label;
    if (input instanceof HTMLInputElement) {
      input.disabled = control.disabled === true;
      markModulated(input, control.modulated === true);
      if (document.activeElement !== input) input.value = String(control.value);
      if (control.valueText) input.setAttribute("aria-valuetext", control.valueText);
      else input.removeAttribute("aria-valuetext");
    }
    const readout = node.querySelector("[data-nc-readout]");
    if (readout) readout.textContent = control.valueText ?? formatNumber(control.value);
  } else if (control.type === "select") {
    const input = node.querySelector("select");
    if (input instanceof HTMLSelectElement && document.activeElement !== input)
      input.value = control.value;
  } else if (control.type === "toggle" && node instanceof HTMLButtonElement) {
    node.setAttribute("aria-pressed", control.pressed ? "true" : "false");
  } else if (control.type === "button" && node instanceof HTMLButtonElement) {
    node.dataset.on = control.on ? "true" : "false";
    node.setAttribute("aria-pressed", control.on ? "true" : "false");
    setText(node, control.label);
    if (control.ariaLabel) node.setAttribute("aria-label", control.ariaLabel);
    else node.removeAttribute("aria-label");
  } else if (control.type === "readout") {
    const value = node.querySelector("[data-nc-readout]");
    if (value) value.textContent = control.value;
  } else if (control.type === "label" || control.type === "note") {
    setText(node, control.text);
  } else if (control.type === "knob") {
    const knob = node.querySelector(".nc-knob");
    if (knob instanceof HTMLElement) paintKnob(knob, control);
    const readout = node.querySelector("[data-nc-readout]");
    if (readout) readout.textContent = control.valueText ?? formatNumber(control.value);
  } else if (control.type === "choice") patchChoice(node, control);
  else if (control.type === "slotRow") patchSlots(node, control);
  else if (control.type === "stepGrid") patchSteps(node, control);
  else if (control.type === "canvas" && node instanceof HTMLElement) {
    const canvas = node.querySelector("canvas");
    if (canvas instanceof HTMLCanvasElement) paintCanvas(canvas, control);
  } else if (control.type === "strip") {
    patchStrip(node, control);
    for (const child of control.sends ?? []) {
      const childNode = node.querySelector(`[data-nc-id="${cssEscape(child.id)}"]`);
      if (childNode instanceof Element) patchControl(childNode, { ...child, type: "knob", compact: true });
    }
  } else if (control.type === "stripAdd") {
    patchStripAdd(node, control);
  } else if (control.type === "fx") {
    patchFx(node, control);
    for (const child of [...control.controls, ...(control.more ?? [])]) {
      const childNode = node.querySelector(`[data-nc-id="${cssEscape(child.id)}"]`);
      if (childNode instanceof Element) patchControl(childNode, child);
    }
  }
}

function renderSlider(control, lookup) {
  const wrap = field(control.id, control.label);
  // ASTRID slider row: label and value on one line, the slider full width below.
  wrap.dataset.ncSlider = "";
  const input = document.createElement("input");
  input.type = "range";
  input.className = "nc-range";
  input.id = control.id;
  input.min = String(control.min);
  input.max = String(control.max);
  input.step = String(control.step);
  input.value = String(control.value);
  input.disabled = control.disabled === true;
  input.dataset.ncId = control.id;
  input.addEventListener("input", () => {
    const live = lookup(input);
    if (live?.type === "slider") live.onChange(Number(input.value));
  });
  input.addEventListener("change", () => {
    const live = lookup(input);
    if (live?.type === "slider") live.onCommit?.(Number(input.value));
  });
  const readout = wrap.querySelector("[data-nc-readout]");
  wrap.insertBefore(input, readout);
  if (control.onTap) wrap.insertBefore(tapButton(control, input, lookup), readout);
  wrap.append(probe());
  patchControl(wrap, control);
  return wrap;
}

/** Tap tempo on a slider's label line: timed on pointerdown (not click) so release latency stays out. */
function tapButton(control, input, lookup) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nc-tap";
  button.dataset.ncTap = control.id;
  button.textContent = "Tap";
  button.setAttribute("aria-label", `Tap ${control.label.toLowerCase()}`);
  button.title = `Tap ${control.label.toLowerCase()}: tap the beat, two taps or more`;
  button.append(hitPad());
  const fire = (timeMs) => {
    const live = lookup(input);
    if (live?.type === "slider") live.onTap?.(timeMs);
  };
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    fire(event.timeStamp);
  });
  button.addEventListener("keydown", (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    fire(event.timeStamp);
  });
  return button;
}

function renderSelect(control, lookup) {
  const wrap = field(control.id, control.label);
  const input = document.createElement("select");
  input.className = "nc-select";
  input.id = control.id;
  input.dataset.ncId = control.id;
  for (const option of control.options) {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    input.append(el);
  }
  input.value = control.value;
  input.addEventListener("change", () => {
    const live = lookup(input);
    if (live?.type === "select") live.onChange(input.value);
  });
  wrap.append(input, probe());
  return wrap;
}

function renderToggle(control, lookup) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nc-toggle";
  button.id = control.id;
  button.dataset.ncId = control.id;
  button.dataset.ncRow = "";
  if (control.role) button.dataset.ncRole = control.role;
  button.textContent = control.label;
  button.addEventListener("click", () => {
    const live = lookup(button);
    if (live?.type === "toggle") live.onPress();
  });
  button.append(probe());
  patchControl(button, control);
  return button;
}

function renderButton(control, lookup) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nc-btn";
  button.id = control.id;
  button.dataset.ncId = control.id;
  button.addEventListener("click", () => {
    const live = lookup(button);
    if (live?.type === "button") live.onPress();
  });
  button.append(probe());
  patchControl(button, control);
  if (!control.onSparkle) return button;
  // A main action with its Surprise button beside it (Bass's 44 px sparkle next to Play).
  const row = document.createElement("div");
  row.className = "nc-play-row";
  const spark = document.createElement("button");
  spark.type = "button";
  spark.className = "nc-sparkle-btn";
  spark.dataset.ncSparkle = control.id;
  spark.setAttribute("aria-label", "Surprise me");
  spark.title = control.sparkleTitle ?? "Surprise me";
  spark.innerHTML = sparkleSvg();
  spark.addEventListener("click", () => {
    const slots = button.closest(".nc-module")?.querySelector(".nc-slot-row");
    if (slots instanceof HTMLElement) surprise(slots);
    const live = lookup(button);
    if (live?.type === "button") live.onSparkle?.();
  });
  row.append(button, spark);
  return row;
}

function renderReadout(control) {
  const wrap = field(control.id, control.label);
  wrap.append(probe());
  patchControl(wrap, control);
  return wrap;
}

function renderLabel(control) {
  const el = document.createElement("span");
  el.className = "nc-label";
  el.dataset.ncId = control.id;
  el.dataset.ncText = "";
  el.textContent = control.text;
  el.append(probe());
  return el;
}

function renderNote(control) {
  const el = document.createElement("p");
  el.className = "nc-note";
  el.dataset.ncId = control.id;
  el.dataset.ncRow = "";
  el.textContent = control.text;
  el.append(probe());
  return el;
}

function knobValueText(control) {
  if (typeof control.valueText === "string") return control.valueText;
  const number = formatNumber(control.value);
  const unit = typeof control.unit === "string" ? control.unit : "";
  if (unit === "") return number;
  if (unit === "%") return `${number}%`;
  return `${number} ${unit}`;
}

function markModulated(el, modulated) {
  if (modulated) el.dataset.modulated = "true";
  else delete el.dataset.modulated;
}

function paintKnob(knob, control) {
  const span = control.max - control.min || 1;
  const t = (control.value - control.min) / span;
  markModulated(knob, control.modulated === true);
  knob.style.setProperty("--knob-turn", String(Math.round(t * 270)));
  knob.setAttribute("role", "slider");
  knob.setAttribute("aria-valuemin", String(control.min));
  knob.setAttribute("aria-valuemax", String(control.max));
  knob.setAttribute("aria-valuenow", String(control.value));
  knob.setAttribute("aria-valuetext", knobValueText(control));
  knob.setAttribute("aria-label", control.ariaLabel ?? control.label);
  knob.title = `${control.ariaLabel ?? control.label}: ${knobValueText(control)}`;
}

function nudgeKnob(live, event) {
  const span = live.max - live.min || 1;
  const step = typeof live.step === "number" && live.step > 0 ? live.step : span / 100;
  const fine = event.shiftKey ? step / 10 : step;
  if (event.key === "Home") return live.min;
  if (event.key === "End") return live.max;
  if (event.key === "PageUp") return live.value + step * 10;
  if (event.key === "PageDown") return live.value - step * 10;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") return live.value + fine;
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") return live.value - fine;
  return null;
}

function renderKnob(control, lookup) {
  const wrap = field(control.id, control.label);
  // Compact (a strip's sends): the knob over its label, the value in the knob's title and aria-valuetext.
  if (control.compact) wrap.dataset.ncCompact = "";
  const knob = document.createElement("button");
  knob.type = "button";
  knob.className = "nc-knob";
  knob.dataset.ncId = control.id;
  const mark = document.createElement("i");
  mark.className = "nc-knob-mark";
  knob.append(mark);
  let startY = 0;
  let startVal = 0;
  knob.addEventListener("pointerdown", (event) => {
    startY = event.clientY;
    const live = lookup(knob);
    startVal = live && "value" in live ? Number(live.value) : 0;
    knob.setPointerCapture?.(event.pointerId);
  });
  knob.addEventListener("pointermove", (event) => {
    if (knob.hasPointerCapture && !knob.hasPointerCapture(event.pointerId)) return;
    const live = lookup(knob);
    if (live?.type !== "knob") return;
    const span = live.max - live.min || 1;
    const next = Math.min(
      live.max,
      Math.max(live.min, startVal - ((event.clientY - startY) * span) / 120),
    );
    live.onChange(next);
  });
  knob.addEventListener("dblclick", () => {
    const live = lookup(knob);
    if (live?.type === "knob" && typeof live.defaultValue === "number") live.onChange(live.defaultValue);
  });
  knob.addEventListener("keydown", (event) => {
    const live = lookup(knob);
    if (live?.type !== "knob") return;
    const raw = nudgeKnob(live, event);
    if (raw === null) return;
    event.preventDefault();
    live.onChange(Math.min(live.max, Math.max(live.min, raw)));
  });
  const readout = wrap.querySelector("[data-nc-readout]");
  wrap.insertBefore(knob, readout);
  wrap.append(probe());
  patchControl(wrap, control);
  return wrap;
}

function renderChoice(control, lookup) {
  const row = document.createElement("div");
  row.className = "nc-choice-row";
  row.dataset.ncId = control.id;
  row.dataset.ncRow = "";
  row.setAttribute("role", "tablist");
  row.setAttribute("aria-label", control.label);
  for (const option of control.options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nc-choice";
    button.dataset.ncChoice = option.value;
    button.setAttribute("role", "tab");
    button.textContent = option.label;
    button.addEventListener("click", () => {
      const live = lookup(row);
      if (live?.type === "choice") live.onChange(option.value);
    });
    button.addEventListener("keydown", (event) => {
      const tabs = [...row.querySelectorAll("[data-nc-choice]")];
      const index = tabs.indexOf(button);
      let next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
        next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      const target = tabs[next];
      if (!(target instanceof HTMLButtonElement)) return;
      event.preventDefault();
      target.focus();
      target.click();
    });
    row.append(button);
  }
  row.append(probe());
  patchChoice(row, control);
  return row;
}

function patchChoice(node, control) {
  for (const tab of node.querySelectorAll("[data-nc-choice]")) {
    if (!(tab instanceof HTMLButtonElement)) continue;
    const on = tab.dataset.ncChoice === control.value;
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
  }
}

function renderSlots(control, lookup) {
  const row = document.createElement("div");
  row.className = "nc-slot-row";
  row.dataset.ncRow = "";
  row.dataset.ncId = control.id;
  const slots = document.createElement("div");
  slots.className = "nc-snap-row";
  slots.setAttribute("role", "group");
  slots.setAttribute("aria-label", "Snapshots");
  for (let index = 0; index < control.slots.length; index++) {
    const slot = control.slots[index];
    const wrap = document.createElement("span");
    wrap.className = "nc-snap-wrap";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nc-snap";
    button.dataset.ncSlot = String(index);
    button.textContent = slot.label;
    button.title = "Recall. Long-press to save or clear. Shift-click saves. Option-click clears.";
    wrap.append(button, hitPad());
    bindSlotPress(wrap, button, row, index, lookup);
    slots.append(wrap);
  }
  // Only when the row owns Surprise; a button control with onSparkle puts it next to Play instead.
  const spark = control.onSparkle ? document.createElement("button") : null;
  if (spark) {
    spark.type = "button";
    spark.className = "nc-sparkle";
    spark.setAttribute("aria-label", "Surprise me");
    spark.innerHTML = sparkleSvg();
    spark.append(hitPad());
    spark.addEventListener("click", () => {
      surprise(row);
      const live = lookup(row);
      if (live?.type === "slotRow") live.onSparkle?.();
    });
  }
  // Morph uses the slider-row layout (label and value on one line, the slider full width under them).
  const morphField = document.createElement("div");
  morphField.className = "nc-field nc-morph-field";
  morphField.dataset.ncSlider = "";
  const morphLabel = document.createElement("span");
  morphLabel.className = "nc-label";
  morphLabel.textContent = "Morph";
  const morph = document.createElement("input");
  morph.type = "range";
  morph.className = "nc-range nc-morph";
  morph.min = "0";
  morph.max = "4";
  morph.step = "0.01";
  morph.setAttribute("aria-label", "Morph time");
  morph.addEventListener("input", () => {
    const live = lookup(row);
    if (live?.type === "slotRow") live.onMorph(Number(morph.value));
  });
  const readout = document.createElement("span");
  readout.className = "nc-readout nc-morph-readout";
  readout.dataset.ncMorph = "";
  morphField.append(morphLabel, readout, morph);
  const line = document.createElement("div");
  line.className = "nc-slot-line";
  line.append(slots, ...(spark ? [spark] : []));
  row.append(line, morphField, probe());
  ensureSlotMenu(row, lookup);
  patchSlots(row, control);
  return row;
}

function runSlot(row, index, lookup, event) {
  const live = lookup(row);
  if (live?.type !== "slotRow") return;
  closeSlotMenu(row);
  const op = event.shiftKey ? "store" : event.altKey ? "clear" : "recall";
  live.onSlot(index, op);
}

function bindSlotPress(wrap, button, row, index, lookup) {
  let timer = 0;
  let startX = 0;
  let startY = 0;
  let moved = false;
  let opened = false;
  let handled = false;
  let listening = false;

  const stop = () => {
    window.clearTimeout(timer);
    timer = 0;
  };
  const onMove = (event) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (dx * dx + dy * dy > LONG_PRESS_MOVE * LONG_PRESS_MOVE) {
      moved = true;
      stop();
    }
  };
  const unlisten = () => {
    if (!listening) return;
    listening = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
  };
  const onUp = (event) => {
    const short = timer !== 0 && !moved && !opened;
    stop();
    unlisten();
    if (!short) return;
    handled = true;
    runSlot(row, index, lookup, event);
  };
  const onCancel = () => {
    moved = true;
    stop();
    unlisten();
  };

  wrap.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    unlisten();
    opened = false;
    moved = false;
    handled = false;
    startX = event.clientX;
    startY = event.clientY;
    stop();
    timer = window.setTimeout(() => {
      timer = 0;
      if (moved) return;
      opened = true;
      openSlotMenu(row, button, index, lookup);
    }, LONG_PRESS_MS);
    listening = true;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  });
  wrap.addEventListener("contextmenu", (event) => event.preventDefault());
  wrap.addEventListener("click", (event) => {
    if (handled || opened || moved) {
      handled = false;
      opened = false;
      moved = false;
      return;
    }
    runSlot(row, index, lookup, event);
  });
}

function ensureSlotMenu(row, lookup) {
  if (row.querySelector(".nc-slot-menu")) return;
  const menu = document.createElement("div");
  menu.className = "nc-slot-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Slot");
  const save = menuButton("Save", "store");
  const clear = menuButton("Clear", "clear");
  menu.append(save, clear);
  // Tap outside to dismiss: a transparent layer under the menu takes the tap, so it closes the menu
  // without also pressing whatever control sits under the finger.
  const scrim = document.createElement("div");
  scrim.className = "nc-slot-scrim";
  scrim.hidden = true;
  scrim.setAttribute("aria-hidden", "true");
  scrim.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeSlotMenu(row);
  });
  scrim.addEventListener("click", (event) => event.stopPropagation());
  row.append(scrim, menu);
  menu.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const live = lookup(row);
    if (live?.type !== "slotRow") return;
    const index = Number(menu.dataset.ncIndex);
    if (target.dataset.ncSlotOp === "store") {
      live.onSlot(index, "store");
      closeSlotMenu(row);
    } else if (target.dataset.ncSlotOp === "clear") {
      // Clear at once. The host offers Undo (Rhythm shows a toast), so there is no confirm step.
      live.onSlot(index, "clear");
      closeSlotMenu(row);
    }
  });
  row.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSlotMenu(row);
  });
}

function menuButton(label, op) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nc-menu-btn";
  button.dataset.ncSlotOp = op;
  button.setAttribute("role", "menuitem");
  button.textContent = label;
  return button;
}

function openSlotMenu(row, button, index, lookup) {
  ensureSlotMenu(row, lookup);
  const menu = row.querySelector(".nc-slot-menu");
  if (!(menu instanceof HTMLElement)) return;
  const scrim = row.querySelector(".nc-slot-scrim");
  if (scrim instanceof HTMLElement) scrim.hidden = false;
  menu.hidden = false;
  menu.dataset.ncIndex = String(index);
  const rowBox = row.getBoundingClientRect();
  const box = button.getBoundingClientRect();
  menu.style.left = `${box.left - rowBox.left}px`;
  menu.style.top = `${box.bottom - rowBox.top}px`;
  menu.querySelector("button")?.focus();
}

function closeSlotMenu(row) {
  const menu = row.querySelector(".nc-slot-menu");
  const scrim = row.querySelector(".nc-slot-scrim");
  if (menu instanceof HTMLElement) menu.hidden = true;
  if (scrim instanceof HTMLElement) scrim.hidden = true;
}

function patchSlots(node, control) {
  for (const button of node.querySelectorAll("[data-nc-slot]")) {
    if (!(button instanceof HTMLButtonElement)) continue;
    const index = Number(button.dataset.ncSlot);
    const slot = control.slots[index];
    if (!slot) continue;
    button.textContent = slot.label;
    if (slot.filled) button.dataset.filled = "true";
    else delete button.dataset.filled;
    if (slot.active) button.dataset.active = "true";
    else delete button.dataset.active;
    if (slot.edited) button.dataset.edited = "true";
    else delete button.dataset.edited;
    if (slot.queued) button.dataset.queued = "true";
    else delete button.dataset.queued;
    if (slot.queued && slot.pulse) button.dataset.pulse = "true";
    else delete button.dataset.pulse;
    const state = [
      slot.filled ? "saved" : "empty",
      slot.active ? "playing" : "",
      slot.edited ? "edited" : "",
      slot.queued ? "queued, tap again to switch now" : "",
    ];
    button.setAttribute("aria-label", [slot.label, ...state.filter(Boolean)].join(", "));
  }
  const morph = node.querySelector(".nc-morph");
  if (morph instanceof HTMLInputElement && document.activeElement !== morph)
    morph.value = String(control.morph);
  const readout = node.querySelector("[data-nc-morph]");
  if (readout) readout.textContent = control.morphText;
}

function surprise(row) {
  const previous = row.dataset.ncLastFill || null;
  const fill = surpriseColor(previous);
  row.dataset.ncLastFill = fill;
  const style = surpriseFillStyle(fill);
  if (!style) return;
  for (const [key, value] of Object.entries(style)) row.style.setProperty(key, value);
}

/** Hold-for-Fill: onFill(true) while a pointer or Space/Enter holds it, onFill(false) on any release. */
function holdButton(wrap, lookup) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nc-fill";
  button.dataset.ncFill = "";
  button.textContent = "Fill";
  button.title = "Hold for a fill";
  button.setAttribute("aria-pressed", "false");
  let held = false;
  const set = (on) => {
    if (held === on) return;
    held = on;
    button.setAttribute("aria-pressed", on ? "true" : "false");
    const live = lookup(wrap);
    if (live?.type === "stepGrid") live.onFill?.(on);
  };
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    set(true);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture", "blur"]) {
    button.addEventListener(type, () => set(false));
  }
  button.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) set(true);
  });
  button.addEventListener("keyup", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    set(false);
  });
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  return button;
}

function renderSteps(control, lookup) {
  const wrap = document.createElement("div");
  wrap.className = "nc-section";
  wrap.dataset.ncId = control.id;
  // Step tool, Bass-style segmented control: what a tap on a step paints (Shift-click still accents).
  const tools = document.createElement("div");
  tools.className = "nc-seg";
  tools.setAttribute("role", "radiogroup");
  tools.setAttribute("aria-label", "Step tool");
  const tool = (text) => {
    const option = document.createElement("button");
    option.type = "button";
    option.setAttribute("role", "radio");
    option.textContent = text;
    tools.append(option);
    return option;
  };
  const note = tool("Note");
  const accent = tool("Accent");
  accent.dataset.ncAccentMode = "";
  const pick = (option) => {
    for (const item of [note, accent]) {
      const on = item === option;
      item.setAttribute("aria-checked", on ? "true" : "false");
      item.tabIndex = on ? 0 : -1;
    }
  };
  pick(note);
  for (const option of [note, accent]) option.addEventListener("click", () => pick(option));
  tools.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const next = accent.getAttribute("aria-checked") === "true" ? note : accent;
    pick(next);
    next.focus();
  });
  // Tools row: the step tool, then (when the host wires onFill) a hold-for-Fill button.
  const toolbar = document.createElement("div");
  toolbar.className = "nc-step-tools";
  toolbar.append(tools);
  if (control.onFill) toolbar.append(holdButton(wrap, lookup));
  wrap.append(toolbar);
  for (const row of control.rows) {
    const line = document.createElement("div");
    line.className = "nc-row";
    line.dataset.ncRow = "";
    const name = document.createElement("button");
    name.type = "button";
    name.className = "nc-name";
    name.textContent = row.label;
    name.setAttribute("aria-label", `Select ${row.label}`);
    if (row.lane) name.dataset.ncLane = String(((row.lane - 1) % 4) + 1);
    name.addEventListener("click", () => {
      const live = lookup(wrap);
      if (live?.type !== "stepGrid") return;
      const rowIndex = live.rows.findIndex((item) => item.id === row.id);
      live.onSelectRow?.(rowIndex);
    });
    name.addEventListener("keydown", (event) => moveLane(wrap, name, event));
    // M/S at the lane start, only when the host wires them (one tap, no Voice-card detour).
    const lead = [];
    for (const kind of ["mute", "solo"]) {
      const handler = kind === "mute" ? control.onMute : control.onSolo;
      if (!handler) continue;
      const pad = document.createElement("span");
      pad.className = "nc-ms-wrap";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nc-ms";
      button.dataset.ncMs = kind;
      button.textContent = kind === "mute" ? "M" : "S";
      button.setAttribute("aria-label", `${kind === "mute" ? "Mute" : "Solo"} ${row.label}`);
      pad.append(button, hitPad());
      pad.addEventListener("click", () => {
        const live = lookup(wrap);
        if (live?.type !== "stepGrid") return;
        const rowIndex = live.rows.findIndex((item) => item.id === row.id);
        (kind === "mute" ? live.onMute : live.onSolo)?.(rowIndex);
      });
      lead.push(pad);
    }
    const steps = document.createElement("div");
    steps.className = "nc-steps";
    for (let step = 0; step < row.steps.length; step++) {
      const cell = document.createElement("span");
      cell.className = "nc-step-wrap";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nc-step";
      button.dataset.ncStep = `${row.id}:${step}`;
      button.setAttribute("aria-label", `${row.label} step ${step + 1}`);
      cell.append(button, hitPad());
      cell.addEventListener("click", (event) => {
        const live = lookup(wrap);
        if (live?.type !== "stepGrid") return;
        const rowIndex = live.rows.findIndex((item) => item.id === row.id);
        const mode = accent.getAttribute("aria-checked") === "true";
        live.onToggle(rowIndex, step, event.shiftKey || mode);
      });
      steps.append(cell);
    }
    if (control.onLength) steps.append(lengthHandle(wrap, steps, row, lookup));
    line.append(...lead, name, steps);
    // Per-row dice: the Surprise glyph at lane scale. New steps for this lane only; the host's
    // Surprise Undo takes it back.
    if (control.onDice) {
      const dice = document.createElement("button");
      dice.type = "button";
      dice.className = "nc-sparkle nc-row-dice";
      dice.dataset.ncDice = row.id;
      dice.setAttribute("aria-label", `Re-roll ${row.label}`);
      dice.title = `Re-roll ${row.label}: new steps for this lane (Undo takes it back)`;
      dice.innerHTML = diceSvg();
      dice.append(hitPad());
      dice.addEventListener("click", () => {
        const live = lookup(wrap);
        if (live?.type !== "stepGrid") return;
        live.onDice?.(live.rows.findIndex((item) => item.id === row.id));
      });
      line.append(dice);
    }
    // Phone layout: the row is an overview and a lane picker; the pads below edit.
    line.addEventListener("click", (event) => {
      if (event.target !== line) return;
      const live = lookup(wrap);
      if (live?.type !== "stepGrid") return;
      live.onSelectRow?.(live.rows.findIndex((item) => item.id === row.id));
    });
    bindStepGesture(wrap, steps, ".nc-step-wrap", lookup, accent, () => row.id);
    wrap.append(line);
  }
  // Phone pad header: the lane name with prev/next (44 px) and, when the host wires a transport, a mini
  // Play. It sticks to the top while the pads are on screen, so a beat can be built without scrolling.
  const head = document.createElement("div");
  head.className = "nc-pads-head";
  const headButton = (cls, text, label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = cls;
    button.textContent = text;
    if (label) button.setAttribute("aria-label", label);
    return button;
  };
  const prev = headButton("nc-pads-step", "\u2039", "Previous lane");
  const next = headButton("nc-pads-step", "\u203a", "Next lane");
  // With onLength, the lane name is a toggle: length mode shows every pad and a tap or drag sets the end.
  const laneName = document.createElement(control.onLength ? "button" : "span");
  laneName.className = "nc-pads-label";
  laneName.setAttribute("aria-live", "polite");
  if (control.onLength) {
    laneName.type = "button";
    laneName.dataset.ncLenToggle = "";
    laneName.addEventListener("click", () => {
      const live = lookup(wrap);
      if (live?.type !== "stepGrid") return;
      if (wrap.dataset.ncLenMode === "true") delete wrap.dataset.ncLenMode;
      else wrap.dataset.ncLenMode = "true";
      patchSteps(wrap, live);
    });
  }
  for (const [button, delta] of [
    [prev, -1],
    [next, 1],
  ]) {
    button.addEventListener("click", () => {
      const live = lookup(wrap);
      if (live?.type !== "stepGrid" || live.rows.length === 0) return;
      const n = live.rows.length;
      live.onSelectRow?.((((selectedIndex(live) + delta) % n) + n) % n);
    });
  }
  head.append(prev, laneName, next);
  if (control.onDice) {
    const dice = headButton("nc-pads-step nc-pads-dice", "", "Re-roll lane");
    dice.dataset.ncPadsDice = "";
    dice.innerHTML = diceSvg();
    dice.addEventListener("click", () => {
      const live = lookup(wrap);
      if (live?.type !== "stepGrid") return;
      const rowIndex = selectedIndex(live);
      if (rowIndex >= 0) live.onDice?.(rowIndex);
    });
    head.append(dice);
  }
  if (control.transport) {
    const play = headButton("nc-pads-play", "Play");
    play.dataset.ncPadsPlay = "";
    play.addEventListener("click", () => {
      const live = lookup(wrap);
      if (live?.type === "stepGrid") live.transport?.onToggle();
    });
    head.append(play);
  }
  wrap.append(head);
  // 4x4 pads for the selected lane (one row = one beat), shown below the registered phone breakpoint.
  const pads = document.createElement("div");
  pads.className = "nc-pads";
  pads.setAttribute("role", "group");
  const count = Math.max(0, ...control.rows.map((row) => row.steps.length));
  for (let step = 0; step < count; step++) {
    const pad = document.createElement("button");
    pad.type = "button";
    pad.className = "nc-pad";
    pad.dataset.ncPad = String(step);
    pad.textContent = String(step + 1);
    pad.addEventListener("click", (event) => {
      const live = lookup(wrap);
      if (live?.type !== "stepGrid") return;
      const rowIndex = selectedIndex(live);
      if (rowIndex < 0) return;
      if (wrap.dataset.ncLenMode === "true") {
        live.onLength?.(rowIndex, step + 1);
        return;
      }
      const mode = accent.getAttribute("aria-checked") === "true";
      live.onToggle(rowIndex, step, event.shiftKey || mode);
    });
    pads.append(pad);
  }
  bindStepGesture(wrap, pads, ".nc-pad", lookup, accent, () => {
    const live = lookup(wrap);
    return live?.type === "stepGrid" ? live.rows[selectedIndex(live)]?.id : undefined;
  });
  wrap.append(pads);
  wrap.append(probe());
  patchSteps(wrap, control);
  return wrap;
}

function selectedIndex(live) {
  const index = live.rows.findIndex((item) => item.id === live.selectedRow);
  return index >= 0 ? index : live.rows.length > 0 ? 0 : -1;
}

/** Swipe-to-paint and long-press on one row of steps, via the shared nc-ui pad recogniser. */
function bindStepGesture(wrap, host, selector, lookup, accent, rowId) {
  let field = "on";
  let value = true;
  let rowIndex = -1;
  const set = (live, step) => {
    const cell = live.rows[rowIndex]?.steps[step];
    if (!cell || step >= live.rows[rowIndex].length) return;
    if (live.onSet) live.onSet(rowIndex, step, field, value);
    else if (Boolean(cell[field]) !== value) live.onToggle(rowIndex, step, field === "accent");
  };
  bindPadGesture(host, selector, (intent) => {
    const live = lookup(wrap);
    if (live?.type !== "stepGrid") return;
    if (wrap.dataset.ncLenMode === "true" && host.classList.contains("nc-pads")) {
      // Length mode: a drag across the pads moves the lane's end; no painting, no long-press sheet.
      if (intent.kind !== "paint") return;
      const index = live.rows.findIndex((item) => item.id === rowId());
      if (index >= 0 && live.rows[index].length !== intent.pad + 1)
        live.onLength?.(index, intent.pad + 1);
      return;
    }
    if (intent.kind === "paint") {
      if (intent.phase === "start") {
        const id = rowId();
        rowIndex = live.rows.findIndex((item) => item.id === id);
        const cell = live.rows[rowIndex]?.steps[intent.pad];
        if (!cell) return;
        field = accent.getAttribute("aria-checked") === "true" ? "accent" : "on";
        value = !cell[field];
      }
      set(live, intent.pad);
    } else if (intent.kind === "long") {
      const id = rowId();
      const index = live.rows.findIndex((item) => item.id === id);
      const anchor = host.querySelectorAll(selector)[intent.pad];
      if (index >= 0 && anchor instanceof HTMLElement)
        live.onLongPress?.(index, intent.pad, anchor);
    }
  });
}

function moveLane(wrap, name, event) {
  if (
    event.key !== "ArrowDown" &&
    event.key !== "ArrowUp" &&
    event.key !== "Home" &&
    event.key !== "End"
  )
    return;
  const names = [...wrap.querySelectorAll(".nc-name")];
  const index = names.indexOf(name);
  let next = index;
  if (event.key === "ArrowDown") next = index + 1;
  else if (event.key === "ArrowUp") next = index - 1;
  else if (event.key === "Home") next = 0;
  else next = names.length - 1;
  const target = names[next];
  if (!(target instanceof HTMLElement) || target === name) return;
  event.preventDefault();
  target.focus();
  target.click();
}

/**
 * The end handle of a row: sits after the row's last step (shown on the selected row). Drag it along the row,
 * or use the arrow keys, Home and End, to set the lane length. Window listeners, not pointer capture, because
 * patchSteps moves the handle in the DOM as the length changes.
 */
function lengthHandle(wrap, steps, row, lookup) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "nc-len-handle";
  handle.dataset.ncLen = row.id;
  handle.setAttribute("role", "slider");
  handle.setAttribute("aria-valuemin", "1");
  handle.setAttribute("aria-valuemax", String(row.steps.length));
  handle.append(hitPad());
  const set = (length) => {
    const live = lookup(wrap);
    if (live?.type !== "stepGrid") return;
    const index = live.rows.findIndex((item) => item.id === row.id);
    const current = live.rows[index];
    if (!current) return;
    const next = Math.max(1, Math.min(current.steps.length, length));
    if (next !== current.length) live.onLength?.(index, next);
  };
  const lengthAt = (x) => {
    const cells = [...steps.querySelectorAll(".nc-step")];
    let length = 1;
    cells.forEach((cell, index) => {
      const box = cell.getBoundingClientRect();
      if (box.width > 0 && x >= box.left + box.width / 2) length = index + 1;
    });
    return length;
  };
  const onMove = (event) => set(lengthAt(event.clientX));
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    delete handle.dataset.dragging;
  };
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    handle.dataset.dragging = "true";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  });
  handle.addEventListener("keydown", (event) => {
    const live = lookup(wrap);
    if (live?.type !== "stepGrid") return;
    const current = live.rows.find((item) => item.id === row.id);
    if (!current) return;
    const keys = {
      ArrowLeft: current.length - 1,
      ArrowDown: current.length - 1,
      ArrowRight: current.length + 1,
      ArrowUp: current.length + 1,
      Home: 1,
      End: current.steps.length,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    set(keys[event.key]);
  });
  return handle;
}

// The velocity each step or pad last painted, so velocityFill runs and the style is written only when it changes
// (patchSteps runs on every playhead step).
const paintedVelocity = new WeakMap();
/** Fill a cell at its velocity (runtime velocity-fill); a cell with no velocity keeps the plain on fill. */
function paintVelocity(el, velocity) {
  const next = typeof velocity === "number" ? velocity : null;
  if (paintedVelocity.has(el) && paintedVelocity.get(el) === next) return;
  paintedVelocity.set(el, next);
  if (next === null) {
    for (const name of Object.keys(velocityFillStyle(1))) el.style.removeProperty(name);
    return;
  }
  for (const [name, value] of Object.entries(velocityFillStyle(next)))
    el.style.setProperty(name, value);
}

function patchSteps(node, control) {
  const soloed = control.rows.some((row) => row.solo);
  const pads = node.querySelector(".nc-pads");
  const current = control.rows.find((row) => row.id === control.selectedRow) ?? control.rows[0];
  const laneName = node.querySelector(".nc-pads-label");
  // The lane name only (the range moved to the end handle and length mode); length mode adds the count.
  const lenMode = node.dataset.ncLenMode === "true" && Boolean(control.onLength);
  if (laneName instanceof HTMLElement && current) {
    laneName.textContent = lenMode ? `${current.label} · ${current.length}` : current.label;
    if (control.onLength) {
      laneName.setAttribute("aria-pressed", lenMode ? "true" : "false");
      laneName.setAttribute(
        "aria-label",
        lenMode
          ? `${current.label} length ${current.length} steps: tap or drag the pads to set the end, tap here when done`
          : `${current.label}, ${current.length} steps: tap to set the length`,
      );
    }
  }
  const padsDice = node.querySelector("[data-nc-pads-dice]");
  if (padsDice instanceof HTMLElement && current) {
    padsDice.setAttribute("aria-label", `Re-roll ${current.label}`);
    padsDice.title = `Re-roll ${current.label}: new steps for this lane (Undo takes it back)`;
  }
  const miniPlay = node.querySelector("[data-nc-pads-play]");
  if (miniPlay instanceof HTMLElement) {
    const playing = Boolean(control.transport?.playing);
    const label = control.transport?.label ?? (playing ? "Stop" : "Play");
    if (miniPlay.textContent !== label) miniPlay.textContent = label;
    miniPlay.setAttribute("aria-pressed", playing ? "true" : "false");
    const aria = control.transport?.ariaLabel;
    if (aria) miniPlay.setAttribute("aria-label", aria);
    else miniPlay.removeAttribute("aria-label");
  }
  if (pads instanceof HTMLElement && current) {
    pads.setAttribute("aria-label", `${current.label} steps`);
    if (current.lane) pads.dataset.ncLane = String(((current.lane - 1) % 4) + 1);
    if (current.mute || (soloed && !current.solo)) pads.dataset.silent = "true";
    else delete pads.dataset.silent;
    const head =
      current.length > 0
        ? ((control.playhead % current.length) + current.length) % current.length
        : -1;
    for (const pad of pads.querySelectorAll("[data-nc-pad]")) {
      const step = Number(pad.getAttribute("data-nc-pad"));
      const cell = current.steps[step];
      if (!(pad instanceof HTMLButtonElement)) continue;
      pad.hidden = !cell || (!lenMode && step >= current.length);
      if (lenMode && step >= current.length) pad.dataset.out = "true";
      else delete pad.dataset.out;
      if (lenMode && step === current.length - 1) pad.dataset.end = "true";
      else delete pad.dataset.end;
      pad.setAttribute("aria-label", `${current.label} step ${step + 1}`);
      pad.setAttribute("aria-pressed", cell?.on ? "true" : "false");
      if (cell?.accent) pad.dataset.accent = "true";
      else delete pad.dataset.accent;
      if (cell?.dim) pad.dataset.dim = "true";
      else delete pad.dataset.dim;
      paintVelocity(pad, cell?.velocity);
      if (control.playhead >= 0 && step === head) pad.dataset.playhead = "true";
      else delete pad.dataset.playhead;
    }
  }
  for (const row of control.rows) {
    for (let step = 0; step < row.steps.length; step++) {
      const cell = row.steps[step];
      const button = node.querySelector(`[data-nc-step="${row.id}:${step}"]`);
      if (!(button instanceof HTMLButtonElement)) continue;
      const line = button.closest(".nc-row");
      if (line instanceof HTMLElement) {
        if (control.selectedRow === row.id) line.dataset.selected = "true";
        else delete line.dataset.selected;
        const name = line.querySelector(".nc-name");
        if (name instanceof HTMLElement) {
          name.setAttribute("aria-pressed", control.selectedRow === row.id ? "true" : "false");
        }
        const silent = row.mute || (soloed && !row.solo);
        if (silent) line.dataset.silent = "true";
        else delete line.dataset.silent;
        for (const ms of line.querySelectorAll("[data-nc-ms]")) {
          const on = ms.getAttribute("data-nc-ms") === "mute" ? row.mute : row.solo;
          ms.setAttribute("aria-pressed", on ? "true" : "false");
        }
      }
      button.setAttribute("aria-pressed", cell.on ? "true" : "false");
      if (cell.accent) button.dataset.accent = "true";
      else delete button.dataset.accent;
      if (cell.dim) button.dataset.dim = "true";
      else delete button.dataset.dim;
      if (step % 4 === 0) button.dataset.bar = "true";
      else delete button.dataset.bar;
      if (typeof cell.velocity === "number") {
        button.dataset.velocity = "true";
        button.style.setProperty(
          "--level",
          `${Math.round(Math.max(0, Math.min(1, cell.velocity)) * 100)}%`,
        );
      } else {
        delete button.dataset.velocity;
        button.style.removeProperty("--level");
      }
      paintVelocity(button, cell.velocity);
      const pos =
        control.playhead >= 0 && row.length > 0
          ? ((control.playhead % row.length) + row.length) % row.length
          : -1;
      if (step === pos) button.dataset.playhead = "true";
      else delete button.dataset.playhead;
      // The selected row keeps its steps past the end visible (ghosted) so the end handle can extend it.
      const ghost = Boolean(control.onLength) && control.selectedRow === row.id;
      button.hidden = step >= row.length && !ghost;
      if (step >= row.length && ghost) button.dataset.out = "true";
      else delete button.dataset.out;
    }
    const handle = node.querySelector(`[data-nc-len="${row.id}"]`);
    const last = node.querySelector(`[data-nc-step="${row.id}:${Math.max(0, row.length - 1)}"]`);
    const lastWrap = last?.closest(".nc-step-wrap");
    if (handle instanceof HTMLElement && lastWrap && lastWrap.nextElementSibling !== handle) {
      const focused = document.activeElement === handle;
      lastWrap.after(handle);
      if (focused) handle.focus();
    }
    if (handle instanceof HTMLElement) {
      handle.setAttribute("aria-valuenow", String(row.length));
      handle.setAttribute("aria-label", `${row.label} length, ${row.length} steps`);
      handle.title = `${row.label}: drag to set the length (${row.length} steps)`;
    }
  }
}

function renderCanvas(control) {
  const wrap = document.createElement("div");
  wrap.className = "nc-field";
  wrap.dataset.ncId = control.id;
  const label = document.createElement("span");
  label.className = "nc-label";
  label.textContent = control.label;
  const canvas = document.createElement("canvas");
  canvas.className = "nc-canvas";
  canvas.dataset.ncId = control.id;
  canvas.dataset.ncPaint = control.paint;
  wrap.append(label, canvas, probe());
  return wrap;
}


/**
 * A mixer channel strip (the Studio's Mix): name, M and S, the sends as compact knobs, the console fader with its
 * meter right beside it on one dB scale (tick labels), and the level readout. Every strip lays out the same rows,
 * so faders, meters and ticks line up across the console even when a strip (the master) has no M/S or sends.
 */
function renderStrip(control, lookup) {
  const strip = document.createElement("div");
  strip.className = "nc-strip";
  strip.dataset.ncId = control.id;
  strip.setAttribute("role", "group");
  strip.setAttribute("aria-label", control.label);
  if (control.master) strip.dataset.ncMaster = "";
  const head = document.createElement("div");
  head.className = "nc-strip-hd";
  const name = document.createElement("span");
  name.className = "nc-strip-name";
  name.dataset.ncStripName = "";
  head.append(name);
  // Remove (an instance of an instrument): a quiet × after the name, as on ASTRID's hack cards. The host confirms.
  if (control.onRemove) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "nc-strip-remove";
    remove.dataset.ncStripRemove = "";
    remove.textContent = "\u00d7";
    remove.addEventListener("click", () => {
      const live = lookup(strip);
      if (live?.type === "strip") live.onRemove?.(remove);
    });
    head.append(remove);
  }
  const ms = document.createElement("div");
  ms.className = "nc-strip-ms";
  for (const kind of ["mute", "solo"]) {
    const handler = kind === "mute" ? control.onMute : control.onSolo;
    if (!handler) continue;
    const pad = document.createElement("span");
    pad.className = "nc-ms-wrap";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nc-ms";
    button.dataset.ncMs = kind;
    button.textContent = kind === "mute" ? "M" : "S";
    pad.append(button, hitPad());
    pad.addEventListener("click", () => {
      const live = lookup(strip);
      if (live?.type === "strip") (kind === "mute" ? live.onMute : live.onSolo)?.();
    });
    ms.append(pad);
  }
  const sends = document.createElement("div");
  sends.className = "nc-strip-sends";
  for (const send of control.sends ?? []) sends.append(renderControl({ ...send, type: "knob", compact: true }, lookup));
  const body = document.createElement("div");
  body.className = "nc-strip-body";
  const scale = document.createElement("span");
  scale.className = "nc-scale";
  scale.setAttribute("aria-hidden", "true");
  for (const tick of control.ticks ?? []) {
    const mark = document.createElement("span");
    mark.className = "nc-scale-tick";
    mark.style.setProperty("--tick-pos", String(tick.value));
    mark.textContent = tick.label;
    scale.append(mark);
  }
  const fader = createFader({
    label: `${control.label} level`,
    value: control.value,
    step: control.step,
    valueText: control.valueText,
    onChange: (value) => {
      const live = lookup(strip);
      if (live?.type === "strip") live.onChange(value);
    },
    onReset: () => {
      const live = lookup(strip);
      if (live?.type === "strip") reset(live);
    },
  });
  const meter = createMeter({
    channels: control.channels === 2 ? 2 : 1,
    label: control.label,
    onClear: () => {
      const live = lookup(strip);
      if (live?.type === "strip") live.onClipClear?.();
    },
  });
  body.append(scale, fader.el, meter.el);
  // The readout: mono; a double-click puts the fader back where the strip starts (unity, or the channel default), and
  // with onTypeIn a single click (or Enter) opens it for a typed value, as ASTRID's type-in values: Enter commits,
  // Escape or leaving cancels. The click waits out the double-click window, so a double-click never opens it.
  const readout = document.createElement("button");
  readout.type = "button";
  readout.className = "nc-strip-db";
  readout.dataset.ncReadout = "";
  let opening = 0;
  readout.addEventListener("click", (event) => {
    const live = lookup(strip);
    if (live?.type !== "strip" || !live.onTypeIn) return;
    window.clearTimeout(opening);
    if (event.detail === 0) openTypeIn(strip, readout, lookup);
    else if (event.detail === 1)
      opening = window.setTimeout(() => openTypeIn(strip, readout, lookup), TYPE_IN_DELAY_MS);
  });
  readout.addEventListener("dblclick", () => {
    window.clearTimeout(opening);
    const live = lookup(strip);
    if (live?.type === "strip") reset(live);
  });
  strip.append(head, ms, sends, body, readout, probe());
  patchStrip(strip, control);
  return strip;
}

/** A single click on a readout opens the type-in after this, unless a second click makes it a double-click. */
const TYPE_IN_DELAY_MS = 250;

function openTypeIn(strip, readout, lookup) {
  const live = lookup(strip);
  if (live?.type !== "strip" || !live.onTypeIn || strip.querySelector(".nc-strip-db-input")) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "nc-strip-db-input";
  input.inputMode = "decimal";
  input.spellcheck = false;
  input.autocomplete = "off";
  input.value = live.valueText ?? formatNumber(live.value);
  input.setAttribute("aria-label", `${live.label} level in dB: type a value, Enter to set, Escape to cancel`);
  readout.hidden = true;
  readout.after(input);
  input.focus();
  input.select?.();
  let done = false;
  const close = (commit) => {
    if (done) return;
    done = true;
    const text = input.value;
    input.remove();
    readout.hidden = false;
    if (commit) {
      const current = lookup(strip);
      if (current?.type === "strip") current.onTypeIn?.(text);
    }
    readout.focus?.();
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(false);
    }
  });
  input.addEventListener("blur", () => close(false));
}

/**
 * The console's add slot: a ghost strip at the end of the strips with "+ Add" over a select of what can be added
 * (an option may be disabled, "Synth (soon)"). Picking one calls onAdd and puts the select back.
 */
function renderStripAdd(control, lookup) {
  const wrap = document.createElement("div");
  wrap.className = "nc-strip-add";
  wrap.dataset.ncId = control.id;
  const face = document.createElement("span");
  face.className = "nc-strip-add-face";
  face.setAttribute("aria-hidden", "true");
  const plus = document.createElement("span");
  plus.className = "nc-strip-add-plus";
  plus.textContent = "+";
  const label = document.createElement("span");
  label.className = "nc-strip-add-label";
  face.append(plus, label);
  const select = document.createElement("select");
  select.className = "nc-strip-add-select";
  select.addEventListener("change", () => {
    const live = lookup(wrap);
    const value = select.value;
    rewind(select);
    if (live?.type === "stripAdd" && value) live.onAdd(value);
  });
  wrap.append(face, select, probe());
  patchStripAdd(wrap, control);
  return wrap;
}

function patchStripAdd(node, control) {
  const label = node.querySelector(".nc-strip-add-label");
  if (label) label.textContent = control.label;
  const select = node.querySelector("select");
  if (!(select instanceof HTMLSelectElement)) return;
  select.setAttribute("aria-label", control.ariaLabel ?? control.label);
  const want = [{ value: "", label: control.ariaLabel ?? control.label, disabled: true }, ...control.options];
  const have = [...select.options].map((o) => `${o.value}|${o.textContent}|${o.disabled}`).join(",");
  const next = want.map((o) => `${o.value}|${o.label}|${o.disabled === true}`).join(",");
  if (have === next) return;
  select.replaceChildren(
    ...want.map((o) => {
      const option = document.createElement("option");
      option.value = o.value;
      option.textContent = o.label;
      option.disabled = o.disabled === true;
      return option;
    }),
  );
  rewind(select);
}

/** Back to the add select's first line ("Add instrument"). */
function rewind(select) {
  const first = select.options[0];
  if (first) first.selected = true;
}

function reset(live) {
  if (live.onReset) live.onReset();
  else if (typeof live.defaultValue === "number") live.onChange(live.defaultValue);
}

function patchStrip(node, control) {
  const name = node.querySelector("[data-nc-strip-name]");
  if (name && name.textContent !== control.label) name.textContent = control.label;
  const remove = node.querySelector("[data-nc-strip-remove]");
  if (remove) {
    remove.setAttribute("aria-label", `Remove ${control.label}`);
    remove.title = `Remove ${control.label}`;
  }
  node.setAttribute("aria-label", control.label);
  const faderEl = node.querySelector(".nc-fader");
  const fader = faderEl ? faderHandle(faderEl) : undefined;
  if (fader) {
    fader.configure({ step: control.step });
    fader.set(control.value);
    fader.setText(control.valueText);
    fader.setLabel(`${control.label} level`);
  }
  meterHandle(node.querySelector(".nc-meter") ?? undefined)?.setLabel(control.label);
  const readout = node.querySelector(".nc-strip-db");
  if (readout instanceof HTMLElement) {
    const text = control.valueText ?? formatNumber(control.value);
    if (readout.textContent !== text) readout.textContent = text;
    readout.setAttribute("aria-label", `${control.label} level ${text}`);
    const reset = control.resetText ? `Double-click: back to ${control.resetText}` : "Double-click to reset";
    readout.title = control.onTypeIn ? `Click to type a value. ${reset}` : reset;
  }
  for (const ms of node.querySelectorAll("[data-nc-ms]")) {
    const kind = ms.getAttribute("data-nc-ms");
    const on = kind === "mute" ? control.mute === true : control.solo === true;
    ms.setAttribute("aria-pressed", on ? "true" : "false");
    ms.setAttribute("aria-label", `${kind === "mute" ? "Mute" : "Solo"} ${control.label}`);
  }
  if (control.silent) node.dataset.silent = "true";
  else delete node.dataset.silent;
  if (control.identity) node.dataset.ncIdentity = control.identity;
  else delete node.dataset.ncIdentity;
}

/** The meter handle of a strip control (for the host's per-frame update), from the module or strip element. */
export function stripMeter(root, id) {
  const strip = root?.querySelector?.(`.nc-strip[data-nc-id="${cssEscape(id)}"]`);
  return meterHandle(strip?.querySelector(".nc-meter") ?? undefined);
}

function renderFx(control, lookup) {
  const card = document.createElement("div");
  card.className = "nc-ui-fx";
  card.dataset.ncId = control.id;
  card.dataset.ncDepth = String(control.depth);
  const name = document.createElement("h3");
  name.className = "nc-ui-fx-name";
  name.id = `${control.id}-name`;
  name.textContent = control.title;
  if (control.on === undefined) card.append(name);
  else {
    // fx-blocks' header: the name, then a real switch named by it. Off dims the card by colour.
    const head = document.createElement("div");
    head.className = "nc-ui-fx-hd";
    const toggle = createSwitch({
      checked: control.on,
      labelledBy: name.id,
      onChange: (on) => {
        const live = lookup(toggle.el);
        if (live?.type === "fx") live.onToggle?.(on);
      },
    });
    toggle.el.dataset.ncFxSwitch = "";
    head.append(name, toggle.el);
    card.append(head);
  }
  for (const child of control.controls) card.append(renderControl(child, lookup));
  if (control.more?.length) {
    const more = document.createElement("details");
    more.className = "nc-ui-more";
    const summary = document.createElement("summary");
    summary.textContent = control.moreLabel ?? "More";
    more.append(summary);
    for (const child of control.more) more.append(renderControl(child, lookup));
    card.append(more);
  }
  card.append(probe());
  patchFx(card, control);
  return card;
}

function patchFx(node, control) {
  const name = node.querySelector(".nc-ui-fx-name");
  if (name) name.textContent = control.title;
  const toggle = node.querySelector("[data-nc-fx-switch]");
  if (toggle) toggle.setAttribute("aria-checked", control.on ? "true" : "false");
  if (control.on === false) node.dataset.ncDim = "true";
  else delete node.dataset.ncDim;
}

function cssEscape(value) {
  return value.replace(/["\\]/g, "\\$&");
}

export function paintAll(root, controls) {
  for (const canvas of root.querySelectorAll("canvas")) {
    if (!(canvas instanceof HTMLCanvasElement)) continue;
    const control = controls.find(
      (item) => item.type === "canvas" && item.id === canvas.dataset.ncId,
    );
    if (control?.type === "canvas") paintCanvas(canvas, control);
  }
  placeHits(root);
}
