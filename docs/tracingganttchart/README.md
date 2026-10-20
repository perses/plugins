# Tracing Gantt Chart

The Tracing Gantt Chart plugin provides Gantt chart visualization for distributed tracing data in Perses dashboards. This panel plugin displays trace spans in a timeline format, making it easy to visualize trace duration and dependencies.

![TracingGanttChart example](./tracingganttchart.png)

See also technical docs related to this plugin:

- [Data model](./model.md)
- [Dashboard-as-Code Go lib](./go-sdk.md)

## Item actions

Item actions let you trigger events or webhooks with the details of a span, for example to open the logs of a span in another plugin or application.
Actions are configured in the **Item Actions** tab of the panel editor:

- **Display Actions with Each Item**: shows the action buttons in the span detail pane, next to the close button.
- **Display Actions in Panel Header**: shows the action buttons in the panel header. Requires **Enable Item Selection**, which exposes the selected span as the panel selection.

Each action receives the following fields of the selected span, which can be referenced in URL and body templates with `${__data.fields["<field>"]}`:

| Field                                        | Description                                            |
|----------------------------------------------|--------------------------------------------------------|
| `traceId`, `spanId`, `parentSpanId`          | Identifiers of the trace, span and parent span         |
| `name`, `kind`, `serviceName`                | Span name, span kind and service name                  |
| `startTimeUnixMs`, `endTimeUnixMs`           | Start and end time of the span, in milliseconds        |
| `durationMs`                                 | Duration of the span, in milliseconds                  |
| `statusCode`, `statusMessage`                | Span status                                            |
| `scopeName`, `scopeVersion`                  | Instrumentation scope                                  |
| `traceStartTimeUnixMs`, `traceEndTimeUnixMs` | Start and end time of the whole trace, in milliseconds |
| `attributes.<key>`                           | Span attributes, e.g. `attributes.http.method`         |
| `resource.<key>`                             | Resource attributes, e.g. `resource.service.name`      |

An event action dispatches a [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) on `window`, allowing any plugin or application to handle it.
Without body template, the event detail is the JSON of `{ "id": <spanId>, "data": <span fields> }`:

```ts
window.addEventListener('span-logs', (event) => {
  const { data } = JSON.parse((event as CustomEvent<string>).detail);
  openLogs({ traceId: data.traceId, spanId: data.spanId, service: data['resource.service.name'] });
});
```
