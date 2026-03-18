# BarChart model

```yaml
kind: "BarChart"
spec:
  calculation: <Calculation specification>
  format: <Format specification> # Optional
  sort: <enum = "asc" | "desc"> # Optional
  mode: <enum = "value" | "percentage"> # Optional
  orientation: <enum = "horizontal" | "vertical"> # Optional
  groupBy: <array[string]> # Optional
  isStacked: <boolean> # Optional
```

## Calculation specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#calculation-specification).

## Format specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#format-specification).
