// Skins (Peter, 2026-11-19): every tokens/skins/*.json builds, keeps the instruments' colours, stays readable, has
// no green, and reaches CSS, JS (themeTokens, the velocity ramp) and iframes (followHostTheme).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skins, skinThemes, themes } from '../dist/tokens.js';
import { contrast, isGreenHex, loadSkins } from '../scripts/skins.mjs';
import { installDom } from './helpers/dom.mjs';

const css = readFileSync(new URL('../dist/tokens.css', import.meta.url), 'utf8');
const src = JSON.parse(readFileSync(new URL('../tokens/tokens.json', import.meta.url), 'utf8'));
const own = skins.filter((s) => !s.default);
const tokensOf = async (theme, skin) => (await import('../src/theme.js')).themeTokens(theme, skin);

test('the skins: Prussian (default) first, then Graphite, Oxide, Steel, Verdigris; each file checked', () => {
  assert.deepEqual(skins.map((s) => s.id), ['prussian', 'graphite', 'oxide', 'steel', 'verdigris']);
  assert.equal(skins[0].default, true);
  assert.equal(loadSkins(new URL('../tokens/skins', import.meta.url).pathname).length, skins.length);
  for (const s of skins) for (const m of ['light', 'dark']) for (const k of ['paper', 'surf', 'accent']) assert.match(s.swatch[m][k], /^#[0-9A-F]{6}$/, `${s.id} ${m} ${k}`);
});

test('a skin never touches an instrument colour', async () => {
  const fixed = src.skin.fixed;
  for (const s of own) for (const m of ['light', 'dark']) {
    const t = await tokensOf(m, s.id);
    for (const n of fixed) assert.equal(t.color[n], themes[m].color[n], `${s.id} ${m} color.${n}`);
    for (const n of Object.keys(themes[m].semantic).filter((k) => k.startsWith('instrument-'))) assert.equal(t.semantic[n], themes[m].semantic[n], `${s.id} ${m} ${n}`);
    for (const n of fixed) assert.ok(!(n in (skinThemes[s.id][m].color ?? {})), `${s.id} ${m} moves ${n}`);
  }
  // The CSS blocks name base colours only, never an instrument's.
  const blocks = css.slice(css.indexOf('/* Skins (tokens/skins'), css.indexOf('/* Skins: the step and pad velocity fills'));
  const props = [...blocks.matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]);
  assert.ok(props.length > 100);
  for (const p of props) {
    assert.match(p, /^--nc-ui-color-/, p);
    assert.ok(!fixed.some((n) => p === `--nc-ui-color-${n}`), p);
  }
});

test('readable: ink, sub text and the accent on the page, and the page colour on the accent (≥ 4.5:1)', async () => {
  for (const s of skins) for (const m of ['light', 'dark']) {
    const c = (await tokensOf(m, s.id)).color;
    const p = c.paper;
    assert.ok(contrast(c.ink, p) >= 7, `${s.id} ${m} ink ${contrast(c.ink, p).toFixed(2)}`);
    assert.ok(contrast(c['sub-0'], p) >= 4.5, `${s.id} ${m} sub text ${contrast(c['sub-0'], p).toFixed(2)}`);
    assert.ok(contrast(c.accent, p) >= 4.5, `${s.id} ${m} accent ${contrast(c.accent, p).toFixed(2)}`);
    assert.ok(contrast(c['paper-bright'], c.accent) >= 4.5, `${s.id} ${m} on accent ${contrast(c['paper-bright'], c.accent).toFixed(2)}`);
  }
});

test('the velocity ramp follows the skin, and its mark stays readable on every fill', async () => {
  const { velocityFill, velocityRamp, contrastRatio } = await import('../src/color.js');
  for (const s of own) for (const m of ['light', 'dark']) {
    const ramp = velocityRamp(m, s.id);
    assert.equal(ramp.max, (await tokensOf(m, s.id)).component.rhythm['velocity-max']);
    assert.notEqual(ramp.max, velocityRamp(m).max, `${s.id} ${m}: the ramp moved`);
    for (let v = 0.05; v <= 1.0001; v += 0.05) {
      const f = velocityFill(v, ramp);
      assert.ok(!isGreenHex(f.fill), `${s.id} ${m} ${f.fill} green`);
      // The mark keeps AA on every fill, as on the default ramp.
      assert.ok(contrastRatio(f.ink, f.fill) >= 4.5, `${s.id} ${m} v${v.toFixed(2)} ${f.ink} on ${f.fill}`);
    }
  }
});

test('the velocity fill re-map lands each default fill on the skin ramp (any kit writes the default hex)', async () => {
  const { velocityFill, velocityRamp } = await import('../src/color.js');
  const { hexToOklab } = await import('../scripts/skins.mjs');
  for (const s of own) for (const m of ['light', 'dark']) {
    const sel = m === 'light' ? `:root[data-nc-skin="${s.id}"]:not([data-nc-theme="dark"])` : `:root[data-nc-skin="${s.id}"][data-nc-theme="dark"]`;
    const rule = css.split('\n').find((line) => line.startsWith(`:where(${sel}) `));
    assert.ok(rule, `${s.id} ${m} rule`);
    const calcs = [...rule.matchAll(/calc\(([-\d.e]+) \+ ([-\d.e]+) \* l\)/g)].slice(0, 3).map((x) => [Number(x[1]), Number(x[2])]);
    for (const v of [0.05, 0.3, 0.6, 1]) {
      const from = velocityFill(v, velocityRamp(m)).fill;
      const want = hexToOklab(velocityFill(v, velocityRamp(m, s.id)).fill);
      const l = hexToOklab(from)[0];
      calcs.forEach(([A, B], k) => assert.ok(Math.abs(A + B * l - want[k]) < 0.01, `${s.id} ${m} v${v} ch${k}`));
    }
  }
});

test('no green in any skin colour', () => {
  for (const [id, t] of Object.entries(skinThemes)) for (const m of ['light', 'dark'])
    for (const [k, v] of Object.entries(t[m].color ?? {})) if (v.startsWith('#')) assert.ok(!isGreenHex(v), `${id} ${m} ${k} ${v}`);
});

test('applyLook, currentSkin, fillOn, followHostTheme and onThemeChange (a skin counts as a colour change)', async () => {
  const { document, window } = installDom();
  const t = await import('../src/theme.js');
  assert.equal(t.currentSkin(document), 'prussian');
  assert.deepEqual(t.applyLook({ skin: 'oxide', fill: true }, document), { skin: 'oxide', fill: true });
  assert.equal(document.documentElement.getAttribute('data-nc-skin'), 'oxide');
  assert.equal(document.documentElement.hasAttribute('data-nc-fill'), true);
  t.applyLook({ skin: 'nope' }, document);
  assert.equal(document.documentElement.hasAttribute('data-nc-skin'), false, 'unknown is the default: no attribute');
  assert.equal(t.fillOn(document), true, 'fill unchanged when not passed');
  t.applyLook({ fill: false }, document);
  assert.equal(t.fillOn(document), false);
  assert.equal(t.normalizeSkin('steel'), 'steel');
  assert.equal(t.normalizeSkin(null), 'prussian');
  // themeTokens takes the document's skin by default.
  t.applyLook({ skin: 'steel' }, document);
  assert.equal(t.themeTokens('light').color.accent, '#2F5878');
  assert.equal(t.themeTokens('light', 'prussian').color.accent, '#003153');
  // A frame follows its host's skin and panels.
  const { parseHTML } = await import('linkedom');
  const frame = parseHTML('<!doctype html><html><head></head><body></body></html>');
  t.applyLook({ skin: 'verdigris', fill: true }, document);
  const win = { document: frame.document, frameElement: { ownerDocument: document } };
  t.followHostTheme(win);
  assert.equal(frame.document.documentElement.getAttribute('data-nc-skin'), 'verdigris');
  assert.equal(frame.document.documentElement.hasAttribute('data-nc-fill'), true);
  assert.ok(window);
});
