#!/usr/bin/env node
// Build nc-ui tokens (base, semantic, component, runtime) from tokens/tokens.json. Plain Node (>=20), no dependencies.
//   node scripts/build-tokens.mjs                 write dist/ and src/tokens.ts
//   node scripts/build-tokens.mjs --check         fail if the committed outputs are stale
//   node scripts/build-tokens.mjs --src f --out d build another source into another folder
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const check = process.argv.includes('--check');
const srcPath = resolve(arg('--src') ?? join(root, 'tokens/tokens.json'));
const outDir = resolve(arg('--out') ?? root);

export function load(path) { return JSON.parse(readFileSync(path, 'utf8')); }
const isMeta = (k) => k.startsWith('$');

/**
 * A derived colour: `{ "mix": { "ref": "{color.accent}", "pct": 12, "with": "{color.paper}" } }` (or `"with":
 * "transparent"`). CSS gets color-mix() over the referenced variables, so a live change to the accent re-tints every
 * mix; JS and canvas get the same blend computed here (sRGB, as color-mix(in srgb, ...)).
 * A base alias: `{ "ref": "{color.filter-accent}" }` keeps a renamed token's variable for older consumers; it must
 * follow its target.
 */
const hexRgb = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`mix: ${hex} is not #rrggbb`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) => `#${rgb.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
function mixValue(of, pct, withValue) {
  const a = hexRgb(of);
  if (withValue === 'transparent') return `rgba(${a.join(',')},${+(pct / 100).toFixed(3)})`;
  const b = hexRgb(withValue);
  return toHex(a.map((x, i) => (x * pct + b[i] * (100 - pct)) / 100));
}
function resolveMix(where, mix, lookup) {
  const ref = /^\{([^}]+)\}$/.exec(mix.ref ?? '');
  const from = ref && lookup(ref[1]);
  if (!from) throw new Error(`${where}: unknown mix ref ${mix.ref}`);
  if (!(typeof mix.pct === 'number' && mix.pct > 0 && mix.pct < 100)) throw new Error(`${where}: mix pct must be 0-100`);
  let withValue = 'transparent', withCss = 'transparent';
  if (mix.with !== 'transparent') {
    const w = /^\{([^}]+)\}$/.exec(mix.with ?? '');
    const other = w && lookup(w[1]);
    if (!other) throw new Error(`${where}: unknown mix with ${mix.with}`);
    withValue = other.value; withCss = `var(${other.cssVar})`;
  }
  return {
    value: mixValue(from.value, mix.pct, withValue),
    css: `color-mix(in srgb, var(${from.cssVar}) ${mix.pct}%, ${withCss})`,
    mix: ref[1],
  };
}

/** Flatten tokens.json into { base, semantic, component, runtime: Map; domains; constants }. */
export function compile(src) {
  const prefix = src.prefix ?? 'nc-ui';
  const base = new Map();
  for (const [group, entries] of Object.entries(src.base)) {
    if (isMeta(group)) continue;
    for (const [name, t] of Object.entries(entries)) {
      if (isMeta(name)) continue;
      const cssVar = `--${prefix}-${group}-${name}`;
      if (t.mix) {
        const m = resolveMix(`base ${group}.${name}`, t.mix, (key) => base.get(key));
        base.set(`${group}.${name}`, { group, name, value: m.value, css: m.css, cssVar, note: t.note ?? '', format: t.format });
        continue;
      }
      if (t.ref !== undefined) {
        // A base alias (a renamed token kept for older consumers): same value, its CSS points at the target's variable.
        const m = /^\{([^}]+)\}$/.exec(t.ref);
        const to = m && base.get(m[1]);
        if (!to) throw new Error(`base ${group}.${name}: unknown ref ${t.ref} (an alias must follow its target)`);
        base.set(`${group}.${name}`, { group, name, value: to.value, css: `var(${to.cssVar})`, alias: m[1], cssVar, note: t.note ?? '', format: t.format });
        continue;
      }
      if (typeof t.value !== 'string' || t.value === '') throw new Error(`base ${group}.${name}: value must be a non-empty string`);
      base.set(`${group}.${name}`, { group, name, value: t.value, cssVar, note: t.note ?? '', format: t.format });
    }
  }
  const groups = new Set([...base.values()].map((b) => b.group));
  const resolveTier2 = (tier) => {
    const out = new Map();
    for (const [name, t] of Object.entries(src[tier] ?? {})) {
      if (isMeta(name)) continue;
      for (const g of groups) if (name.startsWith(`${g}-`)) throw new Error(`${tier} "${name}" collides with base group "${g}"`);
      let value, ref, css;
      if (t.ref !== undefined) {
        const m = /^\{([^}]+)\}$/.exec(t.ref);
        if (!m || !base.has(m[1])) throw new Error(`${tier} "${name}": unknown ref ${t.ref}`);
        ref = m[1]; value = base.get(ref).value; css = `var(${base.get(ref).cssVar})`;
      } else if (t.mix) {
        ({ value, css } = resolveMix(`${tier} "${name}"`, t.mix, (key) => base.get(key)));
      } else if (typeof t.value === 'string' && t.value) { value = t.value; css = t.value; }
      else throw new Error(`${tier} "${name}" needs a ref, a mix or a value`);
      out.set(name, { name, value, ref, css, cssVar: `--${prefix}-${name}`, role: t.role ?? '' });
    }
    return out;
  };
  const semantic = resolveTier2('semantic');
  const runtime = resolveTier2('runtime');
  for (const n of runtime.keys()) if (semantic.has(n)) throw new Error(`runtime "${n}" duplicates a semantic token`);

  // Tier 3: component tokens, namespaced by domain. --<componentPrefix>-<domain>-<name>.
  const cprefix = src.componentPrefix ?? 'nc';
  const component = new Map();
  const domains = {};
  for (const [domain, entries] of Object.entries(src.component ?? {})) {
    if (isMeta(domain)) continue;
    if (!/^[a-z][a-z0-9]*$/.test(domain)) throw new Error(`component domain "${domain}": use one lowercase word`);
    if (`${cprefix}-${domain}` === prefix || domain === 'ui') throw new Error(`component domain "${domain}" would collide with the --${prefix}-* namespace`);
    if (groups.has(domain)) throw new Error(`component domain "${domain}" collides with base group "${domain}"`);
    domains[domain] = { description: entries.$description ?? '', scope: entries.$scope ?? [] };
    for (const name of semantic.keys()) if (name === domain || name.startsWith(`${domain}-`)) throw new Error(`semantic "${name}" belongs in component domain "${domain}"`);
    for (const [name, t] of Object.entries(entries)) {
      if (isMeta(name)) continue;
      if (name.startsWith(`${domain}-`)) throw new Error(`component ${domain}.${name}: drop the repeated "${domain}-"`);
      let value, ref, css;
      if (t.ref !== undefined) {
        const m = /^\{([^}]+)\}$/.exec(t.ref);
        const key = m?.[1];
        if (key?.startsWith('semantic.') && semantic.has(key.slice(9))) { const s = semantic.get(key.slice(9)); ref = key; value = s.value; css = `var(${s.cssVar})`; }
        else if (key && base.has(key)) { ref = key; value = base.get(key).value; css = `var(${base.get(key).cssVar})`; }
        else throw new Error(`component ${domain}.${name}: unknown ref ${t.ref}`);
      } else if (typeof t.value === 'string' && t.value) { value = t.value; css = t.value; }
      else throw new Error(`component ${domain}.${name} needs a ref or a value`);
      component.set(`${domain}.${name}`, { domain, name, value, ref, css, cssVar: `--${cprefix}-${domain}-${name}`, role: t.role ?? '' });
    }
  }
  const constants = Object.fromEntries(Object.entries(src.constants ?? {}).filter(([k]) => !isMeta(k)).map(([k, v]) => [k, v.value]));
  return { prefix, componentPrefix: cprefix, base, semantic, component, domains, runtime, constants };
}

const HEADER = 'Generated by scripts/build-tokens.mjs from tokens/tokens.json. Do not edit by hand.\nnc-ui was created by Peter Semmelhack (https://psem.me/). MIT License.';

export function renderCss(c) {
  const lines = [`/* ${HEADER.replace(/\n/g, '\n   ')} */`, '', ':root {', '  /* Tier 1: base values */'];
  let last = '';
  for (const b of c.base.values()) {
    if (b.group !== last) { lines.push(`  /* ${b.group} */`); last = b.group; }
    lines.push(`  ${b.cssVar}: ${b.css ?? b.value};`);
  }
  lines.push('', '  /* Tier 2: semantic roles (use these in modules) */');
  for (const s of c.semantic.values()) lines.push(`  ${s.cssVar}: ${s.css};`);
  lines.push('', '  /* Tier 3: component roles, one namespace per domain (a module uses only its own domain) */');
  for (const d of Object.keys(c.domains)) {
    const own = [...c.component.values()].filter((t) => t.domain === d);
    lines.push(`  /* ${d}${own.length ? '' : ': reserved, no tokens yet'} */`);
    for (const t of own) lines.push(`  ${t.cssVar}: ${t.css};`);
  }
  lines.push('', '  /* Runtime: defaults; code may override them on an element (see src/color.js) */');
  for (const s of c.runtime.values()) lines.push(`  ${s.cssVar}: ${s.css};`);
  lines.push('}', '');
  return lines.join('\n');
}

function nest(c) {
  const base = {};
  for (const b of c.base.values()) (base[b.group] ??= {})[b.name] = b.value;
  const obj = (m, f) => Object.fromEntries([...m.values()].map((t) => [t.name, f(t)]));
  const byDomain = (f) => Object.fromEntries(Object.keys(c.domains).map((d) =>
    [d, Object.fromEntries([...c.component.values()].filter((t) => t.domain === d).map((t) => [t.name, f(t)]))]));
  return {
    base,
    semantic: obj(c.semantic, (t) => t.value),
    component: byDomain((t) => t.value),
    componentVars: byDomain((t) => `var(${t.cssVar})`),
    componentRefs: byDomain((t) => t.ref ?? null),
    domains: c.domains,
    runtime: obj(c.runtime, (t) => t.value),
    vars: { ...obj(c.semantic, (t) => `var(${t.cssVar})`), ...obj(c.runtime, (t) => `var(${t.cssVar})`) },
    refs: obj(c.semantic, (t) => t.ref ?? null),
    constants: c.constants,
  };
}

export function renderJs(c, { ts = false } = {}) {
  const n = nest(c);
  const asConst = ts ? ' as const' : '';
  const j = (v) => JSON.stringify(v, null, 2);
  const out = [`// ${HEADER.replace(/\n/g, '\n// ')}`, ''];
  out.push(`export const prefix = ${j(c.prefix)}${asConst};`);
  out.push(`/** Tier 1: raw values. Prefer semantic tokens in module code. */`);
  out.push(`export const base = ${j(n.base)}${asConst};`);
  out.push(`/** Tier 2: semantic roles, resolved to their values (for canvas, SVG attributes, charts). */`);
  out.push(`export const semantic = ${j(n.semantic)}${asConst};`);
  out.push(`/** Tier 3: component roles by domain, resolved (component.synth['keybed-height']). Use only your own domain. */`);
  out.push(`export const component = ${j(n.component)}${asConst};`);
  out.push(`/** var(--nc-<domain>-*) references for inline styles, by domain. */`);
  out.push(`export const componentVars = ${j(n.componentVars)}${asConst};`);
  out.push(`/** What each component token points at: "group.name" (base) or "semantic.name". */`);
  out.push(`export const componentRefs = ${j(n.componentRefs)}${asConst};`);
  out.push(`/** Component domains: what each covers and which source paths belong to it (for the lint). */`);
  out.push(`export const domains = ${j(n.domains)}${asConst};`);
  out.push(`/** Runtime tokens and their defaults. */`);
  out.push(`export const runtime = ${j(n.runtime)}${asConst};`);
  out.push(`/** var(--nc-ui-*) references for inline styles. */`);
  out.push(`export const vars = ${j(n.vars)}${asConst};`);
  out.push(`/** Which base value each semantic token points at. */`);
  out.push(`export const refs = ${j(n.refs)}${asConst};`);
  out.push(`/** Numbers used by code (contrast, Surprise colour). */`);
  out.push(`export const constants = ${j(n.constants)}${asConst};`);
  if (ts) {
    out.push('export type SemanticToken = keyof typeof semantic;');
    out.push('export type RuntimeToken = keyof typeof runtime;');
    out.push('export type BaseGroup = keyof typeof base;');
    out.push('export type ComponentDomain = keyof typeof component;');
    out.push('export type ComponentToken<D extends ComponentDomain> = keyof (typeof component)[D];');
    out.push(`export const cssVar = (name: SemanticToken | RuntimeToken): string => \`--\${prefix}-\${name}\`;`);
    out.push(`export const componentVar = <D extends ComponentDomain>(domain: D, name: ComponentToken<D> & string): string => \`--${c.componentPrefix}-\${domain}-\${name}\`;`);
  } else {
    out.push('export const cssVar = (name) => `--${prefix}-${name}`;');
    out.push(`export const componentVar = (domain, name) => \`--${c.componentPrefix}-\${domain}-\${name}\`;`);
  }
  out.push('export default { prefix, base, semantic, component, componentVars, componentRefs, domains, runtime, vars, refs, constants, cssVar, componentVar };', '');
  return out.join('\n');
}

export function renderDts(c) {
  // The .d.ts is the typed TS module minus values: reuse the TS source's literal types.
  const n = nest(c);
  const lit = (v, ind = '') => {
    if (Array.isArray(v)) return `readonly [${v.map((x) => lit(x)).join(', ')}]`;
    if (v === null) return 'null';
    if (typeof v === 'object') return `{\n${Object.entries(v).map(([k, x]) => `${ind}  readonly ${JSON.stringify(k)}: ${lit(x, ind + '  ')};`).join('\n')}\n${ind}}`;
    return JSON.stringify(v);
  };
  return [`// ${HEADER.replace(/\n/g, '\n// ')}`, '',
    `export declare const prefix: ${lit(c.prefix)};`,
    ...['base', 'semantic', 'component', 'componentVars', 'componentRefs', 'domains', 'runtime', 'vars', 'refs', 'constants'].map((k) => `export declare const ${k}: ${lit(n[k])};`),
    'export type SemanticToken = keyof typeof semantic;',
    'export type RuntimeToken = keyof typeof runtime;',
    'export type BaseGroup = keyof typeof base;',
    'export type ComponentDomain = keyof typeof component;',
    'export type ComponentToken<D extends ComponentDomain> = keyof (typeof component)[D];',
    'export declare function cssVar(name: SemanticToken | RuntimeToken): string;',
    'export declare function componentVar<D extends ComponentDomain>(domain: D, name: ComponentToken<D> & string): string;',
    'declare const _default: { prefix: typeof prefix; base: typeof base; semantic: typeof semantic; component: typeof component; componentVars: typeof componentVars; componentRefs: typeof componentRefs; domains: typeof domains; runtime: typeof runtime; vars: typeof vars; refs: typeof refs; constants: typeof constants; cssVar: typeof cssVar; componentVar: typeof componentVar };',
    'export default _default;', ''].join('\n');
}

export function renderResolved(c) {
  return JSON.stringify(nest(c), null, 2) + '\n';
}

export function build(src, out) {
  const c = compile(src);
  return {
    [join(out, 'dist/tokens.css')]: renderCss(c),
    [join(out, 'dist/tokens.js')]: renderJs(c),
    [join(out, 'dist/tokens.d.ts')]: renderDts(c),
    [join(out, 'dist/tokens.resolved.json')]: renderResolved(c),
    [join(out, 'src/tokens.ts')]: renderJs(c, { ts: true }),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = build(load(srcPath), outDir);
  let stale = 0;
  for (const [path, text] of Object.entries(files)) {
    if (check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== text) { console.error(`stale: ${path}`); stale++; }
    } else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }
  }
  if (check && stale) { console.error('Run: node scripts/build-tokens.mjs'); process.exit(1); }
  const c = compile(load(srcPath));
  const per = Object.keys(c.domains).map((d) => `${d} ${[...c.component.values()].filter((t) => t.domain === d).length}`).join(', ');
  console.log(`${check ? 'checked' : 'built'}: ${c.base.size} base, ${c.semantic.size} semantic, ${c.component.size} component (${per}), ${c.runtime.size} runtime tokens`);
}
