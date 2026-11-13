# TraceTable model

```yaml
kind: "TraceTable"
spec:
  visual: <Visual specification> # Optional
  links: <Links specification> # Optional
```

## Visual specification

```yaml
palette: <Palette specification> # Optional
```

### Palette specification

```yaml
mode: <enum = "auto" | "categorical">
```

## Links specification

```yaml
# Link of a trace. Besides the dashboard variables, it supports ${datasourceName} and ${traceId}.
# It must be a relative URL or use one of the following schemes: http, https, mailto, tel, sms, slack, msteams, vscode,
# vscode-insiders, zoommtg. Any other scheme (e.g. javascript:) is rejected.
# When the URL contains variables, the URL obtained after the interpolation must follow the same rule, otherwise the
# trace is not displayed as a link.
trace: <string> # Optional
```
