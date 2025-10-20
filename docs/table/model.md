# Table model

```yaml
kind: "Table"
spec:
  density: <enum = "compact" | "standard" | "comfortable"> # Optional
  defaultColumnWidth: <anyOf = number | "auto"> # Optional
  defaultColumnHeight: <anyOf = number | "auto"> # Optional
  pagination: <boolean> # Optional
  columnSettings: <Column Settings specification> # Optional
  cellSettings: <Cell Settings specification> # Optional
  transforms: <Transform specification> # Optional
```

## Column Settings specification

```yaml
name: <string> # Required
header: <string> # Optional
headerDescription: <string> # Optional
cellDescription: <string> # Optional
plugin: <Plugin specification> # Optional
format: <Format specification> # Optional
align: <enum = "left" | "center" | "right"> # Optional
enableSorting: <boolean> # Optional
sort: <enum = "asc" | "desc"> # Optional
width: <anyOf = number | "auto"> # Optional
hide: <boolean> # Optional
```

## Cell Settings specification

```yaml
condition: <Condition specification> # Required
text: <string> # Optional
textColor: <string> # Optional (hex color format)
backgroundColor: <string> # Optional (hex color format)
```

## Condition specification

### Value Condition
```yaml
kind: "Value"
spec:
  value: <string> # Required
```

### Range Condition
```yaml
kind: "Range"
spec:
  min: <number> # Optional
  max: <number> # Optional
```

### Regex Condition
```yaml
kind: "Regex"
spec:
  expr: <string> # Required
```

### Misc Condition
```yaml
kind: "Misc"
spec:
  value: <enum = "empty" | "null" | "NaN" | "true" | "false"> # Required
```

## Format specification

```yaml
unit: <string> # Optional
decimalPlaces: <number> # Optional
shortValues: <boolean> # Optional
```

## Plugin specification

```yaml
kind: <string> # Required
spec: <object> # Plugin-specific configuration
```

## Transform specification

Transforms are applied to the data before rendering the table. See the transforms documentation for available options.
