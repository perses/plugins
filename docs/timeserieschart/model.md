# TimeSeriesChart Panel Model

```yaml
kind: "TimeSeriesChart"
spec:
  legend: <Legend-with-values specification> # Optional
  tooltip: <Tooltip specification> # Optional
  yAxis: <YAxis specification> # Optional
  thresholds: <Thresholds specification> # Optional
  visual: <Visual specification> # Optional
  querySettings:
  - <Query Settings specification> # Optional
```

## Legend-with-values specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#legend-with-values-specification).

### Calculation specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#calculation-specification).

## Tooltip specification

```yaml
enablePinning: <boolean | default = false> # Optional
```

## YAxis specification

```yaml
show: <boolean> # Optional
label: <string> # Optional
format: <Format specification> # Optional
min: <int> # Optional
max: <int> # Optional
```

### Format specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#format-specification).

## Thresholds specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#thresholds-specification).

## Visual specification

```yaml
display: <enum = "line" | "bar"> # Optional
# Must be between 0.25 and 3
lineWidth: <int> # Optional
# Must be between 0 and 1
areaOpacity: <int> # Optional
showPoints: <enum = "auto" | "always"> # Optional
palette: <Palette specification> # Optional
# Must be between 0 and 6
pointRadius: <number> # Optional
stack: <enum = "all" | "percent"> # Optional
connectNulls: <boolean | default = false> # Optional
```

### Palette specification

```yaml
mode: <enum = "auto" | "categorical">
```

## Query Settings specification

```yaml
# queryIndex is an unsigned integer that should match an existing index in the panel's `queries` array
queryIndex: <number>
# colorMode represents the coloring strategy to use
# - "fixed":        for any serie returned by the query, apply the colorValue defined
# - "fixed-single": if only one serie returned by the query, apply the colorValue defined, otherwise do nothing
colorMode: <enum = "fixed" | "fixed-single">
# colorValue is an hexadecimal color code
colorValue: <string>
```
