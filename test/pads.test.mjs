import assert from "node:assert/strict";
import { test } from "node:test";
import { padWavePath } from "../src/primitives/pads.js";

test("pad waveform: an area path in a 100 × 20 box, down-sampled to at most 48 columns", () => {
  assert.equal(padWavePath([]), "");
  const flat = padWavePath([-0.5, 0.5, -0.5, 0.5]);
  assert.match(flat, /^M0\.0 5\.00L100\.0 5\.00L100\.0 15\.00L0\.0 15\.00Z$/);
  const many = Array.from({ length: 400 }, (_, i) => (i % 2 ? 1 : -1));
  assert.equal(padWavePath(many).split("L").length, 96);
});
