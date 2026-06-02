# Detection accuracy fixtures

Each fixture is a captured `DomSignals` + `FrameworkSignals` snapshot plus the
expected detection result. `tests/accuracy.test.ts` runs the pure engine against
every fixture and prints a tracked accuracy score per group.

This is Archify's **continuous** substitute for a one-off minification-accuracy
spike: as real-world snapshots are added under `dev/` (un-minified builds, full
component names retained) and `prod/` (minified builds, names mangled), the CI
score shows exactly how detection holds up on production code.

## Adding a fixture
Create `dev/<name>.json` or `prod/<name>.json`:

```json
{
  "name": "human description",
  "dom": { "tag": "...", "role": null, "dataAttributes": [], "ariaAttributes": [], "classList": [], "inputType": null, "autocomplete": null },
  "frameworkSignals": { "hasReactDevtoolsHook": false, "hasReactFiberKeys": false, "hasNextData": false, "hasVueInstance": false, "hasVueDevtoolsHook": false, "hasNgGlobal": false, "ngVersionAttr": null, "hasSvelteClass": false },
  "expect": { "framework": "...", "type": "...", "library": "..." }
}
```

`expect` values must be honest: when a signal isn't retained (e.g. minified prod
with no semantic class), the expected `library` is `"unknown"` — never a guess.
