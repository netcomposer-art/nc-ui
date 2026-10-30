// The live kit: one nc-ui served by the site at /nc-ui/, bundled copies in a fallback layer that always loses to it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Writable } from "node:stream";
import { test } from "node:test";
import { FALLBACK_LAYER, LIVE_BASE, ncUiLive } from "../vite.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the bundled fallback is nc-ui.css inside the nc-ui-fallback layer; the live sheet is unlayered", () => {
  const live = read("dist/nc-ui.css");
  const fallback = read("dist/nc-ui.fallback.css");
  assert.doesNotMatch(live, /@layer/, "the live sheet must stay unlayered so it beats every fallback");
  assert.match(fallback, new RegExp(`@layer ${FALLBACK_LAYER} \\{`));
  assert.ok(fallback.includes(live.slice(live.indexOf("\n") + 1, live.indexOf("\n") + 2000)), "same rules as the live sheet");
  assert.doesNotMatch(live, /@import|@charset/, "nothing that cannot sit inside @layer");
});

test("installTheme puts the JS-injected kit in the fallback layer", async () => {
  const { installDom } = await import("./helpers/dom.mjs");
  const { document } = installDom();
  const { installTheme } = await import("../src/primitives/install.js");
  installTheme(document);
  const text = document.head.querySelector("style[data-nc-kit]").textContent;
  assert.ok(text.startsWith(`@layer ${FALLBACK_LAYER} {`));
  assert.match(text, /\.nc-module \{/);
});

test("the Vite plugin links /nc-ui/nc-ui.css last in <head> and serves /nc-ui/ from dist in dev and preview", async () => {
  const plugin = ncUiLive();
  assert.equal(LIVE_BASE, "/nc-ui/");
  const [tag] = plugin.transformIndexHtml.handler();
  assert.deepEqual(tag, { tag: "link", attrs: { rel: "stylesheet", href: "/nc-ui/nc-ui.css", "data-nc-ui-live": "" }, injectTo: "head" });
  assert.equal(plugin.transformIndexHtml.order, "post");
  const served = [];
  const server = { middlewares: { use: (fn) => served.push(fn) } };
  plugin.configureServer(server);
  plugin.configurePreviewServer(server);
  assert.equal(served.length, 2);
  const body = await new Promise((done) => {
    const chunks = [];
    const headers = {};
    const res = new Writable({ write(c, _e, cb) { chunks.push(c); cb(); } });
    res.setHeader = (k, v) => { headers[k] = v; };
    res.on("finish", () => done({ text: Buffer.concat(chunks).toString(), headers }));
    served[0]({ url: "/nc-ui/tokens.css?v=1" }, res, () => done(null));
  });
  assert.ok(body, "served");
  assert.match(body.text, /--nc-ui-accent:/);
  assert.equal(body.headers["content-type"], "text/css; charset=utf-8");
  let passed = false;
  served[0]({ url: "/nc-ui/../package.json" }, {}, () => { passed = true; });
  assert.ok(passed, "no path escapes dist");
  passed = false;
  served[0]({ url: "/rhythm/" }, {}, () => { passed = true; });
  assert.ok(passed, "other paths pass through");
});
