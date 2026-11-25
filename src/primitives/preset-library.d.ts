import type { PresetRecord, PresetStore } from "./presets.js";
import type { ShareEnvelope, ShareFormat } from "./share.js";

export const PRESET_LIBRARY_CSS: string;

export interface PresetLibraryOptions {
  store: PresetStore;
  /** The instrument's fixed categories, in order. */
  categories: readonly string[];
  /** "sounds", "grooves", "kits": the count's word. */
  noun?: string;
  /** The category shown first (default: the first). */
  category?: string | null;
  /** The preset loaded now, if one is. */
  current?: string | null;
  document?: Document;
  /** Load a preset into the instrument (its own loader migrates old formats). */
  onLoad(rec: PresetRecord): void;
  /** The sound now, for Save as…: the instrument's Preset provider's answer. */
  capture(): { format: ShareFormat; fv?: number; data: object };
  /** Whether the sound now differs from the preset loaded (Save as…'s title). */
  now?(): { edited?: boolean } | null;
  /** A name to start Save as… with. */
  suggestName?(): string;
  /** The author name to start Save as… with (remembered by the instrument). */
  by?(): string;
  onSaved?(rec: PresetRecord): void;
  /** The Favs (the instrument's pads 1–0). */
  favs?: {
    /** The preset id on each pad (index 0 = key 1 … 9 = key 0), or null. */
    ids(): (string | null)[];
    names?(): (string | null)[];
    /** Put a preset on a pad (null: take it off). */
    put(pad: number, rec: PresetRecord | null): void;
  };
  /** Copy link (instrument links): make and copy the link; throws with a sentence when it can't. */
  copyLink?(envelope: ShareEnvelope, rec: PresetRecord): Promise<void>;
  /** Import a library file; the line to show. */
  importFile?(text: string): Promise<string>;
  /** Export the library; the line to show. */
  exportFile?(): string;
}

export interface PresetLibrary {
  readonly el: HTMLElement;
  paint(): void;
  setCurrent(id: string | null): void;
  step(dir: 1 | -1): PresetRecord | null;
  keep(envelope: ShareEnvelope, link?: string): Promise<PresetRecord>;
  saveAs(): void;
}

export function createPresetLibrary(opts: PresetLibraryOptions): PresetLibrary;
