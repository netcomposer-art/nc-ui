// The kit's slider as a factory, matching fx-blocks' SliderFactory contract
// ((spec) => { el, set(value) }), so a block (or any app) gets the same row as renderControl's slider:
// label and value on one line, the range full width below with a target-min (44 px) touch band on every pointer,
// and colour dimming when disabled. A log slider runs its range in 0..LOG_STEPS positions.

export const LOG_STEPS = 1000;

/** @param {number} min @param {number} max @param {number} value */
export function toPosition(min, max, value, log) {
  if (!log) return value;
  const lo = Math.log(min);
  const span = Math.log(max) - lo;
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round(((Math.log(clamped) - lo) / span) * LOG_STEPS);
}

/** @param {number} min @param {number} max @param {number} position */
export function fromPosition(min, max, position, log) {
  if (!log) return position;
  return min * (max / min) ** (position / LOG_STEPS);
}

/**
 * @param {{ id: string, label: string, min: number, max: number, value: number, log?: boolean, step?: number,
 *   format: (v: number) => string, onInput: (v: number) => void, disabled?: boolean }} spec
 * @param {{ doc?: Document }} [options]
 */
export function createSlider(spec, options = {}) {
  const doc = options.doc ?? globalThis.document;
  const log = spec.log === true;
  if (log && !(spec.min > 0 && spec.max > spec.min)) throw new RangeError(`log slider ${spec.id} needs 0 < min < max`);
  const el = doc.createElement("div");
  el.className = "nc-field";
  el.dataset.ncRow = "";
  el.dataset.ncSlider = "";
  el.dataset.ncId = spec.id;
  const label = doc.createElement("label");
  label.className = "nc-label";
  label.setAttribute("for", spec.id);
  label.textContent = spec.label;
  const input = doc.createElement("input");
  input.type = "range";
  input.className = "nc-range";
  input.id = spec.id;
  input.dataset.ncId = spec.id;
  input.min = String(log ? 0 : spec.min);
  input.max = String(log ? LOG_STEPS : spec.max);
  input.step = log ? "1" : String(spec.step ?? "any");
  const readout = doc.createElement("span");
  readout.className = "nc-readout";
  readout.dataset.ncReadout = "";
  const probe = doc.createElement("i");
  probe.className = "nc-token-probe";
  probe.dataset.ncProbe = "";
  el.append(label, input, readout, probe);

  let value = spec.value;
  const show = () => {
    const text = spec.format(value);
    readout.textContent = text;
    input.setAttribute("aria-valuetext", text);
  };
  const set = (next) => {
    value = next;
    if (doc.activeElement !== input) input.value = String(toPosition(spec.min, spec.max, value, log));
    show();
  };
  input.addEventListener("input", () => {
    value = fromPosition(spec.min, spec.max, Number(input.value), log);
    show();
    spec.onInput(value);
  });
  input.disabled = spec.disabled === true;
  set(spec.value);
  return {
    el,
    set,
    /** Dim by colour and stop input (a bypassed block). */
    setDisabled(disabled) {
      input.disabled = disabled === true;
    },
  };
}

/** fx-blocks' `SliderFactory`: pass this as `slider` to createDriveBlock / createDelayBlock. */
export const sliderFactory = (spec) => createSlider(spec);
