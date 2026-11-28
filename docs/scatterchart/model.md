# ScatterChart model

```yaml
kind: "ScatterChart"
spec:
  # range of the circles diameter (1rst is min, 2nd is max)
  sizeRange: [<number>, <number>] # Optional
  # Page opened when a point is clicked. Besides the dashboard variables, it supports ${datasourceName} and ${traceId}.
  # It must be a relative URL or use one of the following schemes: http, https, mailto, tel, sms, slack, msteams,
  # vscode, vscode-insiders, zoommtg. Any other scheme (e.g. javascript:) is rejected.
  link: <string> # Optional
```
