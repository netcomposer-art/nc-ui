// nc-ui help: a short description that appears when the pointer rests on a label (Peter, 2026-10-31: every label
// in every instrument gets "a hover UI element that displays a brief desc of the feature").
//
// Mark anything with data-nc-help="the words" and call installHelpTips() once per page. One listener for the whole
// page; one bubble, reused; nothing runs until the pointer moves. Touch never opens it (there is no hover), and the
// app points each control's aria-describedby at the same words for screen readers.
// Framework-free DOM, so React, Preact and plain pages all use it. Styles: the .nc-ui-help rules in kit.js.

/** The attribute that carries a description. */
export const HELP_ATTR = "data-nc-help";
/** How long the pointer rests before the description shows (ms). */
export const HELP_DELAY = 350;

/**
 * Where the bubble goes: above the anchor, left-aligned with it and kept inside the viewport width; below it when
 * there is no room above `bandTop` (the top of the part of the page you can see: 0, or the Studio's --nc-host-top).
 * Rects are viewport px; returns viewport px { top, left, side }.
 */
export function placeHelp(anchor, tip, viewportWidth, bandTop = 0, gap = 6, edge = 8) {
  const above = anchor.top - gap - tip.height;
  const side = above >= bandTop + edge ? "above" : "below";
  const top = side === "above" ? above : anchor.bottom + gap;
  const left = Math.max(edge, Math.min(anchor.left, viewportWidth - edge - tip.width));
  return { top: Math.round(top), left: Math.round(left), side };
}

const installed = new WeakMap();

function hostTop(doc) {
  const n = parseFloat(doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue("--nc-host-top") ?? "");
  return Number.isFinite(n) ? n : 0;
}

/**
 * Turn on hover help for a document. Safe to call more than once (the second call returns the first handle).
 * @returns {{ uninstall(): void, hide(): void }}
 */
export function installHelpTips({ document: doc = globalThis.document, delay = HELP_DELAY } = {}) {
  if (!doc) return { uninstall() {}, hide() {} };
  const existing = installed.get(doc);
  if (existing) return existing;
  const win = doc.defaultView;
  let bubble = null;
  let current = null;
  let timer;

  const hide = () => {
    clearTimeout(timer);
    current = null;
    if (bubble) bubble.hidden = true;
  };
  const show = (el) => {
    const text = el.getAttribute(HELP_ATTR);
    if (!text) return;
    if (!bubble) {
      bubble = doc.createElement("div");
      bubble.className = "nc-ui-help";
      bubble.setAttribute("role", "tooltip");
      bubble.dataset.testid = "nc-help";
      doc.body.appendChild(bubble);
    }
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.style.visibility = "hidden";
    bubble.style.top = "0px";
    bubble.style.left = "0px";
    const r = el.getBoundingClientRect();
    const p = placeHelp(r, { width: bubble.offsetWidth, height: bubble.offsetHeight }, win.innerWidth, hostTop(doc));
    bubble.style.top = `${p.top}px`;
    bubble.style.left = `${p.left}px`;
    bubble.dataset.side = p.side;
    bubble.style.visibility = "";
  };
  const over = (e) => {
    if (e.pointerType === "touch") return;
    const el = e.target && e.target.closest ? e.target.closest(`[${HELP_ATTR}]`) : null;
    if (el === current) return;
    hide();
    if (!el) return;
    current = el;
    timer = setTimeout(() => {
      if (current === el && el.isConnected) show(el);
    }, delay);
  };
  const key = (e) => {
    if (e.key === "Escape") hide();
  };

  doc.addEventListener("pointerover", over);
  doc.addEventListener("pointerdown", hide, true);
  doc.addEventListener("keydown", key);
  win.addEventListener("scroll", hide, true);
  win.addEventListener("blur", hide);

  const handle = {
    hide,
    uninstall() {
      hide();
      doc.removeEventListener("pointerover", over);
      doc.removeEventListener("pointerdown", hide, true);
      doc.removeEventListener("keydown", key);
      win.removeEventListener("scroll", hide, true);
      win.removeEventListener("blur", hide);
      bubble?.remove();
      bubble = null;
      installed.delete(doc);
    },
  };
  installed.set(doc, handle);
  return handle;
}
