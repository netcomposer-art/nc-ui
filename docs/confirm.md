# Confirm

One in-app question before a destructive action, never `window.confirm`. First user: Rhythm's Reset. Shared, so
Bass and the other NC apps ask the same way.

## API

```ts
import { confirm } from '@netcomposer/nc-ui';

const ok = await confirm({
  title: 'Reset Rhythm?',          // required; the dialog's accessible name
  body: 'Clears the pattern.',     // required; one line, the accessible description
  confirmLabel: 'Reset',           // optional; default 'Confirm'
  cancelLabel: 'Cancel',           // optional; default 'Cancel'
  danger: true,                    // optional; default false: the action fills with `danger`
  root: document.body,             // optional mount point; default document.body
  returnFocus: resetButton,        // optional; focused on close; default whatever had focus when it opened
  signal: controller.signal,       // optional AbortSignal; abort() closes it from code and resolves false
});
if (ok) reset();
```

## Behaviour

- Resolves `true` only on the confirm button. Cancel, Escape, a backdrop tap (pointer down and up on the backdrop),
  an aborted `signal`, and a second `confirm()` while one is open resolve `false`. One dialog at a time; the open one stays.
- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` (title) and `aria-describedby` (body).
- Cancel has focus when it opens. Tab and Shift+Tab move between the two buttons only. Enter acts on the focused
  button, so the focused one always shows the ring (`:focus`, not only `:focus-visible`, even after a tap). On close
  focus goes to `returnFocus` when given, else back to where it was. Pass the opener: Safari on Mac does not focus a
  clicked button, so the element that had focus is the page.
- `signal` (an `AbortSignal`) closes it from code, e.g. when the app tears down or another tab changes the state
  being confirmed: it resolves `false` and cleans up exactly like Cancel (listeners off, inert removed, focus
  returned, layer faded out). A signal that is already aborted resolves `false` without opening.
- The root's other children are `inert` while it is open (ones that were already inert stay inert). Keys are caught on
  the window in the capture phase, so page shortcuts (Space, digits) do not fire under it.
- Pointer events and click, so touch, pen and mouse behave the same. Buttons are at least `target-min` (44 px) tall on
  every pointer, desktop included.
- The layer fades in with `motion-fade` and out with `motion-fade-out`; the box scales from .96 with `motion-slide`.
  `prefers-reduced-motion: reduce` turns all of it off. It answers at once; the fade-out only removes the layer.
- Self-contained: no dependencies and no `kit.js`. Vendor `src/primitives/confirm.js` and `confirm.css` side by side,
  byte-identical. `confirm.js` links `confirm.css` once per document (`<link rel="stylesheet" data-nc-ui-confirm>`,
  `new URL("./confirm.css", import.meta.url)`, so Vite and other bundlers emit it as an asset) when it is imported, so
  the sheet is in before the first question; `confirmCss` is that URL. Every `var(--nc-ui-…)` in `confirm.css` carries
  the token's current value as its fallback, so the dialog looks the same in an app without nc-ui tokens, and an app
  that has the tokens (Rhythm) still themes it. `test/confirm.test.mjs` checks every fallback against `dist/tokens.js`
  and the `check:theme` lint rejects a fallback that differs. Styles use semantic tokens only: `dialog-scrim` (ink at
  35%), `dialog-width` (320px), `dialog-pad`, `dialog-gap`, `dialog-button-gap`, `dialog-radius`, `dialog-leading` (`leading.readout`, 1.35),
  `on-danger` (paper; 5.27:1 on `danger`), plus `surface-page`, `text`, `text-sub`, `divider`, `danger`,
  `focus-ring`, `focus-width-strong`, `target-min`, `title-size-slim`, `body-size`, `readout-size`, `label-tracking`.

## ask(): one text field

```ts
import { ask } from '@netcomposer/nc-ui';

const url = await ask({
  title: 'Load a plugin from a URL',
  body: 'Paste the address of its plugin.json.',
  field: { label: 'Address', placeholder: 'https://…/plugin.json', type: 'url' },
  confirmLabel: 'Next',
  returnFocus: opener,
});
if (url) …;              // the text, trimmed; null for Cancel, Escape, the backdrop or an aborted signal
```

The same dialog, look and rules as `confirm()`, with a labelled field between the line and the buttons. The field has
focus when it opens; Tab and Shift+Tab move field, Cancel, action. Enter in the field acts. The action is disabled
(and skipped by Tab) while the field is empty. Styles are in confirm.css (`.nc-ui-confirm-field`,
`.nc-ui-confirm-label`, `.nc-ui-confirm-input`).
