import { filterPaint, readCanvasFont, readLive } from "../alias.js";

function sizeOf(canvas) {
  const w = Math.max(1, canvas.clientWidth || 0);
  const h = Math.max(1, canvas.clientHeight || 0);
  const ratio = canvas.ownerDocument.defaultView?.devicePixelRatio || 1;
  const pw = Math.max(1, Math.floor(w * ratio));
  const ph = Math.max(1, Math.floor(h * ratio));
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext("2d");
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w, h };
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

/** Draw a display from the live cascade. Call again after a token change. */
export function paintCanvas(canvas, control) {
  const { ctx, w, h } = sizeOf(canvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const font = readCanvasFont(canvas);
  if (control.paint === "swatch") {
    const accent = readLive(canvas, "accent");
    const step = readLive(canvas, "rhythm.step-cell-on");
    canvas.dataset.ncAccent = accent;
    canvas.dataset.ncStep = step;
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w / 2, h);
    ctx.fillStyle = step;
    ctx.fillRect(w / 2, 0, w / 2, h);
    return;
  }
  if (control.paint === "filter") {
    const mode = control.mode ?? "lp";
    const stroke = readLive(canvas, filterPaint(mode));
    const axis = readLive(canvas, "divider");
    const cutoff = clamp(control.cutoff ?? 0.5);
    const width = 0.08 + (1 - clamp(control.resonance ?? 0.2)) * 0.22;
    ctx.strokeStyle = axis;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.lineTo(w, h * 0.72);
    ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const f = x / Math.max(1, w);
      let g = 0;
      if (mode === "lp") g = f < cutoff ? 1 : Math.max(0, 1 - (f - cutoff) / width);
      else if (mode === "hp") g = f > cutoff ? 1 : Math.max(0, 1 - (cutoff - f) / width);
      else g = Math.max(0, 1 - Math.abs(f - cutoff) / width);
      const y = h * 0.78 - g * h * 0.62;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.fillStyle = readLive(canvas, "text-sub");
    ctx.font = font;
    ctx.fillText(mode.toUpperCase(), 0, h);
    canvas.dataset.ncAccent = stroke;
    return;
  }
  if (control.paint === "envelope") {
    ctx.strokeStyle = readLive(canvas, "accent");
    ctx.beginPath();
    const decay = Math.max(0.05, control.decay ?? 0.4);
    for (let x = 0; x <= w; x++) {
      const t = x / Math.max(1, w);
      const y = (h - 4) * (1 - Math.exp((-t * 4) / decay));
      ctx.lineTo(x, h - y);
    }
    ctx.stroke();
    canvas.dataset.ncAccent = ctx.strokeStyle;
    return;
  }
  if (control.paint === "meter") {
    const level = clamp(control.level ?? 0);
    ctx.fillStyle = readLive(canvas, "divider");
    ctx.fillRect(0, h * 0.4, w, h * 0.2);
    ctx.fillStyle = readLive(canvas, "accent");
    ctx.fillRect(0, h * 0.4, w * level, h * 0.2);
    canvas.dataset.ncAccent = ctx.fillStyle;
    return;
  }
  const steps = Math.max(1, control.steps ?? 16);
  const step = (((control.step ?? 0) % steps) + steps) % steps;
  ctx.fillStyle = readLive(canvas, "rhythm.step-cell-off");
  ctx.fillRect(0, h * 0.45, w, h * 0.1);
  ctx.fillStyle = readLive(canvas, "rhythm.playhead");
  ctx.fillRect((step / steps) * w, h * 0.3, Math.max(1, w / steps), h * 0.4);
  canvas.dataset.ncAccent = readLive(canvas, "accent");
}
