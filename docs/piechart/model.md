# PieChart model

```yaml
kind: "PieChart"
spec:
  legend:        <Legend-with-values specification> # Optional
  calculation:   <Calculation specification>
  format:        <Format specification> # Optional
  sort:          <enum = "asc" | "desc"> # Optional
  mode:          <enum = "value" | "percentage"> # Optional
  showLabels:    <boolean> # Optional
  visual: # Optional
    innerRadius:  <integer = 0..100> # Optional
    outerRadius:  <integer = 0..100>
    colorPalette: <array of strings> # Optional
```

## Legend-with-values specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#legend-with-values-specification).

## Calculation specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#calculation-specification).

## Format specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#format-specification).

## Radii

Radii are whole-number percentages from `0` through `100`. `visual.outerRadius` defaults to `100`. When both radii are
provided, they are passed to ECharts without enforcing an order. Set `visual.innerRadius` to create a doughnut chart.

Persisted charts using the former top-level `radius` and `colorPalette` fields remain supported. The editor moves their
color settings into `visual` the next time the chart is saved; the former numeric `radius` did not affect rendering, so
these charts retain the rendered outer-radius default of 100%.

```yaml
# A pie chart with an outer radius relative to the shorter panel edge.
visual:
  outerRadius: 90

# A doughnut chart with a 40% inner radius and 90% outer radius.
visual:
  innerRadius: 40
  outerRadius: 90
```
