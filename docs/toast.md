# Toast

One short message with one action. First user: ASTRID's Surprise ("Surprise applied" + Undo). Shared with Rhythm.

## API

```ts
import '@netcomposer/nc-ui/toast.css';
import { createToast, TOAST_DURATION, toastAnnouncement, pickToastPlacement } from '@netcomposer/nc-ui/toast';

const t = createToast({
  message: 'Surprise applied',    // required
  actionLabel: 'Undo',            // optional; omit for a plain message
  onAction: () => undo(),         // runs on the action, then the toast closes
  duration: 5500,                 // ms; default TOAST_DURATION = constants['toast-duration']
  onClose: (reason) => {},        // 'timeout' | 'action' | 'close', once, as it starts to fade
  avoid: [keysEl, slotsEl],       // never cover these: it takes the top edge if they sit in the bottom band
  anchor: slotsRowEl,             // optional: sit just below this element instead (left-aligned, scrolls with the page)
  host: document.body,            // optional mount point
});
t.close();                        // e.g. on the next edit; safe to call twice
await t.closed;                   // resolves once it has left the DOM
```

## Behaviour

- Fades in with `--nc-ui-motion-fade` (+`-easing`), out with `--nc-ui-motion-fade-out` (+`-easing`). Opacity only; position never animates. `prefers-reduced-motion` drops the fades.
- Stays `duration` ms. Hover or focus pauses the clock (WCAG 2.2.1); leaving resumes with the time that was left.
- One `role="status" aria-live="polite"` region per host, created once and kept. Each toast writes `message, actionLabel` into it ("Surprise applied, Undo").
- The action is a real `<button type="button">` with a 44 × 44 px minimum (`--nc-ui-toast-target`).
- Default: fixed, centred, `--nc-ui-toast-offset` from the bottom (or top) edge, inside the safe area.
- With `anchor`: absolutely positioned `--nc-ui-toast-anchor-gap` below the anchor, left-aligned with it, pushed further down past any `avoid` rect it would cover, clamped inside the viewport width. Falls back to the edge placement if the anchor is off screen or the box would leave the viewport.
- Only the toast's own box takes taps. There is no wrapper; the live region and a closing toast are `pointer-events: none`.

## Tokens (semantic, no raw colours)

| token | base | use |
|---|---|---|
| `toast-bg` | `color.ink` | background |
| `toast-text` | `color.paper` | message |
| `toast-action` | `color.white` | action label, its focus ring |
| `toast-font-size` | `font-size.sm` | message and action |
| `toast-pad-x` | `space.16` | left padding, action side padding |
| `toast-gap` | `space.8` | message to action |
| `toast-radius` | `radius.xs` | corners |
| `toast-offset` | `space.16` | distance from the viewport edge |
| `toast-anchor-gap` | `space.8` | distance below the anchor (anchored placement) |
| `toast-target` | `space.44` | action hit area (both ways) |

Constant `toast-duration`: 5500 ms. No toast motion token: motion stays in the four motion roles (`test/motion.test.mjs`).

## React binding

nc-ui has no dependencies, so the binding lives in the app (ASTRID: `artifacts/netcomposer-synth/src/components/toast.tsx`):

```tsx
export function Toast({ message, actionLabel, onAction, duration, onClose, avoid }: ToastProps) {
  const latest = useRef({ onAction, onClose }); latest.current = { onAction, onClose };
  useEffect(() => {
    const t = createToast({ message, actionLabel, duration, avoid: avoid?.(),
      onAction: () => latest.current.onAction?.(), onClose: (r) => latest.current.onClose?.(r) });
    return () => t.close();          // unmount = fade out
  }, [message, actionLabel, duration]);
  return null;
}
// Mount with a new key per event: {toast && <Toast key={toast.id} ... />}
```
