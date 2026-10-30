// guard-app: an app's raw colours, fonts and px may only go down.
import assert from "node:assert/strict";
import { test } from "node:test";
import { compare, rawValues } from "../scripts/guard-app.mjs";

const kinds = (text, file) => rawValues(text, file).map((r) => `${r.kind} ${r.match}`);

test("CSS: colours, fonts and px count; tokens, fallbacks, 0, media queries and allowed lines don't", () => {
  const css = `
.a { color: #003153; padding: 12px var(--nc-ui-space-4); font-family: "Inter", sans-serif; }
.b { color: var(--nc-ui-text); margin: 0px; width: var(--nc-ui-x, 44px); background: var(--c, rgb(1, 2, 3)); }
@media (min-width: 768px) { .c { gap: var(--nc-ui-space-8); } }
.d { border: 1px solid red; } /* 3px in a comment */
.e { height: 20px; } /* ui-guard: allow canvas size */
.f { font-family: var(--nc-ui-font-ui); }`;
  assert.deepEqual(kinds(css, "a.css"), ["colour #003153", 'font font-family: "Inter", sans-serif', "px 12px", "px 1px"]);
});

test("scripts: style strings, style objects and Tailwind arbitrary values count; other code doesn't", () => {
  const ts = `
const id = "#main";
el.style.cssText = "color: #ff0000; width: 10px";
const s = { color: "rgb(0, 0, 0)" };
<div className="text-[11px] bg-[#003153] text-[length:var(--nc-ui-font-size-xs)]" />;
const n = 12;`;
  assert.deepEqual(kinds(ts, "a.tsx").sort(), ["colour #ff0000", "colour rgb(0, 0, 0)", "px 10px", "tailwind [#003153]", "tailwind [11px]"].sort());
});

test("the ratchet: a file may go down, never up, and a new file starts at zero", () => {
  assert.deepEqual(compare({ "a.css": 3, "b.css": 5 }, { "a.css": 4, "b.css": 5 }), []);
  assert.deepEqual(compare({ "a.css": 5 }, { "a.css": 4 }), [{ file: "a.css", now: 5, was: 4 }]);
  assert.deepEqual(compare({ "new.css": 1 }, {}), [{ file: "new.css", now: 1, was: 0 }]);
});
