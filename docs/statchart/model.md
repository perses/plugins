# StatChart Panel Model

```yaml
kind: "StatChart"
spec:
  calculation: <Calculation specification>
  format: <Format specification> # Optional
  thresholds: <Thresholds specification> # Optional
  sparkline: <Sparkline specification> # Optional
  valueFontSize: <int> # Optional
```

## Calculation specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#calculation-specification).

## Format specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#format-specification).

## Thresholds specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#thresholds-specification).

## Sparkline specification

```yaml
color: <string> # Optional
width: <int> # Optional
```
