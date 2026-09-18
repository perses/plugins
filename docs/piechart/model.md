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
  visual:
    innerRadius:  <string> # Optional
    outerRadius:  <string>
    colorPalette: <array of strings> # Optional
```

## Legend-with-values specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#legend-with-values-specification).

## Calculation specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#calculation-specification).

## Format specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#format-specification).

## Radii

`visual.outerRadius` is required and defaults to `"90%"`. Set `visual.innerRadius` to create a doughnut chart. 
Radius values can be percentages or unitless pixel strings and are passed to Apache ECharts.

Persisted charts using the former top-level `radius` and `colorPalette` fields remain supported. The editor moves their
color settings into `visual` the next time the chart is saved; the former numeric `radius` did not affect rendering, so
these charts retain the `"90%"` rendered default.

```yaml
# A pie chart with an outer radius relative to the shorter panel edge.
visual:
  outerRadius: "90%"

# A doughnut chart with a pixel inner radius and percentage outer radius.
visual:
  innerRadius: "40"
  outerRadius: "90%"
```
