import assert from "node:assert/strict";
import { test } from "node:test";

// The pre-2026-11-06 placeHits: every hit against every other. The grid version must place the same boxes.
function bruteForce(boxes, target) {
  const half = target / 2;
  return boxes.map((box, i) => {
    if (box.width >= target && box.height >= target) return "none";
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    let left = cx - half;
    let right = cx + half;
    let top = cy - half;
    let bottom = cy + half;
    boxes.forEach((other, j) => {
      if (i === j || other.width === 0) return;
      const ox = other.left + other.width / 2;
      const oy = other.top + other.height / 2;
      if (Math.abs(oy - cy) < half * 2) {
        if (ox > cx) right = Math.min(right, (cx + ox) / 2);
        else if (ox < cx) left = Math.max(left, (cx + ox) / 2);
      }
      if (Math.abs(ox - cx) < half * 2) {
        if (oy > cy) bottom = Math.min(bottom, (cy + oy) / 2);
        else if (oy < cy) top = Math.max(top, (cy + oy) / 2);
      }
    });
    left = Math.min(left, box.left);
    right = Math.max(right, box.left + box.width);
    top = Math.min(top, box.top);
    bottom = Math.max(bottom, box.top + box.height);
    return [left - box.left, top - box.top, Math.max(0, right - left), Math.max(0, bottom - top)].map((n) => `${n}px`).join(" ");
  });
}

async function withDom(fn) {
  const { parseHTML } = await import("linkedom");
  const { document, window } = parseHTML("<html><body></body></html>");
  const saved = { document: globalThis.document, HTMLElement: globalThis.HTMLElement, Element: globalThis.Element, getComputedStyle: globalThis.getComputedStyle };
  // No CSS here: no tokens, so the target is the 44 px fallback.
  const getComputedStyle = () => ({ getPropertyValue: () => "" });
  Object.assign(globalThis, { document, HTMLElement: window.HTMLElement, Element: window.Element, getComputedStyle });
  try {
    await fn(document, window);
  } finally {
    Object.assign(globalThis, saved);
  }
}

function layout(document, boxes) {
  const root = document.createElement("div");
  document.body.append(root);
  const hits = boxes.map((b) => {
    const control = document.createElement("button");
    control.getBoundingClientRect = () => ({ ...b, right: b.left + b.width, bottom: b.top + b.height });
    const hit = document.createElement("span");
    hit.className = "nc-hit";
    control.append(hit);
    root.append(control);
    return hit;
  });
  return { root, hits };
}

test("placeHits: neighbours in a target-sized grid place the same hits as every-against-every", async () => {
  await withDom(async (document) => {
    const { placeHits } = await import("../src/primitives/controls.js");
    // A step grid (16 x 8 small cells, 3 px apart), a row of knobs, a big pad and a hidden control.
    const boxes = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) boxes.push({ left: 10 + c * 23, top: 200 + r * 23, width: 20, height: 20 });
    for (let k = 0; k < 6; k++) boxes.push({ left: 5 + k * 31, top: 40, width: 28, height: 28 });
    boxes.push({ left: 400, top: 40, width: 60, height: 60 });
    boxes.push({ left: 0, top: 0, width: 0, height: 0 });
    const { root, hits } = layout(document, boxes);
    placeHits(root); // no CSS here: the target is the 44 px fallback
    const want = bruteForce(boxes, 44);
    hits.forEach((hit, i) => {
      if (boxes[i].width === 0) return;
      const got = hit.style.display === "none" ? "none" : [hit.style.left, hit.style.top, hit.style.width, hit.style.height].join(" ");
      assert.equal(got, want[i], `hit ${i}`);
    });
  });
});

test("queueHits: once per frame however often a module repaints; at once without requestAnimationFrame", async () => {
  await withDom(async (document, window) => {
    const { queueHits } = await import("../src/primitives/controls.js");
    const { root, hits } = layout(document, [{ left: 0, top: 0, width: 20, height: 20 }]);
    const frames = [];
    window.requestAnimationFrame = (cb) => frames.push(cb);
    queueHits(root);
    queueHits(root);
    queueHits(root);
    assert.equal(frames.length, 1);
    assert.equal(hits[0].style.width, "");
    frames.shift()();
    assert.equal(hits[0].style.width, "44px");
    queueHits(root);
    assert.equal(frames.length, 1, "queues again after the frame");
    delete window.requestAnimationFrame;
    hits[0].style.width = "";
    queueHits(root);
    assert.equal(hits[0].style.width, "44px");
  });
});
