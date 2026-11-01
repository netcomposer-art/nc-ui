import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { load, compile, build, renderCss } from '../scripts/build-tokens.mjs';

const src = load(new URL('../tokens/tokens.json', import.meta.url));

test('tokens.json compiles with three tiers plus runtime tokens', () => {
  const c = compile(src);
  assert.ok(c.base.size > 50, 'base tier');
  assert.ok(c.semantic.size > 30, 'semantic tier');
  assert.deepEqual(Object.keys(c.domains), ['synth', 'meaning', 'situation', 'rhythm']);
  assert.ok(c.component.size > 20, 'component tier');
  assert.deepEqual([...c.runtime.keys()], ['surprise-fill', 'surprise-ink', 'surprise-on', 'surprise-on-ink', 'velocity-fill']);
});

test('every semantic ref points at a real base token, and resolves to its value', () => {
  const c = compile(src);
  for (const s of c.semantic.values()) if (s.ref) {
    assert.ok(c.base.has(s.ref), s.name);
    assert.equal(s.value, c.base.get(s.ref).value);
    assert.equal(s.css, `var(${c.base.get(s.ref).cssVar})`);
  }
});

test('Peter\'s required roles exist', () => {
  const c = compile(src);
  for (const n of ['module-bg-adjacent-1', 'module-bg-stack-1', 'readout-size', 'accent', 'label-on-fill-dark', 'label-on-fill-light',
    'slot-size', 'sparkle-size', 'font-ui', 'font-readout', 'transition-feedback', 'focus-ring', 'danger',
    'filter-lowpass', 'filter-highpass', 'filter-bandpass', 'motion-fade', 'motion-fade-out', 'motion-slide',
    'target-min', 'module-slim-column']) assert.ok(c.semantic.has(n), n);
  for (const n of ['synth.keybed-height', 'meaning.tension', 'situation.drawer-bg'])
    assert.ok(c.component.has(n), n);
  // ASTRID's shape: a duration token and a separate easing token (so ASTRID's `var(motion-fade) var(motion-fade-easing)` works).
  assert.equal(c.semantic.get('motion-fade').value, '.2s');
  assert.equal(c.semantic.get('motion-fade-easing').value, 'ease');
  assert.equal(c.semantic.get('motion-fade-out').value, '.25s');
  assert.equal(c.semantic.get('motion-fade-out-easing').value, 'ease-out');
  assert.equal(c.semantic.get('motion-slide').value, '.22s');
  assert.equal(c.semantic.get('motion-slide-easing').value, 'ease-out');
  assert.equal(c.semantic.get('filter-lowpass').cssVar, '--nc-ui-filter-lowpass');
  assert.equal(c.semantic.get('target-min').value, '44px');
  assert.equal(c.semantic.get('target-min').cssVar, '--nc-ui-target-min');
  assert.ok(!c.component.has('synth.filter-lowpass'));
  assert.ok(!c.component.has('rhythm.filter-lowpass'));
});

test('component tokens: --nc-<domain>-<name>, refs to base or semantic, rhythm filled', () => {
  const c = compile(src);
  for (const t of c.component.values()) {
    assert.equal(t.cssVar, `--nc-${t.domain}-${t.name}`);
    if (t.ref?.startsWith('semantic.')) assert.equal(t.css, `var(--nc-ui-${t.ref.slice(9)})`);
    else if (t.ref) assert.equal(t.css, `var(${c.base.get(t.ref).cssVar})`);
  }
  assert.equal(c.component.get('synth.key-black').css, 'var(--nc-ui-text)');
  assert.equal(c.component.get('synth.key-black').value, c.base.get('color.ink').value);
  const rhythm = [...c.component.values()].filter((t) => t.domain === 'rhythm');
  assert.ok(rhythm.length > 0, 'rhythm domain is filled');
  for (const name of ['step-cell-off', 'step-cell-on', 'step-cell-accent', 'playhead', 'track-mute', 'track-solo']) {
    assert.ok(c.component.has(`rhythm.${name}`), name);
  }
  assert.ok(c.domains.rhythm.scope.length > 0, 'rhythm $scope lists source paths');
  for (const d of Object.keys(c.domains)) for (const n of c.semantic.keys()) assert.ok(!n.startsWith(`${d}-`), `${n} is domain-specific`);
});

test('component domain rules are enforced by the build', () => {
  const leak = structuredClone(src); leak.semantic['synth-x'] = { ref: '{color.ink}' };
  assert.throws(() => compile(leak), /belongs in component domain "synth"/);
  const ui = structuredClone(src); ui.component.ui = { x: { ref: '{color.ink}' } };
  assert.throws(() => compile(ui), /collide/);
  const grp = structuredClone(src); grp.component.color = { x: { ref: '{color.ink}' } };
  assert.throws(() => compile(grp), /collides with base group/);
  const rep = structuredClone(src); rep.component.meaning['meaning-x'] = { ref: '{color.ink}' };
  assert.throws(() => compile(rep), /drop the repeated/);
  const bad = structuredClone(src); bad.component.synth.x = { ref: '{semantic.nope}' };
  assert.throws(() => compile(bad), /unknown ref/);
});

test('renames.json maps every moved role to a component var that exists', () => {
  const c = compile(src);
  const { renames } = JSON.parse(readFileSync(new URL('../tokens/renames.json', import.meta.url), 'utf8'));
  const vars = new Set([...c.component.values()].map((t) => t.cssVar));
  const rhythm = [...c.component.values()].filter((t) => t.domain === 'rhythm').length;
  assert.equal(renames.length + rhythm, c.component.size);
  for (const r of renames) { assert.ok(vars.has(r.new), r.new); assert.ok(!c.semantic.has(r.old.slice(8)), `${r.old} still semantic`); }
});

test('unknown refs and group collisions are rejected', () => {
  const bad = structuredClone(src); bad.semantic.oops = { ref: '{color.nope}' };
  assert.throws(() => compile(bad), /unknown ref/);
  const clash = structuredClone(src); clash.semantic['color-x'] = { ref: '{color.ink}' };
  assert.throws(() => compile(clash), /collides/);
});

test('one change in tokens.json reaches every consumer (CSS, JS, TS, semantic roles)', () => {
  const changed = structuredClone(src);
  changed.base.color.accent.value = '#FF00AA';
  changed.base['font-family'].mono.value = "'Courier New', monospace";
  const out = mkdtempSync(join(tmpdir(), 'nc-ui-'));
  const files = build(changed, out);
  const css = files[join(out, 'dist/tokens.css')], ts = files[join(out, 'src/tokens.ts')], js = files[join(out, 'dist/tokens.js')];
  assert.match(css, /--nc-ui-color-accent: #FF00AA;/);
  assert.match(css, /--nc-ui-accent: var\(--nc-ui-color-accent\);/);
  for (const text of [ts, js]) {
    assert.match(text, /"accent": "#FF00AA"/);
    assert.match(text, /"slot-active-bg": "#FF00AA"/);
    assert.match(text, /"intimacy": "#FF00AA"/);
    assert.match(text, /"font-readout": "'Courier New', monospace"/);
  }
});

test('the committed outputs are current (node scripts/build-tokens.mjs --check)', () => {
  const files = build(src, new URL('..', import.meta.url).pathname);
  for (const [path, text] of Object.entries(files)) assert.equal(readFileSync(path, 'utf8'), text, `${path} is stale`);
});

test('CSS is one :root block (then the dark blocks), prefixed, no duplicates', () => {
  const all = renderCss(compile(src));
  const css = all.slice(0, all.indexOf('/* Dark theme'));
  assert.equal((css.match(/^:root \{/gm) ?? []).length, 1);
  const names = [...css.matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every((n) => n.startsWith('--nc-ui-') || /^--nc-(synth|meaning|situation|rhythm)-/.test(n)));
});

test("instrument identity colours (Peter, 2026-10-29): ASTRID, PETRA, OLIVE; OLIVE's green is the lint's one named exception", async () => {
  const { semantic } = await import("../dist/tokens.js");
  assert.equal(semantic["instrument-astrid"].toUpperCase(), "#EB512E");
  assert.equal(semantic["instrument-petra"].toUpperCase(), "#5AC4F7");
  assert.equal(semantic["instrument-olive"].toUpperCase(), "#9CA536");
  const { findGreen, IDENTITY_COLOURS } = await import("../scripts/lint-ui.mjs");
  assert.deepEqual([...IDENTITY_COLOURS], ["#9ca536"]);
  assert.equal(findGreen("color: #9CA536;").length, 0);
  assert.equal(findGreen("color: #9CA537;").length, 1, "only that exact olive, not greens near it");
});
