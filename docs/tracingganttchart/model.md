# TracingGanttChart model

```yaml
kind: "TracingGanttChart"
spec:
  visual: <Visual specification> # Optional
  selection: <Selection specification> # Optional
  actions: <Actions specification> # Optional
```

## Visual specification

```yaml
palette: <Palette specification> # Optional
```

### Palette specification

```yaml
mode: <enum = "auto" | "categorical">
```

## Selection specification

When enabled, the selected span is exposed as the panel selection, which is used by the actions displayed in the panel header.

```yaml
enabled: <boolean> # Optional
```

## Actions specification

```yaml
enabled: <boolean> # Optional, default: true
displayInHeader: <boolean> # Optional
displayWithItem: <boolean> # Optional
actionsList:
  - <Event action specification> | <Webhook action specification>
```

### Event action specification

```yaml
type: "event"
name: <string>
eventName: <string>
icon: <string> # Optional
confirmMessage: <string> # Optional
enabled: <boolean> # Optional, default: true
batchMode: <enum = "individual" | "batch"> # Optional, default: "individual"
bodyTemplate: <string> # Optional
```

### Webhook action specification

```yaml
type: "webhook"
name: <string>
url: <string>
method: <enum = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"> # Optional, default: "POST"
contentType: <enum = "none" | "json" | "text"> # Optional, default: "none"
headers: # Optional
  <string>: <string>
icon: <string> # Optional
confirmMessage: <string> # Optional
enabled: <boolean> # Optional, default: true
batchMode: <enum = "individual" | "batch"> # Optional, default: "individual"
bodyTemplate: <string> # Optional
```

See the [README](./README.md#item-actions) for the fields available in templates.
