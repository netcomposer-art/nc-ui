/** fx-blocks' BlockSliderSpec, plus an optional step and disabled state. */
export interface SliderSpec {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  log?: boolean;
  step?: number;
  disabled?: boolean;
  format: (v: number) => string;
  onInput: (v: number) => void;
}
export interface SliderHandle {
  readonly el: HTMLElement;
  set(value: number): void;
  setDisabled(disabled: boolean): void;
}
export const LOG_STEPS: number;
export function toPosition(min: number, max: number, value: number, log?: boolean): number;
export function fromPosition(min: number, max: number, position: number, log?: boolean): number;
export function createSlider(spec: SliderSpec, options?: { doc?: Document }): SliderHandle;
/** Matches fx-blocks' `SliderFactory` ((spec) => { el, set }). */
export function sliderFactory(spec: SliderSpec): SliderHandle;
