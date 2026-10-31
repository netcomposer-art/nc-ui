// nc-ui help: placement, the hover behaviour, and the kit rules.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { HELP_ATTR, HELP_DELAY, installHelpTips, placeHelp } from '../src/index.js';
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
  const over = (el, pointerType = 'mouse') => {
    const e = new window.Event('pointerover', { bubbles: true });
    e.pointerType = pointerType;
    el.dispatchEvent(e);
  };
  return { document, window, over };
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
