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
