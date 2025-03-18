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

See [common plugin definitions](https://github.com/perses/perses/blob/main/docs/plugins/common.md#calculation-specification).

## Format specification

See [common plugin definitions](https://github.com/perses/perses/blob/main/docs/plugins/common.md#format-specification).

## Thresholds specification

See [common plugin definitions](https://github.com/perses/perses/blob/main/docs/plugins/common.md#thresholds-specification).

## Sparkline specification

```yaml
color: <string> # Optional
width: <int> # Optional
```
