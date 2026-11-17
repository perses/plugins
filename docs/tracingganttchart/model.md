# TracingGanttChart model

```yaml
kind: "TracingGanttChart"
spec:
  visual: <Visual specification> # Optional
  links: <Links specification> # Optional
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

## Links specification

```yaml
# Link of a trace. Besides the dashboard variables, it supports ${datasourceName} and ${traceId}.
trace: <string> # Optional
# Links displayed on the value of a span attribute.
attributes: # Optional
  - name: <string> # Name of the attribute, e.g. k8s.pod.name
    # Besides the dashboard variables, it supports ${datasourceName} and the attributes of the span, the dots of their
    # names being replaced by underscores, e.g. ${k8s_pod_name}.
    link: <string>
```

Both `trace` and `link` must be relative URLs or use one of the following schemes: http, https, mailto, tel, sms,
slack, msteams, vscode, vscode-insiders, zoommtg. Any other scheme (e.g. `javascript:`) is rejected.
When the URL contains variables, the URL obtained after the interpolation must follow the same rule, otherwise the
value is not displayed as a link.

## Selection specification

When enabled, spans can be selected with checkboxes. The checked spans are exposed as the panel selection, which is used by the actions displayed in the panel header.

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
