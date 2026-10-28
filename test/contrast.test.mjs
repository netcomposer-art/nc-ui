import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio, labelColorFor, surpriseColor, slotColors, hexToHsl, surpriseFillStyle, INK_DARK, INK_LIGHT, MIN_LABEL_CONTRAST } from '../src/color.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/astrid-surprise.json', import.meta.url), 'utf8'));
const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

test('label inks come from the tokens', () => {
  assert.equal(INK_DARK, '#1f2421'); assert.equal(INK_LIGHT, '#FFFFFF'); assert.equal(MIN_LABEL_CONTRAST, 4.5);
});

test('WCAG contrast: known values', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
  assert.equal(contrastRatio('#123456', '#abcdef'), contrastRatio('#abcdef', '#123456'));
});

test('contrast and label pick match ASTRID exactly (fixture from surprise.ts)', () => {
  for (const c of fx.contrast) assert.equal(contrastRatio(c.a, c.b), c.ratio, `${c.a}/${c.b}`);
  for (const l of fx.labels) assert.equal(labelColorFor(l.fill).toLowerCase(), l.label.toLowerCase(), l.fill);
});

test('surpriseColor and slotColors reproduce ASTRID for 200 seeds x 5 rolls', () => {
  for (const c of fx.cases) {
    const r = rng(c.seed); let prev = c.start;
    for (const want of c.colors) {
      prev = surpriseColor(prev, r);
      const got = slotColors(prev);
      assert.equal(prev, want.fill, `seed ${c.seed}`);
      assert.equal(got.ink.toLowerCase(), want.ink.toLowerCase());
      assert.equal(got.on, want.on);
      assert.equal(got.onInk.toLowerCase(), want.onInk.toLowerCase());
    }
  }
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
