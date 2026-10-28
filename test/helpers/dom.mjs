// A small DOM for component tests (linkedom, a devDependency). Sets the globals the kit reads.
import { parseHTML } from "linkedom";

export function installDom() {
  const { window, document } = parseHTML("<!doctype html><html><head></head><body></body></html>");
  const names = ["window", "document", "HTMLElement", "HTMLButtonElement", "HTMLInputElement", "HTMLSelectElement",
    "HTMLCanvasElement", "Element", "Node", "Event", "CustomEvent"];
  for (const name of names) {
    const value = name === "window" ? window : name === "document" ? document : window[name];
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  window.getComputedStyle ??= () => ({ getPropertyValue: () => "" });
  globalThis.getComputedStyle = window.getComputedStyle;
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.matchMedia = window.matchMedia;
  return { window, document };
}

export function click(el) {
  el.dispatchEvent(new Event("click", { bubbles: true }));
}
