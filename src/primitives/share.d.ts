export const SHARE_V: 1;
export const SHARE_API: string;
export const SHARE_SITE: string;
export const INLINE_MAX: number;
export const SHARE_MAX_BYTES: number;
export const SHARE_PAGES: Readonly<Record<ShareFormat, string>>;

export type ShareFormat =
  | "netcomposer.synth"
  | "netcomposer.rhythm"
  | "netcomposer.bass"
  | "netcomposer.nyx"
  | "netcomposer.calliope";

export interface ShareEnvelope {
  v: 1;
  kind: "preset";
  format: ShareFormat;
  fv?: number;
  data: object;
  name?: string;
  by?: string;
  from?: string;
}

export type ShareLink = { kind: "inline"; code: string } | { kind: "short"; id: string };

export interface ShareOptions {
  site?: string;
  api?: string;
  fetch?: typeof fetch;
  inlineMax?: number;
}

export function isOurLink(text: unknown): boolean;
export function shareProblem(raw: unknown): string | null;
export function makeEnvelope(parts: {
  format: string;
  fv?: number;
  data: unknown;
  name?: string;
  by?: string;
  from?: string;
}): ShareEnvelope;
export function encodeInline(envelope: ShareEnvelope): Promise<string>;
export function decodeInline(code: string): Promise<ShareEnvelope | null>;
export function parseLinkHash(hash: string): ShareLink | null;
export function linkFor(envelope: ShareEnvelope, options?: ShareOptions): Promise<{ url: string; kind: "inline" | "short" }>;
export function readLink(
  hash: string,
  options?: Pick<ShareOptions, "api" | "fetch">,
): Promise<{ envelope: ShareEnvelope; link: ShareLink } | { error: string } | null>;
export function linkUrl(format: string, link: ShareLink, site?: string): string;
