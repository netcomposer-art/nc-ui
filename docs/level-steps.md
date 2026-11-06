# Level steps

A strip of steps to draw on: each step's level as a soft bar with its shape's curve over it, the playing step ringed,
and the shapes as tabs under it. First user: Gate in the Studio Mix's inserts (Peter, 2026-11-06: Gate's mockups and
"go"; merged into the kit with his OK: "can the new 'level steps' control be merged into the design kit - yes").

## API

```ts
{
  type: "levelSteps",
  id: "hack-synth-gate-1-steps",
  label: "Gate steps",
  steps: [{ level: 1, shape: 1 }, ...],      // 8 or 16; level 0..1
  played: 12,                                // steps that play (1/8T with 16 steps); the rest dashed and empty
  swing: 0.625,                              // the first step of each pair's share (0.5 straight .. 0.75)
  on: true,                                  // false: the strip goes quiet
  shapes: [{ value: 0, label: "Hard", icon: "M0 10 L0 1 L20 1 L20 10" }, ...], // icons: 20 x 10 SVG paths
  curve: (i, n) => gains,                    // n + 1 gains 0..1 across step i (omitted: flat at its level)
  onLevels: (levels, done) => {},            // every move of a drawing finger or mouse; done on release
  onShape: (i, shape) => {},                 // long press, right-click or Enter on a step, then a shape
  onShapeAll: (shape) => {},                 // a shape tab: every step
  playhead: () => ({ step: 5, locked: true }), // read about 30 times a second while on the page
  help: "…",
}
```

The kit draws; the host owns the state. Call the host's own setters from `onLevels` and re-render (patch) the card.

## Behaviour

- **Draw.** Press and drag across the strip: every step the pointer crosses takes the level under it, steps skipped
  between two moves on a straight line. A tap sets one step. Levels are whole percents.
- **Shape of one step.** Hold a step (450 ms, `LONG_PRESS_MS`, within 6 px) or right-click it: the level goes back to
  what it was and a small picker opens over the step (the shapes as buttons, 44 px targets on touch). Escape or a press
  elsewhere closes it.
- **Shape of every step.** The tabs under the strip. One is selected when every playing step has that shape.
- **Keys.** The strip is one slider: Left and Right pick a step, Up and Down move it 5 % (Shift 1 %), Page Up and Down
  25 %, Home 100 %, End 0, Enter the picker.
- **Playhead.** An accent ring (the Rhythm and Bass playhead) while locked to Play; a thin quieter ring
  (`level-steps-free`) while it runs free with the transport stopped.
- **Size.** `level-steps-height` (96 px) in a card, full width on a phone; `level-steps-height-max` (192 px) when the
  card is maximized (a card with level steps gets the maximize button, as one with an EQ graph). `touch-action: none`
  on the strip, so a finger draws instead of scrolling.

## Tokens

`level-steps-height`, `level-steps-height-max`, `level-steps-curve` (the accent), `level-steps-bar` (the accent at
14 %), `level-steps-free` (slate). `ChoiceControl` also gained `caption`: a visible label before the tabs (Gate's Rate).
