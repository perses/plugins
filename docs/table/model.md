# Table Panel Model

```yaml
kind: "Table"
spec:
  density: <enum = "compact" | "standard" | "comfortable"> # Optional
  columnSettings: <Column Settings specification> # Optional
```

## Column Settings specification

```yaml
name:  <string>
header:  <string> # Optional
headerDescription:  <string> # Optional
cellDescription: <string> # Optional
align: <enum = "left" | "center" | "right"> # Optional
enableSorting: <boolean> # Optional
width: <anyOf = number | "auto"> # Optional
hide: <boolean> # Optional
```