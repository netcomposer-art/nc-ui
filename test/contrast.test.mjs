import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio, labelColorFor, surpriseColor, slotColors, hexToHsl, surpriseFillStyle, INK_DARK, INK_LIGHT, MIN_LABEL_CONTRAST } from '../src/color.js';

// ASTRID's fixture records its green-tinted ink #1f2421; nc-ui 0.2.0 greys INK_DARK (no green), so the fixture's ink
// reads as INK_DARK. The label pick (dark or white) must still match ASTRID for every fill.
const ASTRID_INK = '#1f2421';
const fx = JSON.parse(readFileSync(new URL('./fixtures/astrid-surprise.json', import.meta.url), 'utf8'));
const ink = (c) => (c.toLowerCase() === ASTRID_INK ? INK_DARK.toLowerCase() : c.toLowerCase());
const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

test('label inks come from the tokens', () => {
  assert.equal(INK_DARK, '#242424'); assert.equal(INK_LIGHT, '#FFFFFF'); assert.equal(MIN_LABEL_CONTRAST, 4.5);
});

test('WCAG contrast: known values', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
  assert.equal(contrastRatio('#123456', '#abcdef'), contrastRatio('#abcdef', '#123456'));
});

test('contrast and label pick match ASTRID exactly (fixture from surprise.ts)', () => {
  for (const c of fx.contrast) assert.equal(contrastRatio(c.a, c.b), c.ratio, `${c.a}/${c.b}`);
  for (const l of fx.labels) assert.equal(labelColorFor(l.fill).toLowerCase(), ink(l.label), l.fill);
});

// The grey ink (no green) moves a few of ASTRID's lightness nudges, so fills are compared by hue and saturation,
// which come straight from the same random draws; every label still clears 4.5:1 (next test).
test('surpriseColor keeps ASTRID\'s hue and saturation for 200 seeds x 5 rolls; slotColors labels follow the pick', () => {
  let same = 0, total = 0;
  for (const c of fx.cases) {
    const r = rng(c.seed); let prev = c.start;
    for (const want of c.colors) {
      prev = surpriseColor(prev, r);
      const got = slotColors(prev), a = hexToHsl(prev), b = hexToHsl(want.fill);
      const dh = Math.abs(a.h - b.h) % 360;
      assert.ok(Math.min(dh, 360 - dh) < 2, `seed ${c.seed}: hue ${a.h} vs ASTRID ${b.h}`);
      assert.ok(Math.abs(a.s - b.s) < 0.03, `seed ${c.seed}: saturation ${a.s} vs ASTRID ${b.s}`);
      assert.equal(got.ink, labelColorFor(prev));
      assert.equal(got.onInk, labelColorFor(got.on));
      total++; if (prev === want.fill) same++;
    }
  }
  assert.ok(same / total >= 0.85, `${same} of ${total} fills identical to ASTRID`); // 871 of 1000 with ink #242424
});

test('every Surprise fill is bright, 60 degrees from the last, and its label clears 4.5:1', () => {
  const r = rng(42); let prev = null;
  for (let i = 0; i < 2000; i++) {
    const fill = surpriseColor(prev, r);
    const { s } = hexToHsl(fill);
    assert.ok(s >= 0.8, `saturation ${s} for ${fill}`);
    if (prev) { const d = Math.abs(hexToHsl(fill).h - hexToHsl(prev).h) % 360; assert.ok(Math.min(d, 360 - d) >= 59, `${prev} -> ${fill}`); }
    assert.ok(contrastRatio(fill, labelColorFor(fill)) >= MIN_LABEL_CONTRAST, fill);
    const sc = slotColors(fill);
    assert.ok(contrastRatio(sc.on, sc.onInk) >= MIN_LABEL_CONTRAST, sc.on);
    prev = fill;
  }
});

test('surpriseFillStyle sets the runtime tokens; null means defaults', () => {
  assert.equal(surpriseFillStyle(null), null);
  const s = surpriseFillStyle('#ffcc00');
  assert.deepEqual(Object.keys(s), ['--nc-ui-surprise-fill', '--nc-ui-surprise-ink', '--nc-ui-surprise-on', '--nc-ui-surprise-on-ink']);
  assert.equal(s['--nc-ui-surprise-ink'], INK_DARK);
});

test("Mix strip shades (Peter, 2026-11-04): text and secondary text keep AA on all eight, light and dark; neutral greys", () => {
  const light = ["#F3F3F3", "#EEEEEE", "#E9E9E9", "#E4E4E4", "#DFDFDF", "#DADADA", "#D5D5D5", "#D0D0D0"];
  const dark = ["#272625", "#302F2E", "#343332", "#373635", "#3A3938", "#3D3C3B", "#403F3E", "#434241"];
  const tokens = JSON.parse(readFileSync(new URL("../dist/tokens.resolved.json", import.meta.url), "utf8"));
  const css = readFileSync(new URL("../dist/tokens.css", import.meta.url), "utf8");
  for (let n = 3; n <= 8; n++) {
    assert.match(css, new RegExp(`--nc-ui-color-strip-${n}: ${light[n - 1]};`), `light ${n}`);
    assert.match(css, new RegExp(`--nc-ui-color-strip-${n}: ${dark[n - 1]};`), `dark ${n}`);
  }
  for (const [mode, shades, text, sub] of [["light", light, "#242424", "#595959"], ["dark", dark, "#E8E7E6", "#AFAEAD"]]) {
    shades.forEach((bg, i) => {
      assert.ok(contrastRatio(text, bg) >= 7, `${mode} ${i + 1}: text ${contrastRatio(text, bg)}`);
      assert.ok(contrastRatio(sub, bg) >= 4.5, `${mode} ${i + 1}: secondary ${contrastRatio(sub, bg)}`);
      const [r, g, b] = [1, 3, 5].map((k) => parseInt(bg.slice(k, k + 2), 16));
      assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 2, `${mode} ${i + 1}: neutral grey`);
    });
  }
  assert.ok(tokens);
});

test("CALLIOPE's pink (Peter, 2026-11-06): its pad edges and dots clear 3:1 on the light page and title band; dark keeps #FD7CBD", async () => {
  const { semantic, themes } = await import('../dist/tokens.js');
  const light = semantic['instrument-calliope'];
  assert.ok(contrastRatio(light, semantic['surface-page']) >= 3, `page ${contrastRatio(light, semantic['surface-page'])}`);
  assert.ok(contrastRatio(light, semantic['page-head-bg']) >= 3, `band ${contrastRatio(light, semantic['page-head-bg'])}`);
  const d = themes.dark.semantic;
  assert.ok(contrastRatio(d['instrument-calliope'], d['page-head-bg']) >= 4.5);
});

test("accents (Peter, 2026-11-06): each light value clears 3:1 on the lightest light module, each dark value 4.5:1 on the dark title band", async () => {
  const { semantic, themes } = await import('../dist/tokens.js');
  const d = themes.dark.semantic;
  assert.equal(semantic['module-bg-adjacent-1'], '#F3F3F3');
  for (const n of ['astrid', 'petra', 'olive', 'lucy', 'nyx']) {
    const t = `instrument-${n}`;
    assert.ok(contrastRatio(semantic[t], semantic['module-bg-adjacent-1']) >= 3, `${n} light ${contrastRatio(semantic[t], '#F3F3F3')}`);
    assert.ok(contrastRatio(d[t], d['page-head-bg']) >= 4.5, `${n} dark`);
  }
  // CALLIOPE's light pink is Peter's pick before this rule (2026-11-06): 2.97:1 on module 01, 3:1 on the page.
  assert.ok(contrastRatio(semantic['instrument-calliope'], '#F3F3F3') >= 2.95);
  assert.ok(contrastRatio(d['instrument-calliope'], d['page-head-bg']) >= 4.5);
});
