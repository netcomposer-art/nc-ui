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
  | FxControl;

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
