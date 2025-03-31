# StatusHistoryChart Panel Model

```yaml
kind: "StatusHistoryChart"
spec:
  legend: <Legend specification> # Optional
  mappings: 
  - <Mapping specification> # Optional
```

## Legend specification

```yaml
position: <enum = "bottom" | "right">
mode:     <enum = "list" | "table"> # Optional
size:     <enum = "small" | "medium"> # Optional
```

## Mapping specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#mapping-specification).
