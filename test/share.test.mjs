import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeInline,
  encodeInline,
  INLINE_MAX,
  linkFor,
  linkUrl,
  makeEnvelope,
  parseLinkHash,
  readLink,
  SHARE_MAX_BYTES,
  SHARE_PAGES,
  shareProblem,
} from "../src/primitives/share.js";

/** Values that don't compress much (a fixed LCG). */
function scrambled(n) {
  let x = 12345;
  return Array.from({ length: n }, () => ((x = (x * 1103515245 + 12345) % 2147483648) >> 16) % 128);
}

const synth = () =>
  makeEnvelope({ format: "netcomposer.synth", fv: 3, data: { vco: { wave: "saw", detune: 0.3 }, vcf: { cutoff: 0.42 } }, name: " Glass pad ", by: "Peter" });

/** A fake Worker with the same contract as nc-performer's share.ts. */
function fakeApi() {
  const store = new Map();
  let n = 0;
  const f = async (url, init = {}) => {
    const u = new URL(url);
    if (init.method === "POST" && u.pathname === "/api/share") {
      const body = JSON.parse(init.body);
      if (shareProblem(body)) return new Response(JSON.stringify({ error: shareProblem(body) }), { status: 400 });
      const id = String(n++).padStart(10, "a");
      store.set(id, init.body);
      return new Response(JSON.stringify({ id }), { status: 201 });
    }
    const m = u.pathname.match(/^\/api\/share\/([0-9a-z]{10})$/);
    if (m && store.has(m[1])) return new Response(store.get(m[1]), { status: 200 });
    return new Response(JSON.stringify({ error: "This link doesn't exist." }), { status: 404 });
  };
  return { f, store };
}

test("makeEnvelope trims names, drops empty ones and refuses what can't travel", () => {
  const e = synth();
  assert.deepEqual(Object.keys(e), ["v", "kind", "format", "data", "fv", "name", "by"]);
  assert.equal(e.name, "Glass pad");
  assert.equal("name" in makeEnvelope({ format: "netcomposer.bass", data: {}, name: "  " }), false);
  assert.throws(() => makeEnvelope({ format: "netcomposer.lucy", data: {} }), /can't be shared/);
  assert.throws(() => makeEnvelope({ format: "netcomposer.nyx", data: null }), /empty/);
  assert.throws(() => makeEnvelope({ format: "netcomposer.nyx", data: {}, from: "https://evil.example/" }), /remix/);
});

test("an inline code round-trips and is URL-safe", async () => {
  const e = synth();
  const code = await encodeInline(e);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeInline(code), e);
});

test("broken, foreign or oversized codes decode to null", async () => {
  assert.equal(await decodeInline("not*base64"), null);
  assert.equal(await decodeInline("AAAA"), null);
  const lucy = await encodeInline({ v: 1, kind: "preset", format: "netcomposer.lucy", data: {} });
  assert.equal(await decodeInline(lucy), null);
  // A small code that inflates past the cap (a zip bomb) is refused while inflating.
  const bomb = await encodeInline({ v: 1, kind: "preset", format: "netcomposer.synth", data: { x: "a".repeat(SHARE_MAX_BYTES - 200) } });
  assert.ok(bomb.length < 2000);
  assert.ok(await decodeInline(bomb)); // just under the cap: fine
  const over = await encodeInline({ v: 1, kind: "preset", format: "netcomposer.synth", data: { x: "a".repeat(SHARE_MAX_BYTES - 10) } }).catch((e) => e);
  assert.ok(over instanceof Error); // over the cap: can't be made
});

test("parseLinkHash reads #p= and #s=, and ignores anything else", () => {
  assert.deepEqual(parseLinkHash("#p=abc_-9"), { kind: "inline", code: "abc_-9" });
  assert.deepEqual(parseLinkHash("#s=0123456789"), { kind: "short", id: "0123456789" });
  assert.equal(parseLinkHash("#s=../../x"), null);
  assert.equal(parseLinkHash("#s=ABCDEFGHIJ"), null);
  assert.equal(parseLinkHash(""), null);
  assert.equal(parseLinkHash("#help"), null);
});

test("a small preset gets an inline link on its instrument's page", async () => {
  const { f, store } = fakeApi();
  const { url, kind } = await linkFor(synth(), { fetch: f });
  assert.equal(kind, "inline");
  assert.ok(url.startsWith("https://netcomposer.art/synth/#p="));
  assert.equal(store.size, 0);
  const opened = await readLink(new URL(url).hash, { fetch: f });
  assert.deepEqual(opened.envelope, synth());
  assert.equal(linkUrl("netcomposer.synth", opened.link), url);
});

test("a large preset gets a short link that opens to the same envelope", async () => {
  const { f, store } = fakeApi();
  const big = makeEnvelope({ format: "netcomposer.nyx", data: { steps: scrambled(3000) } });
  const { url, kind } = await linkFor(big, { fetch: f });
  assert.equal(kind, "short");
  assert.match(url, /^https:\/\/netcomposer\.art\/nyx\/#s=[0-9a-z]{10}$/);
  assert.equal(store.size, 1);
  const opened = await readLink(new URL(url).hash, { fetch: f });
  assert.deepEqual(opened.envelope, big);
  assert.equal(linkUrl("netcomposer.nyx", opened.link), url);
  assert.ok((await encodeInline(big)).length > INLINE_MAX);
});

test("every shareable format has a page", () => {
  assert.deepEqual(Object.keys(SHARE_PAGES).sort(), [
    "netcomposer.bass",
    "netcomposer.calliope",
    "netcomposer.nyx",
    "netcomposer.rhythm",
    "netcomposer.synth",
  ]);
});

test("readLink says why a link can't be opened, and null for no link", async () => {
  const { f } = fakeApi();
  assert.equal(await readLink("", { fetch: f }), null);
  assert.deepEqual(await readLink("#s=zzzzzzzzzz", { fetch: f }), { error: "This link doesn't exist." });
  assert.deepEqual(await readLink("#p=AAAA", { fetch: f }), { error: "This link is broken." });
  const offline = async () => {
    throw new TypeError("network");
  };
  assert.match((await readLink("#s=zzzzzzzzzz", { fetch: offline })).error, /connection/);
  await assert.rejects(
    linkFor(makeEnvelope({ format: "netcomposer.nyx", data: { s: "x".repeat(5000) + Math.random() } }), { fetch: offline, inlineMax: 10 }),
    /connection/,
  );
});
