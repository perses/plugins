# OpenSearch examples

## trace-to-logs.json

Demonstrates the trace→logs pivot:

1. The `traceId` dashboard variable holds the currently selected trace.
2. The Tempo panel renders the trace via `TempoTraceQuery` and `TracingGanttChart`.
3. The OpenSearch logs panel runs a PPL query filtered by `traceId='$traceId'`.

When the user picks a trace in the gantt chart (or sets the variable elsewhere),
the logs panel re-runs and shows logs for that trace.

### Field-name conventions

OpenSearch indexes vary in how they name fields. Common defaults:

| Source                       | timestamp    | message   | trace id   |
| ---------------------------- | ------------ | --------- | ---------- |
| OpenTelemetry / Data Prepper | `@timestamp` | `body`    | `traceId`  |
| AWS / X-Ray exporter         | `@timestamp` | `message` | `traceId`  |
| Legacy / custom              | `time`       | `message` | `trace_id` |

If your index uses different names, set `timestampField` and/or `messageField` on
the `OpenSearchLogQuery` spec, and adjust the `where` clause to your trace_id field.

### Swap Tempo for Jaeger

Replace the Tempo panel's `plugin.kind` and `datasource.kind` with `JaegerTraceQuery`
and `JaegerDatasource`. The OpenSearch panel does not change.
