# Help (hover descriptions)

A short description of a control that appears when the pointer rests on its label. Every NetComposer instrument
uses it, so each label reads the same way everywhere (Peter, 2026-10-31).

## API

```ts
import { installHelpTips } from '@netcomposer/nc-ui';

installHelpTips();                       // once per page; safe to call again
```

```html
<label for="cutoff" data-nc-help="Where the filter starts cutting. Lower is darker.">Cutoff</label>
<input id="cutoff" type="range" aria-describedby="cutoff-help">
<span id="cutoff-help" hidden>Where the filter starts cutting. Lower is darker.</span>
```

## Behaviour

- One listener for the page and one bubble, reused. Nothing runs until the pointer moves.
- Shows after the pointer rests 350 ms (`HELP_DELAY`) on any `[data-nc-help]` element; leaving it, pressing,
  scrolling, Escape or the window losing focus hides it.
- Above the label, left-aligned with it, kept inside the viewport; below it when there is no room. In the Studio
  it keeps below `--nc-host-top`, the top of the part of the frame you can see.
- Touch never opens it (there is no hover). Screen readers get the same words through the control's
  `aria-describedby`: the app adds that, since only the app knows which control a label belongs to.
- Looks like the toast (dark slab, `toast-*` tokens), smaller and wrapping at 34ch. It never takes the pointer.

## Writing the words

One or two short sentences: what it does, then what turning it up or down sounds like. No jargon a newcomer
would need to look up; if a term is unavoidable, say what it means.
