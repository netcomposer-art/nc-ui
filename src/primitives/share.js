// nc-ui share: instrument links (specs/instrument-links.md; Peter, 2026-11-25: "unlisted for now, use netcomposer.art").
//
// One instrument's Preset (what its own Save writes, as the Studio's Preset providers hand it over) travels as a
// share envelope: { v: 1, kind: "preset", format, fv?, data, name?, by?, from?, category?, tags? }. `category` and
// `tags` (2026-11-25) come with the preset library (presets.js): optional, additive, ignored by older readers.
//   - Inline link:  https://netcomposer.art/synth/#p=<deflate + base64url of the envelope's JSON>
//     The hash never reaches a server.
//   - Short link:   https://netcomposer.art/synth/#s=<id>
//     For an envelope too long to inline; stored unlisted by the Worker (POST /api/share, GET /api/share/<id>).
// Settings only: audio never travels in a link. The Worker checks the same rules (nc-performer
// service/worker/src/share.ts); keep the two in step.
// Self-contained (no imports). nc-ui was created by Peter Semmelhack (https://psem.me/). MIT License.

export const SHARE_V = 1;
export const SHARE_API = "https://nc-perform-api.psemme.workers.dev";
export const SHARE_SITE = "https://netcomposer.art";
/** Longest inline code (characters after #p=) before a short link is used. */
export const INLINE_MAX = 2000;
/** Largest envelope JSON either kind of link carries (bytes), as the Worker's cap. */
export const SHARE_MAX_BYTES = 128 * 1024;

/** Each shareable Preset format and the page that opens it. */
export const SHARE_PAGES = Object.freeze({
  "netcomposer.synth": "/synth/",
  "netcomposer.rhythm": "/rhythm/",
  "netcomposer.bass": "/bass/",
  "netcomposer.nyx": "/nyx/",
  "netcomposer.calliope": "/calliope/",
});

const NAME_MAX = 80;
const BY_MAX = 40;
const CATEGORY_MAX = 32;
const TAGS_MAX = 8;
const TAG_MAX = 24;
const ID = /^[0-9a-z]{10}$/;

/** The site's hosts: netcomposer.art now, triki.art later (Peter, 2026-11-25), so a move changes only SHARE_SITE. */
export const SHARE_HOSTS = Object.freeze(["netcomposer.art", "triki.art"]);

/** A link this site made (https://netcomposer.art/... or https://triki.art/..., at most 4 KB). */
export function isOurLink(text) {
  if (typeof text !== "string" || text.length > 4096) return false;
  try {
    const u = new URL(text);
    return u.protocol === "https:" && SHARE_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

/** The problem with an envelope, in a short sentence, or null when it can travel. */
export function shareProblem(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "A link needs an object.";
  const e = raw;
  if (e.v !== SHARE_V) return "Unknown link version.";
  if (e.kind !== "preset") return "Only presets can be shared.";
  if (typeof e.format !== "string" || !Object.hasOwn(SHARE_PAGES, e.format)) return "That instrument can't be shared yet.";
  if (!("data" in e) || e.data === null || typeof e.data !== "object") return "The preset is empty.";
  if (e.fv !== undefined && (typeof e.fv !== "number" || !Number.isFinite(e.fv))) return "Bad format version.";
  if (e.name !== undefined && (typeof e.name !== "string" || e.name.length > NAME_MAX)) return "The name is too long.";
  if (e.by !== undefined && (typeof e.by !== "string" || e.by.length > BY_MAX)) return "The author name is too long.";
  if (e.from !== undefined && !isOurLink(e.from)) return "Bad remix link.";
  if (e.category !== undefined && (typeof e.category !== "string" || !e.category || e.category.length > CATEGORY_MAX))
    return "Bad category.";
  if (
    e.tags !== undefined &&
    (!Array.isArray(e.tags) || e.tags.length > TAGS_MAX || !e.tags.every((t) => typeof t === "string" && t.length > 0 && t.length <= TAG_MAX))
  )
    return "Bad tags.";
  return null;
}

/**
 * An envelope from a Preset provider's answer. `name` and `by` are trimmed and left out when empty; `from` is the
 * link this one was opened from (a remix), when there was one. Throws with shareProblem's sentence.
 */
export function makeEnvelope({ format, fv, data, name, by, from, category, tags }) {
  const e = { v: SHARE_V, kind: "preset", format, data };
  if (typeof fv === "number") e.fv = fv;
  const n = typeof name === "string" ? name.trim() : "";
  if (n) e.name = n;
  const b = typeof by === "string" ? by.trim() : "";
  if (b) e.by = b;
  if (from) e.from = from;
  if (typeof category === "string" && category.trim()) e.category = category.trim();
  if (Array.isArray(tags) && tags.length) e.tags = tags;
  const problem = shareProblem(e);
  if (problem) throw new Error(problem);
  return e;
}

function toBase64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(text) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes, stream, max) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error("This link is too large.");
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** The inline code for an envelope (deflate, then base64url). */
export async function encodeInline(envelope) {
  const json = new TextEncoder().encode(JSON.stringify(envelope));
  if (json.length > SHARE_MAX_BYTES) throw new Error("This preset is too large to share.");
  return toBase64url(await pipe(json, new CompressionStream("deflate"), SHARE_MAX_BYTES * 2));
}

/** The envelope in an inline code, or null when the code is broken, too large or breaks the rules. */
export async function decodeInline(code) {
  try {
    if (typeof code !== "string" || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    const json = await pipe(fromBase64url(code), new DecompressionStream("deflate"), SHARE_MAX_BYTES);
    const e = JSON.parse(new TextDecoder().decode(json));
    return shareProblem(e) ? null : e;
  } catch {
    return null;
  }
}

/** What a page's hash says: { kind: "inline", code } | { kind: "short", id } | null (no link). */
export function parseLinkHash(hash) {
  const h = String(hash || "").replace(/^#/, "");
  const params = new URLSearchParams(h);
  const code = params.get("p");
  if (code) return { kind: "inline", code };
  const id = params.get("s");
  if (id && ID.test(id)) return { kind: "short", id };
  return null;
}

/**
 * A link for an envelope: inline when its code fits in `inlineMax`, else a short link from the Worker.
 * Resolves { url, kind }. Rejects with a short sentence when the Worker refuses or can't be reached.
 */
export async function linkFor(envelope, { site = SHARE_SITE, api = SHARE_API, fetch: f = globalThis.fetch, inlineMax = INLINE_MAX } = {}) {
  const problem = shareProblem(envelope);
  if (problem) throw new Error(problem);
  const page = site + SHARE_PAGES[envelope.format];
  const code = await encodeInline(envelope);
  if (code.length <= inlineMax) return { url: `${page}#p=${code}`, kind: "inline" };
  let res;
  try {
    res = await f(`${api}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
  } catch {
    throw new Error("Couldn't reach the link service. Check your connection.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !ID.test(body.id || "")) throw new Error(body.error || "The link service refused this preset.");
  return { url: `${page}#s=${body.id}`, kind: "short" };
}

/**
 * The envelope a page was opened with. Resolves { envelope, link } (link: the hash it came from, as parseLinkHash
 * gave it), null when the hash holds no link, or { error } with a short sentence when the link can't be opened.
 */
export async function readLink(hash, { api = SHARE_API, fetch: f = globalThis.fetch } = {}) {
  const link = parseLinkHash(hash);
  if (!link) return null;
  if (link.kind === "inline") {
    const envelope = await decodeInline(link.code);
    return envelope ? { envelope, link } : { error: "This link is broken." };
  }
  let res;
  try {
    res = await f(`${api}/api/share/${link.id}`);
  } catch {
    return { error: "Couldn't reach the link service. Check your connection." };
  }
  if (res.status === 404) return { error: "This link doesn't exist." };
  if (!res.ok) return { error: "Couldn't open this link." };
  const envelope = await res.json().catch(() => null);
  return envelope && !shareProblem(envelope) ? { envelope, link } : { error: "This link is broken." };
}

/** The canonical link for what a page was opened with, for a remix's `from`. */
export function linkUrl(format, link, site = SHARE_SITE) {
  const page = site + (SHARE_PAGES[format] || "/");
  return link.kind === "inline" ? `${page}#p=${link.code}` : `${page}#s=${link.id}`;
}
