// velocityFill: an on step's fill is its velocity (Peter, via Zeta). nc-ui was created by Peter Semmelhack
// (https://psem.me/). MIT License.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tokens.js';
import { contrastRatio, relativeLuminance, velocityFill, velocityFillStyle, VELOCITY_RANGE, VELOCITY_RAMP, hexToOklab } from '../src/color.js';

const r = T.component.rhythm, s = T.semantic, c = T.base.color;
const grid = Array.from({ length: 20 }, (_, i) => +(0.05 + i * 0.05).toFixed(2)); // 0.05 … 1.00
const fine = Array.from({ length: 96 }, (_, i) => +(0.05 + i * 0.01).toFixed(2)); // 0.05 … 1.00 by 1 %

test('ramp ends come from the tokens: 1.0 = #003153 (rhythm.velocity-max = the accent), 0.05 = rhythm.velocity-min', () => {
  assert.deepEqual(VELOCITY_RANGE, [0.05, 1]);
  assert.equal(r['velocity-max'], '#003153');
  assert.equal(r['velocity-max'], c.accent);
  assert.equal(VELOCITY_RAMP.max, r['velocity-max']);
  assert.equal(VELOCITY_RAMP.min, r['velocity-min']);
  assert.equal(velocityFill(1).fill, '#003153');
  assert.equal(velocityFill(0.05).fill, r['velocity-min'].toUpperCase());
  assert.deepEqual(velocityFill(1), { velocity: 1, t: 1, fill: '#003153', ink: r['step-cell-ink'] });
  assert.deepEqual(velocityFill(0.05), { velocity: 0.05, t: 0, fill: r['velocity-min'].toUpperCase(), ink: r['step-cell-ink'] });
});

test('clamps outside 0.05..1; non-numbers count as the quietest', () => {
  for (const v of [0, 0.01, 0.049, -3]) assert.deepEqual(velocityFill(v), velocityFill(0.05), `v=${v}`);
  for (const v of [1.0001, 2, 127]) assert.deepEqual(velocityFill(v), velocityFill(1), `v=${v}`);
  for (const v of [Number.NaN, Number.POSITIVE_INFINITY, undefined, null, '0.8']) assert.deepEqual(velocityFill(v), velocityFill(0.05), `v=${v}`);
});

test('monotonic: a louder step is a darker fill; strictly at 5 % steps, never lighter at 1 % steps (8-bit #RRGGBB)', () => {
  const lum = (v) => relativeLuminance(velocityFill(v).fill);
  const L = (v) => hexToOklab(velocityFill(v).fill)[0];
  for (let i = 1; i < grid.length; i++) {
    assert.ok(lum(grid[i]) < lum(grid[i - 1]), `${grid[i]} (${velocityFill(grid[i]).fill}) is not darker than ${grid[i - 1]} (${velocityFill(grid[i - 1]).fill})`);
    assert.ok(L(grid[i]) < L(grid[i - 1]), `OKLab L ${grid[i]} vs ${grid[i - 1]}`);
  }
  for (let i = 1; i < fine.length; i++) assert.ok(lum(fine[i]) <= lum(fine[i - 1]), `${fine[i]} is lighter than ${fine[i - 1]}`);
  const mid = (L(0.05) + L(1)) / 2;
  assert.ok(Math.abs(L(0.525) - mid) < 0.004, `midpoint lightness ${L(0.525)} vs ${mid}`);
});

test('one hue: every fill keeps the accent\'s OKLCH hue (within 1.5°)', () => {
  const hue = (hex) => { const [, a, b] = hexToOklab(hex); return (Math.atan2(b, a) * 180) / Math.PI; };
  const h0 = hue(c.accent);
  for (const v of grid) assert.ok(Math.abs(hue(velocityFill(v).fill) - h0) <= 1.5, `v=${v} hue ${hue(velocityFill(v).fill)} vs ${h0}`);
});

test('contrast floor: the 5 % shade is >= 3:1 against an empty step (paper), the selected-row tint and module shades 1-4', () => {
  const low = velocityFill(0.05).fill;
  const bgs = [['paper (step-cell-off)', r['step-cell-off']], ['accent-tint', s['accent-tint']], ...[1, 2, 3, 4].map((n) => [`module-bg-stack-${n}`, s[`module-bg-stack-${n}`]])];
  assert.equal(r['step-cell-off'], c.paper);
  for (const [name, bg] of bgs) for (const v of grid) {
    const ratio = contrastRatio(velocityFill(v).fill, bg);
    assert.ok(ratio >= 3, `v=${v} on ${name}: ${velocityFill(v).fill} / ${bg} = ${ratio.toFixed(2)}`);
  }
  assert.ok(contrastRatio(low, c.paper) >= 3);
  assert.ok(contrastRatio(low, s['accent-tint']) >= 3);
});

test('marks on the fill: step ink and the accent mark (paper) are >= 4.5:1 on every fill', () => {
  assert.equal(r['accent-mark'], c.paper);
  for (const v of fine) {
    const { fill, ink } = velocityFill(v);
    assert.equal(ink, r['step-cell-ink']);
    assert.ok(contrastRatio(ink, fill) >= 4.5, `ink on v=${v}: ${contrastRatio(ink, fill).toFixed(2)}`);
    assert.ok(contrastRatio(r['accent-mark'], fill) >= 4.5, `accent mark on v=${v}: ${contrastRatio(r['accent-mark'], fill).toFixed(2)}`);
  }
});

test('playhead ring: >= 3:1 against the hairline of page or tint that separates it from the step', () => {
  for (const bg of [r['step-cell-off'], s['accent-tint'], ...[1, 2, 3, 4].map((n) => s[`module-bg-stack-${n}`])])
    assert.ok(contrastRatio(r.playhead, bg) >= 3, `ring on ${bg}: ${contrastRatio(r.playhead, bg).toFixed(2)}`);
});

test('JSON in, JSON out; velocityFillStyle sets the runtime velocity-fill token', () => {
  const out = velocityFill(0.8);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), out);
  assert.deepEqual(Object.keys(out), ['velocity', 't', 'fill', 'ink']);
  assert.match(out.fill, /^#[0-9A-F]{6}$/);
  assert.deepEqual(velocityFillStyle(0.8), { '--nc-ui-velocity-fill': out.fill });
  assert.equal(T.runtime['velocity-fill'], c['accent-pad']);
  // A custom ramp (Bass may bring its own ends).
  assert.equal(velocityFill(1, { min: '#ffffff', max: '#000000' }).fill, '#000000');
  assert.equal(velocityFill(0.05, { min: '#ffffff', max: '#000000' }).fill, '#FFFFFF');
});
