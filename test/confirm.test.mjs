// confirm(): its tokens, contrast, confirm.css contract (fallbacks = token values) and size. Behaviour (focus, keys, inert, answers) is tested in a DOM
// by the consumer (Rhythm: packages/ui-theme/src/confirm.test.ts and tests/confirm.spec.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { semantic, base } from '../dist/tokens.js';
import { contrastRatio, hslToHex } from '../src/color.js';
import { kitCss } from '../src/primitives/kit.js';

const resolved = JSON.parse(readFileSync(new URL('../dist/tokens.resolved.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../src/primitives/confirm.js', import.meta.url), 'utf8');
const hex = (c) => {
  const m = /^hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)$/.exec(c);
  return m ? hslToHex(+m[1], +m[2] / 100, +m[3] / 100) : c;
};

test('confirm tokens are semantic, and the action on danger reads at AA', () => {
  for (const name of ['on-danger', 'dialog-scrim', 'dialog-width', 'dialog-pad', 'dialog-gap', 'dialog-button-gap', 'dialog-radius'])
    assert.ok(semantic[name], name);
  assert.equal(semantic['on-danger'], base.color.paper);
  assert.equal(semantic['dialog-scrim'], 'rgba(36,36,36,0.35)', 'ink at 35%');
  assert.equal(resolved.vars['dialog-scrim'], 'var(--nc-ui-dialog-scrim)');
  assert.ok(contrastRatio(hex(semantic['on-danger']), hex(semantic.danger)) >= 4.5, 'on-danger on danger');
  assert.ok(contrastRatio(semantic.text, semantic['surface-page']) >= 4.5, 'text on surface-page');
  assert.ok(contrastRatio(semantic['text-sub'], semantic['surface-page']) >= 4.5, 'text-sub on surface-page');
});

const css = readFileSync(new URL('../src/primitives/confirm.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Every var(--nc-ui-NAME, FALLBACK) in a stylesheet, fallbacks with balanced parentheses. */
function varsOf(text) {
  const out = [];
  for (let i = text.indexOf('var('); i >= 0; i = text.indexOf('var(', i + 4)) {
    let depth = 0;
    let end = i + 3;
    for (; end < text.length; end++) {
      if (text[end] === '(') depth++;
      else if (text[end] === ')' && --depth === 0) break;
    }
    const inner = text.slice(i + 4, end);
    const comma = inner.indexOf(',');
    out.push({ prop: (comma < 0 ? inner : inner.slice(0, comma)).trim(), fallback: comma < 0 ? null : inner.slice(comma + 1).trim() });
  }
  return out;
}

test('confirm.css: every token has a var() fallback equal to its current value', () => {
  const uses = varsOf(css);
  assert.ok(uses.length >= 30, `${uses.length} var() uses`);
  for (const { prop, fallback } of uses) {
    // The Studio's visible band (not tokens): the whole frame when not hosted.
    if (prop.startsWith('--nc-host-')) {
      assert.equal(fallback, '0px', `${prop} fallback`);
      continue;
    }
    const name = prop.replace(/^--nc-ui-/, '');
    assert.ok(prop.startsWith('--nc-ui-') && semantic[name] != null, `${prop} is a semantic token`);
    assert.equal(fallback, semantic[name], `${prop} fallback`);
  }
  for (const name of ['on-danger', 'dialog-scrim', 'dialog-width', 'dialog-pad', 'dialog-gap', 'dialog-button-gap', 'dialog-radius', 'dialog-leading'])
    assert.ok(uses.some((u) => u.prop === `--nc-ui-${name}`), name);
});

test('confirm.css styles the dialog from semantic tokens, 44 px on every pointer, no motion when reduced', () => {
  // Outside the var() fallbacks there are no literals.
  const bare = css.replace(/var\((--nc-(?:ui|host)-[a-z0-9-]+),(?:[^()]|\([^()]*\))*\)/g, 'var($1)');
  assert.doesNotMatch(bare, /--nc-rhythm-|\d+(?:px|rem|em)\b|#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i, 'semantic tokens only, no literals');
  assert.match(bare, /background: var\(--nc-ui-dialog-scrim\)/);
  assert.match(bare, /\[data-danger="true"\] \{[^}]*background: var\(--nc-ui-danger\);[^}]*color: var\(--nc-ui-on-danger\)/);
  assert.match(bare, /button\.nc-ui-confirm-btn \{[^}]*min-height: var\(--nc-ui-target-min\);/);
  assert.doesNotMatch(bare, /pointer: coarse/, 'no fine-pointer size: 44 px on desktop too');
  assert.match(bare, /transition: opacity var\(--nc-ui-motion-fade\) var\(--nc-ui-motion-fade-easing\)/);
  assert.match(bare, /transition: opacity var\(--nc-ui-motion-fade-out\) var\(--nc-ui-motion-fade-out-easing\)/);
  const reduced = bare.slice(bare.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  for (const sel of ['.nc-ui-confirm-layer,', '.nc-ui-confirm-layer[data-state="closing"]', '.nc-ui-confirm,', 'button.nc-ui-confirm-btn'])
    assert.ok(reduced.includes(sel), sel);
});

test('kit.js carries no confirm rules (confirm.css is the one copy)', () => {
  assert.doesNotMatch(kitCss(), /nc-ui-confirm/);
});

test('confirm.js links confirm.css beside it', () => {
  assert.match(source, /new URL\("\.\/confirm\.css", import\.meta\.url\)/);
});

test('confirm.js has no dependencies and stays under 2 KB gzipped', () => {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /^\s*import\b/m);
  assert.doesNotMatch(code, /window\.confirm|\balert\(/);
  assert.ok(gzipSync(source).length <= 2048, `${gzipSync(source).length} bytes`);
});
