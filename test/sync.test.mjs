// CSS and TS/JS exports must say the same thing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from '../dist/tokens.js';

const css = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');
const ts = readFileSync(new URL('../src/tokens.ts', import.meta.url), 'utf8');
const declared = (text) => Object.fromEntries([...text.matchAll(/^\s+(--[\w-]+):\s*(.+);$/gm)].map((m) => [m[1], m[2]]));
// The light :root block; the dark blocks follow it (see the dark test below).
const darkAt = css.indexOf(':root[data-nc-theme="dark"]');
let vars = declared(darkAt > 0 ? css.slice(0, darkAt) : css);
// color-mix(in srgb, A p%, B), as the browser computes it, so a derived tint is checked against its JS value.
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (c) => `#${c.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const resolve = (v) => {
  let m;
  while ((m = /^var\((--[\w-]+)\)$/.exec(v))) v = vars[m[1]];
  if ((m = /^color-mix\(in srgb, (var\(--[\w-]+\)) (\d+)%, (transparent|var\(--[\w-]+\))\)$/.exec(v))) {
    const a = rgb(resolve(m[1])), p = +m[2];
    if (m[3] === 'transparent') return `rgba(${a.join(',')},${+(p / 100).toFixed(3)})`;
    const b = rgb(resolve(m[3]));
    return hex(a.map((x, i) => (x * p + b[i] * (100 - p)) / 100));
  }
  return v;
};

test('every base value in JS equals its CSS custom property', () => {
  for (const [group, entries] of Object.entries(T.base)) for (const [name, value] of Object.entries(entries))
    assert.equal(resolve(vars[`--nc-ui-${group}-${name}`]), value, `${group}.${name}`);
});

test('every semantic and runtime value in JS equals the CSS after var() resolution', () => {
  for (const [name, value] of [...Object.entries(T.semantic), ...Object.entries(T.runtime)]) {
    assert.ok(vars[`--nc-ui-${name}`] !== undefined, name);
    assert.equal(resolve(vars[`--nc-ui-${name}`]), value, name);
    assert.equal(T.vars[name], `var(--nc-ui-${name})`);
  }
});

test('every component value in JS equals the CSS after var() resolution, by domain', () => {
  for (const [domain, entries] of Object.entries(T.component)) for (const [name, value] of Object.entries(entries)) {
    const v = `--nc-${domain}-${name}`;
    assert.ok(vars[v] !== undefined, v);
    assert.equal(resolve(vars[v]), value, v);
    assert.equal(T.componentVars[domain][name], `var(${v})`);
    assert.equal(T.componentVar(domain, name), v);
  }
});

test('the CSS has no custom property the JS does not know', () => {
  const known = new Set([
    ...Object.entries(T.base).flatMap(([g, e]) => Object.keys(e).map((n) => `--nc-ui-${g}-${n}`)),
    ...Object.keys(T.semantic).map((n) => `--nc-ui-${n}`), ...Object.keys(T.runtime).map((n) => `--nc-ui-${n}`),
    ...Object.entries(T.component).flatMap(([d, e]) => Object.keys(e).map((n) => `--nc-${d}-${n}`))]);
  for (const v of Object.keys(vars)) assert.ok(known.has(v), v);
});

test('src/tokens.ts carries the same data as dist/tokens.js, typed as const', () => {
  const js = readFileSync(new URL('../dist/tokens.js', import.meta.url), 'utf8');
  const strip = (t) => t.replace(/^export const (cssVar|componentVar) .*\n/gm, '');
  assert.equal(strip(ts.replace(/ as const;/g, ';').replace(/^export type.*\n/gm, '')), strip(js));
  assert.match(ts, /export type SemanticToken = keyof typeof semantic;/);
  assert.match(ts, /export type ComponentToken<D extends ComponentDomain> = keyof \(typeof component\)\[D\];/);
});

test('every accent tint derives from the one accent token (no literal copies), and moves with it', async () => {
  const { compile } = await import('../scripts/build-tokens.mjs');
  const src = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url), 'utf8'));
  const derived = ['accent-tint', 'accent-soft', 'accent-faint'];
  for (const n of derived) assert.match(vars[`--nc-ui-${n}`], /^color-mix\(in srgb, var\(--nc-ui-color-accent\) \d+%/, n);
  assert.match(vars['--nc-ui-color-accent-wash'], /^color-mix\(in srgb, var\(--nc-ui-color-accent\) \d+%/);
  src.base.color.accent.value = '#FF0000';
  const red = compile(src);
  for (const n of derived) assert.notEqual(red.semantic.get(n).value, T.semantic[n], n);
  assert.equal(red.semantic.get('accent-faint').value, 'rgba(255,0,0,0.35)');
  // Nothing else still spells the accent's value: every use is a ref or a mix.
  const literal = T.base.color.accent.toLowerCase();
  const strays = [...css.matchAll(/^\s+(--[\w-]+):\s*(.+);$/gm)].filter((m) => m[2].toLowerCase().includes(literal) && m[1] !== '--nc-ui-color-accent');
  assert.deepEqual(strays.map((m) => m[1]), []);
});

test('WCAG AA (4.5:1) for the accent: on-accent ink on filled steps, S and the active slot; accent text on the page; ink on the selected-row tint', async () => {
  const { contrastRatio } = await import('../src/color.js');
  const s = T.semantic, r = T.component.rhythm;
  const pairs = [
    [r['step-cell-ink'], r['step-cell-on'], 'ink on a filled step'],
    [s['surface-page'], r['track-solo'], 'S label on a filled S'],
    [s['slot-active-ink'], s['slot-active-bg'], 'active slot ink on its fill'],
    [s.accent, s['surface-page'], 'accent text on the page'],
    [s.accent, s['module-bg-stack-4'], 'accent text on the darkest module background'],
    [s.text, s['accent-tint'], 'track name on the selected-row tint'],
    [s.accent, s['accent-tint'], 'accent marker and filled steps on the tint'],
  ];
  for (const [fg, bg, what] of pairs) assert.ok(contrastRatio(fg, bg) >= 4.5, `${what}: ${fg} on ${bg} = ${contrastRatio(fg, bg).toFixed(2)}`);
});

// Peter: filled pads in #003153 were hard to tell from the ink (accented) pads. accent-pad is the same hue, lighter.
test('accent-pad (filled pads/steps): same hue as the accent, lighter; >= 2:1 against the ink pad, paper text on it AA, distinct from empty pads', async () => {
  const { contrastRatio, hexToHsl } = await import('../src/color.js');
  const c = T.base.color, s = T.semantic;
  const pad = c['accent-pad'];
  const hue = (hex) => hexToHsl(hex).h;
  assert.ok(Math.abs(hue(pad) - hue(c.accent)) <= 1, `accent-pad hue ${hue(pad).toFixed(1)} vs accent ${hue(c.accent).toFixed(1)}`);
  assert.ok(hexToHsl(pad).l > hexToHsl(c.accent).l, 'accent-pad is lighter than the accent');
  assert.equal(c.accent, '#003153', 'the main accent is unchanged');
  const pairs = [
    [pad, c.ink, 2, 'filled pad vs the darkest pad (ink: accented step)'],
    [c.paper, pad, 4.5, 'paper text / icon on a filled pad'],
    [pad, c.paper, 3, 'filled pad vs an empty pad on paper'],
    ...[1, 2, 3, 4].map((n) => [pad, c[`shade-${n}`], 3, `filled pad vs an empty pad on module shade-${n}`]),
    [pad, s['accent-tint'], 3, 'filled pad on the selected-row tint'],
  ];
  // The rhythm roles that draw pads and steps: filled = accent-pad, accented = ink, the mark/ring on them = paper.
  const r = T.component.rhythm;
  assert.equal(r['step-cell-on'], pad);
  assert.equal(s.accent, c.accent, 'semantic accent (S, slots, focus, sliders) keeps #003153');
  assert.equal(r['track-solo'], c.accent, 'a filled S stays the main accent');
  pairs.push(
    [r['step-cell-on'], r['step-cell-accent'], 2, 'filled step vs accented step'],
    [r['step-cell-ink'], r['step-cell-on'], 4.5, 'step number / mark on a filled pad'],
    [r['step-cell-ink'], r['step-cell-accent'], 4.5, 'step number / playhead ring on an accented pad'],
    [r['step-cell-on'], r['step-cell-off'], 3, 'filled step vs an off step (paper square on the selected row)'],
    [r.playhead, r['step-cell-off'], 3, 'playhead ring on an off step'],
  );
  for (const [fg, bg, min, what] of pairs) assert.ok(contrastRatio(fg, bg) >= min, `${what}: ${fg} / ${bg} = ${contrastRatio(fg, bg).toFixed(2)} < ${min}`);
});

// Peter: no green. Every neutral is a true grey (R = G = B); the exceptions are listed with their reason.
test('neutrals are true greys (saturation 0); filter-accent derives from the accent; no filter-green alias', async () => {
  const keep = new Set();
  const neutrals = ['paper', 'ink', 'ink-label', 'ivory', 'surf', 'drawer', 'skeleton-hi', 'map-off',
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `shade-${n}`), ...[0, 1, 2, 3, 4].flatMap((n) => [`sub-${n}`, `div-${n}`]),
    ...[1, 2, 3, 4].map((n) => `mf-${n}`)];
  for (const n of neutrals) {
    if (keep.has(n)) continue;
    const [r, g, b] = rgb(T.base.color[n]);
    assert.ok(r === g && g === b, `color.${n} ${T.base.color[n]} is not grey`);
  }
  for (const n of ['background', 'foreground', 'border', 'card', 'muted-foreground', 'chart-3'])
    assert.match(T.base.legacy[n], /^0 0% [\d.]+%$/, `legacy.${n}`);
  assert.match(vars['--nc-ui-color-filter-accent'], /^color-mix\(in srgb, var\(--nc-ui-color-accent\) \d+%/);
  assert.equal(vars['--nc-ui-color-filter-green'], undefined);
  assert.equal(T.semantic['filter-highpass'], T.base.color['filter-accent']);
});

// Secondary text (sub-0…4, text-sub, module-sub-stack-*) is AA text too: every step on every surface it can sit on.
test('WCAG AA (4.5:1) for secondary text: every sub-* on paper, shade-1…8 and the selected-row tint; grey and ordered', async () => {
  const { contrastRatio } = await import('../src/color.js');
  const c = T.base.color, s = T.semantic;
  const subs = [0, 1, 2, 3, 4].map((n) => `sub-${n}`);
  const bgs = [['paper', c.paper], ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`shade-${n}`, c[`shade-${n}`]]), ['accent-tint', s['accent-tint']]];
  for (const sub of subs) for (const [b, hex] of bgs)
    assert.ok(contrastRatio(c[sub], hex) >= 4.5, `${sub} on ${b}: ${c[sub]} on ${hex} = ${contrastRatio(c[sub], hex).toFixed(2)}`);
  const level = subs.map((n) => rgb(c[n])[0]);
  for (let i = 1; i < level.length; i++) assert.ok(level[i] < level[i - 1], `sub-${i} ${c[subs[i]]} is not darker than sub-${i - 1} ${c[subs[i - 1]]}`);
  assert.equal(s['text-sub'], c['sub-0']);
  for (const n of [1, 2, 3, 4]) assert.equal(s[`module-sub-stack-${n}`], c[`sub-${n}`]);
  // legacy muted-foreground (shadcn HSL channels) tracks sub-0 to the 0.1 %.
  const pct = Number(T.base.legacy['muted-foreground'].match(/^0 0% ([\d.]+)%$/)[1]);
  assert.ok(Math.abs((pct / 100) * 255 - rgb(c['sub-0'])[0]) < 0.5, `legacy.muted-foreground ${pct}% vs sub-0 ${c['sub-0']}`);
});

test('WCAG AA on every neutral: ink and accent text 4.5:1, filter curves 3:1 (non-text) on the module backgrounds', async () => {
  const { contrastRatio } = await import('../src/color.js');
  const c = T.base.color, s = T.semantic;
  const bgs = ['paper', 'ivory', 'surf', 'drawer', 'skeleton-hi', ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `shade-${n}`), ...[1, 2, 3, 4].map((n) => `mf-${n}`)];
  for (const b of bgs) for (const fg of ['ink', 'accent'])
    assert.ok(contrastRatio(c[fg], c[b]) >= 4.5, `${fg} on ${b}: ${contrastRatio(c[fg], c[b]).toFixed(2)}`);
  for (const f of ['filter-lowpass', 'filter-highpass', 'filter-bandpass']) for (const b of ['paper', 'shade-1', 'shade-2', 'shade-3', 'shade-4'])
    assert.ok(contrastRatio(s[f], c[b]) >= 3, `${f} on ${b}: ${contrastRatio(s[f], c[b]).toFixed(2)}`);
});

test('the dark JS (themes.dark) equals the CSS with the dark block over the light one', () => {
  const light = vars;
  vars = { ...light, ...declared(css.slice(darkAt, css.indexOf('@media (prefers-color-scheme: dark)'))) };
  try {
    for (const [name, value] of Object.entries(T.themes.dark.color)) assert.equal(resolve(vars[`--nc-ui-color-${name}`]), value, name);
    for (const [name, value] of [...Object.entries(T.themes.dark.semantic), ...Object.entries(T.themes.dark.runtime)])
      assert.equal(resolve(vars[`--nc-ui-${name}`]), value, name);
    for (const [domain, entries] of Object.entries(T.themes.dark.component)) for (const [name, value] of Object.entries(entries))
      assert.equal(resolve(vars[`--nc-${domain}-${name}`]), value, `${domain}.${name}`);
  } finally { vars = light; }
});
