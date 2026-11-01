// Dark theme: tokens.json `dark` → the dark CSS blocks, themes.dark in JS, and src/theme.js.
// nc-ui was created by Peter Semmelhack (https://psem.me/). MIT License.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load, compile, darkSource } from '../scripts/build-tokens.mjs';
import { themes, semantic } from '../dist/tokens.js';
import { contrastRatio, velocityFill, VELOCITY_RAMPS, VELOCITY_RAMP } from '../src/color.js';
import { isGreen, rgbOf } from '../scripts/lint-ui.mjs';
import { installDom } from './helpers/dom.mjs';

const src = load(new URL('../tokens/tokens.json', import.meta.url));
const css = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');
const d = themes.dark.semantic, dc = themes.dark.component, dk = themes.dark.color;

test('the dark CSS: an explicit choice and the system setting (unless light was chosen), colours only', () => {
  assert.match(css, /:root\[data-nc-theme="dark"\] \{\n  color-scheme: dark;/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n  :root:not\(\[data-nc-theme="light"\]\) \{\n    color-scheme: dark;/);
  const block = css.slice(css.indexOf(':root[data-nc-theme="dark"]'), css.indexOf('@media (prefers-color-scheme: dark)'));
  const props = [...block.matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]);
  assert.ok(props.length > 40);
  for (const p of props) assert.match(p, /^--nc-ui-(color-|legacy-|toast-|dialog-)|^--nc-synth-key-/, p);
  // Both blocks carry the same declarations.
  const media = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  for (const p of props) assert.ok(media.includes(`${p}:`), p);
});

test('light values are untouched; dark resolves through the same refs', () => {
  assert.equal(semantic['surface-page'], '#F5F5F5');
  assert.equal(semantic.accent, '#003153');
  assert.equal(themes.light.semantic, semantic);
  assert.equal(d['surface-page'], dk.paper);
  assert.equal(d['module-bg-adjacent-1'], dk['shade-1']);
  assert.equal(dc.rhythm['velocity-max'], dk.accent);
  assert.equal(d['label-on-fill-dark'], '#242424', 'the label on a bright Surprise fill stays dark');
  assert.equal(d['label-on-fill-light'], '#FFFFFF');
  for (const n of ['instrument-astrid', 'instrument-petra', 'instrument-olive', 'instrument-nyx'])
    assert.equal(d[n], semantic[n], `${n} keeps its colour`);
});

test('a dark entry must name a light token', () => {
  const bad = structuredClone(src);
  bad.dark.base.color['no-such'] = { value: '#123456' };
  assert.throws(() => darkSource(bad), /no light token/);
  assert.equal(compile(src).dark.semantic.get('text').value, dk.ink);
});

test('no green in the dark set', () => {
  for (const [k, v] of Object.entries(dk)) {
    if (k === 'olive-green') continue;
    const rgb = rgbOf(v);
    if (rgb) assert.ok(!isGreen(rgb), `${k} ${v}`);
  }
});

// [foreground, background, minimum, why]
const PAIRS = [
  ['text', 'surface-page', 7, 'body text'],
  ['text', 'module-bg-stack-4', 7, 'text on the lightest card'],
  ['text-sub', 'surface-page', 4.5, 'secondary text'],
  ...[1, 2, 3, 4].map((n) => ['text-sub', `module-bg-adjacent-${n}`, 4.5, 'secondary text on a module']),
  ['text-sub', 'accent-tint', 4.5, 'secondary text on the selected row'],
  ...[1, 2, 3, 4].map((n) => [`module-sub-stack-${n}`, `module-bg-stack-${n}`, 4.5, 'secondary text in the stack']),
  ['accent', 'surface-page', 4.5, 'accent text'],
  ['accent', 'module-bg-adjacent-4', 4.5, 'accent text on the lightest module'],
  ['on-accent', 'accent', 4.5, 'label on an accent fill (Play)'],
  ['slot-active-ink', 'slot-active-bg', 4.5, 'active slot'],
  ['danger', 'surface-page', 4.5, 'danger text'],
  ['on-danger', 'danger', 4.5, 'label on a danger fill'],
  ['warning-text', 'surface-page', 4.5, 'warning text'],
  ['toast-text', 'toast-bg', 4.5, 'toast'],
  ['toast-action', 'toast-bg', 4.5, 'toast Undo'],
  ['instrument-astrid', 'page-head-bg', 4.5, 'ASTRID title'],
  ['instrument-petra', 'page-head-bg', 4.5, 'PETRA title'],
  ['instrument-olive', 'page-head-bg', 4.5, 'OLIVE title'],
  ['instrument-lucy', 'page-head-bg', 4.5, 'LUCY title (lighter purple in dark)'],
  ['instrument-nyx', 'page-head-bg', 4.5, 'NYX title'],
  ['strip-hacks-text', 'module-bg-stack-1', 3, 'Hacks label (3:1 by request, as in light)'],
  ['fader-cap', 'strip-bg', 3, 'fader cap'],
  ['fader-cap-master', 'strip-bg', 3, 'master fader cap'],
  ['meter-fill', 'meter-track', 3, 'meter'],
  ['slider-progress', 'slider-track', 3, 'slider'],
  ['slider-thumb', 'surface-page', 3, 'slider thumb'],
  ['focus-ring', 'surface-page', 3, 'focus ring'],
  ['playhead', 'surface-page', 3, 'playhead'],
  ['filter-lowpass', 'surface-page', 3, 'filter curve'],
  ['filter-highpass', 'surface-page', 3, 'filter curve'],
  ['filter-bandpass', 'surface-page', 3, 'filter curve'],
];

test('dark contrast: every text pair clears 4.5:1, every UI part 3:1', () => {
  const rows = [];
  for (const [fg, bg, min, why] of PAIRS) {
    const r = contrastRatio(d[fg], d[bg]);
    rows.push(`${fg} ${d[fg]} on ${bg} ${d[bg]}: ${r.toFixed(2)}:1 (min ${min}, ${why})`);
    assert.ok(r >= min, rows.at(-1));
  }
  const step = [dc.rhythm['step-cell-ink'], dc.rhythm['step-cell-on']];
  assert.ok(contrastRatio(...step) >= 4.5, `step mark ${step}`);
  assert.ok(contrastRatio(dc.rhythm['step-cell-on'], dc.rhythm['step-cell-accent']) >= 2, 'filled vs accented pad');
  if (process.env.NC_CONTRAST) console.log(rows.join('\n'));
});

test('dividers stay subtle', () => {
  const r = contrastRatio(d.divider, d['surface-page']);
  assert.ok(r > 1.2 && r < 1.6, `divider ${r}`);
});

test('velocity: the dark ramp keeps its mark at 4.5:1 and climbs away from the page', () => {
  assert.deepEqual({ min: VELOCITY_RAMPS.light.min, max: VELOCITY_RAMPS.light.max }, VELOCITY_RAMP);
  let last = 0;
  for (let v = 0.05; v <= 1.0001; v += 0.05) {
    const f = velocityFill(v, VELOCITY_RAMPS.dark);
    assert.equal(f.ink, dc.rhythm['step-cell-ink']);
    assert.ok(contrastRatio(f.fill, f.ink) >= 4.5, `${v} ${f.fill}`);
    const away = contrastRatio(f.fill, d['surface-page']);
    assert.ok(away >= last - 1e-9, `louder is brighter at ${v}`);
    last = away;
  }
});

test('theme.js: applyTheme, currentTheme, onThemeChange, followHostTheme', async () => {
  const { window, document } = installDom();
  let dark = false; const listeners = new Set();
  window.matchMedia = () => ({ get matches() { return dark; }, addEventListener: (_, f) => listeners.add(f), removeEventListener: (_, f) => listeners.delete(f) });
  const t = await import('../src/theme.js');
  assert.equal(t.themeChoice(document), 'system');
  assert.equal(t.currentTheme(document), 'light');
  const seen = [];
  const off = t.onThemeChange((x) => seen.push(x), document);
  let evt = null;
  document.addEventListener(t.THEME_EVENT, (e) => { evt = e.detail; });
  assert.equal(t.applyTheme('dark', document), 'dark');
  assert.equal(document.documentElement.getAttribute('data-nc-theme'), 'dark');
  assert.deepEqual(evt, { choice: 'dark', theme: 'dark' });
  t.applyTheme('system', document);
  assert.equal(document.documentElement.hasAttribute('data-nc-theme'), false);
  dark = true; for (const f of listeners) f();
  assert.equal(t.currentTheme(document), 'dark');
  t.applyTheme('light', document);
  assert.equal(t.currentTheme(document), 'light');
  t.applyTheme('bogus', document);
  assert.equal(t.themeChoice(document), 'system');
  off();
  assert.deepEqual(seen, ['dark', 'light', 'dark', 'light', 'dark']);
  assert.equal(listeners.size, 0);
  assert.equal(t.themeTokens('dark'), themes.dark);
  assert.equal(t.themeTokens('nope'), themes.light);
  assert.equal(t.STUDIO_THEME_KEY, 'netcomposer.studio.theme.v1');
  // An iframe takes the host's choice; a page on its own has no host.
  const host = installDom().document; host.documentElement.setAttribute('data-nc-theme', 'dark');
  const inner = installDom();
  assert.equal(t.followHostTheme({ frameElement: { ownerDocument: host }, document: inner.document }), 'dark');
  assert.equal(inner.document.documentElement.getAttribute('data-nc-theme'), 'dark');
  assert.equal(t.followHostTheme({ frameElement: null, document: inner.document }), null);
});
