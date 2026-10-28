import { prop, v } from "../alias.js";
import { MODULATED_SELECTOR } from "../modulated.js";

/** Class sheet for the kit. Lengths and colours come from the alias module. */
export function kitCss() {
  const stack = (n) => `
    .nc-module[data-nc-place="stack"][data-nc-shade="${n}"],
    .nc-fx[data-nc-depth="${n}"] {
      background: ${v(`module-bg-stack-${n}`)};
      ${prop("text-sub")}: ${v(`module-sub-stack-${n}`)};
      ${prop("divider")}: ${v(`module-div-stack-${n}`)};
    }`;
  const adjacent = (n) =>
    `.nc-module[data-nc-place="adjacent"][data-nc-shade="${n}"] { background: ${v(`module-bg-adjacent-${n}`)}; }`;
  // Inset panel: the next shade down. Below adjacent-4 it is stack-1, with that shade's sub text and
  // dividers (ASTRID's Hacks panel inside VCA is exactly stack-1 on adjacent-4).
  const inset = (n) =>
    n < 4
      ? `.nc-module[data-nc-shade="${n}"] .nc-section[data-nc-inset="true"] { background: ${v(`module-bg-adjacent-${n + 1}`)}; }`
      : `.nc-module[data-nc-shade="${n}"] .nc-section[data-nc-inset="true"] {
      background: ${v("module-bg-stack-1")};
      ${prop("text-sub")}: ${v("module-sub-stack-1")};
      ${prop("divider")}: ${v("module-div-stack-1")};
    }`;

  return `
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  background: ${v("surface-page")};
  color: ${v("text")};
  font-family: ${v("font-ui")};
  font-size: ${v("body-size")};
  font-weight: ${v("title-weight")};
  line-height: ${v("label-leading")};
}
button, input, select { font: inherit; color: inherit; }
.nc [hidden] { display: none !important; }
.nc-stack { display: flex; flex-direction: column; min-width: 0; }
.nc-module {
  background: ${v("module-bg-adjacent-1")};
  color: ${v("text")};
  padding: ${v("module-pad")};
  border: 0;
  border-bottom: ${v("hairline")} solid ${v("divider")};
  border-radius: 0;
  min-width: 0;
  position: relative;
  font-family: ${v("font-ui")};
  transition: none;
}
${[1, 2, 3, 4].map(adjacent).join("\n")}
${[1, 2, 3, 4].map(stack).join("\n")}
${[1, 2, 3, 4].map(inset).join("\n")}
.nc-module-hd {
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  justify-content: space-between;
  gap: ${v("header-gap")};
  min-width: 0;
}
.nc-module[data-nc-open="true"] .nc-module-hd { margin-bottom: ${v("head-margin")}; }
.nc-title {
  margin: 0;
  min-width: 0;
  font-size: ${v("title-size")};
  font-weight: ${v("title-weight")};
  letter-spacing: ${v("title-tracking")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nc-module[data-nc-slim] .nc-title { font-size: ${v("title-size-slim")}; }
.nc-module-end { display: flex; align-items: baseline; gap: ${v("header-gap")}; flex: none; }
.nc-index {
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  color: ${v("text-sub")};
}
.nc-hide, .nc-slim {
  padding: 0 ${v("control-gap")};
  border: 0;
  background: transparent;
  color: ${v("text-sub")};
  font-family: ${v("font-readout")};
  font-size: ${v("body-size")};
  line-height: ${v("label-leading")};
  cursor: pointer;
  transition: none;
}
.nc-slim {
  display: flex;
  align-items: center;
  gap: ${v("module-gap")};
  flex: 1;
  min-width: 0;
  margin-top: ${v("module-gap")};
  text-align: left;
}
.nc-hide:hover, .nc-slim:hover { color: ${v("text")}; }
.nc-hide:focus-visible, .nc-slim:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("control-gap")};
}
.nc-slim-lines {
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nc-module-body {
  display: flex;
  flex-direction: column;
  gap: ${v("module-pad")};
  min-width: 0;
  transition: none;
}
.nc-section { display: flex; flex-direction: column; gap: ${v("module-gap")}; min-width: 0; }
.nc-row, .nc-field, .nc-controls, .nc-slot-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: ${v("module-gap")};
  min-width: 0;
}
.nc-label {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${v("label-size")};
  font-weight: ${v("label-weight")};
  letter-spacing: ${v("label-tracking")};
  text-transform: uppercase;
  color: ${v("text-sub")};
}
.nc-readout, .nc-mono {
  font-family: ${v("font-readout")};
  font-variant-numeric: tabular-nums;
  font-size: ${v("readout-size")};
  color: ${v("text")};
  white-space: nowrap;
}
/* One label column (the lane-name width), so the sliders in a module start together, as in ASTRID. A label is never
   cut below that column (TEMPO, SWING and DECAY stay whole), but longer text gives way on one line with an ellipsis
   instead of widening the page; the full text stays in the DOM, so the accessible name is never cut. */
.nc-field .nc-label { flex: 0 1 auto; min-width: min(${v("name-width")}, 100%); }
/* A value never gives way to its label: it keeps its width (flex: none), so a long label is cut first and 0.3 stays
   0.3. Only a value that is itself longer than the row beside a name-width label is cut, with an ellipsis. The control
   beside it (range, knob, canvas, select) keeps its size. */
.nc-field .nc-readout {
  flex: none;
  min-width: 0;
  max-width: calc(100% - ${v("name-width")} - ${v("module-gap")});
  overflow: hidden;
  text-overflow: ellipsis;
}
.nc-field .nc-range, .nc-field .nc-canvas { flex: 1 1 0; min-width: 0; }
/* A display beside a label keeps the width it has next to a column-wide label: a long label is cut, not the display. */
.nc-field > .nc-label + .nc-canvas { min-width: calc(100% - ${v("name-width")} - ${v("module-gap")}); }
/* ASTRID slider rows: label and value on one baseline, the slider full width under them. */
.nc-field[data-nc-slider] {
  display: grid;
  grid-template-columns: minmax(min(${v("name-width")}, 100%), 1fr) auto;
  grid-template-areas: "label value" "range range";
  align-items: baseline;
  column-gap: ${v("module-gap")};
  row-gap: ${v("control-gap")};
  padding-bottom: ${v("module-gap")};
}
.nc-field[data-nc-slider] .nc-label { grid-area: label; min-width: 0; }
/* In the slider grid the value column is auto (sized to the value), so the flex-row cap does not apply. */
.nc-field[data-nc-slider] .nc-readout { grid-area: value; max-width: none; text-align: right; }
.nc-field[data-nc-slider] .nc-range { grid-area: range; width: 100%; margin: 0; }
/* Tap tempo: a small outlined button on the label line, between the label and the value. */
.nc-field[data-nc-slider]:has(> .nc-tap) {
  grid-template-columns: minmax(min(${v("name-width")}, 100%), 1fr) auto auto;
  grid-template-areas: "label tap value" "range range range";
}
.nc-tap {
  grid-area: tap;
  position: relative;
  align-self: center;
  padding: 0 ${v("control-gap")};
  border: ${v("hairline")} solid ${v("divider")};
  border-radius: ${v("slot-radius")};
  background: transparent;
  color: ${v("text-sub")};
  font-family: ${v("font-ui")};
  font-size: ${v("label-size")};
  font-weight: ${v("label-weight")};
  letter-spacing: ${v("label-tracking")};
  line-height: ${v("label-leading")};
  text-transform: uppercase;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: none;
}
/* The chip stays small; an invisible 44 px box takes the touch. It stops at the slider's top edge (the row gap
   under the chip) and grows upward into the row spacing, so it never takes a drag meant for the slider. */
.nc-tap::before {
  content: "";
  position: absolute;
  left: 50%;
  bottom: calc(-1 * ${v("control-gap")});
  width: max(100%, ${v("target-min")});
  height: max(100%, ${v("target-min")});
  transform: translateX(-50%);
}
.nc-tap:hover { border-color: ${v("text-sub")}; color: ${v("text")}; }
.nc-tap:active { background: ${v("text")}; border-color: ${v("text")}; color: ${v("surface-page")}; }
.nc-tap:focus-visible { outline: ${v("focus-width")} solid ${v("focus-ring")}; outline-offset: ${v("hairline")}; }
/* ASTRID row spacing: a 48 px row every 72 px (measured on ASTRID's VCA at 1280 and 390). */
.nc-section:has(> .nc-field[data-nc-slider]) { row-gap: ${v("module-pad")}; }
.nc-section[data-nc-inset="true"] {
  margin-inline: calc(${v("module-pad")} * -1);
  margin-bottom: calc(${v("module-pad")} * -1);
  padding: ${v("module-pad")};
}
.nc-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: ${v("slider-pitch")};
  background: transparent;
  cursor: pointer;
  transition: none;
  accent-color: ${v("accent")};
}
.nc-range:disabled { opacity: ${v("disabled-opacity")}; cursor: not-allowed; }
.nc-range::-webkit-slider-runnable-track {
  height: ${v("hairline")};
  background: ${v("slider-track")};
  transition: none;
}
.nc-range::-moz-range-track {
  height: ${v("hairline")};
  background: ${v("slider-track")};
  transition: none;
}
.nc-range::-moz-range-progress {
  height: ${v("hairline")};
  background: ${v("slider-progress")};
  transition: none;
}
.nc-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: ${v("slider-thumb-size")};
  height: ${v("slider-thumb-size")};
  margin-top: calc(${v("slider-thumb-size")} / -2);
  border: 0;
  border-radius: 50%;
  background: ${v("slider-thumb")};
  transition: none;
}
.nc-range::-moz-range-thumb {
  width: ${v("slider-thumb-size")};
  height: ${v("slider-thumb-size")};
  border: 0;
  border-radius: 50%;
  background: ${v("slider-thumb")};
  transition: none;
}
${MODULATED_SELECTOR} { transition: none; }
.nc-range:focus-visible { outline: ${v("focus-width")} solid ${v("focus-ring")}; outline-offset: ${v("control-gap")}; }
.nc-btn {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: ${v("hairline")} solid ${v("text")};
  background: transparent;
  color: ${v("text")};
  padding: ${v("button-pad-y")} 0;
  font-size: ${v("readout-size")};
  letter-spacing: ${v("button-tracking")};
  text-transform: uppercase;
  cursor: pointer;
  transition-property: color, background-color, border-color, transform;
  transition-duration: ${v("transition-feedback")};
}
.nc-btn:hover { background: ${v("surface-raised")}; }
.nc-btn:active { transform: scale(0.985); }
.nc-btn[data-on="true"] {
  background: ${v("accent")};
  border-color: ${v("accent")};
  color: ${v("on-accent")};
}
.nc-btn:focus-visible {
  outline: ${v("focus-width-strong")} solid ${v("focus-ring")};
  outline-offset: ${v("control-gap")};
}
.nc-btn:disabled { opacity: ${v("disabled-opacity")}; }
.nc-toggle {
  border: 0;
  border-bottom: ${v("hairline")} solid transparent;
  background: transparent;
  color: ${v("text-sub")};
  font-size: ${v("label-size")};
  font-weight: ${v("label-weight")};
  letter-spacing: ${v("label-tracking")};
  text-transform: uppercase;
  padding: ${v("control-gap")} 0;
  cursor: pointer;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition-property: color, border-color;
  transition-duration: ${v("transition-feedback")};
}
.nc-toggle:hover, .nc-toggle[aria-pressed="true"] { color: ${v("text")}; }
.nc-toggle[aria-pressed="true"] { border-bottom-color: ${v("accent")}; }
.nc-toggle[data-nc-role="mute"][aria-pressed="true"] { color: ${v("rhythm.track-mute")}; }
.nc-toggle[data-nc-role="solo"][aria-pressed="true"] {
  color: ${v("rhythm.track-solo")};
  border-bottom-color: ${v("rhythm.track-solo")};
}
.nc-toggle:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("control-gap")};
}
.nc-seg {
  display: inline-flex;
  border: ${v("hairline")} solid ${v("divider")};
  border-radius: ${v("slot-radius")};
  overflow: hidden;
  margin-bottom: ${v("module-gap")};
}
.nc-seg > button {
  flex: 1 1 0;
  min-height: ${v("target-min")};
  min-width: ${v("target-min")};
  padding: 0 ${v("header-gap")};
  border: 0;
  border-inline-end: ${v("hairline")} solid ${v("divider")};
  background: transparent;
  color: ${v("text-sub")};
  font-size: ${v("label-size")};
  font-weight: ${v("label-weight")};
  letter-spacing: ${v("label-tracking")};
  text-transform: uppercase;
  cursor: pointer;
  transition-property: color, background-color;
  transition-duration: ${v("transition-feedback")};
}
.nc-seg > button:last-child { border-inline-end: 0; }
.nc-seg > button:hover { color: ${v("text")}; }
.nc-seg > button[aria-checked="true"] { background: ${v("text")}; color: ${v("surface-page")}; }
.nc-seg > button:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: calc(${v("focus-width")} * -1);
}
.nc-select {
  flex: 1 1 auto;
  min-width: 0;
  appearance: none;
  background: transparent;
  border: 0;
  border-bottom: ${v("hairline")} solid ${v("divider")};
  border-radius: 0;
  color: ${v("text")};
  font-size: ${v("body-size")};
  padding: ${v("control-gap")} 0;
  cursor: pointer;
  transition: none;
}
.nc-select:focus-visible { outline: none; border-bottom-color: ${v("accent")}; }
/* Slots on one line, Morph under them as a slider row (label and value, then the slider). */
.nc-slot-row { flex-direction: column; align-items: stretch; gap: ${v("module-gap")}; }
.nc-slot-line { display: flex; flex-wrap: nowrap; align-items: center; gap: ${v("slot-gap")}; min-width: 0; }
.nc-morph-field { padding-bottom: 0; }
.nc-snap-row {
  display: flex;
  flex-wrap: nowrap;
  gap: ${v("slot-gap")};
  min-width: 0;
  flex: 1 1 auto;
}
.nc-snap-wrap {
  position: relative;
  flex: 1 1 ${v("slot-size")};
  width: ${v("slot-size")};
  max-width: ${v("slot-size")};
  min-width: 0;
  height: ${v("slot-size")};
  -webkit-touch-callout: none;
  user-select: none;
}
.nc-snap {
  display: block;
  width: 100%;
  height: 100%;
  -webkit-touch-callout: none;
  user-select: none;
  touch-action: manipulation;
  border: ${v("hairline")} solid ${v("divider")};
  border-radius: ${v("slot-radius")};
  background: transparent;
  color: ${v("text-sub")};
  font-family: ${v("font-readout")};
  font-size: ${v("slot-font-size")};
  line-height: ${v("label-leading")};
  padding: 0;
  cursor: pointer;
  transition: none;
}
.nc-snap:hover { border-color: ${v("text-sub")}; }
/* Has saved content: an ink outline and ink digit, as in Bass (no grey fill). Empty: hairline, sub ink. */
.nc-snap[data-filled="true"] {
  border-color: ${v("text-sub")};
  color: ${v("text")};
}
/* Active (Bass): the accent outline, ink and underline, in every theme and surprise palette. */
.nc-snap[data-active="true"] {
  background: transparent;
  border-color: ${v("accent")};
  color: ${v("accent")};
  box-shadow: inset 0 calc(-1 * ${v("focus-width")} * 2) 0 ${v("accent")};
}
/* Queued for the end of the bar (Bass): a faint accent underline and outline that go full accent on each beat
   (audio-driven, from the playhead), steady under reduced motion. A second tap switches now. */
.nc-snap[data-queued="true"] {
  color: ${v("accent")};
  outline: ${v("focus-width")} solid ${v("accent-faint")};
  outline-offset: ${v("hairline")};
  box-shadow: inset 0 calc(-1 * ${v("focus-width")} * 2) 0 ${v("accent-faint")};
}
.nc-snap[data-queued="true"][data-pulse="true"] {
  outline-color: ${v("accent")};
  background: ${v("accent-soft")};
  box-shadow: inset 0 calc(-1 * ${v("focus-width")} * 2) 0 ${v("accent")};
}
/* Edited since it was stored or recalled: a small dot in the corner, in the slot's ink. */
.nc-snap[data-edited="true"] { position: relative; }
.nc-snap[data-edited="true"]::after {
  content: "";
  position: absolute;
  top: ${v("control-gap")};
  right: ${v("control-gap")};
  width: ${v("control-gap")};
  height: ${v("control-gap")};
  border-radius: 50%;
  background: currentColor;
}
.nc-snap:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
.nc-sparkle {
  position: relative;
  flex: 0 0 ${v("sparkle-size")};
  width: ${v("sparkle-size")};
  height: ${v("sparkle-size")};
  margin-inline: ${v("rhythm.sparkle-gap")};
  padding: 0;
  border: 0;
  background: transparent;
  color: ${v("text-sub")};
  display: grid;
  place-items: center;
  cursor: pointer;
  transition-property: color;
  transition-duration: ${v("transition-feedback")};
}
.nc-play-row {
  display: flex;
  align-items: stretch;
  gap: ${v("rhythm.sparkle-gap")};
}
.nc-play-row > .nc-btn { flex: 1 1 auto; width: auto; }
.nc-sparkle-btn {
  flex: 0 0 ${v("target-min")};
  width: ${v("target-min")};
  min-height: ${v("target-min")};
  padding: 0;
  border: ${v("hairline")} solid ${v("divider")};
  background: ${v("surprise-fill")};
  color: ${v("surprise-ink")};
  display: grid;
  place-items: center;
  cursor: pointer;
  transition-property: color, background-color, transform;
  transition-duration: ${v("transition-feedback")};
}
.nc-sparkle-btn svg { width: calc(${v("target-min")} / 2); height: calc(${v("target-min")} / 2); display: block; }
.nc-sparkle-btn:hover { background: ${v("surface-raised")}; }
.nc-sparkle-btn:active { transform: scale(0.985); }
.nc-sparkle-btn:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
.nc-sparkle svg { width: ${v("sparkle-icon-size")}; height: ${v("sparkle-icon-size")}; display: block; }
.nc-sparkle:hover { color: ${v("text")}; }
.nc-sparkle:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
.nc-module-hd:has(> .nc-snap-msg:not(:empty)) { flex-wrap: wrap; row-gap: 0; }
.nc-snap-msg:not(:empty) { order: 1; flex-basis: 100%; }
.nc-snap-msg {
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  color: ${v("text-sub")};
  white-space: normal;
  overflow: hidden;
  transition: none;
}
.nc-module[data-nc-slim] {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${v("header-gap")};
}
.nc-module[data-nc-slim] .nc-module-hd { display: contents; }
.nc-module[data-nc-slim] .nc-title { order: 0; }
.nc-module[data-nc-slim] .nc-snap-msg { order: 1; }
.nc-module[data-nc-slim] .nc-slim { order: 2; margin-top: 0; }
.nc-module[data-nc-slim] .nc-module-end { order: 3; }
.nc-steps {
  display: flex;
  flex-wrap: nowrap;
  gap: ${v("rhythm.step-gap")};
  min-width: 0;
  flex: 1 1 auto;
}
.nc-name {
  flex: 0 1 ${v("name-width")};
  width: ${v("name-width")};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.nc-name:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
/* Beats read at a glance: every 4 steps the gap widens from step-gap to beat-gap (one beat = one pad row on phones). */
/* Counted among the cells only ("of .nc-step-wrap"): the lane's end handle sits between cells when the lane is short,
   and must not push a beat gap onto the wrong cell. */
.nc-steps > .nc-step-wrap:nth-child(4n + 1 of .nc-step-wrap):not(:first-child) {
  margin-inline-start: calc(${v("beat-gap")} - ${v("rhythm.step-gap")});
}
/* Every lane row bleeds a little into the module padding, so the selected one can be tinted edge to edge (M, S,
   name, steps, menu) with its marker clear of the M button, without moving anything when the selection changes. */
.nc-row[data-nc-row] {
  margin-inline: calc(-1 * ${v("row-inset")});
  padding-inline: ${v("row-inset")};
}
/* The selected lane is lit, not just underlined: the whole row tinted, with a solid accent bar at its start. */
.nc-row[data-selected="true"] {
  background: ${v("accent-tint")};
  box-shadow: inset ${v("marker-width")} 0 0 ${v("accent")};
}
.nc-row[data-selected="true"] .nc-name {
  color: ${v("text")};
  text-decoration: underline;
  text-decoration-color: ${v("accent")};
  text-decoration-thickness: ${v("hairline")};
  text-underline-offset: ${v("control-gap")};
}
/* On the tint, off steps and unlit M/S are paper squares (step-cell-off), as in the mockup, so their outlines stay
   crisp instead of melting into the tint. */
.nc-row[data-selected="true"] .nc-step:not([aria-pressed="true"]):not([data-accent="true"]):not([data-out="true"]),
.nc-row[data-selected="true"] .nc-ms:not([aria-pressed="true"]) { background: ${v("rhythm.step-cell-off")}; }
/* Muted, or silenced by another lane's solo: the lane's steps dim, not just its button. */
.nc-row[data-silent="true"] .nc-steps { opacity: ${v("rhythm.probability-dim")}; }
.nc-name[data-nc-lane="1"] { color: ${v("rhythm.lane-1")}; }
.nc-name[data-nc-lane="2"] { color: ${v("rhythm.lane-2")}; }
.nc-name[data-nc-lane="3"] { color: ${v("rhythm.lane-3")}; }
.nc-name[data-nc-lane="4"] { color: ${v("rhythm.lane-4")}; }
.nc-ms-wrap {
  position: relative;
  flex: 0 0 ${v("slider-pitch")};
  height: ${v("slider-pitch")};
}
.nc-ms {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: ${v("hairline")} solid ${v("divider")};
  border-radius: ${v("slot-radius")};
  background: transparent;
  color: ${v("text-sub")};
  font-size: ${v("label-size")};
  font-weight: ${v("label-weight")};
  cursor: pointer;
  transition: none;
}
.nc-ms:hover { color: ${v("text")}; }
.nc-ms[data-nc-ms="mute"][aria-pressed="true"] {
  background: ${v("rhythm.track-mute")};
  border-color: ${v("rhythm.track-mute")};
  color: ${v("surface-page")};
}
.nc-ms[data-nc-ms="solo"][aria-pressed="true"] {
  background: ${v("rhythm.track-solo")};
  border-color: ${v("rhythm.track-solo")};
  color: ${v("surface-page")};
}
.nc-ms:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
.nc-step-wrap {
  position: relative;
  flex: 1 1 ${v("rhythm.step-cell-size")};
  min-width: 0;
  aspect-ratio: 1;
  max-height: ${v("slider-pitch")};
}
.nc-step {
  position: absolute;
  inset: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border: ${v("hairline")} solid ${v("text-sub")};
  border-radius: ${v("slot-radius")};
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: none;
}
/* Readable grid: off = empty outline, on = solid. The fill is the step's velocity (velocity-fill, set per cell from
   velocityFill: 5% = rhythm.velocity-min, 100% = rhythm.velocity-max, the accent; step-cell-on when a cell has no
   velocity). Shade means velocity, so an accent is a mark instead: a paper bar inside the step's bottom edge (an inset
   shadow, no layout), clear on every fill of the ramp. No transition: the shade snaps when the velocity changes. */
.nc-step[aria-pressed="true"] {
  background: ${v("velocity-fill")};
  border-color: ${v("velocity-fill")};
  color: ${v("rhythm.step-cell-ink")};
}
.nc-step[aria-pressed="true"][data-accent="true"] {
  box-shadow: inset 0 calc(-1 * ${v("rhythm.accent-mark-size")}) 0 0 ${v("rhythm.accent-mark")};
}
/* The playing step, Bass's method: an accent ring outside the step, one hairline clear of it, so it reads the same on an
   empty step or a filled one at any velocity, and every lane's ring at the playhead forms one column. It lifts
   above its neighbours (the ring is wider than step-gap). No transition: it follows the audio clock, step by step. */
.nc-step[data-playhead="true"] {
  z-index: 1;
  outline: ${v("playhead-width")} solid ${v("rhythm.playhead")};
  outline-offset: ${v("playhead-offset")};
}
.nc-step[data-bar="true"] { border-bottom-color: ${v("rhythm.bar-accent")}; }
/* Chance below 100%: a dashed outline at the same width (style only, no opacity, since shade means velocity). The fill
   stops at the padding box, so the dashes are the step's own colour with the row showing between them. */
.nc-step[data-dim="true"] { border-style: dashed; background-clip: padding-box; }
/* Per-lane length: steps past the end are ghosted on the selected row; the end handle sits after the last step. */
.nc-step[data-out="true"] { opacity: ${v("rhythm.probability-dim")}; background: transparent; pointer-events: none; }
/* Every lane lays its handle out the same way, selected or not, and the handle takes no width in the row: its negative
   margins cancel its own width and the step gap it adds, so it sits centred in the gap after the last step and the
   cells never move when the selection changes. Unselected lanes keep it hidden (visibility, so it cannot be focused). */
.nc-len-handle {
  display: block;
  visibility: hidden;
  position: relative;
  flex: none;
  align-self: stretch;
  width: ${v("control-gap")};
  margin-inline: calc((${v("control-gap")} + ${v("rhythm.step-gap")}) / -2);
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: ew-resize;
  touch-action: none;
  transition: none;
}
/* The bar itself overhangs the step row (a lane-height grip) without changing the row's layout. */
.nc-len-handle::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: ${v("hairline")};
  height: ${v("target-min")};
  max-height: calc(${v("target-min")} / 2);
  transform: translate(-50%, -50%);
  border-inline: ${v("hairline")} solid ${v("text-sub")};
  background: ${v("text-sub")};
}
.nc-row[data-selected="true"] .nc-len-handle { visibility: visible; z-index: 1; }
.nc-len-handle:hover::before, .nc-len-handle[data-dragging="true"]::before { background: ${v("text")}; border-color: ${v("text")}; }
.nc-len-handle:focus-visible { outline: ${v("focus-width")} solid ${v("focus-ring")}; outline-offset: ${v("hairline")}; }
button.nc-pads-label {
  border: 0;
  background: transparent;
  min-height: ${v("target-min")};
  padding: 0;
  font-family: inherit;
  cursor: pointer;
}
button.nc-pads-label[aria-pressed="true"] { color: ${v("accent")}; }
.nc-pad[data-out="true"] { opacity: ${v("rhythm.probability-dim")}; border-style: dashed; background: transparent; color: ${v("text-sub")}; }
.nc-pad[data-end="true"] { box-shadow: inset calc(-1 * ${v("focus-width")} * 2) 0 0 ${v("text")}; }
.nc-pad[data-end="true"][aria-pressed="true"][data-accent="true"] {
  box-shadow: inset calc(-1 * ${v("focus-width")} * 2) 0 0 ${v("text")}, inset 0 calc(-1 * ${v("rhythm.accent-mark-size")}) 0 0 ${v("rhythm.accent-mark")};
}
.nc-pads { display: none; }
.nc-pads-head { display: none; }
.nc-pads-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: ${v("label-size")};
  font-weight: ${v("label-weight")};
  letter-spacing: ${v("label-tracking")};
  text-transform: uppercase;
  color: ${v("text")};
}
.nc-step-tools {
  display: flex;
  align-items: stretch;
  gap: ${v("module-gap")};
  margin-bottom: ${v("module-gap")};
}
.nc-step-tools > .nc-seg { margin-bottom: 0; }
/* No margin (nor the sparkle's): the row gap already sets the dice off the length handle, and 1024 needs the
   width for 18 px cells now that beats are split by beat-gap. */
.nc-row-dice { flex: none; margin-inline: 0; }
.nc-pads-dice svg { width: calc(${v("target-min")} / 3); height: calc(${v("target-min")} / 3); display: block; margin: auto; }
.nc-fill { padding-inline: ${v("module-gap")}; touch-action: none; user-select: none; -webkit-user-select: none; }
.nc-fill[aria-pressed="true"] { background: ${v("text")}; border-color: ${v("text")}; color: ${v("surface-page")}; }
.nc-pads-step, .nc-pads-play, .nc-fill {
  flex: none;
  min-width: ${v("target-min")};
  min-height: ${v("target-min")};
  border: ${v("hairline")} solid ${v("divider")};
  border-radius: ${v("slot-radius")};
  background: ${v("surface-page")};
  color: ${v("text")};
  font-family: ${v("font-ui")};
  font-size: ${v("label-size")};
  font-weight: ${v("title-weight")};
  letter-spacing: ${v("label-tracking")};
  text-transform: uppercase;
  cursor: pointer;
  transition: none;
}
.nc-pads-play { padding-inline: ${v("module-gap")}; }
.nc-pads-play[aria-pressed="true"] { background: ${v("text")}; border-color: ${v("text")}; color: ${v("surface-page")}; }
.nc-pads-step:focus-visible, .nc-pads-play:focus-visible, .nc-fill:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
.nc-pad {
  position: relative;
  overflow: hidden;
  min-height: calc(${v("target-min")} * 1.25);
  border: ${v("hairline")} solid ${v("text-sub")};
  border-radius: ${v("slot-radius")};
  background: transparent;
  color: ${v("text-sub")};
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  text-align: start;
  vertical-align: top;
  padding: ${v("control-gap")} ${v("module-gap")};
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: none;
}
/* Pads show the selected lane's steps, so they follow the same rules: fill = velocity, accent = the paper mark,
   chance below 100% = dashed outline. */
.nc-pad[aria-pressed="true"] {
  background: ${v("velocity-fill")};
  border-color: ${v("velocity-fill")};
  color: ${v("rhythm.step-cell-ink")};
}
.nc-pad[aria-pressed="true"][data-accent="true"] {
  box-shadow: inset 0 calc(-1 * ${v("rhythm.accent-mark-size")}) 0 0 ${v("rhythm.accent-mark")};
}
.nc-pad[data-playhead="true"] {
  outline: ${v("playhead-width")} solid ${v("rhythm.playhead")};
  outline-offset: ${v("playhead-offset")};
}
.nc-pad[data-dim="true"] { border-style: dashed; background-clip: padding-box; }
.nc-pads[data-silent="true"] { opacity: ${v("rhythm.probability-dim")}; }
.nc-pad:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
.nc-step:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
/* A focused step or pad that is also playing keeps the playhead ring (focus comes later at the same specificity and
   would thin it to focus-width; both are the accent). */
.nc-step[data-playhead="true"]:focus-visible, .nc-pad[data-playhead="true"]:focus-visible {
  outline-width: ${v("playhead-width")};
  outline-offset: ${v("playhead-offset")};
}
.nc-fx {
  margin-inline: calc(${v("module-pad")} * -1);
  padding: ${v("stack-card-pad-y")} ${v("module-pad")};
  min-width: 0;
  transition: none;
}
.nc-fx-name {
  margin: 0 0 ${v("module-gap")} 0;
  font-size: ${v("body-size")};
  font-weight: ${v("fx-name-weight")};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* A panel (Rhythm's Parameters, under the grid): a page-coloured area, full bleed to the module's sides and
   bottom, a hairline above, a title and what it edits, and its controls in columns from 1024 px. */
.nc-section[data-nc-panel="true"] {
  flex: 1 0 auto;
  margin-inline: calc(${v("module-pad")} * -1);
  margin-bottom: calc(${v("module-pad")} * -1);
  padding: ${v("module-pad")};
  background: ${v("surface-page")};
  border-top: ${v("hairline")} solid ${v("divider")};
}
.nc-panel-hd {
  display: flex;
  align-items: baseline;
  gap: ${v("module-gap")};
  min-width: 0;
}
.nc-panel-title {
  margin: 0;
  font-size: ${v("title-size")};
  font-weight: ${v("title-weight")};
  letter-spacing: ${v("title-tracking")};
  white-space: nowrap;
}
.nc-panel-subject {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  color: ${v("text-sub")};
}
.nc-section[data-nc-lane="1"] .nc-panel-subject { color: ${v("rhythm.lane-1")}; }
.nc-section[data-nc-lane="2"] .nc-panel-subject { color: ${v("rhythm.lane-2")}; }
.nc-section[data-nc-lane="3"] .nc-panel-subject { color: ${v("rhythm.lane-3")}; }
.nc-section[data-nc-lane="4"] .nc-panel-subject { color: ${v("rhythm.lane-4")}; }
.nc-panel-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${v("module-pad")};
  min-width: 0;
}
.nc-canvas {
  width: 100%;
  height: ${v("display-height")};
  display: block;
  background: transparent;
}
.nc-note {
  /* The containing block for its absolute token probe, so overflow: hidden clips the probe after a long note. */
  position: relative;
  margin: 0;
  min-width: 0;
  color: ${v("text-sub")};
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nc-knob {
  width: ${v("knob-size")};
  height: ${v("knob-size")};
  flex: none;
  border-radius: 50%;
  border: ${v("hairline")} solid ${v("divider")};
  background: ${v("surface-page")};
  position: relative;
  padding: 0;
  touch-action: none;
  cursor: pointer;
  transition: none;
}
.nc-knob-mark {
  position: absolute;
  left: 50%;
  top: ${v("control-gap")};
  width: ${v("hairline")};
  height: ${v("control-gap")};
  background: ${v("text")};
  transform-origin: center ${v("module-gap")};
  transform: rotate(calc(var(--knob-turn, 0) * 1deg));
  transition: none;
}
.nc-knob:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
/* Tabs stay on one line (no height jump); a tab that does not fit gives way with an ellipsis, and its full text stays
   its accessible name. */
.nc-choice-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: ${v("control-gap")} ${v("header-gap")};
  min-width: 0;
}
.nc-choice {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  border-bottom: ${v("hairline")} solid transparent;
  background: transparent;
  color: ${v("text-sub")};
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  padding: ${v("control-gap")} 0;
  cursor: pointer;
  transition: none;
}
/* On touch a tab cut to an ellipsis is still a full target: never narrower or shorter than target-min. */
@media (pointer: coarse) {
  .nc-choice { min-width: ${v("target-min")}; min-height: ${v("target-min")}; }
  /* Tabs that cannot shrink below target-min scroll within their row (no visible scrollbar), never the page. */
  .nc-choice-row { overflow-x: auto; scrollbar-width: none; }
  .nc-choice-row::-webkit-scrollbar { display: none; }
}
.nc-choice[aria-selected="true"] {
  color: ${v("text")};
  border-bottom-color: ${v("accent")};
}
.nc-choice:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
.nc-slot-row { position: relative; }
.nc-slot-menu {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${v("control-gap")};
  min-width: ${v("name-width")};
  padding: ${v("control-gap")};
  background: ${v("surface-page")};
  border: ${v("hairline")} solid ${v("divider")};
  color: ${v("text")};
}
.nc-menu-btn {
  display: flex;
  align-items: center;
  min-height: ${v("rhythm.menu-item-min")};
  border: 0;
  background: transparent;
  color: ${v("text")};
  font-family: ${v("font-readout")};
  font-size: ${v("readout-size-small")};
  text-align: left;
  padding: 0;
  cursor: pointer;
  transition: none;
}
@media (pointer: coarse) {
  .nc-menu-btn { min-height: ${v("target-min")}; }
  /* A 44 px touch band drawn at ASTRID's 20 px pitch: the extra height overlaps the gaps, not the rows. */
  .nc-field[data-nc-slider] .nc-range {
    height: ${v("target-min")};
    margin-block: calc((${v("slider-pitch")} - ${v("target-min")}) / 2);
  }
  /* M and S: each a full 44 px box (the button paints smaller inside), touching, never overlapping. */
  .nc-ms-wrap { flex-basis: ${v("target-min")}; height: ${v("target-min")}; }
  .nc-ms-wrap + .nc-ms-wrap { margin-inline-start: calc(${v("module-gap")} * -1); }
  .nc-ms {
    inset: calc((${v("target-min")} - ${v("slider-pitch")}) / 2);
    width: auto;
    height: auto;
  }
}
.nc-slot-scrim {
  position: fixed;
  inset: 0;
  z-index: 2;
  background: transparent;
  touch-action: none;
}
.nc-menu-btn:focus-visible {
  outline: ${v("focus-width")} solid ${v("focus-ring")};
  outline-offset: ${v("hairline")};
}
.nc-hit {
  display: none;
  position: absolute;
  pointer-events: auto;
}
@media (pointer: coarse) {
  .nc-hit {
    display: block;
    left: 50%;
    top: 50%;
    width: ${v("target-min")};
    height: ${v("target-min")};
    transform: translate(-50%, -50%);
  }
}
/* nc-ui step editor (openStepEditor): long-press a step for velocity and chance. Sits under the step;
   a bottom sheet at phone widths. Rows are 44 px so the sliders are thumb-sized. */
.nc-step-editor {
  position: fixed;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: ${v("module-gap")};
  width: calc(${v("name-width")} * 6);
  max-width: calc(100vw - 2 * ${v("module-gap")});
  padding: ${v("module-gap")};
  background: ${v("surface-page")};
  border: ${v("hairline")} solid ${v("divider")};
  color: ${v("text")};
}
/* The step being edited: a dark ring (as Bass marks its selected pad), full strength, fill unchanged. */
.nc-pad[data-editing="true"], .nc-step-wrap[data-editing="true"] .nc-step {
  opacity: 1;
  outline: ${v("focus-width")} solid ${v("text")};
  outline-offset: ${v("hairline")};
}
.nc-step-editor-scrim[data-placement="sheet"] { z-index: 4; background: ${v("text")}; opacity: ${v("rhythm.probability-dim")}; }
.nc-step-editor[data-placement="sheet"] { z-index: 5; }
.nc-step-editor-head { display: flex; align-items: center; justify-content: space-between; gap: ${v("module-gap")}; }
.nc-step-editor-row {
  display: flex;
  align-items: center;
  gap: ${v("module-gap")};
  min-height: ${v("target-min")};
}
.nc-step-editor-row .nc-label { flex: none; min-width: ${v("name-width")}; }
.nc-step-editor-row .nc-range { flex: 1 1 0; min-width: 0; height: ${v("target-min")}; }
.nc-step-editor-row .nc-readout { flex: none; min-width: ${v("name-width")}; text-align: right; }
.nc-step-editor-done {
  min-width: ${v("target-min")};
  min-height: ${v("target-min")};
  border: 0;
  background: none;
  color: ${v("text")};
  font-family: ${v("font-ui")};
  font-size: ${v("label-size")};
  font-weight: ${v("title-weight")};
  letter-spacing: ${v("label-tracking")};
  text-transform: uppercase;
  cursor: pointer;
  transition: none;
}
.nc-step-editor-done:focus-visible { outline: ${v("focus-width")} solid ${v("focus-ring")}; outline-offset: ${v("hairline")}; }
.nc-step-editor[data-placement="sheet"] {
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  max-width: none;
  padding-bottom: calc(${v("module-gap")} + env(safe-area-inset-bottom));
  border-width: ${v("hairline")} 0 0;
}
/* nc-ui toast (createToast): ASTRID's small dark chip with an uppercase, letter-spaced action.
   Opacity only: in with motion-fade, out with motion-fade-out. Only the chip takes taps. */
.nc-ui-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: ${v("toast-gap")};
  max-width: calc(100vw - 2 * ${v("toast-offset")});
  min-height: ${v("toast-target")};
  padding: 0 0 0 ${v("toast-pad-x")};
  border-radius: ${v("toast-radius")};
  background: ${v("toast-bg")};
  color: ${v("toast-text")};
  font-family: ${v("font-ui")};
  font-size: ${v("toast-font-size")};
  line-height: ${v("label-leading")};
  white-space: nowrap;
  pointer-events: auto;
  opacity: 0;
  transition: opacity ${v("motion-fade")};
}
.nc-ui-toast[data-placement="bottom"] { bottom: calc(${v("toast-offset")} + env(safe-area-inset-bottom)); }
.nc-ui-toast[data-placement="top"] { top: calc(${v("toast-offset")} + env(safe-area-inset-top)); }
.nc-ui-toast[data-placement="anchor"] { position: absolute; transform: none; }
.nc-ui-toast[data-state="open"] { opacity: 1; }
.nc-ui-toast[data-state="closing"] {
  opacity: 0;
  pointer-events: none;
  transition: opacity ${v("motion-fade-out")};
}
.nc-ui-toast-message { overflow: hidden; text-overflow: ellipsis; }
.nc-ui-toast-action {
  min-width: ${v("toast-target")};
  min-height: ${v("toast-target")};
  padding: 0 ${v("toast-pad-x")};
  border: 0;
  background: none;
  color: ${v("toast-action")};
  font: inherit;
  font-weight: ${v("title-weight")};
  letter-spacing: ${v("label-tracking")};
  text-transform: uppercase;
  cursor: pointer;
  transition: none;
}
.nc-ui-toast-action:focus-visible {
  outline: ${v("focus-width")} solid ${v("toast-action")};
  outline-offset: calc(-2 * ${v("focus-width")});
}
.nc-ui-toast-live {
  position: absolute;
  width: ${v("hairline")};
  height: ${v("hairline")};
  overflow: hidden;
  clip-path: inset(50%);
  pointer-events: none;
  white-space: nowrap;
}
/* Pinned to its containing block's corner at zero size, so wherever it sits in a control (after a long label or
   note, in an unpositioned box) it can never reach past the page edge. It is empty and never shown; it only carries
   the accent and the UI font for token reads. */
.nc-token-probe {
  position: absolute;
  inset: 0 auto auto 0;
  width: 0;
  height: 0;
  overflow: hidden;
  background: ${v("accent")};
  font-family: ${v("font-ui")};
  pointer-events: none;
}
@media (min-width: 1024px) {
  .nc-stack[data-nc-layout="adjacent"] {
    display: grid;
    grid-template-columns: var(--astrid-cols);
    align-items: stretch;
  }
  .nc-stack[data-nc-layout="adjacent"] > .nc-module {
    border-bottom: 0;
    border-inline-end: ${v("hairline")} solid ${v("divider")};
  }
  .nc-stack[data-nc-layout="adjacent"] > .nc-module:last-child { border-inline-end: 0; }
  .nc-module { padding: ${v("module-pad-y-desktop")} ${v("module-pad-x-desktop")}; }
  /* Desktop slots (item C): Bass's 2 x 5 grid across the column, each slot as tall as the Pattern buttons
     (target-min). One row of 10 left each slot 19 px wide at 1280 and 16 px at 1024. */
  .nc-slot-line { flex-wrap: wrap; }
  .nc-snap-row {
    flex: 1 0 100%;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: ${v("control-gap")};
  }
  .nc-snap-wrap {
    width: 100%;
    max-width: none;
    height: ${v("target-min")};
  }
  .nc-snap { font-size: ${v("readout-size")}; }
  .nc-snap-wrap > .nc-hit { display: none; }
  .nc-section[data-nc-inset="true"] {
    margin-inline: calc(${v("module-pad-x-desktop")} * -1);
    margin-bottom: calc(${v("module-pad-y-desktop")} * -1);
    padding: ${v("module-pad-y-desktop")} ${v("module-pad-x-desktop")};
  }
  .nc-section[data-nc-panel="true"] {
    margin-inline: calc(${v("module-pad-x-desktop")} * -1);
    margin-bottom: calc(${v("module-pad-y-desktop")} * -1);
    padding: ${v("module-pad-y-desktop")} ${v("module-pad-x-desktop")};
  }
  .nc-panel-body {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: ${v("module-pad-x-desktop")};
  }
  .nc-module[data-nc-slim] {
    display: block;
    padding-inline: ${v("module-pad-x-slim")};
  }
  .nc-module[data-nc-slim] .nc-module-hd { display: flex; }
  .nc-module[data-nc-slim] .nc-module-hd,
  .nc-module[data-nc-slim] .nc-slim {
    flex-direction: column;
    align-items: flex-start;
  }
  .nc-module[data-nc-slim] .nc-slim { margin-top: ${v("module-gap")}; }
  .nc-module[data-nc-slim] .nc-slim-lines { white-space: normal; }
  .nc-fx {
    margin-inline: calc(${v("module-pad-x-desktop")} * -1);
    padding-inline: ${v("module-pad-x-desktop")};
  }
}
/* 1024-1279 px (item C): four open columns left the lead about 240 px (3.5 px step cells). With a lead and three
   open modules, the last two share the last column (stacked), so the lead is 53fr against 23.333fr and every lane
   stays on one row with 18 px+ cells; the outer columns keep their width. */
@media (min-width: 1024px) and (not (min-width: 1280px)) {
  /* Three open columns (Rhythm: Transport, Pattern, Filter) get the same 53fr lead. */
  .nc-stack[data-nc-layout="adjacent"] { --astrid-lead-fr: 53fr; }
  .nc-stack[data-nc-layout="adjacent"][data-nc-stack-last="true"] {
    grid-template-columns: minmax(0, 23.333fr) minmax(0, 53fr) minmax(0, 23.333fr);
  }
  .nc-stack[data-nc-stack-last="true"] > .nc-module { grid-row: 1 / span 2; }
  .nc-stack[data-nc-stack-last="true"] > .nc-module:nth-last-child(2) {
    grid-column: 3;
    grid-row: 1;
    border-inline-end: 0;
    border-bottom: ${v("hairline")} solid ${v("divider")};
  }
  .nc-stack[data-nc-stack-last="true"] > .nc-module:last-child { grid-column: 3; grid-row: 2; }
}
/* From 1280 px the lead (Rhythm's step grid) widens from ASTRID's 30fr to 48fr so its 16 cells are 18 px+ on one row. */
@media (min-width: 1280px) {
  .nc-stack[data-nc-layout="adjacent"] {
    --astrid-lead-fr: 48fr;
    --astrid-rest-fr: 21.333fr;
  }
}
@media (max-width: 768px) {
  /* Phones: rows are the overview and lane picker; the selected lane edits on 4x4 pads (one row = one beat). */
  .nc-row-dice { display: none; }
  .nc-pads-head {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: ${v("module-gap")};
    padding-block: ${v("control-gap")};
    background: ${v("surface-page")};
    border-bottom: ${v("hairline")} solid ${v("divider")};
  }
  .nc-pads {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: ${v("module-gap")};
    touch-action: pan-y;
  }
  .nc-steps { pointer-events: none; }
  .nc-steps .nc-hit { display: none; }
  .nc-row { cursor: pointer; }
  .nc-slot-line { flex-wrap: wrap; }
  .nc-snap-row {
    flex: 1 0 100%;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .nc-snap-wrap {
    width: 100%;
    max-width: ${v("slot-span")};
    height: ${v("slot-block")};
    justify-self: center;
  }
  .nc-snap { font-size: ${v("readout-size")}; }
  .nc-snap-wrap > .nc-hit { display: none; }
}
@media (max-width: 360px) {
  .nc-label, .nc-name, .nc-note, .nc-title { text-overflow: ellipsis; }
}
@media (prefers-reduced-motion: reduce) {
  .nc-btn, .nc-btn:active, .nc-toggle, .nc-seg > button, .nc-sparkle, .nc-sparkle-btn, .nc-sparkle-btn:active,
  .nc-ui-toast, .nc-ui-toast[data-state="closing"],
  .nc-meter, .nc-meter-fill, .nc-step[data-playhead="true"] {
    transition: none;
    animation: none;
  }
  .nc-snap[data-queued="true"][data-pulse="true"] {
    outline-color: ${v("accent-faint")};
    background: transparent;
    box-shadow: inset 0 calc(-1 * ${v("focus-width")} * 2) 0 ${v("accent-faint")};
  }
}
`;
}
