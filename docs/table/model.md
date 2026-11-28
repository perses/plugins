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
tags: <Tags specification> # Optional
dataLink: <Data Link specification> # Optional
```

## Data Link specification

```yaml
url: <string> # Required. Supports variable substitution (e.g., ${__data.fields["column_name"]})
title: <string> # Optional
openNewTab: <boolean> # Required
```

## Tags specification

When set, the column's cells are rendered as colored tags. Each tag gets the background color of the first matching
column cell setting, then of the first matching global cell setting, otherwise a color from `colorMode`.

```yaml
delimiter: <string> # Optional. Split the value on this string, one tag per non-empty trimmed part
colorMode: <enum = "auto" | "palette" | "manual"> # Optional. Default: "auto"
defaultColor: <string> # Optional (hex color format). Only allowed with colorMode "manual". Default: "#9e9e9e"
```

- `auto`: a color derived from the tag value.
- `palette`: a color of the theme categorical palette, derived from the tag value.
- `manual`: the `defaultColor`.

- Cell settings are evaluated against each tag, and their `text`, `prefix` and `suffix` apply to the tag label.
- The column `format` only applies to numeric values when no `delimiter` is set.
- Empty or null values render no tag, unless a cell setting matches them (e.g. a `Misc` condition on `null`).

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
