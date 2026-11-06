// confirm(): `lines` and `extra` in a DOM (linkedom). The rest of its behaviour is tested by its consumers.
import assert from "node:assert/strict";
import { test } from "node:test";
import { click, installDom } from "./helpers/dom.mjs";

const { window, document } = installDom();
window.requestAnimationFrame = (f) => setTimeout(f, 0);
// linkedom keeps no focus: focus() sets document.activeElement here.
let focused = null;
window.HTMLElement.prototype.focus = function () {
  focused = this;
};
Object.defineProperty(document, "activeElement", { get: () => focused, configurable: true });
// confirm.css counts as in (no load event in linkedom), so the dialog shows at once.
const sheet = document.createElement("link");
sheet.dataset.ncUiConfirm = "";
document.head.append(sheet);
const { confirm } = await import("../src/primitives/confirm.js");

const key = (k) => {
  const e = new window.Event("keydown", { bubbles: true });
  e.key = k;
  window.dispatchEvent(e);
};
const box = () => [...document.querySelectorAll(".nc-ui-confirm")].at(-1);
const tick = () => new Promise((r) => setTimeout(r, 0));

test("lines go under the body, a danger one marked, and all describe the dialog", async () => {
  const answer = confirm({
    title: "Reset the Studio?",
    body: "The music stops.",
    lines: ["Kept: your samples.", { text: "Your last Rec take isn't saved.", tone: "danger" }],
  });
  await tick();
  const ps = [...box().querySelectorAll(".nc-ui-confirm-body")];
  assert.deepEqual(
    ps.map((p) => p.textContent),
    ["The music stops.", "Kept: your samples.", "Your last Rec take isn't saved."],
  );
  assert.equal(ps[1].dataset.tone, undefined);
  assert.equal(ps[2].dataset.tone, "danger");
  assert.equal(box().getAttribute("aria-describedby"), ps.map((p) => p.id).join(" "));
  assert.equal(box().querySelector("[data-nc-confirm='extra']"), null);
  key("Escape");
  assert.equal(await answer, false);
});

test("extra runs its action and keeps the dialog open; Enter on it never confirms", async () => {
  let ran = 0;
  const answer = confirm({
    title: "Reset the Studio?",
    body: "The music stops.",
    extra: { label: "Save Scene first", onAction: () => ran++ },
    confirmLabel: "Reset",
    danger: true,
  });
  await tick();
  const extra = box().querySelector("[data-nc-confirm='extra']");
  const buttons = [...box().querySelectorAll("button")];
  assert.equal(extra.textContent, "Save Scene first");
  assert.equal(extra.className, "nc-ui-confirm-extra");
  // Above the two buttons, before Cancel in the tab order; Cancel has the focus.
  assert.deepEqual(buttons.map((b) => b.dataset.ncConfirm), ["extra", "cancel", "ok"]);
  assert.equal(document.activeElement?.dataset.ncConfirm, "cancel");
  click(extra);
  assert.equal(ran, 1);
  assert.ok(box()?.isConnected, "still open");
  extra.focus();
  key("Enter");
  assert.equal(ran, 2);
  assert.ok(box()?.isConnected, "Enter on the extra action leaves it open");
  click(box().querySelector("[data-nc-confirm='ok']"));
  assert.equal(await answer, true);
});
