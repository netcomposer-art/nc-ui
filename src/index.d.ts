export * from "../dist/tokens.js";
export * from "./color.js";
export {
  applyAlias,
  entry,
  filterPaint,
  prop,
  readCanvasFont,
  readLive,
  renamedCssVar,
  tokenAlias,
  v,
} from "./alias.js";
export type { AliasEntry, TokenKind } from "./alias.js";
export { installedCss, installTheme } from "./primitives/install.js";
/** The modulated control and every element inside it. The kit turns their motion off. */
export const MODULATED_SELECTOR: "[data-modulated], [data-modulated] *";
export {
  DEFAULT_GESTURE,
  type GestureConfig,
  type GestureIntent,
  PadGesture,
  bindPadGesture,
} from "./primitives/gesture.js";
export {
  type StepEditorHandle,
  type StepEditorProps,
  openStepEditor,
  percent,
} from "./primitives/step-editor.js";
export { type ConfirmOptions, confirm, confirmCss } from "./primitives/confirm.js";
export { type SwitchHandle, type SwitchOptions, createSwitch } from "./primitives/switch.js";
export {
  LOG_STEPS,
  type SliderHandle,
  type SliderSpec,
  createSlider,
  fromPosition,
  sliderFactory,
  toPosition,
} from "./primitives/slider.js";
export {
  TOAST_DURATION,
  type ToastCloseReason,
  type ToastHandle,
  type ToastProps,
  anchorToastPosition,
  createToast,
  pickToastPlacement,
  toastAnnouncement,
} from "./primitives/toast.js";

export const HIDDEN_STORAGE_KEY: "netcomposer.hidden.v1";
export const RHYTHM_HIDDEN_KEY: "netcomposer.rhythm.hidden.v1";

export type SlotOp = "recall" | "store" | "clear";
export type FilterPaint = "lp" | "hp" | "bp";

export interface SliderControl {
  type: "slider";
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  /** Set only while an LFO or another external source is driving this value. */
  modulated?: boolean;
  onChange: (value: number) => void;
  /** Fires when the pointer or key is released, after the last `onChange`. */
  onCommit?: (value: number) => void;
  /**
   * Adds a Tap button on the label line (tap tempo). Fires on pointerdown, or Enter/Space, with the event
   * timestamp in ms (performance.now() timebase) so the host times taps without click latency.
   */
  onTap?: (timeMs: number) => void;
  /** Readout text with its unit (e.g. "62%", "55 Hz"); also the slider's aria-valuetext. Default: the number. */
  valueText?: string;
}
export interface SelectControl {
  type: "select";
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}
export interface ToggleControl {
  type: "toggle";
  id: string;
  label: string;
  pressed: boolean;
  role?: "mute" | "solo";
  onPress: () => void;
}
export interface ButtonControl {
  type: "button";
  id: string;
  label: string;
  on: boolean;
  onPress: () => void;
  /** Accessible name when it differs from the visible label (e.g. "Tap to join the playing beat"). */
  ariaLabel?: string;
  /** Surprise: a target-min sparkle button beside this one (it also recolours the module's slot row). */
  onSparkle?: () => void;
  /** Tooltip for that sparkle button. */
  sparkleTitle?: string;
}
export interface ReadoutControl {
  type: "readout";
  id: string;
  label: string;
  value: string;
}
export interface LabelControl {
  type: "label";
  id: string;
  text: string;
}
export interface NoteControl {
  type: "note";
  id: string;
  text: string;
}
export interface KnobControl {
  type: "knob";
  id: string;
  label: string;
  min: number;
  max: number;
  /** Defaults to one hundredth of the range. Shift uses a tenth of this. */
  step?: number;
  /** Spoken with the value: "120 Hz", "-6 dB", or "45%" when the unit is "%". */
  unit?: string;
  value: number;
  /** Set only while an LFO or another external source is driving this value. */
  modulated?: boolean;
  /** The value as read out (title and aria-valuetext), instead of the number and unit. */
  valueText?: string;
  /** Accessible name when it differs from the label ("Rhythm send A" for a knob labelled "A"). */
  ariaLabel?: string;
  /** Double-click returns the knob here. */
  defaultValue?: number;
  /** The knob over its label, the value in its title only (a strip's sends). */
  compact?: boolean;
  onChange: (value: number) => void;
}
export interface ChoiceControl {
  type: "choice";
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}
export interface SlotModel {
  label: string;
  filled: boolean;
  active: boolean;
  /** Changed by edits since it was stored or recalled: a small dot on the slot. */
  edited?: boolean;
  /** Recall waits for the end of the bar; a second tap switches now (Bass). Shown as an accent outline. */
  queued?: boolean;
  /** On the beat while queued (audio-driven): the queued outline goes full accent. */
  pulse?: boolean;
}
export interface SlotRowControl {
  type: "slotRow";
  id: string;
  slots: SlotModel[];
  morph: number;
  morphText: string;
  onSlot: (index: number, op: SlotOp) => void;
  onMorph: (value: number) => void;
  /** Surprise me: new grooves, then the existing slot-fill colours. Omit it when a button control carries the sparkle. */
  onSparkle?: () => void;
}
export interface StepCell {
  on: boolean;
  accent: boolean;
  dim?: boolean;
  velocity?: number;
}
export interface StepRow {
  id: string;
  label: string;
  length: number;
  steps: StepCell[];
  /** 1–4, painted with rhythm.lane-n. */
  lane?: number;
  /** Painted on the lane's M/S buttons (shown when the grid has onMute/onSolo). */
  mute?: boolean;
  solo?: boolean;
}
export interface StepGridControl {
  type: "stepGrid";
  id: string;
  rows: StepRow[];
  playhead: number;
  /** Row id painted as the selected track. */
  selectedRow?: string;
  onToggle: (row: number, step: number, accent: boolean) => void;
  onSelectRow?: (row: number) => void;
  /** Swipe-to-paint sets one field explicitly (on/off follows the first step touched). Falls back to onToggle. */
  onSet?: (row: number, step: number, field: "on" | "accent", value: boolean) => void;
  /** Long press on a step (row grid or phone pad); `anchor` is the pressed element. */
  onLongPress?: (row: number, step: number, anchor: HTMLElement) => void;
  /** Adds an M button at each lane start. */
  onMute?: (row: number) => void;
  /** Adds an S button at each lane start. */
  onSolo?: (row: number) => void;
  /** Adds a mini Play to the phone pad header (sticky while the pads are on screen). */
  transport?: {
    playing: boolean;
    onToggle: () => void;
    /** Visible label; default "Stop" while playing, else "Play" (e.g. "Tap to join"). */
    label?: string;
    /** Accessible name when it differs from the label. */
    ariaLabel?: string;
  };
  /** Per-row dice (and the phone pad header's): new steps for that row. Pair it with an Undo. */
  onDice?: (row: number) => void;
  /** Hold-for-Fill: true while held, false on release. The host plays a fill without storing it. */
  onFill?: (held: boolean) => void;
  /**
   * Per-lane length, 1..steps.length. Adds an end handle after the selected row's last step (drag it, or arrow
   * keys), and makes the phone pad header's lane name a toggle: in length mode a tap or drag across the pads
   * sets where the lane ends.
   */
  onLength?: (row: number, length: number) => void;
}
export interface CanvasControl {
  type: "canvas";
  id: string;
  label: string;
  paint: "filter" | "envelope" | "meter" | "playhead" | "swatch";
  mode?: FilterPaint;
  cutoff?: number;
  resonance?: number;
  decay?: number;
  level?: number;
  step?: number;
  steps?: number;
}
export interface FxControl {
  type: "fx";
  id: string;
  title: string;
  depth: 1 | 2 | 3 | 4;
  controls: Control[];
  /** Give the card a header switch (role="switch", named by the title). Off dims the card by colour. */
  on?: boolean;
  onToggle?: (on: boolean) => void;
  /** Rarely used rows, behind a "More" disclosure (fx-blocks' modulation rows). */
  more?: Control[];
  moreLabel?: string;
}
/** A strip's send: a compact knob (0..1) under the strip's M and S. */
export interface StripSend {
  id: string;
  label: string;
  ariaLabel?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  valueText?: string;
  defaultValue?: number;
  onChange: (value: number) => void;
}
/**
 * A mixer channel strip: name, M and S, sends, the console fader (a flat cap, 0..1 position) with its meter beside it
 * on one scale, and the readout. The host owns the law: `ticks` and every meter level are positions on it, so the
 * labels line up with both. Update the meter every frame with `stripMeter(moduleEl, id).update(levels, dt)`.
 */
export interface StripControl {
  type: "strip";
  id: string;
  label: string;
  /** Fader position 0..1 (bottom to top). */
  value: number;
  /** The readout and aria-valuetext ("−6.0"). */
  valueText?: string;
  /** Arrow-key step in positions (default 0.005); Page Up/Down are ten, Shift a quarter. */
  step?: number;
  /** Where a double-click (fader or readout) returns, when there is no onReset. */
  defaultValue?: number;
  /** Shown in the readout's title: "Double-click: back to −6.0 dB". */
  resetText?: string;
  /** Tick labels on the scale between fader and meter: `value` is a position. */
  ticks?: { value: number; label: string }[];
  /** 2: a stereo (two-sided) meter. */
  channels?: 1 | 2;
  /** The master strip: wider. */
  master?: boolean;
  mute?: boolean;
  solo?: boolean;
  /** Muted, or silenced by another strip's solo: the name and readout dim by colour. */
  silent?: boolean;
  sends?: StripSend[];
  onChange: (value: number) => void;
  onReset?: () => void;
  /** Adds the M button. */
  onMute?: () => void;
  /** Adds the S button. */
  onSolo?: () => void;
  /** The clip light was clicked (it clears itself). */
  onClipClear?: () => void;
}
export type Control =
  | SliderControl
  | SelectControl
  | ToggleControl
  | ButtonControl
  | ReadoutControl
  | LabelControl
  | NoteControl
  | KnobControl
  | ChoiceControl
  | SlotRowControl
  | StepGridControl
  | CanvasControl
  | FxControl
  | StripControl;

export interface ModuleSection {
  id: string;
  title?: string;
  /** Shaded inset panel, one shade darker than the module, full bleed (ASTRID's Hacks panel). */
  inset?: boolean;
  /** A panel under the section before it: page-coloured, full bleed, a title (`title`) plus what it edits
   * (`subject`, tinted by `lane`), and its controls in columns from 1024 px. Rhythm's Parameters panel. */
  panel?: boolean;
  subject?: string;
  lane?: 1 | 2 | 3 | 4;
  /** In a console module: where this section sits ("strips" scroll on phones, "fx" cards, the "master" strip). */
  area?: "strips" | "fx" | "master";
  /** Accessible group name for the section. */
  label?: string;
  controls: Control[];
}
export interface ModuleDef {
  id: string;
  title: string;
  summary?: string;
  /** Quiet header line. Empty until a slot store, clear, or empty recall. */
  status?: string;
  /** Desktop lead column, as ASTRID: 30fr against 23.333fr; from 1280 px 48fr against 21.333fr; at 1024-1279 px 53fr against 23.333fr (with three other open modules the last two stack in one column). */
  lead?: boolean;
  controls?: Control[];
  sections?: ModuleSection[];
  /** "console": the sections sit on one row by `area` (strips, fx, master), full bleed (the Studio's Mix). */
  layout?: "console";
  /** Show a header switch (role="switch", named by the title). Off dims the body by colour. */
  on?: boolean;
  onToggle?: (on: boolean) => void;
}
export interface ModuleHandle {
  el: HTMLElement;
  update(def: ModuleDef): void;
  redraw(): void;
}

export function readHidden(
  storage: Pick<Storage, "getItem"> | null | undefined,
  key?: string,
): Set<string>;
export function writeHidden(
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined,
  id: string,
  hidden: boolean,
  key?: string,
): void;
export function seedHidden(ids: readonly string[], key?: string): void;
export function defineModule(def: ModuleDef, storageKey?: string): ModuleHandle;
export function placeModules(
  host: HTMLElement,
  modules: ModuleHandle[],
  layout?: "adjacent" | "stack",
): void;
export function syncAdjacentColumns(host: HTMLElement | null): void;
export function renderGallery(host: HTMLElement): ModuleHandle[];

export interface FaderHandle {
  readonly el: HTMLElement;
  readonly value: number;
  readonly dragging: boolean;
  /** Move the cap without onChange; ignored while a hand holds it. */
  set(value: number): void;
  setText(text: string | undefined): void;
  setLabel(text: string): void;
  configure(next: { step?: number; onChange?: (value: number) => void; onReset?: () => void }): void;
}
export function createFader(options: {
  label: string;
  value?: number;
  step?: number;
  valueText?: string;
  onChange?: (value: number) => void;
  onReset?: () => void;
  doc?: Document;
}): FaderHandle;
export function faderHandle(el: Element): FaderHandle | undefined;

/** One meter channel for one frame: 0..1 positions on the host's scale; `over` lights the clip light. */
export interface MeterLevel {
  peak: number;
  rms: number;
  over?: boolean;
}
export interface MeterHandle {
  readonly el: HTMLElement;
  readonly clipped: boolean;
  update(levels: readonly MeterLevel[], dt: number): void;
  clip(): void;
  clear(): void;
  reset(): void;
  setLabel(text: string): void;
  configure(next: { onClear?: () => void }): void;
}
export function createMeter(options: {
  channels?: 1 | 2;
  label: string;
  onClear?: () => void;
  doc?: Document;
}): MeterHandle;
export function meterHandle(el: Element | null | undefined): MeterHandle | undefined;
export function cssSeconds(text: string | null | undefined, fallback: number): number;
/** The meter of the strip control `id` inside `root` (a module element). */
export function stripMeter(root: ParentNode | null | undefined, id: string): MeterHandle | undefined;
