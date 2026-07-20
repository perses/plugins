# TimeSeriesChart model

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
# lineStyle overrides the panel-level line style for this query's series
lineStyle: <enum = "solid" | "dashed" | "dotted"> # Optional
# areaOpacity overrides the panel-level area opacity for this query's series (between 0 and 1)
areaOpacity: <number> # Optional
# format overrides the panel-level Y-axis format for this query's series, creating a secondary Y axis when the unit differs
format: <Format specification> # Optional
# negativeY renders the query's series below the X axis. Values are negated for display only;
# legend calculations and CSV export keep the original (positive) values.
negativeY: <boolean> # Optional
```

### Negative Y edge cases & compatibility

- **Stacking (`visual.stack: "all"`)**: supported. Positive-Y series stack upward from zero, negative-Y series stack downward.
- **Bar charts (`visual.display: "bar"`)**: supported. Bars render below the X axis.
- **Percent thresholds (`thresholds.mode: "percent"`)**: computed against the magnitude of the data, so percent thresholds keep working with negated series.
- **Multi-Y axis (per-query `format`)**: each axis auto-fits independently; the secondary axis renders negatives below zero when applicable.
- **CSV export**: exports the original positive values from the query results.
- **Legend calculations (min / max / mean / …)**: computed from the original positive values.
- **Log axis (`yAxis.logBase`)**: not compatible. Logarithmic scales do not support non-positive values; flipped points are dropped from the rendering.
