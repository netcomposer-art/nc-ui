import type { ShareEnvelope, ShareFormat } from "./share.js";

export const PRESETS_FILE: "netcomposer.presets";
export const PRESETS_FILE_V: 1;
export const SOURCES: readonly ["factory", "mine", "shared"];
export const NAME_MAX: number;
export const BY_MAX: number;
export const CATEGORY_MAX: number;
export const TAGS_MAX: number;
export const TAG_MAX: number;
export const LIBRARY_MAX: number;

export type PresetSource = "factory" | "mine" | "shared";

/** A preset: a share envelope plus what the library keeps about it. */
export interface PresetRecord {
  id: string;
  source: PresetSource;
  format: ShareFormat;
  fv?: number;
  data: object;
  name: string;
  category: string;
  tags: string[];
  by?: string;
  /** The link it was remixed from. */
  from?: string;
  /** A shared preset's own link (where it was kept from). */
  link?: string;
  created: string;
  updated: string;
  /** A shared preset not opened yet: false (NEW). */
  seen?: boolean;
}

export function cleanTags(tags: unknown): string[];
export function cleanText(text: unknown, max: number): string;
export function newPresetId(rand?: () => number): string;
export function presetProblem(rec: unknown): string | null;
export function fromEnvelope(
  env: ShareEnvelope,
  options?: { source?: "shared" | "mine"; link?: string; categories?: readonly string[]; now?: Date; id?: string },
): PresetRecord;
export function toEnvelope(rec: PresetRecord): ShareEnvelope;
export function mineFrom(parts: {
  format: ShareFormat;
  fv?: number;
  data: object;
  name: string;
  category: string;
  tags?: string[];
  by?: string;
  basedOn?: PresetRecord | null;
  now?: Date;
  id?: string;
}): PresetRecord;
export function filterPresets(
  list: readonly PresetRecord[],
  options?: { category?: string | null; source?: "all" | PresetSource; search?: string },
): PresetRecord[];
export function sourceCounts(
  list: readonly PresetRecord[],
  options?: { category?: string | null; search?: string },
): { all: number; factory: number; mine: number; shared: number };
export function exportFile(records: readonly PresetRecord[], now?: Date): string;
export function importFile(
  text: string,
  options?: { format?: ShareFormat | null; have?: Set<string>; rand?: () => number },
): { presets: PresetRecord[]; problems: string[] };

export interface PresetStore {
  readonly format: ShareFormat;
  readonly ready: Promise<void>;
  readonly persistent: boolean;
  list(): PresetRecord[];
  get(id: string): PresetRecord | null;
  onChange(listener: () => void): () => void;
  put(...recs: PresetRecord[]): Promise<void>;
  update(
    id: string,
    patch: Partial<Pick<PresetRecord, "name" | "category" | "tags" | "by" | "data" | "seen">>,
    now?: Date,
  ): Promise<PresetRecord>;
  remove(id: string): Promise<boolean>;
}
export function createPresetStore(options: {
  format: ShareFormat;
  factory?: readonly Omit<PresetRecord, "source">[] | readonly PresetRecord[];
  idb?: IDBFactory | null;
}): PresetStore;
