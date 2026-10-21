# GaugeChart model

```yaml
kind: "GaugeChart"
spec:
  calculation: <Calculation specification>
  format: <Format specification> # Optional
  thresholds: <Thresholds specification> # Optional
  max: <int> # Optional
```

## Calculation specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#calculation-specification).

If a calculated value is NaN, that gauge displays "Invalid numeric value". Other gauges in the panel continue to render.

## Format specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#format-specification).

## Thresholds specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#thresholds-specification).
