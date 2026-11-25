# FlameChart model

```yaml
kind: "FlameChart"
spec:
  palette: <enum = "package-name" | "value">
  showSettings: <boolean>
  showSeries: <boolean>
  showTable: <boolean>
  showFlameGraph: <boolean>
  traceHeight: <number> # Optional, approximate height in px of each stack level (new panels default to 22; 0 or unset fits all levels in the panel), must be >= 0
```
