# PieChart Panel Model

```yaml
kind: "PieChart"
spec:
  legend:        <Legend-with-values specification> # Optional
  calculation:   <Calculation specification>
  format:        <Format specification> # Optional
  sort:          <enum = "asc" | "desc"> # Optional
  mode:          <enum = "value" | "percentage"> # Optional
  radius:        <number>
```

## Legend-with-values specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#legend-with-values-specification).

## Calculation specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#calculation-specification).

## Format specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#format-specification).
