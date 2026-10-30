import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { findDomainVar, findGreen, findLiteral44, findOpacityDim, isGreen, lintRepo, lintText, rgbOf } from "../scripts/lint-ui.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("the repo passes lint:ui", () => {
  const { errors, files } = lintRepo(root);
  assert.deepEqual(errors, []);
  assert.ok(files > 20, `${files} files read`);
});

test("green: Bass's cases fail (old accent, filter-green, grey-green neutrals), greys and the accent pass", () => {
  for (const g of ["#426C61", "#3D8A55", "#202523", "#F5F5F2", "#1f2421", "#6E7A3C", "#0f0", "rgb(0 128 0)", "rgba(61,138,85,.5)", "hsl(120 40% 50%)", "hsl(156, 7%, 14%)"])
    assert.ok(isGreen(rgbOf(g)), g);
  for (const ok of ["#003153", "#242424", "#F5F5F5", "#FFFFFF", "#A04A3F", "#9A6B34", "#56688C", "#774A84", "rgb(0 0 0 / .2)", "hsl(0 0% 50%)"])
    assert.ok(!isGreen(rgbOf(ok)), ok);
});

test("green: oklch and oklab literals are converted to sRGB", () => {
  assert.ok(isGreen(rgbOf("oklch(0.7 0.15 145)")), "oklch green");
  assert.ok(isGreen(rgbOf("oklab(0.6 -0.1 0.05)")), "oklab green");
  assert.ok(!isGreen(rgbOf("oklch(0.3 0.08 250)")), "oklch blue");
  assert.ok(!isGreen(rgbOf("oklch(0.5 0 0)")), "oklch grey");
  assert.equal(rgbOf("oklch(var(--l) 0.1 140)"), null);
});

test("green: named colours as CSS or token values fail; token names containing them do not", () => {
  assert.equal(findGreen(".a { color: green; }").length, 1);
  assert.equal(findGreen(".a { background: var(--x) lime; }").length, 1);
  assert.equal(findGreen('"value": "olive"').length, 1);
  assert.equal(findGreen('"plum": { "note": "replaces the old olive, which was green" }').length, 0);
  assert.equal(findGreen("const greenRoom = 1;").length, 0);
  assert.deepEqual(findGreen("a\n.b { border-color: #3D8A55 }").map((f) => f.line), [2]);
});

test("opacity dimming fails; 0/1 fades pass", () => {
  assert.equal(findOpacityDim(".a:disabled { opacity: .35; }").length, 1);
  assert.equal(findOpacityDim(".a { opacity: ${v(\"disabled-opacity\")}; }").length, 1);
  assert.equal(findOpacityDim(".a { opacity: var(--nc-ui-opacity-55) }").length, 1);
  assert.equal(findOpacityDim(".a { filter: grayscale(1) opacity(.5); }").length, 1);
  assert.equal(findOpacityDim("el.style.opacity = '0.4';").length, 1);
  assert.equal(findOpacityDim(".t { opacity: 0; transition: opacity .2s; } .t[open] { opacity: 1; }").length, 0);
  assert.equal(findOpacityDim(".t { opacity: 1 !important; }").length, 0);
});

test("literal 44px fails, except as target-min's own fallback", () => {
  assert.equal(findLiteral44(".a { min-height: 44px; }").length, 1);
  assert.equal(findLiteral44(".a { width: calc(44px + 2px); }").length, 1);
  assert.equal(findLiteral44(".a { min-height: var(--nc-ui-target-min, 44px); }").length, 0);
  assert.equal(findLiteral44(".a { min-height: var(--nc-ui-target-min-coarse, 44px); }").length, 0);
  assert.equal(findLiteral44(".a { min-height: var(--nc-ui-other, 44px); }").length, 1);
  assert.equal(findLiteral44(".a { width: 144px; }").length, 0);
});

test("another instrument's domain variable in shared code fails", () => {
  assert.equal(findDomainVar(".sw[aria-checked=true] { color: var(--nc-bass-accent); }").length, 1);
  assert.equal(findDomainVar("var(--nc-ui-accent)").length, 0);
});

test("lintText picks the checks by kind", () => {
  const css = ".a { opacity: .4; min-height: 44px; color: #426C61; }";
  assert.deepEqual(lintText(css, "source").map((f) => f.rule).sort(), ["green", "literal-44px", "opacity-dim"]);
  assert.deepEqual(lintText(css, "tokens").map((f) => f.rule), ["green"]);
  assert.deepEqual(lintText(css, "build").map((f) => f.rule).sort(), ["green", "opacity-dim"]);
});

test("a green colour name inside an identifier (instrument-olive, --nc-x-teal) is not a colour", async () => {
  const { findGreen } = await import("../scripts/lint-ui.mjs");
  assert.equal(findGreen("color: var(--nc-ui-instrument-olive);").length, 0);
  assert.equal(findGreen("color: olive;").length, 1);
});
