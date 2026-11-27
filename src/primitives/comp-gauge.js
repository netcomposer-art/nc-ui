// nc-ui compressor gauge (Peter, 2026-11-27: "a smart level gauge on every compressor hack. Use the classic approach
// to displaying input, compression level, output etc. Use bar graphs not anything analog-ish"; option B, "I like B").
// Three rows inside a compressor's card: IN and OUT as horizontal bars on the dBFS scale (−48 to 0, the strips' and the
// header meter's), GR (gain reduction) as a bar filling from the right on its own 0 to −24 dB, the threshold as a tick
// on IN, a peak hold on each (1.5 s, motion-meter-hold), the numbers at the row ends, the dBFS ticks under them.
// Colours: IN and OUT in ink like every NetComposer meter, the hot colour (fx-level-hot) within 1 dB of full scale, GR
// and the threshold tick in the instrument's own colour (--nc-gauge-gr, which the app sets to its instrument token;
// nc-ui's accent without one). Switched off: GR and OUT rest, grey; IN keeps moving (what reaches the compressor).
// nc-ui was created by Peter Semmelhack (https://psem.me/). MIT License.
//
// The source is the card's meter (nc-fx's fxMeter(fx, id)): read() gives { in, out, gr }, sample peaks (1 = full
// scale) and the most gain reduction since the last read in dB (0 or more). Open only while the gauge is on screen and
// the page is visible; about 30 frames a second while sound flows, 4 a second after a while of silence.
//
// Self-contained (no imports), so an app that vendors only this file (ASTRID's React Hacks panel) draws the same gauge.

/** The IN and OUT scale (dBFS), as the strips' and the card header's meter. */
export const GAUGE_FLOOR_DB = -48;
/** The GR scale: 0 to this many dB of gain reduction. */
export const GAUGE_GR_DB = 24;
/** The hot colour from here up (dBFS). */
export const GAUGE_HOT_DB = -1;
const FRAME_MS = 32;
const IDLE_MS = 250;
const SILENT_MS = 1200;
const FALL_FALLBACK = 0.2;
const HOLD_FALLBACK = 1.5;
const TICKS = [-48, -36, -24, -12, 0];
const MINUS = "−";

/** dBFS (or −Infinity) of a sample peak. */
const dbOf = (peak) => (peak > 0 ? 20 * Math.log10(peak) : -Infinity);
/** A dBFS level as a 0..1 position on the −48..0 scale. */
export function gaugePosition(db) {
  if (!(db > GAUGE_FLOOR_DB)) return 0;
  return db >= 0 ? 1 : (db - GAUGE_FLOOR_DB) / -GAUGE_FLOOR_DB;
}
/** Gain reduction (dB, 0 or more) as a 0..1 share of the GR scale. */
export function gaugeGrPosition(gr) {
  if (!(gr > 0)) return 0;
  return gr >= GAUGE_GR_DB ? 1 : gr / GAUGE_GR_DB;
}
/** "−6.2", "0.0", or "—" under the scale; "−7.0 dB" for GR. */
export function gaugeText(db, gr = false) {
  if (gr) return `${db > 0.05 ? MINUS : ""}${Math.abs(db).toFixed(1)} dB`;
  if (!(db > GAUGE_FLOOR_DB)) return "—";
  const r = Math.round(db * 10) / 10;
  return `${r < 0 ? MINUS : ""}${Math.abs(r).toFixed(1)}`;
}

function span(doc, cls, text) {
  const el = doc.createElement("span");
  el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** The gauge element: three rows (label, bar, number) and the dBFS ticks. Decorative (aria-hidden): help says it. */
export function createCompGauge(doc = globalThis.document) {
  const el = doc.createElement("div");
  el.className = "nc-comp-gauge";
  el.setAttribute("aria-hidden", "true");
  for (const [which, label] of [["in", "In"], ["gr", "GR"], ["out", "Out"]]) {
    el.append(span(doc, "nc-comp-gauge-label", label));
    const bar = span(doc, "nc-comp-gauge-bar");
    bar.dataset.ncGauge = which;
    bar.append(span(doc, "nc-comp-gauge-fill"), span(doc, "nc-comp-gauge-peak"));
    if (which === "in") bar.append(span(doc, "nc-comp-gauge-th"));
    el.append(bar, span(doc, "nc-comp-gauge-val", which === "gr" ? gaugeText(0, true) : gaugeText(-Infinity)));
  }
  const ticks = span(doc, "nc-comp-gauge-ticks");
  for (const db of TICKS) {
    const t = span(doc, "", db === 0 ? "0" : `${MINUS}${-db}`);
    t.style.left = `${gaugePosition(db) * 100}%`;
    ticks.append(t);
  }
  el.append(span(doc, ""), ticks, span(doc, ""));
  return el;
}

const RECS = new WeakMap();
const LOOPS = new WeakMap();

function seconds(el, name, fallback) {
  const view = el.ownerDocument?.defaultView;
  if (typeof view?.getComputedStyle !== "function") return fallback;
  const raw = String(view.getComputedStyle(el).getPropertyValue(`--nc-ui-${name}`) ?? "").trim();
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n / 1000 : n;
}
const nowOf = (loop) => loop.doc.defaultView?.performance?.now() ?? Date.now();

function loopOf(doc) {
  let loop = LOOPS.get(doc);
  if (loop) return loop;
  const view = doc.defaultView;
  loop = { doc, recs: new Set(), io: null, raf: 0, timer: 0, last: 0, loud: 0, idle: false };
  const IO = view?.IntersectionObserver;
  if (IO)
    loop.io = new IO((entries) => {
      for (const e of entries) {
        const rec = RECS.get(e.target);
        if (!rec) continue;
        rec.seen = e.isIntersecting;
        sync(rec);
      }
      kick(loop);
    });
  doc.addEventListener("visibilitychange", () => {
    for (const rec of loop.recs) sync(rec);
    kick(loop);
  });
  LOOPS.set(doc, loop);
  return loop;
}

function sync(rec) {
  const shown = rec.loop.io ? rec.seen && rec.el.isConnected : rec.el.isConnected;
  const want = !rec.dead && !!rec.source && shown && rec.loop.doc.visibilityState !== "hidden";
  if (want && !rec.open) {
    const ok = typeof rec.source.open === "function" ? rec.source.open() : true;
    rec.open = ok !== false;
    if (rec.open) rec.loop.loud = nowOf(rec.loop);
  } else if (!want && rec.open) {
    rec.open = false;
    rec.source?.close?.();
    rest(rec);
  }
}

function kick(loop) {
  let any = false;
  for (const rec of loop.recs) if (rec.open) any = true;
  if (!any) return halt(loop);
  if (loop.idle && loop.timer) {
    loop.doc.defaultView?.clearTimeout(loop.timer);
    loop.timer = 0;
    loop.idle = false;
    loop.loud = nowOf(loop);
  }
  if (!loop.raf && !loop.timer) schedule(loop, false);
}

function schedule(loop, idle) {
  const view = loop.doc.defaultView;
  if (!view) return;
  if (idle) loop.timer = view.setTimeout(() => ((loop.timer = 0), frame(loop, nowOf(loop))), IDLE_MS);
  else if (typeof view.requestAnimationFrame === "function")
    loop.raf = view.requestAnimationFrame((t) => ((loop.raf = 0), frame(loop, t)));
  else loop.timer = view.setTimeout(() => ((loop.timer = 0), frame(loop, nowOf(loop))), FRAME_MS);
}

function halt(loop) {
  const view = loop.doc.defaultView;
  if (loop.raf) view?.cancelAnimationFrame?.(loop.raf);
  if (loop.timer) view?.clearTimeout(loop.timer);
  loop.raf = 0;
  loop.timer = 0;
  loop.idle = false;
  loop.last = 0;
}

function frame(loop, t) {
  if (loop.last && !loop.idle && t - loop.last < FRAME_MS - 4) return schedule(loop, false);
  const dt = loop.last ? Math.min(0.25, (t - loop.last) / 1000) : FRAME_MS / 1000;
  loop.last = t;
  let any = false;
  let showing = false;
  for (const rec of loop.recs) {
    if (!rec.el.isConnected) {
      if (rec.placed) detach(rec);
      continue;
    }
    rec.placed = true;
    if (!rec.open) continue;
    any = true;
    if (step(rec, dt, t)) loop.loud = t;
    if (rec.disp.some((v) => v > 0)) showing = true;
  }
  if (!any) return halt(loop);
  loop.idle = t - loop.loud > SILENT_MS && !showing;
  schedule(loop, loop.idle);
}

/** One frame: read, ballistics (rise at once, fall over motion-meter-fall), peak holds, paint. */
function step(rec, dt, t) {
  if (rec.fall < 0) {
    rec.fall = seconds(rec.el, "motion-meter-fall", FALL_FALLBACK);
    rec.hold = seconds(rec.el, "motion-meter-hold", HOLD_FALLBACK);
  }
  let v = null;
  try {
    v = rec.source.read();
  } catch {
    v = null;
  }
  const on = rec.on();
  if (!on && rec.wasOn) {
    // Switched off: GR and OUT rest at once (no held peak from before).
    rec.disp[1] = rec.disp[2] = 0;
    rec.peakDb[1] = 0;
    rec.peakDb[2] = -Infinity;
  }
  rec.wasOn = on;
  const inDb = dbOf(Number(v?.in) || 0);
  const outDb = on ? dbOf(Number(v?.out) || 0) : -Infinity;
  const gr = on ? Math.max(0, Number(v?.gr) || 0) : 0;
  const now = [gaugePosition(inDb), gaugeGrPosition(gr), gaugePosition(outDb)];
  const dbs = [inDb, gr, outDb];
  const decay = rec.fall > 0 ? Math.exp(-dt / rec.fall) : 0;
  for (let i = 0; i < 3; i++) {
    const p = now[i];
    rec.disp[i] = p >= rec.disp[i] ? p : p + (rec.disp[i] - p) * decay;
    if (rec.disp[i] < 0.001) rec.disp[i] = 0;
    // Peak hold: the highest for motion-meter-hold, then it follows the bar down.
    const louder = dbs[i] >= rec.peakDb[i];
    if (louder || t - rec.peakAt[i] > rec.hold * 1000) {
      if (louder) {
        rec.peakDb[i] = dbs[i];
        rec.peakAt[i] = t;
      } else rec.peakDb[i] = i === 1 ? Math.max(gr, rec.peakDb[i] - dt * 20) : Math.max(dbs[i], rec.peakDb[i] - dt * 20);
    }
  }
  paint(rec, on);
  return inDb > GAUGE_FLOOR_DB || gr > 0;
}

function paint(rec, on) {
  const rows = rec.el.querySelectorAll(":scope > .nc-comp-gauge-bar");
  const vals = rec.el.querySelectorAll(":scope > .nc-comp-gauge-val");
  const off = on ? "false" : "true";
  if (rec.el.dataset.ncOff !== off) rec.el.dataset.ncOff = off;
  for (let i = 0; i < 3; i++) {
    const bar = rows[i];
    if (!bar) continue;
    const gr = i === 1;
    const v = Math.round(rec.disp[i] * 1000) / 1000;
    const pk = gr ? gaugeGrPosition(rec.peakDb[i]) : gaugePosition(rec.peakDb[i]);
    const hot = !gr && rec.peakDb[i] >= GAUGE_HOT_DB ? "true" : "false";
    const key = `${v}|${Math.round(pk * 1000)}|${hot}`;
    if (rec.shown[i] !== key) {
      rec.shown[i] = key;
      const fill = bar.children[0];
      const peak = bar.children[1];
      fill.style.transform = `scaleX(${v})`;
      peak.style.left = gr ? `${(1 - pk) * 100}%` : `${pk * 100}%`;
      peak.hidden = pk <= 0;
      bar.dataset.hot = hot;
    }
    const text = gaugeText(rec.peakDb[i], gr);
    if (vals[i] && vals[i].textContent !== text) vals[i].textContent = text;
  }
  const th = rec.el.querySelector(".nc-comp-gauge-th");
  const thDb = rec.threshold();
  const left = typeof thDb === "number" && Number.isFinite(thDb) ? `${gaugePosition(thDb) * 100}%` : "";
  if (th && th.style.left !== left) {
    th.style.left = left;
    th.hidden = !left;
  }
}

function rest(rec) {
  rec.disp = [0, 0, 0];
  rec.peakDb = [-Infinity, 0, -Infinity];
  rec.peakAt = [0, 0, 0];
  rec.shown = ["", "", ""];
  paint(rec, rec.on());
}

function detach(rec) {
  if (rec.open) {
    rec.open = false;
    rec.source?.close?.();
  }
  rec.dead = true;
  rec.loop.recs.delete(rec);
  rec.loop.io?.unobserve(rec.el);
  if (RECS.get(rec.el) === rec) RECS.delete(rec.el);
}

/**
 * Drive a gauge (createCompGauge) from the card's meter: `{ source, threshold?(): dB, on?(): boolean }`. Returns
 * { set(next), destroy() }; set() takes the same shape (a new source swaps it; the getters are read every frame).
 */
export function bindCompGauge(el, opts) {
  const doc = el.ownerDocument ?? globalThis.document;
  const loop = loopOf(doc);
  const rec = {
    el, loop, open: false, dead: false, seen: false, placed: false, source: opts?.source ?? null,
    threshold: opts?.threshold ?? (() => null), on: opts?.on ?? (() => true), wasOn: true,
    disp: [0, 0, 0], peakDb: [-Infinity, 0, -Infinity], peakAt: [0, 0, 0], shown: ["", "", ""], fall: -1, hold: HOLD_FALLBACK,
  };
  RECS.set(el, rec);
  loop.recs.add(rec);
  loop.io?.observe(el);
  rest(rec);
  if (!loop.io) {
    const view = doc.defaultView;
    const later = () => {
      sync(rec);
      kick(loop);
    };
    if (typeof view?.requestAnimationFrame === "function") view.requestAnimationFrame(later);
    else setTimeout(later, 0);
  }
  return {
    set(next) {
      if (rec.dead) return;
      rec.threshold = next?.threshold ?? rec.threshold;
      rec.on = next?.on ?? rec.on;
      const src = next?.source ?? null;
      if (src !== rec.source) {
        if (rec.open) {
          rec.open = false;
          rec.source?.close?.();
        }
        rec.source = src;
        rest(rec);
      }
      paint(rec, rec.on());
      sync(rec);
      kick(loop);
    },
    destroy() {
      detach(rec);
    },
  };
}
