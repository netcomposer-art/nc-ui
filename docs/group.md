# Group (a collapsible run of controls)

A module's controls that most people leave alone, folded under one header so the rest stays short. First user:
NYX's "Tune & shape" (Tune, Fine, Fit, Attack, Decay, Filter, Resonance) under Slices (Peter, 2026-10-31).

## API

```ts
{
  type: "group",
  id: "tune-shape",
  title: "Tune & shape",
  summary: "+3 st · decay 450 ms",   // shown beside the title while closed; "" shows nothing extra
  open: false,                         // the first state, before this browser has toggled it (default false)
  collapse: "phone",                   // optional: fold only on phones; flat on tablets and desktops (below)
  onToggle: (open) => {},              // optional: after the kit has opened or closed it
  controls: [ /* any controls, labels included; a group may hold a group */ ],
}
```

The group's controls are the module's own: they are found by id, patched in place on `update()`, and their
callbacks run as anywhere else in the module.

## Behaviour

- The header is a real `<button>`: `aria-expanded`, `aria-controls` naming the body (`<id>-group-body`, a
  `role="group"` labelled by the button), Enter and Space. A `−` / `+` mark at the end shows the state.
- It looks like the FX card's More toggle (`.nc-ui-more > summary`): label size, weight and tracking, uppercase,
  `text-sub`, hover to `text`, the focus ring; on a coarse pointer the same invisible `target-min` pad. The summary
  is in the readout face at `readout-size-small`, on its own line under the title (wrapping, never cut, so a
  narrow column still shows all of it), and hidden while open or empty.
- It opens and closes at once: no transition or animation.
- Open state is a browser-wide UI preference, kept like the modules' hide: `localStorage["netcomposer.groups.v1"]`
  (`GROUP_OPEN_KEY`), `{ "<group id>": true | false }`, written on every toggle. It is never part of an app's
  document, files or presets. `readGroups()` / `writeGroup()` are exported for apps that need them.
- Open, its controls are spaced as the module's own (`module-pad`).

## Phone-only (`collapse: "phone"`)

Peter, 2026-11-01: "In general, use your best judgement and collapse the functions on all modules that are advanced
and/or lesser used functions" (on an iPhone). A module puts its advanced or lesser-used controls in a group with
`collapse: "phone"`:

- On a phone (max-width 768 px; a landscape phone, `LANDSCAPE_PHONE`; or a frame a host marks
  `html[data-nc-landscape]`, as the Studio does) it is an ordinary group, closed until this browser toggles it.
- On a tablet or desktop it is flat: no header, and the group and its body are `display: contents`, so its controls
  lay out as the section's own, exactly as before they were grouped.
- It is CSS only (`.nc-group[data-nc-collapse="phone"]`), so turning the phone round re-lays it out with no script.
  The open state is the group's usual one (by id); it only shows on phones.
- Never put a control needed mid-performance in one (Play/Stop, Panic, pads, keys, a main level).
- Give it a `summary` of what's inside with the current values ("Swing 0% · Sync follower"), so a closed group still
  says what it holds.

## Classes

`.nc-group[data-nc-id][data-nc-open]` › `button.nc-group-toggle` (`.nc-group-title`, `.nc-group-summary`,
`.nc-group-mark`) and `.nc-group-body`; `[data-nc-collapse="phone"]` on a phone-only group.
