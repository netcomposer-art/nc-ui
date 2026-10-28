import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { outputs, tailwindTheme } from "../scripts/build-dist.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("dist is built and committed (vendor at a pinned sha, no build step)", async () => {
  const files = await outputs();
  for (const [path, text] of Object.entries(files)) assert.equal(read(path), text, `${path} is stale: npm run build`);
});

test("nc-ui.css is tokens + kit + confirm; the bundle exports the kit", async () => {
  const css = read("dist/nc-ui.css");
  assert.match(css, /--nc-ui-target-min: var\(--nc-ui-space-44\)/);
  assert.match(css, /--nc-ui-color-accent: #003153/);
  assert.match(css, /\.nc-ui-switch \{/);
  assert.match(css, /\.nc-ui-confirm/);
  assert.doesNotMatch(css, /--nc-rhythm-(module-gap|control-gap|header-gap|head-margin|name-width|slider-block|hack-weight|menu-item-min|probability-dim)\b/);
  assert.doesNotMatch(css, /--nc-ui-(disabled-opacity|control-disabled-opacity|dialog-button-min)\b/);
  const mod = await import("../dist/nc-ui.min.js");
  for (const name of ["defineModule", "renderGallery", "createSwitch", "createSlider", "sliderFactory", "confirm", "createToast", "openStepEditor", "semantic"])
    assert.ok(name in mod, name);
  assert.equal(mod.semantic.accent, "#003153");
});

test("S2: the Tailwind preset and theme only reference tokens", () => {
  const theme = tailwindTheme();
  let n = 0;
  for (const group of Object.values(theme))
    for (const value of Object.values(group)) {
      assert.match(value, /^var\(--nc-ui-[a-z0-9-]+\)$/);
      n++;
    }
  assert.ok(n > 100, `${n} theme values`);
  assert.equal(theme.colors["nc-accent"], "var(--nc-ui-accent)");
  assert.equal(theme.minHeight["nc-target-min"], "var(--nc-ui-target-min)");
  const decls = read("dist/tailwind-theme.css").match(/^  --[\w-]+: .+;$/gm);
  assert.ok(decls.length > 100);
  for (const d of decls) assert.match(d, /^  --[\w-]+: var\(--nc-ui-[a-z0-9-]+\);$/);
});
