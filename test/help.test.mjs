// nc-ui help: placement, the hover behaviour, and the kit rules.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { HELP_ATTR, HELP_DELAY, HELP_MOVE_HIDE, HELP_WARM_DELAY, HELP_WARM_MS, installHelpTips, placeHelp } from '../src/index.js';
import { kitCss } from '../src/primitives/kit.js';

test('placeHelp: above and left-aligned; below when there is no room; inside the viewport', () => {
  const tip = { width: 200, height: 40 };
  assert.deepEqual(placeHelp({ top: 300, bottom: 316, left: 50 }, tip, 1000), { top: 254, left: 50, side: 'above' });
  assert.deepEqual(placeHelp({ top: 30, bottom: 46, left: 50 }, tip, 1000), { top: 52, left: 50, side: 'below' });
  assert.equal(placeHelp({ top: 300, bottom: 316, left: 950 }, tip, 1000).left, 792, 'kept 8 px inside the right edge');
  // In the Studio the visible band can start lower than the frame's top.
  assert.equal(placeHelp({ top: 300, bottom: 316, left: 50 }, tip, 1000, 280).side, 'below');
});

function page() {
  const { document, window } = parseHTML(`<html><body><label id="a" ${HELP_ATTR}="Where the filter starts cutting.">Cutoff</label><span id="b">plain</span></body></html>`);
  window.getComputedStyle = () => ({ getPropertyValue: () => '' });
  window.innerWidth = 1000;
  const over = (el, pointerType = 'mouse', x = 10, y = 10) => {
    const e = new window.Event('pointerover', { bubbles: true });
    e.pointerType = pointerType;
    e.clientX = x;
    e.clientY = y;
    el.dispatchEvent(e);
  };
  const move = (el, x, y, buttons = 0) => {
    const e = new window.Event('pointermove', { bubbles: true });
    e.pointerType = 'mouse';
    e.clientX = x;
    e.clientY = y;
    e.buttons = buttons;
    el.dispatchEvent(e);
  };
  return { document, window, over, move };
}

test('hovering a marked label shows its words after the delay; leaving hides them; touch never opens it', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { document, over } = page();
    const help = installHelpTips({ document });
    assert.equal(installHelpTips({ document }), help, 'idempotent');
    over(document.getElementById('a'));
    assert.equal(document.querySelector('.nc-ui-help'), null, 'nothing before the delay');
    mock.timers.tick(HELP_DELAY);
    const bubble = document.querySelector('.nc-ui-help');
    assert.equal(bubble.textContent, 'Where the filter starts cutting.');
    assert.equal(bubble.getAttribute('role'), 'tooltip');
    assert.equal(bubble.hidden, false);
    over(document.getElementById('b'));
    assert.equal(bubble.hidden, true);
    over(document.getElementById('a'), 'touch');
    mock.timers.tick(HELP_DELAY);
    assert.equal(bubble.hidden, true, 'touch');
    help.uninstall();
    assert.equal(document.querySelector('.nc-ui-help'), null);
  } finally {
    mock.timers.reset();
  }
});

test('the kit styles the bubble from toast tokens and never lets it take the pointer', () => {
  const css = kitCss();
  const rule = /\.nc-ui-help \{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(rule, /pointer-events: none/);
  assert.match(rule, /background: var\(--nc-ui-toast-bg/);
  assert.match(css, /\[data-nc-help\] \{ cursor: help; \}/);
  assert.match(css, /\.nc-field\[data-nc-slider\] > \.nc-label\[data-nc-help\] \{ position: relative; z-index: 1; \}/, 'slider labels sit above the hit band for a mouse');
});

test('pin: the same bubble without a hover, hovers ignored; gone on a press, any key or the timeout', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { document, window, over } = page();
    const help = installHelpTips({ document });
    const b = document.getElementById('b');
    assert.equal(help.pin(b, 'Click a pad.', { ms: 8000 }), true);
    const bubble = document.querySelector('.nc-ui-help');
    assert.equal(bubble.textContent, 'Click a pad.');
    assert.equal(bubble.hidden, false);
    assert.ok(bubble.hasAttribute('data-pinned'));
    over(document.getElementById('a'));
    mock.timers.tick(HELP_DELAY);
    assert.equal(bubble.textContent, 'Click a pad.', 'a hover does not replace or hide it');
    mock.timers.tick(8000 - HELP_DELAY);
    assert.equal(bubble.hidden, true, 'gone after ms');
    assert.ok(!bubble.hasAttribute('data-pinned'));

    help.pin(b, 'Click a pad.');
    document.dispatchEvent(new window.Event('keydown'));
    assert.equal(bubble.hidden, true, 'any key');
    help.pin(b, 'Click a pad.');
    document.dispatchEvent(new window.Event('pointerdown'));
    assert.equal(bubble.hidden, true, 'a press');
    help.pin(document.getElementById('a'));
    assert.equal(bubble.textContent, 'Where the filter starts cutting.', 'its own words by default');
    help.hide();
    over(document.getElementById('a'));
    mock.timers.tick(HELP_DELAY);
    assert.equal(bubble.hidden, false, 'hover help works again after');
    assert.equal(help.pin(b), false, 'nothing to say: not shown');
    help.uninstall();
  } finally {
    mock.timers.reset();
  }
});

test('it waits for a still pointer: movement restarts the wait, moving on hides it, a drag never shows it', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const { document, over, move } = page();
    const help = installHelpTips({ document });
    const a = document.getElementById('a');
    over(a, 'mouse', 10, 10);
    mock.timers.tick(HELP_DELAY - 100);
    move(a, 30, 10); // working the control: the wait starts again
    mock.timers.tick(HELP_DELAY - 100);
    assert.equal(document.querySelector('.nc-ui-help'), null, 'not while the pointer moves');
    move(a, 32, 11); // a tremor is still a rest
    mock.timers.tick(100);
    const bubble = document.querySelector('.nc-ui-help');
    assert.equal(bubble?.hidden, false, 'shown after a full rest');
    move(a, 32 + HELP_MOVE_HIDE + 1, 11);
    assert.equal(bubble.hidden, true, 'moving on hides it');
    // Warm: resting again soon shows it after the short wait.
    mock.timers.tick(HELP_WARM_DELAY);
    assert.equal(bubble.hidden, false, 'warm: the short wait');
    over(document.getElementById('b')); // away, and back after the warm time
    mock.timers.tick(HELP_WARM_MS + 10);
    over(a, 'mouse', 120, 11);
    mock.timers.tick(HELP_WARM_DELAY);
    assert.equal(bubble.hidden, true, 'cold again: the full wait');
    mock.timers.tick(HELP_DELAY);
    assert.equal(bubble.hidden, false);
    // A held button (a drag) hides it and never starts a wait.
    move(a, 140, 11, 1);
    assert.equal(bubble.hidden, true);
    mock.timers.tick(HELP_DELAY * 2);
    assert.equal(bubble.hidden, true, 'not during a drag');
    help.uninstall();
  } finally {
    mock.timers.reset();
  }
});
