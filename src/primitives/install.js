import { applyAlias } from "../alias.js";
import { kitCss } from "./kit.js";

let styleEl = null;

/** Inject the kit sheet and the rhythm tier. Safe to call more than once. */
export function installTheme(doc = globalThis.document) {
  if (!doc?.documentElement) return;
  applyAlias(doc.documentElement);
  if (styleEl && styleEl.ownerDocument === doc) return;
  const style = doc.createElement("style");
  style.dataset.ncKit = "";
  style.textContent = kitCss();
  doc.head.append(style);
  styleEl = style;
}

export function installedCss() {
  return styleEl?.textContent ?? "";
}
