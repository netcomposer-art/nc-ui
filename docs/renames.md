# Renames: roles moved into component domains

nc-ui 0.1.0 (pre-release, never published). The roles below were generic semantic tokens in the first draft and now live in a component domain. The machine-readable list is [`tokens/renames.json`](../tokens/renames.json). The ASTRID branch `feat/nc-ui-tokens` has been migrated.

`filter-lowpass`, `filter-highpass`, and `filter-bandpass` came back to the semantic tier (`--nc-ui-filter-*`) on branch `petra/rhythm-renames-filter-roles`. They are not in the table.

| old CSS var | new CSS var | old JS | new JS |
|---|---|---|---|
| `--nc-ui-key-white` | `--nc-synth-key-white` | `semantic['key-white']` | `component.synth['key-white']` |
| `--nc-ui-key-black` | `--nc-synth-key-black` | `semantic['key-black']` | `component.synth['key-black']` |
| `--nc-ui-key-hint-on-dark` | `--nc-synth-key-hint-on-dark` | `semantic['key-hint-on-dark']` | `component.synth['key-hint-on-dark']` |
| `--nc-ui-key-held-base` | `--nc-synth-key-held-base` | `semantic['key-held-base']` | `component.synth['key-held-base']` |
| `--nc-ui-keybed-height` | `--nc-synth-keybed-height` | `semantic['keybed-height']` | `component.synth['keybed-height']` |
| `--nc-ui-font-curve-label` | `--nc-synth-curve-label-font` | `semantic['font-curve-label']` | `component.synth['curve-label-font']` |
| `--nc-ui-curve-label-size` | `--nc-synth-curve-label-size` | `semantic['curve-label-size']` | `component.synth['curve-label-size']` |
| `--nc-ui-slim-curve-width` | `--nc-synth-slim-curve-width` | `semantic['slim-curve-width']` | `component.synth['slim-curve-width']` |
| `--nc-ui-meaning-area-1` | `--nc-meaning-area-1` | `semantic['meaning-area-1']` | `component.meaning['area-1']` |
| `--nc-ui-meaning-area-2` | `--nc-meaning-area-2` | `semantic['meaning-area-2']` | `component.meaning['area-2']` |
| `--nc-ui-meaning-area-3` | `--nc-meaning-area-3` | `semantic['meaning-area-3']` | `component.meaning['area-3']` |
| `--nc-ui-meaning-area-4` | `--nc-meaning-area-4` | `semantic['meaning-area-4']` | `component.meaning['area-4']` |
| `--nc-ui-meaning-intimacy` | `--nc-meaning-intimacy` | `semantic['meaning-intimacy']` | `component.meaning['intimacy']` |
| `--nc-ui-meaning-energy` | `--nc-meaning-energy` | `semantic['meaning-energy']` | `component.meaning['energy']` |
| `--nc-ui-meaning-tension` | `--nc-meaning-tension` | `semantic['meaning-tension']` | `component.meaning['tension']` |
| `--nc-ui-meaning-ambiguity` | `--nc-meaning-ambiguity` | `semantic['meaning-ambiguity']` | `component.meaning['ambiguity']` |
| `--nc-ui-meaning-movement` | `--nc-meaning-movement` | `semantic['meaning-movement']` | `component.meaning['movement']` |
| `--nc-ui-meaning-highlight` | `--nc-meaning-highlight` | `semantic['meaning-highlight']` | `component.meaning['highlight']` |
| `--nc-ui-drawer-bg` | `--nc-situation-drawer-bg` | `semantic['drawer-bg']` | `component.situation['drawer-bg']` |
| `--nc-ui-drawer-width` | `--nc-situation-drawer-width` | `semantic['drawer-width']` | `component.situation['drawer-width']` |
| `--nc-ui-map-marker-off` | `--nc-situation-map-marker-off` | `semantic['map-marker-off']` | `component.situation['map-marker-off']` |
| `--nc-ui-chart-tick-size` | `--nc-situation-chart-tick-size` | `semantic['chart-tick-size']` | `component.situation['chart-tick-size']` |
| `--nc-ui-chart-tooltip-size` | `--nc-situation-chart-tooltip-size` | `semantic['chart-tooltip-size']` | `component.situation['chart-tooltip-size']` |
